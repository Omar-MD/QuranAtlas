export const SEARCH_NORMALIZER_VERSION = 1
export const SEARCH_QUERY_AST_VERSION = 1
export const SEARCH_PHASE1_MAX_PHRASE_TOKENS = 8

const QURAN_MARKS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL_RE = /\u0640/g
const HAMZA_ALIF_RE = /[\u0622\u0623\u0625\u0671]/g
const YA_ALIF_MAQSURA_RE = /\u0649/g
const TAA_MARBUTA_RE = /\u0629/g
const ARABIC_INDIC_DIGITS_RE = /[\u0660-\u0669\u06F0-\u06F9]/g
const TOKEN_SEPARATOR_RE = /[^\p{Script=Arabic}\p{Letter}\p{Number}]+/gu
const EXACT_TOKEN_SEPARATOR_RE = /[^\p{Script=Arabic}\p{Letter}\p{Number}\p{Mark}]+/gu

export function normalizeSearchToken(input, mode = 'normalized') {
  let output = String(input ?? '').normalize('NFC')
  if (mode !== 'exact-word-form') {
    output = output
      .replace(QURAN_MARKS_RE, '')
      .replace(TATWEEL_RE, '')
      .replace(HAMZA_ALIF_RE, '\u0627')
      .replace(YA_ALIF_MAQSURA_RE, '\u064A')
      .replace(TAA_MARBUTA_RE, '\u0647')
  }
  output = output.replace(ARABIC_INDIC_DIGITS_RE, (digit) => {
    const code = digit.codePointAt(0) ?? 0
    const zero = code >= 0x06F0 ? 0x06F0 : 0x0660
    return String(code - zero)
  })
  return output.trim()
}

export function normalizeQueryText(input, mode = 'normalized') {
  const separator = mode === 'exact-word-form' ? EXACT_TOKEN_SEPARATOR_RE : TOKEN_SEPARATOR_RE
  return normalizeSearchToken(input, mode).replace(separator, ' ').trim().replace(/\s+/g, ' ')
}

export function tokenizeSearchText(input, mode = 'normalized') {
  const normalized = normalizeQueryText(input, mode)
  return normalized ? normalized.split(' ') : []
}

export function assertPhase1PhraseLength(tokens) {
  if (tokens.length > SEARCH_PHASE1_MAX_PHRASE_TOKENS) {
    throw new Error(`Search phrase exceeds Phase 1 maximum of ${SEARCH_PHASE1_MAX_PHRASE_TOKENS} tokens`)
  }
}
