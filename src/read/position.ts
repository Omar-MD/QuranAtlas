/**
 * Reader position tracking — observes scroll, persists last-read verse to
 * the global position record, and scrolls to the target verse on load.
 *
 * Persistence is delegated to `./global-position.ts` (sole writer for
 * `settings.currentPosition`). Per-surah persistence was retired in DB v4
 * (cross-surah infinite scroll 2026-04-25): only one surah's position is
 * tracked at a time.
 */

import { emit, on } from '../core/events'
import { Events } from '../core/constants'
import type { SurahMeta } from '../data/dataset'
import { observeScroll, flushDebounce } from './scroll-tracker'
import { scrollToVerse } from './verse-scroll'
import { reader } from './state.svelte'
import { saveGlobalPosition, loadGlobalPosition } from './global-position'

/**
 * Save reading position to IDB via the global-position writer.
 */
export async function savePosition(surahNum: number, verse: number): Promise<void> {
  try {
    await saveGlobalPosition(surahNum, verse)
    reader.currentSurahNum = surahNum
    reader.currentVerseKey = `${surahNum}:${verse}`
  } catch (error) {
    emit(Events.READER_POSITION_SAVE_FAILED, {
      error: error instanceof Error ? error.message : String(error),
      surah: surahNum,
      verse,
    })
  }
}

export type PositionTrackingOptions = {
  mainContent: HTMLElement
  /**
   * Actual scrolling element — used as the IntersectionObserver root and as
   * the scroll source for position updates. In this app that's typically the
   * `#main-content` element from the app shell (overflow-y: auto). If omitted,
   * defaults to `mainContent` for back-compat with tests that pass a
   * scrollable container directly.
   */
  scroller?: HTMLElement
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
    scroller,
    surahNum,
    shouldSavePosition = true,
    surahMeta,
    savedPosition,
    targetVerse,
    totalVerseCount,
    ensureVerseRendered,
    onInvalidVerseError,
  } = opts
  const scrollHost = scroller ?? mainContent

  // Dispose any prior cleanups before registering new ones.
  teardownPositionTracking()

  currentSurahNum = surahNum
  const cleanups: Array<() => void> = []

  // Grace window: ignore IO-driven saves that report a verse earlier than
  // the restore target while a programmatic scroll-to-saved-position is in
  // flight. Without this, the IO fires for verse 1 (top of chunk) before
  // `scrollToVerse` lands on the target, and the 1s debounce overwrites the
  // persisted position with verse 1. Re-armed on every warm-resume restore
  // so IO transits during those scrolls don't corrupt saved position either.
  const GRACE_MS = 2000
  const restoreTarget = (savedPosition?.verse ?? targetVerse) ?? null
  let graceUntil = Date.now() + GRACE_MS
  const allowSave = (verse: number): boolean => {
    if (Date.now() >= graceUntil) { return true }
    if (restoreTarget === null) { return true }
    return verse >= restoreTarget
  }

  if (shouldSavePosition) {
    observeScroll(mainContent, {
      scroller: scrollHost,
      onPositionChange: ({ verse }) => {
        lastTrackedVerse = verse
        if (!allowSave(verse)) { return }
        void savePosition(surahNum, verse)
      },
    })

    // Persist on every tab-hide / screen-lock / page-close.
    // Quirks this must handle:
    //   - IO debounce (1s) means lastTrackedVerse can lag pendingPosition.
    //     Flush unconditionally so the most-recent verse is captured, even
    //     if the callback hasn't fired once yet this mount.
    //   - iOS Safari does not always fire `visibilitychange` before unload
    //     on true tab close; `pagehide` is the reliable signal there.
    const persistOnExit = () => {
      if (currentSurahNum === null) { return }
      flushDebounce() // may synchronously update lastTrackedVerse
      if (lastTrackedVerse === null) { return }
      if (!allowSave(lastTrackedVerse)) { return }
      void savePosition(currentSurahNum, lastTrackedVerse)
    }
    const visibilityHandler = () => { if (document.hidden) { persistOnExit() } }
    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('pagehide', persistOnExit)
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', visibilityHandler)
      window.removeEventListener('pagehide', persistOnExit)
    })
  }

  // Warm-resume restore (tab hidden → visible without remount, e.g. iOS
  // lock/unlock). Only restore when the tracker is fresh (lastTrackedVerse
  // still null) and the scroller is at the top — otherwise the browser-
  // preserved scroll position is authoritative.
  const unsubVisibility = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    if (currentSurahNum === null || !mainContent) { return }
    if (lastTrackedVerse !== null) { return }
    const scrollerEl = scrollHost
    if (scrollerEl && scrollerEl.scrollTop > 4) { return }
    const position = await loadGlobalPosition()
    if (position && position.surah === currentSurahNum && position.verse > 1) {
      graceUntil = Date.now() + GRACE_MS
      scrollToVerse(mainContent, position.verse, ensureVerseRendered)
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
