/**
 * IndexedDB connection manager.
 * Opens the quran-atlas DB v1 with all required stores.
 * All IDB access flows through this module.
 */

import { emit } from './events.js'
import { Events } from './constants.js'

const DB_NAME = 'quran-atlas'
const DB_VERSION = 1

let dbPromise = null
let dbRef = null
let visibilityListenerAttached = false

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
        const positionsStore = db.createObjectStore('positions', { keyPath: 'id' })
        positionsStore.createIndex('by-savedAt', 'savedAt')
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

    request.onsuccess = (event) => {
      dbRef = event.target.result
      dbRef.onversionchange = () => {
        dbRef.close()
        dbPromise = null
        dbRef = null
        emit(Events.DB_VERSION_CHANGE, {})
      }
      resolve(dbRef)
    }
    request.onerror = () => reject(request.error)
  })

  if (!visibilityListenerAttached) {
    visibilityListenerAttached = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        emit(Events.DB_VISIBILITY_VISIBLE, {})
      }
    })
  }

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
      dbRef = null
      resolve()
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      dbRef?.close()
      dbPromise = null
      dbRef = null
      emit(Events.DB_DELETE_BLOCKED, { message: 'Database deletion was blocked. Please close other tabs using this site.' })
      setTimeout(() => {
        const retry = indexedDB.deleteDatabase(DB_NAME)
        retry.onsuccess = () => resolve()
        retry.onerror = () => reject(retry.error)
        retry.onblocked = () => reject(new Error('Database deletion still blocked after retry'))
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
  await validateWrite(storeName, value)
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => {
      const error = request.error
      if (error?.name === 'QuotaExceededError') {
        emit(Events.DB_QUOTA_EXCEEDED, { storeName, message: 'Storage is full. Please clear some data.' })
      }
      reject(error)
    }
  })
}

/**
 * Validate a write to a store.
 * @param {string} storeName
 * @param {*} value
 * @returns {Promise<boolean>}
 */
export async function validateWrite(storeName, value) {
  const schemas = {
    settings: ['key', 'value'],
    positions: ['id', 'surah', 'verse', 'savedAt'],
    marks: ['verseKey'],
    activationState: ['id', 'status'],
    datasetMeta: ['id'],
  }

  const required = schemas[storeName]
  if (!required) {
    throw new Error(`Unknown store: ${storeName}`)
  }

  for (const field of required) {
    if (!(field in value) || value[field] === undefined) {
      throw new Error(`missing required field: ${field}`)
    }
  }

  return true
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
    const index = store.index('by-savedAt')
    const request = index.openCursor(null, 'prev')

    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          resolve(cursor.value)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
  } catch (error) {
    console.error('Failed to get most recent position:', error)
    return null
  }
}
