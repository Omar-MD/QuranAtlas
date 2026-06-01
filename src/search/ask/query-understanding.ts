import type { QueryUnderstandingLite, SearchLensLite } from '../../../shared/search'
import { parseSearchQuery, SearchQueryParseError, stableQueryHash } from '../query-parser'
import { parseSearchReference } from '../reference-parser'
import type { ParsedSearchQuery } from '../schema'

export type AskQueryUnderstanding = {
  understanding: QueryUnderstandingLite
  parsed: ParsedSearchQuery | null
  parseError: SearchQueryParseError | null
}

export function understandAskQuery(query: string, lens?: SearchLensLite): AskQueryUnderstanding {
  const originalQuery = query
  const trimmed = query.trim()
  const reference = parseSearchReference(trimmed)
  const selectedLens = lens ?? lensForRawQuery(trimmed, Boolean(reference))
  try {
    const parsed = parsedForLens(parseSearchQuery(trimmed, { mode: modeForLens(selectedLens) }), selectedLens)
    return {
      parsed,
      parseError: null,
      understanding: {
        originalQuery,
        normalizedQuery: parsed.ast.normalizedText,
        intent: reference ? 'open-reference' : intentForQuery(trimmed, selectedLens),
        lens: selectedLens,
        confidence: confidenceFor(trimmed, selectedLens, parsed.phraseTokens.length),
        selectedCandidateId: reference ? `ref:${reference.ref}` : undefined,
        alternatives: alternativesFor(selectedLens),
        normalizationWarnings: [],
      },
    }
  } catch (error) {
    return {
      parsed: null,
      parseError: error instanceof SearchQueryParseError ? error : new SearchQueryParseError('Search query is unsupported'),
      understanding: {
        originalQuery,
        normalizedQuery: trimmed,
        intent: 'unknown',
        lens: selectedLens,
        confidence: 'low',
        alternatives: alternativesFor(selectedLens),
        normalizationWarnings: [error instanceof Error ? error.message : 'Search query is unsupported'],
      },
    }
  }
}

function parsedForLens(parsed: ParsedSearchQuery, lens: SearchLensLite): ParsedSearchQuery {
  if (lens !== 'mixed') return parsed
  const sourceLane: ParsedSearchQuery['ast']['filters']['sourceLane'] = ['translation', 'context']
  const ast: ParsedSearchQuery['ast'] = {
    ...parsed.ast,
    filters: {
      ...parsed.ast.filters,
      sourceLane,
    },
  }
  return {
    ...parsed,
    ast,
    queryHash: stableQueryHash(ast),
  }
}

function lensForRawQuery(query: string, isReference: boolean): SearchLensLite {
  const hasArabic = /[\u0600-\u06ff]/.test(query)
  const hasQuestionShape = query.includes('?') || /\b(what|where|which|who|how|why|does|do|mean|meaning)\b/i.test(query)
  if (isReference) return 'reference'
  if (hasPairedQuotePhrase(query)) return 'phrase'
  if (/root|lemma|morpholog|same\s+root/i.test(query)) return 'morphology'
  if (hasArabic && hasQuestionShape && /[A-Za-z]/.test(query)) return 'mixed'
  if (hasArabic) return 'quran-text'
  if (query.includes('?')) return 'translation'
  return 'mixed'
}

function hasPairedQuotePhrase(query: string): boolean {
  return /"[^"\n]+"/.test(query)
    || /“[^”\n]+”/.test(query)
    || /‘[^’\n]+’/.test(query)
    || /(?:^|[\s([{])'[^'\n]+'(?=$|[\s.,!?;:)\]}])/.test(query)
}

function modeForLens(lens: SearchLensLite) {
  if (lens === 'reference') return 'all' as const
  if (lens === 'quran-text') return 'arabic-text' as const
  if (lens === 'translation') return 'translation' as const
  if (lens === 'phrase') return 'phrase' as const
  if (lens === 'morphology') return 'same-root' as const
  return 'all' as const
}

function intentForQuery(query: string, lens: SearchLensLite): QueryUnderstandingLite['intent'] {
  if (lens === 'morphology') return 'trace-language'
  if (lens === 'quran-text' || lens === 'phrase') return 'find-occurrences'
  if (query.includes('?') || /what|where|which|who|how/i.test(query)) return 'answer-question'
  return 'find-occurrences'
}

function confidenceFor(query: string, lens: SearchLensLite, phraseTokenCount: number): QueryUnderstandingLite['confidence'] {
  if (query.length < 2) return 'low'
  if (lens === 'phrase' && phraseTokenCount < 2) return 'low'
  if (lens === 'mixed') return 'medium'
  return 'high'
}

function alternativesFor(selectedLens: SearchLensLite): QueryUnderstandingLite['alternatives'] {
  return (['reference', 'quran-text', 'translation', 'phrase', 'morphology'] as const)
    .filter((lens) => lens !== selectedLens)
    .slice(0, 3)
    .map((lens) => ({
      id: `lens:${lens}`,
      label: lens,
      lens,
      reason: `Try ${lens} when this query should be interpreted through that source lane.`,
    }))
}
