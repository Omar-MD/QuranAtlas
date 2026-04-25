import 'fake-indexeddb/auto'
import { openDB, get, del } from '../../../src/core/db'
import { save, load, getDefaultState } from '../../../src/review/state'

beforeEach(async () => {
  await openDB()
  await del('meta', 'review')
})

describe('review/state.ts', () => {
  describe('save()', () => {
    it('writes review state to meta["review"]', async () => {
      await save({
        view: 'all',
        activeTag: null,
        activeLayer: 'threads',
        activeValue: null,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'surah',
      })

      const record = await get('meta', 'review')
      expect(record?.id).toBe('review')
      expect((record as Record<string, unknown>)?.sortBy).toBe('updatedAt')
      expect((record as Record<string, unknown>)?.groupBy).toBe('surah')
      expect((record as Record<string, unknown>)?.activeLayer).toBe('threads')
    })
  })

  describe('load()', () => {
    it('returns null when no saved state', async () => {
      const result = await load()
      expect(result).toBeNull()
    })

    it('returns saved state', async () => {
      await save({
        view: 'all',
        activeTag: 'favourite',
        activeLayer: 'people',
        activeValue: 'musa',
        surahFilter: 2,
        sortBy: 'createdAt',
        groupBy: 'flat',
      })

      const result = await load()
      expect(result?.activeTag).toBe('favourite')
      expect(result?.activeLayer).toBe('people')
      expect(result?.activeValue).toBe('musa')
      expect(result?.surahFilter).toBe(2)
      expect(result?.sortBy).toBe('createdAt')
      expect(result?.groupBy).toBe('flat')
    })
  })

  describe('getDefaultState()', () => {
    it('returns default state values', () => {
      const defaults = getDefaultState()
      expect(defaults).toEqual({
        view: 'all',
        activeTag: null,
        activeLayer: 'threads',
        activeValue: null,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'tag',
      })
    })
  })
})
