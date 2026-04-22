/**
 * Scroll position tracking using IntersectionObserver.
 * Detects which verse is at the center of the viewport,
 * debouncing position updates to once per 1s of scrolling silence.
 */

const DEBOUNCE_MS = 1000
const CENTER_BAND_PX = 390

let observer: IntersectionObserver | null = null
let pendingPosition: number | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let onPositionChangeCallback: ((pos: { verse: number }) => void) | null = null
let scrollHandler: (() => void) | null = null
let containerRef: HTMLElement | null = null
let scrollerRef: HTMLElement | null = null
let sentinelEl: HTMLElement | null = null

/**
 * Start observing scroll position changes.
 */
export function observeScroll(
  container: HTMLElement,
  {
    onPositionChange,
    scroller,
  }: {
    onPositionChange: (pos: { verse: number }) => void
    /**
     * The actual scrolling element to use as IntersectionObserver `root`.
     * Required when `container` itself has `overflow: visible` — otherwise
     * IO stays frozen because the root and target scroll together and their
     * intersection never changes. Pass `#main-content` from the Reader.
     * If omitted, defaults to `container` (back-compat for callers where
     * container *is* the scroller — notably the unit test fixture).
     */
    scroller?: HTMLElement
  },
): void {
  onPositionChangeCallback = onPositionChange
  containerRef = container
  scrollerRef = scroller ?? container

  if (typeof IntersectionObserver === 'undefined') {
    setupScrollFallback()
    return
  }

  const verseSentinels = container.querySelectorAll('[data-verse]')
  const centerObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const verseEl = entry.target as HTMLElement
          const verseNum = parseInt(verseEl.getAttribute('data-verse') ?? '', 10)
          if (!isNaN(verseNum)) {
            pendingPosition = verseNum
            scheduleDebounce()
          }
        }
      }
    },
    {
      root: scrollerRef,
      rootMargin: `-${CENTER_BAND_PX}px 0px -${CENTER_BAND_PX}px 0px`,
      threshold: 0,
    },
  )

  verseSentinels.forEach((el) => centerObserver.observe(el))
  observer = centerObserver
}

/**
 * Observe newly added verse elements (e.g., from chunked rendering).
 */
export function observeNewVerses(elements: HTMLElement[]): void {
  if (!observer) {
    return
  }
  for (const el of elements) {
    observer.observe(el)
  }
}

/**
 * Fallback for environments without IntersectionObserver (e.g., jsdom).
 * Uses scroll events and center-band calculation.
 */
function setupScrollFallback(): void {
  if (!containerRef) {
    return
  }
  // Fallback also reads scrollTop — it must come from the actual scroller, not
  // from a wrapper with overflow:visible.
  const scroller = scrollerRef ?? containerRef

  scrollHandler = () => {
    if (!containerRef) { return }
    const scrollerRect = scroller.getBoundingClientRect()
    const scrollTop = scroller.scrollTop
    const centerTop = scrollTop + scrollerRect.height / 2
    const verseEls = containerRef.querySelectorAll('[data-verse]')

    for (const el of verseEls) {
      const htmlEl = el as HTMLElement
      const elTop = htmlEl.offsetTop
      const elBottom = elTop + htmlEl.offsetHeight
      if (centerTop >= elTop && centerTop <= elBottom) {
        const verseNum = parseInt(el.getAttribute('data-verse') ?? '', 10)
        if (!isNaN(verseNum)) {
          pendingPosition = verseNum
          scheduleDebounce()
        }
        break
      }
    }
  }

  scroller.addEventListener('scroll', scrollHandler)
}

/**
 * Stop observing and clean up.
 * @returns The last pending position if any
 */
export function unobserve(): number | null {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (scrollHandler) {
    const target = scrollerRef ?? containerRef
    if (target) {
      target.removeEventListener('scroll', scrollHandler)
    }
    scrollHandler = null
  }
  if (sentinelEl && sentinelEl.parentNode) {
    sentinelEl.parentNode.removeChild(sentinelEl)
    sentinelEl = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  const lastPending = pendingPosition
  pendingPosition = null
  onPositionChangeCallback = null
  containerRef = null
  scrollerRef = null
  return lastPending
}

/**
 * Schedule a debounced position update.
 */
function scheduleDebounce(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    if (pendingPosition !== null && onPositionChangeCallback) {
      onPositionChangeCallback({ verse: pendingPosition })
    }
    pendingPosition = null
    debounceTimer = null
  }, DEBOUNCE_MS)
}

/**
 * Flush any pending debounced position update immediately.
 * @returns The flushed position if any
 */
export function flushDebounce(): number | null {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    const position = pendingPosition
    if (position !== null && onPositionChangeCallback) {
      onPositionChangeCallback({ verse: position })
    }
    pendingPosition = null
    return position
  }
  return null
}
