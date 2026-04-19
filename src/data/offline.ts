/**
 * PWA install lifecycle + corpus download orchestration.
 * Deep module: callers request "start download" or "cancel download" and react to events.
 */

import { put, get } from '../core/db'
import { emit, on } from '../core/events'
import { Events, Errors } from '../core/constants'
import { logger } from '../core/logger'
import { getManifestUrls } from './dataset'

// Minimum free space required for download (20 MB)
// Corpus is ~5-10 MB; this provides buffer for growth
const MIN_FREE_SPACE_BYTES = 20 * 1024 * 1024
const QUOTA_WARN_THRESHOLD = 0.8

const ACTIVATION_KEY = 'current'
let currentMessageHandler: ((event: MessageEvent) => void) | null = null
let pendingUrls: string[] | null = null
let controllerChangeHandler: (() => void) | null = null
let _swTimeoutId: ReturnType<typeof setTimeout> | null = null

export type ActivationStatus = 'none' | 'downloading' | 'cached'

/**
 * Get the current activation state.
 */
export async function getActivationState(): Promise<ActivationStatus> {
  try {
    const record = await get('activationState', ACTIVATION_KEY)
    return (record?.status as ActivationStatus) || 'none'
  } catch (error) {
    logger.error('Failed to get activation state:', {
      error,
    })
    return 'none'
  }
}

/**
 * Set the activation state.
 */
async function setActivationState(status: ActivationStatus): Promise<void> {
  await put('activationState', { id: ACTIVATION_KEY, status })
}

/**
 * Check storage quota and emit STORAGE_QUOTA_WARNING if usage >= 80%.
 * Safe to call repeatedly — a no-op when storage API is unavailable.
 */
export async function checkStorageQuota(): Promise<void> {
  if (!navigator.storage?.estimate) {
    return
  }
  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (quota && usage !== undefined && usage / quota >= QUOTA_WARN_THRESHOLD) {
      emit(Events.STORAGE_QUOTA_WARNING, {})
    }
  } catch (error) {
    logger.warn('Storage quota check failed:', {
      error,
    })
  }
}

/**
 * Send a message to the service worker controller, scheduling a single retry
 * after `timeoutMs` if no SW response arrives. Emits OFFLINE_SW_TIMEOUT if
 * both attempts time out.
 */
function postMessageWithTimeout(msg: { type: string; urls?: string[] }, timeoutMs = 10000): void {
  if (!navigator.serviceWorker.controller) {
    return
  }

  let retried = false

  const scheduleTimeout = () => {
    if (_swTimeoutId !== null) clearTimeout(_swTimeoutId)
    _swTimeoutId = setTimeout(() => {
      _swTimeoutId = null
      if (!retried && navigator.serviceWorker.controller && pendingUrls) {
        retried = true
        navigator.serviceWorker.controller.postMessage(msg)
        scheduleTimeout()
      } else if (pendingUrls) {
        // Both attempts timed out with no SW response
        emit(Events.OFFLINE_SW_TIMEOUT, {})
      }
    }, timeoutMs)
  }

  navigator.serviceWorker.controller.postMessage(msg)
  scheduleTimeout()
}

function cancelSwTimeout(): void {
  if (_swTimeoutId !== null) {
    clearTimeout(_swTimeoutId)
    _swTimeoutId = null
  }
}

/**
 * Start downloading the corpus.
 * Emits offline:download-progress, offline:download-complete, offline:download-error.
 */
export async function startDownload(): Promise<void> {
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
    if (estimate.quota && estimate.usage !== undefined) {
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
    logger.warn('Storage estimate unavailable, proceeding with download:', {
      error,
    })
  }

  // Get manifest URLs
  let urls: string[]
  try {
    urls = await getManifestUrls()
  } catch (error) {
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: (error as Error).message })
    await setActivationState('none')
    return
  }

  // Listen for SW messages
  currentMessageHandler = async (event: MessageEvent) => {
    const { type, cached, total, error } = (event.data || {}) as {
      type?: string
      cached?: number
      total?: number
      error?: string | Error
      from?: string
      to?: string
      progress?: number
      version?: string
    }
    switch (type) {
      case 'DATASET_PROGRESS':
        cancelSwTimeout() // SW responded — cancel retry timer
        emit(Events.OFFLINE_DOWNLOAD_PROGRESS, { cached: cached ?? 0, total: total ?? 0 })
        break
      case 'DATASET_COMPLETE':
        cancelSwTimeout()
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler!)
        if (controllerChangeHandler) {
          navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
        }
        currentMessageHandler = null
        controllerChangeHandler = null
        pendingUrls = null
        await setActivationState('cached')
        emit(Events.OFFLINE_DOWNLOAD_COMPLETE, {})
        break
      case 'DATASET_ERROR':
        cancelSwTimeout()
        navigator.serviceWorker.removeEventListener('message', currentMessageHandler!)
        if (controllerChangeHandler) {
          navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
        }
        currentMessageHandler = null
        controllerChangeHandler = null
        pendingUrls = null
        await setActivationState('none')
        emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: error ?? 'Unknown error' })
        break
      case 'DATASET_PENDING_CONFIRMATION':
        cancelSwTimeout()
        emit(Events.DATASET_PENDING_CONFIRMATION, {
          from: event.data.from,
          to: event.data.to,
        })
        break
      case 'DATASET_APPLIED':
        cancelSwTimeout()
        emit(Events.DATASET_APPLIED, { version: event.data.version })
        break
      case 'DATASET_UPDATE_FAILED':
      case 'DATASET_FAILED':
        cancelSwTimeout()
        emit(Events.DATASET_UPDATE_FAILED, { error: event.data.error })
        break
      case 'DATASET_UPDATE_AVAILABLE':
        emit(Events.DATASET_UPDATE_AVAILABLE, {
          from: event.data.from,
          to: event.data.to,
        })
        break
      case 'DATASET_DOWNLOADING':
        cancelSwTimeout()
        emit(Events.DATASET_DOWNLOAD_PROGRESS, {
          progress: event.data.progress,
          version: event.data.version,
        })
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
export async function cancelDownload(): Promise<void> {
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

let deferredPrompt: (Event & { prompt(): void; userChoice: Promise<{ outcome: string }> }) | null = null

/**
 * Capture the beforeinstallprompt event.
 * Call once on app init.
 */
export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as typeof deferredPrompt
    emit(Events.OFFLINE_INSTALL_AVAILABLE, {})
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit(Events.OFFLINE_INSTALL_COMPLETE, {})
  })
}

/**
 * Trigger the install prompt. Returns true if prompt was shown.
 */
export async function triggerInstall(): Promise<boolean> {
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
 */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}
