/**
 * Programmatic FontFace loader for the three KFGQPC riwayah fonts.
 *
 * Background — iOS Safari renders `.qa-verse-arabic` with collapsed
 * combining marks even after the CSS `@font-face` reports `loaded` via
 * `document.fonts`. macOS Safari + Chrome + Android all render the same
 * verses with full mark positioning. The discrepancy survived every CSS-
 * level fix attempt (font-display: swap, preload + crossorigin, hidden
 * render-tree refs, font-feature-settings cleanup, post-fonts.ready
 * reflow). The remaining iOS-specific failure mode appears to be CSS-
 * side @font-face activation: the FontFace is registered in the FontFaceSet
 * but its GPOS glyph-positioning data isn't actually wired into the layout
 * pipeline for a render that already happened against a fallback face.
 *
 * Workaround: bypass the CSS @font-face activation path entirely. Fetch
 * the woff2 manually, hand the ArrayBuffer to the FontFace constructor,
 * await load(), then add to document.fonts. This gives iOS a fresh,
 * unblemished FontFace registration that doesn't depend on CSS cascade
 * timing or render-tree side effects. The CSS @font-face declarations
 * stay in place as the canonical source for non-iOS browsers and as a
 * fallback should the fetch fail.
 */

import { logger } from './logger.js'

const ARABIC_RANGE = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF'

const FONT_SOURCES: ReadonlyArray<{ family: string, url: string }> = [
  { family: 'KFGQPC Hafs',   url: '/fonts/kfgqpc-hafs/hafs.18.woff2' },
  { family: 'KFGQPC Warsh',  url: '/fonts/kfgqpc-warsh/warsh.10.woff2' },
  { family: 'KFGQPC Qaloon', url: '/fonts/kfgqpc-qaloon/qaloon.10.woff2' },
]

let started = false

export function loadKfgqpcFontsProgrammatically(): void {
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
