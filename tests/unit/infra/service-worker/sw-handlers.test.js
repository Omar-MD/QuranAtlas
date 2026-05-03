import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cleanupStaleCaches,
  fetchWithRetry,
  handleCacheDataset,
  handlePurgeCache,
} from '../../../../src/infra/service-worker/sw-handlers.js'

function createResponse(body, ok = true, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function createClient() {
  return { postMessage: vi.fn() }
}

describe('sw-handlers.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('handleCacheDataset()', () => {
    it('caches manifest-listed URLs and sends DATASET_COMPLETE', async () => {
      const clients = [createClient()]
      const store = new Map()
      const cache = {
        match: vi.fn(async (url) => store.get(url)),
        put: vi.fn(async (url, response) => {
          store.set(url, response)
        }),
        delete: vi.fn(async (url) => store.delete(url)),
      }

      const deps = {
        cacheName: 'quran-dataset-v1',
        cacheOpen: vi.fn(async () => cache),
        clientsMatchAll: vi.fn(async () => clients),
        fetchFn: vi.fn(async (url, options) => {
          if (url === '/dataset/manifest.json') {
            expect(options).toEqual({ cache: 'no-store' })
            return createResponse(JSON.stringify({
              packageVersion: '2.1.0',
              profile: 'baseline',
              builtAt: '2026-05-03T00:00:00.000Z',
              lanes: {
                text: { enabled: true, files: 1, bytes: 123 },
                knowledge: { enabled: false, files: 0, bytes: 0 },
                reflection: { enabled: false, files: 0, bytes: 0 },
                search: { enabled: false, files: 0, bytes: 0 },
              },
              files: [
                { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
              ],
            }))
          }

          return createResponse(JSON.stringify({ surah: 1 }))
        }),
      }

      await handleCacheDataset(deps, ['/dataset/surahs.json'])

      expect(deps.cacheOpen).toHaveBeenCalledWith('quran-dataset-v1')
      expect(cache.put).toHaveBeenCalledTimes(1)
      expect(deps.fetchFn).toHaveBeenCalledTimes(2)
      expect(clients[0].postMessage).toHaveBeenCalledWith({
        type: 'DATASET_PROGRESS',
        cached: 1,
        total: 1,
      })
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })

    it('skips downloading when a manifest-listed URL is already cached', async () => {
      const clients = [createClient()]
      const cachedResponse = createResponse(JSON.stringify({ cached: true }))
      const cache = {
        match: vi.fn(async () => cachedResponse),
        put: vi.fn(),
        delete: vi.fn(),
      }

      const deps = {
        cacheName: 'quran-dataset-v1',
        cacheOpen: vi.fn(async () => cache),
        clientsMatchAll: vi.fn(async () => clients),
        fetchFn: vi.fn(async (url) => {
          if (url === '/dataset/manifest.json') {
            return createResponse(JSON.stringify({
              packageVersion: '2.1.0',
              profile: 'baseline',
              builtAt: '2026-05-03T00:00:00.000Z',
              lanes: {
                text: { enabled: true, files: 1, bytes: 123 },
                knowledge: { enabled: false, files: 0, bytes: 0 },
                reflection: { enabled: false, files: 0, bytes: 0 },
                search: { enabled: false, files: 0, bytes: 0 },
              },
              files: [
                { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
              ],
            }))
          }
          return createResponse(JSON.stringify({ fresh: true }))
        }),
      }

      await handleCacheDataset(deps, ['/dataset/surahs.json'])

      expect(deps.fetchFn).toHaveBeenCalledTimes(1)
      expect(cache.put).not.toHaveBeenCalled()
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })

    it('rejects URLs missing from manifest membership', async () => {
      const clients = [createClient()]
      const cache = {
        match: vi.fn(async () => undefined),
        put: vi.fn(),
        delete: vi.fn(),
      }

      const deps = {
        cacheName: 'quran-dataset-v1',
        cacheOpen: vi.fn(async () => cache),
        clientsMatchAll: vi.fn(async () => clients),
        fetchFn: vi.fn(async (url) => {
          if (url === '/dataset/manifest.json') {
            return createResponse(JSON.stringify({
              packageVersion: '2.1.0',
              profile: 'baseline',
              builtAt: '2026-05-03T00:00:00.000Z',
              lanes: {
                text: { enabled: true, files: 1, bytes: 123 },
                knowledge: { enabled: false, files: 0, bytes: 0 },
                reflection: { enabled: false, files: 0, bytes: 0 },
                search: { enabled: false, files: 0, bytes: 0 },
              },
              files: [
                { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
              ],
            }))
          }
          return createResponse(JSON.stringify({ surah: 1 }))
        }),
      }

      await handleCacheDataset(deps, ['/dataset/not-listed.json'])

      expect(cache.put).not.toHaveBeenCalled()
      expect(clients[0].postMessage).toHaveBeenCalledWith({
        type: 'DATASET_ERROR',
        url: '/dataset/not-listed.json',
        error: 'url not listed in manifest: aborting cache',
      })
    })

    it('fails when manifest fetch does not complete before timeout', async () => {
      vi.useFakeTimers()

      const clients = [createClient()]
      const cache = {
        match: vi.fn(async () => undefined),
        put: vi.fn(),
        delete: vi.fn(),
      }

      const deps = {
        cacheName: 'quran-dataset-v1',
        cacheOpen: vi.fn(async () => cache),
        clientsMatchAll: vi.fn(async () => clients),
        fetchFn: vi.fn(async (url) => {
          if (url === '/dataset/manifest.json') {
            return new Promise(() => {})
          }
          return createResponse(JSON.stringify({ surah: 1 }))
        }),
      }

      const work = handleCacheDataset(deps, ['/dataset/surahs.json'])
      await vi.advanceTimersByTimeAsync(10_000)
      await work

      expect(cache.put).not.toHaveBeenCalled()
      expect(clients[0].postMessage).toHaveBeenCalledWith({
        type: 'DATASET_ERROR',
        url: '/dataset/manifest.json',
        error: 'manifest unavailable: aborting cache',
      })
    })

    it('retries transient fetch failures for manifest-listed files', async () => {
      vi.useFakeTimers()

      const clients = [createClient()]
      const cache = {
        match: vi.fn(async () => undefined),
        put: vi.fn(),
        delete: vi.fn(),
      }

      const fetchFn = vi.fn()
        .mockResolvedValueOnce(createResponse(JSON.stringify({
          packageVersion: '2.1.0',
          profile: 'baseline',
          builtAt: '2026-05-03T00:00:00.000Z',
          lanes: {
            text: { enabled: true, files: 1, bytes: 123 },
            knowledge: { enabled: false, files: 0, bytes: 0 },
            reflection: { enabled: false, files: 0, bytes: 0 },
            search: { enabled: false, files: 0, bytes: 0 },
          },
          files: [
            { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
          ],
        })))
        .mockRejectedValueOnce(new Error('temporary failure'))
        .mockResolvedValueOnce(createResponse(JSON.stringify({ surah: 1 })))

      const work = handleCacheDataset({
        cacheName: 'quran-dataset-v1',
        cacheOpen: vi.fn(async () => cache),
        clientsMatchAll: vi.fn(async () => clients),
        fetchFn,
      }, ['/dataset/surahs.json'])

      await vi.advanceTimersByTimeAsync(1_000)
      await work

      expect(cache.put).toHaveBeenCalledTimes(1)
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })
  })

  describe('fetchWithRetry()', () => {
    it('retries up to MAX_RETRIES before succeeding', async () => {
      vi.useFakeTimers()
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('first'))
        .mockRejectedValueOnce(new Error('second'))
        .mockResolvedValue(createResponse(JSON.stringify({ ok: true })))

      const promise = fetchWithRetry('/dataset/surahs.json', fetchFn)
      await vi.advanceTimersByTimeAsync(3_000)
      const response = await promise

      expect(fetchFn).toHaveBeenCalledTimes(3)
      expect(response.ok).toBe(true)
    })
  })

  describe('cleanupStaleCaches()', () => {
    it('preserves expected caches and registered prefixes', async () => {
      const cachesDelete = vi.fn(async () => true)
      await cleanupStaleCaches({
        expectedCaches: new Set(['quran-dataset-v1']),
        preservePrefixes: ['workbox-precache', 'qa-audio-'],
        cachesKeys: async () => ['workbox-precache-v1', 'qa-audio-test-v1', 'old-cache'],
        cachesDelete,
      })

      expect(cachesDelete).toHaveBeenCalledTimes(1)
      expect(cachesDelete).toHaveBeenCalledWith('old-cache')
    })
  })

  describe('handlePurgeCache()', () => {
    it('deletes the cache and broadcasts DATASET_PURGED', async () => {
      const clients = [createClient()]
      const cachesDelete = vi.fn(async () => true)

      await handlePurgeCache({
        cacheName: 'quran-dataset-v1',
        cachesDelete,
        clientsMatchAll: async () => clients,
      })

      expect(cachesDelete).toHaveBeenCalledWith('quran-dataset-v1')
      expect(clients[0].postMessage).toHaveBeenCalledWith({ type: 'DATASET_PURGED' })
    })
  })
})
