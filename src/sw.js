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
import { STAGING_CACHE } from './offline/staging-cache.js'
import { verify } from './offline/sha256-verifier.js'
import {
  cleanupStaleCaches,
  handleCacheDataset,
  handlePurgeCache,
} from './sw-handlers.js'

// Workbox injectManifest will populate this array
precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener('install', (_event) => {
  // Don't call skipWaiting() unconditionally - wait for user prompt
  // The SKIP_WAITING message case handles user-initiated activation
})

function logActivateFailure(taskName, error) {
  const message = error instanceof Error ? error.message : error
  console.warn(`activate: ${taskName} failed:`, message)
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      cleanupStaleCaches({
        expectedCaches: new Set([CACHE_DATASET, STAGING_CACHE]),
        cachesKeys: () => caches.keys(),
        cachesDelete: (name) => caches.delete(name),
      }).catch((error) => {
        logActivateFailure('stale cache cleanup', error)
      }),
      checkForUpdate().catch((error) => {
        logActivateFailure('update check', error)
      }),
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
      event.waitUntil(
        handleCacheDataset(
          {
            cacheName: CACHE_DATASET,
            cacheOpen: (name) => caches.open(name),
            clientsMatchAll: () => self.clients.matchAll(),
            fetchFn: (url, options) => fetch(url, options),
            verifyFn: verify,
          },
          urls
        )
      )
      break
    case 'APPLY_DATASET_UPDATE':
      event.waitUntil(handleApplyUpdate(event))
      break
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'PURGE_DATASET_CACHE':
      event.waitUntil(handlePurgeCache({
        cacheName: CACHE_DATASET,
        cachesDelete: (name) => caches.delete(name),
        clientsMatchAll: () => self.clients.matchAll(),
      }))
      break
    default:
      break
  }
})

/**
 * Apply a dataset update (user-confirmed major semver bump).
 */
async function handleApplyUpdate(_event) {
  await applyUpdate()
}
