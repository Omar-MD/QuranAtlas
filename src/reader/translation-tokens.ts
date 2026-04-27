/**
 * Tokenise a translation verse into a stream of plain text and footnote
 * markers. Markers in the dataset are encoded as `[N]` where N is the
 * 1-indexed footnote number within the surah.
 *
 * Splitting at render time lets the reader render markers as buttons while
 * keeping the underlying data a single string (so the dataset stays small
 * and free of UI-specific structure).
 */

export type TextToken = { type: 'text'; value: string }
export type FootnoteToken = { type: 'fn'; idx: string }
export type TranslationToken = TextToken | FootnoteToken

const MARKER_RE = /\[(\d+)\]/g

export function parseTranslationTokens(translation: string): TranslationToken[] {
  if (!translation) { return [] }
  const tokens: TranslationToken[] = []
  let lastIndex = 0
  for (const m of translation.matchAll(MARKER_RE)) {
    const start = m.index ?? 0
    if (start > lastIndex) {
      tokens.push({ type: 'text', value: translation.slice(lastIndex, start) })
    }
    tokens.push({ type: 'fn', idx: m[1] ?? '' })
    lastIndex = start + m[0].length
  }
  if (lastIndex < translation.length) {
    tokens.push({ type: 'text', value: translation.slice(lastIndex) })
  }
  return tokens
}
