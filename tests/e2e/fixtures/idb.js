// Shared helpers for seeding / clearing IndexedDB before/between tests.
// Playwright runs the app in a real browser — use page.evaluate to talk to IDB.

import { applySchema, DB_NAME, DB_VERSION } from '../../../src/core/db/migrations.js'

const MVP_ASSET_CONTRACT_ID = 'mvp-default-assets-qaloon-bridges-v1'

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
  _applySchema(db, tx)
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
 * @param {'settings'|'meta'|'activationState'|'datasetMeta'|'bookmarks'} storeName
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
      tx.objectStore('settings').put({ key: 'mvpAssetContractId', value: ${JSON.stringify(MVP_ASSET_CONTRACT_ID)} })
      tx.objectStore('settings').put({ key: 'riwayah', value: 'qaloon' })
      tx.objectStore('settings').put({ key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' })
      tx.objectStore('settings').put({ key: 'mushafEditionId', value: 'qalun-quran-ws-v1' })
      tx.objectStore('settings').put({ key: 'translationId', value: 'bridges' })
      tx.objectStore('settings').put({ key: 'translationVisible', value: true })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      const tx = open.transaction
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
 * @param {string} surface  — e.g. '#/about' or '#/s/2'
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
      const tx = open.transaction
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
 * @param {string} expected  — e.g. '#/about'
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

export async function seedBookmarks(page, records) {
  const recordsJson = JSON.stringify(records)
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open(${JSON.stringify(DB_NAME)}, ${DB_VERSION})
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('bookmarks', 'readwrite')
      const store = tx.objectStore('bookmarks')
      const now = Date.now()
      for (const row of ${recordsJson}) {
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
      const tx = open.transaction
      ${_APPLY_SCHEMA_SRC}
    }
  }))()`)
}
