// Smart-defer auto-scroll: scroll the playing verse into view UNLESS the
// user manually scrolled within the last 5 seconds. Modes:
//   - smart  (default) → defer 5s after manual scroll
//   - always           → scroll on every verse change regardless
//   - off              → no auto-scroll
//
// Pulls mode dynamically from `settings.audioAutoScrollMode` so user
// changes take effect without reinitialising.

import { on } from '../core/events'
import { Events } from '../core/constants'
import { parseTokenKey } from '../core/tokenisable'
import { settings } from '../settings/state.svelte'

const SMART_DEFER_MS = 5000
const VIEWPORT_MARGIN_PX = 80

let lastUserScrollTs = 0
let unsubVerseChange: (() => void) | null = null
let scrollHandler: (() => void) | null = null

function shouldScroll(now: number): boolean {
  const mode = settings.audioAutoScrollMode
  if (mode === 'off') { return false }
  if (mode === 'always') { return true }
  return now - lastUserScrollTs >= SMART_DEFER_MS
}

function scrollVerseIntoView(verseKey: string): void {
  const parsed = parseTokenKey(verseKey)
  if (!parsed) { return }
  const selector = `[data-token-key="${parsed.surah}:${parsed.ayah}"]`
  const el = document.querySelector(selector) as HTMLElement | null
  if (!el) { return }
  const rect = el.getBoundingClientRect()
  if (rect.top < VIEWPORT_MARGIN_PX || rect.bottom > window.innerHeight - VIEWPORT_MARGIN_PX) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

export function initAudioAutoScroll(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }
  scrollHandler = () => { lastUserScrollTs = Date.now() }
  window.addEventListener('scroll', scrollHandler, { passive: true, capture: true })

  unsubVerseChange = on(Events.AUDIO_VERSE_CHANGED, ({ verseKey }) => {
    if (!shouldScroll(Date.now())) { return }
    scrollVerseIntoView(verseKey)
  })

  return () => {
    if (scrollHandler) { window.removeEventListener('scroll', scrollHandler, { capture: true }); scrollHandler = null }
    if (unsubVerseChange) { unsubVerseChange(); unsubVerseChange = null }
  }
}

/** Test-only helper. */
export function _setLastUserScrollForTest(ts: number): void {
  lastUserScrollTs = ts
}
