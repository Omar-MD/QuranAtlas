// Typed wrapper over the single-source normalizer implementation in
// ./normalization-core.mjs (also consumed by the data pipeline through
// scripts/data/search/normalizer.mjs). All behavior lives in the core; this
// file only exposes the typed surface used by src/**.

import { SEARCH_PHASE1_MAX_PHRASE_TOKENS } from './normalization-core.mjs'

export {
  SEARCH_NORMALIZER_VERSION,
  SEARCH_QUERY_AST_VERSION,
  SEARCH_PHASE1_MAX_PHRASE_TOKENS,
  normalizeSearchInput,
  tokenizeSearchText as tokenizeSearchInput,
} from './normalization-core.mjs'
export type { SearchNormalizationMode, SearchNormalizationPolicy } from './normalization-core.mjs'

export function assertSearchPhraseWithinPhase1Policy(tokens: readonly string[]): void {
  if (tokens.length > SEARCH_PHASE1_MAX_PHRASE_TOKENS) {
    throw new Error(`Search phrase exceeds Phase 1 maximum of ${SEARCH_PHASE1_MAX_PHRASE_TOKENS} tokens`)
  }
}
