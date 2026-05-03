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

import { openDB, get, put } from '../../../../src/core/db.js'

let updater

beforeEach(async () => {
  caches_store = new Map()
  await openDB()
})

describe('dataset-updater.js', () => {
  beforeEach(async () => {
    updater = await import('../../../../src/infra/offline/dataset-updater.js')
  })

  describe('checkForUpdate() — same version', () => {
    it('stays idle when manifest version matches IDB version', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'idle' })

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ packageVersion: '1.0.0', files: {} }),
      })

      await updater.checkForUpdate()

      const state = await get('activationState', 'current')
      expect(state.status).toBe('idle')
      expect(state).not.toHaveProperty('state')
    })
  })

  describe('checkForUpdate() — patch bump (auto-apply)', () => {
    it('downloads listed files, stages them, and auto-applies patch updates', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'idle' })

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            packageVersion: '1.0.1',
            files: [
              { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('updated surah data'),
          clone() { return this },
        })

      await updater.checkForUpdate()

      const meta = await get('datasetMeta', 'current')
      expect(meta.version).toBe('1.0.1')

      const state = await get('activationState', 'current')
      expect(state.status).toBe('idle')
      expect(state).not.toHaveProperty('state')
    })
  })

  describe('checkForUpdate() — major bump (pending-confirmation)', () => {
    it('stops at pending-confirmation for major version change', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'idle' })

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            packageVersion: '2.0.0',
            files: [
              { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('new schema data'),
          clone() { return this },
        })

      await updater.checkForUpdate()

      const state = await get('activationState', 'current')
      expect(state.status).toBe('pending-confirmation')
      expect(state.version).toBe('2.0.0')
      expect(state).not.toHaveProperty('state')

      const meta = await get('datasetMeta', 'current')
      expect(meta.version).toBe('1.0.0')
    })
  })

  describe('checkForUpdate() — no baseline version', () => {
    it('bails out silently if datasetMeta.version is absent', async () => {
      await put('datasetMeta', { id: 'current' })

      await updater.checkForUpdate()

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('applyUpdate()', () => {
    it('applies pending update and transitions to idle', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', {
        id: 'current',
        status: 'pending-confirmation',
        version: '2.0.0',
      })

      const stagingCache = await caches.open('quran-dataset-staging')
      await stagingCache.put('/dataset/surah-1.json', new Response('staged'))

      await updater.applyUpdate()

      const meta = await get('datasetMeta', 'current')
      expect(meta.version).toBe('2.0.0')

      const state = await get('activationState', 'current')
      expect(state.status).toBe('idle')
      expect(state).not.toHaveProperty('state')
    })
  })

  describe('manifest membership', () => {
    it('downloads only manifest-listed files', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'idle' })

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            packageVersion: '1.0.1',
            files: [
              { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 123 },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          clone() { return this },
          text: () => Promise.resolve('data'),
        })

      await updater.checkForUpdate()

      expect(fetchMock).toHaveBeenNthCalledWith(2, '/dataset/surahs.json')
    })
  })

  describe('activationState shape', () => {
    it('writes activationState with status as canonical FSM field, no separate state field', async () => {
      await put('datasetMeta', { id: 'current', version: '1.0.0' })
      await put('activationState', { id: 'current', status: 'idle' })

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          packageVersion: '1.0.1',
          files: [],
        }),
        clone() { return this },
      })

      await updater.checkForUpdate()

      const record = await get('activationState', 'current')
      expect(record).not.toHaveProperty('state')
      expect(record.status).not.toBe('cached')
      expect(['idle', 'downloading', 'pending-confirmation', 'applying', 'failed'])
        .toContain(record.status)
    })
  })
})
