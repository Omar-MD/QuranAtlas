import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'
import type { ReaderAssetState } from '../../../components/reader/ReaderAssetGate'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { useMushafChromeVisibility, type MushafChromePin } from '../../../components/reader/useMushafChromeVisibility'
import { Button } from '../../../components/ui'
import type { MushafViewMode } from '../../../components/reader/MushafModeControl'
import { resolveVerseHrefForMushafPage } from '../../../components/reader/reader-mode-routing'
import { createMushafPageBookmarkKey } from '../../../continuity/bookmarks/page-bookmark'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'
import { createWirdBoundaries } from '../../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../../continuity/wird/page-boundaries'
import { advanceWirdProgressFromReaderPosition, compareRefs, deriveWirdSummary, getLocalDayKey } from '../../../continuity/wird/progress'
import { hasWirdProgressIntent, withWirdProgressIntent } from '../../../continuity/wird/session'
import { normalizeWirdPlan, notifyWirdPlanChanged, readWirdPlan, subscribeWirdPlanChanged } from '../../../continuity/wird/store'
import type { QuranRef, SurahCount, WirdBoundary, WirdPlan } from '../../../continuity/wird/types'
import {
  type MushafReadyPageAssetState,
} from '../../../packs/mushaf-page-asset'
import { clampMushafPageFraming } from '../../../components/reader/mushaf-page-framing'
import type { Riwayah } from '../../../storage/types'
import { nativeSettingsReader, readNativeSetting, readNativeSettings, writeNativeSetting } from '../../../storage/native-reader-store'
import { DEFAULT_REACT_READER_PREFERENCES, readNativeReactReaderPreferences } from '../../../storage/settings-writer'
import { emitReactReaderPreferencesChanged, isReactMushafViewMode, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { REACT_ROUTES } from '../../router/routes'
import { readableAsset, type MushafPageWindowEntry } from './mushaf-page-window-state'
import { useMushafPageWindow } from './useMushafPageWindow'
import { useMushafProfileSession } from './useMushafProfileSession'

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

export type RequestedMushafPageFailure = {
  cancel: () => void
  message: string
  requestedPage: number
  retry: () => void
  visiblePage: number
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
  const [pendingPage, setPendingPage] = useState<number | null>(null)
  const [recoveryPage, setRecoveryPage] = useState<number | null>(null)
  const [pendingWirdRef, setPendingWirdRef] = useState<QuranRef | null>(null)
  const [wirdAdvanceInFlight, setWirdAdvanceInFlight] = useState(false)
  const visiblePageRef = useRef<MushafReadyPageAssetState | null>(null)
  const initialVisibleWirdAdvancedRef = useRef(false)
  const lastWirdAdvancedKeyRef = useRef<string | null>(null)
  const { bookmarkedVerseKeys, toggleBookmark } = useBookmarks()
  const chrome = useMushafChromeVisibility(visiblePage !== null)
  const wirdCounts = useMemo(() => wirdCountsFromIndex(surahIndex), [surahIndex])
  const wirdBoundaries = useMemo(() => createWirdBoundaries(wirdCounts, wirdPageBoundaries), [wirdCounts, wirdPageBoundaries])
  const wirdSummary = useMemo(() => {
    if (!wirdPlan || wirdCounts.length !== 114) return undefined
    return deriveWirdSummary(wirdPlan, wirdCounts, wirdBoundaries)
  }, [wirdBoundaries, wirdCounts, wirdPlan])
  const enableWirdProgress = hasWirdProgressIntent()
  const profileSession = useMushafProfileSession({
    enabled: assetState === 'ready',
    profile: activeSettings ? {
      mushafEditionId: activeSettings.mushafEditionId,
      riwayah: activeSettings.riwayah,
    } : null,
  })
  const windowState = useMushafPageWindow({
    enabled: assetState === 'ready',
    page,
    session: profileSession,
  })
  const currentSurahLabel = useMemo(() => {
    const surah = visiblePage?.resolved.firstVerse.surah
    if (!surah) return undefined
    return surahIndex.find((row) => row.n === surah)?.name_ar ?? `سورة ${surah}`
  }, [surahIndex, visiblePage?.resolved.firstVerse.surah])
  const recoveryEntry = recoveryPage === null
    ? null
    : windowState.entries.find((entry) => entry.page === recoveryPage) ?? null
  const requestedPageFailure = createRequestedPageFailure({
    cancel: () => {
      setPendingPage(null)
      setRecoveryPage(null)
      if (visiblePage) replaceMushafHash(visiblePage.resolved.page)
    },
    requested: recoveryEntry,
    retry: (requestedPage) => {
      setRecoveryPage(null)
      setPendingPage(requestedPage)
      windowState.retry(requestedPage)
    },
    visiblePage: visiblePage?.resolved.page,
  })
  const pendingEntry = pendingPage === null
    ? null
    : windowState.entries.find((entry) => entry.page === pendingPage) ?? null

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

  useEffect(() => subscribeWirdPlanChanged(setWirdPlan), [])

  const queueMushafWirdAdvance = useCallback((ref: QuranRef | null | undefined) => {
    if (!enableWirdProgress || !ref) return
    setPendingWirdRef((current) => !current || compareRefs(ref, current) > 0 ? ref : current)
  }, [enableWirdProgress])

  useEffect(() => {
    if (!pendingWirdRef || !wirdPlan || wirdCounts.length !== 114 || wirdAdvanceInFlight) return
    const ref = pendingWirdRef
    const key = `${ref.surah}:${ref.verse}`
    setPendingWirdRef(null)
    if (lastWirdAdvancedKeyRef.current === key) return
    lastWirdAdvancedKeyRef.current = key
    setWirdAdvanceInFlight(true)
    void advanceNativeWirdFromReaderPosition(ref, wirdCounts)
      .then((nextPlan) => {
        if (nextPlan) setWirdPlan(nextPlan)
      })
      .catch(() => {
        lastWirdAdvancedKeyRef.current = null
      })
      .finally(() => setWirdAdvanceInFlight(false))
  }, [pendingWirdRef, wirdAdvanceInFlight, wirdCounts, wirdPlan])

  const commitVisiblePage = useCallback((next: MushafReadyPageAssetState): void => {
    visiblePageRef.current = next
    setVisiblePage(next)
  }, [])

  const mushafHash = useCallback((nextPage: number): string => {
    const href = REACT_ROUTES.mushaf(nextPage)
    return enableWirdProgress ? withWirdProgressIntent(href) : href
  }, [enableWirdProgress])

  const replaceMushafHash = useCallback((nextPage: number): void => {
    const href = mushafHash(nextPage)
    if (onReplaceHash) onReplaceHash(href)
    else window.history.replaceState(null, '', href)
  }, [mushafHash, onReplaceHash])

  const commitDiscretePage = useCallback((next: MushafReadyPageAssetState): void => {
    const current = visiblePageRef.current
    if (current && next.resolved.page > current.resolved.page) {
      queueMushafWirdAdvance(current.resolved.lastVerse ?? current.resolved.firstVerse)
    }
    commitVisiblePage(next)
    setPendingPage(null)
    setRecoveryPage(null)
    chrome.hide()
    window.location.hash = mushafHash(next.resolved.page)
  }, [chrome.hide, commitVisiblePage, mushafHash, queueMushafWirdAdvance])

  const requestDiscretePage = useCallback((nextPage: number): void => {
    const ready = readyWindowPage(windowState.entries, nextPage)
    if (ready) {
      commitDiscretePage(ready)
      return
    }
    setRecoveryPage(null)
    setPendingPage(nextPage)
    windowState.request(nextPage)
  }, [commitDiscretePage, windowState.entries, windowState.request])

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
    if (!visiblePage || initialVisibleWirdAdvancedRef.current) return
    initialVisibleWirdAdvancedRef.current = true
    queueMushafWirdAdvance(visiblePage.resolved.firstVerse)
  }, [queueMushafWirdAdvance, visiblePage])

  useEffect(() => {
    const requested = windowState.requested
    if (requested?.status !== 'ready') return
    const current = visiblePageRef.current
    if ((!current || current.resolved.page === requested.asset.resolved.page)
      && !isSameVisibleMushafPage(current, requested.asset)) {
      commitVisiblePage(requested.asset)
    }
    if (!current && requested.asset.resolved.page !== page) {
      replaceMushafHash(requested.asset.resolved.page)
    }
  }, [commitVisiblePage, page, replaceMushafHash, windowState.requested])

  useEffect(() => {
    const current = visiblePageRef.current
    if (!current || current.resolved.page === page) return
    setRecoveryPage(null)
    setPendingPage(page)
    windowState.request(page)
  }, [page, windowState.request])

  useEffect(() => {
    if (pendingPage === null) return
    const entry = windowState.entries.find((candidate) => candidate.page === pendingPage)
    if (isTerminalMushafEntry(entry)) {
      setRecoveryPage(pendingPage)
      setPendingPage(null)
      return
    }
    if (interactionSuspended) return
    const ready = readableAsset(entry)
    if (ready) commitDiscretePage(ready)
  }, [commitDiscretePage, interactionSuspended, pendingPage, windowState.entries])

  useEffect(() => {
    setPendingPage(null)
    setRecoveryPage(null)
  }, [profileSession.key])

  const handleChromePin = useCallback((source: MushafChromePin, pinned: boolean) => {
    chrome.setPinned(source, pinned)
    if (pinned && (source === 'drawer' || source === 'interaction')) setPendingPage(null)
  }, [chrome.setPinned])

  useEffect(() => {
    chrome.setPinned('recovery', requestedPageFailure !== null)
  }, [chrome.setPinned, requestedPageFailure])

  return (
    <ReaderPageShell
      chromeVisible={chrome.visible}
      interactionSuspended={interactionSuspended}
      label={`Page ${visiblePage?.resolved.page ?? page}`}
      mode="mushaf"
      onChromePinChange={handleChromePin}
      onChromeVisibleChange={(visible) => visible ? chrome.reveal() : chrome.hide()}
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
      surahLabel={currentSurahLabel}
      wirdSummary={wirdSummary}
    >
      {assetState !== 'ready' ? (
        <ReaderAssetGate label="Qalun" onManageAssets={openAssetSettings} state={assetState} />
      ) : visiblePage ? (
        <>
          <MushafPageViewer
            bookmarked={bookmarkedVerseKeys.has(createMushafPageBookmarkKey(visiblePage.resolved.page))}
            chromeVisible={chrome.visible}
            fitWidth={profileSession.framingCapability.hasValidFraming && (activeSettings?.mushafPageFraming ?? 0) > 0
              ? true
              : activeSettings?.mushafFitWidth ?? DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth}
            framingValue={profileSession.framingCapability.hasValidFraming ? activeSettings?.mushafPageFraming : 0}
            inlineSvg={visiblePage.media.kind === 'inline-svg' ? visiblePage.media.inlineSvg : emptyInlineSvg}
            onDominantPageChange={(nextPage) => {
              if (nextPage === visiblePage.resolved.page) return
              const nextAsset = readyWindowPage(windowState.entries, nextPage)
              if (!nextAsset) return
              if (nextPage > visiblePage.resolved.page) {
                queueMushafWirdAdvance(visiblePage.resolved.lastVerse ?? visiblePage.resolved.firstVerse)
              }
              commitVisiblePage(nextAsset)
              replaceMushafHash(nextPage)
            }}
            onNavigate={(nextPage) => {
              requestDiscretePage(nextPage)
            }}
            onChromePinChange={handleChromePin}
            onRequestPage={requestDiscretePage}
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
            onToggleChrome={() => chrome.toggle()}
            pages={windowState.entries}
            retainedPage={visiblePage}
            resolved={visiblePage.resolved}
            viewMode={activeSettings?.mushafViewMode ?? DEFAULT_REACT_READER_PREFERENCES.mushafViewMode}
          />
          {requestedPageFailure ? (
            <section aria-live="polite" className="qar-react-mushaf-request-failure" role="status">
              <p>{requestedPageFailure.message}</p>
              <div className="qar-react-mushaf-request-failure-actions">
                <Button onClick={requestedPageFailure.retry} size="sm">Retry page {requestedPageFailure.requestedPage}</Button>
                <Button onClick={requestedPageFailure.cancel} size="sm" variant="secondary">Stay on page {requestedPageFailure.visiblePage}</Button>
              </div>
            </section>
          ) : pendingPage !== null && (pendingEntry?.status === 'loading' || pendingEntry?.status === 'retrying') ? (
            <div aria-live="polite" className="qar-react-mushaf-request-loading" role="status">
              {pendingEntry.status === 'retrying' ? `Retrying page ${pendingPage}` : `Loading page ${pendingPage}`}
            </div>
          ) : null}
        </>
      ) : profileSession.status === 'error' ? (
        <ReaderAssetGate label="Mushaf" onManageAssets={openAssetSettings} onRetry={profileSession.retry} state="error" />
      ) : windowState.requested?.status === 'transient-error' || windowState.requested?.status === 'contract-error' ? (
        <ReaderAssetGate label="Mushaf" onManageAssets={openAssetSettings} onRetry={() => windowState.retry(page)} state="error" />
      ) : windowState.requested?.status === 'confirmed-missing' ? (
        <ReaderAssetGate label={activeSettings?.riwayah === 'qaloon' ? 'Qalun' : activeSettings?.riwayah ?? 'Mushaf'} onManageAssets={openAssetSettings} onRetry={() => windowState.retry(page)} state="missing" />
      ) : (
        <section className="qar:m-5 qar:min-h-28 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Loading Mushaf page" aria-live="polite" />
      )}
    </ReaderPageShell>
  )

}

function createRequestedPageFailure({
  cancel,
  requested,
  retry,
  visiblePage,
}: {
  cancel: () => void
  requested: ReturnType<typeof useMushafPageWindow>['requested']
  retry: (page: number) => void
  visiblePage?: number
}): RequestedMushafPageFailure | null {
  if (!visiblePage || !requested || requested.page === visiblePage || !isTerminalMushafEntry(requested)) {
    return null
  }
  return {
    cancel,
    message: requested.status === 'confirmed-missing'
      ? `Mushaf page ${requested.page} is unavailable. Page ${visiblePage} remains open.`
      : `Mushaf page ${requested.page} could not be loaded. Page ${visiblePage} remains open.`,
    requestedPage: requested.page,
    retry: () => retry(requested.page),
    visiblePage,
  }
}

function isTerminalMushafEntry(entry: MushafPageWindowEntry | undefined): boolean {
  return entry?.status === 'transient-error'
    || entry?.status === 'contract-error'
    || entry?.status === 'confirmed-missing'
}

function openAssetSettings(): void {
  window.location.hash = REACT_ROUTES.assets
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
  if (current?.resolved.page !== next.resolved.page
    || current.resolved.mushafEditionId !== next.resolved.mushafEditionId
    || current.resolved.riwayah !== next.resolved.riwayah
    || current.media.kind !== next.media.kind) {
    return false
  }
  return current.media.kind === 'inline-svg'
    || (next.media.kind === 'external-image' && current.media.source.assetUrl === next.media.source.assetUrl)
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
