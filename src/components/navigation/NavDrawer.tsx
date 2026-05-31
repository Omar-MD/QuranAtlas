import { useEffect, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { BookOpen, Info, Search as SearchIcon, X } from 'lucide-react'

import { REACT_ROUTES } from '../../app/router/routes'
import { cn } from '../../design-system/utils/cn'
import type { JuzIndexEntry } from '../../data/juz-index'
import { loadReaderSurahIndex } from '../../data/surah-index'
import { openReactDb } from '../../storage/db'
import { readRecentSurahs, type RecentSurahPosition } from '../../continuity/recent-surahs'
import { resolveDrawerHrefForReaderMode } from '../reader/reader-mode-routing'
import { Button, IconButton, Input } from '../ui'
import { BookmarksList, type BookmarkListItem } from './BookmarksList'
import { HizbList } from './HizbList'
import { JuzList } from './JuzList'
import { SurahList } from './SurahList'
import { DailyWirdCard } from '../reader/wird/DailyWirdCard'
import { createWirdPlan, deriveWirdSummary, getLocalDayKey } from '../../continuity/wird/progress'
import { createWirdBoundaries } from '../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../continuity/wird/page-boundaries'
import { getBrowserNotificationState } from '../../continuity/wird/reminders'
import { readWirdPlan, writeWirdPlan } from '../../continuity/wird/store'
import type { SurahCount, WirdBoundary, WirdPlan } from '../../continuity/wird/types'
import { WirdDetail, type WirdSetupPayload } from './wird/WirdDetail'

type SavedPosition = { surah: number; verse: number }
type SurahFilter = 'all' | 'recent'
const FALLBACK_WIRD_COUNTS: SurahCount[] = [{ n: 1, count: 7 }, { n: 2, count: 286 }, { n: 114, count: 6 }]

export function NavDrawer({
  activeMode = 'read',
  bookmarks,
  initialWirdView = 'card',
  juzRows,
  mode,
  onClose,
  onDeleteBookmark,
  onNavigate,
  open,
  readHref,
  searchPanel,
  showWird = true,
}: {
  activeMode?: 'read' | 'search'
  bookmarks?: BookmarkListItem[]
  currentLabel: string
  initialWirdView?: 'card' | 'detail'
  juzRows?: JuzIndexEntry[]
  mode: 'verse' | 'mushaf'
  onClose: () => void
  onDeleteBookmark?: (bookmark: Pick<BookmarkListItem, 'riwayah' | 'verseKey'>) => void
  onNavigate: (hash: string) => void
  open: boolean
  readHref?: string
  searchPanel?: ReactNode
  showWird?: boolean
}) {
  const [readSource, setReadSource] = useState<'surah' | 'juz' | 'hizb' | 'bookmarks'>('surah')
  const [surahFilter, setSurahFilter] = useState<SurahFilter>('all')
  const [surahQuery, setSurahQuery] = useState('')
  const [recentSurahs, setRecentSurahs] = useState<RecentSurahPosition[]>([])
  const [currentPosition, setCurrentPosition] = useState<SavedPosition | null>(null)
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const [wirdCounts, setWirdCounts] = useState<SurahCount[]>(FALLBACK_WIRD_COUNTS)
  const [wirdPageBoundaries, setWirdPageBoundaries] = useState<WirdBoundary[]>([])
  const [wirdView, setWirdView] = useState<'card' | 'detail'>(initialWirdView)

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setWirdView(showWird ? initialWirdView : 'card')

    void openReactDb()
      .then(async (db) => {
        const [recent, position, plan] = await Promise.all([
          readRecentSurahs(db),
          db.settings.get('currentPosition'),
          showWird ? readWirdPlan(db) : Promise.resolve(null),
        ])
        if (cancelled) return
        setRecentSurahs(recent)
        setCurrentPosition(asSavedPosition(position?.value))
        setWirdPlan(showWird ? plan : null)
      })
      .catch(() => {
        if (!cancelled) {
          setRecentSurahs([])
          setCurrentPosition(null)
          setWirdPlan(null)
        }
      })

    if (showWird) {
      const controller = new AbortController()
      void loadReaderSurahIndex(fetch, controller.signal)
        .then((rows) => {
          const counts = rows.map((row) => ({ count: row.counts.qaloon, n: row.n }))
          if (!cancelled) {
            setWirdCounts(counts)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setWirdCounts(FALLBACK_WIRD_COUNTS)
            setWirdPageBoundaries([])
          }
        })
      return () => {
        cancelled = true
        controller.abort()
      }
    } else {
      setWirdCounts(FALLBACK_WIRD_COUNTS)
      setWirdPageBoundaries([])
    }

    return () => {
      cancelled = true
    }
  }, [initialWirdView, open, showWird])

  useEffect(() => {
    if (!open || !showWird || wirdPlan?.unit !== 'page' || wirdCounts.length !== 114) {
      setWirdPageBoundaries([])
      return undefined
    }
    const controller = new AbortController()
    void loadReactWirdPageBoundaries(wirdCounts, controller.signal)
      .then((boundaries) => {
        if (!controller.signal.aborted) setWirdPageBoundaries(boundaries)
      })
      .catch(() => {
        if (!controller.signal.aborted) setWirdPageBoundaries([])
      })
    return () => {
      controller.abort()
    }
  }, [open, showWird, wirdCounts, wirdPlan?.unit])

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

  function finishDateFromTarget(targetDays: number | null, targetEndOn: string | null): string {
    if (targetEndOn) return targetEndOn
    const days = Math.max(1, targetDays ?? 1)
    const date = new Date(`${getLocalDayKey()}T00:00:00`)
    date.setDate(date.getDate() + days - 1)
    return getLocalDayKey(date)
  }

  function handleWirdCreate(payload: WirdSetupPayload): void {
    if (!showWird) return
    const today = getLocalDayKey()
    const last = wirdCounts[wirdCounts.length - 1] ?? FALLBACK_WIRD_COUNTS[FALLBACK_WIRD_COUNTS.length - 1]!
    const startRef = payload.startMode === 'current' && currentPosition
      ? { surah: currentPosition.surah, verse: currentPosition.verse }
      : { surah: 1, verse: 1 }
    const plan = createWirdPlan({
      endRef: { surah: last.n, verse: last.count },
      reminder: {
        browserNotifications: payload.browserNotifications,
        enabled: payload.reminderEnabled,
        time: payload.reminderTime,
      },
      startedOn: today,
      startRef,
      targetEndOn: finishDateFromTarget(payload.targetDays, payload.targetEndOn),
      unit: payload.unit,
    }, wirdCounts, today)

    void openReactDb()
      .then((db) => writeWirdPlan(db, plan))
      .then(() => {
        setWirdPlan(plan)
        setWirdView('card')
      })
  }

  function handleWirdContinue(): void {
    if (!showWird) return
    const summary = deriveWirdSummary(wirdPlan, wirdCounts, createWirdBoundaries(wirdCounts, wirdPageBoundaries))
    if (!summary.nextRef) return
    onNavigate(`#/s/${summary.nextRef.surah}/${summary.nextRef.verse}`)
    onClose()
  }

  function handleWirdReset(): void {
    if (!showWird) return
    void openReactDb()
      .then((db) => writeWirdPlan(db, null))
      .then(() => {
        setWirdPlan(null)
        setWirdView('detail')
      })
  }

  async function requestWirdNotifications() {
    if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') return 'unsupported' as const
    const permission = await Notification.requestPermission()
    return getBrowserNotificationState(permission)
  }

  if (!open) return null
  const readModeActive = activeMode === 'read'
  const searchModeActive = activeMode === 'search'
  const drawerShowsWird = readModeActive && showWird
  const wirdBoundaries = createWirdBoundaries(wirdCounts, wirdPageBoundaries)
  const wirdSummary = drawerShowsWird ? deriveWirdSummary(wirdPlan, wirdCounts, wirdBoundaries) : null
  const fallbackReadHref = currentPosition ? REACT_ROUTES.surah(currentPosition.surah, currentPosition.verse) : REACT_ROUTES.home
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
            <Button
              aria-selected={readModeActive}
              className={cn('qar-react-nav-drawer-tab', readModeActive && 'qar-react-nav-drawer-tab--on')}
              onClick={readModeActive ? undefined : () => onNavigate(readHref ?? fallbackReadHref)}
              role="tab"
              variant="ghost"
            >
              <BookOpen aria-hidden="true" size={17} strokeWidth={1.65} />
              <span>Read</span>
            </Button>
            <Button
              aria-selected={searchModeActive}
              className={cn('qar-react-nav-drawer-tab', searchModeActive && 'qar-react-nav-drawer-tab--on')}
              onClick={searchModeActive ? undefined : () => onNavigate(REACT_ROUTES.search)}
              role="tab"
              variant="ghost"
            >
              <SearchIcon aria-hidden="true" size={17} strokeWidth={1.65} />
              <span>Search</span>
            </Button>
          </div>
        </div>
      </div>
      {drawerShowsWird && wirdView === 'card' ? (
        <div className="qar-react-drawer-wird-slot">
          <DailyWirdCard boundaries={wirdBoundaries} counts={wirdCounts} onOpen={() => setWirdView('detail')} plan={wirdPlan} />
        </div>
      ) : drawerShowsWird && wirdSummary ? (
        <div className="qar-react-drawer-wird-slot">
          <WirdDetail
            counts={wirdCounts}
            currentPosition={currentPosition}
            onBack={() => setWirdView('card')}
            onContinue={handleWirdContinue}
            onCreate={handleWirdCreate}
            onRequestBrowserNotifications={requestWirdNotifications}
            onReset={handleWirdReset}
            summary={wirdSummary}
          />
        </div>
      ) : null}
      {searchModeActive ? (
        <div className="qar-react-nav-drawer-search-mode">
          {searchPanel}
        </div>
      ) : (
        <div className={drawerShowsWird && wirdView === 'detail' ? 'qar-react-nav-drawer-read qar-react-nav-drawer-read--hidden' : 'qar-react-nav-drawer-read'}>
          <div className="qar-react-nav-drawer-source-panel">
            <div className="qar-react-nav-drawer-source-tabs" role="tablist" aria-label="Read source">
              <Button
                aria-selected={readSource === 'surah'}
                className="qar-react-nav-drawer-source-tab"
                onClick={() => setReadSource('surah')}
                role="tab"
                size="sm"
                variant="ghost"
              >
                Surah
              </Button>
              <Button
                aria-selected={readSource === 'juz'}
                className="qar-react-nav-drawer-source-tab"
                onClick={() => setReadSource('juz')}
                role="tab"
                size="sm"
                variant="ghost"
              >
                Juz
              </Button>
              <Button
                aria-selected={readSource === 'hizb'}
                className="qar-react-nav-drawer-source-tab"
                onClick={() => setReadSource('hizb')}
                role="tab"
                size="sm"
                variant="ghost"
              >
                Hizb
              </Button>
              <Button
                aria-selected={readSource === 'bookmarks'}
                className="qar-react-nav-drawer-source-tab"
                onClick={() => setReadSource('bookmarks')}
                role="tab"
                size="sm"
                variant="ghost"
              >
                Bookmarks
              </Button>
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
                  prefix={<SearchIcon aria-hidden="true" className="qar-react-nav-drawer-search-icon" size={15} strokeWidth={1.7} />}
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
          {readSource === 'hizb' && <HizbList currentRef={currentPosition} onNavigate={navigateForReaderMode} />}
          {readSource === 'bookmarks' && <BookmarksList bookmarks={bookmarks} onDeleteBookmark={onDeleteBookmark} onNavigate={navigateForReaderMode} />}
        </div>
      )}
    </div>
  )
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
