import { describe, it, expect } from 'vitest'
import { normalize } from '../../../src/core/normalize'

describe('normalize', () => {
  it('trims outer whitespace and collapses inner whitespace', () => {
    expect(normalize('  ahl   al kitab  ')).toBe('ahl al kitab')
  })

  it('strips Arabic harakat diacritics (keeps alif-maqsura for now)', () => {
    expect(normalize('مُوسَى')).toBe('موسى')
  })

  it('strips tatweel (U+0640)', () => {
    expect(normalize('مـحـمـد')).toBe('محمد')
  })

  it('strips zero-width joiners and BOM', () => {
    expect(normalize('abc\u200Bdef\uFEFF')).toBe('abcdef')
  })

  it('applies NFKC Unicode normalization', () => {
    // Arabic presentation-form ligature ﷲ (U+FDF2) normalizes under NFKC
    expect(normalize('ﷲ')).toBe('الله')
  })
})
