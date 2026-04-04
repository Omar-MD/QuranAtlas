import 'fake-indexeddb/auto'
import { openDB, get, put } from '../../../src/core/db.js'

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
})
