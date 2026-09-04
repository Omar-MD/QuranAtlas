import type { SearchQueryAstV1, SearchResultDto } from '../../shared/search'

export const SEARCH_WORDING_NOTE = 'Results show attested wording in the indexed Quran text. They are not generated suggestions, paraphrases, or tafsir.'
export const SEARCH_SHARED_WORDING_NOTE = 'Shared wording shows lexical overlap in the indexed text. It does not mean the verses have the same interpretation, ruling, theme, or sabab.'
export const SEARCH_FOLLOWING_WORDING_NOTE = 'Attested following wording shows wording observed after this phrase in the indexed text.'
export const SEARCH_OCCURS_ONCE_NOTE = '"Occurs once" means once in the current Search index, according to its text and tokenization.'

export type SearchGraphSectionId =
  | 'following-wording'
  | 'shared-wording'
  | 'repeated-phrases'
  | 'occurs-once'
  | 'ayah-endings'
  | 'counts-patterns'

export interface SearchGraphPolicyRow {
  label: string
  value: string
}

export interface SearchGraphCursor {
  sectionId: SearchGraphSectionId
  offset: number
}

export interface SearchGraphSectionBase {
  id: SearchGraphSectionId
  title: string
  sourcePolicy: SearchGraphPolicyRow[]
  note?: string
  unavailable?: {
    reason: string
    retryable: boolean
  }
  cursor?: SearchGraphCursor | null
}

export interface SearchFollowingWordingSection extends SearchGraphSectionBase {
  id: 'following-wording'
  rows: Array<{
    phrase: string
    followers: Array<{ token: string; count: number; refs: Array<{ ref: `${number}:${number}`; position: number; phraseLength: number }> }>
  }>
}

export interface SearchSharedWordingSection extends SearchGraphSectionBase {
  id: 'shared-wording'
  rows: Array<{
    ref: `${number}:${number}`
    sharedTokenCount: number
    sharedTokens: string[]
  }>
}

export interface SearchPhrasePatternSection extends SearchGraphSectionBase {
  id: 'repeated-phrases' | 'occurs-once'
  rows: Array<{
    phrase: string
    count: number
    refs: Array<{ ref: `${number}:${number}`; position: number }>
  }>
}

export interface SearchAyahEndingsSection extends SearchGraphSectionBase {
  id: 'ayah-endings'
  rows: Array<{
    phrase: string
    length: number
    countInIndex: number
  }>
}

export interface SearchCountsPatternsSection extends SearchGraphSectionBase {
  id: 'counts-patterns'
  summary: {
    tokenCounts: { totalTokens: number; uniqueTokens: number }
    phraseCounts: Array<{ length: number; count: number }>
    rootCounts: Array<{ root: string; count: number }>
    surahDistribution: Array<{ surah: number; ayahCount: number; tokenCount: number }>
    ayahEndings: Array<{ term: string; count: number }>
    adjacencyCounts: { ayahsWithSharedWording: number; sharedEdges: number }
  }
}

export type SearchGraphSection =
  | SearchFollowingWordingSection
  | SearchSharedWordingSection
  | SearchPhrasePatternSection
  | SearchAyahEndingsSection
  | SearchCountsPatternsSection

export interface SearchGraphExploreRequest {
  query: SearchQueryAstV1
  result: SearchResultDto
  sections?: SearchGraphSectionId[]
  cursor?: SearchGraphCursor
  limit?: number
}

export interface SearchGraphExploreResponse {
  sections: SearchGraphSection[]
}
