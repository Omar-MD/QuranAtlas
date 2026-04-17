// Shared helpers for seeding / clearing IndexedDB before/between tests.
// Playwright runs the app in a real browser — use page.evaluate to talk to IDB.

/**
 * Delete the quran-atlas DB entirely. Use in beforeEach for clean-slate tests.
 */
export async function clearAllData(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
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
