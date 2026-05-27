// IDB connection lifecycle: open/close, onversionchange, onblocked
// retry/banner, visibility listener, get/put/del helpers. Separated
// from types + validate + migrations per audit C-2 / R-07 (2026-04-29)
// so type-only consumers don't drag this runtime through TypeScript
// erasure.

import { emit } from '../events'
import { Events } from '../constants'
import { applySchema, DB_NAME, DB_VERSION } from './migrations.js'
import { validateWrite } from './validate'
import type { StoreName, StoreRecords } from './types'

let dbPromise: Promise<IDBDatabase> | null = null
let dbRef: IDBDatabase | null = null
let visibilityListenerAttached = false

/**
 * Open or return the existing database connection.
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      applySchema(db, request.transaction)
    }

    request.onsuccess = (event) => {
      dbRef = (event.target as IDBOpenDBRequest).result
      dbRef.onversionchange = () => {
        dbRef?.close()
        dbPromise = null
        dbRef = null
        emit(Events.DB_VERSION_CHANGE, {})
      }
      resolve(dbRef)
    }
    request.onerror = () => reject(request.error)
    // Onblocked: a peer tab held an older-version connection during the
    // upgrade and didn't respond to its own versionchange. Without this
    // handler the open() Promise hangs forever and downstream reads/writes
    // (e.g. `bookmarks/store.ts::add`) silently never resolve. Surface a
    // reload banner so the user can close the stale peer; reject the
    // promise so callers don't await forever, and emit DB_DELETE_BLOCKED
    // (re-using the existing message channel) for telemetry.
    request.onblocked = () => {
      emit(Events.DB_DELETE_BLOCKED, {
        message: 'QuranAtlas is updating. Please close other tabs running this site and reload.',
      })
      dbPromise = null
      reject(new Error('IDB upgrade blocked by peer connection'))
    }
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

export async function getDb(): Promise<IDBDatabase> {
  return openDB()
}

export function closeDB(): void {
  dbRef?.close()
  dbPromise = null
  dbRef = null
}

export function deleteDB(): Promise<void> {
  closeDB()
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

export async function get<S extends StoreName>(storeName: S, key: IDBValidKey): Promise<StoreRecords[S] | undefined>
export async function get(storeName: string, key: IDBValidKey): Promise<unknown>
export async function get(storeName: string, key: IDBValidKey): Promise<unknown> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function put<S extends StoreName>(storeName: S, value: StoreRecords[S]): Promise<void>
export async function put(storeName: string, value: unknown): Promise<void>
export async function put(storeName: string, value: unknown): Promise<void> {
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

export async function del(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
