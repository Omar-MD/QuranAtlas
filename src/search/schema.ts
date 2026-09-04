import type {
  SearchMappingState,
  SearchBriefDto,
  SearchBriefFeatureSection,
  SearchQueryAstV1,
  SearchQueryMode,
  SearchResultCursor,
  SearchResultDto,
  SearchResultMatchEvidence,
  SearchResultMatchLane,
  SearchResultWindow,
  SearchSort,
  SearchWorkerErrorCode,
} from '../../shared/search'
import type { SearchMorphologyPostingRow, SearchMorphologyRow, SearchSurahContextRow } from './morphology'
import type {
  SearchGraphPolicyRow,
} from './graph'

export type {
  SearchMappingState,
  SearchBriefDto,
  SearchBriefFeatureSection,
  SearchQueryAstV1,
  SearchQueryMode,
  SearchResultCursor,
  SearchResultDto,
  SearchResultMatchEvidence,
  SearchResultMatchLane,
  SearchResultWindow,
  SearchSort,
  SearchWorkerErrorCode,
}

export type SearchGraphRef = `${number}:${number}`

export type SearchMatchLane = SearchResultMatchLane

export interface ParsedSearchQuery {
  ast: SearchQueryAstV1
  queryHash: string
  phraseTokens: string[]
  reference: SearchGraphRef | null
}

export interface SearchAyahRow {
  ayahId: number
  ref: SearchGraphRef
  surah: number
  ayah: number
  sourceRef: SearchGraphRef
  arabicText: string
  translationText: string
  tokenCount: number
}

export interface SearchPostingPosition {
  ayahId: number
  position: number
}

export interface SearchPostingRow {
  term: string
  postings: SearchPostingPosition[]
}

export interface SearchDecodedShard<TPayload = unknown> {
  shardId: string
  payload: TPayload
  byteLength: number
  estimatedMemoryBytes: number
}

export interface SearchReferencesPayload {
  kind: 'references'
  ayahs: SearchAyahRow[]
}

export interface SearchDictionariesPayload {
  kind: 'dictionaries'
  dictionaries: {
    normalizedTokens: Array<{ id: number; value: string }>
    surfaceTokens: Array<{ id: number; value: string }>
  }
}

export interface SearchPostingsPayload {
  kind: 'postings'
  lane: 'arabic' | 'exact-word' | 'translation' | 'phrase'
  phraseLength?: number
  postings: SearchPostingRow[]
}

export interface SearchFollowingWordingPayload {
  kind: 'following-wording'
  sourcePolicy: SearchGraphPolicyRow[]
  rows: Array<{
    term: string
    length: number
    followers: Array<{ token: string; count: number; refs: Array<{ ref: SearchGraphRef; position: number; phraseLength: number }> }>
  }>
}

export interface SearchSharedWordingPayload {
  kind: 'shared-wording'
  sourcePolicy: SearchGraphPolicyRow[]
  rows: Array<{
    ayahId: number
    ref: SearchGraphRef
    neighbors: Array<{ ayahId: number; ref: SearchGraphRef; sharedTokenCount: number; sharedTokens: string[] }>
  }>
}

export interface SearchRepeatedPhrasesPayload {
  kind: 'repeated-phrases'
  sourcePolicy: SearchGraphPolicyRow[]
  rows: Array<{ term: string; length: number; count: number; refs: Array<{ ref: SearchGraphRef; position: number }> }>
}

export interface SearchOccursOncePayload {
  kind: 'occurs-once'
  sourcePolicy: SearchGraphPolicyRow[]
  rows: Array<{ term: string; length: number; count: 1; refs: Array<{ ref: SearchGraphRef; position: number }> }>
}

export interface SearchAyahEndingsPayload {
  kind: 'ayah-endings'
  sourcePolicy: SearchGraphPolicyRow[]
  rows: Array<{
    ayahId: number
    ref: SearchGraphRef
    endings: Array<{ term: string; length: number; position: number; countInIndex: number }>
  }>
  topEndings: Array<{ term: string; count: number; refs: Array<{ ref: SearchGraphRef; position: number; length: number }> }>
}

export interface SearchCountsPatternsPayload {
  kind: 'counts-patterns'
  sourcePolicy: SearchGraphPolicyRow[]
  tokenCounts: { totalTokens: number; uniqueTokens: number }
  phraseCounts: Array<{ length: number; count: number }>
  rootCounts: Array<{ root: string; count: number }>
  surahDistribution: Array<{ surah: number; ayahCount: number; tokenCount: number }>
  ayahEndings: Array<{ term: string; count: number }>
  adjacencyCounts: { ayahsWithSharedWording: number; sharedEdges: number }
}

export interface SearchGraphProvenancePayload {
  kind: 'graph-provenance'
  sourcePolicy: SearchGraphPolicyRow[]
  sourceIds: string[]
  generatedFeatureIds: string[]
}

export interface SearchMorphologyDictionaryPayload {
  kind: 'morphology-dictionary'
  dictionary: 'roots' | 'lemmas'
  entries: Array<{ id: number; value: string; count: number }>
}

export interface SearchMorphologyRowsPayload {
  kind: 'morphology-rows'
  rows: SearchMorphologyRow[]
}

export interface SearchMorphologyPostingsPayload {
  kind: 'morphology-postings'
  lane: 'same-written-form-postings' | 'same-root-postings' | 'lemma-postings'
  postings: SearchMorphologyPostingRow[]
}

export interface SearchSurahContextPayload {
  kind: 'surah-context'
  roots: SearchSurahContextRow[]
  lemmas: SearchSurahContextRow[]
  writtenForms: SearchSurahContextRow[]
}

export interface SearchMorphologyProvenancePayload {
  kind: 'morphology-provenance'
  sourceId: string
  sourceVersion: string
  sourcePath: string
  sourceUrl: string
  sourceSha256: string
  acceptedSha256: string[]
  licenseIds: string[]
  sourceAvailability: string
  transformedDataNotes: string
  requiredNotice: string
  coverage: {
    surahs: number
    ayahs: number
    tokens: number
    rows: number
  }
}

export interface SearchProvenancePayload {
  kind: 'provenance'
  sourceIds: string[]
  buildInputDigests: Record<string, string>
  generatedAt: string
}

export type SearchPackShardPayload =
  | SearchReferencesPayload
  | SearchDictionariesPayload
  | SearchPostingsPayload
  | SearchProvenancePayload
  | SearchMorphologyDictionaryPayload
  | SearchMorphologyRowsPayload
  | SearchMorphologyPostingsPayload
  | SearchSurahContextPayload
  | SearchMorphologyProvenancePayload
  | SearchFollowingWordingPayload
  | SearchSharedWordingPayload
  | SearchRepeatedPhrasesPayload
  | SearchOccursOncePayload
  | SearchAyahEndingsPayload
  | SearchCountsPatternsPayload
  | SearchGraphProvenancePayload

export interface SearchRuntimeErrorShape {
  code: SearchWorkerErrorCode
  message: string
  retryable: boolean
}
