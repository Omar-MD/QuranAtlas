/**
 * Chunked verse append — scroll listener that appends more verse chunks
 * as the user scrolls near the bottom of the current render.
 *
 * In the Svelte architecture the verse list is driven by the Reader component's
 * reactive state. This module attaches a scroll listener to the container and
 * calls a provided `appendChunk` callback when the user scrolls near the bottom.
 * The callback is responsible for extending the verses array in the component.
 */

// Number of verses appended per chunk. Balances render time vs DOM size.
export const CHUNK_SIZE = 50

import { findScrollAncestor } from './scroll-ancestor'

/**
 * Attach a scroll listener to the nearest scrolling ancestor of `container`
 * that calls `appendChunk` when the user is within one viewport height of the
 * bottom. Scroll events do NOT bubble, so the listener must bind to the
 * element that actually scrolls (commonly `#main-content` in this app).
 *
 * @param container    - The rendered verses host element.
 * @param appendChunk  - Called with no arguments when more verses should load.
 * @returns A cleanup function that removes the listener.
 */
export function setupChunkedAppend(
  container: HTMLElement,
  appendChunk: () => void,
): () => void {
  if (!container) {
    return () => {}
  }

  const scroller = findScrollAncestor(container, { requireOverflowing: true })
  if (!scroller) {
    return () => {}
  }

  let rafPending = false

  const onScroll = () => {
    if (!rafPending) {
      rafPending = true
      requestAnimationFrame(() => {
        rafPending = false
        handleScrollAppend(scroller, appendChunk)
      })
    }
  }

  scroller.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    scroller.removeEventListener('scroll', onScroll)
  }
}

/**
 * Append the next chunk of verses if the user is within a viewport of the bottom.
 */
function handleScrollAppend(container: HTMLElement, appendChunk: () => void): void {
  const scrollBottom = container.scrollTop + container.clientHeight
  const scrollHeight = container.scrollHeight

  // Append next chunk when within one viewport height of bottom
  if (scrollHeight - scrollBottom < container.clientHeight) {
    appendChunk()
  }
}
