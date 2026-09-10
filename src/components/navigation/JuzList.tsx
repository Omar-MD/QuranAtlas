import { useEffect, useState } from 'react'

import { loadJuzIndex, type JuzIndexEntry } from '../../data/juz-index'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import { compareQuranRefs, type QuranRef } from '../../continuity/verse-key'
import { Button, ListRow, Spinner, Status } from '../ui'

type JuzListProps = {
  currentRef?: QuranRef | null
  onNavigate?: (hash: string) => void
  rows?: JuzIndexEntry[]
  surahRows?: ReaderSurahIndexEntry[]
}

export function JuzList({
  currentRef = null,
  onNavigate,
  rows: initialRows,
  surahRows: initialSurahRows,
}: JuzListProps) {
  const [rows, setRows] = useState<JuzIndexEntry[]>(initialRows ?? [])
  const [surahRows, setSurahRows] = useState<ReaderSurahIndexEntry[]>(initialSurahRows ?? [])
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
    void loadJuzIndex(fetch, controller.signal)
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

  useEffect(() => {
    if (initialSurahRows) {
      setSurahRows(initialSurahRows)
      return undefined
    }

    const controller = new AbortController()
    void loadReaderSurahIndex(fetch, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setSurahRows(loaded)
      })
      .catch(() => {
        if (!controller.signal.aborted) setSurahRows([])
      })
    return () => controller.abort()
  }, [initialSurahRows])

  if (status === 'loading') {
    return (
      <div className="qar:flex qar:items-center qar:justify-center qar:gap-2 qar:p-4">
        <Spinner label="Loading Juz" />
        <span className="qar:text-sm qar:text-muted">Loading Juz</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <Status
        action={<Button onClick={() => setAttempt((n) => n + 1)}>Retry</Button>}
        title="Juz list unavailable."
        tone="error"
      />
    )
  }

  const surahByNumber = new Map(surahRows.map((row) => [row.n, row]))
  const currentJuz = currentRef ? findCurrentJuz(rows, currentRef) : null

  return (
    <ul aria-label="Juz list" className="qar-react-juz-list">
      {rows.map((juz) => {
        const surah = surahByNumber.get(juz.start.surah)
        return (
          <li key={juz.n}>
            <ListRow
              action={
                <span aria-hidden="true" className="qar-react-list-row-chevron">
                  ›
                </span>
              }
              arabic={surah?.name_ar ? <span lang="ar">{surah.name_ar}</span> : undefined}
              current={currentJuz != null && juz.n === currentJuz}
              data-juz={juz.n}
              meta={`${juz.start.surah}:${juz.start.verse}`}
              num={`Juz ${juz.n}`}
              onSelect={() => onNavigate?.(`#/s/${juz.start.surah}/${juz.start.verse}`)}
              title={surah?.name ?? `Surah ${juz.start.surah}`}
            />
          </li>
        )
      })}
    </ul>
  )
}

function findCurrentJuz(rows: JuzIndexEntry[], ref: QuranRef): number | null {
  let current: number | null = null
  for (const row of rows) {
    if (compareQuranRefs(row.start, ref) <= 0) {
      current = row.n
    } else {
      break
    }
  }
  return current
}
