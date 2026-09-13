import Dexie, { type Table } from 'dexie'

import {
  QURAN_ATLAS_DB_NAME,
  QURAN_ATLAS_DB_VERSION,
  QURAN_ATLAS_V10_STORES,
  QURAN_ATLAS_V11_STORES,
  QURAN_ATLAS_V7_STORES,
  QURAN_ATLAS_V8_STORES,
  QURAN_ATLAS_V9_STORES,
} from './schema'
import { closeNativeReaderDb } from './native-reader-store'
import type { BookmarkRecord, OfflinePackRecord, Riwayah, SettingRecord } from './types'

let upgradeBlocked = false
const upgradeListeners = new Set<() => void>()

export function isReaderUpgradeBlocked(): boolean {
  return upgradeBlocked
}

export function subscribeReaderUpgrade(listener: () => void): () => void {
  upgradeListeners.add(listener)
  return () => {
    upgradeListeners.delete(listener)
  }
}

function setUpgradeBlocked(blocked: boolean): void {
  if (upgradeBlocked === blocked) return
  upgradeBlocked = blocked
  for (const listener of upgradeListeners) listener()
}

export class QuranAtlasReactDb extends Dexie {
  settings!: Table<SettingRecord, string>
  bookmarks!: Table<BookmarkRecord, [Riwayah, string]>
  offlinePacks!: Table<OfflinePackRecord, string>

  constructor() {
    super(QURAN_ATLAS_DB_NAME)
    this.on('blocked', () => {
      setUpgradeBlocked(true)
    })
    this.version(7).stores(QURAN_ATLAS_V7_STORES)
    this.version(8).stores(QURAN_ATLAS_V8_STORES)
    this.version(9).stores(QURAN_ATLAS_V9_STORES)
    // Version 10 must stay registered explicitly: the savedSearches drop in
    // version 11 only fires when the chain from older installations is intact.
    this.version(10).stores(QURAN_ATLAS_V10_STORES)
    this.version(QURAN_ATLAS_DB_VERSION).stores(QURAN_ATLAS_V11_STORES)
  }
}

let db: QuranAtlasReactDb | null = null

export async function openReactDb(): Promise<QuranAtlasReactDb> {
  db ??= new QuranAtlasReactDb()
  try {
    if (!db.isOpen()) await db.open()
  } finally {
    setUpgradeBlocked(false)
  }
  return db
}

export function closeReactDb(): void {
  setUpgradeBlocked(false)
  db?.close()
  db = null
  closeNativeReaderDb()
}
