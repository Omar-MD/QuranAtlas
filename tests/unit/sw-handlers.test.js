import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cleanupStaleCaches,
  fetchWithRetry,
  handleCacheDataset,
  handlePurgeCache,
} from '../../src/sw-handlers.js'

function createResponse(body, ok = true, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function createClient() {
  return {
    postMessage: vi.fn(),
  }
}

describe('sw-handlers.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('handleCacheDataset()', () => {
    it('caches URLs and sends DATASET_COMPLETE', async () => {
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
              files: {
                'surah/001.json': 'hash-1',
              },
            }))
          }

          return createResponse(JSON.stringify({ surah: 1 }))
        }),
        verifyFn: vi.fn(async () => true),
      }

      await handleCacheDataset(deps, ['/dataset/surah/001.json'])

      expect(deps.cacheOpen).toHaveBeenCalledWith('quran-dataset-v1')
      expect(cache.put).toHaveBeenCalledTimes(1)
      expect(deps.verifyFn).toHaveBeenCalledTimes(1)
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

    it('posts DATASET_ERROR on SHA mismatch during fresh download and does not complete', async () => {
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
              files: {
                'surah/001.json': 'expected-hash',
              },
            }))
          }

          return createResponse(JSON.stringify({ surah: 1 }))
        }),
        verifyFn: vi.fn(async () => false),
      }

      await handleCacheDataset(deps, ['/dataset/surah/001.json'])

      expect(cache.put).not.toHaveBeenCalled()
      expect(clients[0].postMessage).toHaveBeenCalledWith({
        type: 'DATASET_ERROR',
        url: '/dataset/surah/001.json',
        error: 'SHA-256 mismatch: file may be corrupted in transit',
      })
      expect(clients[0].postMessage).not.toHaveBeenCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })

    it('deletes a corrupted cached file and re-downloads it', async () => {
      const clients = [createClient()]
      const cachedResponse = createResponse(JSON.stringify({ cached: true }))
      const downloadedResponse = createResponse(JSON.stringify({ fresh: true }))
      const store = new Map([
        ['/dataset/surah/001.json', cachedResponse],
      ])
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
        fetchFn: vi.fn(async (url) => {
          if (url === '/dataset/manifest.json') {
            return createResponse(JSON.stringify({
              files: {
                'surah/001.json': 'expected-hash',
              },
            }))
          }

          return downloadedResponse
        }),
        verifyFn: vi.fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true),
      }

      await handleCacheDataset(deps, ['/dataset/surah/001.json'])

      expect(cache.delete).toHaveBeenCalledWith('/dataset/surah/001.json')
      expect(cache.put).toHaveBeenCalledWith('/dataset/surah/001.json', downloadedResponse)
      expect(deps.fetchFn).toHaveBeenCalledTimes(2)
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })

    it('treats cached verification throws as unusable and re-downloads the file', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const clients = [createClient()]
      const cachedResponse = {
        clone: vi.fn(() => ({
          arrayBuffer: vi.fn(async () => {
            throw new Error('cached body unreadable')
          }),
        })),
      }
      const downloadedResponse = createResponse(JSON.stringify({ fresh: true }))
      const store = new Map([
        ['/dataset/surah/001.json', cachedResponse],
      ])
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
        fetchFn: vi.fn(async (url) => {
          if (url === '/dataset/manifest.json') {
            return createResponse(JSON.stringify({
              files: {
                'surah/001.json': 'expected-hash',
              },
            }))
          }

          return downloadedResponse
        }),
        verifyFn: vi.fn(async () => true),
      }

      await handleCacheDataset(deps, ['/dataset/surah/001.json'])

      expect(cache.delete).toHaveBeenCalledWith('/dataset/surah/001.json')
      expect(cache.put).toHaveBeenCalledWith('/dataset/surah/001.json', downloadedResponse)
      expect(clients[0].postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DATASET_ERROR' })
      )
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(1,
        'handleCacheDataset: cached verification failed, re-downloading',
        '/dataset/surah/001.json',
        'cached body unreadable'
      )
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })

    it('skips re-fetching a valid cached file', async () => {
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
              files: {
                'surah/001.json': 'expected-hash',
              },
            }))
          }

          return createResponse(JSON.stringify({ fresh: true }))
        }),
        verifyFn: vi.fn(async () => true),
      }

      await handleCacheDataset(deps, ['/dataset/surah/001.json'])

      expect(deps.fetchFn).toHaveBeenCalledTimes(1)
      expect(deps.fetchFn).toHaveBeenCalledWith('/dataset/manifest.json', { cache: 'no-store' })
      expect(cache.put).not.toHaveBeenCalled()
      expect(clients[0].postMessage).toHaveBeenCalledWith({
        type: 'DATASET_PROGRESS',
        cached: 1,
        total: 1,
      })
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })
    })

    it('falls back to download without hashes when manifest fetch never resolves', async () => {
      vi.useFakeTimers()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

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
        fetchFn: vi.fn(async (url) => {
          if (url === '/dataset/manifest.json') {
            return new Promise(() => {})
          }

          return createResponse(JSON.stringify({ surah: 1 }))
        }),
        verifyFn: vi.fn(async () => true),
      }

      const work = handleCacheDataset(deps, ['/dataset/surah/001.json'])

      const outcome = await Promise.race([
        work.then(() => 'resolved'),
        vi.advanceTimersByTimeAsync(10_000).then(async () => {
          await Promise.resolve()
          return 'timed-out'
        }),
      ])

      expect(outcome).toBe('resolved')
      await work

      expect(deps.fetchFn).toHaveBeenCalledWith('/dataset/manifest.json', { cache: 'no-store' })
      expect(deps.fetchFn).toHaveBeenCalledWith('/dataset/surah/001.json')
      expect(deps.verifyFn).not.toHaveBeenCalled()
      expect(cache.put).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(1,
        'handleCacheDataset: manifest fetch failed, skipping SHA-256 verification'
      )
      expect(clients[0].postMessage).toHaveBeenLastCalledWith({
        type: 'DATASET_COMPLETE',
      })

      vi.useRealTimers()
    })
  })

  describe('cleanupStaleCaches()', () => {
    it('deletes only stale non-workbox caches', async () => {
      const deps = {
        expectedCaches: new Set(['quran-dataset-v1']),
        cachesKeys: vi.fn(async () => [
          'quran-dataset-v1',
          'workbox-precache-v2-123',
          'legacy-cache',
          'another-old-cache',
        ]),
        cachesDelete: vi.fn(async () => true),
      }

      await cleanupStaleCaches(deps)

      expect(deps.cachesDelete).toHaveBeenCalledTimes(2)
      expect(deps.cachesDelete).toHaveBeenCalledWith('legacy-cache')
      expect(deps.cachesDelete).toHaveBeenCalledWith('another-old-cache')
      expect(deps.cachesDelete).not.toHaveBeenCalledWith('quran-dataset-v1')
      expect(deps.cachesDelete).not.toHaveBeenCalledWith('workbox-precache-v2-123')
    })

    it('does nothing when all caches are expected', async () => {
      const deps = {
        expectedCaches: new Set(['quran-dataset-v1']),
        cachesKeys: vi.fn(async () => [
          'quran-dataset-v1',
          'workbox-precache-v2-123',
        ]),
        cachesDelete: vi.fn(async () => true),
      }

      await cleanupStaleCaches(deps)

      expect(deps.cachesDelete).not.toHaveBeenCalled()
    })
  })

  describe('handlePurgeCache()', () => {
    it('deletes the cache and notifies all clients', async () => {
      const clients = [createClient(), createClient()]
      const deps = {
        cacheName: 'quran-dataset-v1',
        cachesDelete: vi.fn(async () => true),
        clientsMatchAll: vi.fn(async () => clients),
      }

      await handlePurgeCache(deps)

      expect(deps.cachesDelete).toHaveBeenCalledWith('quran-dataset-v1')
      expect(clients[0].postMessage).toHaveBeenCalledWith({ type: 'DATASET_PURGED' })
      expect(clients[1].postMessage).toHaveBeenCalledWith({ type: 'DATASET_PURGED' })
    })
  })

  describe('fetchWithRetry()', () => {
    it('returns on success', async () => {
      const response = createResponse(JSON.stringify({ ok: true }))
      const fetchFn = vi.fn(async () => response)

      await expect(fetchWithRetry('/dataset/surah/001.json', fetchFn)).resolves.toBe(response)
      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('retries 3 times then rejects', async () => {
      vi.useFakeTimers()

      const error = new Error('network down')
      const fetchFn = vi.fn(async () => {
        throw error
      })

      const rejection = expect(
        fetchWithRetry('/dataset/surah/001.json', fetchFn)
      ).rejects.toThrow('network down')

      await vi.runAllTimersAsync()

      await rejection
      expect(fetchFn).toHaveBeenCalledTimes(4)

      vi.useRealTimers()
    })
  })
})