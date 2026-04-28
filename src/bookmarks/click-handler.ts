/**
 * Document-level click handler that toggles a bookmark when the user taps
 * `.qa-verse-number` (the small glyph at the head of each verse).
 *
 * Mirrors the pattern used by `reader/edge-indicators.ts` — a single
 * `document.addEventListener('click')` for the lifetime of the app, attached
 * once at bootstrap. Coexists with `setupTapGestures` (which explicitly
 * skips `.qa-verse-number` clicks for fast-tag) and `edge-indicators`
 * (which provides the visual tap feedback on the same target).
 */

import { toggle } from './store'
import { settings } from '../state/settings.svelte'
import { tagSession } from '../state/tag-session.svelte'
import { logger } from '../core/logger'
import type { Riwayah } from '../core/db'

let clickHandler: ((e: Event) => void) | null = null

function activeRiwayah(): Riwayah {
  return (settings.riwayah ?? 'qaloon') as Riwayah
}

export function initBookmarkClickHandler(): () => void {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler)
  }

  clickHandler = (e: Event) => {
    const target = e.target as HTMLElement | null
    if (!target) { return }
    const numEl = target.closest('.qa-verse-number') as HTMLElement | null
    if (!numEl) { return }
    const verseEl = numEl.closest('.qa-verse') as HTMLElement | null
    if (!verseEl) { return }
    const verseKey = verseEl.getAttribute('data-verse-key')
    if (!verseKey) { return }

    // Skip bookmark toggle while the fast-tag panel is open — the same tap
    // is consumed by setupTapGestures' onShort to switch the active verse.
    if (tagSession.quickbarOpen) { return }

    void toggle(verseKey, activeRiwayah()).catch((err) => {
      logger.error('Bookmark toggle failed:', { verseKey, error: err })
    })
  }

  document.addEventListener('click', clickHandler, { passive: true })

  return () => {
    if (clickHandler) {
      document.removeEventListener('click', clickHandler)
      clickHandler = null
    }
  }
}
