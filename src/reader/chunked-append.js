/**
 * Chunked verse append — scroll listener that appends more verse chunks
 * as the user scrolls near the bottom of the current render.
 *
 * Extracted from reader/index.js. State (renderedCount, isRendering,
 * scrollAppendRafPending) lives in state/reader.js.
 */

import * as readerState from '../state/reader.js'
import { renderVerseChunk } from './render.js'
import { observeNewVerses } from './scroll-tracker.js'

// Number of verses appended per chunk. Balances render time vs DOM size.
export const CHUNK_SIZE = 50

/**
 * Attach a scroll listener to `container` that appends more verse chunks
 * as the user approaches the bottom. Returns a cleanup function that
 * removes the listener.
 */
export function setupChunkedAppend(container) {
  if (!container) {
    return () => {}
  }

  const onScroll = () => {
    if (!readerState.get().scrollAppendRafPending) {
      readerState.set({ scrollAppendRafPending: true })
      requestAnimationFrame(() => {
        readerState.set({ scrollAppendRafPending: false })
        handleScrollAppend(container)
      })
    }
  }

  container.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    container.removeEventListener('scroll', onScroll)
  }
}

/**
 * Append the next chunk of verses if the user is within a viewport of
 * the bottom. Uses rAF throttling to coalesce rapid scroll events.
 */
function handleScrollAppend(container) {
  const s = readerState.get()
  if (s.isRendering || !s.currentSurah || s.renderedCount >= s.currentSurah.ar.length) {
    return
  }

  const scrollBottom = container.scrollTop + container.clientHeight
  const scrollHeight = container.scrollHeight

  // Append next chunk when within one viewport height of bottom
  if (scrollHeight - scrollBottom < container.clientHeight) {
    readerState.set({ scrollAppendRafPending: true })

    requestAnimationFrame(() => {
      readerState.set({ scrollAppendRafPending: false })

      // Re-validate conditions in case they changed during the frame
      const s2 = readerState.get()
      if (s2.isRendering || !s2.currentSurah || s2.renderedCount >= s2.currentSurah.ar.length) {
        return
      }

      readerState.set({ isRendering: true })
      const startCount = readerState.get().renderedCount
      renderVerseChunk(container, s2.currentSurah, s2.translationVisible, s2.renderedCount, s2.renderedCount + CHUNK_SIZE)
      readerState.set({ isRendering: false })

      // Observe newly appended verses for scroll tracking
      const startVerse = startCount + 1
      const newElements = []
      for (let v = startVerse; v <= readerState.get().renderedCount; v++) {
        const el = container.querySelector(`[data-verse="${v}"]`)
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
