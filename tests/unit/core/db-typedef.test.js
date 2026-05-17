import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'

describe('db.js typedef shape validation', () => {
  let db

  beforeEach(async () => {
    indexedDB._databases.clear()
    const mod = await import('../../../src/core/db.js?t=' + Date.now())
    await mod.openDB()
    db = mod
  })

  it('accepts a valid bookmark record', async () => {
    const good = {
      riwayah: 'qaloon',
      verseKey: '2:255',
      surah: 2,
      createdAt: 1,
    }
    await expect(db.put('bookmarks', good)).resolves.not.toThrow()
  })

  it('rejects a bookmark record missing riwayah', async () => {
    const bad = {
      verseKey: '2:255',
      surah: 2,
      createdAt: 1,
    }
    await expect(db.put('bookmarks', bad)).rejects.toThrow(/riwayah/i)
  })

  it('accepts an activationState record with optional infra metadata', async () => {
    const good = {
      id: 'current',
      status: 'pending-confirmation',
      version: '2.0.0',
      progress: 1,
      stagedAt: 123,
    }
    await expect(db.put('activationState', good)).resolves.not.toThrow()
  })

  it('rejects activationState progress with the wrong type', async () => {
    const bad = {
      id: 'current',
      status: 'downloading',
      progress: '1',
    }
    await expect(db.put('activationState', bad)).rejects.toThrow(/progress/i)
  })

  it('rejects legacy activationState ids and statuses on the write path', async () => {
    await expect(db.put('activationState', { id: 'review', status: 'cached' }))
      .rejects.toThrow(/activationState\.id/i)
    await expect(db.put('activationState', { id: 'current', status: 'all' }))
      .rejects.toThrow(/activationState\.status/i)
  })

  it('accepts any type for settings.value (validates the "any" path)', async () => {
    await expect(db.validateWrite('settings', { key: 'k1', value: null })).resolves.toBe(true)
    await expect(db.validateWrite('settings', { key: 'k2', value: {} })).resolves.toBe(true)
    await expect(db.validateWrite('settings', { key: 'k3', value: 0 })).resolves.toBe(true)
    await expect(db.validateWrite('settings', { key: 'k4', value: 'text' })).resolves.toBe(true)
  })

  it('rejects removed stores', async () => {
    await expect(db.validateWrite('meta', { id: 'review' })).rejects.toThrow('Unknown store: meta')
    await expect(db.validateWrite('marks', { verseKey: '2:255' })).rejects.toThrow('Unknown store: marks')
    await expect(db.validateWrite('edges', { id: 'edge-1' })).rejects.toThrow('Unknown store: edges')
    await expect(db.validateWrite('audioPosition', { id: 'reciter:2' })).rejects.toThrow('Unknown store: audioPosition')
  })

  it('throws on an unknown store name', async () => {
    await expect(db.validateWrite('unknownStore', { foo: 'bar' })).rejects.toThrow('Unknown store: unknownStore')
  })
})
