import 'fake-indexeddb/auto'
import { openDB, get, put, del, deleteDB, getDb, validateWrite } from '../../../src/core/db.js'

describe('core/db.js', () => {
  beforeEach(async () => {
    await openDB()
  })

  it('opens the database with all stores', async () => {
    const db = await openDB()
    expect(db.objectStoreNames.contains('settings')).toBe(true)
    expect(db.objectStoreNames.contains('meta')).toBe(true)
    expect(db.objectStoreNames.contains('marks')).toBe(true)
    expect(db.objectStoreNames.contains('activationState')).toBe(true)
    expect(db.objectStoreNames.contains('datasetMeta')).toBe(true)
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

    it('validates meta store: requires id', async () => {
      await expect(validateWrite('meta', { id: 'review' })).resolves.toBe(true)
      await expect(validateWrite('meta', { foo: 'bar' })).rejects.toThrow('missing required field: id')
    })

    it('validates marks store: requires verseKey + all layer fields', async () => {
      const validMark = {
        verseKey: '1:1',
        threads: [], subjects: [], audience: [], speaker: [],
        quotedSpeaker: [], mode: [], form: [], tone: [],
        people: [], places: [], events: [], divineNames: [],
        _canon: {}, note: '', createdAt: 1, updatedAt: 2,
      }
      await expect(validateWrite('marks', validMark)).resolves.toBe(true)
      await expect(validateWrite('marks', { threads: [] })).rejects.toThrow('missing required field: verseKey')
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

describe('edges store v3', () => {
  it('accepts an edge record', async () => {
    await openDB()
    await put('edges', {
      id: 'e1',
      from: '2:255',
      to: '20:98',
      kind: 'parallel',
      _canonKind: 'parallel',
      directed: false,
      note: '',
      createdAt: 1, updatedAt: 2,
    })
    const got = await get('edges', 'e1')
    expect(got.from).toBe('2:255')
  })
})

describe('marks store v2', () => {
  beforeEach(async () => {
    // Reset IDB and module state for a clean slate
    const { deleteDB, openDB } = await import('../../../src/core/db.js')
    try { await deleteDB() } catch {}
    await openDB()
  })

  it('accepts a mark with 12 layer arrays + _canon', async () => {
    const { put, get } = await import('../../../src/core/db.js')
    const record = {
      verseKey: '2:255',
      threads: ['mercy'],
      subjects: [],
      audience: ['muminin'],
      speaker: ['allah'],
      quotedSpeaker: [],
      mode: [],
      form: [],
      tone: [],
      people: [],
      places: [],
      events: [],
      divineNames: [],
      _canon: {
        threads: ['mercy'],
        subjects: [],
        audience: ['muminin'],
        speaker: ['allah'],
        quotedSpeaker: [],
        mode: [], form: [], tone: [],
        people: [], places: [], events: [], divineNames: [],
      },
      note: '',
      createdAt: 1, updatedAt: 2,
    }
    await put('marks', record)
    const got = await get('marks', '2:255')
    expect(got.audience).toEqual(['muminin'])
    expect(got._canon.audience).toEqual(['muminin'])
  })
})
