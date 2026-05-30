import { useCallback, useEffect, useRef } from 'react'

import { writeCurrentPosition } from '../../continuity/current-position'
import { trackRecentSurahPosition } from '../../continuity/recent-surahs'
import { advanceWirdFromReaderPosition } from '../../continuity/wird/store'
import type { SurahCount } from '../../continuity/wird/types'
import type { ReaderCorpusState } from '../../data/reader-corpus'
import { openReactDb } from '../../storage/db'

type ReaderPosition = { surah: number; verse: number }

const SCROLL_PERSIST_DELAY_MS = 500

async function persistPosition(surah: number, verse: number, wirdCounts: ReadonlyArray<SurahCount>): Promise<void> {
  const db = await openReactDb()
  await writeCurrentPosition(db, { surah, verse })
  await trackRecentSurahPosition(db, { surah, verse })
  if (wirdCounts.length > 0) {
    await advanceWirdFromReaderPosition(db, { surah, verse }, wirdCounts)
  }
}

function parseVerseKey(verseKey: string): ReaderPosition | null {
  const [surahPart, versePart] = verseKey.split(':')
  const surah = Number.parseInt(surahPart ?? '', 10)
  const verse = Number.parseInt(versePart ?? '', 10)
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || surah < 1 || verse < 1) return null
  return { surah, verse }
}

function positionKey(position: ReaderPosition): string {
  return `${position.surah}:${position.verse}`
}

function findCenteredVersePosition(surah: number): ReaderPosition | null {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  if (!viewportHeight) return null
  const centerY = viewportHeight / 2
  let closest: { distance: number; position: ReaderPosition } | null = null

  for (const element of document.querySelectorAll<HTMLElement>('.qar-reader-verse[data-token-key]')) {
    const position = parseVerseKey(element.dataset.tokenKey ?? '')
    if (!position || position.surah !== surah) continue
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue

    const distance = rect.top <= centerY && rect.bottom >= centerY
      ? 0
      : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY))
    if (!closest || distance < closest.distance) closest = { distance, position }
    if (distance === 0) break
  }

  return closest?.position ?? null
}

export function useReaderPositionSync(corpus: ReaderCorpusState, options: { wirdCounts?: ReadonlyArray<SurahCount> } = {}) {
  const latestPositionRef = useRef<ReaderPosition | null>(null)
  const lastPersistedKeyRef = useRef<string | null>(null)
  const lastWirdAdvancedKeyRef = useRef<string | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wirdCountsRef = useRef<ReadonlyArray<SurahCount>>(options.wirdCounts ?? [])
  const readyCorpus = corpus.status === 'ready' ? corpus : null
  const firstVerseSurah = readyCorpus?.verses[0]?.surah ?? null
  const firstVerseNumber = readyCorpus?.verses[0]?.verse ?? null
  const surahNumber = readyCorpus?.surah.number ?? null

  useEffect(() => {
    wirdCountsRef.current = options.wirdCounts ?? []
    const position = latestPositionRef.current
    if (!position || wirdCountsRef.current.length === 0) return
    const key = positionKey(position)
    if (lastWirdAdvancedKeyRef.current === key) return
    lastWirdAdvancedKeyRef.current = key
    void openReactDb().then((db) => advanceWirdFromReaderPosition(db, position, wirdCountsRef.current))
  }, [options.wirdCounts])

  const commitPosition = useCallback((position: ReaderPosition, persistMode: 'deferred' | 'immediate') => {
    latestPositionRef.current = position
    const key = positionKey(position)

    const runPersist = () => {
      if (lastPersistedKeyRef.current === key) return
      lastPersistedKeyRef.current = key
      void persistPosition(position.surah, position.verse, wirdCountsRef.current)
      if (wirdCountsRef.current.length > 0) lastWirdAdvancedKeyRef.current = key
    }

    if (persistMode === 'immediate') {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
      runPersist()
      return
    }

    if (lastPersistedKeyRef.current === key) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      runPersist()
    }, SCROLL_PERSIST_DELAY_MS)
  }, [])

  useEffect(() => {
    if (!surahNumber || !firstVerseSurah || !firstVerseNumber) return
    const activeSurahNumber = surahNumber
    commitPosition({ surah: firstVerseSurah, verse: firstVerseNumber }, 'immediate')

    function syncVisibleVerse() {
      const visiblePosition = findCenteredVersePosition(activeSurahNumber)
      if (visiblePosition) commitPosition(visiblePosition, 'deferred')
    }

    window.addEventListener('scroll', syncVisibleVerse, { passive: true })
    document.addEventListener('scroll', syncVisibleVerse, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', syncVisibleVerse)
      document.removeEventListener('scroll', syncVisibleVerse, { capture: true })
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
        const position = latestPositionRef.current
        if (position) void persistPosition(position.surah, position.verse, wirdCountsRef.current)
      }
    }
  }, [commitPosition, firstVerseNumber, firstVerseSurah, surahNumber])

  const syncPosition = useCallback((verseKey: string) => {
    const position = parseVerseKey(verseKey)
    if (!position) return
    commitPosition(position, 'immediate')
  }, [commitPosition])

  const getCurrentPosition = useCallback(() => {
    if (corpus.status === 'ready') {
      const visiblePosition = findCenteredVersePosition(corpus.surah.number)
      if (visiblePosition) {
        commitPosition(visiblePosition, 'deferred')
        return visiblePosition
      }
    }
    return latestPositionRef.current
  }, [commitPosition, corpus])

  return { getCurrentPosition, syncPosition }
}
