/**
 * PWA install lifecycle + corpus download orchestration.
 * Deep module: callers request "start download" or "cancel download" and react to events.
 */

import { put, get } from '../core/db.js'
import { emit } from '../core/events.js'
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
  } catch {
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

  await setActivationState('downloading')

  // Check storage quota
  try {
    const estimate = await navigator.storage.estimate()
    if (estimate.quota && estimate.usage) {
      const available = estimate.quota - estimate.usage
      // Corpus is ~5-10 MB; require at least 20 MB free
      if (available < 20000000) {
        emit('offline:download-error', { error: 'Insufficient storage' })
        await setActivationState('none')
        return
      }
    }
  } catch {
    // Storage estimate not available, proceed anyway
  }

  // Get manifest URLs
  let urls
  try {
    urls = await getManifestUrls()
  } catch (error) {
    emit('offline:download-error', { error: error.message })
    await setActivationState('none')
    return
  }

  // Listen for SW messages
  currentMessageHandler = async (event) => {
    const { type, cached, total, error } = event.data || {}
    switch (type) {
      case 'DATASET_PROGRESS':
        emit('offline:download-progress', { cached, total })
        break
      case 'DATASET_COMPLETE':
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
        currentMessageHandler = null
        await setActivationState('cached')
        emit('offline:download-complete')
        break
      case 'DATASET_ERROR':
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
        currentMessageHandler = null
        await setActivationState('none')
        emit('offline:download-error', { error })
        break
    }
  }

  navigator.serviceWorker.addEventListener('message', currentMessageHandler)

  // Send CACHE_DATASET to SW
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_DATASET', urls })
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
    emit('offline:install-available')
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit('offline:install-complete')
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
