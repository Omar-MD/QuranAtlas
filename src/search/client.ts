import type {
  AnswerPreview,
  EvidenceMatchesPageLite,
  SearchFeatureId,
  SearchLensLite,
  SearchQueryAstV1,
  SearchResultCursor,
  SearchResultWindow,
  SearchSort,
  SearchWorkerRequest,
  SearchWorkerResponse,
} from '../../shared/search'
import type { SearchGraphExploreRequest, SearchGraphExploreResponse } from './graph'

export interface SearchClientOptions {
  createWorker?: () => Worker
  requestTimeoutMs?: number
}

export type SearchClientInitResult = {
  packId: string
  packVersion: string
}

export class SearchClient {
  private worker: Worker | null = null
  private sequence = 0
  private epoch = 0
  private desiredPackId: string | null = null
  private activePackVersion: string | null = null
  private activePackId: string | null = null
  private initializedEpoch: number | null = null
  private initialization: {
    packId: string
    promise: Promise<SearchClientInitResult>
  } | null = null
  private lifecycleGeneration = 0
  private readonly pending = new Map<
    string,
    {
      resolve: (response: SearchWorkerResponse) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  >()
  private readonly createWorker: () => Worker
  private readonly requestTimeoutMs: number

  constructor(options: SearchClientOptions = {}) {
    this.createWorker = options.createWorker ?? defaultWorkerFactory
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000
  }

  async init(packId = 'qa-search-core-hafs-v1'): Promise<SearchClientInitResult> {
    const pendingInitialization = this.initialization
    if (pendingInitialization?.packId === packId) return pendingInitialization.promise
    const activePackVersion = this.activePackVersion
    if (
      this.activePackId === packId &&
      activePackVersion !== null &&
      this.initializedEpoch === this.epoch &&
      this.worker !== null
    ) {
      return { packId, packVersion: activePackVersion }
    }
    const packChanged =
      (this.desiredPackId !== null && this.desiredPackId !== packId) ||
      (this.activePackId !== null && this.activePackId !== packId)
    if (packChanged || (this.worker !== null && this.desiredPackId === null)) {
      this.invalidateForPackSwitch()
    }
    this.desiredPackId = packId
    return this.startInitialization(packId, this.lifecycleGeneration)
  }

  async preloadCore(): Promise<void> {
    await this.request({ type: 'preloadCore', requestId: this.nextRequestId() })
  }

  async loadFeature(featureId: SearchFeatureId): Promise<void> {
    await this.request({ type: 'loadFeature', requestId: this.nextRequestId(), featureId })
  }

  async query({
    query,
    cursor,
    limit = 25,
    sort = 'relevance',
  }: {
    query: SearchQueryAstV1
    cursor?: SearchResultCursor
    limit?: number
    sort?: SearchSort
  }): Promise<SearchResultWindow> {
    const response = await this.request({
      type: 'query',
      requestId: this.nextRequestId(),
      query,
      cursor,
      limit,
      sort,
    })
    if (response.type !== 'ok' || response.payload.kind !== 'query-window') {
      throw new Error('Search worker returned a non-query response')
    }
    return response.payload.window
  }

  async askPreview({
    query,
    lens,
    queryAst,
    sort = 'relevance',
  }: {
    query: string
    lens?: SearchLensLite
    queryAst?: SearchQueryAstV1
    sort?: SearchSort
  }): Promise<AnswerPreview> {
    const response = await this.request({
      type: 'askPreview',
      requestId: this.nextRequestId(),
      query,
      lens,
      queryAst,
      sort,
    })
    if (response.type !== 'ok' || response.payload.kind !== 'ask-preview') {
      throw new Error('Search worker returned a non-Ask preview response')
    }
    return response.payload.answerPreview
  }

  async getAskMatchesPage({
    previewId,
    query,
    lens,
    queryAst,
    cursor,
    limit = 10,
    sort = 'relevance',
  }: {
    previewId: string
    query: string
    lens?: SearchLensLite
    queryAst?: SearchQueryAstV1
    cursor?: SearchResultCursor
    limit?: number
    sort?: SearchSort
  }): Promise<EvidenceMatchesPageLite> {
    const response = await this.request({
      type: 'askMatchesPage',
      requestId: this.nextRequestId(),
      previewId,
      query,
      lens,
      queryAst,
      cursor,
      limit,
      sort,
    })
    if (response.type !== 'ok' || response.payload.kind !== 'ask-matches-page') {
      throw new Error('Search worker returned a non-Ask matches response')
    }
    return response.payload.page
  }

  async explore(request: SearchGraphExploreRequest): Promise<SearchGraphExploreResponse> {
    const response = await this.request({
      type: 'explore',
      requestId: this.nextRequestId(),
      query: request.query,
      result: request.result,
      sections: request.sections,
      cursor: request.cursor,
      limit: request.limit,
    })
    if (response.type !== 'ok' || response.payload.kind !== 'explore-sections') {
      throw new Error('Search worker returned a non-explore response')
    }
    return { sections: response.payload.sections as SearchGraphExploreResponse['sections'] }
  }

  async cancel(targetRequestId: string): Promise<void> {
    await this.request({ type: 'cancel', requestId: this.nextRequestId(), targetRequestId })
  }

  async dispose(): Promise<void> {
    const worker = this.worker
    const error = new Error('Search worker was disposed')
    this.desiredPackId = null
    this.activePackId = null
    this.activePackVersion = null
    this.initializedEpoch = null
    this.lifecycleGeneration += 1
    this.initialization = null
    if (!worker) {
      this.failAllPending(error)
      return
    }
    this.worker = null
    this.epoch += 1
    worker.terminate()
    this.failAllPending(error)
  }

  private async request(request: SearchWorkerRequest): Promise<SearchWorkerResponse> {
    if (request.type === 'init') return this.requestRaw(request)
    const lifecycleGeneration = this.lifecycleGeneration
    await this.ensureInitialized()
    if (lifecycleGeneration !== this.lifecycleGeneration) throw new Error('Search worker was disposed')
    if (this.initialization !== null) throw new Error('Search worker initialization changed before request')
    if (this.desiredPackId === null || this.activePackId !== this.desiredPackId) {
      throw new Error('Search worker is not initialized')
    }
    if (this.initializedEpoch !== this.epoch) {
      throw new Error('Search worker response came from a stale epoch')
    }
    const epoch = this.epoch
    return this.requestRaw(request, { lifecycleGeneration, epoch })
  }

  private async ensureInitialized(): Promise<void> {
    for (;;) {
      const pendingInitialization = this.initialization
      if (pendingInitialization) {
        await pendingInitialization.promise
        continue
      }
      const packId = this.desiredPackId
      if (packId === null) return
      if (this.activePackId === packId && this.initializedEpoch === this.epoch) return
      await this.init(packId)
    }
  }

  private startInitialization(packId: string, lifecycleGeneration: number): Promise<SearchClientInitResult> {
    const promise = this.performInitialization(packId, lifecycleGeneration)
    const initialization = { packId, promise }
    this.initialization = initialization
    void promise.then(
      () => {
        if (this.initialization === initialization) this.initialization = null
      },
      () => {
        if (this.initialization === initialization) this.initialization = null
      },
    )
    return promise
  }

  private async performInitialization(packId: string, lifecycleGeneration: number): Promise<SearchClientInitResult> {
    if (lifecycleGeneration !== this.lifecycleGeneration) throw new Error('Search worker was disposed')
    const epoch = this.epoch
    const response = await this.requestRaw({ type: 'init', requestId: this.nextRequestId(), packId })
    if (lifecycleGeneration !== this.lifecycleGeneration) throw new Error('Search worker was disposed')
    if (epoch !== this.epoch) throw new Error('Search worker response came from a stale epoch')
    if (response.type !== 'ok' || response.payload.kind !== 'initialized') {
      throw new Error('Search worker returned a non-init response')
    }
    this.activePackId = response.packId
    this.activePackVersion = response.packVersion
    return { packId: response.packId, packVersion: response.packVersion }
  }

  private async requestRaw(
    request: SearchWorkerRequest,
    expected?: { lifecycleGeneration: number; epoch: number },
  ): Promise<SearchWorkerResponse> {
    if (expected) {
      if (expected.lifecycleGeneration !== this.lifecycleGeneration) {
        throw new Error('Search worker was disposed')
      }
      if (expected.epoch !== this.epoch) {
        throw new Error('Search worker response came from a stale epoch')
      }
    }
    const worker = this.ensureWorker()
    if (expected) {
      if (expected.lifecycleGeneration !== this.lifecycleGeneration) {
        throw new Error('Search worker was disposed')
      }
      if (expected.epoch !== this.epoch) {
        throw new Error('Search worker response came from a stale epoch')
      }
    }
    const epoch = this.epoch
    return new Promise<SearchWorkerResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.restartWorker(worker)) return
        this.failAllPending(new Error(`Search worker request ${request.requestId} timed out`))
      }, this.requestTimeoutMs)
      this.pending.set(request.requestId, { resolve, reject, timeout })
      worker.postMessage(request)
    }).then((response) => {
      if (epoch !== this.epoch) throw new Error('Search worker response came from a stale epoch')
      if (response.type === 'error') throw new Error(response.error.message)
      return response
    })
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = this.createWorker()
    worker.addEventListener('message', (event: MessageEvent<SearchWorkerResponse>) => {
      if (this.worker !== worker) return
      const pending = this.pending.get(event.data.requestId)
      if (!pending) return
      this.pending.delete(event.data.requestId)
      clearTimeout(pending.timeout)
      pending.resolve(event.data)
    })
    worker.addEventListener('error', (event) => {
      if (!this.restartWorker(worker)) return
      this.failAllPending(new Error(event.message || 'Search worker failed'))
    })
    this.worker = worker
    return worker
  }

  private restartWorker(worker: Worker): boolean {
    if (this.worker !== worker) return false
    this.worker = null
    this.epoch += 1
    worker.terminate()
    return true
  }

  private invalidateForPackSwitch(): void {
    const worker = this.worker
    this.worker = null
    this.activePackId = null
    this.activePackVersion = null
    this.initializedEpoch = null
    this.initialization = null
    this.lifecycleGeneration += 1
    if (worker) {
      this.epoch += 1
      worker.terminate()
    }
    this.failAllPending(new Error('Search worker was replaced'))
  }

  private failAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
  }

  private nextRequestId(): string {
    this.sequence += 1
    return `search-request-${this.sequence}`
  }
}

export function getSearchClient(): SearchClient {
  return new SearchClient()
}

function defaultWorkerFactory(): Worker {
  return new Worker(new URL('../search-worker/search.worker.ts', import.meta.url), { type: 'module' })
}
