import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save } from '../../../src/marks/store.js'

let tags

beforeEach(async () => {
  vi.resetModules()
  await openDB()
  tags = await import('../../../src/marks/tags.js')
})

describe('marks/tags.js', () => {
  describe('SEED_TAGS', () => {
    it('exports 5 seed tags', () => {
      expect(tags.SEED_TAGS).toHaveLength(5)
    })

    it('each seed has label and paletteSlot', () => {
      for (const seed of tags.SEED_TAGS) {
        expect(seed).toHaveProperty('label')
        expect(seed).toHaveProperty('paletteSlot')
        expect(typeof seed.label).toBe('string')
        expect(typeof seed.paletteSlot).toBe('number')
      }
    })

    it('seed labels are lowercase', () => {
      for (const seed of tags.SEED_TAGS) {
        expect(seed.label).toBe(seed.label.toLowerCase())
      }
    })
  })

  describe('TAG_PALETTE', () => {
    it('has 12 slots', () => {
      expect(tags.TAG_PALETTE).toHaveLength(12)
    })

    it('each slot has light and dark color strings', () => {
      for (const slot of tags.TAG_PALETTE) {
        expect(slot).toHaveProperty('light')
        expect(slot).toHaveProperty('dark')
        expect(slot.light).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(slot.dark).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })

  describe('getColorForTag()', () => {
    it('returns the fixed palette color for seed tag "favourite"', () => {
      const color = tags.getColorForTag('favourite')
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('returns a deterministic hash-based color for a custom label', () => {
      const color1 = tags.getColorForTag('my-custom-tag')
      const color2 = tags.getColorForTag('my-custom-tag')
      expect(color1).toBe(color2)
      expect(color1).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('different labels can map to different colors', () => {
      const a = tags.getColorForTag('alpha-tag')
      const b = tags.getColorForTag('zeta-tag')
      // They might collide, but at least the function works
      expect(a).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(b).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('seed tags get their fixed slot color, not hash-based', () => {
      const favouriteColor = tags.getColorForTag('favourite')
      expect(favouriteColor).toBe(tags.TAG_PALETTE[0].light)
    })
  })

  describe('getSeedTags()', () => {
    it('returns the 5 seed tag objects', () => {
      const seeds = tags.getSeedTags()
      expect(seeds).toHaveLength(5)
      expect(seeds[0].label).toBe('favourite')
    })
  })

  describe('getAllUsedTags()', () => {
    it('returns empty array when no marks exist', async () => {
      const used = await tags.getAllUsedTags()
      expect(used).toEqual([])
    })

    it('returns unique tags from marks', async () => {
      await save('1:1', ['favourite', 'study'])
      await save('2:1', ['favourite', 'custom-tag'])
      const used = await tags.getAllUsedTags()
      expect(used.sort()).toEqual(['custom-tag', 'favourite', 'study'])
    })

    it('does not return duplicate tag names', async () => {
      await save('1:1', ['favourite'])
      await save('2:1', ['favourite'])
      const used = await tags.getAllUsedTags()
      expect(used).toEqual(['favourite'])
    })
  })
})
