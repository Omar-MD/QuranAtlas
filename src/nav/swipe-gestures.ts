/**
 * Pure swipe-classification helpers for MarginHeader gestures.
 * Kept DOM-free so Vitest can exercise the threshold math without jsdom.
 */

const HORIZONTAL_THRESHOLD_PX = 48
const VERTICAL_THRESHOLD_PX = 48
const VERTICAL_DRIFT_GATE_PX = 24
const HORIZONTAL_DRIFT_GATE_PX = 24
const MIN_VELOCITY_PX_PER_MS = 0.3

export type SwipeDirection = 'left' | 'right' | 'down'

interface SwipeInput {
  dx: number
  dy: number
  dtMs: number
}

export function classifySwipe(input: SwipeInput): SwipeDirection | null {
  const { dx, dy, dtMs } = input
  if (dtMs <= 0) { return null }
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  const speedX = absX / dtMs
  const speedY = absY / dtMs

  if (absX >= HORIZONTAL_THRESHOLD_PX && absY < VERTICAL_DRIFT_GATE_PX && speedX > MIN_VELOCITY_PX_PER_MS) {
    return dx < 0 ? 'left' : 'right'
  }
  if (dy >= VERTICAL_THRESHOLD_PX && absX < HORIZONTAL_DRIFT_GATE_PX && speedY > MIN_VELOCITY_PX_PER_MS) {
    return 'down'
  }
  return null
}

export function clampSurah(n: number): number {
  if (!Number.isFinite(n)) { return 1 }
  if (n < 1) { return 1 }
  if (n > 114) { return 114 }
  return Math.floor(n)
}
