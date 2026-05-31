import type { SearchFeatureId } from './abi'
import type { SearchMappingState } from './mapping'

export const SEARCH_QUERY_MODES = [
  'all',
  'arabic-text',
  'translation',
  'context',
  'exact-word-form',
  'phrase',
  'same-written-form',
  'same-root',
  'lemma',
  'surah-context',
] as const

export type SearchQueryMode = typeof SEARCH_QUERY_MODES[number]
export type SearchSort = 'relevance' | 'mushaf-order' | 'surah-order' | 'recent'

export interface SearchQueryAstV1 {
  astVersion: 1
  mode: SearchQueryMode
  rawText: string
  normalizedText: string
  tokens: string[]
  filters: {
    surah?: number[]
    sourceLane?: Array<'arabic-text' | 'translation' | 'context'>
    morphology?: Array<'same-written-form' | 'same-root' | 'lemma' | 'surah-context'>
  }
}

export interface SearchResultCursor {
  packId: string
  packVersion: string
  queryHash: string
  queryAstVersion: 1
  rankVersion: string
  sort: SearchSort
  lastStableResultKey: string
}

export interface SavedSearchIntentV1 {
  schemaVersion: 1
  id: string
  name: string
  queryText: string
  queryMode: SearchQueryMode
  queryAstVersion: 1
  filters: SearchQueryAstV1['filters']
  sourceLanes: Array<'arabic-text' | 'translation' | 'context'>
  sort: SearchSort
  compatiblePackRequirements: {
    packAbiMajor: 1
    normalizerVersion: 1
    requiredFeatures: SearchFeatureId[]
  }
  displayPreferences: {
    showSourceNotes: boolean
  }
  mappingStateFilter?: SearchMappingState[]
  createdAt: number
  updatedAt: number
  lastOpenedAt: number | null
}

export function assertSearchQueryMode(mode: string): asserts mode is SearchQueryMode {
  if (!(SEARCH_QUERY_MODES as readonly string[]).includes(mode)) {
    throw new Error(`unsupported Search query mode ${mode}`)
  }
}
