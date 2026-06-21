import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'
import type { ReaderAssetState } from '../../../components/reader/ReaderAssetGate'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import type { MushafViewMode } from '../../../components/reader/MushafModeControl'
import { resolveVerseHrefForMushafPage } from '../../../components/reader/reader-mode-routing'
import { createMushafPageBookmarkKey } from '../../../continuity/bookmarks/page-bookmark'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'
import { createWirdBoundaries } from '../../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../../continuity/wird/page-boundaries'
import { advanceWirdProgressFromReaderPosition, deriveWirdSummary, getLocalDayKey } from '../../../continuity/wird/progress'
import { hasWirdProgressIntent, withWirdProgressIntent } from '../../../continuity/wird/session'
import { normalizeWirdPlan, notifyWirdPlanChanged, readWirdPlan, subscribeWirdPlanChanged } from '../../../continuity/wird/store'
import type { QuranRef, SurahCount, WirdBoundary, WirdPlan } from '../../../continuity/wird/types'
import {
  loadMushafPageAsset,
  type MushafReadyPageAssetState,
  type MushafPageAssetState,
} from '../../../packs/mushaf-page-asset'
import type { Riwayah } from '../../../storage/types'
import { nativeSettingsReader, readNativeSetting, readNativeSettings, writeNativeSetting } from '../../../storage/native-reader-store'
import { DEFAULT_REACT_READER_PREFERENCES, readNativeReactReaderPreferences } from '../../../storage/settings-writer'
import { emitReactReaderPreferencesChanged, isReactMushafViewMode, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { REACT_ROUTES } from '../../router/routes'

type MushafRouteProps = {
  assetState?: ReaderAssetState
  page: number
}

type ActiveMushafSettings = {
  mushafEditionId: string
  mushafFitWidth: boolean
  mushafViewMode: MushafViewMode
  riwayah: Riwayah
  wirdReaderStatusVisible: boolean
}

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1'
const COMPACT_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 600px)'
const LANDSCAPE_FIT_WIDTH_DISABLED_KEY = 'quranatlas:mushaf-landscape-fit-width-disabled'

export function MushafRoute({ assetState = 'ready', page }: MushafRouteProps) {
  const [state, setState] = useState<MushafPageAssetState>({ status: 'loading' })
  const [visiblePage, setVisiblePage] = useState<MushafReadyPageAssetState | null>(null)
  const [adjacentPages, setAdjacentPages] = useState<{
    next?: MushafReadyPageAssetState | null
    previous?: MushafReadyPageAssetState | null
  }>({})
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'previous'>('next')
  const [viewMode, setViewMode] = useState<MushafViewMode>('auto')
  const [fitWidth, setFitWidth] = useState(DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth)
  const [compactLandscape, setCompactLandscape] = useState(false)
  const [wirdReaderStatusVisible, setWirdReaderStatusVisible] = useState(DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible)
  const [surahIndex, setSurahIndex] = useState<ReaderSurahIndexEntry[]>([])
  const [wirdPageBoundaries, setWirdPageBoundaries] = useState<WirdBoundary[]>([])
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const requestId = useRef(0)
  const routePageRef = useRef(page)
  const visiblePageRef = useRef<MushafReadyPageAssetState | null>(null)
  const lastWirdAdvancedKeyRef = useRef<string | null>(null)
  const { bookmarkedVerseKeys, toggleBookmark } = useBookmarks()
  const wirdCounts = useMemo(() => wirdCountsFromIndex(surahIndex), [surahIndex])
  const wirdBoundaries = useMemo(() => createWirdBoundaries(wirdCounts, wirdPageBoundaries), [wirdCounts, wirdPageBoundaries])
  const wirdSummary = useMemo(() => {
    if (!wirdPlan || wirdCounts.length !== 114) return undefined
    return deriveWirdSummary(wirdPlan, wirdCounts, wirdBoundaries)
  }, [wirdBoundaries, wirdCounts, wirdPlan])
  const enableWirdProgress = hasWirdProgressIntent()
  const currentSurahLabel = useMemo(() => {
    const surah = visiblePage?.resolved.firstVerse.surah
    if (!surah) return undefined
    return surahIndex.find((row) => row.n === surah)?.name_ar ?? `سورة ${surah}`
  }, [surahIndex, visiblePage?.resolved.firstVerse.surah])

  useEffect(() => {
    const query = window.matchMedia?.(COMPACT_LANDSCAPE_QUERY)
    if (!query) return undefined

    function syncLandscapeState(): void {
      const matches = query.matches
      setCompactLandscape(matches)
      if (!matches) clearLandscapeFitWidthDisabled()
    }

    syncLandscapeState()
    query.addEventListener('change', syncLandscapeState)
    return () => query.removeEventListener('change', syncLandscapeState)
  }, [])

  useEffect(() => {
    if (!compactLandscape || fitWidth || isLandscapeFitWidthDisabled()) return
    setFitWidth(true)
    void writeNativeSetting({ key: 'mushafFitWidth', value: true })
      .then(() => readNativeReactReaderPreferences())
      .then((preferences) => emitReactReaderPreferencesChanged({ ...preferences, mushafFitWidth: true }))
      .catch(() => undefined)
  }, [compactLandscape, fitWidth])

  useEffect(() => {
    if (routePageRef.current !== page) {
      setChromeVisible(false)
      scrollMushafPageToTop()
      routePageRef.current = page
    }
  }, [page])

  useEffect(() => subscribeReactReaderPreferencesChanged((preferences) => {
    if (isReactMushafViewMode(preferences.mushafViewMode)) {
      setViewMode(preferences.mushafViewMode)
    }
    if (typeof preferences.mushafFitWidth === 'boolean') {
      setFitWidth(preferences.mushafFitWidth)
    }
    if (preferences.wirdReaderStatusVisible !== undefined) {
      setWirdReaderStatusVisible(preferences.wirdReaderStatusVisible)
    }
  }), [])

  useEffect(() => subscribeWirdPlanChanged(setWirdPlan), [])

  const advanceMushafWirdToRef = useCallback((ref: QuranRef | null | undefined) => {
    if (!enableWirdProgress || !ref || !wirdPlan || wirdCounts.length !== 114) return
    const key = `${ref.surah}:${ref.verse}`
    if (lastWirdAdvancedKeyRef.current === key) return
    lastWirdAdvancedKeyRef.current = key
    void advanceNativeWirdFromReaderPosition(ref, wirdCounts)
      .then((nextPlan) => {
        if (nextPlan) setWirdPlan(nextPlan)
      })
      .catch(() => {
        lastWirdAdvancedKeyRef.current = null
      })
  }, [enableWirdProgress, wirdCounts, wirdPlan])

  useEffect(() => {
    const controller = new AbortController()
    void loadReaderSurahIndex(fetch, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setSurahIndex(rows)
      })
      .catch(() => {
        if (!controller.signal.aborted) setSurahIndex([])
      })

    void readWirdPlan(nativeSettingsReader())
      .then((plan) => {
        if (!controller.signal.aborted) setWirdPlan(plan)
      })
      .catch(() => {
        if (!controller.signal.aborted) setWirdPlan(null)
      })

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (wirdCounts.length !== 114 || wirdPlan?.unit !== 'page') {
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
  }, [wirdCounts, wirdPlan?.unit])

  useEffect(() => {
    advanceMushafWirdToRef(visiblePage?.resolved.firstVerse)
  }, [advanceMushafWirdToRef, visiblePage?.resolved.firstVerse])

  useEffect(() => {
    if (assetState !== 'ready') return
    const id = ++requestId.current
    const controller = new AbortController()
    setState((current) => current.status === 'ready' ? current : { status: 'loading' })
    void loadActiveMushafSettings().then((settings) => {
      setViewMode(settings.mushafViewMode)
      setFitWidth(settings.mushafFitWidth)
      setWirdReaderStatusVisible(settings.wirdReaderStatusVisible)
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
        if (!isSameVisibleMushafPage(visiblePageRef.current, next)) {
          commitVisiblePage(next)
        }
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

  useEffect(() => {
    if (!visiblePage) {
      setAdjacentPages({})
      return undefined
    }
    let cancelled = false
    setAdjacentPages({})
    const { mushafEditionId, page: visiblePageNumber, pageCount, riwayah } = visiblePage.resolved

    async function loadAdjacentPage(nextPage: number): Promise<MushafReadyPageAssetState | null> {
      if (nextPage < 1 || nextPage > pageCount) return null
      const next = await loadMushafPageAsset({
        mushafEditionId,
        page: nextPage,
        riwayah,
      })
      return next.status === 'ready' ? next : null
    }

    void Promise.all([
      loadAdjacentPage(visiblePageNumber - 1),
      loadAdjacentPage(visiblePageNumber + 1),
    ]).then(([previous, next]) => {
      if (!cancelled) setAdjacentPages({ next, previous })
    }).catch(() => {
      if (!cancelled) setAdjacentPages({})
    })
    return () => {
      cancelled = true
    }
  }, [visiblePage])

  function commitVisiblePage(next: MushafReadyPageAssetState): void {
    setTransitionDirection((visiblePageRef.current?.resolved.page ?? page) <= next.resolved.page ? 'next' : 'previous')
    visiblePageRef.current = next
    setVisiblePage(next)
  }

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
            const href = REACT_ROUTES.surah(visibleRef.surah, visibleRef.verse)
            window.location.hash = enableWirdProgress ? withWirdProgressIntent(href) : href
            return
          }
          void resolveVerseHrefForMushafPage(page).then((href) => {
            window.location.hash = enableWirdProgress ? withWirdProgressIntent(href) : href
          })
        }
      }}
      showWirdStatus={wirdReaderStatusVisible}
      wirdSummary={wirdSummary}
    >
      {assetState !== 'ready' ? (
        <ReaderAssetGate label="Qalun" state={assetState} />
      ) : visiblePage ? (
        <MushafPageViewer
          adjacentPages={adjacentPages}
          bookmarked={bookmarkedVerseKeys.has(createMushafPageBookmarkKey(visiblePage.resolved.page))}
          chromeVisible={chromeVisible}
          fitWidth={fitWidth}
          inlineSvg={visiblePage.inlineSvg}
          onNavigate={(nextPage) => {
            if (nextPage > visiblePage.resolved.page) {
              advanceMushafWirdToRef(visiblePage.resolved.lastVerse ?? visiblePage.resolved.firstVerse)
            }
            const readyAdjacent = nextPage === adjacentPages.next?.resolved.page
              ? adjacentPages.next
              : nextPage === adjacentPages.previous?.resolved.page
                ? adjacentPages.previous
                : null
            if (readyAdjacent) commitVisiblePage(readyAdjacent)
            setChromeVisible(false)
            const href = REACT_ROUTES.mushaf(nextPage)
            window.location.hash = enableWirdProgress ? withWirdProgressIntent(href) : href
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
          surahLabel={currentSurahLabel}
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

async function loadActiveMushafSettings(): Promise<ActiveMushafSettings> {
  try {
    const [riwayah, mushafEditionId] = await readNativeSettings(['riwayah', 'mushafEditionId'])
    const preferences = await readNativeReactReaderPreferences()
    return {
      riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
      mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
      mushafFitWidth: preferences.mushafFitWidth,
      mushafViewMode: preferences.mushafViewMode,
      wirdReaderStatusVisible: preferences.wirdReaderStatusVisible,
    }
  } catch {
    return {
      riwayah: DEFAULT_RIWAYAH,
      mushafEditionId: DEFAULT_MUSHAF_EDITION_ID,
      mushafFitWidth: DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth,
      mushafViewMode: DEFAULT_REACT_READER_PREFERENCES.mushafViewMode,
      wirdReaderStatusVisible: DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible,
    }
  }
}

async function advanceNativeWirdFromReaderPosition(
  ref: QuranRef,
  counts: ReadonlyArray<SurahCount>,
): Promise<WirdPlan | null> {
  const plan = normalizeWirdPlan((await readNativeSetting('wirdPlan'))?.value)
  if (!plan) return null
  const next = advanceWirdProgressFromReaderPosition(plan, ref, counts, getLocalDayKey())
  const value = JSON.parse(JSON.stringify(next)) as WirdPlan
  await writeNativeSetting({ key: 'wirdPlan', value })
  notifyWirdPlanChanged(value)
  return value
}

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'qaloon'
}

function isLandscapeFitWidthDisabled(): boolean {
  try {
    return window.sessionStorage.getItem(LANDSCAPE_FIT_WIDTH_DISABLED_KEY) === 'true'
  } catch {
    return false
  }
}

function clearLandscapeFitWidthDisabled(): void {
  try {
    window.sessionStorage.removeItem(LANDSCAPE_FIT_WIDTH_DISABLED_KEY)
  } catch {
    /* no-op */
  }
}

function isSameVisibleMushafPage(
  current: MushafReadyPageAssetState | null,
  next: MushafReadyPageAssetState,
): boolean {
  return current?.resolved.page === next.resolved.page
    && current.resolved.mushafEditionId === next.resolved.mushafEditionId
    && current.resolved.riwayah === next.resolved.riwayah
}

function scrollMushafPageToTop(): void {
  window.requestAnimationFrame(() => {
    window.scrollTo({ behavior: 'auto', top: 0 })
    window.requestAnimationFrame(() => window.scrollTo({ behavior: 'auto', top: 0 }))
  })
}

function wirdCountsFromIndex(index: ReaderSurahIndexEntry[]): SurahCount[] {
  return index.length === 114 ? index.map((row) => ({ count: row.counts.qaloon, n: row.n })) : []
}
