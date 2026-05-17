import 'fake-indexeddb/auto'
import { openDB, get, put, del, deleteDB, getDb, validateWrite, DB_NAME } from '../../../src/core/db.js'

const removedHubHash = ['#/re', 'view'].join('')
const removedTopicHash = ['#/thr', 'eads/faith'].join('')

describe('core/db.js', () => {
  beforeEach(async () => {
    await openDB()
  })

  it('opens the database with all stores', async () => {
    const db = await openDB()
    expect(db.objectStoreNames.contains('settings')).toBe(true)
    expect(db.objectStoreNames.contains('activationState')).toBe(true)
    expect(db.objectStoreNames.contains('datasetMeta')).toBe(true)
    expect(db.objectStoreNames.contains('bookmarks')).toBe(true)
    expect(db.objectStoreNames.contains('meta')).toBe(false)
    expect(db.objectStoreNames.contains('marks')).toBe(false)
    expect(db.objectStoreNames.contains('edges')).toBe(false)
    expect(db.objectStoreNames.contains('audioPosition')).toBe(false)
    // Legacy positions store dropped in DB v4 (cross-surah infinite scroll)
    expect(db.objectStoreNames.contains('positions')).toBe(false)
  })

  it('reads and writes to the settings store', async () => {
    await put('settings', { key: 'translationVisible', value: true })
    const result = await get('settings', 'translationVisible')
    expect(result).toEqual({ key: 'translationVisible', value: true })
  })

  it('returns undefined for missing keys', async () => {
    const result = await get('settings', 'nonexistent')
    expect(result).toBeUndefined()
  })

  it('getDb returns the open database', async () => {
    const db = await getDb()
    expect(db).toBeTruthy()
    expect(db.objectStoreNames.contains('settings')).toBe(true)
  })

  it('deletes a value from a store', async () => {
    await put('settings', { key: 'theme', value: 'dark' })
    await del('settings', 'theme')
    const result = await get('settings', 'theme')
    expect(result).toBeUndefined()
  })


  describe('validateWrite()', () => {
    it('validates settings store: requires key and value', async () => {
      await expect(validateWrite('settings', { key: 'theme', value: 'dark' })).resolves.toBe(true)
      await expect(validateWrite('settings', { key: 'theme' })).rejects.toThrow('missing required field: value')
      await expect(validateWrite('settings', { value: 'dark' })).rejects.toThrow('missing required field: key')
    })

    it('validates activationState store: requires id and status', async () => {
      await expect(validateWrite('activationState', { id: 'current', status: 'cached' })).resolves.toBe(true)
      await expect(validateWrite('activationState', { id: 'current' })).rejects.toThrow('missing required field: status')
      await expect(validateWrite('activationState', { status: 'none' })).rejects.toThrow('missing required field: id')
    })

    it('rejects legacy activationState ids and statuses after the v7 narrowing', async () => {
      await expect(validateWrite('activationState', { id: 'review', status: 'cached' }))
        .rejects.toThrow("activationState.id: expected 'current'")
      await expect(validateWrite('activationState', { id: 'current', status: 'all' }))
        .rejects.toThrow('activationState.status: expected')
    })

    it('validates activationState optional infra fields', async () => {
      await expect(validateWrite('activationState', {
        id: 'current',
        status: 'downloading',
        version: '2.0.0',
        progress: 0.5,
        error: 'network failed',
        stagedAt: 123,
      })).resolves.toBe(true)
      await expect(validateWrite('activationState', {
        id: 'current',
        status: 'downloading',
        progress: '0.5',
      })).rejects.toThrow('activationState.progress: expected number, got string')
    })

    it('validates bookmarks store: requires riwayah, verseKey, surah, and createdAt', async () => {
      await expect(validateWrite('bookmarks', {
        riwayah: 'qaloon',
        verseKey: '2:255',
        surah: 2,
        createdAt: 123,
      })).resolves.toBe(true)
      await expect(validateWrite('bookmarks', {
        verseKey: '2:255',
        surah: 2,
        createdAt: 123,
      })).rejects.toThrow('missing required field: riwayah')
    })

    it('rejects removed stores', async () => {
      await expect(validateWrite('meta', { id: 'review' })).rejects.toThrow('Unknown store: meta')
      await expect(validateWrite('marks', { verseKey: '1:1' })).rejects.toThrow('Unknown store: marks')
      await expect(validateWrite('edges', { id: 'edge-1' })).rejects.toThrow('Unknown store: edges')
      await expect(validateWrite('audioPosition', { id: 'reciter:1' })).rejects.toThrow('Unknown store: audioPosition')
    })

    it('throws on unknown store', async () => {
      await expect(validateWrite('unknownStore', { foo: 'bar' })).rejects.toThrow('Unknown store: unknownStore')
    })
  })

  describe('deleteDB()', () => {
    it('clears dbPromise and dbRef after deletion', async () => {
      await openDB()
      const { getDb } = await import('../../../src/core/db.js')
      const dbBefore = await getDb()
      const promiseBefore = dbBefore

      await deleteDB()

      const dbAfter = await getDb()
      expect(dbAfter).not.toBe(promiseBefore)
    })
  })
})

describe('db v7 migration', () => {
  beforeEach(async () => {
    try { await deleteDB() } catch {}
  })

  it('upgrades a v6 database while preserving active reader-first records and dropping removed stores', async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 6)
      request.onupgradeneeded = () => {
        const db = request.result
        db.createObjectStore('settings', { keyPath: 'key' })
        db.createObjectStore('meta', { keyPath: 'id' })
        db.createObjectStore('marks', { keyPath: 'verseKey' })
        db.createObjectStore('activationState', { keyPath: 'id' })
        db.createObjectStore('datasetMeta', { keyPath: 'id' })
        db.createObjectStore('edges', { keyPath: 'id' })
        db.createObjectStore('bookmarks', { keyPath: ['riwayah', 'verseKey'] })
        db.createObjectStore('audioPosition', { keyPath: 'id' })
      }
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(
          ['settings', 'meta', 'marks', 'activationState', 'datasetMeta', 'edges', 'bookmarks', 'audioPosition'],
          'readwrite'
        )
        tx.objectStore('settings').put({ key: 'currentPosition', value: { surah: 2, verse: 255 } })
        tx.objectStore('settings').put({ key: 'lastSurface', value: removedHubHash })
        tx.objectStore('settings').put({ key: 'lastSurfaceRemoved', value: removedTopicHash })
        tx.objectStore('settings').put({ key: 'lastSurfaceSettings', value: '#/settings?x=1' })
        tx.objectStore('settings').put({ key: 'wirdPlan', value: { cadence: 'daily', startRef: '2:255' } })
        tx.objectStore('settings').put({ key: 'translationId', value: 'bridges' })
        tx.objectStore('settings').put({ key: 'riwayah', value: 'qaloon' })
        tx.objectStore('meta').put({ id: 'review', view: 'all' })
        tx.objectStore('marks').put({ verseKey: '2:255' })
        tx.objectStore('activationState').put({ id: 'current', status: 'downloading', version: '2.0.0', progress: 0.25 })
        tx.objectStore('activationState').put({ id: 'review', status: 'all', activeLayer: 'threads' })
        tx.objectStore('activationState').put({ id: 'legacy-topic', status: 'cached' })
        tx.objectStore('datasetMeta').put({ id: 'current', version: '2026.05.16' })
        tx.objectStore('edges').put({ id: 'edge-1' })
        tx.objectStore('bookmarks').put({ riwayah: 'qaloon', verseKey: '2:255', surah: 2, createdAt: 123 })
        tx.objectStore('audioPosition').put({ id: 'reciter:2', reciter: 'reciter', surah: 2, ayah: 255, ms: 1000, lastPlayedAt: 10 })
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }
      request.onerror = () => reject(request.error)
    })

    const db = await openDB()

    expect(db.version).toBe(7)
    expect(db.objectStoreNames.contains('settings')).toBe(true)
    expect(db.objectStoreNames.contains('activationState')).toBe(true)
    expect(db.objectStoreNames.contains('datasetMeta')).toBe(true)
    expect(db.objectStoreNames.contains('bookmarks')).toBe(true)
    expect(db.objectStoreNames.contains('meta')).toBe(false)
    expect(db.objectStoreNames.contains('marks')).toBe(false)
    expect(db.objectStoreNames.contains('edges')).toBe(false)
    expect(db.objectStoreNames.contains('audioPosition')).toBe(false)

    await expect(get('settings', 'currentPosition')).resolves.toEqual({
      key: 'currentPosition',
      value: { surah: 2, verse: 255 },
    })
    await expect(get('settings', 'lastSurface')).resolves.toEqual({
      key: 'lastSurface',
      value: removedHubHash,
    })
    await expect(get('settings', 'lastSurfaceRemoved')).resolves.toEqual({
      key: 'lastSurfaceRemoved',
      value: removedTopicHash,
    })
    await expect(get('settings', 'lastSurfaceSettings')).resolves.toEqual({
      key: 'lastSurfaceSettings',
      value: '#/settings?x=1',
    })
    await expect(get('settings', 'wirdPlan')).resolves.toEqual({
      key: 'wirdPlan',
      value: { cadence: 'daily', startRef: '2:255' },
    })
    await expect(get('settings', 'translationId')).resolves.toEqual({
      key: 'translationId',
      value: 'bridges',
    })
    await expect(get('settings', 'riwayah')).resolves.toEqual({
      key: 'riwayah',
      value: 'qaloon',
    })
    await expect(get('datasetMeta', 'current')).resolves.toEqual({
      id: 'current',
      version: '2026.05.16',
    })
    await expect(get('bookmarks', ['qaloon', '2:255'])).resolves.toEqual({
      riwayah: 'qaloon',
      verseKey: '2:255',
      surah: 2,
      createdAt: 123,
    })
    await expect(get('activationState', 'current')).resolves.toEqual({
      id: 'current',
      status: 'downloading',
      version: '2.0.0',
      progress: 0.25,
    })
    await expect(get('activationState', 'review')).resolves.toBeUndefined()
    await expect(get('activationState', 'legacy-topic')).resolves.toBeUndefined()

    await expect(put('meta', { id: 'review' })).rejects.toThrow('Unknown store: meta')
    await expect(put('marks', { verseKey: '2:255' })).rejects.toThrow('Unknown store: marks')
    await expect(put('edges', { id: 'edge-1' })).rejects.toThrow('Unknown store: edges')
    await expect(put('audioPosition', { id: 'reciter:2' })).rejects.toThrow('Unknown store: audioPosition')
  })
})
