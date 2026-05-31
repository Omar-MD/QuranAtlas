import { describe, expect, it } from 'vitest'

import { parseSearchQuery, SearchQueryParseError } from '../../../src/search/query-parser'

describe('Search query parser', () => {
  it('normalizes diacritized Arabic and Quran marks', () => {
    const parsed = parseSearchQuery('قُلْۚ هُوَ ٱللَّهُ أَحَدٌ', { mode: 'arabic-text' })
    expect(parsed.ast.tokens).toEqual(['قل', 'هو', 'الله', 'احد'])
    expect(parsed.queryHash).toMatch(/^[a-f0-9]{8}$/)
  })

  it('folds hamza and alif variants', () => {
    expect(parseSearchQuery('أإآٱا', { mode: 'arabic-text' }).ast.tokens).toEqual(['ااااا'])
  })

  it('keeps exact word form marks for exact word search', () => {
    const exact = 'اللَّهِ'
    expect(parseSearchQuery(exact, { mode: 'exact-word-form' }).ast.tokens[0]).toMatch(/[\u064B-\u065F]/)
  })

  it('parses common ayah reference forms', () => {
    expect(parseSearchQuery('2:255').reference).toBe('2:255')
    expect(parseSearchQuery('Surah 2 255').reference).toBe('2:255')
  })

  it('supports mixed Arabic and English through token boundaries', () => {
    const parsed = parseSearchQuery('Surah 112: قل هو الله احد')
    expect(parsed.ast.tokens).toContain('Surah')
    expect(parsed.ast.tokens).toContain('الله')
  })

  it('rejects unsupported Phase 2 root mode and overlong phrases', () => {
    expect(() => parseSearchQuery('رحم', { mode: 'same-root' })).toThrow(SearchQueryParseError)
    expect(() => parseSearchQuery('one two three four five six seven eight nine', { mode: 'phrase' })).toThrow(/maximum/)
  })
})
