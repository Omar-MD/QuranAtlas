import {
  SEARCH_PHASE1_MAX_PHRASE_TOKENS,
  SEARCH_QUERY_AST_VERSION,
  assertSearchPhraseWithinPhase1Policy,
  type SearchQueryAstV1,
  type SearchQueryMode,
} from '../../shared/search'
import { hasArabicScript, normalizeSearchText, tokenizeSearchText } from './normalizer'
import { parseSearchReference } from './reference-parser'
import type { ParsedSearchQuery } from './schema'

export class SearchQueryParseError extends Error {
  readonly code = 'unsupported-query' as const

  constructor(message: string) {
    super(message)
    this.name = 'SearchQueryParseError'
  }
}

export interface SearchQueryParseOptions {
  mode?: SearchQueryMode
  maxRawLength?: number
}

export function parseSearchQuery(rawText: string, options: SearchQueryParseOptions = {}): ParsedSearchQuery {
  const mode = options.mode ?? 'all'
  const trimmed = rawText.trim()
  if (!trimmed) throw new SearchQueryParseError('Search query is empty')
  if (trimmed.length > (options.maxRawLength ?? 256)) throw new SearchQueryParseError('Search query is too long')

  const reference = parseSearchReference(trimmed)
  const normalizationMode = mode === 'exact-word-form' ? 'exact-word-form' : 'normalized'
  const normalizedText = reference ? trimmed : normalizeSearchText(trimmed, normalizationMode)
  const tokens = reference ? [] : tokenizeSearchText(trimmed, normalizationMode)
  const phraseTokens = mode === 'phrase'
    ? tokenizeSearchText(trimmed, 'normalized')
    : inferPhraseTokens(mode, trimmed, tokens)

  if (!reference && tokens.length === 0) throw new SearchQueryParseError('Search query has no searchable tokens')
  if (mode === 'phrase') {
    if (phraseTokens.length < 2) throw new SearchQueryParseError('Phrase search needs at least two tokens')
    assertSearchPhraseWithinPhase1Policy(phraseTokens)
  }
  if (phraseTokens.length > SEARCH_PHASE1_MAX_PHRASE_TOKENS) {
    throw new SearchQueryParseError(`Search phrase exceeds Phase 1 maximum of ${SEARCH_PHASE1_MAX_PHRASE_TOKENS} tokens`)
  }

  const ast: SearchQueryAstV1 = {
    astVersion: SEARCH_QUERY_AST_VERSION,
    mode,
    rawText: trimmed,
    normalizedText,
    tokens,
    filters: {
      sourceLane: sourceLanesForMode(mode, hasArabicScript(trimmed)),
      morphology: morphologyFiltersForMode(mode),
    },
  }

  return {
    ast,
    queryHash: stableQueryHash(ast),
    phraseTokens,
    reference: reference?.ref ?? null,
  }
}

export function stableQueryHash(ast: SearchQueryAstV1): string {
  let hash = 0x811c9dc5
  const input = JSON.stringify(ast)
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function inferPhraseTokens(mode: SearchQueryMode, rawText: string, tokens: string[]): string[] {
  if (mode !== 'all' && mode !== 'arabic-text') return []
  if (!hasArabicScript(rawText) || tokens.length < 2) return []
  return tokenizeSearchText(rawText, 'normalized')
}

function sourceLanesForMode(
  mode: SearchQueryMode,
  queryHasArabic: boolean,
): SearchQueryAstV1['filters']['sourceLane'] {
  if (mode === 'arabic-text' || mode === 'exact-word-form' || mode === 'phrase') return ['arabic-text']
  if (mode === 'same-written-form' || mode === 'same-root' || mode === 'lemma' || mode === 'surah-context') return ['arabic-text']
  if (mode === 'translation') return ['translation']
  if (mode === 'context') return ['context']
  return queryHasArabic ? ['arabic-text'] : ['translation', 'context']
}

function morphologyFiltersForMode(mode: SearchQueryMode): SearchQueryAstV1['filters']['morphology'] | undefined {
  if (mode === 'same-written-form' || mode === 'same-root' || mode === 'lemma' || mode === 'surah-context') return [mode]
  return undefined
}
