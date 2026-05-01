/**
 * Colored dot indicators on marked verses.
 *
 * Performance:
 * - Marks are cached in an in-memory Map loaded once per reader mount (via
 *   initIndicators's initial getAll) so decorateVerse() reads from memory
 *   instead of IDB on every render.
 * - On DB_VISIBILITY_VISIBLE a full getAll() diff rebuilds the cache and
 *   re-decorates only changed verses — guaranteeing cross-tab consistency.
 *
 * Theming:
 * - Decorated class (`qa-verse--bookmarked`) is added/removed by this module.
 *   Dots use `getColorForTag()` which maps to WCAG AA palette slots across
 *   light, sepia, and dark themes.
 *
 * Export contract (Task 5, Step 5.6):
 *   import { initIndicators } from './marks/indicator'
 */

import { getAll, getByVerseKey } from './store'
import { on } from '../core/events'
import { Events } from '../core/constants'
import { tokenVerseKey } from '../core/tokenisable'
import type { Mark } from './store'

/**
 * In-memory mark cache. null = not yet initialised (fall back to IDB).
 */
let marksCache: Map<string, Mark> | null = null

function setCachedMark(verseKey: string, mark: Mark | undefined): void {
  if (!marksCache) { marksCache = new Map() }
  if (mark) {
    marksCache.set(verseKey, mark)
  } else {
    marksCache.delete(verseKey)
  }
}

/**
 * Rebuild the marks cache for a fresh reader surah and re-decorate every
 * currently rendered verse. Called from App.svelte's $effect when the
 * `reader.currentSurahNum` rune changes — replaces the old
 * `READER_SURAH_LOADED` event subscription.
 */
export async function refreshForSurah(_surahNum: number, scope?: ParentNode): Promise<void> {
  try {
    const all = await getAll()
    marksCache = new Map(all.map(m => [m.verseKey, m]))
  } catch {
    marksCache = null
  }
  const root: ParentNode = scope ?? document
  for (const el of root.querySelectorAll<HTMLElement>('[data-token-key]')) {
    const raw = el.getAttribute('data-token-key')
    const vk = raw ? tokenVerseKey(raw) : null
    if (vk) { void decorateVerse(vk, el) }
  }
}

/**
 * Decorate a verse element with the `qa-verse--bookmarked` class.
 * Reads from the in-memory cache if available, otherwise falls back to IDB.
 */
export async function decorateVerse(verseKey: string, element: HTMLElement): Promise<void> {
  element.classList.remove('qa-verse--bookmarked')

  let mark: Mark | undefined
  if (marksCache !== null) {
    mark = marksCache.get(verseKey)
  } else {
    mark = await getByVerseKey(verseKey)
  }

  if (!mark || mark.threads.length === 0) { return }
  element.classList.add('qa-verse--bookmarked')
}

/**
 * Initialize indicator event subscriptions.
 * Returns a cleanup function that unsubscribes all listeners.
 *
 * Called from the reader hook (via initIndicators) on each surah load.
 */
export function initIndicators(container?: HTMLElement): () => void {
  // Accept optional container; fall back to document for DOM queries.
  const scope: ParentNode = container ?? document

  // Initial cache load + decoration for the current surah's rendered verses.
  // App.svelte also runs refreshForSurah via $effect, but this hook runs
  // after Reader's first chunk has already rendered — so doing the pass here
  // guarantees verses painted before the $effect's async getAll resolved
  // still pick up the cache. The two calls are idempotent.
  void refreshForSurah(0, scope)

  const unsub2 = on(Events.READER_VERSE_RENDERED, ({ verseKey, element }) => {
    void decorateVerse(verseKey, element)
  })

  const unsub3 = on(Events.MARKS_SAVED, async ({ verseKey }) => {
    if (marksCache !== null) {
      try {
        const mark = await getByVerseKey(verseKey)
        setCachedMark(verseKey, mark)
      } catch {
        marksCache = null
      }
    }
    const el = scope.querySelector<HTMLElement>(`[data-token-key="${verseKey}"]`)
    if (el) { void decorateVerse(verseKey, el) }
  })

  const unsub4 = on(Events.MARKS_DELETED, ({ verseKey }) => {
    if (marksCache !== null) { marksCache.delete(verseKey) }
    const el = scope.querySelector<HTMLElement>(`[data-token-key="${verseKey}"]`)
    if (el) { el.classList.remove('qa-verse--bookmarked') }
  })

  const unsub5 = on(Events.MARKS_UNDO, async ({ verseKey }) => {
    if (marksCache !== null) {
      try {
        const mark = await getByVerseKey(verseKey)
        setCachedMark(verseKey, mark)
      } catch {
        marksCache = null
      }
    }
    const el = scope.querySelector<HTMLElement>(`[data-token-key="${verseKey}"]`)
    if (el) { void decorateVerse(verseKey, el) }
  })

  const unsub6 = on(Events.SYNC_UPDATE_RECEIVED, async ({ verseKeys }) => {
    if (marksCache !== null) {
      try {
        await Promise.all(verseKeys.map(async (vk) => {
          const mark = await getByVerseKey(vk)
          setCachedMark(vk, mark)
        }))
      } catch {
        marksCache = null
      }
    }
    for (const vk of verseKeys) {
      const el = scope.querySelector<HTMLElement>(`[data-token-key="${vk}"]`)
      if (el) { void decorateVerse(vk, el) }
    }
  })

  const unsub7 = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    try {
      const all = await getAll()
      const newCache = new Map(all.map(m => [m.verseKey, m]))

      // Diff: collect only verses whose tags actually changed
      const changedKeys = new Set<string>()
      for (const [vk, mark] of newCache) {
        const old = marksCache?.get(vk)
        if (!old || old.threads.join() !== mark.threads.join()) {
          changedKeys.add(vk)
        }
      }
      if (marksCache) {
        for (const vk of marksCache.keys()) {
          if (!newCache.has(vk)) { changedKeys.add(vk) }
        }
      }

      marksCache = newCache

      for (const vk of changedKeys) {
        const el = scope.querySelector<HTMLElement>(`[data-token-key="${vk}"]`)
        if (el) { void decorateVerse(vk, el) }
      }
    } catch {
      // Fallback: invalidate cache and re-decorate all visible verses via IDB
      marksCache = null
      for (const el of scope.querySelectorAll<HTMLElement>('[data-token-key]')) {
        const raw = el.getAttribute('data-token-key')
        const vk = raw ? tokenVerseKey(raw) : null
        if (vk) { void decorateVerse(vk, el) }
      }
    }
  })

  return () => { unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7() }
}

/**
 * Legacy alias: the old indicator.js exported `init()`.
 * Kept for any vanilla-JS consumers that may call init() before they port.
 * @deprecated Use initIndicators() instead.
 */
export const init = initIndicators
