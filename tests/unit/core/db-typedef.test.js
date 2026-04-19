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
})
