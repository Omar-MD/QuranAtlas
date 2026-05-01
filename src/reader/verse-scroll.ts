/**
 * Verse scroll helpers — smooth align a verse element in its container,
 * and scroll-to-verse (lazily triggers more-verse callback if target not yet rendered).
 *
 * Extracted from reader/index.js.
 */

/**
 * Align `verseEl` to the top of the scrollable `container`.
 * Runs the alignment across two rAFs so late layout (fonts, images) settles.
 */
export function scrollVerseIntoView(container: HTMLElement, verseEl: HTMLElement): void {
  const renderedVerses = [...container.querySelectorAll<HTMLElement>('.qa-verse')]

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
    // 'instant' overrides #main-content's CSS scroll-behavior:smooth so the
    // ChunkIO (set up one rAF later) fires its initial callbacks after the
    // scroll has landed, not mid-animation where scrollTop ≈ 0 causes it to
    // evict the materialised target chunk.
    verseEl.scrollIntoView({ block: 'start', behavior: 'instant' })
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
 * Scroll to a specific verse in the container.
 * If the verse element is not yet in the DOM, calls `ensureVerseRendered(verseNum)` to
 * load more verses reactively, then retries after a short rAF delay.
 *
 * @param container - The scrollable reader container.
 * @param verseNum  - 1-based verse number.
 * @param ensureVerseRendered - Optional callback that triggers loading more verses
 *                              (e.g. by updating the Svelte verses state). The component
 *                              calls this and Svelte re-renders synchronously enough for
 *                              the next rAF to find the element.
 * @returns true if the verse was found and scrolled to, false otherwise.
 */
export function scrollToVerse(
  container: HTMLElement,
  verseNum: number,
  ensureVerseRendered?: (verse: number) => void,
): boolean {
  const verseEl = container.querySelector<HTMLElement>(`[data-verse="${verseNum}"]`)

  if (!verseEl && ensureVerseRendered) {
    ensureVerseRendered(verseNum)
    // After triggering a state update, give Svelte one rAF to flush
    requestAnimationFrame(() => {
      const el = container.querySelector<HTMLElement>(`[data-verse="${verseNum}"]`)
      if (el) {
        scrollVerseIntoView(container, el)
      }
    })
    return false
  }

  if (verseEl) {
    scrollVerseIntoView(container, verseEl)
    return true
  }
  return false
}
