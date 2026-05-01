/**
 * Document-level pointer handler that toggles a bookmark when the user
 * taps `.qa-verse-number` (the small glyph at the head of each verse).
 *
 * Listens to BOTH `pointerup` (fires immediately on touch release without
 * the legacy 300ms click delay) and `click` (handles browsers/AT
 * environments that don't dispatch pointer events, e.g. screen readers
 * activating an element). Per-target dedupe via `data-bm-fired` so a
 * single user action doesn't toggle twice.
 *
 * Coexists with `setupTapGestures` (which explicitly skips
 * `.qa-verse-number` clicks for fast-tag) and `edge-indicators`
 * (which provides the visual tap feedback on the same target).
 */

import { toggle } from './store'
import { settings } from '../settings/state.svelte'
import { tagSession } from '../tag/state.svelte'
import { logger } from '../core/logger'
import { closestTokenKey, tokenVerseKey } from '../core/tokenisable'
import type { Riwayah } from '../core/db'

let pointerHandler: ((e: PointerEvent) => void) | null = null
let clickHandler: ((e: Event) => void) | null = null

const DEDUPE_WINDOW_MS = 600

function activeRiwayah(): Riwayah {
  return (settings.riwayah ?? 'qaloon') as Riwayah
}

function tryToggleFrom(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) { return false }
  const numEl = el.closest('.qa-verse-number') as HTMLElement | null
  if (!numEl) { return false }
  const tk = closestTokenKey(numEl)
  const verseKey = tk ? tokenVerseKey(tk) : null
  if (!verseKey) { return false }

  // Dedupe: pointerup → synthetic click on the same target both fire.
  // Stamp the element so the second event is a no-op within DEDUPE_WINDOW_MS.
  const now = Date.now()
  const lastFiredRaw = numEl.dataset['bmFired']
  const lastFired = lastFiredRaw ? parseInt(lastFiredRaw, 10) : 0
  if (now - lastFired < DEDUPE_WINDOW_MS) { return false }
  numEl.dataset['bmFired'] = String(now)

  // Skip bookmark toggle while the fast-tag panel is open — the same tap
  // is consumed by setupTapGestures' onShort to switch the active verse.
  if (tagSession.quickbarOpen) { return false }

  void toggle(verseKey, activeRiwayah()).catch((err) => {
    logger.error('Bookmark toggle failed:', { verseKey, error: err })
  })
  return true
}

export function initBookmarkClickHandler(): () => void {
  if (pointerHandler) { document.removeEventListener('pointerup', pointerHandler) }
  if (clickHandler) { document.removeEventListener('click', clickHandler) }

  pointerHandler = (e: PointerEvent) => {
    // Only primary button — ignore right-click, middle-click, drag releases.
    if (e.button !== 0 && e.pointerType === 'mouse') { return }
    tryToggleFrom(e.target)
  }
  clickHandler = (e: Event) => {
    tryToggleFrom(e.target)
  }

  document.addEventListener('pointerup', pointerHandler, { passive: true })
  document.addEventListener('click', clickHandler, { passive: true })

  return () => {
    if (pointerHandler) {
      document.removeEventListener('pointerup', pointerHandler)
      pointerHandler = null
    }
    if (clickHandler) {
      document.removeEventListener('click', clickHandler)
      clickHandler = null
    }
  }
}
