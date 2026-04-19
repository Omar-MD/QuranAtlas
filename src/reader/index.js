/**
 * Reader route handler.
 * Renders surah content with Arabic text, translation, and basmala rules.
 * Supports chunked rendering, position tracking, and session restore.
 */

import { getSurah, getSurahs } from '../data/dataset.js'
import { get, put } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { clearUndoToast, clearUndoRecord } from '../core/ui.js'
import { observeScroll, unobserve, observeNewVerses, flushDebounce } from './scroll-tracker.js'
import { announce } from '../a11y/announcer.js'
import * as readerState from '../state/reader.js'
import {
  renderVerseChunk,
  renderSurahHeader,
  renderBasmala,
  renderInvalidVerseError,
  renderSurahEnd,
  renderSkeleton,
  renderError,
} from './render.js'

// Maximum time to wait for surah data fetch before showing error
// 5000ms hard cutoff; 800ms is the performance *goal*, not the error threshold
const SKELETON_TIMEOUT_MS = 5000

// Number of verses to render per chunk for performance
// 50 verses provides good initial render time while keeping DOM size manageable
const CHUNK_SIZE = 50

let scrollAppendBound = null
let unsubVisibility = null
let visibilityHandler = null
let cleanupIndicatorsFn = null
let cleanupLongPressFn = null

// Edge indicator state
let edgeL = null
let edgeR = null
let edgeTapHandler = null
let edgeFadeTimer = null

/**
 * Fetch surah data with navigation guard.
 * Returns { surah, surahs, surahMeta, translationVisible, savedPosition } or null if navigated away.
 */
async function fetchSurahData({ surahNum }) {
  performance.mark('reader:fetch-start')
  const surah = await getSurah(surahNum)
  performance.mark('reader:fetch-end')
  performance.measure('reader:surah-fetch', 'reader:fetch-start', 'reader:fetch-end')

  if (readerState.get().currentSurahNum !== surahNum) { return null }

  const [surahs, translationVisible, savedPosition] = await Promise.all([
    getSurahs(),
    get('settings', 'translationVisible').then(r => r?.value ?? true),
    get('positions', `s${surahNum}`),
  ])

  if (readerState.get().currentSurahNum !== surahNum) { return null }

  readerState.set({ currentSurah: surah })
  const surahMeta = surahs.find(s => s.n === surahNum)
  readerState.set({ translationVisible })

  return { surah, surahs, surahMeta, translationVisible, savedPosition }
}

/**
 * Render surah content: header, basmala, verse chunks, end marker.
 */
function renderSurahContent({ mainContent, surah, surahMeta, translationVisible, _savedPosition, _targetVerse, surahNum }) {
  mainContent.innerHTML = ''
  renderSurahHeader(mainContent, surahMeta)
  renderBasmala(mainContent, surahNum)

  readerState.set({ renderedCount: 0 })
  readerState.set({ isRendering: true })
  renderVerseChunk(mainContent, surah, translationVisible, 0, CHUNK_SIZE)
  readerState.set({ isRendering: false })

  renderSurahEnd(mainContent, surahMeta)
}

/**
 * Set up scroll/position tracking and scroll to initial position.
 * Returns array of cleanup functions.
 */
function initPositionTracking({ mainContent, surahNum, shouldSavePosition, surah, surahMeta, savedPosition, targetVerse }) {
  const cleanups = []

  if (shouldSavePosition) {
    setupScrollTracking(mainContent, surahNum)
    visibilityHandler = () => {
      const { currentSurahNum: csn, lastTrackedVerse: ltv } = readerState.get()
      if (document.hidden && csn && ltv !== null) {
        flushDebounce()
        const positionData = {
          id: `s${csn}`,
          surah: csn,
          verse: ltv,
          savedAt: Date.now(),
        }
        put('positions', positionData).catch(() => {
          setTimeout(() => {
            put('positions', positionData).catch((error) => {
              logger.error('Failed to save position after retry:', {
                surah: csn,
                verse: ltv,
                error,
              })
              emit(Events.READER_POSITION_SAVE_FAILED, { error: error.message, surah: csn, verse: ltv })
            })
          }, 100)
        })
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    })
  }

  const unsubTranslation = on(Events.SETTINGS_TRANSLATION_CHANGED, ({ visible }) => {
    readerState.set({ translationVisible: !!visible })
  })
  cleanups.push(() => { unsubTranslation() })

  unsubVisibility = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    const { currentSurah } = readerState.get()
    if (currentSurah && mainContent) {
      const position = await get('positions', `s${currentSurah.n}`)
      if (position) {
        scrollToVerse(mainContent, position.verse)
      }
    }
  })
  cleanups.push(() => {
    if (unsubVisibility) { unsubVisibility(); unsubVisibility = null }
  })

  // Validate target verse
  let invalidVerseError = null
  if (targetVerse !== null) {
    if (targetVerse < 1 || targetVerse > surah.ar.length) {
      invalidVerseError = `Verse ${targetVerse} does not exist in ${surahMeta?.name ?? 'this Surah'} (${surah.ar.length} verses)`
    }
  }

  // Scroll to saved position or deep link verse
  if (savedPosition && !targetVerse && savedPosition.verse > 1) {
    scrollToVerse(mainContent, savedPosition.verse)
  } else if (targetVerse) {
    const validTargetVerse = invalidVerseError ? 1 : targetVerse
    scrollToVerse(mainContent, validTargetVerse)
  }

  if (invalidVerseError) {
    renderInvalidVerseError(mainContent, invalidVerseError)
  }

  return cleanups
}

/**
 * Emit load event, set up indicators and long press, perf marks, announce.
 * Returns array of cleanup functions.
 */
function finalizeSurah({ surahNum, surahMeta, surah, initIndicators, setupLongPress, mainContent }) {
  // initIndicators must run before READER_SURAH_LOADED so its READER_SURAH_LOADED
  // listener fires for the current load (not just future loads) and can decorate
  // any verses already rendered by renderSurahContent above.
  cleanupIndicatorsFn = initIndicators()
  cleanupLongPressFn = setupLongPress(mainContent)
  emit(Events.READER_SURAH_LOADED, /** @type {import('../core/constants.js').ReaderSurahLoadedPayload} */({ surah: surahNum }))
  // Surface the ambient dock briefly so the user sees nav chrome on every surah load.
  emit(Events.AMBIENT_SURFACE, /** @type {import('../core/constants.js').AmbientSurfacePayload} */({ reason: 'surah-load' }))
  performance.mark('reader:first-verse')
  performance.measure('reader:total-load', 'reader:fetch-start', 'reader:first-verse')
  announce(`${surahMeta?.name ?? `Surah ${surahNum}`} loaded, ${surah.ar.length} verses`)

  return [
    () => { if (cleanupIndicatorsFn) { cleanupIndicatorsFn(); cleanupIndicatorsFn = null } },
    () => { if (cleanupLongPressFn) { cleanupLongPressFn(); cleanupLongPressFn = null } },
  ]
}

/**
 * Internal cleanup — resets all module state and removes listeners.
 */
export function cleanup() {
  clearUndoToast()
  clearUndoRecord()
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
  if (cleanupIndicatorsFn) { cleanupIndicatorsFn(); cleanupIndicatorsFn = null }
  if (cleanupLongPressFn) { cleanupLongPressFn(); cleanupLongPressFn = null }
  teardownEdgeIndicators()
  readerState.set({
    currentSurah: null,
    currentSurahNum: null,
    renderedCount: 0,
    lastTrackedVerse: null,
    translationVisible: true,
    scrollAppendRafPending: false,
  })
}

export async function init(
  params,
  {
    initIndicators = () => () => {},
    setupLongPress = () => () => {},
    savePosition: shouldSavePosition = true,
  } = {}
) {
  const surahNum = parseInt(params.surah, 10)
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return
  }

  if (readerState.get().currentSurahNum !== null && readerState.get().currentSurahNum !== surahNum) {
    cleanup()
  }
  readerState.set({ currentSurahNum: surahNum })

  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  renderSkeleton(mainContent)
  ensureEdgeIndicators()

  const timeout = setTimeout(() => {
    readerState.set({ currentSurahNum: null, currentSurah: null })
    renderError(mainContent, surahNum, () => init({ surah: String(surahNum) }))
  }, SKELETON_TIMEOUT_MS)

  try {
    const data = await fetchSurahData({ surahNum })
    if (!data) {
      clearTimeout(timeout)
      return
    }

    clearTimeout(timeout)

    const targetVerse = params.ayah ? parseInt(params.ayah, 10) : null

    renderSurahContent({
      mainContent,
      surah: data.surah, surahMeta: data.surahMeta,
      translationVisible: data.translationVisible,
      savedPosition: data.savedPosition, targetVerse,
      surahNum,
    })

    const trackingCleanups = initPositionTracking({
      mainContent, surahNum, shouldSavePosition,
      surah: data.surah, surahMeta: data.surahMeta,
      savedPosition: data.savedPosition, targetVerse,
    })

    const finalCleanups = finalizeSurah({
      surahNum, surahMeta: data.surahMeta, surah: data.surah,
      initIndicators, setupLongPress, mainContent,
    })

    return () => {
      cleanup()
      trackingCleanups.forEach(fn => fn())
      finalCleanups.forEach(fn => fn())
    }
  } catch (_error) {
    clearTimeout(timeout)
    renderError(mainContent, surahNum, () => init({ surah: String(surahNum) }))
  }
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
      readerState.set({ lastTrackedVerse: verse })
      savePosition(surahNum, verse)
    },
  })

  // Append more verses on scroll near bottom (throttled via rAF)
  scrollAppendBound = () => {
    if (!readerState.get().scrollAppendRafPending) {
      readerState.set({ scrollAppendRafPending: true })
      requestAnimationFrame(() => {
        readerState.set({ scrollAppendRafPending: false })
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
  const s = readerState.get()
  if (s.isRendering || !s.currentSurah || s.renderedCount >= s.currentSurah.ar.length) {
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
    readerState.set({ scrollAppendRafPending: true })

    requestAnimationFrame(() => {
      // Reset pending flag immediately to allow next scroll to queue
      readerState.set({ scrollAppendRafPending: false })

      // Re-validate conditions in case they changed during the frame
      const s2 = readerState.get()
      if (s2.isRendering || !s2.currentSurah || s2.renderedCount >= s2.currentSurah.ar.length) {
        return
      }

      readerState.set({ isRendering: true })
      const startCount = readerState.get().renderedCount
      renderVerseChunk(mainContent, s2.currentSurah, s2.translationVisible, s2.renderedCount, s2.renderedCount + CHUNK_SIZE)
      readerState.set({ isRendering: false })

      // Observe newly appended verses for scroll tracking
      const startVerse = startCount + 1
      const newElements = []
      for (let v = startVerse; v <= readerState.get().renderedCount; v++) {
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

function scrollVerseIntoView(container, verseEl) {
  const renderedVerses = [...container.querySelectorAll('.qa-verse')]

  for (const verse of renderedVerses) {
    verse.style.contentVisibility = 'visible'
  }

  const alignInContainer = () => {
    if (!container.isConnected || !verseEl.isConnected) {
      return
    }

    const containerRect = container.getBoundingClientRect()
    const verseRect = verseEl.getBoundingClientRect()
    const targetTop = container.scrollTop + (verseRect.top - containerRect.top)

    container.scrollTop = Math.max(0, targetTop)
  }

  if (typeof verseEl.scrollIntoView === 'function') {
    verseEl.scrollIntoView({ block: 'start' })
  }
  alignInContainer()
  requestAnimationFrame(() => {
    alignInContainer()
    requestAnimationFrame(() => {
      alignInContainer()
    })
  })
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
    emit(Events.READER_POSITION_CHANGED, /** @type {import('../core/constants.js').ReaderPositionChangedPayload} */({ surah: surahNum, verse }))
  } catch (error) {
    // Position save failed, emit event for UI warning
    logger.error('Failed to save position on visibility change:', {
      surah: surahNum,
      verse,
      error,
    })
    emit(Events.READER_POSITION_SAVE_FAILED, { error: error.message, surah: surahNum, verse })
  }
}

/**
 * Scroll to a specific verse.
 * If verse is in a future chunk, renders chunks until verse is available.
 */
function scrollToVerse(container, verseNum) {
  // If verse is beyond currently rendered, load chunks until we reach it
  let s = readerState.get()
  while (verseNum > s.renderedCount && s.currentSurah && s.renderedCount < s.currentSurah.ar.length) {
    readerState.set({ isRendering: true })
    const beforeCount = readerState.get().renderedCount
    renderVerseChunk(container, s.currentSurah, s.translationVisible, beforeCount, beforeCount + CHUNK_SIZE)
    readerState.set({ isRendering: false })

    // Observe newly appended verses for scroll tracking
    const afterCount = readerState.get().renderedCount
    const startVerse = beforeCount + 1
    const newElements = []
    for (let v = startVerse; v <= afterCount; v++) {
      const el = container.querySelector(`[data-verse="${v}"]`)
      if (el) {
        newElements.push(el)
      }
    }
    if (newElements.length > 0) {
      observeNewVerses(newElements)
    }
    s = readerState.get()
  }

  const verseEl = container.querySelector(`[data-verse="${verseNum}"]`)
  if (verseEl) {
    scrollVerseIntoView(container, verseEl)
    return true
  }
  return false
}

function ensureEdgeIndicators() {
  if (!edgeL) {
    edgeL = document.createElement('span')
    edgeL.className = 'qa-edge-indicator qa-edge-indicator--left'
    edgeL.setAttribute('aria-hidden', 'true')
    document.body.appendChild(edgeL)
  }
  if (!edgeR) {
    edgeR = document.createElement('span')
    edgeR.className = 'qa-edge-indicator qa-edge-indicator--right'
    edgeR.setAttribute('aria-hidden', 'true')
    document.body.appendChild(edgeR)
  }

  if (!edgeTapHandler) {
    edgeTapHandler = (e) => {
      const numEl = e.target.closest('.qa-verse-number')
      if (!numEl) { return }
      const verseEl = numEl.closest('.qa-verse')
      if (!verseEl) { return }
      showEdges(verseEl)
    }
    document.addEventListener('click', edgeTapHandler, { passive: true })
  }
}

function showEdges(verseEl) {
  if (!edgeL || !edgeR) { return }
  const rect = verseEl.getBoundingClientRect()
  const centerY = rect.top + rect.height / 2
  edgeL.style.top = `${centerY}px`
  edgeR.style.top = `${centerY}px`
  edgeL.classList.add('qa-edge-indicator--visible')
  edgeR.classList.add('qa-edge-indicator--visible')

  if (edgeFadeTimer) { clearTimeout(edgeFadeTimer) }
  edgeFadeTimer = setTimeout(() => {
    edgeL?.classList.remove('qa-edge-indicator--visible')
    edgeR?.classList.remove('qa-edge-indicator--visible')
    edgeFadeTimer = null
  }, 1600)

  emit(Events.AMBIENT_SURFACE, /** @type {import('../core/constants.js').AmbientSurfacePayload} */({ reason: 'verse-tap' }))
}

function teardownEdgeIndicators() {
  if (edgeFadeTimer) { clearTimeout(edgeFadeTimer); edgeFadeTimer = null }
  if (edgeTapHandler) {
    document.removeEventListener('click', edgeTapHandler)
    edgeTapHandler = null
  }
  if (edgeL?.parentNode) { edgeL.parentNode.removeChild(edgeL) }
  if (edgeR?.parentNode) { edgeR.parentNode.removeChild(edgeR) }
  edgeL = null
  edgeR = null
}

