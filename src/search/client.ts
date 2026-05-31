import type {
  SearchFeatureId,
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

export class SearchClient {
  private worker: Worker | null = null
  private sequence = 0
  private epoch = 0
  private readonly pending = new Map<string, {
    resolve: (response: SearchWorkerResponse) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()
  private readonly createWorker: () => Worker
  private readonly requestTimeoutMs: number

  constructor(options: SearchClientOptions = {}) {
    this.createWorker = options.createWorker ?? defaultWorkerFactory
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15_000
  }

  async init(packId = 'qa-search-core-hafs-v1'): Promise<void> {
    await this.request({ type: 'init', requestId: this.nextRequestId(), packId })
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
    if (!worker) return
    try {
      await this.request({ type: 'dispose', requestId: this.nextRequestId() })
    } finally {
      worker.terminate()
      this.worker = null
      this.epoch += 1
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout)
        pending.reject(new Error('Search worker was disposed'))
      }
      this.pending.clear()
    }
  }

  private async request(request: SearchWorkerRequest): Promise<SearchWorkerResponse> {
    const worker = this.ensureWorker()
    const epoch = this.epoch
    return new Promise<SearchWorkerResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(request.requestId)
        this.restartWorker()
        reject(new Error(`Search worker request ${request.requestId} timed out`))
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
      const pending = this.pending.get(event.data.requestId)
      if (!pending) return
      this.pending.delete(event.data.requestId)
      clearTimeout(pending.timeout)
      pending.resolve(event.data)
    })
    worker.addEventListener('error', (event) => {
      this.restartWorker()
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout)
        pending.reject(new Error(event.message || 'Search worker failed'))
      }
      this.pending.clear()
    })
    this.worker = worker
    return worker
  }

  private restartWorker(): void {
    this.worker?.terminate()
    this.worker = null
    this.epoch += 1
  }

  private nextRequestId(): string {
    this.sequence += 1
    return `search-request-${this.sequence}`
  }
}

export function getSearchClient(): SearchClient {
  return new SearchClient()
}

export function resetSearchClient(): void {
  // Search clients are intentionally not kept in module-level mutable state.
}

function defaultWorkerFactory(): Worker {
  return new Worker(new URL('../search-worker/search.worker.ts', import.meta.url), { type: 'module' })
}
