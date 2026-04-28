/**
 * Bookmark verse-id glyph indicator.
 *
 * Adds the `qa-verse--bookmarked-glyph` class to a verse element when its
 * verseKey is bookmarked under the active riwayah. CSS swaps the verse-number
 * roundel from outline to filled accent.
 *
 * Performance:
 * - Active-riwayah bookmark verseKeys are cached in an in-memory Set, loaded
 *   once per reader mount, kept in sync via events (saved/deleted), cross-tab
 *   sync messages, riwayah changes, and DB visibility resumes.
 *
 * Cross-cutting:
 * - Riwayah switch invalidates + reloads the cache (different bookmark set).
 */

import { getAllForRiwayah } from './store'
import { settings } from '../state/settings.svelte'
import { on } from '../core/events'
import { Events } from '../core/constants'
import type { Riwayah } from '../core/db'

const BOOKMARK_CLASS = 'qa-verse--bookmarked-glyph'

let cache: Set<string> | null = null
let cacheRiwayah: Riwayah | null = null

function activeRiwayah(): Riwayah {
  return (settings.riwayah ?? 'qaloon') as Riwayah
}

async function rebuildCache(riwayah: Riwayah): Promise<void> {
  try {
    const all = await getAllForRiwayah(riwayah)
    cache = new Set(all.map(b => b.verseKey))
    cacheRiwayah = riwayah
  } catch {
    cache = null
    cacheRiwayah = null
  }
}

function decorate(verseKey: string, element: HTMLElement): void {
  if (cache && cache.has(verseKey)) {
    element.classList.add(BOOKMARK_CLASS)
  } else {
    element.classList.remove(BOOKMARK_CLASS)
  }
}

function decorateAll(scope: ParentNode): void {
  for (const el of scope.querySelectorAll<HTMLElement>('[data-verse-key]')) {
    const vk = el.getAttribute('data-verse-key')
    if (vk) { decorate(vk, el) }
  }
}

/**
 * Public: synchronous read used by the click-handler optimistic toggle path.
 */
export function isBookmarkedSync(verseKey: string): boolean {
  return cache?.has(verseKey) ?? false
}

/**
 * Initialize bookmark indicator subscriptions.
 * Returns a cleanup function. Called from app-bootstrap (one global instance).
 */
export function initBookmarkIndicators(): () => void {
  const scope: ParentNode = document
  void rebuildCache(activeRiwayah()).then(() => decorateAll(scope))

  const unsub1 = on(Events.READER_VERSE_RENDERED, ({ verseKey, element }) => {
    decorate(verseKey, element)
  })

  const unsub2 = on(Events.BOOKMARKS_SAVED, ({ verseKey, riwayah }) => {
    if (riwayah !== cacheRiwayah) { return }
    cache?.add(verseKey)
    const el = scope.querySelector<HTMLElement>(`[data-verse-key="${verseKey}"]`)
    if (el) { decorate(verseKey, el) }
  })

  const unsub3 = on(Events.BOOKMARKS_DELETED, ({ verseKey, riwayah }) => {
    if (riwayah !== cacheRiwayah) { return }
    cache?.delete(verseKey)
    const el = scope.querySelector<HTMLElement>(`[data-verse-key="${verseKey}"]`)
    if (el) { decorate(verseKey, el) }
  })

  const unsub4 = on(Events.SYNC_BOOKMARKS_UPDATED, async ({ verseKeys, riwayah }) => {
    if (riwayah !== cacheRiwayah) { return }
    await rebuildCache(riwayah)
    for (const vk of verseKeys) {
      const el = scope.querySelector<HTMLElement>(`[data-verse-key="${vk}"]`)
      if (el) { decorate(vk, el) }
    }
  })

  const unsub5 = on(Events.SETTINGS_RIWAYAH_CHANGED, async ({ to }) => {
    await rebuildCache(to)
    decorateAll(scope)
  })

  const unsub6 = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    await rebuildCache(activeRiwayah())
    decorateAll(scope)
  })

  return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6() }
}
