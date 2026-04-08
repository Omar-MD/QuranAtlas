/**
 * Shared constants used across client and service worker code.
 */

export const CACHE_DATASET = 'quran-dataset-v1'

export const Events = {
  DB_VERSION_CHANGE: 'db:version-change',
  DB_VISIBILITY_VISIBLE: 'db:visibility-visible',
  DB_DELETE_BLOCKED: 'db:delete-blocked',
  DB_QUOTA_EXCEEDED: 'db:quota-exceeded',
  ROUTER_LAUNCH_RESTORE: 'router:launch-restore',
  ROUTER_ROUTE_ERROR: 'router:route-error',
  READER_SURAH_LOADED: 'reader:surah-loaded',
  READER_POSITION_CHANGED: 'reader:position-changed',
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
  REVIEW_OPEN: 'review:open',
  REVIEW_FILTER: 'review:filter',
  MARKS_SAVED: 'marks:saved',
  MARKS_DELETED: 'marks:deleted',
  MARKS_UNDO: 'marks:undo',
  MARKS_SAVE_FAILED: 'marks:save-failed',
  READER_VERSE_RENDERED: 'reader:verse-rendered',
  SYNC_UPDATE_RECEIVED: 'sync:update-received',
  DATASET_UPDATE_AVAILABLE: 'dataset:update-available',
  DATASET_DOWNLOAD_PROGRESS: 'dataset:download-progress',
  DATASET_PENDING_CONFIRMATION: 'dataset:pending-confirmation',
  DATASET_APPLIED: 'dataset:applied',
  DATASET_UPDATE_FAILED: 'dataset:update-failed',
  STORAGE_QUOTA_WARNING: 'storage:quota-warning',
  OFFLINE_SW_TIMEOUT: 'offline:sw-timeout',
}

export const Errors = {
  INSUFFICIENT_STORAGE: 'insufficient storage',
}

export const UI = {
  UNDO_TIMEOUT_MS: 5000,
}
