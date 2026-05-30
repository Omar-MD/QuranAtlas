export type SettingsKey =
  | 'onboardingComplete'
  | 'theme'
  | 'fontSize'
  | 'lineSpacing'
  | 'wordSpacing'
  | 'readerMargin'
  | 'verseSpacing'
  | 'nightMode'
  | 'riwayah'
  | 'translationId'
  | 'translationVisible'
  | 'wirdReaderStatusVisible'
  | 'quranTextStyleId'
  | 'mushafEditionId'
  | 'mushafViewMode'
  | 'currentPosition'
  | 'lastSurface'
  | 'recentSurahs'
  | 'wirdPlan'

export type SettingRecord = {
  key: SettingsKey | string
  value: unknown
}

export type Riwayah = 'qaloon'
export type ActivationStatus = 'none' | 'idle' | 'downloading' | 'cached' | 'pending-confirmation' | 'applying' | 'failed'

export type ActivationStateRecord = {
  id: 'current'
  status: ActivationStatus
  version?: string
  progress?: number
  error?: string
  stagedAt?: number
}

export type DatasetMetaRecord = {
  id: string
  version?: string
  [key: string]: unknown
}

export type BookmarkKind = 'verse' | 'page'

export type BookmarkRecord = {
  riwayah: Riwayah
  verseKey: string
  surah: number
  kind?: BookmarkKind
  page?: number
  createdAt: number
}

export type StoreRecords = {
  settings: SettingRecord
  activationState: ActivationStateRecord
  datasetMeta: DatasetMetaRecord
  bookmarks: BookmarkRecord
}

export type StoreName = keyof StoreRecords
