// tests/unit/core/db-typedef.test.js
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

const VALID_MARK = {
  verseKey: '2:255',
  threads: ['mercy'], subjects: [], audience: [], speaker: [],
  quotedSpeaker: [], mode: [], form: [], tone: [],
  people: [], places: [], events: [], divineNames: [],
  _canon: {
    threads: ['mercy'], subjects: [], audience: [], speaker: [],
    quotedSpeaker: [], mode: [], form: [], tone: [],
    people: [], places: [], events: [], divineNames: [],
  },
  note: 'test',
  createdAt: 1,
  updatedAt: 1,
}

describe('db.js typedef shape validation', () => {
  let db

  beforeEach(async () => {
    // Reset module state for a fresh DB each test
    indexedDB._databases.clear()
    const mod = await import('../../../src/core/db.js?t=' + Date.now())
    await mod.openDB()
    db = mod
  })

  it('accepts a fully-valid marks record (v2 shape)', async () => {
    await expect(db.put('marks', VALID_MARK)).resolves.not.toThrow()
  })

  it('rejects a marks record missing required field threads', async () => {
    const bad = { ...VALID_MARK }
    delete bad.threads
    await expect(db.put('marks', bad)).rejects.toThrow(/threads/i)
  })

  it('rejects a marks record with wrong type for threads (string instead of array)', async () => {
    const bad = { ...VALID_MARK, threads: 'mercy' }
    await expect(db.put('marks', bad)).rejects.toThrow(/threads/i)
  })

  it('accepts an empty array for marks.threads (empty[] special case)', async () => {
    const rec = { ...VALID_MARK, verseKey: '1:1', threads: [] }
    await expect(db.put('marks', rec)).resolves.not.toThrow()
  })

  it('rejects a positions record with missing required field', async () => {
    const bad = { id: 's1', surah: 1 } // missing verse, savedAt
    await expect(db.put('positions', bad)).rejects.toThrow()
  })

  it('accepts a valid positions record', async () => {
    const good = { id: 's1', surah: 1, verse: 1, savedAt: Date.now() }
    await expect(db.put('positions', good)).resolves.not.toThrow()
  })

  it('accepts any type for settings.value (validates the "any" path)', async () => {
    await expect(db.validateWrite('settings', { key: 'k1', value: null })).resolves.toBe(true)
    await expect(db.validateWrite('settings', { key: 'k2', value: {} })).resolves.toBe(true)
    await expect(db.validateWrite('settings', { key: 'k3', value: 0 })).resolves.toBe(true)
    await expect(db.validateWrite('settings', { key: 'k4', value: 'text' })).resolves.toBe(true)
  })

  it('throws on an unknown store name', async () => {
    await expect(db.validateWrite('unknownStore', { foo: 'bar' })).rejects.toThrow('Unknown store: unknownStore')
  })
})
