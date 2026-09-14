import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'

import { REACT_ROUTES } from '../../app/router/routes'
import type { JuzIndexEntry } from '../../data/juz-index'
import { openReactDb } from '../../storage/db'
import { readNativeSetting, writeNativeSetting } from '../../storage/native-reader-store'
import { resolveDrawerHrefForReaderMode } from '../reader/reader-mode-routing'
import { Badge, ChoiceButton, IconButton, ListRow, Sheet } from '../ui'
import { DailyWirdCard } from '../reader/wird/DailyWirdCard'
import { createWirdPlan, deriveWirdSummary, getLocalDayKey } from '../../continuity/wird/progress'
import { createWirdBoundaries } from '../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../continuity/wird/page-boundaries'
import { getBrowserNotificationState } from '../../continuity/wird/reminders'
import { withWirdProgressIntent } from '../../continuity/wird/session'
import {
  WIRD_NOTIFICATION_PERMISSION_PROMPTED_KEY,
  readWirdPlan,
  updateWirdPlanNotificationState,
  writeWirdPlan,
} from '../../continuity/wird/store'
import type { SurahCount, WirdBoundary, WirdPlan } from '../../continuity/wird/types'
import { WirdDetail, type WirdSetupPayload } from './wird/WirdDetail'

type SavedPosition = { surah: number; verse: number }
const FALLBACK_WIRD_COUNTS: SurahCount[] = [
  { n: 1, count: 7 },
  { n: 2, count: 286 },
  { n: 114, count: 6 },
]

// S6 navigation drawer: reader destinations only — header, Surahs (opens the
// S5 selector), Bookmarks (its own full row with count badge), Daily wird
// (existing feature, inherits the system), then Downloads / Settings / About.
// No destination rail, no search panel, no inline surah filter or lists
// (§8 items 2/7/11). Active destination uses the selection treatment.
export function NavDrawer({
  currentRoute,
  initialWirdView = 'card',
  juzRows: _juzRows,
  mode,
  onClose,
  onNavigate,
  onOpenSurahs,
  open,
  returnFocusId,
  showWird = true,
  suppressFocusRestore = false,
}: {
  currentRoute?: 'bookmarks' | 'downloads' | 'settings' | 'about' | null
  initialWirdView?: 'card' | 'detail'
  /** Unused since §8 item 11 removed the inline juz list; kept for call compatibility. */
  juzRows?: JuzIndexEntry[]
  mode: 'verse' | 'mushaf'
  onClose: () => void
  onNavigate: (hash: string) => void
  onOpenSurahs?: () => void
  open: boolean
  returnFocusId?: string
  showWird?: boolean
  suppressFocusRestore?: boolean
}) {
  const [bookmarkCount, setBookmarkCount] = useState(0)
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
        const [position, plan, bookmarks] = await Promise.all([
          db.settings.get('currentPosition'),
          showWird ? readWirdPlan(db) : Promise.resolve(null),
          db.bookmarks.count(),
        ])
        if (cancelled) return
        setCurrentPosition(asSavedPosition(position?.value))
        setWirdPlan(showWird ? plan : null)
        setBookmarkCount(bookmarks)
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentPosition(null)
          setWirdPlan(null)
        }
      })

    if (showWird) {
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
    const last = wirdCounts[wirdCounts.length - 1] ?? FALLBACK_WIRD_COUNTS[FALLBACK_WIRD_COUNTS.length - 1]
    const startRef =
      payload.startMode === 'current' && currentPosition
        ? { surah: currentPosition.surah, verse: currentPosition.verse }
        : { surah: 1, verse: 1 }
    const plan = createWirdPlan(
      {
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
      },
      wirdCounts,
      today,
    )

    void openReactDb()
      .then((db) => writeWirdPlan(db, plan))
      .then(() => {
        setWirdPlan(plan)
        setWirdView('card')
      })
  }

  function handleWirdContinue(): void {
    if (!showWird) return
    const summary = deriveWirdSummary(wirdPlan, wirdCounts, {
      boundaries: createWirdBoundaries(wirdCounts, wirdPageBoundaries),
    })
    if (!summary.nextRef) return
    const href = withWirdProgressIntent(REACT_ROUTES.surah(summary.nextRef.surah, summary.nextRef.verse))
    if (mode === 'mushaf') {
      void resolveDrawerHrefForReaderMode(mode, REACT_ROUTES.surah(summary.nextRef.surah, summary.nextRef.verse)).then(
        (mushafHref) => onNavigate(withWirdProgressIntent(mushafHref)),
      )
    } else {
      onNavigate(href)
    }
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
    if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function')
      return 'unsupported' as const

    const markerPromise = (async () => {
      try {
        const prompted = await readNativeSetting(WIRD_NOTIFICATION_PERMISSION_PROMPTED_KEY)
        if (prompted?.value !== true) {
          await writeNativeSetting({ key: WIRD_NOTIFICATION_PERMISSION_PROMPTED_KEY, value: true })
        }
      } catch {
        // Permission requests remain available when the marker store is unavailable.
      }
    })()

    const permission = await Notification.requestPermission()
    const state = getBrowserNotificationState(permission)
    await markerPromise
    try {
      const db = await openReactDb()
      const updatedPlan = await updateWirdPlanNotificationState(db, state)
      if (updatedPlan) setWirdPlan(updatedPlan)
    } catch {
      // The detail view still reflects the browser result; persistence retries on the next plan save.
    }

    return state
  }

  const drawerShowsWird = showWird
  const wirdBoundaries = createWirdBoundaries(wirdCounts, wirdPageBoundaries)
  const wirdSummary = drawerShowsWird ? deriveWirdSummary(wirdPlan, wirdCounts, { boundaries: wirdBoundaries }) : null
  const fallbackReadHref = currentPosition
    ? REACT_ROUTES.surah(currentPosition.surah, currentPosition.verse)
    : REACT_ROUTES.home

  function openDestination(hash: string): () => void {
    return () => navigateForReaderMode(hash)
  }

  return (
    <Sheet
      closeLabel="Close navigation"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      open={open}
      returnFocusId={returnFocusId}
      suppressCloseAutoFocus={suppressFocusRestore}
      title="Navigation"
      variant="navigation-drawer"
    >
      <div className="qar-react-nav-drawer-header">
        <ChoiceButton className="qar-react-nav-drawer-wordmark" onClick={() => onNavigate(fallbackReadHref)}>
          <span aria-hidden="true" className="qar-react-nav-drawer-logo">
            <svg
              aria-hidden="true"
              className="qar-react-nav-drawer-logo-svg"
              data-icon="brand-rosette"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path d="M24 4.5l4.1 5.2 6.6-1.1 1.6 6.4 6.2 2.6-2.9 6 2.9 6-6.2 2.6-1.6 6.4-6.6-1.1L24 43.5l-4.1-5.2-6.6 1.1-1.6-6.4-6.2-2.6 2.9-6-2.9-6 6.2-2.6 1.6-6.4 6.6 1.1L24 4.5Z" />
              <circle cx="24" cy="24" r="12.2" />
              <circle cx="24" cy="24" r="6.2" />
              <path d="M24 16.8v14.4M20.4 21.2c2.4-1.2 4.8-1.2 7.2 0" />
            </svg>
          </span>
          <span className="qar-react-nav-drawer-wordmark-text">QuranAtlas</span>
        </ChoiceButton>
        <IconButton label="Close" onClick={onClose}>
          <X aria-hidden="true" size={22} strokeWidth={1.7} />
        </IconButton>
      </div>
      <div className="qar-react-drawer-section" data-drawer-destinations="true">
        <ListRow
          onSelect={
            onOpenSurahs
              ? () => {
                  onClose()
                  onOpenSurahs()
                }
              : openDestination(REACT_ROUTES.surahs)
          }
          title="Surahs"
        />
        <ListRow
          action={bookmarkCount > 0 ? <Badge tone="neutral">{bookmarkCount}</Badge> : undefined}
          current={currentRoute === 'bookmarks'}
          onSelect={openDestination(REACT_ROUTES.bookmarks)}
          title="Bookmarks"
        />
        {drawerShowsWird && wirdView === 'card' ? (
          <div className="qar-react-drawer-wird-slot">
            <DailyWirdCard
              boundaries={wirdBoundaries}
              counts={wirdCounts}
              onOpen={() => setWirdView('detail')}
              plan={wirdPlan}
            />
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
        <div aria-hidden="true" className="qar:my-2 qar:border-t qar:border-border" />
        <ListRow
          current={currentRoute === 'downloads'}
          onSelect={openDestination(REACT_ROUTES.assets)}
          title="Downloads"
        />
        <ListRow
          current={currentRoute === 'settings'}
          onSelect={openDestination(REACT_ROUTES.settings)}
          title="Settings"
        />
        <ListRow
          action={
            <span aria-hidden="true" className="qar-react-list-row-chevron">
              <Info size={18} strokeWidth={1.7} />
            </span>
          }
          current={currentRoute === 'about'}
          onSelect={openDestination(REACT_ROUTES.about)}
          title="About"
        />
      </div>
    </Sheet>
  )
}

function asSavedPosition(value: unknown): SavedPosition | null {
  if (!value || typeof value !== 'object') return null
  const position = value as Partial<SavedPosition>
  if (!Number.isInteger(position.surah) || !Number.isInteger(position.verse)) return null
  if ((position.surah ?? 0) < 1 || (position.surah ?? 0) > 114 || (position.verse ?? 0) < 1) return null
  return { surah: position.surah as number, verse: position.verse as number }
}
