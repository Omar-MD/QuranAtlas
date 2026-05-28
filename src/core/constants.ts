/**
 * Shared constants used across client and service worker code.
 */

export const CACHE_DATASET = 'quran-dataset-v2'
export const DATASET_RIWAYAH_PACKAGES_PATH = '/dataset/indexes/riwayah-packages.json'
export const DATASET_TEXT_ASSETS_PATH = '/dataset/indexes/text-assets.json'
export const DATASET_MUSHAF_ASSETS_PATH = '/dataset/indexes/mushaf-assets.json'

// ---------------------------------------------------------------------------
// Event payload types — one per Events constant.
// ---------------------------------------------------------------------------

export const Events = {
  DB_VERSION_CHANGE: 'db:version-change',
  DB_VISIBILITY_VISIBLE: 'db:visibility-visible',
  DB_DELETE_BLOCKED: 'db:delete-blocked',
  DB_QUOTA_EXCEEDED: 'db:quota-exceeded',
  ROUTER_LAUNCH_RESTORE: 'router:launch-restore',
  ROUTER_ROUTE_CHANGE: 'router:route-change',
  ROUTER_ROUTE_ERROR: 'router:route-error',
  READER_POSITION_SAVE_FAILED: 'reader:position-save-failed',
  NAVIGATION_NAVIGATE: 'navigation:navigate',
  OFFLINE_DOWNLOAD_PROGRESS: 'offline:download-progress',
  OFFLINE_DOWNLOAD_COMPLETE: 'offline:download-complete',
  OFFLINE_DOWNLOAD_ERROR: 'offline:download-error',
  OFFLINE_RIWAYAH_PACKAGE_PROGRESS: 'offline:riwayah-package-progress',
  OFFLINE_RIWAYAH_PACKAGE_ERROR: 'offline:riwayah-package-error',
  OFFLINE_INSTALL_AVAILABLE: 'offline:install-available',
  OFFLINE_INSTALL_COMPLETE: 'offline:install-complete',
  APP_INIT_ERROR: 'app:init-error',
  APP_READY_FOR_DOWNLOAD: 'app:ready-for-download',
  APP_UPDATE_AVAILABLE: 'app:update-available',
  SETTINGS_DATA_CLEARED: 'settings:data-cleared',
  SETTINGS_RIWAYAH_CHANGED: 'settings:riwayah-changed',
  READER_VERSE_RENDERED: 'reader:verse-rendered',
  AMBIENT_SURFACE: 'ambient:surface',
  DATASET_UPDATE_AVAILABLE: 'dataset:update-available',
  DATASET_DOWNLOAD_PROGRESS: 'dataset:download-progress',
  DATASET_PENDING_CONFIRMATION: 'dataset:pending-confirmation',
  DATASET_APPLIED: 'dataset:applied',
  DATASET_UPDATE_FAILED: 'dataset:update-failed',
  STORAGE_QUOTA_WARNING: 'storage:quota-warning',
  OFFLINE_SW_TIMEOUT: 'offline:sw-timeout',
  SHEET_OPENED: 'sheet:opened',
  SHEET_CLOSED: 'sheet:closed',
  BOOKMARKS_SAVED: 'bookmarks:saved',
  BOOKMARKS_DELETED: 'bookmarks:deleted',
  BOOKMARKS_SAVE_FAILED: 'bookmarks:save-failed',
  SYNC_BOOKMARKS_UPDATED: 'sync:bookmarks-updated',
  BOOKMARK_JUMP_LANDED: 'bookmark:jump-landed',
  SETTINGS_RECENT_SURAHS_UPDATED: 'settings:recent-surahs-updated',
} as const

export type EventName = typeof Events[keyof typeof Events]

export type EventPayloads = {
  'db:version-change': Record<string, never>
  'db:visibility-visible': Record<string, never>
  'db:delete-blocked': { message: string }
  'db:quota-exceeded': { storeName: string; message: string }
  'router:launch-restore': Record<string, never>
  'router:route-change': { hash: string }
  'router:route-error': { route: string; error: Error }
  'reader:position-save-failed': { error: string; surah: number; verse: number }
  'navigation:navigate': { surah: number; verse?: number }
  'offline:download-progress': { cached: number; total: number }
  'offline:download-complete': Record<string, never>
  'offline:download-error': { error: string | Error }
  'offline:riwayah-package-progress': { riwayah: 'qaloon'; cached: number; total: number }
  'offline:riwayah-package-error': { riwayah: 'qaloon'; error: string | Error }
  'offline:install-available': Record<string, never>
  'offline:install-complete': Record<string, never>
  'app:init-error': { error: Error; context?: string }
  'app:ready-for-download': Record<string, never>
  'app:update-available': Record<string, never>
  'settings:data-cleared': Record<string, never>
  'settings:riwayah-changed': { from: 'qaloon'; to: 'qaloon' }
  'reader:verse-rendered': { verseKey: string; element: HTMLElement }
  'ambient:surface': { reason?: string }
  'dataset:update-available': { from: string; to: string }
  'dataset:download-progress': { progress: number; version: string }
  'dataset:pending-confirmation': { from: string; to: string }
  'dataset:applied': { version: string }
  'dataset:update-failed': { error: Error | string | unknown }
  'storage:quota-warning': Record<string, never>
  'offline:sw-timeout': Record<string, never>
  'sheet:opened': { name: string }
  'sheet:closed': { name: string }
  'bookmarks:saved': { verseKey: string; riwayah: 'qaloon' }
  'bookmarks:deleted': { verseKey: string; riwayah: 'qaloon' }
  'bookmarks:save-failed': { verseKey: string; riwayah: 'qaloon'; error: string }
  'sync:bookmarks-updated': { verseKeys: string[]; riwayah: 'qaloon' }
  'bookmark:jump-landed': { verseKey: string }
  'settings:recent-surahs-updated': { surahs: number[] }
}

export const Errors = {
  INSUFFICIENT_STORAGE: 'insufficient storage',
} as const

export const UI = {
  UNDO_TIMEOUT_MS: 5000,
} as const
