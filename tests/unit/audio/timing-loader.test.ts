import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ayahAtMs,
  ayahStartMs,
  _clearTimingCacheForTest,
  loadTiming,
  type SurahTiming,
} from '../../../src/audio/timing-loader'
import { logger } from '../../../src/core/logger'

const fixture: SurahTiming = {
  surah: 1,
  reciter: 'alafasy',
  ayahs: [
    { ayah: 1, t0: 0, t1: 4000, words: [{ w: 0, t0: 0, t1: 4000 }] },
    { ayah: 2, t0: 4000, t1: 7500, words: [{ w: 0, t0: 4000, t1: 7500 }] },
    { ayah: 3, t0: 7500, t1: 12000, words: [{ w: 0, t0: 7500, t1: 12000 }] },
  ],
}

describe('timing-loader', () => {
  beforeEach(() => {
    _clearTimingCacheForTest()
  })

  describe('ayahAtMs', () => {
    it('returns the ayah covering the position', () => {
      expect(ayahAtMs(fixture, 0)?.ayah).toBe(1)
      expect(ayahAtMs(fixture, 3999)?.ayah).toBe(1)
      expect(ayahAtMs(fixture, 4000)?.ayah).toBe(2)
      expect(ayahAtMs(fixture, 8000)?.ayah).toBe(3)
    })

    it('returns the last ayah when positionMs is past the end', () => {
      expect(ayahAtMs(fixture, 99999)?.ayah).toBe(3)
    })
  })

  describe('ayahStartMs', () => {
    it('returns t0 of the named ayah', () => {
      expect(ayahStartMs(fixture, 1)).toBe(0)
      expect(ayahStartMs(fixture, 2)).toBe(4000)
    })

    it('returns null for missing ayah', () => {
      expect(ayahStartMs(fixture, 99)).toBeNull()
    })
  })

  describe('loadTiming', () => {
    it('fetches and parses a valid timing JSON', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => fixture,
      } as unknown as Response)

      const result = await loadTiming('alafasy', 1)
      expect(result?.ayahs.length).toBe(3)
      expect(fetchSpy).toHaveBeenCalledWith('/dataset/audio/alafasy/timing/001.json')
    })

    it('returns null on fetch failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as unknown as Response)
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
      const result = await loadTiming('nobody', 1)
      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('caches subsequent calls (same reciter+surah)', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => fixture,
      } as unknown as Response)

      await loadTiming('alafasy', 1)
      await loadTiming('alafasy', 1)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })
})
