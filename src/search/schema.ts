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

export interface SearchRuntimeErrorShape {
  code: SearchWorkerErrorCode
  message: string
  retryable: boolean
}
