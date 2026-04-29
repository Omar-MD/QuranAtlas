/**
 * haptics — tactile feedback for touch interactions.
 *
 * Wraps the Vibration API (`navigator.vibrate`) with semantic helpers and
 * graceful no-ops on platforms that do not support it (iOS Safari has no
 * vibrate; desktop browsers expose the API but devices have no motor).
 *
 * Respects `prefers-reduced-motion` — users who disable motion also get
 * no haptics, since vibration is a motion cue.
 *
 * Pulse durations are tuned for Android Chrome's vibration motor — too
 * short (<10 ms) and many phones drop the pulse entirely; ≥15 ms is the
 * threshold where every test device fired reliably.
 */

let vibrateFn: ((pattern: number | number[]) => boolean) | null = null
let reduceMotion = false

function init(): void {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') { return }
  if (typeof navigator.vibrate === 'function') {
    vibrateFn = navigator.vibrate.bind(navigator)
  }
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      reduceMotion = e.matches
    })
  } catch {
    /* old Safari without addEventListener on MQL — leave default */
  }
}

init()

function fire(pattern: number | number[]): void {
  if (!vibrateFn || reduceMotion) { return }
  try { vibrateFn(pattern) } catch { /* no-op */ }
}

export function tap(): void { fire(15) }
export function select(): void { fire(20) }
export function toggle(): void { fire([15, 30, 15]) }
export function warn(): void { fire([25, 40, 25]) }

/** True only on platforms that actually deliver vibration — Android Chrome
 *  with `navigator.vibrate` and not running under reduced-motion. iOS
 *  Safari and desktop without a motor return false so callers can choose
 *  to add a visual / audio fallback. */
export function isAvailable(): boolean {
  return vibrateFn !== null && !reduceMotion
}
