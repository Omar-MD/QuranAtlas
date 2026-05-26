export const QURAN_ATLAS_DB_NAME = 'quran-atlas'
export const QURAN_ATLAS_DB_VERSION = 7

export const QURAN_ATLAS_V7_STORES = {
  settings: 'key',
  activationState: 'id',
  datasetMeta: 'id',
  bookmarks: '[riwayah+verseKey], [riwayah+surah], riwayah',
} as const

export type QuranAtlasStoreName = keyof typeof QURAN_ATLAS_V7_STORES
