import { useEffect, useMemo, useState } from 'react'

import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import type { RecentSurahPosition } from '../../continuity/recent-surahs'
import type { Riwayah } from '../../storage/types'
import { Button } from '../ui'

type SurahListProps = {
  currentSurah?: number | null
  filter?: 'all' | 'recent'
  onNavigate?: (hash: string) => void
  query?: string
  recentSurahs?: RecentSurahPosition[]
  riwayah?: Riwayah
  rows?: ReaderSurahIndexEntry[]
}

type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'ref'; surah: number; verse: number }
  | { kind: 'surahNum'; n: number }
  | { kind: 'verseNum'; v: number }
  | { kind: 'text'; q: string }

export function SurahList({
  currentSurah = null,
  filter = 'all',
  onNavigate,
  query = '',
  recentSurahs = [],
  riwayah = 'qaloon',
  rows: initialRows,
}: SurahListProps) {
  const [rows, setRows] = useState<ReaderSurahIndexEntry[]>(initialRows ?? [])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialRows ? 'ready' : 'loading')
  const parsedQuery = useMemo(() => parseSurahQuery(query), [query])
  const visibleRows = useMemo(
    () => filterSurahs(rows, parsedQuery, filter, recentSurahs, riwayah),
    [filter, parsedQuery, recentSurahs, riwayah, rows],
  )
  const recentBySurah = useMemo(
    () => new Map(recentSurahs.map((row) => [row.surah, row])),
    [recentSurahs],
  )
  const searchHint = useMemo(() => getSearchHint(rows, parsedQuery, riwayah), [parsedQuery, riwayah, rows])

  useEffect(() => {
    if (initialRows) {
      setRows(initialRows)
      setStatus('ready')
      return undefined
    }

    const controller = new AbortController()
    setStatus('loading')
    void loadReaderSurahIndex(fetch, controller.signal)
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

  if (status === 'loading') {
    return <p className="qar-react-nav-drawer-list-state" role="status">Loading...</p>
  }

  if (status === 'error') {
    return <p className="qar-react-nav-drawer-list-state" role="status">Surah list unavailable.</p>
  }

  if (visibleRows.length === 0) {
    return <p className="qar-react-nav-drawer-list-state" role="status">No surahs match your search.</p>
  }

  return (
    <>
      {searchHint && <p className="qar-react-nav-drawer-search-hint" role="status">{searchHint}</p>}
      <ul className="qar-react-nav-drawer-surah-list" aria-label="Surah list">
        {visibleRows.map((surah) => {
          const recent = filter === 'recent' ? recentBySurah.get(surah.n) : undefined
          const recentVerse = recent ? Math.min(recent.verse, surah.counts[riwayah]) : null
          const targetVerse = parsedQuery.kind === 'ref' && parsedQuery.surah === surah.n ? parsedQuery.verse : recentVerse
          const label = targetVerse ? `Open ${surah.name} verse ${targetVerse}` : `Open ${surah.name}`
          const hash = targetVerse ? `#/s/${surah.n}/${targetVerse}` : `#/s/${surah.n}`
          const meta = recentVerse ? `Last reached ${surah.n}:${recentVerse}` : `${surah.counts[riwayah]} verses`
          return (
            <li
              className={[
                'qar-react-nav-drawer-surah-row',
                currentSurah === surah.n ? 'qar-react-nav-drawer-surah-row--current' : '',
              ].filter(Boolean).join(' ')}
              data-surah={surah.n}
              key={surah.n}
            >
              <Button aria-label={label} className="qar-react-nav-drawer-surah-btn" onClick={() => onNavigate?.(hash)} variant="ghost">
                <span className="qar-react-nav-drawer-surah-num">{surah.n}</span>
                <span className="qar-react-nav-drawer-surah-copy">
                  <span className="qar-react-nav-drawer-surah-name">{surah.name}</span>
                  <span className="qar-react-nav-drawer-surah-meta">{meta}</span>
                </span>
                <span className="qar-react-nav-drawer-surah-ar" dir="rtl" lang="ar">{surah.name_ar}</span>
                <span className="qar-react-nav-drawer-surah-chev" aria-hidden="true">›</span>
              </Button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function parseSurahQuery(query: string): ParsedQuery {
  const value = query.trim()
  if (!value) return { kind: 'empty' }
  const ref = value.match(/^(\d{1,3})\s*:\s*(\d{1,3})$/)
  if (ref) return { kind: 'ref', surah: Number(ref[1]), verse: Number(ref[2]) }
  const num = value.match(/^(\d{1,3})$/)
  if (num) {
    const n = Number(num[1])
    return n >= 1 && n <= 114 ? { kind: 'surahNum', n } : { kind: 'verseNum', v: n }
  }
  return { kind: 'text', q: value.toLowerCase() }
}

function filterSurahs(
  rows: ReaderSurahIndexEntry[],
  parsedQuery: ParsedQuery,
  filter: 'all' | 'recent',
  recentSurahs: RecentSurahPosition[],
  riwayah: Riwayah,
): ReaderSurahIndexEntry[] {
  let items = rows
  if (filter === 'recent') {
    const order = new Map(recentSurahs.map((row, index) => [row.surah, index]))
    items = rows.filter((row) => order.has(row.n)).sort((a, b) => (order.get(a.n) ?? 0) - (order.get(b.n) ?? 0))
  }
  if (parsedQuery.kind === 'empty') return items
  if (parsedQuery.kind === 'surahNum') return items.filter((row) => row.n === parsedQuery.n)
  if (parsedQuery.kind === 'verseNum') return items.filter((row) => row.counts[riwayah] >= parsedQuery.v)
  if (parsedQuery.kind === 'ref') return items.filter((row) => row.n === parsedQuery.surah && row.counts[riwayah] >= parsedQuery.verse)
  return items.filter((row) => {
    const name = row.name.toLowerCase()
    const arabic = row.name_ar.toLowerCase()
    return name.includes(parsedQuery.q) || arabic.includes(parsedQuery.q)
  })
}

function getSearchHint(rows: ReaderSurahIndexEntry[], parsedQuery: ParsedQuery, riwayah: Riwayah): string | null {
  if (parsedQuery.kind === 'ref') {
    const meta = rows.find((row) => row.n === parsedQuery.surah)
    if (!meta) return `No surah ${parsedQuery.surah}`
    if (parsedQuery.verse < 1 || parsedQuery.verse > meta.counts[riwayah]) return `${meta.name} has ${meta.counts[riwayah]} verses`
    return `Press Enter to jump to ${meta.name} ${parsedQuery.verse}`
  }
  if (parsedQuery.kind === 'verseNum') {
    const count = rows.filter((row) => row.counts[riwayah] >= parsedQuery.v).length
    if (count === 0) return `No surah has ${parsedQuery.v} verses`
    return `Surahs with at least ${parsedQuery.v} verses (${count})`
  }
  return null
}
