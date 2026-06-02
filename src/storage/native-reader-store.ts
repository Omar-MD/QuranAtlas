import { QURAN_ATLAS_DB_NAME } from './schema'
import type { BookmarkRecord, Riwayah, SettingRecord } from './types'

type NativeWriteGuard = () => boolean

export async function openNativeReaderDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(QURAN_ATLAS_DB_NAME)
    request.onupgradeneeded = () => applyNativeSchema(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function closeNativeReaderDb(): void {
  // Native reader operations use short-lived IndexedDB connections.
}

export async function readNativeSetting(key: string): Promise<SettingRecord | undefined> {
  return withNativeReaderDb(async (db) => {
    const tx = db.transaction('settings', 'readonly')
    const done = transactionDone(tx)
    const record = await requestToPromise<SettingRecord | undefined>(tx.objectStore('settings').get(key))
    await done
    return record
  })
}

export async function readNativeSettings(keys: readonly string[]): Promise<Array<SettingRecord | undefined>> {
  return withNativeReaderDb(async (db) => {
    const tx = db.transaction('settings', 'readonly')
    const done = transactionDone(tx)
    const store = tx.objectStore('settings')
    const records = await Promise.all(keys.map((key) => requestToPromise<SettingRecord | undefined>(store.get(key))))
    await done
    return records
  })
}

export async function writeNativeSetting(record: SettingRecord, shouldWrite: NativeWriteGuard = () => true): Promise<boolean> {
  return withNativeReaderDb(async (db) => {
    if (!shouldWrite()) return false
    const tx = db.transaction('settings', 'readwrite')
    tx.objectStore('settings').put(record)
    await transactionDone(tx)
    return true
  })
}

export async function writeNativeSettings(records: SettingRecord[], shouldWrite: NativeWriteGuard = () => true): Promise<boolean> {
  return withNativeReaderDb(async (db) => {
    if (!shouldWrite()) return false
    const tx = db.transaction('settings', 'readwrite')
    const store = tx.objectStore('settings')
    for (const record of records) store.put(record)
    await transactionDone(tx)
    return true
  })
}

export async function resetNativeReaderStores(settings: SettingRecord[]): Promise<void> {
  await withNativeReaderDb(async (db) => {
    const tx = db.transaction(['settings', 'activationState', 'datasetMeta', 'bookmarks'], 'readwrite')
    tx.objectStore('settings').clear()
    tx.objectStore('activationState').clear()
    tx.objectStore('datasetMeta').clear()
    tx.objectStore('bookmarks').clear()
    const settingsStore = tx.objectStore('settings')
    for (const record of settings) settingsStore.put(record)
    await transactionDone(tx)
  })
}

export async function listNativeBookmarks(riwayah: Riwayah): Promise<BookmarkRecord[]> {
  return withNativeReaderDb(async (db) => {
    const tx = db.transaction('bookmarks', 'readonly')
    const done = transactionDone(tx)
    const store = tx.objectStore('bookmarks')
    const index = store.index('riwayah')
    const rows = await requestToPromise<BookmarkRecord[]>(index.getAll(riwayah))
    await done
    return rows.sort(compareBookmarks)
  })
}

export function nativeSettingsReader() {
  return {
    settings: {
      get: readNativeSetting,
    },
  }
}

function applyNativeSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
  if (!db.objectStoreNames.contains('activationState')) db.createObjectStore('activationState', { keyPath: 'id' })
  if (!db.objectStoreNames.contains('datasetMeta')) db.createObjectStore('datasetMeta', { keyPath: 'id' })
  if (!db.objectStoreNames.contains('bookmarks')) {
    const bookmarks = db.createObjectStore('bookmarks', { keyPath: ['riwayah', 'verseKey'] })
    bookmarks.createIndex('riwayah_surah', ['riwayah', 'surah'], { unique: false })
    bookmarks.createIndex('riwayah', 'riwayah', { unique: false })
  }
}

async function withNativeReaderDb<T>(callback: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openNativeReaderDb()
  try {
    return await callback(db)
  } finally {
    db.close()
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function verseNumber(verseKey: string): number {
  const [, verse] = verseKey.split(':')
  const parsed = Number(verse)
  return Number.isFinite(parsed) ? parsed : 0
}

function compareBookmarks(a: BookmarkRecord, b: BookmarkRecord): number {
  const aPage = a.kind === 'page' ? a.page ?? 0 : null
  const bPage = b.kind === 'page' ? b.page ?? 0 : null
  if (aPage !== null || bPage !== null) {
    if (aPage !== null && bPage !== null) return aPage - bPage
    return aPage !== null ? 1 : -1
  }
  return a.surah - b.surah || verseNumber(a.verseKey) - verseNumber(b.verseKey)
}
