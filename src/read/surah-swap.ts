/**
 * Cross-surah swap orchestration.
 *
 * One surah is mounted at a time. When the user pulls past the end of the
 * current surah (or past the top), this module swaps the mounted surah by
 * triggering a router navigation to `#/s/{newN}` and stashing a transient
 * `swapAnchor` on `window` so the next Reader mount knows whether to land
 * at scroll-top (forward) or scroll-bottom (backward).
 *
 * Wraps both directions: 114 → 1 forward, 1 → 114 backward.
 *
 * The pull tracker emits a 0..1 progress value that drives a circular
 * indicator. The swap commits only when the user releases past full progress
 * (== 1.0). Wheel and touch are tracked uniformly.
 */

const FIRST_SURAH = 1
const LAST_SURAH = 114

/** Pull distance (in CSS pixels) required to fill the indicator circle. */
export const PULL_THRESHOLD_PX = 180

/** Cool-down after a commit so a quick second pull doesn't double-fire. */
const COMMIT_COOLDOWN_MS = 800

/** Idle timeout — wheel input that stops accumulating decays the pull state. */
const WHEEL_IDLE_MS = 260

/** Slop — small overscroll deltas below this are ignored. */
const PULL_SLOP_PX = 18

/**
 * Require the scroller to have settled at an edge for this long before
 * wheel input is allowed to accumulate as pull. Prevents the inertia of
 * a fast scroll-to-end from immediately triggering a swap.
 */
const SCROLL_SETTLE_MS = 250

export type SwapAnchor = 'top' | 'bottom'
export type PullDirection = 'forward' | 'backward'

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

export type PullState = {
  direction: PullDirection
  /** 0..1 — fraction of PULL_THRESHOLD_PX accumulated. Capped at 1. */
  progress: number
}

export type PullToSwapOptions = {
  /** Element whose scroll position is observed (typically `#main-content`). */
  scroller: HTMLElement
  /** Called every animation frame the pull state changes (start, update, end). */
  onPull: (state: PullState | null) => void
  /** Called when the user releases past full progress (commits the swap). */
  onCommit: (direction: PullDirection) => void
}

/**
 * Wire the pull-to-swap gesture on `scroller`. Returns a cleanup function.
 *
 * Touch gesture lifecycle:
 *   touchstart → record start Y if at scroll edge, else ignore
 *   touchmove  → if pulling past the edge in the right direction, accumulate
 *                pull distance and emit progress
 *   touchend   → commit if progress == 1.0, else release (progress = 0)
 *
 * Wheel gesture lifecycle (desktop):
 *   wheel      → if at scroll edge and direction matches, accumulate deltaY;
 *                emit progress; auto-release after WHEEL_IDLE_MS of no input
 *
 * The handlers do not call `swapToSurah` directly — they call `onCommit` so
 * the Reader can sequence URL navigation and any mid-flight cleanup.
 */
export function setupPullToSwap(opts: PullToSwapOptions): () => void {
  const { scroller, onPull, onCommit } = opts

  let lastCommitAt = 0
  let lastScrollAt = 0
  let pullDirection: PullDirection | null = null
  let pullDistance = 0

  // Touch tracking
  let touchAnchorY: number | null = null
  let touchActiveDirection: PullDirection | null = null
  /**
   * Edge state at the moment the finger landed. The pull gesture is only
   * eligible if the scroller was already at an edge when contact began.
   * A continuous swipe that crosses an edge mid-gesture (e.g. user
   * scrolls fast from mid-surah to the end) does NOT trigger a swap —
   * the user must lift and re-touch at the edge to pull.
   */
  let touchStartEdge: 'top' | 'bottom' | null = null

  // Wheel tracking
  let wheelIdleTimer: ReturnType<typeof setTimeout> | null = null

  const isAtBottom = (): boolean =>
    scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
  const isAtTop = (): boolean => scroller.scrollTop <= 0

  const inCooldown = (): boolean => Date.now() - lastCommitAt < COMMIT_COOLDOWN_MS

  const isScrollSettled = (): boolean => Date.now() - lastScrollAt > SCROLL_SETTLE_MS

  const emit = (): void => {
    if (pullDirection === null) {
      onPull(null)
      return
    }
    const progress = Math.min(1, pullDistance / PULL_THRESHOLD_PX)
    onPull({ direction: pullDirection, progress })
  }

  const release = (): void => {
    pullDirection = null
    pullDistance = 0
    touchAnchorY = null
    touchActiveDirection = null
    touchStartEdge = null
    if (wheelIdleTimer) { clearTimeout(wheelIdleTimer); wheelIdleTimer = null }
    onPull(null)
  }

  const tryCommit = (): boolean => {
    if (pullDirection === null) { return false }
    if (pullDistance < PULL_THRESHOLD_PX) { return false }
    if (inCooldown()) { return false }
    const dir = pullDirection
    lastCommitAt = Date.now()
    release()
    onCommit(dir)
    return true
  }

  const accumulate = (direction: PullDirection, delta: number): void => {
    if (delta <= 0) { return }
    if (pullDirection === null) { pullDirection = direction }
    if (pullDirection !== direction) { return }
    pullDistance += delta
    emit()
  }

  // ---- Touch ----
  const onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0]
    if (!t) { return }
    // Only arm the gesture if the scroller is already at an edge AND
    // the scroll has settled. A mid-page touchstart cannot pull;
    // neither can a touch that lands during inertial scroll.
    if (isAtTop() && isScrollSettled()) {
      touchStartEdge = 'top'
    } else if (isAtBottom() && isScrollSettled()) {
      touchStartEdge = 'bottom'
    } else {
      touchStartEdge = null
    }
    touchAnchorY = t.clientY
    touchActiveDirection = null
    pullDistance = 0
    pullDirection = null
  }

  const onTouchMove = (e: TouchEvent): void => {
    if (touchAnchorY === null || touchStartEdge === null || inCooldown()) { return }
    const t = e.touches[0]
    if (!t) { return }
    const dy = t.clientY - touchAnchorY

    // Decide direction based on initial pull and the edge captured at
    // touchstart. The scroller must still be at that edge — if a quick
    // sub-gesture scrolled away, the pull is canceled.
    if (touchActiveDirection === null) {
      if (touchStartEdge === 'bottom' && dy < -PULL_SLOP_PX && isAtBottom()) {
        touchActiveDirection = 'forward'
      } else if (touchStartEdge === 'top' && dy > PULL_SLOP_PX && isAtTop()) {
        touchActiveDirection = 'backward'
      } else {
        return
      }
    }

    if (touchActiveDirection === 'forward') {
      // Fingers move up; pull distance grows as -dy grows.
      const distance = Math.max(0, -dy - PULL_SLOP_PX)
      pullDirection = 'forward'
      pullDistance = distance
      emit()
    } else {
      const distance = Math.max(0, dy - PULL_SLOP_PX)
      pullDirection = 'backward'
      pullDistance = distance
      emit()
    }
  }

  const onTouchEnd = (): void => {
    if (!tryCommit()) { release() }
  }

  // ---- Wheel ----
  const onWheel = (e: WheelEvent): void => {
    if (inCooldown()) { return }
    // Wheel deltas only count once the scroller has settled at the edge.
    // This prevents a fast scroll-to-end from immediately rolling into a
    // swap on the first wheel tick past the bottom.
    if (!isScrollSettled()) { return }

    const dy = e.deltaY
    if (dy > PULL_SLOP_PX && isAtBottom()) {
      accumulate('forward', dy)
    } else if (dy < -PULL_SLOP_PX && isAtTop()) {
      accumulate('backward', -dy)
    } else {
      return
    }

    if (wheelIdleTimer) { clearTimeout(wheelIdleTimer) }
    wheelIdleTimer = setTimeout(() => {
      wheelIdleTimer = null
      // Auto-commit if user wheeled past threshold and stopped, otherwise
      // release. Mirrors Chrome's PTR behaviour where a held-pull past the
      // arc commits on stillness as well as on lift.
      if (!tryCommit()) { release() }
    }, WHEEL_IDLE_MS)
  }

  // Track scroll activity so wheel + touch handlers can require a settle
  // window before accumulating pull. Initialised to "just scrolled" so the
  // first wheel/touch right after mount can't fire immediately.
  lastScrollAt = Date.now()
  const onScroll = (): void => { lastScrollAt = Date.now() }

  scroller.addEventListener('scroll', onScroll, { passive: true })
  scroller.addEventListener('touchstart', onTouchStart, { passive: true })
  scroller.addEventListener('touchmove', onTouchMove, { passive: true })
  scroller.addEventListener('touchend', onTouchEnd, { passive: true })
  scroller.addEventListener('touchcancel', onTouchEnd, { passive: true })
  scroller.addEventListener('wheel', onWheel, { passive: true })

  return () => {
    scroller.removeEventListener('scroll', onScroll)
    scroller.removeEventListener('touchstart', onTouchStart)
    scroller.removeEventListener('touchmove', onTouchMove)
    scroller.removeEventListener('touchend', onTouchEnd)
    scroller.removeEventListener('touchcancel', onTouchEnd)
    scroller.removeEventListener('wheel', onWheel)
    if (wheelIdleTimer) { clearTimeout(wheelIdleTimer) }
  }
}
