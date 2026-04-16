import { describe, it, expect, afterEach } from 'vitest'
import { SEMANTIC_TAG_COLORS, SEMANTIC_TAG_LABELS, getSemanticTagColor } from '../../../src/core/tag-colors.js'

describe('core/tag-colors.js', () => {
  afterEach(() => {
    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.theme
    }
  })

  it('exposes all 16 semantic tag labels', () => {
    expect(SEMANTIC_TAG_LABELS).toEqual([
      'mercy', 'gratitude', 'patience', 'reflection',
      'prayer', 'forgiveness', 'tawhid', 'tawakkul',
      'hope', 'justice', 'dunya', 'akhirah',
      'repentance', 'guidance', 'fear', 'knowledge',
    ])
  })

  it('every semantic label has a {light, dark} pair with hex values', () => {
    for (const label of SEMANTIC_TAG_LABELS) {
      const entry = SEMANTIC_TAG_COLORS[label]
      expect(entry, `missing entry for ${label}`).toBeDefined()
      expect(entry.light).toMatch(/^#[0-9a-f]{6}$/i)
      expect(entry.dark).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('spec-approved dark hexes are preserved', () => {
    expect(SEMANTIC_TAG_COLORS.mercy.dark).toBe('#64a078')
    expect(SEMANTIC_TAG_COLORS.gratitude.dark).toBe('#c8a050')
    expect(SEMANTIC_TAG_COLORS.patience.dark).toBe('#6e96b4')
    expect(SEMANTIC_TAG_COLORS.reflection.dark).toBe('#8c82c8')
    expect(SEMANTIC_TAG_COLORS.forgiveness.dark).toBe('#d4a070')
    expect(SEMANTIC_TAG_COLORS.tawhid.dark).toBe('#e8c478')
    expect(SEMANTIC_TAG_COLORS.tawakkul.dark).toBe('#b4826e')
    expect(SEMANTIC_TAG_COLORS.hope.dark).toBe('#c8b46e')
  })

  it('getSemanticTagColor returns dark hex when theme is dark', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(getSemanticTagColor('mercy')).toBe('#64a078')
  })

  it('getSemanticTagColor returns light hex when theme is sepia', () => {
    document.documentElement.dataset.theme = 'sepia'
    const result = getSemanticTagColor('mercy')
    expect(result).toBe(SEMANTIC_TAG_COLORS.mercy.light)
  })

  it('getSemanticTagColor returns light hex when theme is unset (default light)', () => {
    expect(getSemanticTagColor('gratitude')).toBe(SEMANTIC_TAG_COLORS.gratitude.light)
  })

  it('getSemanticTagColor returns null for non-semantic labels', () => {
    expect(getSemanticTagColor('favourite')).toBeNull()
    expect(getSemanticTagColor('')).toBeNull()
    expect(getSemanticTagColor('totally-custom')).toBeNull()
  })
})
