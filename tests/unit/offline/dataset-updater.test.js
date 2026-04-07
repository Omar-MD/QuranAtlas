import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock
})

let caches_store = new Map()
globalThis.caches = {
  open: vi.fn(async (name) => {
    if (!caches_store.has(name)) {
      caches_store.set(name, new Map())
    }
    const store = caches_store.get(name)
    return {
      put: vi.fn(async (url, resp) => { store.set(url, resp) }),
      match: vi.fn(async (url) => store.get(url) || undefined),
      keys: vi.fn(async () => [...store.keys()].map(url => ({ url }))),
    }
  }),
  delete: vi.fn(async (name) => { caches_store.delete(name); return true }),
}

globalThis.self = globalThis
globalThis.clients = {
  matchAll: vi.fn(async () => []),
}

import { openDB, get, put } from '../../../src/core/db.js'

let updater

beforeEach(async () => {
  caches_store = new Map()
  await openDB()
})

describe('dataset-updater.js', () => {
  beforeEach(async () => {
    updater = await import('../../../src/offline/dataset-updater.js')
  })

  describe('checkForUpdate() — same version', () => {
    it('stays idle when manifest version matches IDB version', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'cached', state: 'idle' })

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ packageVersion: '1.0.0', files: [] }),
      })

      await updater.checkForUpdate()

      const state = await get('activationState', 'current')
      expect(state.state).toBe('idle')
    })
  })

  describe('checkForUpdate() — patch bump (auto-apply)', () => {
    it('transitions through downloading → verifying → applying → idle', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'cached' })

      const fileContent = 'updated surah data'
      const encoder = new TextEncoder()
      const data = encoder.encode(fileContent)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = new Uint8Array(hashBuffer)
      let sha256 = ''
      for (const b of hashArray) { sha256 += b.toString(16).padStart(2, '0') }

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            packageVersion: '1.0.1',
            files: [{ url: '/dataset/surah-1.json', sha256 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(data.buffer),
          clone() { return this },
        })

      await updater.checkForUpdate()

      const meta = await get('datasetMeta', 'current')
      expect(meta.version).toBe('1.0.1')

      const state = await get('activationState', 'current')
      expect(state.state).toBe('idle')
    })
  })

  describe('checkForUpdate() — major bump (pending-confirmation)', () => {
    it('stops at pending-confirmation for major version change', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'cached' })

      const fileContent = 'new schema data'
      const encoder = new TextEncoder()
      const data = encoder.encode(fileContent)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = new Uint8Array(hashBuffer)
      let sha256 = ''
      for (const b of hashArray) { sha256 += b.toString(16).padStart(2, '0') }

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            packageVersion: '2.0.0',
            files: [{ url: '/dataset/surah-1.json', sha256 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(data.buffer),
          clone() { return this },
        })

      await updater.checkForUpdate()

      const state = await get('activationState', 'current')
      expect(state.state).toBe('pending-confirmation')
      expect(state.version).toBe('2.0.0')

      const meta = await get('datasetMeta', 'current')
      expect(meta.version).toBe('1.0.0')
    })
  })

  describe('checkForUpdate() — no baseline version', () => {
    it('bails out silently if datasetMeta.version is absent', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ packageVersion: '1.0.0', files: [] }),
      })

      await updater.checkForUpdate()
    })
  })

  describe('applyUpdate()', () => {
    it('applies pending update and transitions to idle', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', {
        id: 'current',
        status: 'cached',
        state: 'pending-confirmation',
        version: '2.0.0',
      })

      const stagingCache = await caches.open('quran-dataset-staging')
      await stagingCache.put('/dataset/surah-1.json', new Response('staged'))

      await updater.applyUpdate()

      const meta = await get('datasetMeta', 'current')
      expect(meta.version).toBe('2.0.0')

      const state = await get('activationState', 'current')
      expect(state.state).toBe('idle')
    })
  })

  describe('SHA-256 verification failure', () => {
    it('transitions to failed state on hash mismatch', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'cached' })

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            packageVersion: '1.0.1',
            files: [{ url: '/dataset/surah-1.json', sha256: 'badhash' }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new TextEncoder().encode('data').buffer),
          clone() { return this },
        })

      await updater.checkForUpdate()

      const state = await get('activationState', 'current')
      expect(state.state).toBe('failed')
    })
  })
})
