// Shared helpers for seeding / clearing IndexedDB before/between tests.
// Playwright runs the app in a real browser — use page.evaluate to talk to IDB.

/**
 * Apply the quran-atlas DB schema (mirrors src/core/db.js onupgradeneeded).
 * Called from each fixture helper's onupgradeneeded handler.
 *
 * IMPORTANT: page.evaluate serialises its function argument as a string before
 * sending it to the browser, so Node-side closures are not available there.
 * _applySchema is therefore defined as a source-string constant (_APPLY_SCHEMA_SRC)
 * that is embedded verbatim into each page.evaluate expression string — the one
 * pattern that guarantees a single source of truth without new Function() or any
 * other dynamic evaluation trick.
 *
 * @param {IDBDatabase} db
 */
// _APPLY_SCHEMA_SRC is the verbatim function body injected into each page.evaluate.
const _APPLY_SCHEMA_SRC = `
  if (!db.objectStoreNames.contains('settings')) {
    db.createObjectStore('settings', { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains('positions')) {
    const s = db.createObjectStore('positions', { keyPath: 'id' })
    s.createIndex('by-savedAt', 'savedAt')
  }
  if (!db.objectStoreNames.contains('marks')) {
    const s = db.createObjectStore('marks', { keyPath: 'verseKey' })
    s.createIndex('by-tag', 'tags', { multiEntry: true })
    s.createIndex('by-updated', 'updatedAt')
  }
  if (!db.objectStoreNames.contains('activationState')) {
    db.createObjectStore('activationState', { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains('datasetMeta')) {
    db.createObjectStore('datasetMeta', { keyPath: 'id' })
  }
`

/**
 * Delete the quran-atlas DB entirely. Use in beforeEach for clean-slate tests.
 */
export async function clearAllData(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    // Suppress the versionchange banner so deleting the DB from this tab does not
    // poison appShell.style.pointerEvents (Bug-2).
    window.__qaSuppressNextVersionChange?.()
    const req = indexedDB.deleteDatabase('quran-atlas')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve() // best-effort
  }))
}

/**
 * Pre-set onboardingComplete so tests that don't exercise onboarding can skip it.
 * Creates the full DB schema matching src/core/db.js so the app finds all stores on boot.
 */
export async function markOnboardingComplete(page) {
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas', 1)
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
    const open = indexedDB.open('quran-atlas', 1)
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
 * Seed one or more marks. Each mark is { verseKey, tags, note? }.
 */
export async function seedMarks(page, marks) {
  // JSON-embed the records array so it is safe to splice into an expression string.
  const recordsJson = JSON.stringify(marks)
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas', 1)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const now = Date.now()
      for (const r of ${recordsJson}) {
        store.put({
          verseKey: r.verseKey,
          tags: r.tags,
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
