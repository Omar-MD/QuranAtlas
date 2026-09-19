import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CaseSensitive } from 'lucide-react'

import { loadReaderSurah, type ReaderCorpusState } from '../../../data/reader-corpus'
import { findAdjacentSurah, loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { REACT_ROUTES } from '../../router/routes'
import type { Riwayah } from '../../../storage/types'
import { nativeSettingsReader, readNativeSettings } from '../../../storage/native-reader-store'
import {
  DEFAULT_QURAN_TEXT_STYLE_ID,
  DEFAULT_RIWAYAH,
  DEFAULT_TRANSLATION_ID,
  isRiwayah,
} from '../../../storage/reader-settings'
import { DEFAULT_REACT_READER_PREFERENCES, readNativeReactReaderPreferences } from '../../../storage/settings-writer'
import { applyReactReaderTypography, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { ReaderVerseSurface } from '../../../components/reader/ReaderVerseSurface'
import { AdjustmentsSheet } from '../../../components/reader/AdjustmentsSheet'
import { ReadingViewToggle } from '../../../components/reader/ReadingViewToggle'
import { EditionBannerGate } from '../../../components/launch/EditionBanner'
import {
  resolveMushafHrefForVerseRef,
  resolveMushafHrefForVerseRoute,
} from '../../../components/reader/reader-mode-routing'
import { useReaderPositionSync } from '../../../components/reader/useReaderPositionSync'
import { useVerseInteractionReducer } from '../../../components/reader/useVerseInteractionReducer'
import { IconButton, Status } from '../../../components/ui'
import { readWirdPlan, subscribeWirdPlanChanged } from '../../../continuity/wird/store'
import { createWirdBoundaries } from '../../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../../continuity/wird/page-boundaries'
import { deriveWirdSummary } from '../../../continuity/wird/progress'
import type { SurahCount, WirdBoundary, WirdPlan } from '../../../continuity/wird/types'
import { useSharedBookmarks } from '../../../continuity/bookmarks/use-bookmarks'

type ReaderSettings = {
  fontSize: ReaderSpacingStep
  quranTextStyleId: string
  riwayah: Riwayah
  translationId: string
  translationVisible: boolean
  translationFontSize: ReaderSpacingStep
  verseSpacing: ReaderSpacingStep
  wirdReaderStatusVisible: boolean
}

type ReaderSpacingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: DEFAULT_REACT_READER_PREFERENCES.fontSize,
  quranTextStyleId: DEFAULT_QURAN_TEXT_STYLE_ID,
  riwayah: DEFAULT_RIWAYAH,
  translationId: DEFAULT_TRANSLATION_ID,
  translationVisible: DEFAULT_REACT_READER_PREFERENCES.translationVisible,
  translationFontSize: DEFAULT_REACT_READER_PREFERENCES.translationFontSize,
  verseSpacing: DEFAULT_REACT_READER_PREFERENCES.verseSpacing,
  wirdReaderStatusVisible: DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible,
}

async function readReaderSettings(): Promise<ReaderSettings> {
  try {
    const [riwayah, quranTextStyleId, translationId] = await readNativeSettings([
      'riwayah',
      'quranTextStyleId',
      'translationId',
    ])
    const preferences = await readNativeReactReaderPreferences()
    return {
      fontSize: preferences.fontSize,
      quranTextStyleId:
        typeof quranTextStyleId?.value === 'string' ? quranTextStyleId.value : DEFAULT_READER_SETTINGS.quranTextStyleId,
      riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_READER_SETTINGS.riwayah,
      translationId:
        typeof translationId?.value === 'string' ? translationId.value : DEFAULT_READER_SETTINGS.translationId,
      translationVisible: preferences.translationVisible,
      translationFontSize: preferences.translationFontSize,
      verseSpacing: preferences.verseSpacing,
      wirdReaderStatusVisible: preferences.wirdReaderStatusVisible,
    }
  } catch {
    return DEFAULT_READER_SETTINGS
  }
}

const COPY_TOAST_CLEAR_MS = 4000

export function ReaderRoute({
  ayah,
  preservePosition = false,
  surah,
}: {
  ayah?: number
  preservePosition?: boolean
  surah: number
}) {
  const [corpus, setCorpus] = useState<ReaderCorpusState>({ status: 'loading' })
  const [corpusRequestToken, setCorpusRequestToken] = useState(0)
  const [surahIndex, setSurahIndex] = useState<ReaderSurahIndexEntry[]>([])
  const [wirdPageBoundaries, setWirdPageBoundaries] = useState<WirdBoundary[]>([])
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const [wirdReaderStatusVisible, setWirdReaderStatusVisible] = useState(
    DEFAULT_READER_SETTINGS.wirdReaderStatusVisible,
  )
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false)
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const [verseRange, setVerseRange] = useState<string | undefined>(undefined)
  const lastFocusedRouteKeyRef = useRef<string | null>(null)
  const lastRouteKeyRef = useRef<string | null>(null)
  const wirdCounts = useMemo(() => wirdCountsFromIndex(surahIndex, corpus), [corpus, surahIndex])
  const adjacentSurahs = useMemo(
    () => ({
      previous: findAdjacentSurah(surahIndex, surah, 'previous'),
      next: findAdjacentSurah(surahIndex, surah, 'next'),
    }),
    [surah, surahIndex],
  )
  const wirdProgressCounts = useMemo(
    () => (surahIndex.length === 114 ? wirdCounts : []),
    [surahIndex.length, wirdCounts],
  )
  const wirdBoundaries = useMemo(
    () => createWirdBoundaries(wirdCounts, wirdPageBoundaries),
    [wirdCounts, wirdPageBoundaries],
  )
  const wirdSummary = useMemo(
    () => deriveWirdSummary(wirdPlan, wirdCounts, { boundaries: wirdBoundaries }),
    [wirdBoundaries, wirdCounts, wirdPlan],
  )
  // §15.4.8: progress counts for any reading inside today's range — no
  // URL intent gate; a complete surah index plus an existing plan is enough.
  const enableWirdProgress = wirdPlan !== null && wirdCounts.length === 114
  const { selectedVerseKey, selectVerse } = useVerseInteractionReducer()
  const { getCurrentPosition, syncPosition } = useReaderPositionSync(corpus, {
    enableWirdProgress,
    suspendAutoSync: preservePosition,
    wirdCounts: wirdProgressCounts,
  })
  const { bookmarkedVerseKeys, toggleBookmark } = useSharedBookmarks()
  const [positionVerseKey, setPositionVerseKey] = useState<string | null>(null)

  useEffect(
    () =>
      subscribeReactReaderPreferencesChanged((preferences) => {
        applyReactReaderTypography(preferences)
        if (preferences.translationVisible !== undefined) {
          setCorpus((current) =>
            current.status === 'ready'
              ? { ...current, translationVisible: preferences.translationVisible ?? current.translationVisible }
              : current,
          )
        }
        if (preferences.wirdReaderStatusVisible !== undefined) {
          setWirdReaderStatusVisible(preferences.wirdReaderStatusVisible)
        }
      }),
    [],
  )

  useEffect(() => subscribeWirdPlanChanged(setWirdPlan), [])

  useEffect(() => {
    if (wirdProgressCounts.length !== 114 || wirdPlan?.unit !== 'page') {
      setWirdPageBoundaries([])
      return undefined
    }
    const controller = new AbortController()
    void loadReactWirdPageBoundaries(wirdProgressCounts, controller.signal)
      .then((boundaries) => {
        if (!controller.signal.aborted) setWirdPageBoundaries(boundaries)
      })
      .catch(() => {
        if (!controller.signal.aborted) setWirdPageBoundaries([])
      })
    return () => {
      controller.abort()
    }
  }, [wirdPlan?.unit, wirdProgressCounts])

  // biome-ignore lint/correctness/useExhaustiveDependencies: corpusRequestToken intentionally retriggers the corpus load.
  useEffect(() => {
    const controller = new AbortController()
    setCorpus({ status: 'loading' })
    setSurahIndex([])
    setWirdPlan(null)

    void readReaderSettings()
      .then((settings) => {
        document.documentElement.dataset.riwayah = settings.riwayah
        applyReactReaderTypography(settings)
        setWirdReaderStatusVisible(settings.wirdReaderStatusVisible)
        return loadReaderSurah(surah, { ...settings, signal: controller.signal })
      })
      .then((loaded) => {
        if (!controller.signal.aborted) setCorpus(loaded)
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setCorpus({ status: 'error', error: error instanceof Error ? error : new Error('Reader corpus unavailable') })
      })

    void readWirdPlan(nativeSettingsReader())
      .then((plan) => {
        if (!controller.signal.aborted) setWirdPlan(plan)
      })
      .catch(() => {
        if (!controller.signal.aborted) setWirdPlan(null)
      })

    void loadReaderSurahIndex(fetch, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setSurahIndex(rows)
      })
      .catch(() => {
        if (!controller.signal.aborted) setSurahIndex([])
      })

    return () => {
      controller.abort()
    }
  }, [surah, corpusRequestToken])

  // S3: live verse range in the compact header ("Al-Fātiḥah · 1–4") updates on
  // scroll from the verse groups actually in view. The header position
  // bookmark recomputes from the same measurement (brief §4.10).
  useEffect(() => {
    if (corpus.status !== 'ready') return undefined
    function measureRange() {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      let first: number | null = null
      let last: number | null = null
      for (const element of document.querySelectorAll<HTMLElement>('[data-token-key]')) {
        const rect = element.getBoundingClientRect()
        if (rect.bottom <= 0 || rect.top >= viewportHeight || rect.height <= 0) continue
        const verse = Number(element.dataset.tokenKey?.split(':')[1])
        if (!Number.isFinite(verse)) continue
        if (first === null || verse < first) first = verse
        if (last === null || verse > last) last = verse
      }
      setVerseRange(first !== null && last !== null ? (first === last ? `${first}` : `${first}–${last}`) : undefined)
      const position = getCurrentPosition()
      setPositionVerseKey(position ? `${position.surah}:${position.verse}` : null)
    }
    let frame = 0
    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measureRange()
      })
    }
    measureRange()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [corpus, getCurrentPosition])

  useEffect(() => {
    const routeKey = `${surah}:${ayah}`
    if (lastRouteKeyRef.current === routeKey) return
    lastRouteKeyRef.current = routeKey
    lastFocusedRouteKeyRef.current = null
  }, [ayah, surah])

  useEffect(() => {
    if (corpus.status !== 'ready' || !ayah) return
    const targetKey = `${surah}:${ayah}`
    if (lastFocusedRouteKeyRef.current === targetKey) return
    if (!corpus.verses.some((verse) => verse.key === targetKey)) return
    const landAtTarget = (syncCurrentPosition: boolean) => {
      const target = findReaderVerseElement(targetKey)
      if (!target) return false
      target.scrollIntoView?.({ block: 'center', behavior: 'auto' })
      if (syncCurrentPosition) syncPosition(targetKey)
      return true
    }
    if (!landAtTarget(true)) return
    lastFocusedRouteKeyRef.current = targetKey
    window.setTimeout(() => landAtTarget(false), 50)
  }, [ayah, corpus, surah, syncPosition])

  // Continuity (S2): the reading position anchors to the verse via the sync
  // above; restore lands the anchored verse in view.
  useReaderScrollLock(preservePosition)

  const copyToastVisible = copyToast !== null
  useEffect(() => {
    if (!copyToastVisible) return undefined
    const timer = window.setTimeout(() => setCopyToast(null), COPY_TOAST_CLEAR_MS)
    return () => window.clearTimeout(timer)
  }, [copyToastVisible])

  const surahName = surahIndex.find((row) => row.n === surah)?.name

  const toggleBookmarkForPosition = useCallback(() => {
    const position = getCurrentPosition()
    const verseKey = position ? `${position.surah}:${position.verse}` : `${surah}:1`
    void toggleBookmark({ surah: position?.surah ?? surah, verseKey })
  }, [getCurrentPosition, surah, toggleBookmark])

  const bookmarkKey = positionVerseKey ?? `${surah}:1`
  const verseBookmarked = bookmarkedVerseKeys.has(bookmarkKey)
  const positionBookmark = {
    saved: verseBookmarked,
    label: verseBookmarked ? `Remove bookmark for verse ${bookmarkKey}` : `Bookmark verse ${bookmarkKey}`,
    onToggle: toggleBookmarkForPosition,
  }

  const goMushaf = useCallback(() => {
    const currentPosition = getCurrentPosition()
    const hrefPromise =
      currentPosition?.surah === surah
        ? resolveMushafHrefForVerseRef(currentPosition)
        : resolveMushafHrefForVerseRoute({ explicitVerse: ayah !== undefined, surah, verse: ayah ?? 1 })
    void hrefPromise.then((href) => {
      window.location.hash = href
    })
  }, [ayah, getCurrentPosition, surah])

  const bottomStrip = (
    <div className="qar-reader-bottom-strip" data-bottom-strip="verse">
      <div className="qar-reader-bottom-strip-left">
        <ReadingViewToggle
          mode="verse"
          onModeChange={(nextMode) => {
            if (nextMode !== 'mushaf') return
            goMushaf()
          }}
          variant="icon"
        />
      </div>
      <div className="qar-reader-bottom-strip-center" />
      <div className="qar-reader-bottom-strip-right">
        <IconButton
          className="qar-reader-chrome-icon"
          id="reader-adjustments-trigger"
          label="Text and spacing"
          onClick={() => setAdjustmentsOpen(true)}
        >
          <CaseSensitive aria-hidden="true" size={22} strokeWidth={1.7} />
        </IconButton>
      </div>
    </div>
  )

  return (
    <ReaderPageShell
      bottomStrip={bottomStrip}
      currentSurah={surah}
      mode="verse"
      onModeChange={(nextMode) => {
        if (nextMode === 'mushaf') {
          goMushaf()
        }
      }}
      positionBookmark={positionBookmark}
      showWirdStatus={wirdReaderStatusVisible}
      surahName={surahName}
      verseRange={verseRange}
      wirdSummary={wirdSummary}
    >
      <div className="qar-reader-column">
        <EditionBannerGate />
        <ReaderVerseSurface
          adjacentSurahs={adjacentSurahs}
          bookmarkedVerseKeys={bookmarkedVerseKeys}
          corpus={corpus}
          onNavigateSurah={(nextSurah) => {
            window.location.hash = REACT_ROUTES.surah(nextSurah)
          }}
          onCopyReference={() => setCopyToast('Reference copied')}
          onRetry={() => setCorpusRequestToken((token) => token + 1)}
          onSelectVerse={(verseKey) => {
            selectVerse(verseKey)
            syncPosition(verseKey)
          }}
          onToggleBookmark={(verseKey) => {
            void toggleBookmark({ surah, verseKey })
          }}
          selectedVerseKey={selectedVerseKey}
        />
        {copyToastVisible ? (
          // Floating toast (S2): anchored above the bottom strip / safe area so
          // the confirmation is visible without scrolling — never inline at the
          // end of the passage.
          <div className="qar-react-copy-toast">
            <Status data-copy-toast="true" role="status" title={copyToast ?? ''} tone="success" />
          </div>
        ) : null}
      </div>
      <AdjustmentsSheet onClose={() => setAdjustmentsOpen(false)} open={adjustmentsOpen} />
    </ReaderPageShell>
  )
}

function findReaderVerseElement(verseKey: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>('[data-token-key]')) {
    if (element.dataset.tokenKey === verseKey) return element
  }
  return null
}

type ReaderScrollAnchor = { key: string; top: number }

function useReaderScrollLock(enabled: boolean): void {
  const anchorRef = useRef<ReaderScrollAnchor | null>(null)

  useLayoutEffectSafe(enabled, anchorRef)

  useEffect(() => {
    if (!enabled) return undefined
    const restore = () => restoreReaderScrollAnchor(anchorRef.current)
    const frame = window.requestAnimationFrame(restore)
    const timeout = window.setTimeout(restore, 80)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [enabled])
}

function useLayoutEffectSafe(enabled: boolean, anchorRef: React.MutableRefObject<ReaderScrollAnchor | null>): void {
  useEffect(() => {
    if (!enabled) {
      anchorRef.current = null
      return
    }
    anchorRef.current ??= findCurrentReaderScrollAnchor()
    restoreReaderScrollAnchor(anchorRef.current)
  }, [anchorRef, enabled])
}

function findCurrentReaderScrollAnchor(): ReaderScrollAnchor | null {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const centerY = viewportHeight / 2
  let closest: { distance: number; element: HTMLElement } | null = null

  for (const element of document.querySelectorAll<HTMLElement>('[data-token-key]')) {
    const verseKey = element.dataset.tokenKey
    if (!verseKey) continue
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue
    const distance =
      rect.top <= centerY && rect.bottom >= centerY
        ? 0
        : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY))
    if (!closest || distance < closest.distance) closest = { distance, element }
    if (distance === 0) break
  }

  if (!closest) return null
  return {
    key: closest.element.dataset.tokenKey ?? '',
    top: closest.element.getBoundingClientRect().top,
  }
}

function restoreReaderScrollAnchor(anchor: ReaderScrollAnchor | null): void {
  if (!anchor?.key) return
  const element = findReaderVerseElement(anchor.key)
  if (!element) return
  const delta = element.getBoundingClientRect().top - anchor.top
  if (Math.abs(delta) < 1) return
  window.scrollBy({ behavior: 'auto', top: delta })
}

function wirdCountsFromIndex(index: ReaderSurahIndexEntry[], corpus: ReaderCorpusState): SurahCount[] {
  if (index.length > 0) return index.map((row) => ({ count: row.counts.qaloon, n: row.n }))
  if (corpus.status === 'ready') return [{ count: corpus.surah.verseCount, n: corpus.surah.number }]
  return [
    { count: 7, n: 1 },
    { count: 286, n: 2 },
    { count: 6, n: 114 },
  ]
}
