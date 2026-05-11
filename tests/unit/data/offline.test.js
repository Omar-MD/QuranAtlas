import { beforeEach, describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { openDB, put } from '../../../src/core/db.js'
import * as events from '../../../src/core/events.js'

// Mock serviceWorker
const mockPostMessage = vi.fn()
const cacheStores = new Map()
globalThis.navigator.serviceWorker = {
  ready: Promise.resolve({ active: {} }),
  controller: { postMessage: mockPostMessage },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

// Mock storage estimate
globalThis.navigator.storage = {
  estimate: vi.fn().mockResolvedValue({ quota: 50_000_000_000, usage: 1_000_000 }),
}

// Mock caches for download
const cachedUrls = new Set()
globalThis.caches.open = vi.fn().mockImplementation(async (name) => {
  if (!cacheStores.has(name)) {
    cacheStores.set(name, {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockImplementation(async (url) => { cachedUrls.add(url) }),
      addAll: vi.fn(),
    })
  }
  return cacheStores.get(name)
})
globalThis.caches.delete = vi.fn().mockResolvedValue(true)

// Mock fetch for manifest inventory entries with per-file bytes so the
// pre-flight quota path can sum category totals.
globalThis.fetch = vi.fn().mockImplementation(async (url) => {
  if (url.includes('source-assets.json')) {
    const response = {
      ok: true,
      json: async () => ({
        version: 1,
        translations: [
          {
            id: 'saheeh',
            type: 'translation',
            totalBytes: 42,
            files: [{ path: 'translations/saheeh/001.json', bytes: 42 }],
          },
        ],
        tafsir: [
          {
            id: 'mukhtasar',
            type: 'tafsir',
            totalBytes: 64,
            files: [{ path: 'tafsir/mukhtasar/001.json', bytes: 64 }],
          },
        ],
      }),
    }
    response.clone = () => response
    return response
  }
  if (url.includes('manifest.json')) {
    const response = {
      ok: true,
      json: async () => ({
        packageVersion: '2.1.0',
        profile: 'baseline',
        builtAt: '2026-05-03T00:00:00.000Z',
        lanes: {
          text: { enabled: true, files: 3, bytes: 3700 },
          knowledge: { enabled: true, files: 2, bytes: 1500 },
          reflection: { enabled: false, files: 0, bytes: 0 },
          search: { enabled: false, files: 0, bytes: 0 },
        },
        files: [
          { path: 'riwayat/hafs/001.json', lane: 'text', category: 'text-riwayah', bytes: 1500 },
          { path: 'riwayat/hafs/002.json', lane: 'text', category: 'text-riwayah', bytes: 1400 },
          { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 800 },
          { path: 'knowledge/ayah/001.json', lane: 'knowledge', category: 'knowledge-ayah', bytes: 900 },
          { path: 'knowledge/passages/001.json', lane: 'knowledge', category: 'knowledge-passages', bytes: 600 },
          { path: 'mushaf-pages/qaloon/manifest.json', lane: 'pages', category: 'pages', bytes: 300 },
          { path: 'mushaf-pages/qaloon/pages/001.svg', lane: 'pages', category: 'pages', bytes: 80_000 },
          { path: 'mushaf-pages/qaloon/pages/002.svg', lane: 'pages', category: 'pages', bytes: 81_000 },
          { path: 'mushaf-pages/warsh/manifest.json', lane: 'pages', category: 'pages', bytes: 350 },
          { path: 'mushaf-pages/warsh/pages/001.svg', lane: 'pages', category: 'pages', bytes: 82_000 },
        ],
      }),
    }
    response.clone = () => response
    return response
  }
  const response = { ok: true, json: async () => ({}) }
  response.clone = () => response
  return response
})

import { settings, DEFAULT_OFFLINE_CATEGORIES } from '../../../src/configure/state.svelte.ts'

describe('data/offline.js', () => {
  beforeEach(async () => {
    await openDB()
    mockPostMessage.mockClear()
    vi.clearAllMocks()
    events.clear()
    cacheStores.clear()
    // Reset activation state between tests
    await put('activationState', { id: 'current', status: 'none' })
    // N21: cached/none distinction now lives in settings.offlineCategories.
    // Reset it so each test starts from a fresh "no opt-in" state.
    Object.assign(settings, { offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } })
  })

  describe('download state machine', () => {
    it('starts with activationState = none', async () => {
      const { getActivationState } = await import('../../../src/data/offline.js')
      const state = await getActivationState()
      expect(state).toBe('none')
    })

    it('transitions to downloading when startDownload is called', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()
      const state = await getActivationState()
      expect(state).toBe('downloading')
    })

    it('emits download-progress events', async () => {
      const { startDownload } = await import('../../../src/data/offline.js')
      const progressFn = vi.fn()
      events.on('offline:download-progress', progressFn)

      await startDownload()

      // Simulate SW progress message
      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()
      messageHandler({ data: { type: 'DATASET_PROGRESS', cached: 2, total: 3 } })
      expect(progressFn).toHaveBeenCalledWith({ cached: 2, total: 3 })
    })

    it('reports cached when offlineCategories has any opt-in (N21)', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')

      // Simulate the selector setting the rune before kicking off a download.
      settings.offlineCategories.text.riwayat.qaloon = true

      await startDownload()
      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()
      await messageHandler({ data: { type: 'DATASET_COMPLETE' } })

      const state = await getActivationState()
      // After DATASET_COMPLETE the activationState 'current' record is cleared;
      // 'cached' is now derived from settings.offlineCategories opt-in.
      expect(state).toBe('cached')
    })

    it('includes knowledge shards in the text category manifest plan', async () => {
      const { getCategoryManifest } = await import('../../../src/data/offline.js')
      const plan = await getCategoryManifest('text')

      expect(plan.urls).toEqual(expect.arrayContaining([
        '/dataset/knowledge/ayah/001.json',
        '/dataset/knowledge/passages/001.json',
      ]))
      expect(plan.totalBytes).toBe(1500 + 1400 + 800 + 900 + 600)
    })

    it('plans source-specific optional pack downloads outside the baseline manifest', async () => {
      const { getSourceAssetManifest } = await import('../../../src/data/offline.js')
      const plan = await getSourceAssetManifest('tafsir', 'mukhtasar')

      expect(plan.urls).toEqual(['/dataset/tafsir/mukhtasar/001.json'])
      expect(plan.totalBytes).toBe(64)
    })

    it('plans page assets per riwayah from the manifest', async () => {
      const { getPageAssetManifest } = await import('../../../src/data/offline.js')
      const plan = await getPageAssetManifest('qaloon')

      expect(plan.urls).toEqual([
        '/dataset/mushaf-pages/qaloon/manifest.json',
        '/dataset/mushaf-pages/qaloon/pages/001.svg',
        '/dataset/mushaf-pages/qaloon/pages/002.svg',
      ])
      expect(plan.totalBytes).toBe(300 + 80_000 + 81_000)
    })

    it('caches page assets into the route-derived per-riwayah cache', async () => {
      const { startPageAssetDownload } = await import('../../../src/data/offline.js')
      const progressFn = vi.fn()
      const completeFn = vi.fn()
      events.on('offline:download-progress', progressFn)
      events.on('offline:download-complete', completeFn)

      await startPageAssetDownload('qaloon')

      expect(globalThis.caches.open).toHaveBeenCalledWith('qa-pages-qaloon-v1')
      expect(globalThis.caches.open).not.toHaveBeenCalledWith('qa-dataset-v1')
      const pageCache = cacheStores.get('qa-pages-qaloon-v1')
      expect(pageCache.put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/mushaf-pages/qaloon/pages/001.svg'),
        expect.any(Object),
      )
      expect(progressFn).toHaveBeenLastCalledWith({ cached: 3, total: 3 })
      expect(completeFn).toHaveBeenCalledWith({})
    })

    it('removes page assets from the route-derived per-riwayah cache', async () => {
      const { removePageAssetDownload } = await import('../../../src/data/offline.js')

      await removePageAssetDownload('warsh')

      expect(globalThis.caches.open).toHaveBeenCalledWith('qa-pages-warsh-v1')
      const pageCache = cacheStores.get('qa-pages-warsh-v1')
      expect(pageCache.delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/mushaf-pages/warsh/manifest.json'))
      expect(pageCache.delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/mushaf-pages/warsh/pages/001.svg'))
    })

    it('removes a stale page pack cache even when the current manifest has no files for it', async () => {
      const { removePageAssetDownload } = await import('../../../src/data/offline.js')

      await removePageAssetDownload('hafs')

      expect(globalThis.caches.delete).toHaveBeenCalledWith('qa-pages-hafs-v1')
    })

    it('emits insufficient-storage error for page downloads that exceed quota', async () => {
      globalThis.navigator.storage.estimate.mockResolvedValueOnce({ quota: 100, usage: 99 })
      const { startPageAssetDownload } = await import('../../../src/data/offline.js')
      const errorFn = vi.fn()
      events.on('offline:download-error', errorFn)

      await expect(startPageAssetDownload('qaloon')).resolves.toBe(false)

      expect(errorFn).toHaveBeenCalledWith({ error: 'insufficient storage' })
      expect(globalThis.caches.open).not.toHaveBeenCalled()
    })

    it('rejects generic page category downloads and removals', async () => {
      const { startCategoryDownload, removeCategoryDownload } = await import('../../../src/data/offline.js')

      await expect(startCategoryDownload('pages')).rejects.toThrow(/startPageAssetDownload/)
      await expect(removeCategoryDownload('pages')).rejects.toThrow(/removePageAssetDownload/)
    })

    it('emits download-complete event on DATASET_COMPLETE', async () => {
      const { startDownload } = await import('../../../src/data/offline.js')
      const completeFn = vi.fn()
      events.on('offline:download-complete', completeFn)

      await startDownload()

      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()
      await messageHandler({ data: { type: 'DATASET_COMPLETE' } })
      expect(completeFn).toHaveBeenCalledWith({})
    })

    it('transitions back to none on cancel', async () => {
      const { startDownload, cancelDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()
      await cancelDownload()
      const state = await getActivationState()
      expect(state).toBe('none')
    })

    it('does not re-start if already downloading', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()
      // Second call should be no-op
      mockPostMessage.mockClear()
      await startDownload()
      expect(mockPostMessage).not.toHaveBeenCalled()
      const state = await getActivationState()
      expect(state).toBe('downloading')
    })

    it('transitions to none on DATASET_ERROR', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()

      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()
      await messageHandler({ data: { type: 'DATASET_ERROR', error: 'Network error' } })

      const state = await getActivationState()
      expect(state).toBe('none')
    })

    it('resets to none and emits error when SW controller is null', async () => {
      // Override controller to null for this test
      const savedController = globalThis.navigator.serviceWorker.controller
      globalThis.navigator.serviceWorker.controller = null

      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      const errorFn = vi.fn()
      events.on('offline:download-error', errorFn)

      await startDownload()

      const state = await getActivationState()
      expect(state).toBe('none')
      // Verify startDownload() ran fully (not early-returned). The error event is only
      // emitted in the else branch after the state transitions through 'downloading' → 'none',
      // so errorFn being called proves both state changes occurred.
      expect(errorFn).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Service worker not ready' })
      )

      // Restore
      globalThis.navigator.serviceWorker.controller = savedController
    })
  })

  describe('PWA install prompt', () => {
    it('initInstallPrompt captures beforeinstallprompt event', async () => {
      const { initInstallPrompt } = await import('../../../src/data/offline.js')
      const installFn = vi.fn()
      events.on('offline:install-available', installFn)

      initInstallPrompt()

      const event = new Event('beforeinstallprompt')
      event.preventDefault = vi.fn()
      window.dispatchEvent(event)

      expect(installFn).toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('triggerInstall returns false when no deferred prompt', async () => {
      // Cancel any previous deferred prompt by dispatching appinstalled
      window.dispatchEvent(new Event('appinstalled'))
      const { triggerInstall } = await import('../../../src/data/offline.js')
      const result = await triggerInstall()
      expect(result).toBe(false)
    })

    it('isStandalone returns false in non-standalone mode', async () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false })
      const { isStandalone } = await import('../../../src/data/offline.js')
      expect(isStandalone()).toBe(false)
    })
  })

  describe('Story 8 SW message bridge', () => {
    it('bridges DATASET_PENDING_CONFIRMATION to event bus', async () => {
      const offline = await import('../../../src/data/offline.js')
      const received = []
      const unsub = events.on('dataset:pending-confirmation', (payload) => received.push(payload))

      await offline.startDownload()

      const addEventListenerCalls = globalThis.navigator.serviceWorker.addEventListener.mock.calls
      const messageHandler = addEventListenerCalls.find(c => c[0] === 'message')?.[1]
      expect(messageHandler).toBeDefined()

      messageHandler({ data: { type: 'DATASET_PENDING_CONFIRMATION', from: '1.0.0', to: '2.0.0' } })

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({ from: '1.0.0', to: '2.0.0' })
      unsub()
    })

    it('bridges DATASET_APPLIED to event bus', async () => {
      const offline = await import('../../../src/data/offline.js')
      const received = []
      const unsub = events.on('dataset:applied', (payload) => received.push(payload))

      await offline.startDownload()

      const addEventListenerCalls = globalThis.navigator.serviceWorker.addEventListener.mock.calls
      const messageHandler = addEventListenerCalls.find(c => c[0] === 'message')?.[1]

      await messageHandler({ data: { type: 'DATASET_APPLIED', version: '2.0.0' } })

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({ version: '2.0.0' })
      unsub()
    })

    it('bridges DATASET_UPDATE_FAILED to event bus', async () => {
      const offline = await import('../../../src/data/offline.js')
      const received = []
      const unsub = events.on('dataset:update-failed', (payload) => received.push(payload))

      await offline.startDownload()

      const addEventListenerCalls = globalThis.navigator.serviceWorker.addEventListener.mock.calls
      const messageHandler = addEventListenerCalls.find(c => c[0] === 'message')?.[1]

      await messageHandler({ data: { type: 'DATASET_UPDATE_FAILED', error: 'network timeout' } })

      expect(received).toHaveLength(1)
      expect(received[0]).toMatchObject({ error: 'network timeout' })
      unsub()
    })
  })
})
