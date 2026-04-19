/**
 * Verse scroll helpers — smooth align a verse element in its container,
 * and scroll-to-verse that lazily renders chunks until the target exists.
 *
 * Extracted from reader/index.js.
 */

import * as readerState from '../state/reader.js'
import { renderVerseChunk } from './render.js'
import { CHUNK_SIZE } from './chunked-append.js'
import { observeNewVerses } from './scroll-tracker.js'

/**
 * Align `verseEl` to the top of the scrollable `container`.
 * Runs the alignment across two rAFs so late layout (fonts, images) settles.
 */
export function scrollVerseIntoView(container, verseEl) {
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
 * Scroll to a specific verse.
 * If verse is in a future chunk, renders chunks until verse is available.
 */
export function scrollToVerse(container, verseNum) {
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
