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
  type MushafReadyPageAssetState,
  loadMushafFramingCapability,
} from '../../../packs/mushaf-page-asset'
import { clampMushafPageFraming, type NormalizedRect } from '../../../components/reader/mushaf-page-framing'
import type { Riwayah } from '../../../storage/types'
import { nativeSettingsReader, readNativeSetting, readNativeSettings, writeNativeSetting } from '../../../storage/native-reader-store'
import { DEFAULT_REACT_READER_PREFERENCES, readNativeReactReaderPreferences } from '../../../storage/settings-writer'
import { emitReactReaderPreferencesChanged, isReactMushafViewMode, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { REACT_ROUTES } from '../../router/routes'
import { useMushafPageWindow } from './useMushafPageWindow'

type MushafRouteProps = {
  assetState?: ReaderAssetState
  interactionSuspended?: boolean
  onReplaceHash?: (hash: string) => void
  page: number
}

type ActiveMushafSettings = {
  mushafEditionId: string
  mushafFitWidth: boolean
  mushafPageFraming: number
  mushafViewMode: MushafViewMode
  riwayah: Riwayah
  wirdReaderStatusVisible: boolean
}

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1'
const COMPACT_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 600px)'
const LANDSCAPE_FIT_WIDTH_DISABLED_KEY = 'quranatlas:mushaf-landscape-fit-width-disabled'

export function MushafRoute({
  assetState = 'ready',
  interactionSuspended = false,
  onReplaceHash,
  page,
}: MushafRouteProps) {
  const [activeSettings, setActiveSettings] = useState<ActiveMushafSettings | null>(null)
  const [visiblePage, setVisiblePage] = useState<MushafReadyPageAssetState | null>(null)
  const [compactLandscape, setCompactLandscape] = useState(false)
  const [surahIndex, setSurahIndex] = useState<ReaderSurahIndexEntry[]>([])
  const [wirdPageBoundaries, setWirdPageBoundaries] = useState<WirdBoundary[]>([])
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [framingCapability, setFramingCapability] = useState<{ hasValidFraming: boolean; representativeTextFrame?: NormalizedRect }>({ hasValidFraming: false })
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
  const windowState = useMushafPageWindow({
    enabled: assetState === 'ready',
    page,
    pageCount: visiblePage?.resolved.pageCount ?? 604,
    profile: activeSettings ? {
      mushafEditionId: activeSettings.mushafEditionId,
      riwayah: activeSettings.riwayah,
    } : null,
  })
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
    if (!compactLandscape || activeSettings?.mushafFitWidth || isLandscapeFitWidthDisabled()) return
    setActiveSettings((current) => current ? { ...current, mushafFitWidth: true } : current)
    void writeNativeSetting({ key: 'mushafFitWidth', value: true })
      .then(() => readNativeReactReaderPreferences())
      .then((preferences) => emitReactReaderPreferencesChanged({ ...preferences, mushafFitWidth: true }))
      .catch(() => undefined)
  }, [activeSettings?.mushafFitWidth, compactLandscape])

  useEffect(() => {
    if (routePageRef.current !== page) {
      setChromeVisible(false)
      routePageRef.current = page
    }
  }, [page])

  useEffect(() => {
    let active = true
    void loadActiveMushafSettings().then((settings) => {
      if (active) setActiveSettings(settings)
    })
    const unsubscribe = subscribeReactReaderPreferencesChanged((preferences) => {
      setActiveSettings((current) => current ? {
        ...current,
        mushafFitWidth: typeof preferences.mushafFitWidth === 'boolean'
          ? preferences.mushafFitWidth
          : current.mushafFitWidth,
        mushafPageFraming: clampMushafPageFraming(preferences.mushafPageFraming),
        mushafViewMode: isReactMushafViewMode(preferences.mushafViewMode)
          ? preferences.mushafViewMode
          : current.mushafViewMode,
        wirdReaderStatusVisible: preferences.wirdReaderStatusVisible ?? current.wirdReaderStatusVisible,
      } : current)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!activeSettings) return
    let active = true
    void loadMushafFramingCapability(activeSettings)
      .then((capability) => { if (active) setFramingCapability(capability) })
    return () => { active = false }
  }, [activeSettings?.mushafEditionId, activeSettings?.riwayah])

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
    const requested = windowState.requested
    if (requested?.status !== 'ready') return
    if (!isSameVisibleMushafPage(visiblePageRef.current, requested.asset)) {
      commitVisiblePage(requested.asset)
    }
    if (requested.asset.resolved.page !== page) {
      replaceMushafHash(requested.asset.resolved.page)
    }
  }, [page, windowState.requested])

  function commitVisiblePage(next: MushafReadyPageAssetState): void {
    visiblePageRef.current = next
    setVisiblePage(next)
  }

  return (
    <ReaderPageShell
      chromeVisible={chromeVisible}
      interactionSuspended={interactionSuspended}
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
      showWirdStatus={activeSettings?.wirdReaderStatusVisible ?? DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible}
      wirdSummary={wirdSummary}
    >
      {assetState !== 'ready' ? (
        <ReaderAssetGate label="Qalun" state={assetState} />
      ) : visiblePage ? (
        <MushafPageViewer
          bookmarked={bookmarkedVerseKeys.has(createMushafPageBookmarkKey(visiblePage.resolved.page))}
          chromeVisible={chromeVisible}
          fitWidth={framingCapability.hasValidFraming && (activeSettings?.mushafPageFraming ?? 0) > 0
            ? true
            : activeSettings?.mushafFitWidth ?? DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth}
          framingValue={framingCapability.hasValidFraming ? activeSettings?.mushafPageFraming : 0}
          inlineSvg={visiblePage.media.kind === 'inline-svg' ? visiblePage.media.inlineSvg : emptyInlineSvg}
          onDominantPageChange={(nextPage) => {
            if (nextPage === visiblePage.resolved.page) return
            const nextAsset = readyWindowPage(windowState.entries, nextPage)
            if (!nextAsset) return
            if (nextPage > visiblePage.resolved.page) {
              advanceMushafWirdToRef(visiblePage.resolved.lastVerse ?? visiblePage.resolved.firstVerse)
            }
            commitVisiblePage(nextAsset)
            replaceMushafHash(nextPage)
          }}
          onNavigate={(nextPage) => {
            if (nextPage > visiblePage.resolved.page) {
              advanceMushafWirdToRef(visiblePage.resolved.lastVerse ?? visiblePage.resolved.firstVerse)
            }
            const readyAdjacent = readyWindowPage(windowState.entries, nextPage)
            if (readyAdjacent) commitVisiblePage(readyAdjacent)
            setChromeVisible(false)
            window.location.hash = mushafHash(nextPage)
          }}
          onRequestPage={windowState.retry}
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
          pages={windowState.entries}
          resolved={visiblePage.resolved}
          surahLabel={currentSurahLabel}
          viewMode={activeSettings?.mushafViewMode ?? DEFAULT_REACT_READER_PREFERENCES.mushafViewMode}
        />
      ) : windowState.requested?.status === 'unavailable' ? (
        <ReaderAssetGate label={activeSettings?.riwayah === 'qaloon' ? 'Qalun' : activeSettings?.riwayah ?? 'Mushaf'} state="missing" />
      ) : windowState.requested?.status === 'error' ? (
        <ReaderAssetGate label="Mushaf" state="error" />
      ) : (
        <section className="qar:m-5 qar:min-h-28 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Loading Mushaf page" aria-live="polite" />
      )}
    </ReaderPageShell>
  )

  function mushafHash(nextPage: number): string {
    const href = REACT_ROUTES.mushaf(nextPage)
    return enableWirdProgress ? withWirdProgressIntent(href) : href
  }

  function replaceMushafHash(nextPage: number): void {
    const href = mushafHash(nextPage)
    if (onReplaceHash) onReplaceHash(href)
    else window.history.replaceState(null, '', href)
  }
}

async function loadActiveMushafSettings(): Promise<ActiveMushafSettings> {
  try {
    const [riwayah, mushafEditionId] = await readNativeSettings(['riwayah', 'mushafEditionId'])
    const preferences = await readNativeReactReaderPreferences()
    return {
      riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
      mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
      mushafFitWidth: preferences.mushafFitWidth,
      mushafPageFraming: clampMushafPageFraming(preferences.mushafPageFraming),
      mushafViewMode: preferences.mushafViewMode,
      wirdReaderStatusVisible: preferences.wirdReaderStatusVisible,
    }
  } catch {
    return {
      riwayah: DEFAULT_RIWAYAH,
      mushafEditionId: DEFAULT_MUSHAF_EDITION_ID,
      mushafFitWidth: DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth,
      mushafPageFraming: DEFAULT_REACT_READER_PREFERENCES.mushafPageFraming,
      mushafViewMode: DEFAULT_REACT_READER_PREFERENCES.mushafViewMode,
      wirdReaderStatusVisible: DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible,
    }
  }
}

const emptyInlineSvg = { markup: '', viewBox: { x: 0, y: 0, width: 1, height: 1 }, viewBoxText: '0 0 1 1' }

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

function readyWindowPage(
  entries: ReturnType<typeof useMushafPageWindow>['entries'],
  page: number,
): MushafReadyPageAssetState | null {
  const entry = entries.find((candidate) => candidate.page === page)
  return entry?.status === 'ready' ? entry.asset : null
}

function wirdCountsFromIndex(index: ReaderSurahIndexEntry[]): SurahCount[] {
  return index.length === 114 ? index.map((row) => ({ count: row.counts.qaloon, n: row.n })) : []
}
