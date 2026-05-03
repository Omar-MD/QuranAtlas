import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { openDB, deleteDB } from '../../../src/core/db'
import {
  loadGlobalPosition,
  saveGlobalPosition,
  clearGlobalPosition,
} from '../../../src/read/global-position'
import { settings } from '../../../src/configure/state.svelte'

describe('reader/global-position.ts', () => {
  beforeEach(async () => {
    try { await deleteDB() } catch { /* fresh DB */ }
    await openDB()
    settings.currentPosition = null
  })

  it('returns null when no position has been saved', async () => {
    const result = await loadGlobalPosition()
    expect(result).toBeNull()
  })

  it('persists and reads back a saved position', async () => {
    await saveGlobalPosition(2, 255)
    const result = await loadGlobalPosition()
    expect(result).toEqual({ surah: 2, verse: 255 })
  })

  it('updates the settings rune in lockstep with IDB writes', async () => {
    await saveGlobalPosition(5, 10)
    expect(settings.currentPosition).toEqual({ surah: 5, verse: 10 })
  })

  it('overwrites a prior position rather than appending', async () => {
    await saveGlobalPosition(1, 1)
    await saveGlobalPosition(2, 100)
    const result = await loadGlobalPosition()
    expect(result).toEqual({ surah: 2, verse: 100 })
  })

  it('clearGlobalPosition removes the record and resets the rune', async () => {
    await saveGlobalPosition(3, 30)
    await clearGlobalPosition()
    expect(settings.currentPosition).toBeNull()
    const result = await loadGlobalPosition()
    expect(result).toBeNull()
  })

  it('returns null for malformed stored values', async () => {
    const { put } = await import('../../../src/core/db')
    // Write a corrupt value (not an object with surah/verse numbers)
    await put('settings', { key: 'currentPosition', value: 'garbage' })
    const result = await loadGlobalPosition()
    expect(result).toBeNull()
  })
})
