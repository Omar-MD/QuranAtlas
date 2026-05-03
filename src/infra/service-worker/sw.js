/**
 * Service worker for QuranAtlas.
 * Handles caching, dataset downloads, and update detection.
 *
 * Per-asset-class routing lives in `core/sw/strategies.ts` (audit P2.14 / R-11
 * / C-4 / CC-7, N21 2026-05-01). This file is now responsible only for
 * precache, install/activate, and message dispatch.
 *
 * Message types:
 * - CACHE_DATASET: Download a list of URLs (selector / full corpus)
 * - APPLY_DATASET_UPDATE: User-confirmed update (major semver)
 * - SKIP_WAITING: Force SW activation
 * - PURGE_DATASET_CACHE: Clear corpus cache
 */

import { precacheAndRoute } from 'workbox-precaching'
import { CACHE_DATASET } from '../../core/constants.js'
import { registerAll } from '../sw/strategies'
import { CACHE_PREFIXES } from '../sw/route-defs'
import { checkForUpdate, applyUpdate } from '../offline/dataset-updater.js'
import { STAGING_CACHE } from '../offline/staging-cache.js'
import { verify } from '../offline/sha256-verifier.js'
import {
  cleanupStaleCaches,
  handleCacheDataset,
  handlePurgeCache,
} from './sw-handlers.js'

// Workbox injectManifest will populate this array
precacheAndRoute(self.__WB_MANIFEST || [])

// Per-asset-class routes (text · audio mp3/timing/meta · pages · search · fonts).
// Single source: src/infra/sw/route-defs.ts.
//
// NOTE: vite-plugin-pwa's `workbox.runtimeCaching` option is silently ignored
// when using the 'injectManifest' strategy — routes must be registered here.
registerAll()

self.addEventListener('install', (_event) => {
  // Skip the waiting state immediately so a new SW activates on the next
  // navigation tick rather than after the user accepts the UpdateBanner
  // prompt. Required for users on stale precaches — most importantly iOS
  // PWA installs (WebKit #199110: PWA in iOS use old assets after publish),
  // where the user has no obvious surface to dismiss + reload.
  // The SKIP_WAITING message handler stays as a no-op fallback for the
  // edge case where the install event has already fired but the new SW is
  // still in `waiting` (e.g. tabs left open across the publish).
  self.skipWaiting()
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
        preservePrefixes: CACHE_PREFIXES,
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
  // Origin gate: drop messages that don't come from a same-origin client.
  // ExtendableMessageEvent carries both `origin` (string) and `source`
  // (Client). `origin` is the spec-recommended check; `source.url` is a
  // belt-and-braces guard for environments that leave `origin` empty.
  if (event.origin && event.origin !== self.location.origin) {
    return
  }
  if (!event.source || !event.source.url || !event.source.url.startsWith(self.location.origin)) {
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
            expectedManifestDigest: typeof __MANIFEST_DIGEST__ !== 'undefined' ? __MANIFEST_DIGEST__ : null,
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
