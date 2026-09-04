export type MushafGestureAxis = 'pending' | 'horizontal' | 'vertical'
export type MushafPageDirection = 'next' | 'previous'
export type MushafGesturePoint = { at: number; x: number }
export type MushafSettleDecision =
  | { outcome: 'cancel'; direction: MushafPageDirection }
  | { outcome: 'commit'; direction: MushafPageDirection }

const AXIS_SLOP_PX = 8
const AMBIGUOUS_LOCK_PX = 16
const AXIS_DOMINANCE = 1.15
const MIN_DISTANCE_PX = 72
const MAX_DISTANCE_PX = 144
const DISTANCE_RATIO = 0.28
const MIN_FLICK_TRAVEL_PX = 24
const FLICK_VELOCITY_PX_PER_MS = 0.45
const VELOCITY_WINDOW_MS = 100
const BOUNDARY_RESISTANCE = 0.28

export function resolveMushafGestureAxis(deltaX: number, deltaY: number): MushafGestureAxis {
  const horizontal = Math.abs(deltaX)
  const vertical = Math.abs(deltaY)
  if (Math.max(horizontal, vertical) < AXIS_SLOP_PX) return 'pending'
  if (horizontal >= vertical * AXIS_DOMINANCE) return 'horizontal'
  if (vertical >= horizontal * AXIS_DOMINANCE) return 'vertical'
  if (Math.max(horizontal, vertical) < AMBIGUOUS_LOCK_PX) return 'pending'
  return horizontal > vertical ? 'horizontal' : 'vertical'
}

export function mushafDirectionForDelta(deltaX: number): MushafPageDirection {
  return deltaX >= 0 ? 'next' : 'previous'
}

export function mushafRecentVelocity(points: readonly MushafGesturePoint[]): number {
  const last = points[points.length - 1]
  if (!last) return 0
  const first = [...points].reverse().find((point) => last.at - point.at >= VELOCITY_WINDOW_MS) ?? points[0]
  if (!first || first === last) return 0
  return (last.x - first.x) / Math.max(1, last.at - first.at)
}

export function decideMushafSettle(input: {
  deltaX: number
  destinationReady: boolean
  velocityX: number
  width: number
}): MushafSettleDecision {
  const direction = mushafDirectionForDelta(input.deltaX)
  const distanceThreshold = Math.min(MAX_DISTANCE_PX, Math.max(MIN_DISTANCE_PX, input.width * DISTANCE_RATIO))
  const distanceMet = Math.abs(input.deltaX) >= distanceThreshold
  const flickMet = Math.abs(input.deltaX) >= MIN_FLICK_TRAVEL_PX
    && Math.abs(input.velocityX) >= FLICK_VELOCITY_PX_PER_MS
    && Math.sign(input.velocityX) === Math.sign(input.deltaX)
  return input.destinationReady && (distanceMet || flickMet)
    ? { direction, outcome: 'commit' }
    : { direction, outcome: 'cancel' }
}

export function applyMushafBoundaryResistance(deltaX: number): number {
  return deltaX * BOUNDARY_RESISTANCE
}
