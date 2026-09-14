import { BookOpen, Bookmark, ChevronLeft, ChevronRight, ScanEye } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'
import type { ReaderAssetState } from '../../../components/reader/ReaderAssetGate'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { useMushafChromeVisibility, type MushafChromePin } from '../../../components/reader/useMushafChromeVisibility'
import type { MushafViewMode } from '../../../components/reader/MushafModeControl'
import { Button, ChoiceButton, IconButton, Spinner, Status } from '../../../components/ui'
import {
  resolveDrawerHrefForReaderMode,
  resolveVerseHrefForMushafPage,
} from '../../../components/reader/reader-mode-routing'
import { createMushafPageBookmarkKey } from '../../../continuity/bookmarks/page-bookmark'
import { useSharedBookmarks } from '../../../continuity/bookmarks/use-bookmarks'
import { createWirdBoundaries } from '../../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../../continuity/wird/page-boundaries'
import {
  advanceWirdProgressFromReaderPosition,
  compareRefs,
  deriveWirdSummary,
  getLocalDayKey,
} from '../../../continuity/wird/progress'
import { hasWirdProgressIntent, withWirdProgressIntent } from '../../../continuity/wird/session'
import {
  normalizeWirdPlan,
  notifyWirdPlanChanged,
  readWirdPlan,
  subscribeWirdPlanChanged,
} from '../../../continuity/wird/store'
import type { QuranRef, SurahCount, WirdBoundary, WirdPlan } from '../../../continuity/wird/types'
import type { MushafReadyPageAssetState } from '../../../packs/mushaf-page-asset'
import { clampMushafPageFraming } from '../../../components/reader/mushaf-page-framing'
import type { Riwayah } from '../../../storage/types'
import {
  nativeSettingsReader,
  readNativeSetting,
  readNativeSettings,
  writeNativeSetting,
} from '../../../storage/native-reader-store'
import { DEFAULT_REACT_READER_PREFERENCES, readNativeReactReaderPreferences } from '../../../storage/settings-writer'
import { DEFAULT_MUSHAF_EDITION_ID, DEFAULT_RIWAYAH, readActiveMushafProfile } from '../../../storage/reader-settings'
import { DEFAULT_JUZ_STARTS } from '../../../data/juz-index'
import {
  emitReactReaderPreferencesChanged,
  isReactMushafViewMode,
  subscribeReactReaderPreferencesChanged,
} from '../../../storage/reader-preferences'
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
  const { bookmarkedVerseKeys, toggleBookmark } = useSharedBookmarks()
  const chrome = useMushafChromeVisibility(visiblePage !== null)
  const wirdCounts = useMemo(() => wirdCountsFromIndex(surahIndex), [surahIndex])
  const wirdBoundaries = useMemo(
    () => createWirdBoundaries(wirdCounts, wirdPageBoundaries),
    [wirdCounts, wirdPageBoundaries],
  )
  const wirdSummary = useMemo(() => {
    if (!wirdPlan || wirdCounts.length !== 114) return undefined
    return deriveWirdSummary(wirdPlan, wirdCounts, { boundaries: wirdBoundaries })
  }, [wirdBoundaries, wirdCounts, wirdPlan])
  const enableWirdProgress = hasWirdProgressIntent()
  const profileSession = useMushafProfileSession({
    enabled: assetState === 'ready',
    profile: activeSettings
      ? {
          mushafEditionId: activeSettings.mushafEditionId,
          riwayah: activeSettings.riwayah,
        }
      : null,
  })
  const windowState = useMushafPageWindow({
    enabled: assetState === 'ready',
    page,
    session: profileSession,
  })
  const currentSurahLatinName = useMemo(() => {
    const surah = visiblePage?.resolved.firstVerse.surah
    if (!surah) return undefined
    return surahIndex.find((row) => row.n === surah)?.name
  }, [surahIndex, visiblePage?.resolved.firstVerse.surah])
  const recoveryEntry =
    recoveryPage === null ? null : (windowState.entries.find((entry) => entry.page === recoveryPage) ?? null)
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
  const pendingEntry =
    pendingPage === null ? null : (windowState.entries.find((entry) => entry.page === pendingPage) ?? null)

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
    setActiveSettings((current) => (current ? { ...current, mushafFitWidth: true } : current))
    void writeNativeSetting({ key: 'mushafFitWidth', value: true })
      .then(() => readNativeReactReaderPreferences())
      .then((preferences) => emitReactReaderPreferencesChanged({ ...preferences, mushafFitWidth: true }))
      .catch(() => undefined)
  }, [activeSettings?.mushafFitWidth, compactLandscape])

  useEffect(() => {
    let active = true
    let settingsEpoch = 0
    let trackedEditionId: string | null = null
    void loadActiveMushafSettings().then((settings) => {
      if (!active) return
      trackedEditionId = settings.mushafEditionId
      setActiveSettings(settings)
    })
    const unsubscribe = subscribeReactReaderPreferencesChanged((preferences) => {
      setActiveSettings((current) =>
        current
          ? {
              ...current,
              mushafFitWidth:
                typeof preferences.mushafFitWidth === 'boolean' ? preferences.mushafFitWidth : current.mushafFitWidth,
              mushafPageFraming:
                typeof preferences.mushafPageFraming === 'number'
                  ? clampMushafPageFraming(preferences.mushafPageFraming)
                  : current.mushafPageFraming,
              mushafViewMode: isReactMushafViewMode(preferences.mushafViewMode)
                ? preferences.mushafViewMode
                : current.mushafViewMode,
              wirdReaderStatusVisible: preferences.wirdReaderStatusVisible ?? current.wirdReaderStatusVisible,
            }
          : current,
      )
      // §3: the event carries no edition id — read the native one and
      // re-resolve the active settings only on an actual edition change.
      // The refresh reads through readActiveMushafSettings so a failed read
      // keeps the current settings (loadActiveMushafSettings's shipped-default
      // fallback must never leak into a refresh); the epoch discards stale
      // resolutions after rapid A→B→A switching.
      void readNativeSettings(['mushafEditionId'])
        .then(([mushafEditionId]) => {
          const editionId =
            typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID
          if (!active || editionId === trackedEditionId) return
          const epoch = settingsEpoch + 1
          settingsEpoch = epoch
          return readActiveMushafSettings().then((settings) => {
            if (!active || settingsEpoch !== epoch) return
            trackedEditionId = settings.mushafEditionId
            setActiveSettings(settings)
          })
        })
        .catch(() => undefined)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => subscribeWirdPlanChanged(setWirdPlan), [])

  const queueMushafWirdAdvance = useCallback(
    (ref: QuranRef | null | undefined) => {
      if (!enableWirdProgress || !ref) return
      setPendingWirdRef((current) => (!current || compareRefs(ref, current) > 0 ? ref : current))
    },
    [enableWirdProgress],
  )

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

  const mushafHash = useCallback(
    (nextPage: number): string => {
      const href = REACT_ROUTES.mushaf(nextPage)
      return enableWirdProgress ? withWirdProgressIntent(href) : href
    },
    [enableWirdProgress],
  )

  const replaceMushafHash = useCallback(
    (nextPage: number): void => {
      const href = mushafHash(nextPage)
      if (onReplaceHash) onReplaceHash(href)
      else window.history.replaceState(null, '', href)
    },
    [mushafHash, onReplaceHash],
  )

  const commitDiscretePage = useCallback(
    (next: MushafReadyPageAssetState): void => {
      const current = visiblePageRef.current
      if (current && next.resolved.page > current.resolved.page) {
        queueMushafWirdAdvance(current.resolved.lastVerse ?? current.resolved.firstVerse)
      }
      commitVisiblePage(next)
      setPendingPage(null)
      setRecoveryPage(null)
      window.location.hash = mushafHash(next.resolved.page)
    },
    [commitVisiblePage, mushafHash, queueMushafWirdAdvance],
  )

  const requestDiscretePage = useCallback(
    (nextPage: number): void => {
      const ready = readyWindowPage(windowState.entries, nextPage)
      if (ready) {
        commitDiscretePage(ready)
        return
      }
      setRecoveryPage(null)
      setPendingPage(nextPage)
      windowState.request(nextPage)
    },
    [commitDiscretePage, windowState.entries, windowState.request],
  )

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
    if (
      (!current || current.resolved.page === requested.asset.resolved.page) &&
      !isSameVisibleMushafPage(current, requested.asset)
    ) {
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

  const lastProfileKeyRef = useRef(profileSession.key)
  useEffect(() => {
    if (lastProfileKeyRef.current === profileSession.key) return
    lastProfileKeyRef.current = profileSession.key
    setPendingPage(null)
    setRecoveryPage(null)
  }, [profileSession.key])

  const handleChromePin = useCallback(
    (source: MushafChromePin, pinned: boolean) => {
      chrome.setPinned(source, pinned)
      if (pinned && (source === 'drawer' || source === 'interaction')) setPendingPage(null)
    },
    [chrome.setPinned],
  )

  useEffect(() => {
    chrome.setPinned('recovery', requestedPageFailure !== null)
  }, [chrome.setPinned, requestedPageFailure])

  const gateSurfaceRendered =
    assetState !== 'ready' ||
    (visiblePage
      ? requestedPageFailure !== null
      : profileSession.status === 'error' ||
        windowState.requested?.status === 'transient-error' ||
        windowState.requested?.status === 'contract-error' ||
        windowState.requested?.status === 'confirmed-missing')

  const pageBookmarked = visiblePage
    ? bookmarkedVerseKeys.has(createMushafPageBookmarkKey(visiblePage.resolved.page))
    : false

  return (
    <ReaderPageShell
      bottomStrip={
        visiblePage ? (
          <MushafBottomStrip
            bookmarked={pageBookmarked}
            focusMode={chrome.focusMode}
            juz={juzForVerse(visiblePage.resolved.firstVerse)}
            onEnterFocus={chrome.enterFocus}
            onNextPage={() => requestDiscretePage(visiblePage.resolved.page + 1)}
            onPreviousPage={() => requestDiscretePage(visiblePage.resolved.page - 1)}
            onRevealChrome={() => chrome.reveal()}
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
            page={visiblePage.resolved.page}
            pageCount={visiblePage.resolved.pageCount}
          />
        ) : undefined
      }
      bottomStripPinned={chrome.visible}
      chromeVisible={chrome.visible || assetState !== 'ready' || profileSession.status === 'error'}
      currentSurah={visiblePage?.resolved.firstVerse.surah ?? null}
      interactionSuspended={interactionSuspended || gateSurfaceRendered}
      mode="mushaf"
      onChromePinChange={handleChromePin}
      pageImageUrl={visiblePage?.media.kind === 'external-image' ? visiblePage.media.source.assetUrl : null}
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
      resolveSelectorHref={(hash) => resolveDrawerHrefForReaderMode('mushaf', hash)}
      showWirdStatus={
        activeSettings?.wirdReaderStatusVisible ?? DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible
      }
      surahName={currentSurahLatinName ?? (visiblePage ? `Page ${visiblePage.resolved.page}` : undefined)}
      wirdSummary={wirdSummary}
    >
      {chrome.focusMode && visiblePage ? <MushafFocusHandle onReveal={chrome.reveal} /> : null}
      <MushafCoachMark chromeVisible={chrome.visible} readable={visiblePage !== null} />
      {assetState !== 'ready' ? (
        <MushafGateSurface>
          <ReaderAssetGate label="Qalun" onManageAssets={openAssetSettings} state={assetState} />
        </MushafGateSurface>
      ) : visiblePage ? (
        <>
          <MushafPageViewer
            chromeVisible={chrome.visible}
            fitWidth={
              profileSession.framingCapability.hasValidFraming && (activeSettings?.mushafPageFraming ?? 0) > 0
                ? true
                : (activeSettings?.mushafFitWidth ?? DEFAULT_REACT_READER_PREFERENCES.mushafFitWidth)
            }
            inert={gateSurfaceRendered}
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
            onToggleChrome={(visible) => (visible ? chrome.reveal() : chrome.enterFocus())}
            pages={windowState.entries}
            retainedPage={visiblePage}
            resolved={visiblePage.resolved}
            viewMode={activeSettings?.mushafViewMode ?? DEFAULT_REACT_READER_PREFERENCES.mushafViewMode}
          />
          {requestedPageFailure ? (
            <MushafGateSurface>
              <Status
                action={
                  <>
                    <Button onClick={requestedPageFailure.retry} size="sm">
                      Retry page {requestedPageFailure.requestedPage}
                    </Button>
                    <Button onClick={requestedPageFailure.cancel} size="sm" variant="secondary">
                      Stay on page {requestedPageFailure.visiblePage}
                    </Button>
                  </>
                }
                aria-live="polite"
                description={requestedPageFailure.message}
                title={`Unable to load page ${requestedPageFailure.requestedPage}`}
                tone="error"
              />
            </MushafGateSurface>
          ) : pendingPage !== null && (pendingEntry?.status === 'loading' || pendingEntry?.status === 'retrying') ? (
            <Status
              aria-live="polite"
              description={
                pendingEntry.status === 'retrying' ? `Retrying page ${pendingPage}` : `Loading page ${pendingPage}`
              }
              icon={<Spinner label={`Loading page ${pendingPage}`} />}
              title="Loading Mushaf page"
              tone="info"
            />
          ) : null}
        </>
      ) : profileSession.status === 'error' ? (
        <MushafGateSurface>
          <ReaderAssetGate
            label="Mushaf"
            onManageAssets={openAssetSettings}
            onRetry={profileSession.retry}
            state="error"
          />
        </MushafGateSurface>
      ) : windowState.requested?.status === 'transient-error' || windowState.requested?.status === 'contract-error' ? (
        <MushafGateSurface>
          <ReaderAssetGate
            label="Mushaf"
            onManageAssets={openAssetSettings}
            onRetry={() => windowState.retry(page)}
            state="error"
          />
        </MushafGateSurface>
      ) : windowState.requested?.status === 'confirmed-missing' ? (
        <MushafGateSurface>
          <ReaderAssetGate
            label={activeSettings?.riwayah === 'qaloon' ? 'Qalun' : (activeSettings?.riwayah ?? 'Mushaf')}
            onManageAssets={openAssetSettings}
            onRetry={() => windowState.retry(page)}
            state="missing"
          />
        </MushafGateSurface>
      ) : (
        <div
          aria-label="Loading Mushaf page"
          aria-live="polite"
          className="qar-react-mushaf-loading-reserve"
          role="status"
        />
      )}
    </ReaderPageShell>
  )
}

// Bottom strip (S4): Prev/Next · live page identity (eyebrow style, always
// visible; the printed number is never the only reference) · page bookmark ·
// Focus button (icon + label).
function MushafBottomStrip({
  bookmarked,
  focusMode,
  juz,
  onEnterFocus,
  onNextPage,
  onPreviousPage,
  onRevealChrome,
  onToggleBookmark,
  page,
  pageCount,
}: {
  bookmarked: boolean
  focusMode: boolean
  juz: number
  onEnterFocus: () => void
  onNextPage: () => void
  onPreviousPage: () => void
  onRevealChrome: () => void
  onToggleBookmark: () => void
  page: number
  pageCount: number
}) {
  return (
    <div className="qar-reader-bottom-strip" data-bottom-strip="mushaf">
      <div className="qar-reader-bottom-strip-left">
        <IconButton disabled={page >= pageCount} label="Next Mushaf page" onClick={onNextPage}>
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </IconButton>
        <IconButton disabled={page <= 1} label="Previous Mushaf page" onClick={onPreviousPage}>
          <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
        </IconButton>
      </div>
      <div className="qar-reader-bottom-strip-center">
        <span className="qar-mushaf-page-identity qar-eyebrow" role="status">
          <span className="qar:sr-only">Mushaf page </span>
          Page {page} · Juz {juz}
        </span>
      </div>
      <div className="qar-reader-bottom-strip-right">
        <IconButton
          aria-pressed={bookmarked}
          label={bookmarked ? `Remove bookmark for Mushaf page ${page}` : `Bookmark Mushaf page ${page}`}
          onClick={onToggleBookmark}
        >
          <Bookmark aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} size={18} strokeWidth={1.8} />
        </IconButton>
        {focusMode ? (
          <Button onClick={onRevealChrome} size="sm" variant="secondary">
            <ScanEye aria-hidden="true" size={16} strokeWidth={1.8} />
            Show controls
          </Button>
        ) : (
          <Button onClick={onEnterFocus} size="sm" variant="secondary">
            <BookOpen aria-hidden="true" size={16} strokeWidth={1.8} />
            Focus
          </Button>
        )}
      </div>
    </div>
  )
}

// Focus reveal handle (S4): 44 px pill, bottom-centre above the safe area.
function MushafFocusHandle({ onReveal }: { onReveal: () => void }) {
  return (
    <ChoiceButton
      aria-label="Show controls"
      className="qar-react-mushaf-focus-handle"
      data-testid="mushaf-focus-handle"
      onClick={onReveal}
    >
      <ScanEye aria-hidden="true" size={20} strokeWidth={1.8} />
    </ChoiceButton>
  )
}

const COACH_MARK_KEY = 'mushafCoachMarkSeen'

// One-time coach mark (S4): shown on the first Mushaf visit while chrome is
// visible; dismissible, persisted, never reshown.
function MushafCoachMark({ chromeVisible, readable }: { chromeVisible: boolean; readable: boolean }) {
  const [state, setState] = useState<'loading' | 'seen' | 'pending'>('loading')

  useEffect(() => {
    let active = true
    void readNativeSetting(COACH_MARK_KEY)
      .then((record) => {
        if (active) setState(record?.value === true ? 'seen' : 'pending')
      })
      .catch(() => {
        if (active) setState('pending')
      })
    return () => {
      active = false
    }
  }, [])

  if (state !== 'pending' || !readable || !chromeVisible) return null
  return (
    <aside aria-label="Mushaf controls tip" className="qar-react-mushaf-coach" data-coach-mark="true" role="note">
      <p className="qar:m-0 qar:text-sm qar:leading-5">
        Tap Focus to hide the controls — tap the page to bring them back.
      </p>
      <div>
        <Button
          onClick={() => {
            setState('seen')
            void writeNativeSetting({ key: COACH_MARK_KEY, value: true }).catch(() => undefined)
          }}
          size="sm"
          variant="secondary"
        >
          Got it
        </Button>
      </div>
    </aside>
  )
}

function juzForVerse(ref: { surah: number; verse: number }): number {
  let current = 1
  for (const entry of DEFAULT_JUZ_STARTS) {
    if (entry.start.surah < ref.surah || (entry.start.surah === ref.surah && entry.start.verse <= ref.verse)) {
      current = entry.n
    } else {
      break
    }
  }
  return current
}

function MushafGateSurface({ children }: { children: ReactNode }) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)

  // Keyboard focus moves into the gate on mount; when the gate dismisses,
  // return it to the pre-gate element unless the user has since focused
  // elsewhere or that element left the document.
  useEffect(() => {
    const surface = surfaceRef.current
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    surface?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      if (!previouslyFocused?.isConnected) return
      const active = document.activeElement
      if (active === document.body || surface?.contains(active)) previouslyFocused.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div ref={surfaceRef} className="qar-react-mushaf-page-status qar-react-mushaf-page-status--gate">
      {children}
    </div>
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
    message:
      requested.status === 'confirmed-missing'
        ? `Mushaf page ${requested.page} is unavailable. Page ${visiblePage} remains open.`
        : `Mushaf page ${requested.page} could not be loaded. Page ${visiblePage} remains open.`,
    requestedPage: requested.page,
    retry: () => retry(requested.page),
    visiblePage,
  }
}

function isTerminalMushafEntry(entry: MushafPageWindowEntry | undefined): boolean {
  return (
    entry?.status === 'transient-error' || entry?.status === 'contract-error' || entry?.status === 'confirmed-missing'
  )
}

function openAssetSettings(): void {
  window.location.hash = REACT_ROUTES.assets
}

// Confirmed read: rejects when the native state cannot be read, so refreshes
// can keep their current settings instead of swallowing a failure into the
// shipped defaults (§3 preserve-on-failure).
async function readActiveMushafSettings(): Promise<ActiveMushafSettings> {
  const { mushafEditionId, riwayah } = await readActiveMushafProfile()
  const preferences = await readNativeReactReaderPreferences()
  return {
    riwayah,
    mushafEditionId,
    mushafFitWidth: preferences.mushafFitWidth,
    mushafPageFraming: clampMushafPageFraming(preferences.mushafPageFraming),
    mushafViewMode: preferences.mushafViewMode,
    wirdReaderStatusVisible: preferences.wirdReaderStatusVisible,
  }
}

async function loadActiveMushafSettings(): Promise<ActiveMushafSettings> {
  try {
    return await readActiveMushafSettings()
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

function isSameVisibleMushafPage(current: MushafReadyPageAssetState | null, next: MushafReadyPageAssetState): boolean {
  if (
    current?.resolved.page !== next.resolved.page ||
    current.resolved.mushafEditionId !== next.resolved.mushafEditionId ||
    current.resolved.riwayah !== next.resolved.riwayah ||
    current.media.kind !== next.media.kind
  ) {
    return false
  }
  return (
    current.media.kind === 'inline-svg' ||
    (next.media.kind === 'external-image' && current.media.source.assetUrl === next.media.source.assetUrl)
  )
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
