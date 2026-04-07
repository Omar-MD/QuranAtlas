/**
 * Scroll position tracking using IntersectionObserver.
 * Detects which verse is at the center of the viewport,
 * debouncing position updates to once per 1s of scrolling silence.
 */

const DEBOUNCE_MS = 1000
const CENTER_BAND_PX = 390

let observer = null
let pendingPosition = null
let debounceTimer = null
let onPositionChangeCallback = null
let scrollHandler = null
let containerRef = null
let sentinelEl = null

/**
 * Start observing scroll position changes.
 * @param {HTMLElement} container - The scrollable container
 * @param {object} options
 * @param {Function} options.onPositionChange - Called with { verse: number } after debounce
 */
export function observeScroll(container, { onPositionChange }) {
  onPositionChangeCallback = onPositionChange
  containerRef = container

  if (typeof IntersectionObserver === 'undefined') {
    setupScrollFallback()
    return
  }

  const sentinel = document.createElement('div')
  sentinel.setAttribute('data-scroll-sentinel', '')
  sentinel.style.cssText = `
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: ${CENTER_BAND_PX * 2}px;
    transform: translateY(-50%);
    pointer-events: none;
    visibility: hidden;
  `
  container.style.position = 'relative'
  container.appendChild(sentinel)
  sentinelEl = sentinel

  const verseSentinels = container.querySelectorAll('[data-verse]')
  const centerObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const verseEl = entry.target
          const verseNum = parseInt(verseEl.getAttribute('data-verse'), 10)
          if (!isNaN(verseNum)) {
            pendingPosition = verseNum
            scheduleDebounce()
          }
        }
      }
    },
    {
      root: container,
      rootMargin: `-${CENTER_BAND_PX}px 0px -${CENTER_BAND_PX}px 0px`,
      threshold: 0,
    }
  )

  verseSentinels.forEach((el) => centerObserver.observe(el))
  observer = centerObserver
}

/**
 * Observe newly added verse elements (e.g., from chunked rendering).
 * @param {HTMLElement[]} elements - New verse elements with data-verse attributes
 */
export function observeNewVerses(elements) {
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
function setupScrollFallback() {
  if (!containerRef) {
    return
  }

  scrollHandler = () => {
    const containerRect = containerRef.getBoundingClientRect()
    const scrollTop = containerRef.scrollTop
    const centerTop = scrollTop + containerRect.height / 2
    const verseEls = containerRef.querySelectorAll('[data-verse]')

    for (const el of verseEls) {
      const elTop = el.offsetTop
      const elBottom = elTop + el.offsetHeight
      if (centerTop >= elTop && centerTop <= elBottom) {
        const verseNum = parseInt(el.getAttribute('data-verse'), 10)
        if (!isNaN(verseNum)) {
          pendingPosition = verseNum
          scheduleDebounce()
        }
        break
      }
    }
  }

  containerRef.addEventListener('scroll', scrollHandler)
}

/**
 * Stop observing and clean up.
 * @returns {number | null} The last pending position if any
 */
export function unobserve() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (scrollHandler && containerRef) {
    containerRef.removeEventListener('scroll', scrollHandler)
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
  return lastPending
}

/**
 * Schedule a debounced position update.
 */
function scheduleDebounce() {
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
 * @returns {number | null} The flushed position if any
 */
export function flushDebounce() {
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
