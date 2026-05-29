import { useEffect, useRef, useState } from 'react'

import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'
import type { ReaderAssetState } from '../../../components/reader/ReaderAssetGate'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import type { MushafViewMode } from '../../../components/reader/MushafModeControl'
import { resolveVerseHrefForMushafPage } from '../../../components/reader/reader-mode-routing'
import { createMushafPageBookmarkKey } from '../../../continuity/bookmarks/page-bookmark'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'
import {
  loadMushafPageAsset,
  type MushafReadyPageAssetState,
  type MushafPageAssetState,
} from '../../../packs/mushaf-page-asset'
import type { Riwayah } from '../../../storage/types'
import { openReactDb } from '../../../storage/db'
import { DEFAULT_REACT_READER_PREFERENCES, readReactReaderPreferences } from '../../../storage/settings-writer'
import { isReactMushafViewMode, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { REACT_ROUTES } from '../../router/routes'

type MushafRouteProps = {
  assetState?: ReaderAssetState
  page: number
}

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1'

export function MushafRoute({ assetState = 'ready', page }: MushafRouteProps) {
  const [state, setState] = useState<MushafPageAssetState>({ status: 'loading' })
  const [visiblePage, setVisiblePage] = useState<MushafReadyPageAssetState | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'previous'>('next')
  const [viewMode, setViewMode] = useState<MushafViewMode>('auto')
  const [chromeVisible, setChromeVisible] = useState(true)
  const requestId = useRef(0)
  const routePageRef = useRef(page)
  const visiblePageRef = useRef<MushafReadyPageAssetState | null>(null)
  const { bookmarkedVerseKeys, toggleBookmark } = useBookmarks()

  useEffect(() => {
    if (routePageRef.current !== page) {
      setChromeVisible(false)
      routePageRef.current = page
    }
  }, [page])

  useEffect(() => subscribeReactReaderPreferencesChanged((preferences) => {
    if (isReactMushafViewMode(preferences.mushafViewMode)) {
      setViewMode(preferences.mushafViewMode)
    }
  }), [])

  useEffect(() => {
    if (assetState !== 'ready') return
    const id = ++requestId.current
    const controller = new AbortController()
    setState((current) => current.status === 'ready' ? current : { status: 'loading' })
    void loadActiveMushafSettings().then((settings) => {
      setViewMode(settings.mushafViewMode)
      return loadMushafPageAsset({
        mushafEditionId: settings.mushafEditionId,
        page,
        riwayah: settings.riwayah,
        signal: controller.signal,
      })
    }).then((next) => {
      if (requestId.current !== id) return
      setState(next)
      if (next.status === 'ready') {
        setTransitionDirection((visiblePageRef.current?.resolved.page ?? page) <= next.resolved.page ? 'next' : 'previous')
        visiblePageRef.current = next
        setVisiblePage(next)
      }
      if (next.status === 'ready' && next.resolved.page !== page) {
        window.history.replaceState(null, '', REACT_ROUTES.mushaf(next.resolved.page))
      }
    })
    return () => {
      requestId.current += 1
      controller.abort()
    }
  }, [assetState, page])

  return (
    <ReaderPageShell
      chromeVisible={chromeVisible}
      label={`Page ${page}`}
      mode="mushaf"
      onChromeVisibleChange={setChromeVisible}
      onModeChange={(nextMode) => {
        if (nextMode === 'verse') {
          const visibleRef = visiblePage?.resolved.firstVerse
          if (visibleRef) {
            window.location.hash = REACT_ROUTES.surah(visibleRef.surah, visibleRef.verse)
            return
          }
          void resolveVerseHrefForMushafPage(page).then((href) => {
            window.location.hash = href
          })
        }
      }}
    >
      {assetState !== 'ready' ? (
        <ReaderAssetGate label="Qalun" state={assetState} />
      ) : visiblePage ? (
        <MushafPageViewer
          bookmarked={bookmarkedVerseKeys.has(createMushafPageBookmarkKey(visiblePage.resolved.page))}
          chromeVisible={chromeVisible}
          inlineSvg={visiblePage.inlineSvg}
          onNavigate={(nextPage) => {
            setChromeVisible(false)
            window.location.hash = REACT_ROUTES.mushaf(nextPage)
          }}
          onToggleBookmark={() => {
            const bookmarkPage = visiblePage.resolved.page
            void toggleBookmark({
              kind: 'page',
              page: bookmarkPage,
              riwayah: visiblePage.resolved.riwayah,
              surah: 0,
              verseKey: createMushafPageBookmarkKey(bookmarkPage),
            })
          }}
          onToggleChrome={(visible) => setChromeVisible(visible)}
          onViewModeChange={setViewMode}
          resolved={visiblePage.resolved}
          transitionDirection={transitionDirection}
          viewMode={viewMode}
        />
      ) : state.status === 'unavailable' ? (
        <ReaderAssetGate label={state.riwayah === 'qaloon' ? 'Qalun' : state.riwayah} state="missing" />
      ) : state.status === 'error' ? (
        <ReaderAssetGate label="Mushaf" state="error" />
      ) : (
        <section className="qar:m-5 qar:min-h-28 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Loading Mushaf page" aria-live="polite" />
      )}
    </ReaderPageShell>
  )
}

async function loadActiveMushafSettings(): Promise<{ riwayah: Riwayah; mushafEditionId: string; mushafViewMode: MushafViewMode }> {
  try {
    const db = await openReactDb()
    const [riwayah, mushafEditionId, preferences] = await Promise.all([
      db.settings.get('riwayah'),
      db.settings.get('mushafEditionId'),
      readReactReaderPreferences(db),
    ])
    return {
      riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
      mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
      mushafViewMode: preferences.mushafViewMode,
    }
  } catch {
    return {
      riwayah: DEFAULT_RIWAYAH,
      mushafEditionId: DEFAULT_MUSHAF_EDITION_ID,
      mushafViewMode: DEFAULT_REACT_READER_PREFERENCES.mushafViewMode,
    }
  }
}

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'qaloon'
}
