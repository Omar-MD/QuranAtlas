/**
 * QuranAtlas Service Worker
 *
 * Strategy: injectManifest — this file is the custom SW entry point.
 * vite-plugin-pwa builds it separately and injects self.__WB_MANIFEST.
 *
 * Caches:
 *   - App shell (JS/CSS/fonts/icons): precacheAndRoute via __WB_MANIFEST
 *   - Fonts: CacheFirst, quran-fonts-v1, 1-year expiry
 *   - Dataset: CacheFirst, quran-dataset-v1, populated by CACHE_DATASET message
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

const FONT_CACHE = 'quran-fonts-v1';
const DATASET_CACHE = 'quran-dataset-v1';

// Precache and serve all app shell assets (injected at build time)
precacheAndRoute(self.__WB_MANIFEST);

// Remove outdated precaches from previous SW versions
cleanupOutdatedCaches();

// Font cache: CacheFirst, 1-year max age
registerRoute(
  ({ url }) => url.pathname.startsWith('/fonts/'),
  new CacheFirst({
    cacheName: FONT_CACHE,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Dataset cache: CacheFirst — populated explicitly via CACHE_DATASET, not intercepted
// on-the-fly. This route serves already-cached dataset files.
registerRoute(
  ({ url }) => url.pathname.startsWith('/dataset/'),
  new CacheFirst({
    cacheName: DATASET_CACHE,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// ─── Message Handlers ────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data?.type) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      // Only called after user confirms SW update (never unconditional)
      self.skipWaiting();
      break;

    case 'CACHE_DATASET':
      handleCacheDataset(event);
      break;

    case 'PURGE_DATASET_CACHE':
      caches.delete(DATASET_CACHE).then(() => {
        event.source?.postMessage({ type: 'DATASET_CACHE_PURGED' });
      });
      break;
  }
});

/**
 * Download and cache all dataset files.
 * Reports progress back to the calling tab via postMessage.
 * Skips files already present in the cache (resumable).
 *
 * @param {MessageEvent} event
 */
async function handleCacheDataset(event) {
  const { urls } = event.data;
  if (!Array.isArray(urls) || urls.length === 0) return;

  const cache = await caches.open(DATASET_CACHE);
  const total = urls.length;
  let cached = 0;

  for (const url of urls) {
    try {
      const existing = await cache.match(url);
      if (!existing) {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${url}`);
        await cache.put(url, response);
      }

      cached++;
      event.source?.postMessage({ type: 'DATASET_PROGRESS', cached, total });
    } catch (err) {
      event.source?.postMessage({ type: 'DATASET_ERROR', url, message: err.message });
      return;
    }
  }

  event.source?.postMessage({ type: 'DATASET_COMPLETE', total });
}
