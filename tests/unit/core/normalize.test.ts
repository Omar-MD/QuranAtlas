import { describe, it, expect } from 'vitest'
import { normalize } from '../../../src/core/normalize'

describe('normalize', () => {
  it('trims outer whitespace and collapses inner whitespace', () => {
    expect(normalize('  ahl   al kitab  ')).toBe('ahl al kitab')
  })

  it('strips Arabic harakat diacritics and folds alif-maqsura', () => {
    // ى is folded to ي as part of the Arabic-letter-variant pipeline
    expect(normalize('مُوسَى')).toBe('موسي')
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

  it('folds Arabic alif variants to ا', () => {
    expect(normalize('إبراهيم')).toBe('ابراهيم')
    expect(normalize('أحمد')).toBe('احمد')
    expect(normalize('آية')).toBe('ايه')  // includes ة→ه
  })

  it('folds alif-maqsura to ya', () => {
    expect(normalize('موسى')).toBe('موسي')
  })

  it('folds hamza-on-waw and hamza-on-ya', () => {
    expect(normalize('مؤمنين')).toBe('مومنين')
    expect(normalize('ئس')).toBe('يس')
  })

  it('folds ta-marbuta to ha', () => {
    expect(normalize('جنة')).toBe('جنه')
  })

  it('strips ASCII apostrophes', () => {
    expect(normalize("mu'minin")).toBe('muminin')
  })

  it('folds ASCII hyphens to spaces', () => {
    expect(normalize('ahl-al-kitab')).toBe('ahl al kitab')
  })
})
