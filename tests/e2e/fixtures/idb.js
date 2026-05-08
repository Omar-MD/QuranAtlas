// Shared helpers for seeding / clearing IndexedDB before/between tests.
// Playwright runs the app in a real browser — use page.evaluate to talk to IDB.

import { applySchema, DB_NAME, DB_VERSION } from '../../../src/core/db/migrations.js'

/**
 * The schema-applier source text injected verbatim into each
 * `page.evaluate` expression string. Derived from the production
 * `applySchema(db)` function via `Function.prototype.toString()` so the
 * fixture and the production `onupgradeneeded` callback can never drift
 * (audit C-1 / R-16, 2026-04-29 — closes the prior `_APPLY_SCHEMA_SRC`
 * hand-mirror gap).
 *
 * `applySchema` in `src/core/db/migrations.js` is closure-free by
 * contract — see the JSDoc there. As long as that holds, the tostring
 * roundtrip is safe.
 */
const _APPLY_SCHEMA_SRC = `
  const _applySchema = ${applySchema.toString()}
  _applySchema(db)
`

/**
 * Delete the quran-atlas DB entirely. Use in beforeEach for clean-slate tests.
 *
 * Waits for the app to be ready (bootstrap has exposed the suppress hatch AND
 * initialized the safety-sync listener) before issuing the delete, so the
 * versionchange is handled cleanly and no suppress flag leaks into later tests.
 * Also waits for `onsuccess` (not just `onblocked`) to ensure the delete has
 * actually completed before subsequent fixture writes open a fresh DB.
 */
export async function clearAllData(page) {
  // Wait for the E2E hatch to appear; its exposure in app-bootstrap.ts is
  // ordered AFTER initSafetySync, so its presence implies the safety-sync
  // DB_VERSION_CHANGE listener is already registered.
  await page.waitForFunction(
    () => typeof window.__qaSuppressNextVersionChange === 'function',
    null,
    { timeout: 10_000 },
  )
  await page.evaluate(() => new Promise((resolve, reject) => {
    // Suppress the versionchange banner so deleting the DB from this tab does not
    // poison appShell.style.pointerEvents (Bug-2).
    window.__qaSuppressNextVersionChange()
    const req = indexedDB.deleteDatabase('quran-atlas')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    // onblocked: another connection is holding the DB open and didn't respond
    // to versionchange.  This should be rare (our db.ts closes on versionchange),
    // but if it happens we still wait for onsuccess — the delete will finish
    // when that connection eventually closes.  Resolving eagerly here was the
    // old behavior and caused race-prone half-deleted state for later fixtures.
    req.onblocked = () => { /* keep waiting for onsuccess */ }
  }))
}

/**
 * Clear a single object store without dropping the entire DB. Use this in
 * preference to `clearAllData` whenever a test only mutates one store —
 * skips IDB schema teardown + recreate (~3–4s per call) and avoids forcing
 * the app to cold-boot on the next navigation.
 *
 * Reach for `clearAllData` only when the test exercises cross-store
 * invariants, the onboarding boot flow, or the clear-data UX itself.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'settings'|'marks'|'edges'|'meta'|'activationState'|'datasetMeta'|'bookmarks'} storeName
 */
export async function clearStore(page, storeName) {
  const nameJson = JSON.stringify(storeName)
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas')
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(${nameJson})) { db.close(); resolve(); return }
      const tx = db.transaction(${nameJson}, 'readwrite')
      tx.objectStore(${nameJson}).clear()
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
    open.onerror = () => resolve()
  }))()`)
}

/**
 * Pre-set onboardingComplete so tests that don't exercise onboarding can skip it.
 * Creates the full DB schema matching src/core/db.js so the app finds all stores on boot.
 */
export async function markOnboardingComplete(page) {
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open(${JSON.stringify(DB_NAME)}, ${DB_VERSION})
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({ key: 'onboardingComplete', value: true })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      ${_APPLY_SCHEMA_SRC}
    }
  }))()`)
}

/**
 * Directly seed settings.lastSurface into IDB.
 * Use in A2-style tests to set up the session-restore state without relying on
 * app navigation (which races with parallel tests sharing the same origin).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} surface  — e.g. '#/review' or '#/s/2'
 */
export async function seedLastSurface(page, surface) {
  // page.evaluate(expressionString) executes in the browser; the surface value is
  // JSON-embedded so it is safe for any valid URL fragment string.
  const surfaceJson = JSON.stringify(surface)
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open(${JSON.stringify(DB_NAME)}, ${DB_VERSION})
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({ key: 'lastSurface', value: ${surfaceJson} })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      ${_APPLY_SCHEMA_SRC}
    }
  }))()`)
}

/**
 * Poll IDB until settings.lastSurface equals the expected value (or timeout).
 * Use after page.goto(hash) to ensure the router's async IDB write has landed
 * before calling page.reload() — prevents A2-style race conditions.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} expected  — e.g. '#/review'
 * @param {number} [timeout] — ms, default 8000
 */
export async function waitForLastSurface(page, expected, timeout = 8_000) {
  const { expect } = await import('@playwright/test')
  await expect(async () => {
    const value = await page.evaluate(() => new Promise((resolve, reject) => {
      // No version arg — read-only poll; avoids triggering onupgradeneeded on an existing DB.
      const open = indexedDB.open('quran-atlas')
      open.onsuccess = () => {
        const db = open.result
        if (!db.objectStoreNames.contains('settings')) { resolve(null); db.close(); return }
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('lastSurface')
        req.onsuccess = () => { resolve(req.result?.value ?? null); db.close() }
        req.onerror = () => { resolve(null); db.close() }
      }
      open.onerror = () => reject(open.error)
    }))
    expect(value).toBe(expected)
  }).toPass({ timeout })
}

/**
 * Read a single settings value by key.  Returns null if the DB or key is absent.
 * Centralises the inline `indexedDB.open('quran-atlas')` boilerplate that was
 * previously copy-pasted across specs (A1 onboardingComplete, D2 translationId
 * / translationVisible, B5 fontSize, etc.).
 */
export async function readSetting(page, key) {
  return page.evaluate((k) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas')
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('settings')) { resolve(null); db.close(); return }
      const tx = db.transaction('settings', 'readonly')
      const req = tx.objectStore('settings').get(k)
      req.onsuccess = () => { resolve(req.result?.value ?? null); db.close() }
      req.onerror = () => { resolve(null); db.close() }
    }
    open.onerror = () => reject(open.error)
  }), key)
}

export async function writeSetting(page, key, value) {
  await page.evaluate(({ key: settingKey, value: settingValue }) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas')
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({ key: settingKey, value: settingValue })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
    open.onerror = () => reject(open.error)
  }), { key, value })
}

/**
 * Read a mark record from IDB by verseKey.  Returns undefined if not found.
 */
export async function getMarkFromIdb(page, verseKey) {
  return page.evaluate((vk) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas')
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('marks')) { resolve(undefined); db.close(); return }
      const tx = db.transaction('marks', 'readonly')
      const req = tx.objectStore('marks').get(vk)
      req.onsuccess = () => { resolve(req.result); db.close() }
      req.onerror = () => { resolve(undefined); db.close() }
    }
    open.onerror = () => reject(open.error)
  }), verseKey)
}

/**
 * Seed one or more marks using the v2 12-layer schema.
 * Each mark is { verseKey, threads?, subjects?, audience?, speaker?,
 * quotedSpeaker?, mode?, form?, tone?, people?, places?, events?,
 * divineNames?, note? }.
 * For backward compat, a top-level `tags` array is mapped into `threads`.
 */
export async function seedMarks(page, marks) {
  // JSON-embed the records array so it is safe to splice into an expression string.
  const recordsJson = JSON.stringify(marks)
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const LAYER_NAMES = [
      'threads','subjects','audience','speaker','quotedSpeaker',
      'mode','form','tone','people','places','events','divineNames',
    ]
    const open = indexedDB.open(${JSON.stringify(DB_NAME)}, ${DB_VERSION})
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const now = Date.now()
      for (const r of ${recordsJson}) {
        const threads = r.threads || r.tags || []
        const layers = {}
        for (const l of LAYER_NAMES) {
          layers[l] = l === 'threads' ? threads : (r[l] || [])
        }
        const _canon = {}
        for (const l of LAYER_NAMES) {
          _canon[l] = layers[l].map(t => t.toLowerCase().normalize('NFC').replace(/[\\s\\-]+/g, '-').replace(/[^a-z0-9\\-'\\u0600-\\u06ff]/g, ''))
        }
        store.put({
          verseKey: r.verseKey,
          ...layers,
          _canon,
          note: r.note || '',
          createdAt: now,
          updatedAt: now,
        })
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      ${_APPLY_SCHEMA_SRC}
    }
  }))()`)
}

export async function seedBookmarks(page, records) {
  await page.evaluate(({ rows, dbName, dbVersion, applySchemaSource }) => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, dbVersion)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('bookmarks', 'readwrite')
      const store = tx.objectStore('bookmarks')
      const now = Date.now()
      for (const row of rows) {
        const [surahRaw] = row.verseKey.split(':')
        store.put({
          riwayah: row.riwayah ?? 'qaloon',
          verseKey: row.verseKey,
          surah: Number(surahRaw),
          createdAt: now,
        })
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      // eslint-disable-next-line no-new-func
      new Function('db', applySchemaSource)(db)
    }
  }), {
    rows: records,
    dbName: DB_NAME,
    dbVersion: DB_VERSION,
    applySchemaSource: `${applySchema.toString()}\nreturn applySchema(db)`,
  })
}
