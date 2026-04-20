import { describe, it, expect } from 'vitest'
import { normalize, canonicalize } from '../../../src/core/normalize'

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

describe('normalize — drift matrix (spec §3.4)', () => {
  const merged: Array<[string, string[]]> = [
    // [canonical, variations that must all normalize to same value]
    ['موسي',          ['مُوسَى', 'مُوسَىٰ']],
    ['muminin',       ['muminin', "mu'minin"]],
    ['ahl al kitab',  ['ahl al-kitab', 'ahl al kitab', 'ahl-al-kitab']],
    ['مومنين',        ['مؤمنين', 'مومنين']],
  ]

  for (const [canonical, variations] of merged) {
    for (const v of variations) {
      it(`merges "${v}" to canonical "${canonical}"`, () => {
        expect(normalize(v)).toBe(canonical)
      })
    }
  }

  const distinct: Array<[string, string]> = [
    ['muminin', 'muslimin'],
    ['kafirin', 'munafiqin'],
    ['muminin', 'muminim'],
  ]

  for (const [a, b] of distinct) {
    it(`keeps "${a}" distinct from "${b}"`, () => {
      expect(normalize(a)).not.toBe(normalize(b))
    })
  }
})

describe('canonicalize', () => {
  it('resolves Moses to musa via alias', () => {
    expect(canonicalize('Moses')).toBe('musa')
  })

  it('resolves Arabic script via normalization + alias', () => {
    expect(canonicalize('مُوسَى')).toBe('musa')
  })

  it('keeps rank-protected terms distinct', () => {
    expect(canonicalize('muminin')).toBe('muminin')
    expect(canonicalize("Mu'minin")).toBe('muminin')
    expect(canonicalize('muslimin')).toBe('muslimin')
    expect(canonicalize('muminin')).not.toBe(canonicalize('muslimin'))
  })

  it('falls through to normalize result when no alias', () => {
    expect(canonicalize('Some New Tag')).toBe('some new tag')
  })
})
