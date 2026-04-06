import 'fake-indexeddb/auto'
import { openDB, get, put, del, deleteDB, getDb, validateWrite } from '../../../src/core/db.js'

describe('core/db.js', () => {
  beforeEach(async () => {
    await openDB()
  })

  it('opens the database with all stores', async () => {
    const db = await openDB()
    expect(db.objectStoreNames.contains('settings')).toBe(true)
    expect(db.objectStoreNames.contains('positions')).toBe(true)
    expect(db.objectStoreNames.contains('marks')).toBe(true)
    expect(db.objectStoreNames.contains('activationState')).toBe(true)
    expect(db.objectStoreNames.contains('datasetMeta')).toBe(true)
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


  describe('getMostRecentPosition()', () => {
    it('returns the most recently saved position', async () => {
      const { getMostRecentPosition } = await import('../../../src/core/router.js')
      const { put } = await import('../../../src/core/db.js')
      await put('positions', { id: 's1', surah: 1, verse: 5, savedAt: 1000 })
      await put('positions', { id: 's2', surah: 2, verse: 100, savedAt: 2000 })
      await put('positions', { id: 's3', surah: 3, verse: 10, savedAt: 1500 })

      const result = await getMostRecentPosition()
      expect(result).toEqual({ id: 's2', surah: 2, verse: 100, savedAt: 2000 })
    })

    it('returns null when no positions saved', async () => {
      // Delete all positions first
      const { getDb } = await import('../../../src/core/db.js')
      const db = await getDb()
      const tx = db.transaction('positions', 'readwrite')
      const store = tx.objectStore('positions')
      await new Promise((resolve) => {
        const req = store.clear()
        req.onsuccess = resolve
      })

      const { getMostRecentPosition } = await import('../../../src/core/router.js')
      const result = await getMostRecentPosition()
      expect(result).toBeNull()
    })
  })

  describe('validateWrite()', () => {
    it('validates settings store: requires key and value', async () => {
      await expect(validateWrite('settings', { key: 'theme', value: 'dark' })).resolves.toBe(true)
      await expect(validateWrite('settings', { key: 'theme' })).rejects.toThrow('missing required field: value')
      await expect(validateWrite('settings', { value: 'dark' })).rejects.toThrow('missing required field: key')
    })

    it('validates positions store: requires id, surah, verse, savedAt', async () => {
      await expect(validateWrite('positions', { id: 's1', surah: 1, verse: 5, savedAt: 1000 })).resolves.toBe(true)
      await expect(validateWrite('positions', { id: 's1', surah: 1, verse: 5 })).rejects.toThrow('missing required field: savedAt')
      await expect(validateWrite('positions', { surah: 1, verse: 5, savedAt: 1000 })).rejects.toThrow('missing required field: id')
    })

    it('validates marks store: requires verseKey', async () => {
      await expect(validateWrite('marks', { verseKey: '1:1', tags: ['important'] })).resolves.toBe(true)
      await expect(validateWrite('marks', { tags: ['important'] })).rejects.toThrow('missing required field: verseKey')
    })

    it('validates activationState store: requires id and status', async () => {
      await expect(validateWrite('activationState', { id: 'current', status: 'cached' })).resolves.toBe(true)
      await expect(validateWrite('activationState', { id: 'current' })).rejects.toThrow('missing required field: status')
      await expect(validateWrite('activationState', { status: 'none' })).rejects.toThrow('missing required field: id')
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
