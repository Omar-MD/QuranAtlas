import Dexie, { type Table } from 'dexie'

import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_V7_STORES, QURAN_ATLAS_V8_STORES, QURAN_ATLAS_V9_STORES } from './schema'
import { closeNativeReaderDb } from './native-reader-store'
import type {
  ActivationStateRecord,
  BookmarkRecord,
  DatasetMetaRecord,
  OfflinePackRecord,
  Riwayah,
  SavedSearchRecord,
  SearchPackActivationRecord,
  SearchPackStagingRecord,
  SettingRecord,
} from './types'

export class QuranAtlasReactDb extends Dexie {
  settings!: Table<SettingRecord, string>
  activationState!: Table<ActivationStateRecord, string>
  datasetMeta!: Table<DatasetMetaRecord, string>
  bookmarks!: Table<BookmarkRecord, [Riwayah, string]>
  savedSearches!: Table<SavedSearchRecord, string>
  searchPackActivations!: Table<SearchPackActivationRecord, string>
  searchPackStaging!: Table<SearchPackStagingRecord, string>
  offlinePacks!: Table<OfflinePackRecord, string>

  constructor() {
    super(QURAN_ATLAS_DB_NAME)
    this.version(7).stores(QURAN_ATLAS_V7_STORES)
    this.version(8).stores(QURAN_ATLAS_V8_STORES)
    this.version(9).stores(QURAN_ATLAS_V9_STORES)
  }
}

let db: QuranAtlasReactDb | null = null

export async function openReactDb(): Promise<QuranAtlasReactDb> {
  db ??= new QuranAtlasReactDb()
  if (!db.isOpen()) await db.open()
  return db
}

export function closeReactDb(): void {
  db?.close()
  db = null
  closeNativeReaderDb()
}
