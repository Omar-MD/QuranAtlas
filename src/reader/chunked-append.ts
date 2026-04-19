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

/**
 * Attach a scroll listener to `container` that calls `appendChunk` when the
 * user is within one viewport height of the bottom.
 *
 * @param container    - The scrollable reader container.
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

  let rafPending = false

  const onScroll = () => {
    if (!rafPending) {
      rafPending = true
      requestAnimationFrame(() => {
        rafPending = false
        handleScrollAppend(container, appendChunk)
      })
    }
  }

  container.addEventListener('scroll', onScroll, { passive: true })

  return () => {
    container.removeEventListener('scroll', onScroll)
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
