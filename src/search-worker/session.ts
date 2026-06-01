import type {
  SearchWorkerRequest,
  SearchWorkerResponse,
  SearchFeatureId,
  SearchPackManifestV1,
  SearchWorkerErrorCode,
} from '../../shared/search'
import { openReactDb } from '../storage/db'
import { SEARCH_PACK_ACTIVATION_ID } from '../offline/search/activation'
import {
  SearchPackReader,
  SearchPackReaderError,
  loadSearchPackManifestFromRegistry,
  type SearchPackReaderOptions,
} from '../search/pack-reader'
import { SearchQueryParseError } from '../search/query-parser'
import { AskSearchPreviewBuilder } from '../search/ask/answer-preview-builder'
import { SearchCancellationRegistry, SearchCancelledError } from './cancellation'
import { SearchQueryExecutor } from './query-executor'
import { SearchGraphExecutor } from './graph-executor'
import { SearchShardCache } from './shard-cache'

export interface SearchWorkerSessionOptions extends SearchPackReaderOptions {
  manifest?: SearchPackManifestV1
  aliases?: unknown
}

export class SearchWorkerSession {
  private epoch = 1
  private reader: SearchPackReader | null = null
  private executor: SearchQueryExecutor | null = null
  private askBuilder: AskSearchPreviewBuilder | null = null
  private graphExecutor: SearchGraphExecutor | null = null
  private shardCache: SearchShardCache | null = null
  private activeGeneration: number | null = null
  private readonly cancellations = new SearchCancellationRegistry()
  private readonly options: SearchWorkerSessionOptions

  constructor(options: SearchWorkerSessionOptions = {}) {
    this.options = options
  }

  async handle(request: SearchWorkerRequest): Promise<SearchWorkerResponse> {
    if (request.type === 'cancel') return this.cancel(request)
    const token = this.cancellations.create(request.requestId)
    try {
      if (request.type === 'init') {
        await this.init(request.packId)
        return this.ok(request.requestId, { kind: 'initialized' })
      }
      if (request.type === 'preloadCore') {
        await this.requireReader().loadCore()
        return this.ok(request.requestId, { kind: 'preloaded-core' })
      }
      if (request.type === 'loadFeature') {
        await this.loadFeature(request.featureId)
        return this.ok(request.requestId, { kind: 'feature-loaded', featureId: request.featureId })
      }
      if (request.type === 'askPreview') {
        await this.assertActivationUnchanged()
        const answerPreview = await this.requireAskBuilder().buildPreview({
          query: request.query,
          lens: request.lens,
          queryAst: request.queryAst,
          sort: request.sort ?? 'relevance',
          token,
        })
        token.throwIfCancelled()
        await this.assertActivationUnchanged()
        return this.ok(request.requestId, { kind: 'ask-preview', answerPreview })
      }
      if (request.type === 'askMatchesPage') {
        await this.assertActivationUnchanged()
        const page = await this.requireAskBuilder().buildMatchesPage({
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
        await this.assertActivationUnchanged()
        return this.ok(request.requestId, { kind: 'ask-matches-page', page })
      }
      if (request.type === 'query') {
        await this.assertActivationUnchanged()
        const window = await this.requireExecutor().execute({
          query: request.query,
          cursor: request.cursor,
          limit: request.limit,
          sort: request.sort,
          token,
        })
        token.throwIfCancelled()
        await this.assertActivationUnchanged()
        return this.ok(request.requestId, { kind: 'query-window', window })
      }
      if (request.type === 'explore') {
        await this.assertActivationUnchanged()
        const response = await this.requireGraphExecutor().explore({
          query: request.query,
          result: request.result,
          sections: request.sections as Parameters<SearchGraphExecutor['explore']>[0]['sections'],
          limit: request.limit,
          token,
        })
        token.throwIfCancelled()
        await this.assertActivationUnchanged()
        return this.ok(request.requestId, { kind: 'explore-sections', sections: response.sections })
      }
      if (request.type === 'dispose') {
        this.dispose()
        return this.ok(request.requestId, { kind: 'disposed' })
      }
      return this.error('unknown', 'unsupported-query', 'Unsupported Search worker request')
    } catch (error) {
      return this.errorFrom(request.requestId, error)
    } finally {
      this.cancellations.release(request.requestId)
    }
  }

  dispose(): void {
    this.reader?.dispose()
    this.shardCache?.dispose()
    this.reader = null
    this.executor = null
    this.askBuilder = null
    this.graphExecutor = null
    this.shardCache = null
    this.epoch += 1
  }

  private async init(packId: string): Promise<void> {
    const manifest = this.options.manifest ?? await loadSearchPackManifestFromRegistry(packId, this.options)
    if (manifest.packId !== packId) throw new SearchPackReaderError('unavailable-pack', `Search pack ${packId} does not match active manifest`)
    this.reader = new SearchPackReader(manifest, this.options)
    this.executor = new SearchQueryExecutor(this.reader)
    this.askBuilder = new AskSearchPreviewBuilder(this.reader)
    this.graphExecutor = new SearchGraphExecutor(this.reader)
    this.shardCache = new SearchShardCache(manifest.byteBudget.maxResidentWorkerBytes)
    this.activeGeneration = await readActivationGeneration().catch(() => null)
  }

  private async loadFeature(featureId: SearchFeatureId): Promise<void> {
    const reader = this.requireReader()
    await reader.loadFeature(featureId)
    const shards = reader.manifest.shards.filter((shard) => shard.featureId === featureId)
    for (const shard of shards) {
      await this.shardCache?.load(reader, shard.shardId)
      this.shardCache?.release(shard.shardId)
    }
  }

  private requireReader(): SearchPackReader {
    if (!this.reader) throw new SearchPackReaderError('unavailable-pack', 'Search worker is not initialized', true)
    return this.reader
  }

  private requireExecutor(): SearchQueryExecutor {
    if (!this.executor) throw new SearchPackReaderError('unavailable-pack', 'Search worker is not initialized', true)
    return this.executor
  }

  private requireAskBuilder(): AskSearchPreviewBuilder {
    if (!this.askBuilder) throw new SearchPackReaderError('unavailable-pack', 'Search worker is not initialized', true)
    return this.askBuilder
  }

  private requireGraphExecutor(): SearchGraphExecutor {
    if (!this.graphExecutor) throw new SearchPackReaderError('unavailable-pack', 'Search worker is not initialized', true)
    return this.graphExecutor
  }

  private async assertActivationUnchanged(): Promise<void> {
    if (this.activeGeneration === null) return
    const current = await readActivationGeneration()
    if (current !== this.activeGeneration) {
      throw new SearchPackReaderError('activation-changed', 'Search pack activation changed while the request was running', true)
    }
  }

  private cancel(request: Extract<SearchWorkerRequest, { type: 'cancel' }>): SearchWorkerResponse {
    this.cancellations.cancel(request.targetRequestId)
    return this.ok(request.requestId, { kind: 'cancelled', targetRequestId: request.targetRequestId })
  }

  private ok(
    requestId: string,
    payload: Extract<SearchWorkerResponse, { type: 'ok' }>['payload'],
  ): Extract<SearchWorkerResponse, { type: 'ok' }> {
    return {
      type: 'ok',
      requestId,
      workerEpoch: this.epoch,
      packId: this.reader?.manifest.packId ?? 'uninitialized',
      packVersion: this.reader?.manifest.packVersion ?? '0.0.0',
      payload,
    }
  }

  private errorFrom(requestId: string, error: unknown): Extract<SearchWorkerResponse, { type: 'error' }> {
    if (error instanceof SearchCancelledError) return this.error(requestId, 'cancelled', error.message)
    if (error instanceof SearchPackReaderError) return this.error(requestId, error.code, error.message, error.retryable)
    if (error instanceof SearchQueryParseError) return this.error(requestId, error.code, error.message)
    if (error instanceof Error && error.message.includes('cursor')) return this.error(requestId, 'stale-epoch', error.message, true)
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
      packId: this.reader?.manifest.packId ?? null,
      packVersion: this.reader?.manifest.packVersion ?? null,
      error: { code, message, retryable },
    }
  }
}

async function readActivationGeneration(): Promise<number | null> {
  const db = await openReactDb()
  const record = await db.searchPackActivations.get(SEARCH_PACK_ACTIVATION_ID)
  return record?.generation ?? null
}
