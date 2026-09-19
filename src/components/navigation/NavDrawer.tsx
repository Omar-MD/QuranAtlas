import { useEffect, useState } from 'react'
import { BookOpen, Bookmark, CalendarDays, Download, Info, Settings, X } from 'lucide-react'

import { REACT_ROUTES } from '../../app/router/routes'
import { requestReactWirdOverlay } from '../../app/wird-overlay-events'
import type { JuzIndexEntry } from '../../data/juz-index'
import { openReactDb } from '../../storage/db'
import { nativeSettingsReader } from '../../storage/native-reader-store'
import { resolveDrawerHrefForReaderMode } from '../reader/reader-mode-routing'
import { Badge, IconButton, ListRow, Sheet } from '../ui'
import { deriveWirdSummary } from '../../continuity/wird/progress'
import { readWirdPlan } from '../../continuity/wird/store'
import { loadWirdSurahCounts } from '../../continuity/wird/surah-counts'
import type { SurahCount, WirdPlan } from '../../continuity/wird/types'

// Navigation drawer (brief §15.3/§16 G-2): destination rows only — the Daily
// Wird row closes the drawer and requests the app-level Wird sheet; Downloads
// joins the APP group. No inline plan UI lives here.
export function NavDrawer({
  currentRoute,
  juzRows: _juzRows,
  mode,
  onClose,
  onNavigate,
  onOpenSurahs,
  open,
  returnFocusId,
  suppressFocusRestore = false,
}: {
  currentRoute?: 'bookmarks' | 'downloads' | 'settings' | 'about' | null
  /** Unused since §8 item 11 removed the inline juz list; kept for call compatibility. */
  juzRows?: JuzIndexEntry[]
  mode: 'verse' | 'mushaf'
  onClose: () => void
  onNavigate: (hash: string) => void
  onOpenSurahs?: () => void
  open: boolean
  returnFocusId?: string
  suppressFocusRestore?: boolean
}) {
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const [wirdCounts, setWirdCounts] = useState<SurahCount[]>([])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false

    void openReactDb()
      .then((db) => db.bookmarks.count())
      .then((bookmarks) => {
        if (!cancelled) setBookmarkCount(bookmarks)
      })
      .catch(() => undefined)

    // Row meta uses the real 114-surah index only (brief §15.4.1); while it
    // loads — or if it fails — the row reads "Set up a reading plan".
    void Promise.all([
      readWirdPlan(nativeSettingsReader()).catch(() => null),
      loadWirdSurahCounts().catch(() => []),
    ]).then(([plan, counts]) => {
      if (cancelled) return
      setWirdPlan(plan && counts.length === 114 ? plan : null)
      setWirdCounts(counts.length === 114 ? counts : [])
    })

    return () => {
      cancelled = true
    }
  }, [open])

  function navigateForReaderMode(hash: string) {
    if (mode === 'verse') {
      onNavigate(hash)
      return
    }
    void resolveDrawerHrefForReaderMode(mode, hash).then(onNavigate)
  }

  function openWirdSheet(): void {
    onClose()
    requestReactWirdOverlay({ returnFocusId: returnFocusId ?? 'chrome-navigation-trigger' })
  }

  const wirdSummary = wirdPlan && wirdCounts.length === 114 ? deriveWirdSummary(wirdPlan, wirdCounts) : null

  const wirdMeta = !wirdSummary
    ? 'Set up a reading plan'
    : wirdSummary.state === 'plan-complete'
      ? 'Plan complete'
      : wirdSummary.state === 'today-complete'
        ? 'Today complete'
        : `Today ${wirdSummary.todayPercent}% · ${wirdSummary.todayRangeLabel}`
  const wirdBadge =
    wirdSummary && (wirdSummary.state === 'active' || wirdSummary.state === 'behind-target')
      ? `${wirdSummary.todayPercent}%`
      : undefined

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
      title="Menu"
      variant="navigation-drawer"
    >
      <div className="qar-react-nav-drawer-header">
        <IconButton label="Close navigation" onClick={onClose}>
          <X aria-hidden="true" size={22} strokeWidth={1.7} />
        </IconButton>
      </div>
      <div className="qar-react-drawer-section" data-drawer-destinations="true">
        <h2 className="qar-eyebrow qar-react-drawer-group-label">READ</h2>
        <ListRow
          onSelect={
            onOpenSurahs
              ? () => {
                  onClose()
                  onOpenSurahs()
                }
              : openDestination(REACT_ROUTES.surahs)
          }
          num={
            <span aria-hidden="true" className="qar-react-drawer-icon-tile">
              <BookOpen size={17} strokeWidth={1.7} />
            </span>
          }
          title="Surahs"
        />
        <ListRow
          action={bookmarkCount > 0 ? <Badge tone="neutral">{bookmarkCount}</Badge> : undefined}
          current={currentRoute === 'bookmarks'}
          onSelect={openDestination(REACT_ROUTES.bookmarks)}
          num={
            <span aria-hidden="true" className="qar-react-drawer-icon-tile">
              <Bookmark size={17} strokeWidth={1.7} />
            </span>
          }
          title="Bookmarks"
        />
        <ListRow
          action={wirdBadge ? <Badge tone="neutral">{wirdBadge}</Badge> : undefined}
          meta={wirdMeta}
          onSelect={openWirdSheet}
          num={
            <span aria-hidden="true" className="qar-react-drawer-icon-tile">
              <CalendarDays size={17} strokeWidth={1.7} />
            </span>
          }
          title="Daily Wird"
        />
        <h2 className="qar-eyebrow qar-react-drawer-group-label qar-react-drawer-group-label--after-gap">APP</h2>
        <ListRow
          current={currentRoute === 'settings'}
          onSelect={openDestination(REACT_ROUTES.settings)}
          num={
            <span aria-hidden="true" className="qar-react-drawer-icon-tile">
              <Settings size={17} strokeWidth={1.7} />
            </span>
          }
          title="Settings"
        />
        <ListRow
          current={currentRoute === 'downloads'}
          onSelect={openDestination(REACT_ROUTES.assets)}
          num={
            <span aria-hidden="true" className="qar-react-drawer-icon-tile">
              <Download size={17} strokeWidth={1.7} />
            </span>
          }
          title="Downloads"
        />
        <ListRow
          current={currentRoute === 'about'}
          onSelect={openDestination(REACT_ROUTES.about)}
          num={
            <span aria-hidden="true" className="qar-react-drawer-icon-tile">
              <Info size={17} strokeWidth={1.7} />
            </span>
          }
          title="About"
        />
      </div>
    </Sheet>
  )
}
