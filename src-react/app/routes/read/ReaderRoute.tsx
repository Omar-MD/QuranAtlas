import { useEffect, useState } from 'react'

import { loadReaderSurah, type ReaderCorpusState } from '../../../data/reader-corpus'
import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../../data/surah-index'
import { loadKnowledgeForSurah } from '../../../metadata/knowledge'
import type { VerseMetadata } from '../../../metadata/metadata-state'
import { openReactDb } from '../../../storage/db'
import type { Riwayah } from '../../../storage/types'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import { ReaderVerseSurface } from '../../../components/reader/ReaderVerseSurface'
import { consumeReactReaderAnchor } from '../../../components/reader/SurahContinuityButton'
import { useReaderPositionSync } from '../../../components/reader/useReaderPositionSync'
import { useVerseInteractionReducer } from '../../../components/reader/useVerseInteractionReducer'
import { REACT_ROUTES } from '../../router/routes'

type ReaderSettings = {
  quranTextStyleId: string
  readerMargin: ReaderSpacingStep
  riwayah: Riwayah
  translationId: string
  translationVisible: boolean
  verseSpacing: ReaderSpacingStep
}

type ReaderSpacingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  quranTextStyleId: 'uthmani-kfgqpc-v1',
  readerMargin: 'md',
  riwayah: 'qaloon',
  translationId: 'bridges',
  translationVisible: true,
  verseSpacing: 'md',
}

function asRiwayah(value: unknown): Riwayah | null {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon' ? value : null
}

function asReaderSpacingStep(value: unknown): ReaderSpacingStep | null {
  return value === 'xs' || value === 'sm' || value === 'md' || value === 'lg' || value === 'xl' ? value : null
}

async function readReaderSettings(): Promise<ReaderSettings> {
  try {
    const db = await openReactDb()
    const records = await db.settings.bulkGet(['riwayah', 'quranTextStyleId', 'translationId', 'translationVisible', 'readerMargin', 'verseSpacing'])
    return {
      riwayah: asRiwayah(records[0]?.value) ?? DEFAULT_READER_SETTINGS.riwayah,
      quranTextStyleId: typeof records[1]?.value === 'string' ? records[1].value : DEFAULT_READER_SETTINGS.quranTextStyleId,
      translationId: typeof records[2]?.value === 'string' ? records[2].value : DEFAULT_READER_SETTINGS.translationId,
      translationVisible: typeof records[3]?.value === 'boolean' ? records[3].value : DEFAULT_READER_SETTINGS.translationVisible,
      readerMargin: asReaderSpacingStep(records[4]?.value) ?? DEFAULT_READER_SETTINGS.readerMargin,
      verseSpacing: asReaderSpacingStep(records[5]?.value) ?? DEFAULT_READER_SETTINGS.verseSpacing,
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
  const { selectedVerseKey, selectVerse } = useVerseInteractionReducer()
  const syncPosition = useReaderPositionSync(corpus)

  useEffect(() => {
    const controller = new AbortController()
    setCorpus({ status: 'loading' })
    setMetadata(new Map())
    setSurahIndex([])

    void readReaderSettings()
      .then((settings) => {
        document.documentElement.dataset.riwayah = settings.riwayah
        document.documentElement.dataset.readerMargin = settings.readerMargin
        document.documentElement.dataset.verseSpacing = settings.verseSpacing
        return loadReaderSurah(surah, { ...settings, signal: controller.signal })
      })
      .then((loaded) => {
        if (!controller.signal.aborted) setCorpus(focusReaderAtAyah(loaded, ayah))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCorpus({ status: 'error', error: error instanceof Error ? error : new Error('Reader corpus unavailable') })
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
      label={`Surah ${surah}`}
      mode="verse"
      onModeChange={(nextMode) => {
        if (nextMode === 'mushaf') window.location.hash = REACT_ROUTES.mushaf(1)
      }}
    >
      <ReaderVerseSurface
        corpus={corpus}
        metadata={metadata}
        onSelectVerse={(verseKey) => {
          selectVerse(verseKey)
          syncPosition(verseKey)
        }}
        selectedVerseKey={selectedVerseKey}
        surahIndex={surahIndex}
      />
    </ReaderPageShell>
  )
}
