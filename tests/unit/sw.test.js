import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CACHE_DATASET } from '../../src/core/constants.js'
import { STAGING_CACHE } from '../../src/offline/staging-cache.js'

const precacheAndRoute = vi.fn()
const checkForUpdate = vi.fn()
const applyUpdate = vi.fn()
const verify = vi.fn()
const cleanupStaleCaches = vi.fn()
const handleCacheDataset = vi.fn()
const handlePurgeCache = vi.fn()

vi.mock('workbox-precaching', () => ({
  precacheAndRoute,
}))

// N21: route registration moved to core/sw/strategies.ts. The shell test
// asserts message + activate dispatch only — stub the aggregator.
vi.mock('../../src/core/sw/strategies', () => ({
  registerAll: vi.fn(),
}))

vi.mock('../../src/offline/dataset-updater.js', () => ({
  checkForUpdate,
  applyUpdate,
}))

vi.mock('../../src/offline/sha256-verifier.js', () => ({
  verify,
}))

vi.mock('../../src/sw-handlers.js', () => ({
  cleanupStaleCaches,
  handleCacheDataset,
  handlePurgeCache,
}))

function createServiceWorkerGlobal() {
  const listeners = new Map()
  const serviceWorker = {
    __WB_MANIFEST: [],
    addEventListener: vi.fn((type, handler) => {
      listeners.set(type, handler)
    }),
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll: vi.fn(async () => []),
    },
    location: {
      origin: 'https://quranatlas.test',
    },
    skipWaiting: vi.fn(),
  }

  return { listeners, serviceWorker }
}

function createMessageEvent(data, origin) {
  return {
    data,
    source: {
      url: `${origin}/reader`,
    },
    waitUntil: vi.fn(),
  }
}

describe('sw.js shell wiring', () => {
  const originalSelf = globalThis.self
  let consoleWarnSpy
  let listeners
  let serviceWorker

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    ;({ listeners, serviceWorker } = createServiceWorkerGlobal())
    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      writable: true,
      value: serviceWorker,
    })
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    checkForUpdate.mockResolvedValue(undefined)
    applyUpdate.mockResolvedValue(undefined)
    verify.mockResolvedValue(true)
    cleanupStaleCaches.mockResolvedValue(undefined)
    handleCacheDataset.mockResolvedValue(undefined)
    handlePurgeCache.mockResolvedValue(undefined)
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      writable: true,
      value: originalSelf,
    })
  })

  it('binds async dataset message handlers to waitUntil', async () => {
    const cacheDatasetWork = Promise.resolve()
    const purgeCacheWork = Promise.resolve()

    handleCacheDataset.mockReturnValue(cacheDatasetWork)
    handlePurgeCache.mockReturnValue(purgeCacheWork)
    applyUpdate.mockResolvedValue(undefined)

    await import('../../src/sw.js')

    const messageHandler = listeners.get('message')
    expect(messageHandler).toEqual(expect.any(Function))

    const cacheDatasetEvent = createMessageEvent(
      {
        type: CACHE_DATASET,
        urls: ['/dataset/surah/001.json'],
      },
      serviceWorker.location.origin
    )
    messageHandler(cacheDatasetEvent)

    expect(handleCacheDataset).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheName: CACHE_DATASET,
        verifyFn: verify,
      }),
      ['/dataset/surah/001.json']
    )
    expect(cacheDatasetEvent.waitUntil).toHaveBeenCalledWith(cacheDatasetWork)

    const applyUpdateEvent = createMessageEvent(
      { type: 'APPLY_DATASET_UPDATE' },
      serviceWorker.location.origin
    )
    messageHandler(applyUpdateEvent)

    expect(applyUpdate).toHaveBeenCalledTimes(1)
    expect(applyUpdateEvent.waitUntil).toHaveBeenCalledTimes(1)
    expect(applyUpdateEvent.waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise)

    const purgeCacheEvent = createMessageEvent(
      { type: 'PURGE_DATASET_CACHE' },
      serviceWorker.location.origin
    )
    messageHandler(purgeCacheEvent)

    expect(handlePurgeCache).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheName: CACHE_DATASET,
      })
    )
    expect(purgeCacheEvent.waitUntil).toHaveBeenCalledWith(purgeCacheWork)
  })

  it('preserves live and staging dataset caches during activate cleanup', async () => {
    await import('../../src/sw.js')

    const activateHandler = listeners.get('activate')
    expect(activateHandler).toEqual(expect.any(Function))

    const activateEvent = {
      waitUntil: vi.fn(),
    }

    activateHandler(activateEvent)

    expect(cleanupStaleCaches).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCaches: expect.any(Set),
        preservePrefixes: expect.any(Array),
      })
    )

    const [{ expectedCaches, preservePrefixes }] = cleanupStaleCaches.mock.calls[0]
    expect(expectedCaches).toEqual(new Set([CACHE_DATASET, STAGING_CACHE]))
    // N21: preservePrefixes sourced from core/sw/route-defs::CACHE_PREFIXES.
    expect(preservePrefixes).toEqual(expect.arrayContaining(['workbox-precache', 'qa-audio-', 'qa-fonts-']))
    expect(activateEvent.waitUntil).toHaveBeenCalledTimes(1)
    expect(activateEvent.waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise)
  })

  it('keeps activate waitUntil resolved when stale cache cleanup fails', async () => {
    cleanupStaleCaches.mockRejectedValueOnce(new Error('cleanup failed'))

    await import('../../src/sw.js')

    const activateHandler = listeners.get('activate')
    expect(activateHandler).toEqual(expect.any(Function))

    const activateEvent = {
      waitUntil: vi.fn(),
    }

    activateHandler(activateEvent)

    const activateWork = activateEvent.waitUntil.mock.calls[0][0]

    await expect(activateWork).resolves.toHaveLength(3)
    expect(serviceWorker.clients.claim).toHaveBeenCalledTimes(1)
    expect(checkForUpdate).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'activate: stale cache cleanup failed:',
      'cleanup failed'
    )
  })
})