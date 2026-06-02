import { useEffect, useMemo, useRef, useState } from 'react'

import { loadReaderSurah, type ReaderCorpusState } from '../../../data/reader-corpus'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { loadKnowledgeForSurah } from '../../../metadata/knowledge'
import type { VerseMetadata } from '../../../metadata/metadata-state'
import type { Riwayah } from '../../../storage/types'
import { nativeSettingsReader, readNativeSettings } from '../../../storage/native-reader-store'
import { DEFAULT_REACT_READER_PREFERENCES, readNativeReactReaderPreferences } from '../../../storage/settings-writer'
import { applyReactReaderTypography, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { ReaderVerseSurface } from '../../../components/reader/ReaderVerseSurface'
import { consumeReactReaderAnchor } from '../../../components/reader/SurahContinuityButton'
import { resolveMushafHrefForVerseRef, resolveMushafHrefForVerseRoute } from '../../../components/reader/reader-mode-routing'
import { useReaderPositionSync } from '../../../components/reader/useReaderPositionSync'
import { useVerseInteractionReducer } from '../../../components/reader/useVerseInteractionReducer'
import { readWirdPlan, subscribeWirdPlanChanged } from '../../../continuity/wird/store'
import { createWirdBoundaries } from '../../../continuity/wird/metadata'
import { loadReactWirdPageBoundaries } from '../../../continuity/wird/page-boundaries'
import { deriveWirdSummary } from '../../../continuity/wird/progress'
import type { SurahCount, WirdBoundary, WirdPlan } from '../../../continuity/wird/types'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'
import { isMushafPageBookmark } from '../../../continuity/bookmarks/page-bookmark'

type ReaderSettings = {
  fontSize: ReaderSpacingStep
  lineSpacing: ReaderSpacingStep
  quranTextStyleId: string
  readerMargin: ReaderSpacingStep
  riwayah: Riwayah
  translationId: string
  translationVisible: boolean
  verseSpacing: ReaderSpacingStep
  wordSpacing: ReaderSpacingStep
  wirdReaderStatusVisible: boolean
}

type ReaderSpacingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: DEFAULT_REACT_READER_PREFERENCES.fontSize,
  lineSpacing: DEFAULT_REACT_READER_PREFERENCES.lineSpacing,
  quranTextStyleId: 'uthmani-kfgqpc-v1',
  readerMargin: DEFAULT_REACT_READER_PREFERENCES.readerMargin,
  riwayah: 'qaloon',
  translationId: 'bridges',
  translationVisible: DEFAULT_REACT_READER_PREFERENCES.translationVisible,
  verseSpacing: DEFAULT_REACT_READER_PREFERENCES.verseSpacing,
  wordSpacing: DEFAULT_REACT_READER_PREFERENCES.wordSpacing,
  wirdReaderStatusVisible: DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible,
}

function asRiwayah(value: unknown): Riwayah | null {
  return value === 'qaloon' ? value : null
}

async function readReaderSettings(): Promise<ReaderSettings> {
  try {
    const [riwayah, quranTextStyleId, translationId] = await readNativeSettings(['riwayah', 'quranTextStyleId', 'translationId'])
    const preferences = await readNativeReactReaderPreferences()
    return {
      fontSize: preferences.fontSize,
      lineSpacing: preferences.lineSpacing,
      quranTextStyleId: typeof quranTextStyleId?.value === 'string' ? quranTextStyleId.value : DEFAULT_READER_SETTINGS.quranTextStyleId,
      readerMargin: preferences.readerMargin,
      riwayah: asRiwayah(riwayah?.value) ?? DEFAULT_READER_SETTINGS.riwayah,
      translationId: typeof translationId?.value === 'string' ? translationId.value : DEFAULT_READER_SETTINGS.translationId,
      translationVisible: preferences.translationVisible,
      verseSpacing: preferences.verseSpacing,
      wordSpacing: preferences.wordSpacing,
      wirdReaderStatusVisible: preferences.wirdReaderStatusVisible,
    }
  } catch {
    return DEFAULT_READER_SETTINGS
  }
}

export function ReaderRoute({ ayah, surah }: { ayah?: number; surah: number }) {
  const [corpus, setCorpus] = useState<ReaderCorpusState>({ status: 'loading' })
  const [metadata, setMetadata] = useState<Map<string, VerseMetadata>>(new Map())
  const [surahIndex, setSurahIndex] = useState<ReaderSurahIndexEntry[]>([])
  const [wirdPageBoundaries, setWirdPageBoundaries] = useState<WirdBoundary[]>([])
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const [wirdReaderStatusVisible, setWirdReaderStatusVisible] = useState(DEFAULT_READER_SETTINGS.wirdReaderStatusVisible)
  const lastFocusedRouteKeyRef = useRef<string | null>(null)
  const wirdCounts = useMemo(() => wirdCountsFromIndex(surahIndex, corpus), [corpus, surahIndex])
  const wirdProgressCounts = useMemo(() => surahIndex.length === 114 ? wirdCounts : [], [surahIndex.length, wirdCounts])
  const wirdBoundaries = useMemo(() => createWirdBoundaries(wirdCounts, wirdPageBoundaries), [wirdCounts, wirdPageBoundaries])
  const wirdSummary = useMemo(() => deriveWirdSummary(wirdPlan, wirdCounts, wirdBoundaries), [wirdBoundaries, wirdCounts, wirdPlan])
  const { selectedVerseKey, selectVerse } = useVerseInteractionReducer()
  const { getCurrentPosition, syncPosition } = useReaderPositionSync(corpus, { wirdCounts: wirdProgressCounts })
  const { bookmarkedVerseKeys, bookmarks, status: bookmarkStatus, toggleBookmark } = useBookmarks()
  const showVerseBookmarkHint = bookmarkStatus === 'ready' && !bookmarks.some((bookmark) => !isMushafPageBookmark(bookmark))

  useEffect(() => subscribeReactReaderPreferencesChanged((preferences) => {
    applyReactReaderTypography(preferences)
    if (preferences.translationVisible !== undefined) {
      setCorpus((current) => current.status === 'ready'
        ? { ...current, translationVisible: preferences.translationVisible ?? current.translationVisible }
        : current)
    }
    if (preferences.wirdReaderStatusVisible !== undefined) {
      setWirdReaderStatusVisible(preferences.wirdReaderStatusVisible)
    }
  }), [])

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

  useEffect(() => {
    const controller = new AbortController()
    setCorpus({ status: 'loading' })
    setMetadata(new Map())
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
        if (!controller.signal.aborted) setCorpus({ status: 'error', error: error instanceof Error ? error : new Error('Reader corpus unavailable') })
      })

    void readWirdPlan(nativeSettingsReader())
      .then((plan) => {
        if (!controller.signal.aborted) setWirdPlan(plan)
      })
      .catch(() => {
        if (!controller.signal.aborted) setWirdPlan(null)
      })

    void loadKnowledgeForSurah(surah, fetch, controller.signal).then((result) => {
      if (!controller.signal.aborted) setMetadata(result.rows)
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
  }, [surah])

  useEffect(() => {
    if (corpus.status !== 'ready') return
    const anchor = consumeReactReaderAnchor()
    if (anchor !== 'bottom') return
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' })
    })
  }, [corpus])

  useEffect(() => {
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

  return (
    <ReaderPageShell
      label={corpus.status === 'ready' ? corpus.surah.nameArabic : `Surah ${surah}`}
      mode="verse"
      onModeChange={(nextMode) => {
        if (nextMode === 'mushaf') {
          const currentPosition = getCurrentPosition()
          const hrefPromise = currentPosition?.surah === surah
            ? resolveMushafHrefForVerseRef(currentPosition)
            : resolveMushafHrefForVerseRoute({ explicitVerse: ayah !== undefined, surah, verse: ayah ?? 1 })
          void hrefPromise
            .then((href) => {
              window.location.hash = href
            })
        }
      }}
      showWirdStatus={wirdReaderStatusVisible}
      wirdSummary={wirdSummary}
    >
      <ReaderVerseSurface
        bookmarkedVerseKeys={bookmarkedVerseKeys}
        corpus={corpus}
        metadata={metadata}
        onSelectVerse={(verseKey) => {
          selectVerse(verseKey)
          syncPosition(verseKey)
        }}
        onToggleBookmark={(verseKey) => {
          const bookmarkSurah = surahFromVerseKey(verseKey) ?? surah
          void toggleBookmark({ surah: bookmarkSurah, verseKey })
        }}
        selectedVerseKey={selectedVerseKey}
        showVerseBookmarkHint={showVerseBookmarkHint}
        surahIndex={surahIndex}
      />
    </ReaderPageShell>
  )
}

function findReaderVerseElement(verseKey: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>('.qar-reader-verse[data-token-key]')) {
    if (element.dataset.tokenKey === verseKey) return element
  }
  return null
}

function surahFromVerseKey(verseKey: string): number | null {
  const [surahPart] = verseKey.split(':')
  const parsed = Number.parseInt(surahPart ?? '', 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 114 ? parsed : null
}

function wirdCountsFromIndex(index: ReaderSurahIndexEntry[], corpus: ReaderCorpusState): SurahCount[] {
  if (index.length > 0) return index.map((row) => ({ count: row.counts.qaloon, n: row.n }))
  if (corpus.status === 'ready') return [{ count: corpus.surah.verseCount, n: corpus.surah.number }]
  return [{ count: 7, n: 1 }, { count: 286, n: 2 }, { count: 6, n: 114 }]
}
