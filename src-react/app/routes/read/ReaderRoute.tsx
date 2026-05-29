import { useEffect, useState } from 'react'

import { loadReaderSurah, type ReaderCorpusState } from '../../../data/reader-corpus'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { loadKnowledgeForSurah } from '../../../metadata/knowledge'
import type { VerseMetadata } from '../../../metadata/metadata-state'
import { openReactDb } from '../../../storage/db'
import type { Riwayah } from '../../../storage/types'
import { DEFAULT_REACT_READER_PREFERENCES, readReactReaderPreferences } from '../../../storage/settings-writer'
import { applyReactReaderTypography, subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { ReaderVerseSurface } from '../../../components/reader/ReaderVerseSurface'
import { DailyWirdCard } from '../../../components/reader/wird/DailyWirdCard'
import { consumeReactReaderAnchor } from '../../../components/reader/SurahContinuityButton'
import { resolveMushafHrefForVerseRef, resolveMushafHrefForVerseRoute } from '../../../components/reader/reader-mode-routing'
import { useReaderPositionSync } from '../../../components/reader/useReaderPositionSync'
import { useVerseInteractionReducer } from '../../../components/reader/useVerseInteractionReducer'
import { readWirdPlan } from '../../../continuity/wird/store'
import type { SurahCount, WirdPlan } from '../../../continuity/wird/types'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'

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
}

function asRiwayah(value: unknown): Riwayah | null {
  return value === 'qaloon' ? value : null
}

async function readReaderSettings(): Promise<ReaderSettings> {
  try {
    const db = await openReactDb()
    const [riwayah, quranTextStyleId, translationId] = await db.settings.bulkGet(['riwayah', 'quranTextStyleId', 'translationId'])
    const preferences = await readReactReaderPreferences(db)
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
    }
  } catch {
    return DEFAULT_READER_SETTINGS
  }
}

function focusReaderAtAyah(state: ReaderCorpusState, ayah?: number): ReaderCorpusState {
  if (state.status !== 'ready' || !ayah) return state
  return {
    ...state,
    verses: state.verses.filter((verse) => verse.verse >= ayah),
  }
}

export function ReaderRoute({ ayah, surah }: { ayah?: number; surah: number }) {
  const [corpus, setCorpus] = useState<ReaderCorpusState>({ status: 'loading' })
  const [metadata, setMetadata] = useState<Map<string, VerseMetadata>>(new Map())
  const [surahIndex, setSurahIndex] = useState<ReaderSurahIndexEntry[]>([])
  const [wirdPlan, setWirdPlan] = useState<WirdPlan | null>(null)
  const { selectedVerseKey, selectVerse } = useVerseInteractionReducer()
  const { getCurrentPosition, syncPosition } = useReaderPositionSync(corpus)
  const { bookmarkedVerseKeys, toggleBookmark } = useBookmarks()

  useEffect(() => subscribeReactReaderPreferencesChanged((preferences) => {
    applyReactReaderTypography(preferences)
    if (preferences.translationVisible !== undefined) {
      setCorpus((current) => current.status === 'ready'
        ? { ...current, translationVisible: preferences.translationVisible ?? current.translationVisible }
        : current)
    }
  }), [])

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
        return loadReaderSurah(surah, { ...settings, signal: controller.signal })
      })
      .then((loaded) => {
        if (!controller.signal.aborted) setCorpus(focusReaderAtAyah(loaded, ayah))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCorpus({ status: 'error', error: error instanceof Error ? error : new Error('Reader corpus unavailable') })
      })

    void openReactDb()
      .then(readWirdPlan)
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
  }, [ayah, surah])

  useEffect(() => {
    if (corpus.status !== 'ready') return
    const anchor = consumeReactReaderAnchor()
    if (anchor !== 'bottom') return
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' })
    })
  }, [corpus])

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
    >
      <div className="qar:mx-auto qar:w-full qar:max-w-3xl qar:px-4 qar:pt-16">
        <DailyWirdCard counts={wirdCountsFromIndex(surahIndex, corpus)} plan={wirdPlan} />
      </div>
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
        surahIndex={surahIndex}
      />
    </ReaderPageShell>
  )
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
