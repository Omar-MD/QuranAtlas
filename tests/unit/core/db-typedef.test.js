// tests/unit/core/db-typedef.test.js
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

describe('db.js typedef shape validation', () => {
  let db

  beforeEach(async () => {
    // Reset module state for a fresh DB each test
    indexedDB._databases.clear()
    const mod = await import('../../../src/core/db.js?t=' + Date.now())
    await mod.openDB()
    db = mod
  })

  it('rejects a marks record with wrong field type (tags should be string[])', async () => {
    // tags must be an array; passing a string should fail
    const bad = { verseKey: '2:255', tags: 'mercy', note: '', createdAt: 1, updatedAt: 1 }
    await expect(db.put('marks', bad)).rejects.toThrow(/tags/i)
  })

  it('rejects a marks record with wrong array element type (tags should be string[])', async () => {
    const bad = { verseKey: '2:255', tags: [123], note: '', createdAt: 1, updatedAt: 1 }
    await expect(db.put('marks', bad)).rejects.toThrow(/tags/i)
  })

  it('accepts a fully-valid marks record', async () => {
    const good = { verseKey: '2:255', tags: ['mercy'], note: 'test', createdAt: 1, updatedAt: 1 }
    await expect(db.put('marks', good)).resolves.not.toThrow()
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

  it('accepts an empty array for marks.tags (empty[] special case)', async () => {
    const rec = { verseKey: '1:1', tags: [], note: '', createdAt: 1, updatedAt: 1 }
    await expect(db.put('marks', rec)).resolves.not.toThrow()
  })

  it('rejects a mixed-type array for marks.tags', async () => {
    const bad = { verseKey: '2:1', tags: ['mercy', 42], note: '', createdAt: 1, updatedAt: 1 }
    await expect(db.put('marks', bad)).rejects.toThrow(/tags/i)
  })
})
