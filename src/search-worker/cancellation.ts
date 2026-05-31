export class SearchCancellationToken {
  readonly requestId: string
  private cancelled = false

  constructor(requestId: string) {
    this.requestId = requestId
  }

  cancel(): void {
    this.cancelled = true
  }

  throwIfCancelled(): void {
    if (this.cancelled) throw new SearchCancelledError(this.requestId)
  }

  get isCancelled(): boolean {
    return this.cancelled
  }
}

export class SearchCancelledError extends Error {
  readonly requestId: string

  constructor(requestId: string) {
    super(`Search request ${requestId} was cancelled`)
    this.name = 'SearchCancelledError'
    this.requestId = requestId
  }
}

export class SearchCancellationRegistry {
  private readonly tokens = new Map<string, SearchCancellationToken>()

  create(requestId: string): SearchCancellationToken {
    const token = new SearchCancellationToken(requestId)
    this.tokens.set(requestId, token)
    return token
  }

  cancel(requestId: string): boolean {
    const token = this.tokens.get(requestId)
    if (!token) return false
    token.cancel()
    return true
  }

  release(requestId: string): void {
    this.tokens.delete(requestId)
  }
}

export async function cooperativeYield(token: SearchCancellationToken, everyIndex: number, index: number): Promise<void> {
  if (index % everyIndex !== 0) return
  token.throwIfCancelled()
  await Promise.resolve()
  token.throwIfCancelled()
}
