/**
 * Reader position tracking — observes scroll, persists last-read verse to
 * the `positions` IDB store, and scrolls to the saved/target verse on load.
 *
 * `savePosition` is the SOLE writer for the `positions` store (per CLAUDE.md
 * Rule 5). Do not add other IDB writes to that store here or elsewhere.
 *
 * Extracted from reader/index.js.
 */

import { get, put } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import * as readerState from '../state/reader.js'
import { observeScroll, flushDebounce } from './scroll-tracker.js'
import { setupChunkedAppend } from './chunked-append.js'
import { scrollToVerse } from './verse-scroll.js'
import { renderInvalidVerseError } from './render.js'

/**
 * Save reading position to IDB. Sole writer for the `positions` store.
 */
export async function savePosition(surahNum, verse) {
  try {
    await put('positions', {
      id: `s${surahNum}`,
      surah: surahNum,
      verse,
      savedAt: Date.now(),
    })
    emit(Events.READER_POSITION_CHANGED, /** @type {import('../core/constants.js').ReaderPositionChangedPayload} */({ surah: surahNum, verse }))
  } catch (error) {
    // Position save failed, emit event for UI warning
    logger.error('Failed to save position on visibility change:', {
      surah: surahNum,
      verse,
      error,
    })
    emit(Events.READER_POSITION_SAVE_FAILED, { error: error.message, surah: surahNum, verse })
  }
}

// Tracks the current in-flight cleanups so `teardownPositionTracking()` can
// dispose of them when the reader re-inits for a different surah or unmounts.
let currentCleanups = null

/**
 * Run and clear all cleanups registered by the most recent
 * `initPositionTracking()` call. Safe to call multiple times.
 */
export function teardownPositionTracking() {
  if (!currentCleanups) { return }
  const toRun = currentCleanups
  currentCleanups = null
  toRun.forEach(fn => {
    try { fn() } catch (_e) { /* best-effort cleanup */ }
  })
}

/**
 * Set up scroll/position tracking and scroll to initial position.
 * Returns an array of cleanup functions.
 */
export function initPositionTracking({ mainContent, surahNum, shouldSavePosition, surah, surahMeta, savedPosition, targetVerse }) {
  // Dispose any prior cleanups before registering new ones.
  teardownPositionTracking()

  const cleanups = []

  if (shouldSavePosition) {
    observeScroll(mainContent, {
      onPositionChange: ({ verse }) => {
        readerState.set({ lastTrackedVerse: verse })
        savePosition(surahNum, verse)
      },
    })

    const cleanupChunkedAppend = setupChunkedAppend(mainContent)
    cleanups.push(cleanupChunkedAppend)

    const visibilityHandler = () => {
      const { currentSurahNum: csn, lastTrackedVerse: ltv } = readerState.get()
      if (document.hidden && csn && ltv !== null) {
        flushDebounce()
        const positionData = {
          id: `s${csn}`,
          surah: csn,
          verse: ltv,
          savedAt: Date.now(),
        }
        put('positions', positionData).catch(() => {
          setTimeout(() => {
            put('positions', positionData).catch((error) => {
              logger.error('Failed to save position after retry:', {
                surah: csn,
                verse: ltv,
                error,
              })
              emit(Events.READER_POSITION_SAVE_FAILED, { error: error.message, surah: csn, verse: ltv })
            })
          }, 100)
        })
      }
    }
    document.addEventListener('visibilitychange', visibilityHandler)
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', visibilityHandler)
    })
  }

  const unsubTranslation = on(Events.SETTINGS_TRANSLATION_CHANGED, ({ visible }) => {
    readerState.set({ translationVisible: !!visible })
  })
  cleanups.push(() => { unsubTranslation() })

  const unsubVisibility = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    const { currentSurah } = readerState.get()
    if (currentSurah && mainContent) {
      const position = await get('positions', `s${currentSurah.n}`)
      if (position) {
        scrollToVerse(mainContent, position.verse)
      }
    }
  })
  cleanups.push(() => { unsubVisibility() })

  // Validate target verse
  let invalidVerseError = null
  if (targetVerse !== null) {
    if (targetVerse < 1 || targetVerse > surah.ar.length) {
      invalidVerseError = `Verse ${targetVerse} does not exist in ${surahMeta?.name ?? 'this Surah'} (${surah.ar.length} verses)`
    }
  }

  // Scroll to saved position or deep link verse
  if (savedPosition && !targetVerse && savedPosition.verse > 1) {
    scrollToVerse(mainContent, savedPosition.verse)
  } else if (targetVerse) {
    const validTargetVerse = invalidVerseError ? 1 : targetVerse
    scrollToVerse(mainContent, validTargetVerse)
  }

  if (invalidVerseError) {
    renderInvalidVerseError(mainContent, invalidVerseError)
  }

  currentCleanups = cleanups
  return cleanups
}
