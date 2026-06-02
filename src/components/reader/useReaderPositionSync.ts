import { useCallback, useEffect, useRef } from 'react'

import { normalizeRecentSurahs } from '../../continuity/recent-surahs'
import { advanceWirdProgress, getLocalDayKey } from '../../continuity/wird/progress'
import { normalizeWirdPlan, notifyWirdPlanChanged } from '../../continuity/wird/store'
import type { SurahCount, WirdPlan } from '../../continuity/wird/types'
import type { ReaderCorpusState } from '../../data/reader-corpus'
import { readNativeSetting, writeNativeSettings } from '../../storage/native-reader-store'
import type { SettingRecord } from '../../storage/types'

type ReaderPosition = { surah: number; verse: number }

const SCROLL_PERSIST_DELAY_MS = 500
const READER_POSITION_PERSIST_TOKEN_KEY = '__quranAtlasReaderPositionPersistToken'

type ReaderPositionPersistWindow = Window & {
  [READER_POSITION_PERSIST_TOKEN_KEY]?: string
}

async function persistPosition(
  surah: number,
  verse: number,
  wirdCounts: ReadonlyArray<SurahCount>,
  isLatestPosition: () => boolean,
): Promise<boolean> {
  const recentRecord = await readNativeSetting('recentSurahs')
  const previous = normalizeRecentSurahs(recentRecord?.value)
  const recentSurahs = [
    { surah, updatedAt: Date.now(), verse },
    ...previous.filter((row) => row.surah !== surah),
  ].slice(0, 7)
  const records: SettingRecord[] = [
    { key: 'currentPosition', value: { surah, verse } },
    { key: 'recentSurahs', value: recentSurahs },
  ]
  let nextWirdPlan: WirdPlan | null = null
  if (wirdCounts.length > 0) {
    const plan = normalizeWirdPlan((await readNativeSetting('wirdPlan'))?.value)
    if (plan) {
      nextWirdPlan = advanceWirdProgress(plan, { surah, verse }, wirdCounts, getLocalDayKey())
      records.push({
        key: 'wirdPlan',
        value: JSON.parse(JSON.stringify(nextWirdPlan)),
      })
    }
  }
  if (!isLatestPosition()) return false
  const committed = await writeNativeSettings(records, isLatestPosition)
  if (!committed) return false
  if (nextWirdPlan) notifyWirdPlanChanged(nextWirdPlan)
  return true
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

function createPersistToken(key: string): string {
  return `${key}:${Date.now()}:${Math.random()}`
}

function markLatestPersistToken(token: string): void {
  if (typeof window === 'undefined') return
  const persistWindow = window as ReaderPositionPersistWindow
  persistWindow[READER_POSITION_PERSIST_TOKEN_KEY] = token
}

function isLatestPersistToken(token: string): boolean {
  if (typeof window === 'undefined') return true
  return (window as ReaderPositionPersistWindow)[READER_POSITION_PERSIST_TOKEN_KEY] === token
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
  const latestPersistTokenRef = useRef<string | null>(null)
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve())
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wirdCountsRef = useRef<ReadonlyArray<SurahCount>>(options.wirdCounts ?? [])
  const readyCorpus = corpus.status === 'ready' ? corpus : null
  const firstVerseSurah = readyCorpus?.verses[0]?.surah ?? null
  const firstVerseNumber = readyCorpus?.verses[0]?.verse ?? null
  const surahNumber = readyCorpus?.surah.number ?? null

  const enqueuePersistPosition = useCallback((
    position: ReaderPosition,
    wirdCounts: ReadonlyArray<SurahCount>,
    persistToken: string,
  ) => {
    const key = positionKey(position)
    persistQueueRef.current = persistQueueRef.current.catch(() => undefined).then(async () => {
      const committed = await persistPosition(position.surah, position.verse, wirdCounts, () => {
        const latest = latestPositionRef.current
        return isLatestPersistToken(persistToken) && (latest ? positionKey(latest) === key : true)
      })
      if (!committed) return
      lastPersistedKeyRef.current = key
      if (wirdCounts.length > 0) lastWirdAdvancedKeyRef.current = key
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    wirdCountsRef.current = options.wirdCounts ?? []
    const position = latestPositionRef.current
    if (!position || wirdCountsRef.current.length === 0) return
    const key = positionKey(position)
    if (lastWirdAdvancedKeyRef.current === key) return
    let persistToken = latestPersistTokenRef.current
    if (!persistToken) {
      persistToken = createPersistToken(key)
      latestPersistTokenRef.current = persistToken
      markLatestPersistToken(persistToken)
    }
    enqueuePersistPosition(position, [...wirdCountsRef.current], persistToken)
  }, [enqueuePersistPosition, options.wirdCounts])

  const commitPosition = useCallback((position: ReaderPosition, persistMode: 'deferred' | 'immediate') => {
    latestPositionRef.current = position
    const key = positionKey(position)
    const persistToken = createPersistToken(key)
    latestPersistTokenRef.current = persistToken
    markLatestPersistToken(persistToken)

    const runPersist = () => {
      if (lastPersistedKeyRef.current === key) return
      enqueuePersistPosition(position, [...wirdCountsRef.current], persistToken)
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
  }, [enqueuePersistPosition])

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
        if (position) {
          const persistToken = latestPersistTokenRef.current
          if (persistToken) enqueuePersistPosition(position, [...wirdCountsRef.current], persistToken)
        }
      }
    }
  }, [commitPosition, enqueuePersistPosition, firstVerseNumber, firstVerseSurah, surahNumber])

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
