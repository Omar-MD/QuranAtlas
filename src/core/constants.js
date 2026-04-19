/**
 * Shared constants used across client and service worker code.
 */

export const CACHE_DATASET = 'quran-dataset-v1'

// ---------------------------------------------------------------------------
// Event payload typedefs — one per Events constant.
// Shapes are derived from emit() call sites in src/.
// ---------------------------------------------------------------------------

/** @typedef {{}} DbVersionChangePayload */
/** @typedef {{}} DbVisibilityVisiblePayload */
/** @typedef {{ message: string }} DbDeleteBlockedPayload */
/** @typedef {{ storeName: string, message: string }} DbQuotaExceededPayload */
/** @typedef {{}} RouterLaunchRestorePayload */
/** @typedef {{ hash: string }} RouterRouteChangePayload */
/** @typedef {{ route: string, error: Error }} RouterRouteErrorPayload */
/** @typedef {{ surah: object }} ReaderSurahLoadedPayload */
/** @typedef {{ surah: number, verse: number }} ReaderPositionChangedPayload */
/** @typedef {{ error: string, surah: number, verse: number }} ReaderPositionSaveFailedPayload */
/** @typedef {{ surah: number, verse?: number }} NavigationNavigatePayload */
/** @typedef {{ cached: number, total: number }} OfflineDownloadProgressPayload */
/** @typedef {{}} OfflineDownloadCompletePayload */
/** @typedef {{ error: string | Error }} OfflineDownloadErrorPayload */
/** @typedef {{}} OfflineInstallAvailablePayload */
/** @typedef {{}} OfflineInstallCompletePayload */
/** @typedef {{ error: Error, context?: string }} AppInitErrorPayload */
/** @typedef {{}} AppReadyForDownloadPayload */
/** @typedef {{ from: string, to: string }} SettingsThemeChangedPayload */
/** @typedef {{}} SettingsDataClearedPayload */
/** @typedef {{ size: string }} SettingsFontSizeChangedPayload */
/** @typedef {{ visible: boolean }} SettingsTranslationChangedPayload */
/** @typedef {{}} ReviewOpenPayload */
/** @typedef {{ tags: string[], surah: number|null }} ReviewFilterPayload */
/** @typedef {{ verseKey: string, tags: string[] }} MarksSavedPayload */
/** @typedef {{ verseKey: string }} MarksDeletedPayload */
/** @typedef {{ verseKey: string }} MarksUndoPayload */
/** @typedef {{ verseKey: string, error: string }} MarksSaveFailedPayload */
/** @typedef {{ verseKey: string, element: HTMLElement }} ReaderVerseRenderedPayload */
/** @typedef {{ reason: string }} AmbientSurfacePayload */
/** @typedef {{ verseKeys: string[] }} SyncUpdateReceivedPayload */
/** @typedef {{ from: string, to: string }} DatasetUpdateAvailablePayload */
/** @typedef {{ progress: number, version: string }} DatasetDownloadProgressPayload */
/** @typedef {{ from: string, to: string }} DatasetPendingConfirmationPayload */
/** @typedef {{ version: string }} DatasetAppliedPayload */
/** @typedef {{ error: Error }} DatasetUpdateFailedPayload */
/** @typedef {{}} StorageQuotaWarningPayload */
/** @typedef {{}} OfflineSwTimeoutPayload */
/** @typedef {{ name: string }} SheetOpenedPayload */
/** @typedef {{ name: string }} SheetClosedPayload */

export const Events = {
  DB_VERSION_CHANGE: 'db:version-change',
  DB_VISIBILITY_VISIBLE: 'db:visibility-visible',
  DB_DELETE_BLOCKED: 'db:delete-blocked',
  DB_QUOTA_EXCEEDED: 'db:quota-exceeded',
  ROUTER_LAUNCH_RESTORE: 'router:launch-restore',
  ROUTER_ROUTE_CHANGE: 'router:route-change',
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
  SETTINGS_FONT_SIZE_CHANGED: 'settings:font-size-changed',
  SETTINGS_TRANSLATION_CHANGED: 'settings:translation-changed',
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
}

export const Errors = {
  INSUFFICIENT_STORAGE: 'insufficient storage',
}

export const UI = {
  UNDO_TIMEOUT_MS: 5000,
}
