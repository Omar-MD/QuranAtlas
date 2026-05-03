/**
 * Programmatic FontFace loader for the KFGQPC Uthmanic family.
 *
 * Background — iOS Safari renders `.qa-verse-arabic` with collapsed
 * combining marks even after the CSS `@font-face` reports `loaded` via
 * `document.fonts`. macOS Safari + Chrome + Android all render the same
 * verses with full mark positioning. The discrepancy survived every CSS-
 * level fix attempt (font-display: swap, preload + crossorigin, hidden
 * render-tree refs, font-feature-settings cleanup, post-fonts.ready
 * reflow). The iOS-specific failure mode is CSS-side @font-face
 * activation: the FontFace is registered in the FontFaceSet but its GPOS
 * glyph-positioning data isn't wired into the layout pipeline for a
 * render that already happened against a fallback face.
 *
 * Workaround: bypass the CSS @font-face activation path entirely. Fetch
 * the woff2 manually, hand the ArrayBuffer to the FontFace constructor,
 * await load(), then add to document.fonts. The CSS @font-face
 * declarations stay in place as the canonical source for non-iOS
 * browsers.
 *
 * **Lazy by riwayah** (post-2026-04-29): only the user's active riwayah
 * cut is fetched at boot. Other-riwayah cuts are loaded on demand when
 * the Settings sheet swaps riwayah (`SETTINGS_RIWAYAH_CHANGED`). This
 * cuts ~180 KB from the up-front payload for single-riwayah users (~85 %
 * of installs). The CacheFirst SW route at `/fonts/*.woff2` keeps each
 * fetched cut warm for the deploy lifetime.
 */

import { logger } from './logger.js'
import type { Riwayah } from '../configure/state.svelte'

const ARABIC_RANGE = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF'

const FONT_SOURCES: Record<Riwayah, { family: string, url: string }> = {
  hafs:   { family: 'KFGQPC Uthmanic Hafs',   url: '/fonts/kfgqpc-uthmanic-hafs/uthmanic_hafs_v22.woff2' },
  warsh:  { family: 'KFGQPC Uthmanic Warsh',  url: '/fonts/kfgqpc-uthmanic-warsh/UthmanicWarsh_V21.woff2' },
  qaloon: { family: 'KFGQPC Uthmanic Qaloon', url: '/fonts/kfgqpc-uthmanic-qaloon/UthmanicQaloun_V21.woff2' },
}

const loaded = new Set<Riwayah>()

/**
 * Fetch the KFGQPC cut for a single riwayah and register it in
 * `document.fonts`. Idempotent per riwayah. Fire-and-forget — failure is
 * tolerated (the CSS @font-face declaration is still active as a fallback
 * activation path on non-iOS browsers, plus Amiri Quran ships as the
 * cross-riwayah fallback).
 */
export function loadArabicQuranFontProgrammatically(riwayah: Riwayah): void {
  if (loaded.has(riwayah)) { return }
  loaded.add(riwayah)

  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') {
    return
  }

  const { family, url } = FONT_SOURCES[riwayah]

  void (async () => {
    try {
      const res = await fetch(url, { credentials: 'omit' })
      if (!res.ok) {
        logger.warn(`font: fetch failed (${family}) — ${res.status}`)
        return
      }
      const buf = await res.arrayBuffer()
      const face = new FontFace(family, buf, {
        unicodeRange: ARABIC_RANGE,
        display: 'swap',
      })
      await face.load()
      document.fonts.add(face)
    } catch (error) {
      logger.warn(`font: programmatic load failed (${family})`, { error })
    }
  })()
}
