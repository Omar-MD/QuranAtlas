/**
 * Reader route handler.
 * Renders surah content with Arabic text, translation, and basmala rules.
 * Supports chunked rendering, position tracking, and session restore.
 */

import { getSurah, getSurahs } from '../data/dataset.js'
import { get, put } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { observeScroll, unobserve, observeNewVerses, flushDebounce } from './scroll-tracker.js'
import { announce } from '../a11y/announcer.js'

// Maximum time to wait for surah data fetch before showing error
// 5 seconds balances responsiveness with slow network tolerance
const SKELETON_TIMEOUT_MS = 5000

// Number of verses to render per chunk for performance
// 50 verses provides good initial render time while keeping DOM size manageable
const CHUNK_SIZE = 50

let currentSurah = null
let currentSurahNum = null
let renderedCount = 0
let isRendering = false
let scrollAppendBound = null
let currentTranslationVisible = true
let scrollAppendRafPending = false
let unsubVisibility = null
let visibilityHandler = null
let lastTrackedVerse = null

export async function init(params, { savePosition: shouldSavePosition = true } = {}) {
  const surahNum = parseInt(params.surah, 10)
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return
  }

  if (currentSurahNum !== null && currentSurahNum !== surahNum) {
    cleanup()
  }
  currentSurahNum = surahNum

  const mainContent = document.getElementById('main-content')
  const topBar = document.getElementById('top-bar')
  if (!mainContent) {
    return
  }

  // Show skeleton
  showSkeleton(mainContent)

  // Set 5s hard timeout
  const timeout = setTimeout(() => {
    cleanup()
    showError(mainContent, surahNum)
  }, SKELETON_TIMEOUT_MS)

  try {
    // Primary fetch: getSurah() is blocking for first render
    performance.mark('reader:fetch-start')
    const surah = await getSurah(surahNum)
    performance.mark('reader:fetch-end')

    // Guard: bail if navigation moved on while we were fetching
    if (currentSurahNum !== surahNum) {
      clearTimeout(timeout)
      return
    }

    // Background fetch: position and settings while rendering
    const [surahs, translationVisible, savedPosition] = await Promise.all([
      getSurahs(),
      get('settings', 'translationVisible').then(r => r?.value ?? true),
      get('positions', `s${surahNum}`),
    ])

    clearTimeout(timeout)

    // Guard: bail if navigation moved on while we were fetching settings
    if (currentSurahNum !== surahNum) {
      return
    }

    currentSurah = surah
    const surahMeta = surahs.find(s => s.n === surahNum)
    currentTranslationVisible = translationVisible

    // Render
    mainContent.innerHTML = ''
    renderSurahHeader(mainContent, surahMeta)
    renderBasmala(mainContent, surahNum)

    // Render resume indicator if position saved and not already there
    const targetVerse = params.ayah ? parseInt(params.ayah, 10) : null
    if (savedPosition && !targetVerse) {
      renderResumeIndicator(mainContent, surahMeta, savedPosition)
    }

    // Validate target verse if provided
    let invalidVerseError = null
    if (targetVerse !== null) {
      if (targetVerse < 1 || targetVerse > surah.ar.length) {
        invalidVerseError = `Verse ${targetVerse} does not exist in ${surahMeta?.name ?? 'this Surah'} (${surah.ar.length} verses)`
      }
    }

    // Chunked rendering: render first chunk
    renderedCount = 0
    isRendering = true
    renderVerseChunk(mainContent, surah, translationVisible, 0, CHUNK_SIZE)
    isRendering = false

    // Render surah end marker
    renderSurahEnd(mainContent, surahMeta)

    // Render top bar controls
    renderTopBar(topBar, translationVisible, surahNum, mainContent)

    // Set up scroll tracking if savePosition is enabled
    if (shouldSavePosition) {
      setupScrollTracking(mainContent, surahNum)
      visibilityHandler = () => {
        if (document.hidden && currentSurahNum && lastTrackedVerse !== null) {
          // Flush any pending debounced position update before saving
          flushDebounce()
          // Fire-and-forget with proper error handling via catch
          put('positions', {
            id: `s${currentSurahNum}`,
            surah: currentSurahNum,
            verse: lastTrackedVerse,
            savedAt: Date.now(),
          }).catch((error) => {
            // Position save failed, emit event for UI warning
            console.error('Failed to save position:', error)
            emit(Events.READER_POSITION_SAVE_FAILED, { error: error.message, surah: currentSurahNum, verse: lastTrackedVerse })
          })
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }

    // Re-read position when tab becomes visible
    unsubVisibility = on(Events.DB_VISIBILITY_VISIBLE, async () => {
      if (currentSurah && mainContent) {
        const position = await get('positions', `s${currentSurah.n}`)
        if (position) {
          scrollToVerse(mainContent, position.verse)
        }
      }
    })

    // Scroll to saved position or deep link verse
    if (savedPosition && !targetVerse) {
      scrollToVerse(mainContent, savedPosition.verse)
    } else if (targetVerse) {
      // If verse is invalid, show error but still load surah at verse 1
      const validTargetVerse = (invalidVerseError) ? 1 : targetVerse
      scrollToVerse(mainContent, validTargetVerse)
    }

    // Show invalid verse error if applicable
    if (invalidVerseError) {
      renderInvalidVerseError(mainContent, invalidVerseError)
    }

    emit(Events.READER_SURAH_LOADED, { surah: surahNum })
    performance.mark('reader:first-verse')
    announce(`${surahMeta?.name ?? `Surah ${surahNum}`} loaded, ${surah.ar.length} verses`)
  } catch (error) {
    clearTimeout(timeout)
    showError(mainContent, surahNum, error.message)
  }
}

/**
 * Clean up the current reader session.
 */
function cleanup() {
  unobserve()
  const mainContent = document.getElementById('main-content')
  if (mainContent && scrollAppendBound) {
    mainContent.removeEventListener('scroll', scrollAppendBound)
    scrollAppendBound = null
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
  if (unsubVisibility) {
    unsubVisibility()
    unsubVisibility = null
  }
  currentSurah = null
  currentSurahNum = null
  renderedCount = 0
  lastTrackedVerse = null
  currentTranslationVisible = true
  scrollAppendRafPending = false
}

export { cleanup }

/**
 * Render a chunk of verses.
 * Validates that Arabic and English arrays have matching lengths before rendering.
 */
function renderVerseChunk(container, surah, translationVisible, start, end) {
  // Validate verse data integrity - ar and en arrays must match
  if (!surah?.ar || !surah?.en || surah.ar.length !== surah.en.length) {
    console.error('Verse data validation failed: Arabic and English arrays mismatch or missing', {
      arLength: surah?.ar?.length,
      enLength: surah?.en?.length,
      surah: surah?.n,
    })
    return
  }
  
  const actualEnd = Math.min(end, surah.ar.length)
  const endMarker = container.querySelector('[data-surah-end]')

  const fragment = document.createDocumentFragment()

  for (let i = start; i < actualEnd; i++) {
    const verseNum = i + 1
    const verseBlock = document.createElement('div')
    verseBlock.className = 'qa-verse'
    verseBlock.setAttribute('data-verse', `${verseNum}`)

    const arabicEl = document.createElement('div')
    arabicEl.className = 'qa-verse-arabic'
    arabicEl.setAttribute('dir', 'rtl')
    arabicEl.textContent = surah.ar[i]

    const numberEl = document.createElement('span')
    numberEl.className = 'qa-verse-number'
    numberEl.textContent = String(verseNum)

    arabicEl.insertBefore(numberEl, arabicEl.firstChild)
    verseBlock.appendChild(arabicEl)

    const transEl = document.createElement('div')
    transEl.className = 'qa-verse-translation'
    if (!translationVisible) {
      transEl.classList.add('qa-hide-translation')
    }
    transEl.setAttribute('data-translation', '')
    transEl.textContent = surah.en[i]
    verseBlock.appendChild(transEl)

    fragment.appendChild(verseBlock)
  }

  if (endMarker) {
    container.insertBefore(fragment, endMarker)
  } else {
    container.appendChild(fragment)
  }

  renderedCount = actualEnd
}

/**
 * Set up scroll tracking with append-on-scroll.
 */
function setupScrollTracking(container, surahNum) {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  observeScroll(mainContent, {
    onPositionChange: ({ verse }) => {
      lastTrackedVerse = verse
      savePosition(surahNum, verse)
    },
  })

  // Append more verses on scroll near bottom (throttled via rAF)
  scrollAppendBound = () => {
    if (!scrollAppendRafPending) {
      scrollAppendRafPending = true
      requestAnimationFrame(() => {
        scrollAppendRafPending = false
        handleScrollAppend()
      })
    }
  }
  mainContent.addEventListener('scroll', scrollAppendBound, { passive: true })
}

/**
 * Handle scroll events to append more verse chunks.
 * Uses rAF throttling to prevent multiple rapid scroll events from queuing
 * multiple render operations. The scrollAppendRafPending flag ensures only
 * one render cycle is active at a time.
 */
function handleScrollAppend() {
  if (isRendering || !currentSurah || renderedCount >= currentSurah.ar.length) {
    return
  }

  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  const scrollBottom = mainContent.scrollTop + mainContent.clientHeight
  const scrollHeight = mainContent.scrollHeight

  // Append next chunk when within one viewport height of bottom
  if (scrollHeight - scrollBottom < mainContent.clientHeight) {
    // Set pending BEFORE the rAF to prevent race conditions
    scrollAppendRafPending = true
    
    requestAnimationFrame(() => {
      // Reset pending flag immediately to allow next scroll to queue
      scrollAppendRafPending = false
      
      // Re-validate conditions in case they changed during the frame
      if (isRendering || !currentSurah || renderedCount >= currentSurah.ar.length) {
        return
      }
      
      // Re-check scroll position - still near bottom?
      const currentScrollBottom = mainContent.scrollTop + mainContent.clientHeight
      const currentScrollHeight = mainContent.scrollHeight
      if (currentScrollHeight - currentScrollBottom >= mainContent.clientHeight) {
        return
      }
      
      isRendering = true
      const startCount = renderedCount
      renderVerseChunk(mainContent, currentSurah, currentTranslationVisible, renderedCount, renderedCount + CHUNK_SIZE)
      isRendering = false

      // Observe newly appended verses for scroll tracking
      const startVerse = startCount + 1
      const newElements = []
      for (let v = startVerse; v <= renderedCount; v++) {
        const el = mainContent.querySelector(`[data-verse="${v}"]`)
        if (el) {
          newElements.push(el)
        }
      }
      if (newElements.length > 0) {
        observeNewVerses(newElements)
      }
    })
  }
}

/**
 * Save reading position to IDB.
 */
async function savePosition(surahNum, verse) {
  try {
    await put('positions', {
      id: `s${surahNum}`,
      surah: surahNum,
      verse,
      savedAt: Date.now(),
    })
    emit(Events.READER_POSITION_CHANGED, { surah: surahNum, verse })
  } catch (error) {
    // Position save failed, emit event for UI warning
    console.error('Failed to save position on visibility change:', error)
    emit(Events.READER_POSITION_SAVE_FAILED, { error: error.message, surah: surahNum, verse })
  }
}

/**
 * Scroll to a specific verse.
 * If verse is in a future chunk, renders chunks until verse is available.
 */
function scrollToVerse(container, verseNum) {
  // If verse is beyond currently rendered, load chunks until we reach it
  while (verseNum > renderedCount && currentSurah && renderedCount < currentSurah.ar.length) {
    isRendering = true
    renderVerseChunk(container, currentSurah, currentTranslationVisible, renderedCount, renderedCount + CHUNK_SIZE)
    isRendering = false

    // Observe newly appended verses for scroll tracking
    const startVerse = renderedCount - (renderedCount % CHUNK_SIZE) + 1
    const newElements = []
    for (let v = startVerse; v <= renderedCount; v++) {
      const el = container.querySelector(`[data-verse="${v}"]`)
      if (el) {
        newElements.push(el)
      }
    }
    if (newElements.length > 0) {
      observeNewVerses(newElements)
    }
  }

  const verseEl = container.querySelector(`[data-verse="${verseNum}"]`)
  if (verseEl && typeof verseEl.scrollIntoView === 'function') {
    verseEl.scrollIntoView({ block: 'start' })
    return true
  }
  return false
}

/**
 * Toggle translation visibility via CSS class.
 */
function toggleTranslationVisibility(container, visible) {
  const translations = container.querySelectorAll('[data-translation]')
  translations.forEach(el => {
    if (visible) {
      el.classList.remove('qa-hide-translation')
    } else {
      el.classList.add('qa-hide-translation')
    }
  })
}

/**
 * Show skeleton loader.
 */
function showSkeleton(container) {
  container.innerHTML = ''
  for (let i = 0; i < 6; i++) {
    const line = document.createElement('div')
    line.className = 'qa-skeleton qa-skeleton-line'
    line.style.width = i % 2 === 0 ? '100%' : '80%'
    container.appendChild(line)
  }
}

/**
 * Show error state.
 */
function showError(container, surahNum, _message) {
  container.innerHTML = ''
  const errorDiv = document.createElement('div')
  errorDiv.className = 'qa-error-state'
  errorDiv.textContent = `Failed to load Surah ${surahNum}.`

  const retryBtn = document.createElement('button')
  retryBtn.className = 'qa-retry-btn'
  retryBtn.textContent = 'Retry'
  let isRetrying = false
  retryBtn.addEventListener('click', async () => {
    if (isRetrying) {
      return
    }
    isRetrying = true
    retryBtn.disabled = true
    retryBtn.textContent = 'Loading...'
    await init({ surah: String(surahNum) })
    // Button will be destroyed on success anyway
  })
  errorDiv.appendChild(document.createElement('br'))
  errorDiv.appendChild(retryBtn)

  container.appendChild(errorDiv)
}

/**
 * Render surah header.
 */
function renderSurahHeader(container, meta) {
  const header = document.createElement('div')
  header.setAttribute('data-surah-header', '')

  const nameEl = document.createElement('div')
  nameEl.className = 'qa-surah-name'
  nameEl.textContent = meta?.arabic ?? ''

  const metaEl = document.createElement('div')
  metaEl.className = 'qa-surah-meta'
  metaEl.textContent = `${meta?.name ?? ''} · Surah ${meta?.n ?? ''} · ${meta?.count ?? ''} verses · ${meta?.type ?? ''}`

  header.appendChild(nameEl)
  header.appendChild(metaEl)
  container.appendChild(header)
}

/**
 * Render basmala according to Quranic conventions.
 * Surah 1 (Al-Fatiha): basmala IS verse 1 from dataset - DO NOT render separately
 * Surah 9 (At-Tawbah): no basmala (Quranic convention)
 * All other surahs: show basmala before verse 1
 */
function renderBasmala(container, surahNum) {
  // Skip basmala for Surah 1 (already verse 1 in dataset) and Surah 9 (no basmala)
  if (surahNum === 1 || surahNum === 9) {
    return
  }

  const basmala = document.createElement('div')
  basmala.className = 'qa-basmala'
  basmala.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
  container.appendChild(basmala)
}

/**
 * Render resume indicator.
 */
function renderResumeIndicator(container, meta, position) {
  const indicator = document.createElement('div')
  indicator.className = 'qa-resume-indicator'
  indicator.setAttribute('data-resume-indicator', '')

  const text = document.createElement('span')
  text.className = 'qa-resume-text'
  text.textContent = `Resume reading: ${meta?.name ?? ''} ${position.verse}`

  const actions = document.createElement('div')
  actions.className = 'qa-resume-actions'

  const jumpBtn = document.createElement('button')
  jumpBtn.className = 'qa-resume-jump'
  jumpBtn.textContent = 'Jump'
  jumpBtn.addEventListener('click', () => {
    scrollToVerse(container, position.verse)
    indicator.remove()
  })

  const dismissBtn = document.createElement('button')
  dismissBtn.className = 'qa-resume-dismiss'
  dismissBtn.textContent = '×'
  dismissBtn.setAttribute('aria-label', 'Dismiss')
  dismissBtn.addEventListener('click', () => {
    indicator.remove()
  })

  actions.appendChild(jumpBtn)
  actions.appendChild(dismissBtn)
  indicator.appendChild(text)
  indicator.appendChild(actions)
  container.appendChild(indicator)
}

/**
 * Render invalid verse error notification.
 */
function renderInvalidVerseError(container, errorMessage) {
  const errorDiv = document.createElement('div')
  errorDiv.className = 'qa-invalid-verse-error'
  errorDiv.setAttribute('data-invalid-verse-error', '')
  errorDiv.textContent = errorMessage

  const dismissBtn = document.createElement('button')
  dismissBtn.className = 'qa-error-dismiss'
  dismissBtn.textContent = '×'
  dismissBtn.setAttribute('aria-label', 'Dismiss')
  dismissBtn.addEventListener('click', () => {
    errorDiv.remove()
  })

  errorDiv.appendChild(dismissBtn)
  container.insertBefore(errorDiv, container.firstChild)
}

/**
 * Render surah end marker.
 */
function renderSurahEnd(container, meta) {
  const endMarker = document.createElement('div')
  endMarker.className = 'qa-surah-end'
  endMarker.setAttribute('data-surah-end', '')
  endMarker.textContent = `End of ${meta?.name ?? 'Surah'}`
  container.appendChild(endMarker)
}

/**
 * Render top bar with translation toggle.
 */
function renderTopBar(topBar, translationVisible, _surahNum, mainContent) {
  if (!topBar) {
    return
  }

  const existingToggle = topBar.querySelector('.qa-toggle-btn')
  if (existingToggle) { existingToggle.remove() }

  const toggleBtn = document.createElement('button')
  toggleBtn.textContent = translationVisible ? 'EN ▾' : 'EN ▸'
  toggleBtn.className = 'qa-toggle-btn'
  toggleBtn.setAttribute('aria-label', translationVisible ? 'Hide translation' : 'Show translation')

  toggleBtn.addEventListener('click', async () => {
    const previousValue = currentTranslationVisible
    const newValue = !previousValue
    
    // Optimistically update UI first for responsiveness
    currentTranslationVisible = newValue
    toggleTranslationVisibility(mainContent, newValue)
    toggleBtn.textContent = newValue ? 'EN ▾' : 'EN ▸'
    toggleBtn.setAttribute('aria-label', newValue ? 'Hide translation' : 'Show translation')
    
    try {
      await put('settings', { key: 'translationVisible', value: newValue })
    } catch (error) {
      // Settings save failed - revert UI to previous state
      console.error('Failed to save translation visibility setting:', error)
      currentTranslationVisible = previousValue
      toggleTranslationVisibility(mainContent, previousValue)
      toggleBtn.textContent = previousValue ? 'EN ▾' : 'EN ▸'
      toggleBtn.setAttribute('aria-label', previousValue ? 'Hide translation' : 'Show translation')
      // Emit event for UI warning
      emit(Events.READER_POSITION_SAVE_FAILED, { 
        error: error.message, 
        setting: 'translationVisible',
        attemptedValue: newValue 
      })
    }
  })

  topBar.appendChild(toggleBtn)
}
