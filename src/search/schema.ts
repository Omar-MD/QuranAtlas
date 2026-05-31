import type {
  SearchMappingState,
  SearchQueryAstV1,
  SearchQueryMode,
  SearchResultCursor,
  SearchResultDto,
  SearchResultWindow,
  SearchSort,
  SearchWorkerErrorCode,
} from '../../shared/search'
import type { SearchMorphologyPostingRow, SearchMorphologyRow, SearchSurahContextRow } from './morphology'

export type {
  SearchMappingState,
  SearchQueryAstV1,
  SearchQueryMode,
  SearchResultCursor,
  SearchResultDto,
  SearchResultWindow,
  SearchSort,
  SearchWorkerErrorCode,
}

export type SearchGraphRef = `${number}:${number}`

export type SearchMatchLane = SearchResultDto['matchLanes'][number]

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

export interface SearchRuntimeErrorShape {
  code: SearchWorkerErrorCode
  message: string
  retryable: boolean
}
