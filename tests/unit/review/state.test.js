import 'fake-indexeddb/auto'
import { openDB, get, del } from '../../../src/core/db.js'

let state

beforeEach(async () => {
  await openDB()
  await del('positions', 'review')
  state = await import('../../../src/review/state.js')
})

describe('review/state.js', () => {
  describe('save()', () => {
    it('writes review state to positions["review"]', async () => {
      await state.save({
        view: 'all',
        activeTag: null,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'surah',
      })

      const record = await get('positions', 'review')
      expect(record.id).toBe('review')
      expect(record.sortBy).toBe('updatedAt')
      expect(record.groupBy).toBe('surah')
    })
  })

  describe('load()', () => {
    it('returns null when no saved state', async () => {
      const result = await state.load()
      expect(result).toBeNull()
    })

    it('returns saved state', async () => {
      await state.save({
        view: 'all',
        activeTag: 'favourite',
        surahFilter: 2,
        sortBy: 'createdAt',
        groupBy: 'flat',
      })

      const result = await state.load()
      expect(result.activeTag).toBe('favourite')
      expect(result.surahFilter).toBe(2)
      expect(result.sortBy).toBe('createdAt')
      expect(result.groupBy).toBe('flat')
    })
  })

  describe('getDefaultState()', () => {
    it('returns default state values', () => {
      const defaults = state.getDefaultState()
      expect(defaults).toEqual({
        view: 'all',
        activeTag: null,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'tag',
      })
    })
  })
})
