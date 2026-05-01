// Sub-verse DOM contract (audit C-3 / R-06 / N19). The reader DOM emits
// `data-token-key` on every token-bearing element. Today (post-N19) the
// only granularity shipped is verse-grain — `.qa-verse` carries
// `data-token-key="surah:ayah"`. Future word-by-word translation (#9),
// tajweed coloring (#11), and v2.1 word-karaoke audio render per-word
// spans with `data-token-key="surah:ayah:wordIdx"` inside the verse — at
// which point the verseTokenSelector below selects the whole verse and
// every word inside it uniformly.
//
// As of N19 (2026-05-01) all four verse-grain consumers (long-press,
// bookmark click-handler, marks indicator, bookmarks indicator) read
// `data-token-key` via closestTokenKey + tokenVerseKey. The legacy
// `data-verse-key` alias was dropped in N20 (same day).

export type TokenKey = `${number}:${number}` | `${number}:${number}:${number}`

export interface ParsedTokenKey {
  surah: number
  ayah: number
  wordIdx?: number
}

const TOKEN_KEY_RE = /^(\d+):(\d+)(?::(\d+))?$/

export function parseTokenKey(k: string): ParsedTokenKey | null {
  const m = k.match(TOKEN_KEY_RE)
  if (!m) { return null }
  const surah = parseInt(m[1]!, 10)
  const ayah = parseInt(m[2]!, 10)
  if (!Number.isFinite(surah) || !Number.isFinite(ayah)) { return null }
  if (m[3] === undefined) {
    return { surah, ayah }
  }
  const wordIdx = parseInt(m[3], 10)
  if (!Number.isFinite(wordIdx)) { return null }
  return { surah, ayah, wordIdx }
}

export function formatTokenKey(surah: number, ayah: number, wordIdx?: number): TokenKey {
  if (wordIdx === undefined) {
    return `${surah}:${ayah}` as TokenKey
  }
  return `${surah}:${ayah}:${wordIdx}` as TokenKey
}

export function formatVerseTokenKey(surah: number, ayah: number): TokenKey {
  return `${surah}:${ayah}` as TokenKey
}

/**
 * Resolve a `(x, y)` viewport coordinate to a TokenKey by walking the
 * DOM at that point and finding the nearest ancestor with a
 * `data-token-key` attribute. Returns null if the point isn't over a
 * tokenised element.
 *
 * v2.0 (verse-grain only) returns `surah:ayah`. When word-grain ships,
 * the SAME helper returns `surah:ayah:wordIdx` automatically because the
 * nearest token ancestor changes from the verse container to a word span.
 */
export function getTokenAt(x: number, y: number): TokenKey | null {
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') {
    return null
  }
  const el = document.elementFromPoint(x, y)
  if (!el) { return null }
  const tokenEl = (el as Element).closest('[data-token-key]')
  if (!tokenEl) { return null }
  const key = tokenEl.getAttribute('data-token-key')
  if (!key) { return null }
  return parseTokenKey(key) ? (key as TokenKey) : null
}

/**
 * Convenience: walk up from `el` to the nearest ancestor with a valid
 * `data-token-key` and return that key. Replaces the older
 * `el.closest('[data-verse-key]')?.dataset.verseKey` pattern at the four
 * verse-grain consumers (long-press, bookmark click, marks indicator,
 * bookmarks indicator — N19 migration shipped 2026-05-01).
 */
export function closestTokenKey(el: Element | null): TokenKey | null {
  if (!el) { return null }
  const node = (el as Element).closest('[data-token-key]')
  if (!node) { return null }
  const raw = node.getAttribute('data-token-key')
  if (!raw || !parseTokenKey(raw)) { return null }
  return raw as TokenKey
}

/**
 * Strip `:wordIdx` from a token key, returning the verse-grain form
 * (`surah:ayah`). Idempotent on verse-grain input. Returns null for
 * malformed input.
 *
 * Used by gesture handlers that resolve a hit-test (potentially
 * word-grain post-WBW) to the verse identity for IDB lookups keyed by
 * verseKey (marks, bookmarks).
 */
export function tokenVerseKey(k: string): string | null {
  const parsed = parseTokenKey(k)
  if (!parsed) { return null }
  return `${parsed.surah}:${parsed.ayah}`
}

/**
 * CSS selector matching every element belonging to a verse — at v2.0 a
 * single match (the verse container) but at v2.1+ also every per-word
 * span inside the verse. The audio verse-tick highlight uses this; do
 * not inline the prefix-match logic in callers so the selector shape
 * stays in one place.
 */
export function verseTokenSelector(surah: number, ayah: number): string {
  // CSS attribute prefix-match `^="2:25"` would also match "2:255" — we
  // need stricter matching. Use exact + word-prefix selectors joined.
  const exact = `[data-token-key="${surah}:${ayah}"]`
  const wordPrefix = `[data-token-key^="${surah}:${ayah}:"]`
  return `${exact}, ${wordPrefix}`
}
