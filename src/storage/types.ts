import type { SavedSearchIntentV1 } from '../../shared/search'

export type SettingsKey =
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

export type OfflinePackStatus = 'installing' | 'paused-user' | 'paused-network' | 'installed' | 'failed'

export type OfflinePackKind = 'reader-core' | 'mushaf-pages'

export type OfflinePackFilePlan = { url: string; bytes: number | null }

export type OfflinePackRecord = {
  packId: string
  kind: OfflinePackKind
  label: string
  status: OfflinePackStatus
  totalBytes: number | null // null when any planned file size is unknown
  bytesDone: number // actual bytes of completed files
  fileCount: number
  filesDone: number
  files: OfflinePackFilePlan[] // embedded plan: resume needs no network
  completedUrls: string[]
  persisted: boolean
  error?: string
  startedAt: number
  updatedAt: number
  completedAt?: number
}
