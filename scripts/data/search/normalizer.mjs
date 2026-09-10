// Thin re-export: the canonical normalizer pipeline, policy constants, and
// shard byte budgets live in shared/search/normalization-core.mjs so the app
// and the data pipeline share one implementation.

export {
  MAX_DECODED_SHARD_BYTES,
  MAX_RESIDENT_WORKER_BYTES,
  MAX_SHARD_BYTES,
  SEARCH_NORMALIZER_VERSION,
  SEARCH_QUERY_AST_VERSION,
  SEARCH_PHASE1_MAX_PHRASE_TOKENS,
  tokenizeSearchText,
} from '../../../shared/search/normalization-core.mjs'
