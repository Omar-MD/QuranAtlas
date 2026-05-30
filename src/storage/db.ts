import Dexie, { type Table } from 'dexie'

import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION, QURAN_ATLAS_V7_STORES } from './schema'
import type { ActivationStateRecord, BookmarkRecord, DatasetMetaRecord, Riwayah, SettingRecord } from './types'

export class QuranAtlasReactDb extends Dexie {
  settings!: Table<SettingRecord, string>
  activationState!: Table<ActivationStateRecord, string>
  datasetMeta!: Table<DatasetMetaRecord, string>
  bookmarks!: Table<BookmarkRecord, [Riwayah, string]>

  constructor() {
    super(QURAN_ATLAS_DB_NAME)
    this.version(QURAN_ATLAS_DB_VERSION).stores(QURAN_ATLAS_V7_STORES)
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
}
