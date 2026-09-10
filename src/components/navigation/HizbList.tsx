import { useEffect, useMemo, useState } from 'react'

import { loadHizbIndex, type HizbIndexEntry } from '../../data/hizb-index'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import { compareQuranRefs, type QuranRef } from '../../continuity/verse-key'
import { Badge, Button, ListRow, Spinner, Status } from '../ui'

type HizbListProps = {
  currentRef?: QuranRef | null
  onNavigate?: (hash: string) => void
  rows?: HizbIndexEntry[]
  surahRows?: ReaderSurahIndexEntry[]
}

type HizbGroup = {
  rows: HizbIndexEntry[]
  surah?: ReaderSurahIndexEntry
  surahNumber: number
}

export function HizbList({
  currentRef = null,
  onNavigate,
  rows: initialRows,
  surahRows: initialSurahRows,
}: HizbListProps) {
  const [rows, setRows] = useState<HizbIndexEntry[]>(initialRows ?? [])
  const [surahRows, setSurahRows] = useState<ReaderSurahIndexEntry[]>(initialSurahRows ?? [])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialRows ? 'ready' : 'loading')
  const [attempt, setAttempt] = useState(0)
  const groups = useMemo(() => groupHizbs(rows, surahRows), [rows, surahRows])

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the load effect for Retry
  useEffect(() => {
    if (initialRows) {
      setRows(initialRows)
      setStatus('ready')
      return undefined
    }

    const controller = new AbortController()
    setStatus('loading')
    void loadHizbIndex(fetch, controller.signal)
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
        <Spinner label="Loading Hizb" />
        <span className="qar:text-sm qar:text-muted">Loading Hizb</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <Status
        action={<Button onClick={() => setAttempt((n) => n + 1)}>Retry</Button>}
        title="Hizb list unavailable."
        tone="error"
      />
    )
  }

  return (
    <section aria-label="Hizb list" className="qar-react-hizb-list" data-hizb-list="">
      {groups.map((group) => (
        <section className="qar-react-hizb-group" data-surah={group.surahNumber} key={group.surahNumber}>
          <div className="qar-react-hizb-group-head">
            <span className="qar-react-hizb-group-name">{group.surah?.name ?? `Surah ${group.surahNumber}`}</span>
            <span className="qar-react-hizb-group-ar" dir="rtl" lang="ar">
              {group.surah?.name_ar ?? ''}
            </span>
            <Badge tone="neutral">
              <span className="qar:sr-only">{`${group.rows.length} hizb starts in this surah`}</span>
              <span aria-hidden="true">{group.rows.length}</span>
            </Badge>
          </div>
          <ul className="qar-react-hizb-group-rows">
            {group.rows.map((hizb) => (
              <li key={hizb.n}>
                <ListRow
                  action={
                    <span aria-hidden="true" className="qar-react-list-row-chevron">
                      ›
                    </span>
                  }
                  current={currentRef ? refInRange(currentRef, hizb) : false}
                  data-hizb={hizb.n}
                  meta={compactRangeLabel(hizb)}
                  num={`Hizb ${hizb.n}`}
                  onSelect={() => onNavigate?.(`#/s/${hizb.start.surah}/${hizb.start.verse}`)}
                  title={compactRangeLabel(hizb)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}

function groupHizbs(rows: HizbIndexEntry[], surahRows: ReaderSurahIndexEntry[]): HizbGroup[] {
  const surahByNumber = new Map(surahRows.map((row) => [row.n, row]))
  const grouped = new Map<number, HizbIndexEntry[]>()
  for (const hizb of rows) {
    const list = grouped.get(hizb.start.surah) ?? []
    list.push(hizb)
    grouped.set(hizb.start.surah, list)
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([surahNumber, list]) => ({
      rows: [...list].sort((a, b) => a.n - b.n),
      surah: surahByNumber.get(surahNumber),
      surahNumber,
    }))
}

function refInRange(ref: QuranRef, hizb: HizbIndexEntry): boolean {
  return compareQuranRefs(hizb.start, ref) <= 0 && compareQuranRefs(ref, hizb.end) <= 0
}

function compactRangeLabel(hizb: HizbIndexEntry): string {
  if (hizb.start.surah === hizb.end.surah) return `${hizb.start.verse}-${hizb.end.verse}`
  return `${formatRef(hizb.start)}-${formatRef(hizb.end)}`
}

function formatRef(ref: QuranRef): string {
  return `${ref.surah}:${ref.verse}`
}
