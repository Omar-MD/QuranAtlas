/**
 * Set `data-engine="safari"` on `<html>` when the active engine is WebKit
 * (Safari macOS, iOS Safari, iOS Chrome, Playwright headless WebKit).
 *
 * Why: KFGQPC `warsh.10` and `qaloon.10` woff2 outlines render as hollow /
 * broken combining-mark stacks on CoreGraphics / Quartz. Skia (Chromium)
 * and Gecko (Firefox) render the same outlines correctly. Local
 * investigation 2026-04-26/27 ruled out ttfautohint, perpendicular outline
 * embolden, and skia-pathops removeOverlaps as fixes — the bug is in the
 * upstream font geometry, and there is no public alternative Qaloon /
 * Warsh Naskh font with full Quranic mark coverage. CSS in
 * `src/styles/tokens/semantic.css` substitutes Amiri Quran for these two
 * riwayat when `[data-engine="safari"]` is present, while leaving Hafs
 * (which renders correctly via the embolden + ttfautohint pipeline)
 * untouched. See `docs/context/riwayat-dataset.md` § "Cross-engine
 * rendering" for the full landscape and stopgap rationale.
 *
 * Detection: `navigator.vendor === "Apple Computer, Inc."` is set by every
 * WebKit derivative (Safari desktop / iOS, Mobile Safari, headless WebKit)
 * and by no other engine — Chromium reports `"Google Inc."`, Firefox
 * reports `""`. More reliable than UA sniffing, immune to spoofing the
 * "Safari" token in non-Safari user agents.
 *
 * Runs synchronously at module load (well before first paint of any
 * `.qa-verse-arabic`), so the engine attribute is on `<html>` by the
 * time CSS variable resolution decides which `@font-face` to fetch.
 */

export function detectEngine(): void {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    return
  }
  const vendor = navigator.vendor ?? ''
  if (vendor.startsWith('Apple')) {
    document.documentElement.setAttribute('data-engine', 'safari')
  }
}
