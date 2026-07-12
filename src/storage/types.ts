import type { SavedSearchIntentV1 } from '../../shared/search'

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
  | 'mushafEditionSetupVersion'
  | 'mushafViewMode'
  | 'mushafFitWidth'
  | 'mushafPageFraming'
  | 'currentPosition'
  | 'lastSurface'
  | 'recentSurahs'
  | 'wirdPlan'
  | 'wirdNotificationPermissionPrompted'
  | 'wirdReminderLastSentDay'

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

export type SearchPackLifecycleStatus =
  | 'not-available'
  | 'available-online'
  | 'installing'
  | 'staged'
  | 'verifying'
  | 'active'
  | 'update-available'
  | 'incompatible'
  | 'failed'
  | 'offline-unavailable'

export type SavedSearchRecord = {
  id: string
  schemaVersion: 1
  intent: SavedSearchIntentV1
  packCompatibilityKey: string
  createdAt: number
  updatedAt: number
  lastOpenedAt: number | null
  lastRunAt: number | null
}

export type SearchPackActivationRecord = {
  id: string
  packId: string
  packVersion: string
  contentHash: string
  generation: number
  status: SearchPackLifecycleStatus
  cacheName: string
  totalBytes: number
  estimatedMemoryBytes: number
  activatedAt: number | null
  verifiedAt: number | null
  createdAt: number
  updatedAt: number
  error?: string
}

export type SearchPackStagingRecord = {
  id: string
  packId: string
  packVersion: string
  contentHash: string
  status: Extract<SearchPackLifecycleStatus, 'installing' | 'staged' | 'verifying' | 'failed'>
  cacheName: string
  totalBytes: number
  verifiedBytes: number
  createdAt: number
  updatedAt: number
  error?: string
}

export type StoreRecords = {
  settings: SettingRecord
  activationState: ActivationStateRecord
  datasetMeta: DatasetMetaRecord
  bookmarks: BookmarkRecord
  savedSearches: SavedSearchRecord
  searchPackActivations: SearchPackActivationRecord
  searchPackStaging: SearchPackStagingRecord
}

export type StoreName = keyof StoreRecords
