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
    const stored = new Map()
    cacheStores.set(name, {
      match: vi.fn().mockImplementation(async (url) => stored.get(url) ?? stored.get(String(url))),
      put: vi.fn().mockImplementation(async (url, response) => { stored.set(url, response) }),
      delete: vi.fn().mockImplementation(async (url) => stored.delete(url)),
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
  if (url.includes('riwayah-packages.json')) {
    const response = {
      ok: true,
      json: async () => ({
        version: 1,
        defaultRiwayah: 'qaloon',
        packages: [
          {
            riwayah: 'hafs',
            optional: true,
            available: true,
            text: { urls: ['/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'], totalBytes: 1500, available: true },
            pages: {
              manifestUrl: '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json',
              urls: ['/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg'],
              totalBytes: 80_300,
              available: true,
            },
            totalBytes: 81_800,
          },
          {
            riwayah: 'warsh',
            optional: true,
            available: true,
            text: { urls: ['/dataset/quran-text/warsh/uthmani-kfgqpc-v1/001.json'], totalBytes: 1400, available: true },
            pages: {
              manifestUrl: '/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/manifest.json',
              urls: ['/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/pages/001.svg'],
              totalBytes: 82_350,
              available: true,
            },
            totalBytes: 83_750,
          },
          {
            riwayah: 'qaloon',
            optional: false,
            available: true,
            text: { urls: ['/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json'], totalBytes: 1400, available: true },
            pages: {
              manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
              urls: ['/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg'],
              totalBytes: 80_300,
              available: true,
            },
            totalBytes: 81_700,
          },
        ],
      }),
    }
    response.clone = () => response
    return response
  }
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
  if (url.includes('text-assets.json')) {
    const response = {
      ok: true,
      json: async () => ({
        version: 1,
        defaults: { qaloon: 'uthmani-kfgqpc-v1', hafs: 'uthmani-kfgqpc-v1', warsh: 'uthmani-kfgqpc-v1' },
        assets: [
          {
            riwayah: 'qaloon',
            textStyleId: 'uthmani-kfgqpc-v1',
            label: 'Qalun text',
            scriptFamily: 'uthmani',
            providerId: 'kfgqpc',
            licenseId: 'kfgqpc-quran-text',
            visibility: 'baseline',
            shipped: true,
            outputPathTemplate: 'quran-text/qaloon/uthmani-kfgqpc-v1/{surah}.json',
            files: [{ url: '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json', bytes: 1400 }],
            totalBytes: 1400,
            ayahCount: 7,
            provenance: {},
          },
          {
            riwayah: 'hafs',
            textStyleId: 'uthmani-kfgqpc-v1',
            label: 'Hafs text',
            scriptFamily: 'uthmani',
            providerId: 'kfgqpc',
            licenseId: 'kfgqpc-quran-text',
            visibility: 'optional',
            shipped: false,
            outputPathTemplate: 'quran-text/hafs/uthmani-kfgqpc-v1/{surah}.json',
            files: [{ url: '/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json', bytes: 1500 }],
            totalBytes: 1500,
            ayahCount: 7,
            provenance: {},
          },
          {
            riwayah: 'warsh',
            textStyleId: 'uthmani-kfgqpc-v1',
            label: 'Warsh text',
            scriptFamily: 'uthmani',
            providerId: 'kfgqpc',
            licenseId: 'kfgqpc-quran-text',
            visibility: 'optional',
            shipped: false,
            outputPathTemplate: 'quran-text/warsh/uthmani-kfgqpc-v1/{surah}.json',
            files: [{ url: '/dataset/quran-text/warsh/uthmani-kfgqpc-v1/001.json', bytes: 1400 }],
            totalBytes: 1400,
            ayahCount: 7,
            provenance: {},
          },
        ],
      }),
    }
    response.clone = () => response
    return response
  }
  if (url.includes('mushaf-assets.json')) {
    const response = {
      ok: true,
      json: async () => ({
        version: 1,
        defaults: { qaloon: 'qalun-quran-ws-v1', hafs: 'hafs-quran-ws-v1', warsh: 'warsh-quran-ws-v1' },
        assets: [
          {
            riwayah: 'qaloon',
            mushafEditionId: 'qalun-quran-ws-v1',
            label: 'Qalun pages',
            tradition: 'qalun',
            providerId: 'quran-ws',
            licenseId: 'quran-ws-free-use',
            visibility: 'baseline',
            shipped: true,
            manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
            files: [
              { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json', bytes: 300 },
              { url: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg', bytes: 80_000 },
            ],
            totalBytes: 80_300,
            pageCount: 604,
            provenance: {},
          },
          {
            riwayah: 'hafs',
            mushafEditionId: 'hafs-quran-ws-v1',
            label: 'Hafs pages',
            tradition: 'hafs',
            providerId: 'quran-ws',
            licenseId: 'quran-ws-free-use',
            visibility: 'optional',
            shipped: false,
            manifestUrl: '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json',
            files: [
              { url: '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json', bytes: 300 },
              { url: '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg', bytes: 80_000 },
            ],
            totalBytes: 80_300,
            pageCount: 604,
            provenance: {},
          },
          {
            riwayah: 'warsh',
            mushafEditionId: 'warsh-quran-ws-v1',
            label: 'Warsh pages',
            tradition: 'warsh',
            providerId: 'quran-ws',
            licenseId: 'quran-ws-free-use',
            visibility: 'optional',
            shipped: false,
            manifestUrl: '/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/manifest.json',
            files: [
              { url: '/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/manifest.json', bytes: 350 },
              { url: '/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/pages/001.svg', bytes: 82_000 },
            ],
            totalBytes: 82_350,
            pageCount: 604,
            provenance: {},
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
          { path: 'indexes/riwayah-packages.json', lane: 'text', category: 'text-index', bytes: 250 },
          { path: 'knowledge/ayah/001.json', lane: 'knowledge', category: 'knowledge-ayah', bytes: 900 },
          { path: 'knowledge/passages/001.json', lane: 'knowledge', category: 'knowledge-passages', bytes: 600 },
          { path: 'mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json', lane: 'pages', category: 'pages', bytes: 300 },
          { path: 'mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg', lane: 'pages', category: 'pages', bytes: 80_000 },
          { path: 'mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg', lane: 'pages', category: 'pages', bytes: 81_000 },
          { path: 'mushaf-pages/warsh/warsh-quran-ws-v1/manifest.json', lane: 'pages', category: 'pages', bytes: 350 },
          { path: 'mushaf-pages/warsh/warsh-quran-ws-v1/pages/001.svg', lane: 'pages', category: 'pages', bytes: 82_000 },
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

import {
  settings,
  riwayahInstallIntent,
  riwayahPackageState,
  DEFAULT_OFFLINE_CATEGORIES,
} from '../../../src/configure/state.svelte.ts'

const removedMediaKey = ['au', 'dio'].join('')

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
    await put('settings', { key: 'offlineCategories', value: { ...DEFAULT_OFFLINE_CATEGORIES } })
    settings.riwayah = 'qaloon'
    settings.quranTextStyleId = 'uthmani-kfgqpc-v1'
    settings.mushafEditionId = 'qalun-quran-ws-v1'
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true })
    riwayahInstallIntent.requested = null
    riwayahInstallIntent.previousUsable = 'qaloon'
    riwayahPackageState.hafs = null
    riwayahPackageState.warsh = null
    riwayahPackageState.qaloon = null
    const { clearRiwayahPackageCacheForTests } = await import('../../../src/data/riwayah-packages.ts')
    clearRiwayahPackageCacheForTests()
    const { clearSourceAssetIndexCacheForTests } = await import('../../../src/data/offline.js')
    clearSourceAssetIndexCacheForTests()
    const { clearTextAssetIndexCacheForTests } = await import('../../../src/packs/text-assets.ts')
    const { clearMushafAssetIndexCacheForTests } = await import('../../../src/packs/mushaf-assets.ts')
    clearTextAssetIndexCacheForTests()
    clearMushafAssetIndexCacheForTests()
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

      // Simulate the selector persisting an opt-in before kicking off a download.
      await put('settings', {
        key: 'offlineCategories',
        value: {
          ...DEFAULT_OFFLINE_CATEGORIES,
          text: {
            ...DEFAULT_OFFLINE_CATEGORIES.text,
            riwayat: { qaloon: true },
          },
        },
      })

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

    it('ignores legacy audio-only opt-ins when deriving cached reader-first state', async () => {
      const { getActivationState } = await import('../../../src/data/offline.js')

      await put('settings', {
        key: 'offlineCategories',
        value: {
          ...DEFAULT_OFFLINE_CATEGORIES,
          [removedMediaKey]: { alafasy: true },
        },
      })

      const state = await getActivationState()
      expect(state).toBe('none')
    })

    it('includes knowledge shards in the text category manifest plan', async () => {
      const { getCategoryManifest } = await import('../../../src/data/offline.js')
      const plan = await getCategoryManifest('text')

      expect(plan.urls).toEqual(expect.arrayContaining([
        '/dataset/indexes/riwayah-packages.json',
        '/dataset/knowledge/ayah/001.json',
        '/dataset/knowledge/passages/001.json',
      ]))
      expect(plan.totalBytes).toBe(1500 + 1400 + 800 + 250 + 900 + 600)
    })

    it('plans source-specific optional pack downloads outside the baseline manifest', async () => {
      const { getSourceAssetManifest } = await import('../../../src/data/offline.js')
      const plan = await getSourceAssetManifest('tafsir', 'mukhtasar')

      expect(plan.urls).toEqual(['/dataset/tafsir/mukhtasar/001.json'])
      expect(plan.totalBytes).toBe(64)
    })

    it('reports source-specific optional pack status from cache verification', async () => {
      const { getSourceAssetStatus, startSourceAssetDownload } = await import('../../../src/data/offline.js')

      await expect(getSourceAssetStatus('translation', 'saheeh')).resolves.toBe('installable')
      await expect(startSourceAssetDownload('translation', 'saheeh')).resolves.toBe(true)
      await expect(getSourceAssetStatus('translation', 'saheeh')).resolves.toBe('installed')
    })

    it('plans page assets per riwayah from the manifest', async () => {
      const { getPageAssetManifest } = await import('../../../src/data/offline.js')
      const plan = await getPageAssetManifest('qaloon')

      expect(plan.urls).toEqual([
        '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
        '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg',
        '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg',
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

      expect(globalThis.caches.open).toHaveBeenCalledWith('qa-pages-qaloon-qalun-quran-ws-v1-v1')
      expect(globalThis.caches.open).not.toHaveBeenCalledWith('qa-dataset-v1')
      const pageCache = cacheStores.get('qa-pages-qaloon-qalun-quran-ws-v1-v1')
      expect(pageCache.put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg'),
        expect.any(Object),
      )
      expect(progressFn).toHaveBeenLastCalledWith({ cached: 3, total: 3 })
      expect(completeFn).toHaveBeenCalledWith({})
    })

    it('removes page assets from the route-derived per-riwayah cache', async () => {
      const { removePageAssetDownload } = await import('../../../src/data/offline.js')

      await removePageAssetDownload('warsh')

      expect(globalThis.caches.open).toHaveBeenCalledWith('qa-pages-warsh-warsh-quran-ws-v1-v1')
      const pageCache = cacheStores.get('qa-pages-warsh-warsh-quran-ws-v1-v1')
      expect(pageCache.delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/manifest.json'))
      expect(pageCache.delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/mushaf-pages/warsh/warsh-quran-ws-v1/pages/001.svg'))
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

    it('installs concrete text assets without changing the active bundle', async () => {
      const { installTextAsset } = await import('../../../src/data/offline.js')
      const completeFn = vi.fn()
      events.on('offline:download-complete', completeFn)

      await expect(installTextAsset('hafs', 'uthmani-kfgqpc-v1')).resolves.toBe(true)

      expect(globalThis.caches.open).toHaveBeenCalledWith('quran-dataset-v2')
      expect(cacheStores.get('quran-dataset-v2').put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'),
        expect.any(Object),
      )
      expect(settings).toMatchObject({
        riwayah: 'qaloon',
        quranTextStyleId: 'uthmani-kfgqpc-v1',
        mushafEditionId: 'qalun-quran-ws-v1',
      })
      expect(completeFn).toHaveBeenCalledWith({})
    })

    it('installs concrete Mushaf assets into the edition cache', async () => {
      const { installMushafAsset } = await import('../../../src/data/offline.js')

      await expect(installMushafAsset('hafs', 'hafs-quran-ws-v1')).resolves.toBe(true)

      expect(globalThis.caches.open).toHaveBeenCalledWith('qa-pages-hafs-hafs-quran-ws-v1-v1')
      expect(cacheStores.get('qa-pages-hafs-hafs-quran-ws-v1-v1').put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json'),
        expect.any(Object),
      )
      expect(cacheStores.get('qa-pages-hafs-hafs-quran-ws-v1-v1').put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg'),
        expect.any(Object),
      )
      expect(settings.riwayah).toBe('qaloon')
    })

    it('refuses to delete an active optional concrete asset without mutating cache or settings', async () => {
      const { installTextAsset, removeTextAsset } = await import('../../../src/data/offline.js')
      await installTextAsset('hafs', 'uthmani-kfgqpc-v1')
      const cache = cacheStores.get('quran-dataset-v2')
      vi.clearAllMocks()
      settings.riwayah = 'hafs'
      settings.quranTextStyleId = 'uthmani-kfgqpc-v1'

      await expect(removeTextAsset('hafs', 'uthmani-kfgqpc-v1')).rejects.toThrow('Switch to another compatible asset before deleting.')

      expect(settings.riwayah).toBe('hafs')
      expect(settings.quranTextStyleId).toBe('uthmani-kfgqpc-v1')
      expect(cache.delete).not.toHaveBeenCalled()
    })

    it('refuses to delete an active optional source asset without mutating cache or settings', async () => {
      const { startSourceAssetDownload, removeSourceAssetDownload } = await import('../../../src/data/offline.js')
      await startSourceAssetDownload('translation', 'saheeh')
      const cache = cacheStores.get('quran-dataset-v2')
      vi.clearAllMocks()
      settings.translationId = 'saheeh'

      await expect(removeSourceAssetDownload('translation', 'saheeh')).rejects.toThrow('Switch to another compatible asset before deleting.')

      expect(settings.translationId).toBe('saheeh')
      expect(cache.delete).not.toHaveBeenCalled()
    })

    it('installs a riwayah package by caching text and pages without switching active settings', async () => {
      const { startRiwayahPackageInstall } = await import('../../../src/data/offline.js')
      const progressFn = vi.fn()
      const riwayahChangedFn = vi.fn()
      events.on('offline:riwayah-package-progress', progressFn)
      events.on('settings:riwayah-changed', riwayahChangedFn)

      const ok = await startRiwayahPackageInstall('hafs')

      expect(ok).toBe(true)
      expect(globalThis.caches.open).toHaveBeenCalledWith('quran-dataset-v2')
      expect(globalThis.caches.open).toHaveBeenCalledWith('qa-pages-hafs-hafs-quran-ws-v1-v1')
      expect(cacheStores.get('quran-dataset-v2').put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'),
        expect.any(Object),
      )
      expect(cacheStores.get('qa-pages-hafs-hafs-quran-ws-v1-v1').put).toHaveBeenCalledWith(
        expect.stringContaining('/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg'),
        expect.any(Object),
      )
      expect(settings.riwayah).toBe('qaloon')
      expect(riwayahInstallIntent.previousUsable).toBe('qaloon')
      expect(riwayahPackageState.hafs.kind).toBe('installed')
      expect(progressFn).toHaveBeenLastCalledWith({ riwayah: 'hafs', cached: 3, total: 3 })
      expect(riwayahChangedFn).not.toHaveBeenCalled()
    })

    it('keeps active riwayah and previous usable unchanged when package install fails', async () => {
      globalThis.fetch.mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          version: 1,
          defaultRiwayah: 'qaloon',
          packages: [
            {
              riwayah: 'hafs',
              optional: true,
              available: true,
              text: { urls: ['/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'], totalBytes: 10, available: true },
              pages: {
                manifestUrl: '/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json',
                urls: ['/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg'],
                totalBytes: 20,
                available: true,
              },
              totalBytes: 30,
            },
            {
              riwayah: 'warsh',
              optional: true,
              available: false,
              text: { urls: [], totalBytes: 0, available: false },
              pages: { manifestUrl: '/dataset/mushaf-pages/warsh/manifest.json', urls: [], totalBytes: 0, available: false },
              totalBytes: 0,
            },
            {
              riwayah: 'qaloon',
              optional: false,
              available: true,
              text: { urls: ['/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json'], totalBytes: 10, available: true },
              pages: {
                manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
                urls: ['/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg'],
                totalBytes: 20,
                available: true,
              },
              totalBytes: 30,
            },
          ],
        }),
      })).mockImplementationOnce(async () => ({
        ok: false,
        status: 503,
        json: async () => ({}),
        clone() { return this },
      }))
      const { clearRiwayahPackageCacheForTests } = await import('../../../src/data/riwayah-packages.ts')
      clearRiwayahPackageCacheForTests()
      const { startRiwayahPackageInstall } = await import('../../../src/data/offline.js')

      const ok = await startRiwayahPackageInstall('hafs')

      expect(ok).toBe(false)
      expect(settings.riwayah).toBe('qaloon')
      expect(riwayahInstallIntent.previousUsable).toBe('qaloon')
      expect(riwayahPackageState.hafs.kind).toBe('error')
    })

    it('retry clears package error and restarts install', async () => {
      const { retryRiwayahPackageInstall } = await import('../../../src/data/offline.js')
      riwayahPackageState.hafs = { kind: 'error', riwayah: 'hafs', message: 'failed', totalBytes: 3 }

      await expect(retryRiwayahPackageInstall('hafs')).resolves.toBe(true)

      expect(settings.riwayah).toBe('qaloon')
      expect(riwayahPackageState.hafs.kind).toBe('installed')
    })

    it('removes optional package text and page caches', async () => {
      const { startRiwayahPackageInstall, removeRiwayahPackage } = await import('../../../src/data/offline.js')
      await startRiwayahPackageInstall('hafs')

      await removeRiwayahPackage('hafs')

      expect(cacheStores.get('quran-dataset-v2').delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/quran-text/hafs/uthmani-kfgqpc-v1/001.json'))
      expect(cacheStores.get('qa-pages-hafs-hafs-quran-ws-v1-v1').delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/manifest.json'))
      expect(cacheStores.get('qa-pages-hafs-hafs-quran-ws-v1-v1').delete).toHaveBeenCalledWith(expect.stringContaining('/dataset/mushaf-pages/hafs/hafs-quran-ws-v1/pages/001.svg'))
    })

    it('refuses to remove Qaloon package', async () => {
      const { removeRiwayahPackage } = await import('../../../src/data/offline.js')

      await expect(removeRiwayahPackage('qaloon')).rejects.toThrow(/Qaloon/)
    })

    it('refuses active optional concrete Mushaf asset removal before touching the edition cache', async () => {
      const { installMushafAsset, removeMushafAsset } = await import('../../../src/data/offline.js')
      await installMushafAsset('hafs', 'hafs-quran-ws-v1')
      const cache = cacheStores.get('qa-pages-hafs-hafs-quran-ws-v1-v1')
      vi.clearAllMocks()
      settings.riwayah = 'hafs'
      settings.mushafEditionId = 'hafs-quran-ws-v1'

      await expect(removeMushafAsset('hafs', 'hafs-quran-ws-v1')).rejects.toThrow('Switch to another compatible asset before deleting.')

      expect(settings.riwayah).toBe('hafs')
      expect(settings.mushafEditionId).toBe('hafs-quran-ws-v1')
      expect(cache.delete).not.toHaveBeenCalled()
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
