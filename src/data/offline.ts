/**
 * PWA install lifecycle + per-category corpus download orchestration.
 *
 * Pre-N21 the API exposed a single `startDownload()` covering the whole corpus.
 * N21 (2026-05-01, audit P2.14 / R-11 / C-4 / CC-7) split offline opt-in by
 * category — see `core/sw/route-defs.ts` for the route table and
 * `configure/offline-selector.svelte` for the UI. Callers request a category
 * download; the SW caches into the per-asset-class namespace via the route
 * table.
 */

import { put, get, del } from '../core/db'
import { emit, on } from '../core/events'
import { CACHE_DATASET, Events, Errors } from '../core/constants'
import { logger } from '../core/logger'
import {
  ROUTE_DEFS,
  cacheNameFor,
  sumBytesForCategory,
  type Category,
} from '../infra/sw/route-defs'
import {
  beginRiwayahInstall,
  failRiwayahInstall,
  loadRiwayah,
  persistRiwayahSelection,
  refreshRiwayahPackageStatus,
} from '../packs/riwayah'
import { settings, riwayahInstallIntent } from '../core/settings.svelte'
import { getTextAsset } from '../packs/text-assets'
import { getMushafAsset } from '../packs/mushaf-assets'
import type { TextAsset, MushafAsset } from '../packs/asset-types'
import {
  cacheNamesForRiwayahPackage,
  isRiwayahPackageFullyCached,
  planRiwayahPackageInstall,
} from './riwayah-packages'
import type { Riwayah } from '../packs/riwayah'
import { loadOfflineCategories } from '../continuity/offline-categories'

const QUOTA_WARN_THRESHOLD = 0.8
const ACTIVATION_KEY = 'current'
const ACTIVE_DELETE_DISABLED_REASON = 'Switch to another compatible asset before deleting.'

let currentMessageHandler: ((event: MessageEvent) => void) | null = null
let pendingUrls: string[] | null = null
let controllerChangeHandler: (() => void) | null = null
let _swTimeoutId: ReturnType<typeof setTimeout> | null = null

export type ActivationStatus = 'none' | 'downloading' | 'cached'

type ManifestShape = {
  files: Array<{
    path: string
    lane: 'text' | 'knowledge' | 'reflection' | 'search' | 'pages'
    category: string
    bytes?: number
  }>
}

let _manifestCache: ManifestShape | null = null
type SourceAssetKind = 'translation' | 'tafsir'
type SourceAssetGroup = {
  id: string
  type: SourceAssetKind
  totalBytes: number
  files: Array<{ path: string; bytes?: number }>
}
type SourceAssetsShape = {
  version: number
  translations: SourceAssetGroup[]
  tafsir: SourceAssetGroup[]
}

let _sourceAssetsCache: SourceAssetsShape | null = null

async function fetchManifest(): Promise<ManifestShape> {
  if (_manifestCache) return _manifestCache
  const res = await fetch('/dataset/manifest.json')
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`)
  const json = (await res.json()) as ManifestShape
  _manifestCache = json
  return json
}

async function fetchSourceAssets(): Promise<SourceAssetsShape> {
  if (_sourceAssetsCache) return _sourceAssetsCache
  const res = await fetch('/dataset/indexes/source-assets.json')
  if (!res.ok) throw new Error(`Failed to fetch source asset index: ${res.status}`)
  const json = (await res.json()) as SourceAssetsShape
  _sourceAssetsCache = json
  return json
}

async function isAnyCategoryCached(): Promise<boolean> {
  const c = await loadOfflineCategories()
  if (!c) return false
  if (Object.values(c.text.riwayat).some(Boolean)) return true
  if (Object.values(c.text.translations).some(Boolean)) return true
  if (Object.values(c.text.tafsir).some(Boolean)) return true
  if (Object.values(c.pages).some(Boolean)) return true
  if (c.search) return true
  return false
}

export async function getActivationState(): Promise<ActivationStatus> {
  try {
    const record = await get('activationState', ACTIVATION_KEY)
    if (record?.status === 'downloading') return 'downloading'
    if (await isAnyCategoryCached()) return 'cached'
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
    if (record?.status === 'cached' && !(await isAnyCategoryCached())) {
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

export async function getPageAssetManifest(
  riwayah: Riwayah,
): Promise<{ urls: string[]; totalBytes: number }> {
  const manifest = await fetchManifest()
  const prefix = `mushaf-pages/${riwayah}/`
  const urls: string[] = []
  let totalBytes = 0
  for (const file of manifest.files) {
    if (!file.path.startsWith(prefix)) continue
    const url = new URL(`/dataset/${file.path}`, location.origin)
    if (cacheNameFor(url)?.startsWith(`qa-pages-${riwayah}-`)) {
      urls.push(`/dataset/${file.path}`)
      totalBytes += typeof file.bytes === 'number' ? file.bytes : 0
    }
  }
  return { urls, totalBytes }
}

export async function getSourceAssetManifest(
  kind: SourceAssetKind,
  id: string,
): Promise<{ urls: string[]; totalBytes: number }> {
  const assets = await fetchSourceAssets()
  const list = kind === 'translation' ? assets.translations : assets.tafsir
  const group = list.find((entry) => entry.id === id)
  if (!group) return { urls: [], totalBytes: 0 }
  return {
    urls: group.files.map((file) => `/dataset/${file.path}`),
    totalBytes: group.totalBytes,
  }
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

export async function hasStorageForBytes(bytes: number): Promise<boolean> {
  const budget = await getStorageBudget()
  return !budget || budget.available >= bytes
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
 * cache via the route table — text → CACHE_DATASET, pages → per-riwayah, etc.
 * Pre-N21 single-corpus `startDownload()` is replaced by this; the boot path
 * cancels in-flight downloads via `cancelDownload()` (unchanged).
 */
export async function startCategoryDownload(category: Category): Promise<void> {
  if (category === 'pages') {
    throw new Error('Use startPageAssetDownload(riwayah) for Mushaf page assets.')
  }

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
    // Category has no assets in the current manifest (for example a gated
    // reader-first lane) — succeed silently rather than emitting an error.
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

export async function removeCategoryDownload(category: Category): Promise<void> {
  if (category === 'pages') {
    throw new Error('Use removePageAssetDownload(riwayah) for Mushaf page assets.')
  }

  const plan = await getCategoryManifest(category)
  if (plan.urls.length === 0 || typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_DATASET)
  await Promise.all(plan.urls.map((url) => cache.delete(url)))
}

export async function startPageAssetDownload(riwayah: Riwayah): Promise<boolean> {
  const plan = await getPageAssetManifest(riwayah)
  if (plan.urls.length === 0) return false
  if (!(await hasStorageForBytes(plan.totalBytes))) {
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: Errors.INSUFFICIENT_STORAGE })
    return false
  }
  await setDownloading()
  if (typeof caches === 'undefined') {
    await clearActivation()
    return false
  }
  try {
    for (let i = 0; i < plan.urls.length; i += 1) {
      const url = plan.urls[i]!
      const absolute = new URL(url, location.origin)
      const cacheName = cacheNameFor(absolute)
      if (!cacheName) throw new Error(`No page cache route for ${url}`)
      const cache = await caches.open(cacheName)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
      await cache.put(absolute.href, response.clone())
      emit(Events.OFFLINE_DOWNLOAD_PROGRESS, { cached: i + 1, total: plan.urls.length })
    }
    emit(Events.OFFLINE_DOWNLOAD_COMPLETE, {})
  } finally {
    await clearActivation()
  }
  return true
}

export async function removePageAssetDownload(riwayah: Riwayah): Promise<void> {
  const plan = await getPageAssetManifest(riwayah)
  if (typeof caches === 'undefined') return
  if (plan.urls.length === 0) {
    const cacheName = cacheNameFor(new URL(`/dataset/mushaf-pages/${riwayah}/manifest.json`, location.origin))
    if (cacheName) await caches.delete(cacheName)
    return
  }
  await Promise.all(plan.urls.map(async (url) => {
    const absolute = new URL(url, location.origin)
    const cacheName = cacheNameFor(absolute)
    if (!cacheName) return
    const cache = await caches.open(cacheName)
    await cache.delete(absolute.href)
  }))
}

function responseUrlForCache(url: string): string {
  return new URL(url, location.origin).href
}

async function cacheHasUrl(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  const absolute = new URL(url, location.origin)
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return false
  const cache = await caches.open(cacheName)
  return Boolean((await cache.match(responseUrlForCache(url))) || (await cache.match(url)))
}

async function cacheAssetUrl(url: string, response: Response): Promise<void> {
  const absolute = new URL(url, location.origin)
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) throw new Error(`No asset cache route for ${url}`)
  const cache = await caches.open(cacheName)
  await cache.put(responseUrlForCache(url), response.clone())
  await cache.put(url, response.clone())
}

async function deleteAssetUrl(url: string): Promise<void> {
  if (typeof caches === 'undefined') return
  const absolute = new URL(url, location.origin)
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return
  const cache = await caches.open(cacheName)
  await cache.delete(responseUrlForCache(url))
  await cache.delete(url)
}

async function installConcreteAsset(asset: TextAsset | MushafAsset): Promise<boolean> {
  if (asset.files.length === 0) return false
  if (!(await hasStorageForBytes(asset.totalBytes))) {
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: Errors.INSUFFICIENT_STORAGE })
    return false
  }
  if (typeof caches === 'undefined') return false
  await setDownloading()
  try {
    for (let i = 0; i < asset.files.length; i += 1) {
      const file = asset.files[i]!
      const response = await fetch(file.url)
      if (!response.ok) throw new Error(`Failed to fetch ${file.url}: ${response.status}`)
      await cacheAssetUrl(file.url, response)
      emit(Events.OFFLINE_DOWNLOAD_PROGRESS, { cached: i + 1, total: asset.files.length })
    }
    for (const file of asset.files) {
      if (!(await cacheHasUrl(file.url))) {
        throw new Error(`Failed to verify cached asset ${file.url}`)
      }
    }
    emit(Events.OFFLINE_DOWNLOAD_COMPLETE, {})
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: message })
    return false
  } finally {
    await clearActivation()
  }
}

export async function installTextAsset(riwayah: Riwayah, textStyleId: string): Promise<boolean> {
  const asset = await getTextAsset(riwayah, textStyleId)
  if (!asset) return false
  return installConcreteAsset(asset)
}

export async function installMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<boolean> {
  const asset = await getMushafAsset(riwayah, mushafEditionId)
  if (!asset) return false
  return installConcreteAsset(asset)
}

async function assertCanRemoveTextAsset(asset: TextAsset): Promise<void> {
  if (
    settings.riwayah === asset.riwayah
    && settings.quranTextStyleId === asset.textStyleId
    && !asset.shipped
  ) {
    throw new Error(ACTIVE_DELETE_DISABLED_REASON)
  }
}

async function assertCanRemoveMushafAsset(asset: MushafAsset): Promise<void> {
  if (
    settings.riwayah === asset.riwayah
    && settings.mushafEditionId === asset.mushafEditionId
    && !asset.shipped
  ) {
    throw new Error(ACTIVE_DELETE_DISABLED_REASON)
  }
}

export async function removeTextAsset(riwayah: Riwayah, textStyleId: string): Promise<void> {
  const asset = await getTextAsset(riwayah, textStyleId)
  if (!asset) return
  await assertCanRemoveTextAsset(asset)
  await Promise.all(asset.files.map((file) => deleteAssetUrl(file.url)))
}

export async function removeMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<void> {
  const asset = await getMushafAsset(riwayah, mushafEditionId)
  if (!asset) return
  await assertCanRemoveMushafAsset(asset)
  await Promise.all(asset.files.map((file) => deleteAssetUrl(file.url)))
  if (asset.files.length === 0 && typeof caches !== 'undefined') {
    const cacheName = cacheNameFor(new URL(`/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/manifest.json`, location.origin))
    if (cacheName) await caches.delete(cacheName)
  }
}

async function cachePackageUrl(riwayah: Riwayah, url: string, response: Response): Promise<void> {
  const absolute = new URL(url, location.origin)
  const packageCaches = cacheNamesForRiwayahPackage(riwayah)
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) throw new Error(`No package cache route for ${url}`)
  const expectedPageCache = packageCaches.pages
  const expectedTextCache = packageCaches.text
  if (cacheName !== expectedTextCache && cacheName !== expectedPageCache) {
    throw new Error(`Unexpected package cache route for ${url}`)
  }
  const cache = await caches.open(cacheName)
  await cache.put(responseUrlForCache(url), response.clone())
  await cache.put(url, response.clone())
}

export async function startRiwayahPackageInstall(riwayah: Riwayah): Promise<boolean> {
  const plan = await planRiwayahPackageInstall(riwayah)
  if (plan.urls.length === 0) {
    failRiwayahInstall(riwayah, 'This riwayah package is unavailable in this build.')
    emit(Events.OFFLINE_RIWAYAH_PACKAGE_ERROR, { riwayah, error: 'This riwayah package is unavailable in this build.' })
    return false
  }
  const budget = await getStorageBudget()
  if (budget && budget.available < plan.totalBytes) {
    failRiwayahInstall(riwayah, Errors.INSUFFICIENT_STORAGE)
    emit(Events.OFFLINE_RIWAYAH_PACKAGE_ERROR, { riwayah, error: Errors.INSUFFICIENT_STORAGE })
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: Errors.INSUFFICIENT_STORAGE })
    return false
  }
  if (typeof caches === 'undefined') {
    failRiwayahInstall(riwayah, 'Cache Storage is unavailable.')
    emit(Events.OFFLINE_RIWAYAH_PACKAGE_ERROR, { riwayah, error: 'Cache Storage is unavailable.' })
    return false
  }

  if (!beginRiwayahInstall(riwayah)) return false
  await setDownloading()
  try {
    for (let i = 0; i < plan.urls.length; i += 1) {
      const url = plan.urls[i]!
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
      await cachePackageUrl(riwayah, url, response)
      const payload = { riwayah, cached: i + 1, total: plan.urls.length }
      emit(Events.OFFLINE_RIWAYAH_PACKAGE_PROGRESS, payload)
      emit(Events.OFFLINE_DOWNLOAD_PROGRESS, { cached: i + 1, total: plan.urls.length })
    }
    const status = await refreshRiwayahPackageStatus(riwayah)
    if (status.kind !== 'installed') {
      throw new Error(`Installed ${riwayah} package could not be verified.`)
    }
    if (riwayahInstallIntent.requested === riwayah) {
      riwayahInstallIntent.requested = null
    }
    emit(Events.OFFLINE_DOWNLOAD_COMPLETE, {})
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failRiwayahInstall(riwayah, message)
    emit(Events.OFFLINE_RIWAYAH_PACKAGE_ERROR, { riwayah, error: message })
    emit(Events.OFFLINE_DOWNLOAD_ERROR, { error: message })
    return false
  } finally {
    await clearActivation()
  }
}

export async function retryRiwayahPackageInstall(riwayah: Riwayah): Promise<boolean> {
  await refreshRiwayahPackageStatus(riwayah).catch(() => undefined)
  return startRiwayahPackageInstall(riwayah)
}

export async function removeRiwayahPackage(riwayah: Riwayah): Promise<void> {
  if (riwayah === 'qaloon') throw new Error('Qaloon is the baseline package and cannot be removed.')
  if ((await loadRiwayah()) === riwayah) {
    const qaloonStatus = await refreshRiwayahPackageStatus('qaloon')
    const offlineQaloonReady = typeof navigator !== 'undefined' && navigator.onLine === false
      ? await isRiwayahPackageFullyCached('qaloon').catch(() => false)
      : true
    if (qaloonStatus.kind !== 'installed' || !offlineQaloonReady) {
      throw new Error('Cannot remove the active package because Qaloon could not be activated.')
    }
    const switched = await persistRiwayahSelection('qaloon')
    if (!switched) {
      throw new Error('Cannot remove the active package because Qaloon could not be activated.')
    }
  }

  const plan = await planRiwayahPackageInstall(riwayah)
  if (typeof caches !== 'undefined') {
    const cacheNames = cacheNamesForRiwayahPackage(riwayah)
    for (const url of plan.urls) {
      const absolute = new URL(url, location.origin)
      const cacheName = cacheNameFor(absolute)
      if (!cacheName) continue
      const cache = await caches.open(cacheName)
      await cache.delete(responseUrlForCache(url))
      await cache.delete(url)
    }
    if (plan.urls.length === 0) {
      await caches.delete(cacheNames.pages)
    }
  }
  await refreshRiwayahPackageStatus(riwayah)
}

export async function startSourceAssetDownload(kind: SourceAssetKind, id: string): Promise<boolean> {
  const plan = await getSourceAssetManifest(kind, id)
  if (plan.urls.length === 0) return false
  if (!(await hasStorageForBytes(plan.totalBytes))) return false
  if (typeof caches === 'undefined') return true
  const cache = await caches.open(CACHE_DATASET)
  await Promise.all(plan.urls.map(async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
    await cache.put(url, response)
  }))
  return true
}

export async function removeSourceAssetDownload(kind: SourceAssetKind, id: string): Promise<void> {
  const plan = await getSourceAssetManifest(kind, id)
  if (plan.urls.length === 0 || typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_DATASET)
  await Promise.all(plan.urls.map((url) => cache.delete(url)))
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
