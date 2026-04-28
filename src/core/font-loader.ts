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
 * each woff2 manually, hand the ArrayBuffer to the FontFace constructor,
 * await load(), then add to document.fonts. The CSS @font-face
 * declarations stay in place as the canonical source for non-iOS
 * browsers.
 *
 * Originally targeted Amiri Quran; rewritten 2026-04-28 (Amiri family
 * dropped) to load all three KFGQPC riwayat cuts proactively so any
 * runtime riwayah switch hits a hot face cache.
 */

import { logger } from './logger.js'

const ARABIC_RANGE = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF'

const FONT_SOURCES: ReadonlyArray<{ family: string, url: string }> = [
  { family: 'KFGQPC Uthmanic Hafs',   url: '/fonts/kfgqpc-uthmanic-hafs/uthmanic_hafs_v22.woff2' },
  { family: 'KFGQPC Uthmanic Warsh',  url: '/fonts/kfgqpc-uthmanic-warsh/UthmanicWarsh_V21.woff2' },
  { family: 'KFGQPC Uthmanic Qaloon', url: '/fonts/kfgqpc-uthmanic-qaloon/UthmanicQaloun_V21.woff2' },
]

let started = false

export function loadArabicQuranFontProgrammatically(): void {
  if (started) { return }
  started = true

  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') {
    return
  }

  for (const { family, url } of FONT_SOURCES) {
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
}
