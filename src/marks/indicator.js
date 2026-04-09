/**
 * Colored dot indicators on marked verses.
 *
 * Performance:
 * - Marks are cached in an in-memory Map loaded on READER_SURAH_LOADED so
 *   decorateVerse() reads from memory instead of IDB on every render.
 * - On DB_VISIBILITY_VISIBLE a full getAll() diff rebuilds the cache and
 *   re-decorates only changed verses — guaranteeing cross-tab consistency.
 *
 * Theming:
 * - Dots use data-tag="<label>" attributes instead of inline backgroundColor.
 *   CSS [data-tag="..."] rules in theme.css drive per-theme colors, giving
 *   WCAG AA 4.5:1 contrast across light, sepia, and dark themes.
 */

import { getAll, getByVerseKey } from './store.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'

/**
 * In-memory mark cache. null means "not yet initialised — fall back to IDB".
 * @type {Map<string, {verseKey: string, tags: string[]}> | null}
 */
let marksCache = null

function setCachedMark(verseKey, mark) {
  if (!marksCache) {
    marksCache = new Map()
  }
  if (mark) {
    marksCache.set(verseKey, mark)
  } else {
    marksCache.delete(verseKey)
  }
}

/**
 * Decorate a verse element with colored tag dots.
 * Reads from the in-memory cache if available, otherwise falls back to IDB.
 * @param {string} verseKey - e.g. '2:255'
 * @param {HTMLElement} element - the verse DOM element
 */
export async function decorateVerse(verseKey, element) {
  const existing = element.querySelector('.qa-mark-dots')
  if (existing) {
    existing.remove()
  }

  let mark
  if (marksCache !== null) {
    mark = marksCache.get(verseKey)
  } else {
    mark = await getByVerseKey(verseKey)
  }

  if (!mark || mark.tags.length === 0) {
    return
  }

  const dots = document.createElement('div')
  dots.className = 'qa-mark-dots'

  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.dataset.tag = tag // CSS [data-tag="..."] drives color via theme.css
    dots.appendChild(dot)
  }

  element.insertBefore(dots, element.firstChild)
}

/**
 * Initialize indicator listeners.
 * @returns {Function} cleanup function
 */
export function init() {
  // Build cache from IDB when a surah loads
  const unsub1 = on(Events.READER_SURAH_LOADED, async () => {
    try {
      const all = await getAll()
      marksCache = new Map(all.map(m => [m.verseKey, m]))
    } catch {
      marksCache = null // Keep null; decorateVerse will fall back to IDB
    }
  })

  const unsub2 = on(Events.READER_VERSE_RENDERED, ({ verseKey, element }) => {
    decorateVerse(verseKey, element)
  })

  const unsub3 = on(Events.MARKS_SAVED, async ({ verseKey }) => {
    if (marksCache !== null) {
      try {
        const mark = await getByVerseKey(verseKey)
        setCachedMark(verseKey, mark)
      } catch {
        marksCache = null // Invalidate on error; forces IDB fallback
      }
    }
    const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
    if (el) {
      decorateVerse(verseKey, el)
    }
  })

  const unsub4 = on(Events.MARKS_DELETED, ({ verseKey }) => {
    if (marksCache !== null) {
      marksCache.delete(verseKey)
    }
    const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
    if (el) {
      const dots = el.querySelector('.qa-mark-dots')
      if (dots) {
        dots.remove()
      }
    }
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
    const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
    if (el) {
      decorateVerse(verseKey, el)
    }
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
    for (const verseKey of verseKeys) {
      const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
      if (el) {
        decorateVerse(verseKey, el)
      }
    }
  })

  const unsub7 = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    try {
      const all = await getAll()
      const newCache = new Map(all.map(m => [m.verseKey, m]))

      // Diff: collect only verses whose tags actually changed
      const changedKeys = new Set()
      for (const [vk, mark] of newCache) {
        const old = marksCache?.get(vk)
        if (!old || old.tags.join() !== mark.tags.join()) {
          changedKeys.add(vk)
        }
      }
      if (marksCache) {
        for (const vk of marksCache.keys()) {
          if (!newCache.has(vk)) {
            changedKeys.add(vk)
          }
        }
      }

      marksCache = newCache

      for (const vk of changedKeys) {
        const el = document.querySelector(`[data-verse-key="${vk}"]`)
        if (el) {
          decorateVerse(vk, el)
        }
      }
    } catch {
      // Fallback: invalidate cache and re-decorate all visible verses via IDB
      marksCache = null
      const visibleVerses = document.querySelectorAll('[data-verse-key]')
      for (const el of visibleVerses) {
        const verseKey = el.getAttribute('data-verse-key')
        decorateVerse(verseKey, el)
      }
    }
  })

  return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7() }
}

