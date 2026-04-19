/**
 * Reader DOM construction helpers.
 * Extracted from reader/index.js to keep rendering concerns focused.
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import * as readerState from '../state/reader.js'

/**
 * Render a chunk of verses.
 * Validates that Arabic and English arrays have matching lengths before rendering.
 */
export function renderVerseChunk(container, surah, translationVisible, start, end) {
  // Validate verse data integrity - ar and en arrays must match
  if (!surah?.ar || !surah?.en || surah.ar.length !== surah.en.length) {
    logger.error('Verse data validation failed: Arabic and English arrays mismatch or missing', {
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
    verseBlock.setAttribute('data-verse-key', `${readerState.get().currentSurahNum}:${verseNum}`)

    const arabicEl = document.createElement('div')
    arabicEl.className = 'qa-verse-arabic'
    arabicEl.setAttribute('dir', 'rtl')
    arabicEl.textContent = surah.ar[i]

    const numberEl = document.createElement('span')
    numberEl.className = 'qa-verse-number'
    numberEl.textContent = String(verseNum)

    arabicEl.appendChild(numberEl)
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

    emit(Events.READER_VERSE_RENDERED, {
      verseKey: `${readerState.get().currentSurahNum}:${verseNum}`,
      element: verseBlock,
    })
  }

  if (endMarker) {
    container.insertBefore(fragment, endMarker)
  } else {
    container.appendChild(fragment)
  }

  readerState.set({ renderedCount: actualEnd })
}

/**
 * Render surah header.
 */
export function renderSurahHeader(container, meta) {
  const header = document.createElement('div')
  header.className = 'qa-surah-header-card'
  header.setAttribute('data-surah-header', '')

  const nameEl = document.createElement('div')
  nameEl.className = 'qa-surah-name'
  nameEl.setAttribute('dir', 'rtl')
  nameEl.textContent = `سُورَةُ ${meta?.arabic ?? ''}`

  const metaEl = document.createElement('div')
  metaEl.className = 'qa-surah-meta'
  const nameUpper = (meta?.name ?? '').toUpperCase()
  const typeUpper = (meta?.type ?? '').toUpperCase()
  metaEl.textContent = `${nameUpper} · SURAH ${meta?.n ?? ''} · ${meta?.count ?? ''} VERSES · ${typeUpper}`

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
export function renderBasmala(container, surahNum) {
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
 * Render invalid verse error notification.
 */
export function renderInvalidVerseError(container, errorMessage) {
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
export function renderSurahEnd(container, meta) {
  const endMarker = document.createElement('div')
  endMarker.className = 'qa-surah-end'
  endMarker.setAttribute('data-surah-end', '')
  endMarker.textContent = `End of ${meta?.name ?? 'Surah'}`
  container.appendChild(endMarker)
}

/**
 * Render skeleton loader.
 */
export function renderSkeleton(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
  for (let i = 0; i < 6; i++) {
    const line = document.createElement('div')
    line.className = 'qa-skeleton qa-skeleton-line'
    line.style.width = i % 2 === 0 ? '100%' : '80%'
    container.appendChild(line)
  }
}

/**
 * Render error state.
 * Takes an onRetry callback so this module stays decoupled from reader init.
 */
export function renderError(container, surahNum, onRetry) {
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
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
    if (typeof onRetry === 'function') {
      await onRetry()
    }
  })
  errorDiv.appendChild(document.createElement('br'))
  errorDiv.appendChild(retryBtn)

  container.appendChild(errorDiv)
}
