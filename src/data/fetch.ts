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
