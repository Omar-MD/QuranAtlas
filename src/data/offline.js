/**
 * PWA install lifecycle + corpus download orchestration.
 * Deep module: callers request "start download" or "cancel download" and react to events.
 */

import { put, get } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events, Errors } from '../core/constants.js'
import { getManifestUrls } from './dataset.js'

const ACTIVATION_KEY = 'current'
let currentMessageHandler = null

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
      if (available < 20000000) {
        emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: Errors.INSUFFICIENT_STORAGE })
        await setActivationState('none')
        return
      }
    }
  } catch (error) {
    // Storage estimate not available - fail hard to prevent mid-download failures
    console.error('Storage estimate failed:', error)
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: 'Cannot verify storage availability' })
    await setActivationState('none')
    return
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
        emit(Events.OFFLINE_DOWNLOAD_PROGRESS, { cached, total })
        break
      case 'DATASET_COMPLETE':
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
        currentMessageHandler = null
        await setActivationState('cached')
        emit(Events.OFFLINE_DOWNLOAD_COMPLETE)
        break
      case 'DATASET_ERROR':
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
        currentMessageHandler = null
        await setActivationState('none')
        emit(Events.OFFLINE_DOWNLOAD_ERROR, { error })
        break
    }
  }

  navigator.serviceWorker.addEventListener('message', currentMessageHandler)

  // Send CACHE_DATASET to SW
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_DATASET', urls })
  } else {
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
  await setActivationState('none')
}

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
