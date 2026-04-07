import 'fake-indexeddb/auto'
import { openDB, get } from '../../../src/core/db.js'

let tags

beforeEach(async () => {
  await openDB()
  tags = await import('../../../src/marks/tags.js')
})

describe('marks/tags.js', () => {
  describe('getDefaults()', () => {
    it('returns 4 default tags with label and color', () => {
      const defaults = tags.getDefaults()
      expect(defaults).toHaveLength(4)
      expect(defaults[0]).toEqual({ label: 'favourite', color: '#f59e0b' })
      expect(defaults[1]).toEqual({ label: 'study', color: '#3b82f6' })
      expect(defaults[2]).toEqual({ label: 'reflection', color: '#22c55e' })
      expect(defaults[3]).toEqual({ label: 'question', color: '#a855f7' })
    })
  })

  describe('getActiveTags()', () => {
    it('returns all 4 defaults when none deleted', async () => {
      const active = await tags.getActiveTags()
      expect(active).toHaveLength(4)
    })

    it('excludes deleted defaults', async () => {
      await tags.deleteTag('study')
      const active = await tags.getActiveTags()
      expect(active).toHaveLength(3)
      expect(active.find(t => t.label === 'study')).toBeUndefined()
    })
  })

  describe('deleteTag()', () => {
    it('persists deleted tag to IDB settings', async () => {
      await tags.deleteTag('favourite')
      const record = await get('settings', 'deleted-default-tags')
      expect(record.value).toContain('favourite')
    })

    it('is idempotent — deleting same tag twice does not duplicate', async () => {
      await tags.deleteTag('study')
      await tags.deleteTag('study')
      const record = await get('settings', 'deleted-default-tags')
      expect(record.value.filter(t => t === 'study')).toHaveLength(1)
    })
  })

  describe('getColorForTag()', () => {
    it('returns color for a known tag', () => {
      expect(tags.getColorForTag('favourite')).toBe('#f59e0b')
    })

    it('returns a fallback color for unknown tag', () => {
      expect(tags.getColorForTag('unknown')).toBe('#888888')
    })
  })
})
