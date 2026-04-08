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
import { checkForUpdate, applyUpdate } from './offline/dataset-updater.js'
import { verify } from './offline/sha256-verifier.js'

// Workbox injectManifest will populate this array
precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener('install', (_event) => {
  // Don't call skipWaiting() unconditionally - wait for user prompt
  // The SKIP_WAITING message case handles user-initiated activation
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      checkForUpdate(),
    ])
  )
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
 * Verifies each file against SHA-256 hashes from the manifest.
 */
async function handleCacheDataset(event, urls) {
  const cache = await caches.open(CACHE_DATASET)
  const clients = await self.clients.matchAll()

  // Fetch manifest to obtain expected SHA-256 hashes for each file.
  // If the manifest is unreachable, we proceed without verification (graceful degradation).
  let hashMap = {}
  try {
    const manifestResponse = await fetch('/dataset/manifest.json', { cache: 'no-store' })
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json()
      if (manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files)) {
        for (const [filename, sha256] of Object.entries(manifest.files)) {
          hashMap[`/dataset/${filename}`] = sha256
        }
      }
    }
  } catch {
    console.warn('handleCacheDataset: manifest fetch failed, skipping SHA-256 verification')
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const expectedHash = hashMap[url]

    const cached = await cache.match(url)
    if (cached) {
      // If we have a hash, verify the cached copy hasn't been corrupted.
      // If it fails, fall through to re-download below.
      if (expectedHash) {
        const buffer = await cached.clone().arrayBuffer()
        const valid = await verify(buffer, expectedHash)
        if (valid) {
          postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
          continue
        }
        // Cached file is corrupted — delete and re-download
        await cache.delete(url)
      } else {
        postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
        continue
      }
    }

    try {
      const response = await fetchWithRetry(url)
      // Verify integrity before caching
      if (expectedHash) {
        const buffer = await response.clone().arrayBuffer()
        const valid = await verify(buffer, expectedHash)
        if (!valid) {
          postToAll(clients, 'DATASET_ERROR', { url, error: 'SHA-256 mismatch: file may be corrupted in transit' })
          return
        }
      }
      await cache.put(url, response)
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
  await applyUpdate()
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
