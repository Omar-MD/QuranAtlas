/**
 * Database schema applier — single source of truth for the
 * `onupgradeneeded` callback. Production code (db/connection.ts) calls
 * `applySchema(db)` directly. The e2e fixture in
 * `tests/e2e/fixtures/idb.js` imports `applySchema` and uses
 * `Function.prototype.toString()` to inject the source verbatim into
 * `page.evaluate` — closes the audit R-16 / C-1 hand-mirror gap where
 * `_APPLY_SCHEMA_SRC` was a separately-maintained string that could
 * silently drift from the production schema.
 *
 * INVARIANT: this function is closure-free. It must not reference any
 * module-scope variable, import, or outer binding — `Function.toString()`
 * captures only the source text, not the closure scope. Inline the
 * 12 layer names rather than importing from `./types`.
 *
 * Migration plumbing (versioned _shapes, cursor back-fill helper) is
 * deferred until the first user-visible release per the brainstorming
 * decision tracked in `docs/context/future-work.md` ("before v1.0
 * launch: land migration plumbing"). For now `applySchema` is the
 * destructive-recreate-only callback used by both v5 cold installs and
 * any subsequent in-place upgrade.
 *
 * Plain JS so the e2e fixture (also JS) can import without TS-compile
 * step or browser-side type machinery.
 */

export const DB_NAME = 'quran-atlas'
export const DB_VERSION = 5

/**
 * @param {IDBDatabase} db
 */
export function applySchema(db) {
  const LAYER_NAMES = [
    'threads', 'subjects', 'audience', 'speaker', 'quotedSpeaker',
    'mode', 'form', 'tone', 'people', 'places', 'events', 'divineNames',
  ]

  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'key' })
  }

  // Drop legacy positions store from v1-v3 (cross-surah infinite scroll
  // 2026-04-25: per-surah position tracking replaced with single global
  // position in settings.currentPosition; review-hub state migrated to
  // the new `meta` store).
  if (db.objectStoreNames.contains('positions')) {
    db.deleteObjectStore('positions')
  }

  // Meta store (v4+): keyPath = 'id'. Holds single-row metadata records
  // (review-hub state, etc.). Replaces the old `positions` reuse pattern.
  if (!db.objectStoreNames.contains('meta')) {
    db.createObjectStore('meta', { keyPath: 'id' })
  }

  // Marks store: keyPath = 'verseKey' (v2 — drop + recreate for clean indexes)
  if (db.objectStoreNames.contains('marks')) {
    db.deleteObjectStore('marks')
  }
  const marksStore = db.createObjectStore('marks', { keyPath: 'verseKey' })
  for (const layer of LAYER_NAMES) {
    marksStore.createIndex('by-canon-' + layer, '_canon.' + layer, { multiEntry: true })
  }
  marksStore.createIndex('by-updated', 'updatedAt')

  if (!db.objectStoreNames.contains('activationState')) {
    db.createObjectStore('activationState', { keyPath: 'id' })
  }

  if (!db.objectStoreNames.contains('datasetMeta')) {
    db.createObjectStore('datasetMeta', { keyPath: 'id' })
  }

  // Edges store: keyPath = 'id' (v3)
  if (!db.objectStoreNames.contains('edges')) {
    const edgesStore = db.createObjectStore('edges', { keyPath: 'id' })
    edgesStore.createIndex('by-from', 'from')
    edgesStore.createIndex('by-to', 'to')
    edgesStore.createIndex('by-canon-kind', '_canonKind')
    edgesStore.createIndex('by-updated', 'updatedAt')
  }

  // Bookmarks store (v5): compound key [riwayah, verseKey] — bookmarks are
  // riwayah-scoped. Indexes power the BookmarksList grouped-by-surah view.
  if (!db.objectStoreNames.contains('bookmarks')) {
    const bookmarksStore = db.createObjectStore('bookmarks', {
      keyPath: ['riwayah', 'verseKey'],
    })
    bookmarksStore.createIndex('by-riwayah-surah', ['riwayah', 'surah'])
    bookmarksStore.createIndex('by-riwayah', 'riwayah')
  }
}
