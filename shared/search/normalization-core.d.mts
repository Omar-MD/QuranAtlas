// Types for shared/search/normalization-core.mjs, the single-source normalizer
// shared by the app and the data pipeline. Keep in sync with the .mjs
// implementation (including the version literals below).

export declare const SEARCH_NORMALIZER_VERSION: 1
export declare const SEARCH_QUERY_AST_VERSION: 1
export declare const SEARCH_PHASE1_MAX_PHRASE_TOKENS: 8

export declare const MAX_SHARD_BYTES: number
export declare const MAX_DECODED_SHARD_BYTES: number
export declare const MAX_RESIDENT_WORKER_BYTES: number

export type SearchNormalizationMode = 'normalized' | 'exact-word-form'

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

export declare function normalizeSearchInput(
  input: string,
  mode?: SearchNormalizationMode,
  policy?: SearchNormalizationPolicy,
): string

export declare function tokenizeSearchText(input: string, mode?: SearchNormalizationMode): string[]
