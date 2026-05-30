import { useEffect, useState } from 'react'

import { loadJuzIndex, type JuzIndexEntry } from '../../data/juz-index'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import { Button } from '../ui'

type JuzListProps = {
  currentRef?: QuranRef | null
  onNavigate?: (hash: string) => void
  rows?: JuzIndexEntry[]
  surahRows?: ReaderSurahIndexEntry[]
}

type QuranRef = { surah: number; verse: number }

export function JuzList({ currentRef = null, onNavigate, rows: initialRows, surahRows: initialSurahRows }: JuzListProps) {
  const [rows, setRows] = useState<JuzIndexEntry[]>(initialRows ?? [])
  const [surahRows, setSurahRows] = useState<ReaderSurahIndexEntry[]>(initialSurahRows ?? [])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialRows ? 'ready' : 'loading')

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
  }, [initialRows])

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

  if (status === 'loading') return <p className="qar:m-0 qar:text-sm qar:text-muted" role="status">Loading Juz</p>
  if (status === 'error') return <p className="qar:m-0 qar:text-sm qar:text-danger" role="status">Juz list unavailable.</p>

  return (
    <ul className="qar-react-juz-list" aria-label="Juz list">
      {rows.map((juz) => (
        <JuzRow
          current={currentRef ? juz.n === findCurrentJuz(rows, currentRef) : false}
          juz={juz}
          key={juz.n}
          onNavigate={onNavigate}
          surah={surahRows.find((row) => row.n === juz.start.surah)}
        />
      ))}
    </ul>
  )
}

function JuzRow({
  juz,
  current,
  onNavigate,
  surah,
}: {
  current: boolean
  juz: JuzIndexEntry
  onNavigate?: (hash: string) => void
  surah?: ReaderSurahIndexEntry
}) {
  return (
    <li className={['qar-react-juz-row', current ? 'qar-react-juz-row--current' : ''].filter(Boolean).join(' ')} data-juz={juz.n}>
      <Button
        aria-label={`Juz ${juz.n}, starts at ${juz.start.surah}:${juz.start.verse}`}
        className="qar-react-juz-row-btn"
        onClick={() => onNavigate?.(`#/s/${juz.start.surah}/${juz.start.verse}`)}
        variant="ghost"
      >
        <span className="qar-react-juz-num">Juz {juz.n}</span>
        <span className="qar-react-juz-ref">{juz.start.surah}:{juz.start.verse}</span>
        <span className="qar-react-juz-name">{surah?.name ?? `Surah ${juz.start.surah}`}</span>
        <span className="qar-react-juz-ar" dir="rtl" lang="ar">{surah?.name_ar ?? ''}</span>
        {current ? <span className="qar-react-juz-marker">Current</span> : <span className="qar-react-juz-marker-spacer" aria-hidden="true" />}
        <span className="qar-react-juz-chev" aria-hidden="true">›</span>
      </Button>
    </li>
  )
}

function findCurrentJuz(rows: JuzIndexEntry[], ref: QuranRef): number | null {
  let current: number | null = null
  for (const row of rows) {
    if (compareRefs(row.start, ref) <= 0) {
      current = row.n
    } else {
      break
    }
  }
  return current
}

function compareRefs(a: QuranRef, b: QuranRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}
