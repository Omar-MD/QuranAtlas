// Pure type declarations for active IndexedDB records and shared runtime
// contracts. Keeping this file closure-free avoids pulling the DB
// connection runtime through type-only imports (audit C-2 / CC-2 / R-07,
// 2026-04-29).

export type Riwayah = 'hafs' | 'warsh' | 'qaloon'

export interface BookmarkRecord {
  riwayah: Riwayah
  verseKey: string
  surah: number
  createdAt: number
}

export type ActivationStatus =
  | 'none'
  | 'idle'
  | 'downloading'
  | 'cached'
  | 'pending-confirmation'
  | 'applying'
  | 'failed'

export interface ActivationStateRecord {
  id: 'current'
  status: ActivationStatus
  version?: string
  progress?: number
  error?: string
  stagedAt?: number
}

export type StoreRecords = {
  settings: { key: string; value: unknown }
  activationState: ActivationStateRecord
  datasetMeta: { id: string; version?: string; [k: string]: unknown }
  bookmarks: BookmarkRecord
}

export type StoreName = keyof StoreRecords
