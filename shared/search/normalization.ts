export const SEARCH_NORMALIZER_VERSION = 1
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

export interface SearchTokenizationPolicy {
  splitOnPunctuation: boolean
  splitOnWhitespace: boolean
  keepArabicAndLatinLetters: boolean
  keepDigits: boolean
}

export interface SearchPhraseWindowPolicy {
  maxPhase1PhraseTokens: typeof SEARCH_PHASE1_MAX_PHRASE_TOKENS
  canCrossAyahBoundary: false
  canCrossSurahBoundary: false
  canCrossBismillahBoundary: false
  maxMaterializedNgramTokensPhase3: number
}

export interface SearchByteBudgetGates {
  maxShardBytes: number
  maxDecodedShardBytes: number
  maxResidentWorkerBytes: number
}

export const SEARCH_PHASE1_BYTE_BUDGET: SearchByteBudgetGates = {
  maxShardBytes: 4 * 1024 * 1024,
  maxDecodedShardBytes: 8 * 1024 * 1024,
  maxResidentWorkerBytes: 48 * 1024 * 1024,
}

export const SEARCH_NORMALIZATION_POLICY: SearchNormalizationPolicy = {
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

export const SEARCH_TOKENIZATION_POLICY: SearchTokenizationPolicy = {
  splitOnPunctuation: true,
  splitOnWhitespace: true,
  keepArabicAndLatinLetters: true,
  keepDigits: true,
}

export const SEARCH_PHRASE_WINDOW_POLICY: SearchPhraseWindowPolicy = {
  maxPhase1PhraseTokens: SEARCH_PHASE1_MAX_PHRASE_TOKENS,
  canCrossAyahBoundary: false,
  canCrossSurahBoundary: false,
  canCrossBismillahBoundary: false,
  maxMaterializedNgramTokensPhase3: 6,
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
      const zero = code >= 0x06F0 ? 0x06F0 : 0x0660
      return String(code - zero)
    })
  }
  output = output.replace(mode === 'exact-word-form' ? EXACT_TOKEN_SEPARATOR_RE : TOKEN_SEPARATOR_RE, ' ')
  return policy.collapseWhitespace ? output.trim().replace(/\s+/g, ' ') : output
}

export function tokenizeSearchInput(
  input: string,
  mode: SearchNormalizationMode = 'normalized',
): string[] {
  const normalized = normalizeSearchInput(input, mode)
  return normalized ? normalized.split(' ') : []
}

export function assertSearchPhraseWithinPhase1Policy(tokens: readonly string[]): void {
  if (tokens.length > SEARCH_PHASE1_MAX_PHRASE_TOKENS) {
    throw new Error(`Search phrase exceeds Phase 1 maximum of ${SEARCH_PHASE1_MAX_PHRASE_TOKENS} tokens`)
  }
}

export function assertSearchShardWithinByteBudget(bytes: number, decodedBytes: number, residentBytes: number): void {
  if (bytes > SEARCH_PHASE1_BYTE_BUDGET.maxShardBytes) {
    throw new Error('Search shard exceeds Phase 1 encoded byte budget')
  }
  if (decodedBytes > SEARCH_PHASE1_BYTE_BUDGET.maxDecodedShardBytes) {
    throw new Error('Search shard exceeds Phase 1 decoded byte budget')
  }
  if (residentBytes > SEARCH_PHASE1_BYTE_BUDGET.maxResidentWorkerBytes) {
    throw new Error('Search worker exceeds Phase 1 resident byte budget')
  }
}
