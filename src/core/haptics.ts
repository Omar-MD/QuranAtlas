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
 * Durations follow Material guidance for non-stop pulses (≤ 20 ms tap,
 * 12 ms select, 18 ms toggle). Anything longer feels jittery on Android.
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

export function tap(): void { fire(8) }
export function select(): void { fire(12) }
export function toggle(): void { fire([12, 22, 12]) }
export function warn(): void { fire([18, 32, 18]) }
