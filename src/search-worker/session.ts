import type {
  SearchWorkerRequest,
  SearchWorkerResponse,
  SearchFeatureId,
  SearchPackManifestV1,
  SearchWorkerErrorCode,
} from '../../shared/search'
import { SearchCursorInvalidError } from '../../shared/search'
import {
  SearchPackReader,
  SearchPackReaderError,
  loadSearchPackManifestFromRegistry,
  type SearchPackReaderOptions,
} from '../search/pack-reader'
import { SearchQueryParseError } from '../search/query-parser'
import { AskSearchPreviewBuilder } from '../search/ask/answer-preview-builder'
import { SearchCancellationRegistry, SearchCancelledError, type SearchCancellationToken } from './cancellation'
import { SearchQueryExecutor } from './query-executor'
import { SearchGraphExecutor } from './graph-executor'

export interface SearchWorkerSessionOptions extends SearchPackReaderOptions {
  manifest?: SearchPackManifestV1
}

type SearchWorkerOkPayload = Extract<SearchWorkerResponse, { type: 'ok' }>['payload']
type SearchWorkerSessionRequest = Exclude<SearchWorkerRequest, { type: 'cancel' }>

/** Request handlers keyed by request type; `cancel` is short-circuited in `handle`. */
type SearchWorkerRequestHandlerMap = {
  [K in SearchWorkerSessionRequest['type']]: (
    request: Extract<SearchWorkerRequest, { type: K }>,
    token: SearchCancellationToken,
  ) => Promise<SearchWorkerOkPayload>
}

/** Reader-backed executors created together by `init` and torn down together by `dispose`. */
interface SearchWorkerComponents {
  reader: SearchPackReader
  executor: SearchQueryExecutor
  askBuilder: AskSearchPreviewBuilder
  graphExecutor: SearchGraphExecutor
}

export class SearchWorkerSession {
  private epoch = 1
  private components: SearchWorkerComponents | null = null
  private readonly cancellations = new SearchCancellationRegistry()
  private readonly options: SearchWorkerSessionOptions

  constructor(options: SearchWorkerSessionOptions = {}) {
    this.options = options
  }

  private readonly requestHandlers: SearchWorkerRequestHandlerMap = {
    init: async (request) => {
      await this.init(request.packId)
      return { kind: 'initialized' }
    },
    preloadCore: async () => {
      await this.requireComponents().reader.loadCore()
      return { kind: 'preloaded-core' }
    },
    loadFeature: async (request) => {
      await this.loadFeature(request.featureId)
      return { kind: 'feature-loaded', featureId: request.featureId }
    },
    askPreview: async (request, token) => {
      const answerPreview = await this.requireComponents().askBuilder.buildPreview({
        query: request.query,
        lens: request.lens,
        queryAst: request.queryAst,
        sort: request.sort ?? 'relevance',
        token,
      })
      token.throwIfCancelled()
      return { kind: 'ask-preview', answerPreview }
    },
    askMatchesPage: async (request, token) => {
      const page = await this.requireComponents().askBuilder.buildMatchesPage({
        previewId: request.previewId,
        query: request.query,
        lens: request.lens,
        queryAst: request.queryAst,
        cursor: request.cursor,
        limit: request.limit,
        sort: request.sort ?? 'relevance',
        token,
      })
      token.throwIfCancelled()
      return { kind: 'ask-matches-page', page }
    },
    query: async (request, token) => {
      const window = await this.requireComponents().executor.execute({
        query: request.query,
        cursor: request.cursor,
        limit: request.limit,
        sort: request.sort,
        token,
      })
      token.throwIfCancelled()
      return { kind: 'query-window', window }
    },
    explore: async (request, token) => {
      const response = await this.requireComponents().graphExecutor.explore({
        query: request.query,
        result: request.result,
        sections: request.sections as Parameters<SearchGraphExecutor['explore']>[0]['sections'],
        limit: request.limit,
        token,
      })
      token.throwIfCancelled()
      return { kind: 'explore-sections', sections: response.sections }
    },
    dispose: async () => {
      this.dispose()
      return { kind: 'disposed' }
    },
  }

  async handle(request: SearchWorkerRequest): Promise<SearchWorkerResponse> {
    if (request.type === 'cancel') return this.cancel(request)
    const token = this.cancellations.create(request.requestId)
    try {
      const handler = this.requestHandlers[request.type] as
        | ((request: SearchWorkerRequest, token: SearchCancellationToken) => Promise<SearchWorkerOkPayload>)
        | undefined
      if (!handler) return this.error('unknown', 'unsupported-query', 'Unsupported Search worker request')
      return this.ok(request.requestId, await handler(request, token))
    } catch (error) {
      return this.errorFrom(request.requestId, error)
    } finally {
      this.cancellations.release(request.requestId)
    }
  }

  dispose(): void {
    this.components?.reader.dispose()
    this.components = null
    this.epoch += 1
  }

  private async init(packId: string): Promise<void> {
    const manifest = this.options.manifest ?? (await loadSearchPackManifestFromRegistry(packId, this.options))
    if (manifest.packId !== packId)
      throw new SearchPackReaderError('unavailable-pack', `Search pack ${packId} does not match active manifest`)
    const reader = new SearchPackReader(manifest, this.options)
    this.components = {
      reader,
      executor: new SearchQueryExecutor(reader),
      askBuilder: new AskSearchPreviewBuilder(reader),
      graphExecutor: new SearchGraphExecutor(reader),
    }
  }

  private async loadFeature(featureId: SearchFeatureId): Promise<void> {
    await this.requireComponents().reader.loadFeature(featureId)
  }

  private requireComponents(): SearchWorkerComponents {
    if (!this.components) throw new SearchPackReaderError('unavailable-pack', 'Search worker is not initialized', true)
    return this.components
  }

  private cancel(request: Extract<SearchWorkerRequest, { type: 'cancel' }>): SearchWorkerResponse {
    this.cancellations.cancel(request.targetRequestId)
    return this.ok(request.requestId, { kind: 'cancelled', targetRequestId: request.targetRequestId })
  }

  private ok(requestId: string, payload: SearchWorkerOkPayload): Extract<SearchWorkerResponse, { type: 'ok' }> {
    return {
      type: 'ok',
      requestId,
      workerEpoch: this.epoch,
      packId: this.components?.reader.manifest.packId ?? 'uninitialized',
      packVersion: this.components?.reader.manifest.packVersion ?? '0.0.0',
      payload,
    }
  }

  private errorFrom(requestId: string, error: unknown): Extract<SearchWorkerResponse, { type: 'error' }> {
    if (error instanceof SearchCancelledError) return this.error(requestId, 'cancelled', error.message)
    if (error instanceof SearchPackReaderError) return this.error(requestId, error.code, error.message, error.retryable)
    if (error instanceof SearchQueryParseError) return this.error(requestId, error.code, error.message)
    if (error instanceof SearchCursorInvalidError) return this.error(requestId, 'stale-epoch', error.message, true)
    return this.error(requestId, 'corrupt-shard', error instanceof Error ? error.message : String(error))
  }

  private error(
    requestId: string,
    code: SearchWorkerErrorCode,
    message: string,
    retryable = false,
  ): Extract<SearchWorkerResponse, { type: 'error' }> {
    return {
      type: 'error',
      requestId,
      workerEpoch: this.epoch,
      packId: this.components?.reader.manifest.packId ?? null,
      packVersion: this.components?.reader.manifest.packVersion ?? null,
      error: { code, message, retryable },
    }
  }
}
