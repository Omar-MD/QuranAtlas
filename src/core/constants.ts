/**
 * Shared constants used across client and service worker code.
 */

export const CACHE_DATASET = 'quran-dataset-v1'

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
  OFFLINE_INSTALL_AVAILABLE: 'offline:install-available',
  OFFLINE_INSTALL_COMPLETE: 'offline:install-complete',
  APP_INIT_ERROR: 'app:init-error',
  APP_READY_FOR_DOWNLOAD: 'app:ready-for-download',
  SETTINGS_THEME_CHANGED: 'settings:theme-changed',
  SETTINGS_DATA_CLEARED: 'settings:data-cleared',
  SETTINGS_FONT_SIZE_CHANGED: 'settings:font-size-changed',
  REVIEW_OPEN: 'review:open',
  REVIEW_FILTER: 'review:filter',
  MARKS_SAVED: 'marks:saved',
  MARKS_DELETED: 'marks:deleted',
  MARKS_UNDO: 'marks:undo',
  MARKS_SAVE_FAILED: 'marks:save-failed',
  READER_VERSE_RENDERED: 'reader:verse-rendered',
  AMBIENT_SURFACE: 'ambient:surface',
  SYNC_UPDATE_RECEIVED: 'sync:update-received',
  DATASET_UPDATE_AVAILABLE: 'dataset:update-available',
  DATASET_DOWNLOAD_PROGRESS: 'dataset:download-progress',
  DATASET_PENDING_CONFIRMATION: 'dataset:pending-confirmation',
  DATASET_APPLIED: 'dataset:applied',
  DATASET_UPDATE_FAILED: 'dataset:update-failed',
  STORAGE_QUOTA_WARNING: 'storage:quota-warning',
  OFFLINE_SW_TIMEOUT: 'offline:sw-timeout',
  SHEET_OPENED: 'sheet:opened',
  SHEET_CLOSED: 'sheet:closed',
  EDGES_SAVED: 'edges:saved',
  EDGES_DELETED: 'edges:deleted',
  EDGES_SAVE_FAILED: 'edges:save-failed',
  SYNC_EDGES_UPDATED: 'sync:edges-updated',
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
  'offline:install-available': Record<string, never>
  'offline:install-complete': Record<string, never>
  'app:init-error': { error: Error; context?: string }
  'app:ready-for-download': Record<string, never>
  'settings:theme-changed': { from: string; to: string }
  'settings:data-cleared': Record<string, never>
  'settings:font-size-changed': { size: string }
  'review:open': Record<string, never>
  'review:filter': { tag: string | null; surah: number | null }
  'marks:saved': { verseKey: string; tags: string[] } // tags = union of canonical keys across all 12 layers
  'marks:deleted': { verseKey: string }
  'marks:undo': { verseKey: string }
  'marks:save-failed': { verseKey: string; error: string }
  'reader:verse-rendered': { verseKey: string; element: HTMLElement }
  'ambient:surface': { reason?: string }
  'sync:update-received': { verseKeys: string[] }
  'dataset:update-available': { from: string; to: string }
  'dataset:download-progress': { progress: number; version: string }
  'dataset:pending-confirmation': { from: string; to: string }
  'dataset:applied': { version: string }
  'dataset:update-failed': { error: Error | string | unknown }
  'storage:quota-warning': Record<string, never>
  'offline:sw-timeout': Record<string, never>
  'sheet:opened': { name: string }
  'sheet:closed': { name: string }
  'edges:saved': { fromVerseKey: string; toVerseKey: string; type: string }
  'edges:deleted': { fromVerseKey: string; toVerseKey: string; type: string }
  'edges:save-failed': { fromVerseKey: string; toVerseKey: string; error: string }
  'sync:edges-updated': { edgeKeys: string[] }
}

export const Errors = {
  INSUFFICIENT_STORAGE: 'insufficient storage',
} as const

export const UI = {
  UNDO_TIMEOUT_MS: 5000,
} as const
