import { beforeEach, describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { openDB, put, get } from '../../../src/core/db.js'
import * as events from '../../../src/core/events.js'

// Mock serviceWorker
const mockPostMessage = vi.fn()
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
globalThis.caches.open = vi.fn().mockResolvedValue({
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockImplementation(async (url) => { cachedUrls.add(url) }),
  addAll: vi.fn(),
})

// Mock fetch for manifest
globalThis.fetch = vi.fn().mockImplementation(async (url) => {
  if (url.includes('manifest.json')) {
    return {
      ok: true,
      json: async () => ({
        files: { 'surah/001.json': 'abc', 'surah/002.json': 'def', 'surahs.json': 'ghi' },
      }),
    }
  }
  return { ok: true, json: async () => ({}) }
})

describe('data/offline.js', () => {
  beforeEach(async () => {
    await openDB()
    mockPostMessage.mockClear()
    vi.clearAllMocks()
    events.clear()
    // Reset activation state between tests
    await put('activationState', { id: 'current', status: 'none' })
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

    it('transitions to cached on DATASET_COMPLETE', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()

      // Simulate SW complete
      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      expect(messageHandler).toBeDefined()
      await messageHandler({ data: { type: 'DATASET_COMPLETE' } })

      const state = await getActivationState()
      expect(state).toBe('cached')
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
      expect(completeFn).toHaveBeenCalledWith(undefined)
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
})
