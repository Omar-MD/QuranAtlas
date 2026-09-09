export const QURAN_ATLAS_DB_NAME = 'quran-atlas'
export const QURAN_ATLAS_DB_VERSION = 9

export const QURAN_ATLAS_V7_STORES = {
  settings: 'key',
  activationState: 'id',
  datasetMeta: 'id',
  bookmarks: '[riwayah+verseKey], [riwayah+surah], riwayah',
} as const

export const QURAN_ATLAS_V8_STORES = {
  ...QURAN_ATLAS_V7_STORES,
  savedSearches: 'id, updatedAt, lastOpenedAt, schemaVersion, packCompatibilityKey',
  searchPackActivations: 'id, packId, contentHash, generation, status, updatedAt',
  searchPackStaging: 'id, contentHash, status, createdAt, updatedAt',
} as const

export const QURAN_ATLAS_V9_STORES = {
  ...QURAN_ATLAS_V8_STORES,
  offlinePacks: 'packId, status, updatedAt',
}

export type QuranAtlasStoreName = keyof typeof QURAN_ATLAS_V8_STORES
