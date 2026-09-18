import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search as SearchIcon } from 'lucide-react'

import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import type { RecentSurahPosition } from '../../continuity/recent-surahs'
import { openReactDb } from '../../storage/db'
import { readRecentSurahs } from '../../continuity/recent-surahs'
import { Button, Dialog, Input, ListRow, SegmentedControl, Sheet } from '../ui'

const SURAH_COUNT = 114

export type SurahSelectorProps = {
  currentSurah: number | null
  onClose: () => void
  onNavigate: (hash: string) => void
  open: boolean
  /** Mushaf mode resolves surah picks to page hrefs via this adapter. */
  resolveHref?: (hash: string) => Promise<string> | string
}

type ParsedQuery =
  | { kind: 'empty' }
  | { kind: 'ref'; surah: number; verse: number }
  | { kind: 'surahNum'; n: number }
  | { kind: 'text'; q: string }

// S5 surah selector: desktop Dialog 640 px / mobile full-height Sheet, Tabs
// Surahs/Juz, preserved local filter (name, number, verse reference; Enter
// jumps to the exact match), recent group, selected treatment on the current
// row, and Previous/Next rows at the foot — absent at surah 1/114 (D6: no
// wrap at the ends of the book).
export function SurahSelector({ currentSurah, onClose, onNavigate, open, resolveHref }: SurahSelectorProps) {
  const [rows, setRows] = useState<ReaderSurahIndexEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('surahs')
  const [recentSurahs, setRecentSurahs] = useState<RecentSurahPosition[]>([])
  const listRef = useRef<HTMLUListElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt intentionally retriggers the load effect for Try again
  useEffect(() => {
    if (!open) return undefined
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
    void openReactDb()
      .then((db) => readRecentSurahs(db))
      .then((recent) => {
        if (!controller.signal.aborted) setRecentSurahs(recent)
      })
      .catch(() => undefined)
    return () => {
      controller.abort()
    }
  }, [attempt, open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const parsedQuery = useMemo(() => parseSurahQuery(query), [query])
  const visibleRows = useMemo(() => filterSurahs(rows, parsedQuery), [parsedQuery, rows])
  const recentBySurah = useMemo(() => new Map(recentSurahs.map((row) => [row.surah, row])), [recentSurahs])
  // The current surah is already highlighted in the list below; repeating it
  // in Recent renders two identical rows adjacently.
  const recentOthers = useMemo(
    () => recentSurahs.filter((row) => row.surah !== currentSurah),
    [recentSurahs, currentSurah],
  )
  const currentEntry = rows.find((row) => row.n === currentSurah) ?? null
  const previousEntry =
    currentSurah != null && currentSurah > 1 ? (rows.find((row) => row.n === currentSurah - 1) ?? null) : null
  const nextEntry =
    currentSurah != null && currentSurah < SURAH_COUNT ? (rows.find((row) => row.n === currentSurah + 1) ?? null) : null

  function navigate(hash: string) {
    if (resolveHref) {
      void Promise.resolve(resolveHref(hash)).then(onNavigate)
      return
    }
    onNavigate(hash)
  }

  function handleFilterKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      const parsed = parseSurahQuery(event.target.value)
      const matches = filterSurahs(rows, parsed)
      const entry = matches.length === 1 ? matches[0] : undefined
      if (entry && parsed.kind === 'ref' && parsed.verse >= 1 && parsed.verse <= entry.counts.qaloon) {
        navigate(`#/s/${entry.n}/${parsed.verse}`)
      } else if (entry && parsed.kind !== 'ref') {
        navigate(`#/s/${entry.n}`)
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const rowsElements = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      if (rowsElements.length === 0) return
      event.preventDefault()
      const activeIndex = rowsElements.indexOf(document.activeElement as HTMLButtonElement)
      const nextIndex =
        event.key === 'ArrowDown'
          ? Math.min(rowsElements.length - 1, activeIndex + 1)
          : Math.max(0, activeIndex <= 0 ? 0 : activeIndex - 1)
      rowsElements[nextIndex]?.focus()
    }
  }

  function renderRow(entry: ReaderSurahIndexEntry) {
    const recent = recentBySurah.get(entry.n)
    const recentVerse = recent ? Math.min(recent.verse, entry.counts.qaloon) : null
    // A filtered verse reference (e.g. 2:142) must activate the row on its
    // verse target, matching the Enter shortcut and the Surahs page rows.
    const targetVerse =
      parsedQuery.kind === 'ref' && parsedQuery.surah === entry.n && parsedQuery.verse <= entry.counts.qaloon
        ? parsedQuery.verse
        : recentVerse
    const meta = recentVerse ? `Last reached ${entry.n}:${recentVerse}` : `${entry.counts.qaloon} verses`
    return (
      <li key={entry.n}>
        <ListRow
          arabic={<span lang="ar">{entry.name_ar}</span>}
          current={currentSurah === entry.n}
          data-surah={entry.n}
          meta={meta}
          num={entry.n}
          onSelect={() => navigate(targetVerse ? `#/s/${entry.n}/${targetVerse}` : `#/s/${entry.n}`)}
          title={entry.name}
        />
      </li>
    )
  }

  const body = (
    <div className="qar-react-selector-body">
      {/* G-5(a): Surahs/Juz are alternatives, not simultaneous panels — a
          segmented pill, not tabs. */}
      <div className="qar-react-selector-toolbar">
        <SegmentedControl
          label="Browse"
          onValueChange={setTab}
          options={[
            { label: 'Surahs', value: 'surahs' },
            { label: 'Juz', value: 'juz' },
          ]}
          value={tab}
        />
      </div>
      {tab === 'juz' ? (
        <div className="qar-react-selector-scroller">
          <JuzPickerRows onNavigate={navigate} />
        </div>
      ) : (
        <>
          <Input
            autoComplete="off"
            hideLabel
            label="Filter by name, number, or verse"
            maxLength={20}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={handleFilterKeyDown}
            placeholder="Filter by name, number, or verse"
            prefix={<SearchIcon aria-hidden="true" size={15} strokeWidth={1.7} />}
            type="search"
            value={query}
          />
          {status === 'loading' ? (
            <p className="qar-react-selector-empty" role="status">
              Loading surahs…
            </p>
          ) : status === 'error' ? (
            <div className="qar-react-selector-empty" role="status">
              <p className="qar:m-0">Surah list unavailable.</p>
              <Button onClick={() => setAttempt((n) => n + 1)} size="sm" variant="secondary">
                Try again
              </Button>
            </div>
          ) : visibleRows.length === 0 ? (
            <p className="qar-react-selector-empty" data-selector-empty="true" role="status">
              No surah matches "{query}"
            </p>
          ) : (
            <div className="qar-react-selector-scroller">
              {parsedQuery.kind === 'empty' && recentOthers.length > 0 ? (
                <section aria-label="Recent surahs">
                  <p className="qar-eyebrow">Recent</p>
                  <ul className="qar-react-selector-recents">
                    {recentOthers.flatMap((recent) => {
                      const entry = rows.find((row) => row.n === recent.surah)
                      return entry ? [renderRow(entry)] : []
                    })}
                  </ul>
                </section>
              ) : null}
              {/* G-5(c): the full list gets its own eyebrow when it follows
                  the Recent group. */}
              {parsedQuery.kind === 'empty' && recentOthers.length > 0 ? (
                <p className="qar-eyebrow" data-selector-all-eyebrow="true">
                  All surahs
                </p>
              ) : null}
              <ul
                aria-label="Surah list"
                className="qar-react-selector-list"
                ref={listRef}
                onKeyDown={handleFilterKeyDown}
              >
                {visibleRows.map(renderRow)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )

  const footer =
    status === 'ready' && visibleRows.length > 0 ? (
      <div className="qar-react-selector-footer" data-selector-footer="true">
        {previousEntry ? (
          <ListRow onSelect={() => navigate(`#/s/${previousEntry.n}`)} title={`← Previous: ${previousEntry.name}`} />
        ) : null}
        {nextEntry ? (
          <ListRow onSelect={() => navigate(`#/s/${nextEntry.n}`)} title={`Next: ${nextEntry.name} →`} />
        ) : null}
      </div>
    ) : null

  const labelledTitle = currentEntry ? `${currentEntry.name} — Choose surah` : 'Choose surah'

  return (
    <SelectorSurface onClose={onClose} open={open} title={labelledTitle}>
      {body}
      {footer}
    </SelectorSurface>
  )
}

function SelectorSurface({
  children,
  onClose,
  open,
  title,
}: {
  children: React.ReactNode
  onClose: () => void
  open: boolean
  title: string
}) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(min-width: 768px)').matches),
  )
  useEffect(() => {
    if (!open) return
    setIsDesktop(Boolean(window.matchMedia?.('(min-width: 768px)').matches))
  }, [open])
  if (!open) return null
  return isDesktop ? (
    <Dialog
      contentClassName="qar-react-selector-dialog"
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      open
      title={title}
    >
      <div className="qar-react-selector-frame">{children}</div>
    </Dialog>
  ) : (
    <Sheet
      closeLabel="Close surah selector"
      contentClassName="qar-react-selector-sheet"
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      open
      returnFocusId="reader-surah-selector-trigger"
      title={title}
    >
      <div className="qar-react-selector-frame">{children}</div>
    </Sheet>
  )
}

function JuzPickerRows({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const [rows, setRows] = useState<Array<{ n: number; start: { surah: number; verse: number } }>>([])
  useEffect(() => {
    let active = true
    void import('../../data/juz-index')
      .then(({ loadJuzIndex }) => loadJuzIndex())
      .then((loaded) => {
        if (active) setRows(loaded)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])
  return (
    <ul aria-label="Juz list" className="qar-react-juz-list">
      {rows.map((row) => (
        <li key={row.n}>
          <ListRow
            meta={`Starts at ${row.start.surah}:${row.start.verse}`}
            num={row.n}
            onSelect={() => onNavigate(`#/s/${row.start.surah}/${row.start.verse}`)}
            title={`Juz ${row.n}`}
          />
        </li>
      ))}
    </ul>
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
    if (n >= 1 && n <= SURAH_COUNT) return { kind: 'surahNum', n }
  }
  return { kind: 'text', q: value.toLowerCase() }
}

function filterSurahs(rows: ReaderSurahIndexEntry[], parsedQuery: ParsedQuery): ReaderSurahIndexEntry[] {
  if (parsedQuery.kind === 'empty') return rows
  if (parsedQuery.kind === 'surahNum') return rows.filter((row) => row.n === parsedQuery.n)
  if (parsedQuery.kind === 'ref')
    return rows.filter((row) => row.n === parsedQuery.surah && row.counts.qaloon >= parsedQuery.verse)
  return rows.filter((row) => {
    const name = row.name.toLowerCase()
    const arabic = row.name_ar.toLowerCase()
    return name.includes(parsedQuery.q) || arabic.includes(parsedQuery.q)
  })
}
