/**
 * PWA install lifecycle + per-category corpus download orchestration.
 *
 * Pre-N21 the API exposed a single `startDownload()` covering the whole corpus.
 * N21 (2026-05-01, audit P2.14 / R-11 / C-4 / CC-7) split offline opt-in by
 * category — see `core/sw/route-defs.ts` for the route table and
 * `offline/offline-selector.svelte` for the UI. Callers request a category
 * download; the SW caches into the per-asset-class namespace via the route
 * table.
 */

import { put, get, del } from '../core/db'
import { emit, on } from '../core/events'
import { Events, Errors } from '../core/constants'
import { logger } from '../core/logger'
import {
  ROUTE_DEFS,
  sumBytesForCategory,
  type Category,
} from '../core/sw/route-defs'
import { settings } from '../settings/state.svelte'

const QUOTA_WARN_THRESHOLD = 0.8
const ACTIVATION_KEY = 'current'

let currentMessageHandler: ((event: MessageEvent) => void) | null = null
let pendingUrls: string[] | null = null
let controllerChangeHandler: (() => void) | null = null
let _swTimeoutId: ReturnType<typeof setTimeout> | null = null

export type ActivationStatus = 'none' | 'downloading' | 'cached'

type ManifestShape = {
  files: Record<string, unknown>
  fileSizes?: Record<string, number>
}

let _manifestCache: ManifestShape | null = null

async function fetchManifest(): Promise<ManifestShape> {
  if (_manifestCache) return _manifestCache
  const res = await fetch('/dataset/manifest.json')
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`)
  const json = (await res.json()) as ManifestShape
  _manifestCache = json
  return json
}

function isAnyCategoryCached(): boolean {
  const c = settings.offlineCategories
  if (!c) return false
  if (c.text.hafs || c.text.warsh || c.text.qaloon) return true
  if (Object.values(c.audio).some(Boolean)) return true
  if (Object.values(c.pages).some(Boolean)) return true
  if (c.search) return true
  return false
}

export async function getActivationState(): Promise<ActivationStatus> {
  try {
    const record = await get('activationState', ACTIVATION_KEY)
    if (record?.status === 'downloading') return 'downloading'
    if (isAnyCategoryCached()) return 'cached'
    return 'none'
  } catch (error) {
    logger.error('Failed to get activation state:', { error })
    return 'none'
  }
}

async function setDownloading(): Promise<void> {
  await put('activationState', { id: ACTIVATION_KEY, status: 'downloading' })
}

async function clearActivation(): Promise<void> {
  try {
    await del('activationState', ACTIVATION_KEY)
  } catch {
    /* del may not exist for IDBKeyRange in some envs; best-effort */
  }
}

/**
 * Wipe-and-re-opt-in migration (N21, audit C-4). Pre-N21 the single
 * `'current'` activationState record meant "user opted into the full corpus";
 * post-N21, opt-in lives in `settings.offlineCategories` and the record only
 * tracks in-flight downloads. On first boot after upgrade, drop any legacy
 * `'cached'` marker so `getActivationState()` reports `'none'` and the
 * selector renders empty for re-opt-in.
 */
export async function initOfflineMigration(): Promise<void> {
  try {
    const record = await get('activationState', ACTIVATION_KEY)
    if (record?.status === 'cached' && !isAnyCategoryCached()) {
      await clearActivation()
    }
  } catch (error) {
    logger.warn('initOfflineMigration: read failed', { error })
  }
}

export async function checkStorageQuota(): Promise<void> {
  if (!navigator.storage?.estimate) return
  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (quota && usage !== undefined && usage / quota >= QUOTA_WARN_THRESHOLD) {
      emit(Events.STORAGE_QUOTA_WARNING, {})
    }
  } catch (error) {
    logger.warn('Storage quota check failed:', { error })
  }
}

/**
 * Sum bytes + collect URLs for one category from the dataset manifest.
 * Routing rules live in `core/sw/route-defs.ts::ROUTE_DEFS`.
 */
export async function getCategoryManifest(
  category: Category
): Promise<{ urls: string[]; totalBytes: number }> {
  const manifest = await fetchManifest()
  return sumBytesForCategory(manifest, category, location.origin)
}

/** True if a category has at least one shipped asset in the current manifest. */
export async function isCategoryAvailable(category: Category): Promise<boolean> {
  const { urls } = await getCategoryManifest(category)
  return urls.length > 0
}

/**
 * Storage estimate the selector uses to decide whether a selection fits
 * before starting a download (audit Q4 — pre-flight refuse).
 */
export async function getStorageBudget(): Promise<{ usage: number; quota: number; available: number } | null> {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota, available: Math.max(0, quota - usage) }
  } catch {
    return null
  }
}

function postMessageWithTimeout(msg: { type: string; urls?: string[] }, timeoutMs = 10000): void {
  if (!navigator.serviceWorker.controller) return

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
 * Download every asset belonging to a category. Routes the SW to the right
 * cache via the route table — text → CACHE_DATASET, audio → per-reciter, etc.
 * Pre-N21 single-corpus `startDownload()` is replaced by this; the boot path
 * cancels in-flight downloads via `cancelDownload()` (unchanged).
 */
export async function startCategoryDownload(category: Category): Promise<void> {
  const current = await getActivationState()
  if (current === 'downloading') return

  if (currentMessageHandler) {
    navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
    currentMessageHandler = null
  }

  let plan: { urls: string[]; totalBytes: number }
  try {
    plan = await getCategoryManifest(category)
  } catch (error) {
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: (error as Error).message })
    return
  }

  if (plan.urls.length === 0) {
    // Category has no assets in the current manifest (gated category, e.g.
    // audio before reciter dataset ships) — succeed silently rather than
    // emitting an error.
    emit(Events.OFFLINE_DOWNLOAD_COMPLETE, {})
    return
  }

  // Pre-flight quota gate (audit Q4).
  const budget = await getStorageBudget()
  if (budget && budget.available < plan.totalBytes) {
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: Errors.INSUFFICIENT_STORAGE })
    return
  }

  await setDownloading()

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
        cancelSwTimeout()
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
        await clearActivation()
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
        await clearActivation()
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

  if (navigator.serviceWorker.controller) {
    pendingUrls = plan.urls
    postMessageWithTimeout({ type: 'CACHE_DATASET', urls: plan.urls })

    controllerChangeHandler = () => {
      if (navigator.serviceWorker.controller && pendingUrls) {
        cancelSwTimeout()
        postMessageWithTimeout({ type: 'CACHE_DATASET', urls: pendingUrls })
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)
  } else {
    pendingUrls = null
    navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
    currentMessageHandler = null
    await clearActivation()
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: 'Service worker not ready' })
  }
}

/**
 * Backward-compatible alias for callers that historically requested a full
 * corpus download. Now equivalent to `startCategoryDownload('text')`.
 */
export async function startDownload(): Promise<void> {
  return startCategoryDownload('text')
}

export async function cancelDownload(): Promise<void> {
  if (currentMessageHandler) {
    navigator.serviceWorker.removeEventListener('message', currentMessageHandler)
    currentMessageHandler = null
  }
  if (controllerChangeHandler) {
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
    controllerChangeHandler = null
  }
  cancelSwTimeout()
  pendingUrls = null
  await clearActivation()
}

on(Events.OFFLINE_DOWNLOAD_PROGRESS, () => { checkStorageQuota() })

// Expose the pure routing surface for tests that need to assert which
// category an URL belongs to without re-implementing the table.
export { ROUTE_DEFS }

// ── PWA Install Prompt ─────────────────────────────────────────────────

let deferredPrompt: (Event & { prompt(): void; userChoice: Promise<{ outcome: string }> }) | null = null

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

export async function triggerInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}
