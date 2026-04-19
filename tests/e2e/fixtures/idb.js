// Shared helpers for seeding / clearing IndexedDB before/between tests.
// Playwright runs the app in a real browser — use page.evaluate to talk to IDB.

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
  await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas', 1)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({ key: 'onboardingComplete', value: true })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
    // Mirror the full schema from src/core/db.js so all stores exist on first boot
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('positions')) {
        const positionsStore = db.createObjectStore('positions', { keyPath: 'id' })
        positionsStore.createIndex('by-savedAt', 'savedAt')
      }
      if (!db.objectStoreNames.contains('marks')) {
        const marksStore = db.createObjectStore('marks', { keyPath: 'verseKey' })
        marksStore.createIndex('by-tag', 'tags', { multiEntry: true })
        marksStore.createIndex('by-updated', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('activationState')) {
        db.createObjectStore('activationState', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('datasetMeta')) {
        db.createObjectStore('datasetMeta', { keyPath: 'id' })
      }
    }
  }))
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
  await page.evaluate((surf) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas', 1)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('settings', 'readwrite')
      tx.objectStore('settings').put({ key: 'lastSurface', value: surf })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('positions')) {
        const positionsStore = db.createObjectStore('positions', { keyPath: 'id' })
        positionsStore.createIndex('by-savedAt', 'savedAt')
      }
      if (!db.objectStoreNames.contains('marks')) {
        const marksStore = db.createObjectStore('marks', { keyPath: 'verseKey' })
        marksStore.createIndex('by-tag', 'tags', { multiEntry: true })
        marksStore.createIndex('by-updated', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('activationState')) {
        db.createObjectStore('activationState', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('datasetMeta')) {
        db.createObjectStore('datasetMeta', { keyPath: 'id' })
      }
    }
  }), surface)
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
  await page.evaluate((records) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas', 1)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('marks', 'readwrite')
      const store = tx.objectStore('marks')
      const now = Date.now()
      for (const r of records) {
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
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('positions')) {
        const positionsStore = db.createObjectStore('positions', { keyPath: 'id' })
        positionsStore.createIndex('by-savedAt', 'savedAt')
      }
      if (!db.objectStoreNames.contains('marks')) {
        const marksStore = db.createObjectStore('marks', { keyPath: 'verseKey' })
        marksStore.createIndex('by-tag', 'tags', { multiEntry: true })
        marksStore.createIndex('by-updated', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('activationState')) {
        db.createObjectStore('activationState', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('datasetMeta')) {
        db.createObjectStore('datasetMeta', { keyPath: 'id' })
      }
    }
  }), marks)
}
