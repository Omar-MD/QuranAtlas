const SEARCH_NORMALIZER_VERSION = 1
export const SEARCH_QUERY_AST_VERSION = 1
export const SEARCH_PHASE1_MAX_PHRASE_TOKENS = 8

export interface SearchNormalizationPolicy {
  version: typeof SEARCH_NORMALIZER_VERSION
  unicodeNormalization: 'NFC'
  removeQuranMarks: boolean
  removeTatweel: boolean
  foldHamzaAndAlif: boolean
  foldYaAndAlifMaqsura: boolean
  foldTaaMarbuta: boolean
  normalizeArabicIndicDigits: boolean
  collapseWhitespace: boolean
  preserveExactWordMarks: boolean
}

const SEARCH_NORMALIZATION_POLICY: SearchNormalizationPolicy = {
  version: SEARCH_NORMALIZER_VERSION,
  unicodeNormalization: 'NFC',
  removeQuranMarks: true,
  removeTatweel: true,
  foldHamzaAndAlif: true,
  foldYaAndAlifMaqsura: true,
  foldTaaMarbuta: true,
  normalizeArabicIndicDigits: true,
  collapseWhitespace: true,
  preserveExactWordMarks: true,
}

const QURAN_MARKS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL_RE = /\u0640/g
const HAMZA_ALIF_RE = /[\u0622\u0623\u0625\u0671]/g
const YA_ALIF_MAQSURA_RE = /\u0649/g
const TAA_MARBUTA_RE = /\u0629/g
const ARABIC_INDIC_DIGITS_RE = /[\u0660-\u0669\u06F0-\u06F9]/g
const TOKEN_SEPARATOR_RE = /[^\p{Script=Arabic}\p{Letter}\p{Number}]+/gu
const EXACT_TOKEN_SEPARATOR_RE = /[^\p{Script=Arabic}\p{Letter}\p{Number}\p{Mark}]+/gu

export type SearchNormalizationMode = 'normalized' | 'exact-word-form'

export function normalizeSearchInput(
  input: string,
  mode: SearchNormalizationMode = 'normalized',
  policy: SearchNormalizationPolicy = SEARCH_NORMALIZATION_POLICY,
): string {
  let output = input.normalize(policy.unicodeNormalization)
  if (mode !== 'exact-word-form') {
    if (policy.removeQuranMarks) output = output.replace(QURAN_MARKS_RE, '')
    if (policy.removeTatweel) output = output.replace(TATWEEL_RE, '')
    if (policy.foldHamzaAndAlif) output = output.replace(HAMZA_ALIF_RE, '\u0627')
    if (policy.foldYaAndAlifMaqsura) output = output.replace(YA_ALIF_MAQSURA_RE, '\u064A')
    if (policy.foldTaaMarbuta) output = output.replace(TAA_MARBUTA_RE, '\u0647')
  } else if (!policy.preserveExactWordMarks) {
    output = output.replace(QURAN_MARKS_RE, '')
  }
  if (policy.normalizeArabicIndicDigits) {
    output = output.replace(ARABIC_INDIC_DIGITS_RE, (digit) => {
      const code = digit.codePointAt(0) ?? 0
      const zero = code >= 0x06f0 ? 0x06f0 : 0x0660
      return String(code - zero)
    })
  }
  output = output.replace(mode === 'exact-word-form' ? EXACT_TOKEN_SEPARATOR_RE : TOKEN_SEPARATOR_RE, ' ')
  return policy.collapseWhitespace ? output.trim().replace(/\s+/g, ' ') : output
}

export function tokenizeSearchInput(input: string, mode: SearchNormalizationMode = 'normalized'): string[] {
  const normalized = normalizeSearchInput(input, mode)
  return normalized ? normalized.split(' ') : []
}

export function assertSearchPhraseWithinPhase1Policy(tokens: readonly string[]): void {
  if (tokens.length > SEARCH_PHASE1_MAX_PHRASE_TOKENS) {
    throw new Error(`Search phrase exceeds Phase 1 maximum of ${SEARCH_PHASE1_MAX_PHRASE_TOKENS} tokens`)
  }
}
