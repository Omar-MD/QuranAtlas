/**
 * Service worker for QuranAtlas.
 * Handles caching, dataset downloads, and update detection.
 *
 * Message types:
 * - CACHE_DATASET: Download full corpus
 * - APPLY_DATASET_UPDATE: User-confirmed update (major semver)
 * - SKIP_WAITING: Force SW activation
 * - PURGE_DATASET_CACHE: Clear corpus cache
 */

import { precacheAndRoute } from 'workbox-precaching'
import { CACHE_DATASET } from './core/constants.js'

// Workbox injectManifest will populate this array
precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener('install', (_event) => {
  // Don't call skipWaiting() unconditionally - wait for user prompt
  // The SKIP_WAITING message case handles user-initiated activation
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
  // Phase 3: checkForUpdate() will be added here
})

self.addEventListener('fetch', (_event) => {
  // Workbox handles caching; this is for custom fetch logic if needed
})

self.addEventListener('message', (event) => {
  if (!event.source || !event.source.url.startsWith(self.location.origin)) {
    return
  }

  const { type, urls } = event.data || {}

  switch (type) {
    case CACHE_DATASET:
      handleCacheDataset(event, urls)
      break
    case 'APPLY_DATASET_UPDATE':
      handleApplyUpdate(event)
      break
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'PURGE_DATASET_CACHE':
      handlePurgeCache(event)
      break
    default:
      break
  }
})

const RETRY_DELAYS = [1000, 2000, 5000]
const MAX_RETRIES = 3

async function fetchWithRetry(url, attempt = 0) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error
    }
    const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    await new Promise(resolve => setTimeout(resolve, delay))
    return fetchWithRetry(url, attempt + 1)
  }
}

/**
 * Download the full corpus to the cache.
 * Resumable: skips already-cached URLs.
 */
async function handleCacheDataset(event, urls) {
  const cache = await caches.open(CACHE_DATASET)
  const clients = await self.clients.matchAll()

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    const cached = await cache.match(url)
    if (cached) {
      postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
      continue
    }

    try {
      const response = await fetchWithRetry(url)
      if (response.ok) {
        await cache.put(url, response)
      } else {
        postToAll(clients, 'DATASET_ERROR', { url, error: `HTTP ${response.status}` })
        return
      }
    } catch (error) {
      postToAll(clients, 'DATASET_ERROR', { url, error: error.message })
      return
    }

    postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
  }

  postToAll(clients, 'DATASET_COMPLETE')
}

/**
 * Apply a dataset update (user-confirmed major semver bump).
 */
async function handleApplyUpdate(_event) {
  // Phase 3: implement update application
  // Currently not implemented - throw explicit error
  throw new Error('APPLY_DATASET_UPDATE not implemented - Phase 3 feature')
}

/**
 * Purge the dataset cache.
 */
async function handlePurgeCache(_event) {
  await caches.delete(CACHE_DATASET)
  const clients = await self.clients.matchAll()
  postToAll(clients, 'DATASET_PURGED')
}

/**
 * Post a message to all clients.
 */
function postToAll(clients, type, payload) {
  for (const client of clients) {
    client.postMessage({ type, ...payload })
  }
}
