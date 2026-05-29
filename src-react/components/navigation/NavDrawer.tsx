import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { BookOpen, Info, Search, X } from 'lucide-react'

import type { JuzIndexEntry } from '../../data/juz-index'
import { openReactDb } from '../../storage/db'
import { resolveDrawerHrefForReaderMode } from '../reader/reader-mode-routing'
import { Button, IconButton, Input } from '../ui'
import { BookmarksList, type BookmarkListItem } from './BookmarksList'
import { JuzList } from './JuzList'
import { SurahList } from './SurahList'
import { DailyWirdCard } from '../reader/wird/DailyWirdCard'
import { readWirdPlan } from '../../continuity/wird/store'
import type { SurahCount, WirdPlan } from '../../continuity/wird/types'

type SavedPosition = { surah: number; verse: number }
type SurahFilter = 'all' | 'recent'
const FALLBACK_WIRD_COUNTS: SurahCount[] = [{ n: 1, count: 7 }, { n: 2, count: 286 }, { n: 114, count: 6 }]

export function NavDrawer({
  bookmarks,
  juzRows,
  mode,
  onClose,
  onDeleteBookmark,
  onNavigate,
  open,
}: {
  bookmarks?: BookmarkListItem[]
  currentLabel: string
  juzRows?: JuzIndexEntry[]
  mode: 'verse' | 'mushaf'
  onClose: () => void
  onDeleteBookmark?: (bookmark: Pick<BookmarkListItem, 'riwayah' | 'verseKey'>) => void
  onNavigate: (hash: string) => void
  open: boolean
}) {
  const [readSource, setReadSource] = useState<'surah' | 'juz' | 'bookmarks'>('surah')
  const [surahFilter, setSurahFilter] = useState<SurahFilter>('all')
  const [surahQuery, setSurahQuery] = useState('')
  const [recentSurahs, setRecentSurahs] = useState<number[]>([])
  const [currentPosition, setCurrentPosition] = useState<SavedPosition | null>(null)
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false

    void openReactDb()
      .then(async (db) => {
        const [recent, position, plan] = await Promise.all([
          db.settings.get('recentSurahs'),
          db.settings.get('currentPosition'),
          readWirdPlan(db),
        ])
        if (cancelled) return
        setRecentSurahs(asRecentSurahs(recent?.value).slice(0, 7))
        setCurrentPosition(asSavedPosition(position?.value))
        setWirdPlan(plan)
      })
      .catch(() => {
        if (!cancelled) {
          setRecentSurahs([])
          setCurrentPosition(null)
          setWirdPlan(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open])

  function handleSurahSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSurahQuery(event.currentTarget.value)
  }

  function handleSurahSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const ref = parseQueryRef(surahQuery)
    if (!ref) return
    event.preventDefault()
    void navigateForReaderMode(`#/s/${ref.surah}/${ref.verse}`)
  }

  function navigateForReaderMode(hash: string) {
    if (mode === 'verse') {
      onNavigate(hash)
      return
    }
    void resolveDrawerHrefForReaderMode(mode, hash).then(onNavigate)
  }

  if (!open) return null
  return (
    <div
      aria-label="Navigation"
      aria-modal="true"
      className="qar-react-nav-drawer"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      tabIndex={-1}
    >
      <div className="qar-react-nav-drawer-header">
        <div className="qar-react-nav-drawer-product-row">
          <Button aria-label="About QuranAtlas" className="qar-react-nav-drawer-wordmark" onClick={() => onNavigate('#/about')} variant="ghost">
            <span className="qar-react-nav-drawer-logo" aria-hidden="true">
              <svg className="qar-react-nav-drawer-logo-svg" data-icon="brand-rosette" viewBox="0 0 48 48" fill="none">
                <path d="M24 4.5l4.1 5.2 6.6-1.1 1.6 6.4 6.2 2.6-2.9 6 2.9 6-6.2 2.6-1.6 6.4-6.6-1.1L24 43.5l-4.1-5.2-6.6 1.1-1.6-6.4-6.2-2.6 2.9-6-2.9-6 6.2-2.6 1.6-6.4 6.6 1.1L24 4.5Z" />
                <circle cx="24" cy="24" r="12.2" />
                <circle cx="24" cy="24" r="6.2" />
                <path d="M24 16.8v14.4M20.4 21.2c2.4-1.2 4.8-1.2 7.2 0" />
              </svg>
            </span>
            <span className="qar-react-nav-drawer-wordmark-text">QuranAtlas</span>
          </Button>
          <IconButton className="qar-react-nav-drawer-about" label="About QuranAtlas" onClick={() => onNavigate('#/about')}>
            <span aria-hidden="true">
              <Info size={20} strokeWidth={1.65} />
            </span>
          </IconButton>
          <IconButton className="qar-react-nav-drawer-close" label="Close" onClick={onClose}>
            <X aria-hidden="true" size={24} strokeWidth={1.7} />
          </IconButton>
        </div>
        <div className="qar-react-nav-drawer-mode-rail">
          <div className="qar-react-nav-drawer-tabs" role="tablist" aria-label="Drawer mode">
            <Button aria-selected="true" className="qar-react-nav-drawer-tab qar-react-nav-drawer-tab--on" role="tab" variant="ghost">
              <BookOpen aria-hidden="true" size={17} strokeWidth={1.65} />
              <span>Read</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="qar-react-drawer-wird-slot">
        <DailyWirdCard counts={FALLBACK_WIRD_COUNTS} plan={wirdPlan} />
      </div>
      <div className="qar-react-nav-drawer-read">
        <div className="qar-react-nav-drawer-source-panel">
          <div className="qar-react-nav-drawer-source-tabs" role="tablist" aria-label="Read source">
            <Button aria-selected={readSource === 'surah'} className="qar-react-nav-drawer-source-tab" onClick={() => setReadSource('surah')} role="tab" size="sm" variant="ghost">Surah</Button>
            <Button aria-selected={readSource === 'juz'} className="qar-react-nav-drawer-source-tab" onClick={() => setReadSource('juz')} role="tab" size="sm" variant="ghost">Juz</Button>
            <Button aria-selected={readSource === 'bookmarks'} className="qar-react-nav-drawer-source-tab" onClick={() => setReadSource('bookmarks')} role="tab" size="sm" variant="ghost">Bookmarks</Button>
          </div>
          {readSource === 'surah' && (
            <div className="qar-react-nav-drawer-source-tools" aria-label="Surah controls">
              <Input
                autoComplete="off"
                className="qar-react-nav-drawer-search-input"
                hideLabel
                label="Search surah by name, number, or verse reference"
                labelClassName="qar-react-nav-drawer-source-search qar-react-nav-drawer-search"
                maxLength={20}
                onChange={handleSurahSearchChange}
                onKeyDown={handleSurahSearchKeyDown}
                placeholder="Search..."
                prefix={<Search aria-hidden="true" className="qar-react-nav-drawer-search-icon" size={15} strokeWidth={1.7} />}
                type="search"
                value={surahQuery}
              />
              <div className="qar-react-nav-drawer-source-filter" role="tablist" aria-label="Surah filter">
                <Button aria-selected={surahFilter === 'all'} className="qar-react-nav-drawer-filter-option" onClick={() => setSurahFilter('all')} role="tab" size="sm" variant="ghost">All</Button>
                <Button aria-selected={surahFilter === 'recent'} className="qar-react-nav-drawer-filter-option" onClick={() => setSurahFilter('recent')} role="tab" size="sm" variant="ghost">Recent</Button>
              </div>
            </div>
          )}
        </div>
        {readSource === 'surah' && <SurahList currentSurah={currentPosition?.surah ?? null} filter={surahFilter} onNavigate={navigateForReaderMode} query={surahQuery} recentSurahs={recentSurahs} />}
        {readSource === 'juz' && <JuzList currentRef={currentPosition} onNavigate={navigateForReaderMode} rows={juzRows} />}
        {readSource === 'bookmarks' && <BookmarksList bookmarks={bookmarks} onDeleteBookmark={onDeleteBookmark} onNavigate={navigateForReaderMode} />}
      </div>
    </div>
  )
}

function asRecentSurahs(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => Number.isInteger(item) && item >= 1 && item <= 114)
}

function asSavedPosition(value: unknown): SavedPosition | null {
  if (!value || typeof value !== 'object') return null
  const position = value as Partial<SavedPosition>
  if (!Number.isInteger(position.surah) || !Number.isInteger(position.verse)) return null
  if ((position.surah ?? 0) < 1 || (position.surah ?? 0) > 114 || (position.verse ?? 0) < 1) return null
  return { surah: position.surah as number, verse: position.verse as number }
}

function parseQueryRef(query: string): SavedPosition | null {
  const match = query.trim().match(/^(\d{1,3})\s*:\s*(\d{1,3})$/)
  if (!match) return null
  const surah = Number(match[1])
  const verse = Number(match[2])
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || surah < 1 || surah > 114 || verse < 1) return null
  return { surah, verse }
}
