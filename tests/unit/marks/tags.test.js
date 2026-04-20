import 'fake-indexeddb/auto'
import { SEMANTIC_TAG_LABELS, SEMANTIC_TAG_COLORS } from '../../../src/core/tag-colors.js'

const BASE_INPUT = {
  subjects: [], audience: [], speaker: [],
  quotedSpeaker: [], mode: [], form: [], tone: [],
  people: [], places: [], events: [], divineNames: [],
  flags: {}, note: '',
}

let tags
let save

beforeEach(async () => {
  const { deleteDB, openDB } = await import('../../../src/core/db.js')
  try { await deleteDB() } catch {}
  await openDB()
  vi.resetModules()
  tags = await import('../../../src/marks/tags.js')
  const storeModule = await import('../../../src/marks/store.js')
  save = storeModule.save
})

// Re-export convenient aliases that the new describe block uses directly
let SEED_TAGS, getSeedTags, getColorForTag
beforeEach(async () => {
  SEED_TAGS = tags.SEED_TAGS
  getSeedTags = tags.getSeedTags
  getColorForTag = tags.getColorForTag
})

describe('marks/tags.js', () => {
  describe('SEED_TAGS', () => {
    it('exports 16 seed tags', () => {
      expect(tags.SEED_TAGS).toHaveLength(16)
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
    it('returns a valid hex color for a semantic seed tag "mercy"', () => {
      const color = tags.getColorForTag('mercy')
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

    it('semantic tags resolve via semantic map, not hash palette', () => {
      // "mercy" light value comes from SEMANTIC_TAG_COLORS, not TAG_PALETTE slot 0
      const mercyColor = tags.getColorForTag('mercy')
      expect(mercyColor).toBe(SEMANTIC_TAG_COLORS.mercy.light)
    })
  })

  describe('getSeedTags()', () => {
    it('returns the 16 seed tag objects', () => {
      const seeds = tags.getSeedTags()
      expect(seeds).toHaveLength(16)
      expect(seeds[0].label).toBe('mercy')
    })
  })

  describe('getAllUsedTags()', () => {
    it('returns empty array when no marks exist', async () => {
      const used = await tags.getAllUsedTags()
      expect(used).toEqual([])
    })

    it('returns unique tags from marks (canonicalized)', async () => {
      await save({ ...BASE_INPUT, verseKey: '1:1', threads: ['mercy', 'study'] })
      await save({ ...BASE_INPUT, verseKey: '2:1', threads: ['mercy', 'custom tag'] })
      const used = await tags.getAllUsedTags()
      // Note: 'custom tag' stored as-is; hyphen would be normalized to space by canonicalize
      expect(used.sort()).toEqual(['custom tag', 'mercy', 'study'])
    })

    it('does not return duplicate tag names', async () => {
      await save({ ...BASE_INPUT, verseKey: '1:1', threads: ['mercy'] })
      await save({ ...BASE_INPUT, verseKey: '2:1', threads: ['mercy'] })
      const used = await tags.getAllUsedTags()
      expect(used).toEqual(['mercy'])
    })
  })
})

describe('marks/tags.js — semantic seed set', () => {
  afterEach(() => {
    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.theme
    }
  })

  it('SEED_TAGS contains the 16 semantic labels in spec order', () => {
    expect(SEED_TAGS.map(s => s.label)).toEqual(SEMANTIC_TAG_LABELS)
  })

  it('getSeedTags returns a fresh copy (no shared references)', () => {
    const a = getSeedTags()
    const b = getSeedTags()
    expect(a).not.toBe(b)
    expect(a[0]).not.toBe(b[0])
    expect(a).toEqual(b)
  })

  it('getColorForTag uses semantic map for a named tag (dark theme)', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(getColorForTag('mercy')).toBe(SEMANTIC_TAG_COLORS.mercy.dark)
    expect(getColorForTag('tawakkul')).toBe(SEMANTIC_TAG_COLORS.tawakkul.dark)
  })

  it('getColorForTag uses semantic map for a named tag (light theme)', () => {
    expect(getColorForTag('gratitude')).toBe(SEMANTIC_TAG_COLORS.gratitude.light)
  })

  it('getColorForTag falls back to hash palette for unknown labels', () => {
    const color = getColorForTag('some-custom-user-tag')
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(SEMANTIC_TAG_LABELS.includes('some-custom-user-tag')).toBe(false)
  })

  it('getColorForTag returns the same hash color for the same custom label (deterministic)', () => {
    expect(getColorForTag('my-tag')).toBe(getColorForTag('my-tag'))
  })
})
