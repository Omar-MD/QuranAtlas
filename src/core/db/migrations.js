/**
 * Database schema applier — single source of truth for the
 * `onupgradeneeded` callback. Production code (db/connection.ts) calls
 * `applySchema(db, tx)` directly. The e2e fixture in
 * `tests/e2e/fixtures/idb.js` imports `applySchema` and uses
 * `Function.prototype.toString()` to inject the source verbatim into
 * `page.evaluate` — closes the audit R-16 / C-1 hand-mirror gap where
 * `_APPLY_SCHEMA_SRC` was a separately-maintained string that could
 * silently drift from the production schema.
 *
 * INVARIANT: this function is closure-free. It must not reference any
 * module-scope variable, import, or outer binding — `Function.toString()`
 * captures only the source text, not the closure scope. Inline the
 * active activation-state discriminator rather than importing from `./types`.
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
export const DB_VERSION = 7

/**
 * @param {IDBDatabase} db
 * @param {IDBTransaction | null | undefined} tx
 */
export function applySchema(db, tx) {
  const ACTIVE_ACTIVATION_STATUSES = [
    'none',
    'idle',
    'downloading',
    'cached',
    'pending-confirmation',
    'applying',
    'failed',
  ]
  const ACTIVE_ACTIVATION_KEYS = ['id', 'status', 'version', 'progress', 'error', 'stagedAt']

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value)
  }

  function isValidActivationStateRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return false
    }

    if (record.id !== 'current') {
      return false
    }

    if (typeof record.status !== 'string' || !ACTIVE_ACTIVATION_STATUSES.includes(record.status)) {
      return false
    }

    for (const key of Object.keys(record)) {
      if (!ACTIVE_ACTIVATION_KEYS.includes(key)) {
        return false
      }
    }

    if ('version' in record && record.version !== undefined && typeof record.version !== 'string') {
      return false
    }
    if ('progress' in record && record.progress !== undefined && !isFiniteNumber(record.progress)) {
      return false
    }
    if ('error' in record && record.error !== undefined && typeof record.error !== 'string') {
      return false
    }
    if ('stagedAt' in record && record.stagedAt !== undefined && !isFiniteNumber(record.stagedAt)) {
      return false
    }

    return true
  }

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

  if (db.objectStoreNames.contains('meta')) {
    db.deleteObjectStore('meta')
  }

  if (db.objectStoreNames.contains('marks')) {
    db.deleteObjectStore('marks')
  }

  if (!db.objectStoreNames.contains('activationState')) {
    db.createObjectStore('activationState', { keyPath: 'id' })
  } else if (tx) {
    const activationStore = tx.objectStore('activationState')
    activationStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result
      if (!cursor) {
        return
      }
      if (isValidActivationStateRecord(cursor.value)) {
        cursor.continue()
        return
      }
      cursor.delete()
      cursor.continue()
    }
  }

  if (!db.objectStoreNames.contains('datasetMeta')) {
    db.createObjectStore('datasetMeta', { keyPath: 'id' })
  }

  if (db.objectStoreNames.contains('edges')) {
    db.deleteObjectStore('edges')
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

  if (db.objectStoreNames.contains('audioPosition')) {
    db.deleteObjectStore('audioPosition')
  }
}
