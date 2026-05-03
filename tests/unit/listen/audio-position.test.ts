import { describe, it, expect, beforeEach } from 'vitest'
import {
  makeId,
  loadPosition,
  loadMostRecent,
  savePosition,
  removePosition,
  clearAllPositions,
} from '../../../src/listen/state-position.svelte'

describe('audio-position store', () => {
  beforeEach(async () => {
    await clearAllPositions()
  })

  describe('makeId', () => {
    it('formats `${reciter}:${surah}`', () => {
      expect(makeId('alafasy', 36)).toBe('alafasy:36')
    })
  })

  describe('savePosition + loadPosition', () => {
    it('round-trips a record', async () => {
      const ok = await savePosition({
        reciter: 'alafasy',
        surah: 36,
        ayah: 1,
        ms: 0,
        lastPlayedAt: 1000,
      })
      expect(ok).toBe(true)
      const loaded = await loadPosition('alafasy', 36)
      expect(loaded).not.toBeNull()
      expect(loaded?.reciter).toBe('alafasy')
      expect(loaded?.surah).toBe(36)
      expect(loaded?.ms).toBe(0)
    })

    it('returns null for missing rows', async () => {
      const loaded = await loadPosition('nobody', 99)
      expect(loaded).toBeNull()
    })
  })

  describe('loadMostRecent', () => {
    it('returns the row with max(lastPlayedAt)', async () => {
      await savePosition({ reciter: 'a', surah: 1, ayah: 1, ms: 0, lastPlayedAt: 100 })
      await savePosition({ reciter: 'b', surah: 2, ayah: 1, ms: 0, lastPlayedAt: 300 })
      await savePosition({ reciter: 'c', surah: 3, ayah: 1, ms: 0, lastPlayedAt: 200 })
      const recent = await loadMostRecent()
      expect(recent?.reciter).toBe('b')
      expect(recent?.lastPlayedAt).toBe(300)
    })

    it('returns null on empty store', async () => {
      const recent = await loadMostRecent()
      expect(recent).toBeNull()
    })
  })

  describe('removePosition', () => {
    it('deletes by composite key', async () => {
      await savePosition({ reciter: 'x', surah: 5, ayah: 1, ms: 0, lastPlayedAt: 1 })
      await removePosition('x', 5)
      expect(await loadPosition('x', 5)).toBeNull()
    })
  })

  describe('LRU cap', () => {
    it('evicts oldest beyond 50 entries', async () => {
      // Insert 55 rows with ascending lastPlayedAt timestamps.
      for (let i = 0; i < 55; i++) {
        await savePosition({
          reciter: `r${i}`,
          surah: 1,
          ayah: 1,
          ms: 0,
          lastPlayedAt: 1000 + i,
        })
      }
      // The first 5 (oldest by lastPlayedAt) should be evicted asynchronously.
      // savePosition triggers `enforceLruCap` which is fire-and-forget; await
      // a microtask flush so the eviction delete transactions complete.
      await new Promise(r => setTimeout(r, 50))
      // r0..r4 should be gone.
      expect(await loadPosition('r0', 1)).toBeNull()
      // r54 (newest) should remain.
      expect(await loadPosition('r54', 1)).not.toBeNull()
    })
  })
})
