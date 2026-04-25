/**
 * Cross-surah swap orchestration.
 *
 * Approach C from `docs/superpowers/specs/2026-04-25-cross-surah-infinite-scroll-design.md`:
 * one surah is mounted at a time. When the user pulls past the end of the
 * current surah (or past the top), this module swaps the mounted surah by
 * triggering a router navigation to `#/s/{newN}` and stashing a transient
 * `swapAnchor` on `window` so the next Reader mount knows whether to land
 * at scroll-top (forward) or scroll-bottom (backward).
 *
 * Wraps both directions: 114 → 1 forward, 1 → 114 backward.
 *
 * Pull UX (2026-04-25 follow-up): instead of firing immediately on a
 * threshold, the pull tracker emits a 0..1 progress value that drives a
 * Chrome-mobile-style circular indicator. The swap commits only when the
 * user releases past full progress (== 1.0). Wheel and touch are tracked
 * uniformly — both feed cumulative pull distance.
 */

const FIRST_SURAH = 1
const LAST_SURAH = 114

/** Pull distance (in CSS pixels) required to fill the indicator circle. */
export const PULL_THRESHOLD_PX = 110

/** Cool-down after a commit so a quick second pull doesn't double-fire. */
const COMMIT_COOLDOWN_MS = 800

/** Idle timeout — wheel input that stops accumulating decays the pull state. */
const WHEEL_IDLE_MS = 220

/** Slop — small overscroll deltas below this are ignored. */
const PULL_SLOP_PX = 4

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
  let pullDirection: PullDirection | null = null
  let pullDistance = 0

  // Touch tracking
  let touchStartY: number | null = null
  let touchActiveDirection: PullDirection | null = null

  // Wheel tracking
  let wheelIdleTimer: ReturnType<typeof setTimeout> | null = null

  const isAtBottom = (): boolean =>
    scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
  const isAtTop = (): boolean => scroller.scrollTop <= 0

  const inCooldown = (): boolean => Date.now() - lastCommitAt < COMMIT_COOLDOWN_MS

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
    touchStartY = null
    touchActiveDirection = null
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
    touchStartY = t.clientY
    touchActiveDirection = null
    pullDistance = 0
    pullDirection = null
  }

  const onTouchMove = (e: TouchEvent): void => {
    if (touchStartY === null || inCooldown()) { return }
    const t = e.touches[0]
    if (!t) { return }
    const dy = t.clientY - touchStartY

    // Decide direction based on initial pull and edge state. A finger moving
    // up at scroll-bottom = forward; moving down at scroll-top = backward.
    if (touchActiveDirection === null) {
      if (dy < -PULL_SLOP_PX && isAtBottom()) {
        touchActiveDirection = 'forward'
      } else if (dy > PULL_SLOP_PX && isAtTop()) {
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

  scroller.addEventListener('touchstart', onTouchStart, { passive: true })
  scroller.addEventListener('touchmove', onTouchMove, { passive: true })
  scroller.addEventListener('touchend', onTouchEnd, { passive: true })
  scroller.addEventListener('touchcancel', onTouchEnd, { passive: true })
  scroller.addEventListener('wheel', onWheel, { passive: true })

  return () => {
    scroller.removeEventListener('touchstart', onTouchStart)
    scroller.removeEventListener('touchmove', onTouchMove)
    scroller.removeEventListener('touchend', onTouchEnd)
    scroller.removeEventListener('touchcancel', onTouchEnd)
    scroller.removeEventListener('wheel', onWheel)
    if (wheelIdleTimer) { clearTimeout(wheelIdleTimer) }
  }
}
