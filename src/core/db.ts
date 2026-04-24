/**
 * IndexedDB connection manager.
 * Opens the quran-atlas DB v2 with all required stores.
 * All IDB access flows through this module.
 */

import { emit } from './events'
import { Events } from './constants'
import { logger } from './logger'

const DB_NAME = 'quran-atlas'
const DB_VERSION = 3

let dbPromise: Promise<IDBDatabase> | null = null
let dbRef: IDBDatabase | null = null
let visibilityListenerAttached = false

export type LayerName =
  | 'threads' | 'subjects' | 'audience' | 'speaker' | 'quotedSpeaker'
  | 'mode' | 'form' | 'tone' | 'people' | 'places' | 'events' | 'divineNames'

export const LAYER_NAMES: LayerName[] = [
  'threads', 'subjects', 'audience', 'speaker', 'quotedSpeaker',
  'mode', 'form', 'tone', 'people', 'places', 'events', 'divineNames',
]

export interface MarkRecord {
  verseKey: string
  threads: string[]
  subjects: string[]
  audience: string[]
  speaker: string[]
  quotedSpeaker: string[]
  mode: string[]
  form: string[]
  tone: string[]
  people: string[]
  places: string[]
  events: string[]
  divineNames: string[]
  _canon: Record<LayerName, string[]>
  note: string
  createdAt: number
  updatedAt: number
}

export interface EdgeRecord {
  id: string
  from: string
  to: string
  kind: string
  _canonKind: string
  directed: boolean
  note: string
  createdAt: number
  updatedAt: number
}

export type StoreRecords = {
  settings: { key: string; value: unknown }
  positions: { id: string; surah: number; verse: number; savedAt: number; [k: string]: unknown }
  marks: MarkRecord
  activationState: { id: string; status: string; [k: string]: unknown }
  datasetMeta: { id: string; version?: string; [k: string]: unknown }
  edges: EdgeRecord
}

export type StoreName = keyof StoreRecords

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

      // Settings store: keyPath = 'key'
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }

      // Positions store: keyPath = 'id'
      if (!db.objectStoreNames.contains('positions')) {
        const positionsStore = db.createObjectStore('positions', { keyPath: 'id' })
        positionsStore.createIndex('by-savedAt', 'savedAt')
      }

      // Marks store: keyPath = 'verseKey' (v2 — drop + recreate for clean indexes)
      if (db.objectStoreNames.contains('marks')) {
        db.deleteObjectStore('marks')
      }
      const marksStore = db.createObjectStore('marks', { keyPath: 'verseKey' })
      for (const layer of LAYER_NAMES) {
        marksStore.createIndex(`by-canon-${layer}`, `_canon.${layer}`, { multiEntry: true })
      }
      marksStore.createIndex('by-updated', 'updatedAt')

      // ActivationState store: keyPath = 'id'
      if (!db.objectStoreNames.contains('activationState')) {
        db.createObjectStore('activationState', { keyPath: 'id' })
      }

      // DatasetMeta store: keyPath = 'id'
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
 */
export async function getDb(): Promise<IDBDatabase> {
  return openDB()
}

/**
 * Delete the database entirely.
 */
export function deleteDB(): Promise<void> {
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
 */
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

/**
 * Convenience: put a value into a store.
 */
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

/**
 * Required fields per store, with their expected runtime types.
 * Use 'any' to require the field is present but skip type checking.
 * Fields listed here are required; if absent the write is rejected.
 */
const _shapes: Record<string, Record<string, string>> = {
  settings: { key: 'string', value: 'any' },
  positions: { id: 'string', surah: 'number', verse: 'number', savedAt: 'number' },
  marks: {
    verseKey: 'string',
    threads: 'string[]', subjects: 'string[]', audience: 'string[]',
    speaker: 'string[]', quotedSpeaker: 'string[]',
    mode: 'string[]', form: 'string[]', tone: 'string[]',
    people: 'string[]', places: 'string[]', events: 'string[]', divineNames: 'string[]',
    _canon: 'any',
    note: 'string',
    createdAt: 'number',
    updatedAt: 'number',
  },
  activationState: { id: 'string', status: 'string' },
  datasetMeta: { id: 'string' },
  edges: {
    id: 'string', from: 'string', to: 'string',
    kind: 'string', _canonKind: 'string', directed: 'boolean',
    note: 'string', createdAt: 'number', updatedAt: 'number',
  },
}

/**
 * Optional fields per store that are type-checked when present.
 * If a field appears in the record but with the wrong type, the write is rejected.
 */
const _optionalTypes: Record<string, Record<string, string>> = {
}

function _typeOf(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length === 0) { return 'empty[]' }
    const elemType = typeof v[0]
    return v.every(x => typeof x === elemType) ? `${elemType}[]` : 'mixed[]'
  }
  return typeof v
}

/**
 * Validate a write to a store.
 */
export async function validateWrite(storeName: string, value: unknown): Promise<boolean> {
  const shape = _shapes[storeName]
  if (!shape) {
    throw new Error(`Unknown store: ${storeName}`)
  }

  const rec = value as Record<string, unknown>

  // Check required fields
  // Note: missing-field format ('missing required field: ${field}') matches existing db.test.js
  // assertions — do not change. Type-mismatch errors use a different format intentionally.
  for (const [field, expected] of Object.entries(shape)) {
    if (!(field in rec) || rec[field] === undefined) {
      throw new Error(`missing required field: ${field}`)
    }
    if (expected === 'any') { continue }
    const actual = _typeOf(rec[field])
    if (actual !== expected) {
      // 'empty[]' is valid for any array type
      if (actual === 'empty[]' && expected.endsWith('[]')) { continue }
      throw new Error(`${storeName}.${field}: expected ${expected}, got ${actual}`)
    }
  }

  // Check optional fields when present
  const optionals = _optionalTypes[storeName]
  if (optionals) {
    for (const [field, expected] of Object.entries(optionals)) {
      if (!(field in rec) || rec[field] === undefined) { continue }
      const actual = _typeOf(rec[field])
      if (actual !== expected) {
        // 'empty[]' is valid for any array type
        if (actual === 'empty[]' && expected.endsWith('[]')) { continue }
        throw new Error(`${storeName}.${field}: expected ${expected}, got ${actual}`)
      }
    }
  }

  return true
}

/**
 * Convenience: delete a value from a store.
 */
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

/**
 * Get the most recently saved reading position.
 */
export async function getMostRecentPosition(): Promise<{ surah: number; verse: number } | null> {
  try {
    const db = await getDb()
    const tx = db.transaction('positions', 'readonly')
    const store = tx.objectStore('positions')
    const index = store.index('by-savedAt')
    const request = index.openCursor(null, 'prev')

    return new Promise((resolve) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
        if (cursor) {
          resolve(cursor.value as { surah: number; verse: number })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
  } catch (error) {
    logger.error('Failed to get most recent position:', {
      error,
    })
    return null
  }
}
