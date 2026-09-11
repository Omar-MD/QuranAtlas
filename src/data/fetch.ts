import { assertRuntimeDatasetUrl } from './runtime-boundary'

export type FetchJsonHttpErrorFactory = (url: string, status: number) => Error

export type FetchJsonOptions = {
  signal?: AbortSignal
  /**
   * Builds the error thrown when the response is not OK. Defaults to the
   * generic dataset fetch failure. Sites with a typed HTTP error taxonomy
   * (e.g. the Mushaf asset layer) pass their own factory so their
   * classifiers keep seeing the typed error.
   */
  httpError?: FetchJsonHttpErrorFactory
  /**
   * Resolve `null` on HTTP 404 instead of throwing. Callers that enable
   * this declare the `| null` half of the type argument themselves
   * (e.g. `fetchJson<Payload | null>`).
   */
  nullOnNotFound?: boolean
}

export async function fetchJson<T>(fetcher: typeof fetch, url: string, options: FetchJsonOptions = {}): Promise<T> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal: options.signal })
  if (options.nullOnNotFound && response.status === 404) return null as T
  if (!response.ok) {
    throw options.httpError
      ? options.httpError(url, response.status)
      : new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

/**
 * `true` when the signal has already aborted or the error is the
 * `AbortError` `DOMException` that fetch and abort-aware helpers reject
 * with.
 */
export function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return (signal?.aborted ?? false) || (error instanceof DOMException && error.name === 'AbortError')
}

export type AbortableDelayOptions = {
  /**
   * Resolve on abort instead of rejecting with an `AbortError`
   * `DOMException`. Callers that re-check their own cancellation flag
   * after the wait prefer this disposition.
   */
  resolveOnAbort?: boolean
}

export function abortableDelay(ms: number, signal: AbortSignal, options: AbortableDelayOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () =>
      finish(() => {
        if (options.resolveOnAbort) resolve()
        else reject(new DOMException('Retry wait was aborted', 'AbortError'))
      })
    const timer = setTimeout(() => finish(resolve), ms)
    const finish = (complete: () => void) => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      complete()
    }
    if (signal.aborted) return onAbort()
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

type RetryAction = 'retry' | 'stop' | 'throw'

type RetryWithAbortOptions = {
  signal: AbortSignal
  delays: readonly number[]
  shouldContinue?: () => boolean
  onAttempt?: (attempt: number) => void
  onError?: (error: unknown, attempt: number) => RetryAction
}

/**
 * Runs an abort-aware operation once, then once more for each configured
 * delay. Callers classify failures and can consume terminal state transitions
 * through `onError`; returning `retry` waits before the next attempt, `stop`
 * resolves without rethrowing, and `throw` preserves the original error.
 */
export async function retryWithAbort<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryWithAbortOptions,
): Promise<T | undefined> {
  for (let attempt = 0; attempt <= options.delays.length; attempt += 1) {
    if (options.signal.aborted || (options.shouldContinue && !options.shouldContinue())) return
    options.onAttempt?.(attempt)
    try {
      return await operation(attempt)
    } catch (error) {
      if (isAbortError(error, options.signal)) return
      const action = options.onError?.(error, attempt) ?? (attempt < options.delays.length ? 'retry' : 'throw')
      if (action === 'stop') return
      if (action === 'throw' || attempt === options.delays.length) throw error
      await abortableDelay(options.delays[attempt], options.signal, { resolveOnAbort: true })
    }
  }
}
