import { useEffect, useMemo, useState } from 'react'

import { loadHizbIndex, type HizbIndexEntry, type QuranRef } from '../../data/hizb-index'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import { Button } from '../ui'

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
  const groups = useMemo(() => groupHizbs(rows, surahRows), [rows, surahRows])

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

  if (status === 'loading') {
    return <p className="qar-react-nav-drawer-list-state" role="status">Loading Hizb</p>
  }
  if (status === 'error') {
    return <p className="qar-react-nav-drawer-list-state" role="status">Hizb list unavailable.</p>
  }

  return (
    <div className="qar-react-hizb-list" aria-label="Hizb list" data-hizb-list="">
      {groups.map((group) => (
        <section className="qar-react-hizb-group" data-surah={group.surahNumber} key={group.surahNumber}>
          <div className="qar-react-hizb-group-head">
            <span className="qar-react-hizb-group-name">{group.surah?.name ?? `Surah ${group.surahNumber}`}</span>
            <span className="qar-react-hizb-group-ar" dir="rtl" lang="ar">
              {group.surah?.name_ar ?? ''}
            </span>
            <span className="qar-react-hizb-group-count" aria-label={`${group.rows.length} hizb starts in this surah`}>
              {group.rows.length}
            </span>
          </div>
          <ul className="qar-react-hizb-group-rows">
            {group.rows.map((hizb) => (
              <HizbRow
                current={currentRef ? refInRange(currentRef, hizb) : false}
                hizb={hizb}
                key={hizb.n}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function HizbRow({
  current,
  hizb,
  onNavigate,
}: {
  current: boolean
  hizb: HizbIndexEntry
  onNavigate?: (hash: string) => void
}) {
  return (
    <li
      className={['qar-react-hizb-row', current ? 'qar-react-hizb-row--current' : ''].filter(Boolean).join(' ')}
      data-hizb={hizb.n}
    >
      <Button
        aria-label={`Hizb ${hizb.n}, ${fullRangeLabel(hizb)}`}
        className="qar-react-hizb-row-btn"
        onClick={() => onNavigate?.(`#/s/${hizb.start.surah}/${hizb.start.verse}`)}
        variant="ghost"
      >
        <span className="qar-react-hizb-num">Hizb {hizb.n}</span>
        <span className="qar-react-hizb-ref">{compactRangeLabel(hizb)}</span>
        {current ? (
          <span className="qar-react-hizb-marker">Current</span>
        ) : (
          <span className="qar-react-hizb-marker-spacer" aria-hidden="true" />
        )}
        <span className="qar-react-hizb-chev" aria-hidden="true">›</span>
      </Button>
    </li>
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
  return compareRefs(hizb.start, ref) <= 0 && compareRefs(ref, hizb.end) <= 0
}

function compareRefs(a: QuranRef, b: QuranRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}

function compactRangeLabel(hizb: HizbIndexEntry): string {
  if (hizb.start.surah === hizb.end.surah) return `${hizb.start.verse}-${hizb.end.verse}`
  return `${formatRef(hizb.start)}-${formatRef(hizb.end)}`
}

function fullRangeLabel(hizb: HizbIndexEntry): string {
  return `${formatRef(hizb.start)} to ${formatRef(hizb.end)}`
}

function formatRef(ref: QuranRef): string {
  return `${ref.surah}:${ref.verse}`
}
