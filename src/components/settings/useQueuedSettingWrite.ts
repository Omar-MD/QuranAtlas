import { useCallback, useRef } from 'react'

/**
 * Serializes setting writes through one promise queue: every native or
 * IndexedDB write opens its own connection and transaction, so concurrent
 * writes must not interleave. Rejections never poison the queue; the caller
 * observes success/failure from the returned promise.
 */
export function useQueuedSettingWrite() {
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve())

  const enqueueSettingWrite = useCallback(<T>(write: () => Promise<T>): Promise<T> => {
    const result = writeQueueRef.current.then(write)
    writeQueueRef.current = result.catch(() => undefined)
    return result
  }, [])

  return enqueueSettingWrite
}
