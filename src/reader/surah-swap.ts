/**
 * Cross-surah swap orchestration.
 *
 * Approach C from `docs/superpowers/specs/2026-04-25-cross-surah-infinite-scroll-design.md`:
 * one surah is mounted at a time. When the user scrolls past the end of
 * the current surah (or past the top), this module swaps the mounted
 * surah by triggering a router navigation to `#/s/{newN}` and stashing a
 * transient `swapAnchor` on `window` so the next Reader mount knows
 * whether to land at scroll-top (forward) or scroll-bottom (backward).
 *
 * Wraps both directions: 114 → 1 forward, 1 → 114 backward.
 */

const FIRST_SURAH = 1
const LAST_SURAH = 114

/** Swap cool-down — ignore further overscroll triggers within this window. */
const SWAP_COOLDOWN_MS = 600

/** Wheel/touch overshoot magnitude required to fire a swap. */
const OVERSCROLL_THRESHOLD_PX = 24

export type SwapAnchor = 'top' | 'bottom'

const ANCHOR_GLOBAL = '__qaSurahSwapAnchor'

/** Returns the next surah number, wrapping 114 → 1. */
export function nextSurah(n: number): number {
  return n >= LAST_SURAH ? FIRST_SURAH : n + 1
}

/** Returns the previous surah number, wrapping 1 → 114. */
export function prevSurah(n: number): number {
  return n <= FIRST_SURAH ? LAST_SURAH : n - 1
}

/**
 * Read and clear the pending swap anchor. Called by Reader.svelte on mount
 * to position the new surah's scroll. Returns 'top' if no swap is pending.
 */
export function consumeSwapAnchor(): SwapAnchor {
  const w = globalThis as unknown as Record<string, SwapAnchor | undefined>
  const a = w[ANCHOR_GLOBAL]
  delete w[ANCHOR_GLOBAL]
  return a === 'bottom' ? 'bottom' : 'top'
}

/** Navigate to surah `n`, recording the desired scroll anchor for the next Reader mount. */
export function swapToSurah(n: number, anchor: SwapAnchor): void {
  const w = globalThis as unknown as Record<string, SwapAnchor>
  w[ANCHOR_GLOBAL] = anchor
  window.location.hash = `#/s/${n}`
}

export type OverscrollSwapOptions = {
  /** Element whose scroll position is observed (typically `#main-content`). */
  scroller: HTMLElement
  /** Called when user overscrolls past the bottom edge of the current surah. */
  onForward: () => void
  /** Called when user overscrolls past the top edge of the current surah. */
  onBackward: () => void
}

/**
 * Wire a wheel/touch listener that fires `onForward` / `onBackward` when
 * the user attempts to scroll past the document edges. Returns a cleanup.
 *
 * Trigger heuristics:
 *  - Forward: at scroll-bottom AND wheel deltaY > THRESHOLD (positive = down).
 *    Touch: at scroll-bottom AND finger moved up by > THRESHOLD since contact.
 *  - Backward: at scroll-top AND wheel deltaY < -THRESHOLD (negative = up).
 *    Touch: at scroll-top AND finger moved down by > THRESHOLD since contact.
 *
 * A 600ms cool-down prevents re-fires while the new surah is mounting.
 */
export function setupOverscrollSwap(opts: OverscrollSwapOptions): () => void {
  const { scroller, onForward, onBackward } = opts

  let lastFireAt = 0
  let touchStartY: number | null = null

  const isAtBottom = (): boolean => {
    return scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
  }
  const isAtTop = (): boolean => {
    return scroller.scrollTop <= 0
  }

  const tryFire = (direction: 'forward' | 'backward'): void => {
    const now = Date.now()
    if (now - lastFireAt < SWAP_COOLDOWN_MS) { return }
    lastFireAt = now
    if (direction === 'forward') { onForward() } else { onBackward() }
  }

  const onWheel = (e: WheelEvent): void => {
    if (e.deltaY > OVERSCROLL_THRESHOLD_PX && isAtBottom()) {
      tryFire('forward')
    } else if (e.deltaY < -OVERSCROLL_THRESHOLD_PX && isAtTop()) {
      tryFire('backward')
    }
  }

  const onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0]
    touchStartY = t ? t.clientY : null
  }

  const onTouchMove = (e: TouchEvent): void => {
    if (touchStartY === null) { return }
    const t = e.touches[0]
    if (!t) { return }
    const dy = t.clientY - touchStartY
    // Finger moved up (negative dy) while at bottom → forward.
    if (dy < -OVERSCROLL_THRESHOLD_PX && isAtBottom()) {
      tryFire('forward')
      touchStartY = null
    } else if (dy > OVERSCROLL_THRESHOLD_PX && isAtTop()) {
      tryFire('backward')
      touchStartY = null
    }
  }

  const onTouchEnd = (): void => { touchStartY = null }

  scroller.addEventListener('wheel', onWheel, { passive: true })
  scroller.addEventListener('touchstart', onTouchStart, { passive: true })
  scroller.addEventListener('touchmove', onTouchMove, { passive: true })
  scroller.addEventListener('touchend', onTouchEnd, { passive: true })
  scroller.addEventListener('touchcancel', onTouchEnd, { passive: true })

  return () => {
    scroller.removeEventListener('wheel', onWheel)
    scroller.removeEventListener('touchstart', onTouchStart)
    scroller.removeEventListener('touchmove', onTouchMove)
    scroller.removeEventListener('touchend', onTouchEnd)
    scroller.removeEventListener('touchcancel', onTouchEnd)
  }
}
