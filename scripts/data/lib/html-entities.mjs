// Single HTML-entity decoder for the dataset scripts (audit D38). Union of
// the former copies' semantics: optional-semicolon numeric references with a
// codepoint-range guard (the mushaf-pages/theme-svg security semantics) plus
// the `nbsp` named entity (the QUL translation provider's semantics — verse
// and footnote text may carry it). The quran-db provider keeps its own
// deliberately narrower decoder: its committed outputs contain `&#93` and
// `&ndash` forms that must survive verbatim.
export function codepointToString(codepoint) {
  if (!Number.isInteger(codepoint) || codepoint < 0 || codepoint > 0x10ffff) return ''
  return String.fromCodePoint(codepoint)
}

export function decodeHtmlEntities(value) {
  const named = { amp: '&', apos: "'", colon: ':', gt: '>', lt: '<', nbsp: ' ', quot: '"' }
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => codepointToString(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => codepointToString(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity)
}
