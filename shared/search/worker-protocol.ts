import type { SearchFeatureId } from './abi'
import type { SearchMappingState } from './mapping'
import type { SearchQueryAstV1, SearchResultCursor, SearchSort } from './query'

export type SearchWorkerEpoch = number

export type SearchWorkerRequest =
  | { type: 'init'; requestId: string; packId: string }
  | { type: 'preloadCore'; requestId: string }
  | { type: 'query'; requestId: string; query: SearchQueryAstV1; cursor?: SearchResultCursor; limit: number; sort: SearchSort }
  | { type: 'explore'; requestId: string; query: SearchQueryAstV1; result: SearchResultDto; sections?: string[]; cursor?: { sectionId: string; offset: number }; limit?: number }
  | { type: 'loadFeature'; requestId: string; featureId: SearchFeatureId }
  | { type: 'cancel'; requestId: string; targetRequestId: string }
  | { type: 'dispose'; requestId: string }

export const SEARCH_WORKER_ERROR_CODES = [
  'unavailable-pack',
  'incompatible-version',
  'missing-feature',
  'corrupt-shard',
  'offline-miss',
  'cancelled',
  'unsupported-query',
  'stale-epoch',
  'activation-changed',
  'quota-unavailable',
] as const

export type SearchWorkerErrorCode = typeof SEARCH_WORKER_ERROR_CODES[number]

export interface SearchResultDto {
  resultId: string
  sourceRef: `${number}:${number}`
  readerRefs: Array<`${number}:${number}`>
  mappingState: SearchMappingState
  canOpenInRead: boolean
  canHighlightWordsInRead: boolean
  matchLanes: Array<'arabic-text' | 'translation' | 'context' | 'exact-word-form' | 'phrase' | 'same-written-form' | 'same-root' | 'lemma' | 'surah-context'>
  snippet: string
  rankKey: string
  sourceText: string
  readerText?: string
  morphology?: {
    sourceNote: string
    root: string | null
    lemma: string | null
    sourceToken: string
    transliteration: string
    wordPosition: number
    tokenOrdinal: number
    sameRootCount?: number
    sameWrittenFormCount?: number
    lemmaCount?: number
    surahContext?: Array<{ surah: number; count: number }>
  }
}

export interface SearchResultWindow {
  results: SearchResultDto[]
  cursor: SearchResultCursor | null
  totalKnownResults: number | null
  rankVersion: string
}

export type SearchWorkerResponse =
  | {
      type: 'ok'
      requestId: string
      workerEpoch: SearchWorkerEpoch
      packId: string
      packVersion: string
      payload:
        | { kind: 'initialized' }
        | { kind: 'preloaded-core' }
        | { kind: 'feature-loaded'; featureId: SearchFeatureId }
        | { kind: 'query-window'; window: SearchResultWindow }
        | { kind: 'explore-sections'; sections: unknown[] }
        | { kind: 'cancelled'; targetRequestId: string }
        | { kind: 'disposed' }
    }
  | {
      type: 'error'
      requestId: string
      workerEpoch: SearchWorkerEpoch
      packId: string | null
      packVersion: string | null
      error: {
        code: SearchWorkerErrorCode
        message: string
        retryable: boolean
      }
    }

export function assertSearchWorkerResponseForRequest(
  request: Pick<SearchWorkerRequest, 'requestId'>,
  response: Pick<SearchWorkerResponse, 'requestId'>,
): void {
  if (request.requestId !== response.requestId) {
    throw new Error(`Search worker response request id ${response.requestId} does not match ${request.requestId}`)
  }
}
