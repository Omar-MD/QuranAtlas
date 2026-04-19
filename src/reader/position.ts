/**
 * Reader position tracking — observes scroll, persists last-read verse to
 * the `positions` IDB store, and scrolls to the saved/target verse on load.
 *
 * `savePosition` is the SOLE writer for the `positions` store (per CLAUDE.md
 * Rule 5). Do not add other IDB writes to that store here or elsewhere.
 */

import { get, put } from '../core/db'
import { emit, on } from '../core/events'
import { Events } from '../core/constants'
import { logger } from '../core/logger'
import type { SurahMeta } from '../data/dataset'
import { observeScroll, flushDebounce } from './scroll-tracker'
import { scrollToVerse } from './verse-scroll'
import { reader } from '../state/reader.svelte'

/**
 * Save reading position to IDB. Sole writer for the `positions` store.
 */
export async function savePosition(surahNum: number, verse: number): Promise<void> {
  try {
    await put('positions', {
      id: `s${surahNum}`,
      surah: surahNum,
      verse,
      savedAt: Date.now(),
    })
    reader.currentSurahNum = surahNum
    reader.currentVerseKey = `${surahNum}:${verse}`
  } catch (error) {
    logger.error('Failed to save position on visibility change:', {
      surah: surahNum,
      verse,
      error,
    })
    emit(Events.READER_POSITION_SAVE_FAILED, {
      error: error instanceof Error ? error.message : String(error),
      surah: surahNum,
      verse,
    })
  }
}

export type PositionTrackingOptions = {
  mainContent: HTMLElement
  surahNum: number
  shouldSavePosition?: boolean
  surahMeta?: SurahMeta
  savedPosition?: { verse: number } | null
  targetVerse?: number | null
  totalVerseCount: number
  /** Optional callback to ensure a verse is rendered (used by scrollToVerse). */
  ensureVerseRendered?: (verse: number) => void
  /** Callback called with the invalid verse error message (if any). */
  onInvalidVerseError?: (message: string) => void
}

// Tracks the current in-flight cleanups so `teardownPositionTracking()` can
// dispose of them when the reader re-inits for a different surah or unmounts.
let currentCleanups: Array<() => void> | null = null
let lastTrackedVerse: number | null = null
let currentSurahNum: number | null = null

/**
 * Run and clear all cleanups registered by the most recent
 * `initPositionTracking()` call. Safe to call multiple times.
 */
export function teardownPositionTracking(): void {
  if (!currentCleanups) { return }
  const toRun = currentCleanups
  currentCleanups = null
  lastTrackedVerse = null
  currentSurahNum = null
  toRun.forEach(fn => {
    try { fn() } catch { /* best-effort cleanup */ }
  })
}

/**
 * Set up scroll/position tracking and scroll to initial position.
 * Returns an array of cleanup functions.
 */
export function initPositionTracking(opts: PositionTrackingOptions): Array<() => void> {
  const {
    mainContent,
    surahNum,
    shouldSavePosition = true,
    surahMeta,
    savedPosition,
    targetVerse,
    totalVerseCount,
    ensureVerseRendered,
    onInvalidVerseError,
  } = opts

  // Dispose any prior cleanups before registering new ones.
  teardownPositionTracking()

  currentSurahNum = surahNum
  const cleanups: Array<() => void> = []

  if (shouldSavePosition) {
    observeScroll(mainContent, {
      onPositionChange: ({ verse }) => {
        lastTrackedVerse = verse
        void savePosition(surahNum, verse)
      },
    })

    const visibilityHandler = () => {
      if (document.hidden && currentSurahNum !== null && lastTrackedVerse !== null) {
        flushDebounce()
        void savePosition(currentSurahNum, lastTrackedVerse)
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', visibilityHandler)
    })
  }

  const unsubVisibility = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    if (currentSurahNum !== null && mainContent) {
      const position = await get('positions', `s${currentSurahNum}`)
      if (position && typeof position.verse === 'number') {
        scrollToVerse(mainContent, position.verse, ensureVerseRendered)
      }
    }
  })
  cleanups.push(() => { unsubVisibility() })

  // Validate target verse
  let invalidVerseError: string | null = null
  if (targetVerse !== null && targetVerse !== undefined) {
    if (targetVerse < 1 || targetVerse > totalVerseCount) {
      const name = surahMeta?.name ?? 'this Surah'
      invalidVerseError = `Verse ${targetVerse} does not exist in ${name} (${totalVerseCount} verses)`
    }
  }

  // Scroll to saved position or deep link verse
  if (savedPosition && !targetVerse && savedPosition.verse > 1) {
    scrollToVerse(mainContent, savedPosition.verse, ensureVerseRendered)
  } else if (targetVerse) {
    const validTargetVerse = invalidVerseError ? 1 : targetVerse
    scrollToVerse(mainContent, validTargetVerse, ensureVerseRendered)
  }

  if (invalidVerseError && onInvalidVerseError) {
    onInvalidVerseError(invalidVerseError)
  }

  currentCleanups = cleanups
  return cleanups
}
