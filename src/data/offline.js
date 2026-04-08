/**
 * PWA install lifecycle + corpus download orchestration.
 * Deep module: callers request "start download" or "cancel download" and react to events.
 */

import { put, get } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { Events, Errors } from '../core/constants.js'
import { getManifestUrls } from './dataset.js'

// Minimum free space required for download (20 MB)
// Corpus is ~5-10 MB; this provides buffer for growth
const MIN_FREE_SPACE_BYTES = 20 * 1024 * 1024
const QUOTA_WARN_THRESHOLD = 0.8

const ACTIVATION_KEY = 'current'
let currentMessageHandler = null
let pendingUrls = null
let controllerChangeHandler = null
let _swTimeoutId = null

/**
 * Get the current activation state.
 * @returns {Promise<'none' | 'downloading' | 'cached'>}
 */
export async function getActivationState() {
  try {
    const record = await get('activationState', ACTIVATION_KEY)
    return record?.status || 'none'
  } catch (error) {
    console.error('Failed to get activation state:', error)
    return 'none'
  }
}

/**
 * Set the activation state.
 * @param {'none' | 'downloading' | 'cached'} status
 */
async function setActivationState(status) {
  await put('activationState', { id: ACTIVATION_KEY, status })
}

/**
 * Check storage quota and emit STORAGE_QUOTA_WARNING if usage >= 80%.
 * Safe to call repeatedly — a no-op when storage API is unavailable.
 */
export async function checkStorageQuota() {
  if (!navigator.storage?.estimate) {
    return
  }
  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (quota && usage / quota >= QUOTA_WARN_THRESHOLD) {
      emit(Events.STORAGE_QUOTA_WARNING, {
        usage,
        quota,
        percent: Math.round((usage / quota) * 100),
      })
    }
  } catch (error) {
    console.warn('Storage quota check failed:', error)
  }
}

/**
 * Send a message to the service worker controller, scheduling a single retry
 * after `timeoutMs` if no SW response arrives. Emits OFFLINE_SW_TIMEOUT if
 * both attempts time out.
 * @param {{ type: string }} msg
 * @param {number} [timeoutMs=10000]
 */
function postMessageWithTimeout(msg, timeoutMs = 10000) {
  if (!navigator.serviceWorker.controller) return

  let retried = false

  const scheduleTimeout = () => {
    clearTimeout(_swTimeoutId)
    _swTimeoutId = setTimeout(() => {
      _swTimeoutId = null
      if (!retried && navigator.serviceWorker.controller && pendingUrls) {
        retried = true
        navigator.serviceWorker.controller.postMessage(msg)
        scheduleTimeout()
      } else if (pendingUrls) {
        // Both attempts timed out with no SW response
        emit(Events.OFFLINE_SW_TIMEOUT)
      }
    }, timeoutMs)
  }

  navigator.serviceWorker.controller.postMessage(msg)
  scheduleTimeout()
}

function cancelSwTimeout() {
  clearTimeout(_swTimeoutId)
  _swTimeoutId = null
}

/**
 * Start downloading the corpus.
 * Emits offline:download-progress, offline:download-complete, offline:download-error.
 */
export async function startDownload() {
  const current = await getActivationState()
  if (current === 'downloading' || current === 'cached') {
    return
  }

  // Clean up any existing listener first to prevent leaks
  if (currentMessageHandler) {
    navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
    currentMessageHandler = null
  }

  await setActivationState('downloading')

  // Check storage quota - fail hard if we can't estimate, to avoid mid-download failures
  try {
    const estimate = await navigator.storage.estimate()
    if (estimate.quota && estimate.usage) {
      const available = estimate.quota - estimate.usage
      // Corpus is ~5-10 MB; require at least 20 MB free
      if (available < MIN_FREE_SPACE_BYTES) {
        emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: Errors.INSUFFICIENT_STORAGE })
        await setActivationState('none')
        return
      }
    }
  } catch (error) {
    // Storage estimate not available - log warning but proceed with download
    // This is a "nice to have" check, not a hard requirement
    console.warn('Storage estimate unavailable, proceeding with download:', error)
    // Don't block the download - we'll handle any actual storage errors from the SW
  }

  // Get manifest URLs
  let urls
  try {
    urls = await getManifestUrls()
  } catch (error) {
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: error.message })
    await setActivationState('none')
    return
  }

  // Listen for SW messages
  currentMessageHandler = async (event) => {
    const { type, cached, total, error } = event.data || {}
    switch (type) {
      case 'DATASET_PROGRESS':
        cancelSwTimeout() // SW responded — cancel retry timer
        emit(Events.OFFLINE_DOWNLOAD_PROGRESS, { cached, total })
        break
      case 'DATASET_COMPLETE':
        cancelSwTimeout()
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
        currentMessageHandler = null
        controllerChangeHandler = null
        pendingUrls = null
        await setActivationState('cached')
        emit(Events.OFFLINE_DOWNLOAD_COMPLETE)
        break
      case 'DATASET_ERROR':
        cancelSwTimeout()
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
        currentMessageHandler = null
        controllerChangeHandler = null
        pendingUrls = null
        await setActivationState('none')
        emit(Events.OFFLINE_DOWNLOAD_ERROR, { error })
        break
    }
  }

  navigator.serviceWorker.addEventListener('message', currentMessageHandler)

  // Send CACHE_DATASET to SW with timeout + single retry
  if (navigator.serviceWorker.controller) {
    pendingUrls = urls // Store for potential re-send on controller change or retry
    postMessageWithTimeout({ type: 'CACHE_DATASET', urls })

    // Listen for controller changes (SW updates) during download
    controllerChangeHandler = () => {
      // New SW is now controlling - re-send the cache request
      if (navigator.serviceWorker.controller && pendingUrls) {
        cancelSwTimeout()
        postMessageWithTimeout({ type: 'CACHE_DATASET', urls: pendingUrls })
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)
  } else {
    // Clear pendingUrls since SW isn't ready - we won't be re-sending
    pendingUrls = null
    // SW not yet controlling this page — clean up and surface error
    navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
    currentMessageHandler = null
    await setActivationState('none')
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: 'Service worker not ready' })
  }
}

/**
 * Cancel the current download.
 */
export async function cancelDownload() {
  // Remove the SW message listener if one is active
  if (currentMessageHandler) {
    navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
    currentMessageHandler = null
  }
  // Clean up controller change listener
  if (controllerChangeHandler) {
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
    controllerChangeHandler = null
  }
  cancelSwTimeout()
  pendingUrls = null
  await setActivationState('none')
}

// Re-check quota after each download progress event
on(Events.OFFLINE_DOWNLOAD_PROGRESS, () => { checkStorageQuota() })

// ── PWA Install Prompt ─────────────────────────────────────────────────

let deferredPrompt = null

/**
 * Capture the beforeinstallprompt event.
 * Call once on app init.
 */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit(Events.OFFLINE_INSTALL_AVAILABLE)
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit(Events.OFFLINE_INSTALL_COMPLETE)
  })
}

/**
 * Trigger the install prompt. Returns true if prompt was shown.
 * @returns {Promise<boolean>}
 */
export async function triggerInstall() {
  if (!deferredPrompt) {
    return false
  }
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

/**
 * Check if the app is running in standalone mode.
 * @returns {boolean}
 */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}
