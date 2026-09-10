// Canonical Search normalizer pipeline — the single implementation shared by
// the app (typed wrapper in shared/search/normalization.ts) and the data
// pipeline (thin re-export in scripts/data/search/normalizer.mjs). Types for
// this module live in normalization-core.d.mts; keep both files in sync.
//
// Version contract (audit bug #4): SEARCH_NORMALIZER_VERSION is stamped into
// every generated search-pack manifest and asserted against this constant at
// pack load (src/search/pack-reader.ts) and by scripts/data/check-search-packs.mjs.

export const SEARCH_NORMALIZER_VERSION = 1
export const SEARCH_QUERY_AST_VERSION = 1
export const SEARCH_PHASE1_MAX_PHRASE_TOKENS = 8

// Search pack shard byte budgets. The generated pack manifest declares these
// per pack (shared/search/abi.ts SearchByteBudget); this is the build-side
// single source for them.
export const MAX_SHARD_BYTES = 4 * 1024 * 1024
export const MAX_DECODED_SHARD_BYTES = 8 * 1024 * 1024
export const MAX_RESIDENT_WORKER_BYTES = 48 * 1024 * 1024

const SEARCH_NORMALIZATION_POLICY = {
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

export function normalizeSearchInput(input, mode = 'normalized', policy = SEARCH_NORMALIZATION_POLICY) {
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

export function tokenizeSearchText(input, mode = 'normalized') {
  const normalized = normalizeSearchInput(input, mode)
  return normalized ? normalized.split(' ') : []
}
