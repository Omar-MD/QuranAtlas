import { useEffect, useState, type ReactNode } from 'react'

import { Button, Spinner, Status } from '../ui'

type IndexedListLoaderOptions<Row> = {
  /** Status title shown when the index fails to load. */
  errorTitle: string
  /** Preloaded rows; skips the fetch and renders the list directly. */
  initialRows?: Row[]
  /** Loads the index; rejections land in the Retry state. */
  load: (signal: AbortSignal) => Promise<Row[]>
  /** Accessible label for the loading spinner. */
  spinnerLabel: string
  /** Visible loading text. */
  loadingText: string
}

export type IndexedListLoader<Row> = {
  /** Spinner / error-and-Retry surface replacing the list while not ready. */
  gate: ReactNode
  rows: Row[]
}

/**
 * Shared scaffold for the drawer's index-backed lists (surahs, juz, hizb):
 * rows + status + Retry attempt, the fetch/abort effect, and the
 * loading/error render. Each list keeps its own ready-state render.
 */
export function useIndexedListLoader<Row>({
  errorTitle,
  initialRows,
  load,
  loadingText,
  spinnerLabel,
}: IndexedListLoaderOptions<Row>): IndexedListLoader<Row> {
  const [rows, setRows] = useState<Row[]>(initialRows ?? [])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialRows ? 'ready' : 'loading')
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the load effect for Retry
  useEffect(() => {
    if (initialRows) {
      setRows(initialRows)
      setStatus('ready')
      return undefined
    }

    const controller = new AbortController()
    setStatus('loading')
    void load(controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) {
          setRows(loaded)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error')
      })
    return () => controller.abort()
  }, [attempt, initialRows])

  if (status === 'loading') {
    return {
      gate: (
        <div className="qar:flex qar:items-center qar:justify-center qar:gap-2 qar:p-4">
          <Spinner label={spinnerLabel} />
          <span className="qar:text-sm qar:text-muted">{loadingText}</span>
        </div>
      ),
      rows,
    }
  }
  if (status === 'error') {
    return {
      gate: (
        <Status
          action={<Button onClick={() => setAttempt((n) => n + 1)}>Retry</Button>}
          title={errorTitle}
          tone="error"
        />
      ),
      rows,
    }
  }
  return { gate: null, rows }
}

/**
 * Secondary index rows backing another list (e.g. surah names for juz/hizb
 * rows): preloaded rows win, a failed load degrades silently to an empty list.
 */
export function useSecondaryIndexRows<Row>(
  initialRows: Row[] | undefined,
  load: (signal: AbortSignal) => Promise<Row[]>,
): Row[] {
  const [rows, setRows] = useState<Row[]>(initialRows ?? [])

  useEffect(() => {
    if (initialRows) {
      setRows(initialRows)
      return undefined
    }

    const controller = new AbortController()
    void load(controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setRows(loaded)
      })
      .catch(() => {
        if (!controller.signal.aborted) setRows([])
      })
    return () => controller.abort()
  }, [initialRows, load])

  return rows
}
