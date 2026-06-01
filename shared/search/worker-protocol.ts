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

export type SearchBriefSourceLane = 'arabic-text' | 'translation' | 'context'
export type SearchBriefMorphologyMode = 'same-written-form' | 'same-root' | 'lemma' | 'surah-context'
export type SearchBriefAggregateStatus = 'full' | 'partial' | 'unavailable'
export type SearchBriefFeatureStatus = 'available' | 'missing' | 'offline-unavailable' | 'incompatible'
export type SearchBriefFeatureSection =
  | 'morphology'
  | 'same-written-form'
  | 'same-root'
  | 'lemma'
  | 'following-wording'
  | 'shared-wording'
  | 'repeated-phrases'
  | 'occurs-once'
  | 'ayah-endings'
  | 'counts-patterns'

export type SearchResultMatchLane =
  | 'arabic-text'
  | 'translation'
  | 'context'
  | 'exact-word-form'
  | 'phrase'
  | 'same-written-form'
  | 'same-root'
  | 'lemma'
  | 'surah-context'

export type SearchBriefEvidenceType =
  | 'reference'
  | 'arabic-text'
  | 'exact-word-form'
  | 'exact-source-phrase'
  | 'translation-context'
  | 'same-written-form'
  | 'same-root'
  | 'lemma'

export interface SearchBriefDto {
  query: {
    rawText: string
    normalizedText: string
    tokens: string[]
    mode: SearchQueryAstV1['mode']
    sourceLanes: SearchBriefSourceLane[]
    morphologyMode?: SearchBriefMorphologyMode
  }
  counts: {
    matchedSourceAyahCount: number | null
    matchedResultCount: number
    shownWindowCount: number
    occurrenceCount: number | null
    occurrenceCountKnown: boolean
    aggregateStatus: SearchBriefAggregateStatus
  }
  sourceFrame: {
    packId: string
    packVersion: string
    contentHash: string
    sourceRiwayah: 'hafs'
    sourceIds: string[]
    licenseIds: string[]
    normalizerVersion: number
    queryAstVersion: number
    rankVersion: string
  }
  laneCounts: Array<{
    lane: SearchResultMatchLane | 'reference'
    matchedSourceAyahCount: number
    matchedResultCount: number
    occurrenceCount: number | null
    occurrenceCountKnown: boolean
  }>
  distribution: {
    firstRef: `${number}:${number}` | null
    lastRef: `${number}:${number}` | null
    surahsWithMostIndexedMatches: Array<{ surah: number; matchedSourceAyahCount: number; occurrenceCount?: number }>
  }
  evidenceTypes: SearchBriefEvidenceType[]
  representativeRefs: Array<{
    label: 'top-ranked' | 'first-in-mushaf-order' | 'different-surah-example' | 'translation-context-example' | 'arabic-text-example'
    ref: `${number}:${number}`
  }>
  mappingStateCounts?: Partial<Record<SearchMappingState, number>>
  featureAvailability: Array<{ section: SearchBriefFeatureSection; status: SearchBriefFeatureStatus }>
  sourceNotes: Array<{ id: string; label: string; text: string }>
}

export interface SearchResultMatchEvidence {
  lane: SearchResultMatchLane
  matchedText?: string
  matchedQueryToken?: string
  matchedQueryTokens?: string[]
  matchedSourceToken?: string
  matchedSourceTokens?: string[]
  normalizedTokens?: string[]
  sourcePosition?: number
  sourcePositions?: number[]
  wordPosition?: number
  phraseLength?: number
  morphology?: {
    sourceToken: string
    root: string | null
    lemma: string | null
    rowId?: string
  }
  translationContextExcerpt?: string
  whyMatched: string
}

export interface SearchResultDto {
  resultId: string
  sourceRef: `${number}:${number}`
  readerRefs: Array<`${number}:${number}`>
  mappingState: SearchMappingState
  canOpenInRead: boolean
  canHighlightWordsInRead: boolean
  matchLanes: SearchResultMatchLane[]
  matchEvidence: SearchResultMatchEvidence
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
  brief: SearchBriefDto
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
