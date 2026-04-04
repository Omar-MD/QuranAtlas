/**
 * IndexedDB connection manager.
 * Opens the quran-atlas DB v1 with all required stores.
 * All IDB access flows through this module.
 */

const DB_NAME = 'quran-atlas'
const DB_VERSION = 1

let dbPromise = null

/**
 * Open or return the existing database connection.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Settings store: keyPath = 'key'
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }

      // Positions store: keyPath = 'id'
      if (!db.objectStoreNames.contains('positions')) {
        db.createObjectStore('positions', { keyPath: 'id' })
      }

      // Marks store: keyPath = 'verseKey'
      if (!db.objectStoreNames.contains('marks')) {
        const marksStore = db.createObjectStore('marks', { keyPath: 'verseKey' })
        marksStore.createIndex('by-tag', 'tags', { multiEntry: true })
        marksStore.createIndex('by-updated', 'updatedAt')
      }

      // ActivationState store: keyPath = 'id'
      if (!db.objectStoreNames.contains('activationState')) {
        db.createObjectStore('activationState', { keyPath: 'id' })
      }

      // DatasetMeta store: keyPath = 'id'
      if (!db.objectStoreNames.contains('datasetMeta')) {
        db.createObjectStore('datasetMeta', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

/**
 * Get the open database connection.
 * @returns {Promise<IDBDatabase>}
 */
export async function getDb() {
  return openDB()
}

/**
 * Delete the database entirely.
 * @returns {Promise<void>}
 */
export function deleteDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => {
      dbPromise = null
      resolve()
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      // If blocked, the versionchange handler should have closed the connection
      // Force resolve after a short delay
      setTimeout(() => {
        dbPromise = null
        resolve()
      }, 1000)
    }
  })
}

/**
 * Convenience: get a value from a store.
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<*>}
 */
export async function get(storeName, key) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Convenience: put a value into a store.
 * @param {string} storeName
 * @param {*} value
 * @returns {Promise<void>}
 */
export async function put(storeName, value) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Convenience: delete a value from a store.
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<void>}
 */
export async function del(storeName, key) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get the most recently saved reading position.
 * @returns {Promise<{surah: number, verse: number} | null>}
 */
export async function getMostRecentPosition() {
  try {
    const db = await getDb()
    const tx = db.transaction('positions', 'readonly')
    const store = tx.objectStore('positions')
    const request = store.getAll()

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const positions = request.result || []
        if (positions.length === 0) {
          resolve(null)
          return
        }
        const mostRecent = positions.reduce((latest, pos) => {
          return pos.savedAt > latest.savedAt ? pos : latest
        }, positions[0])
        resolve(mostRecent)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
