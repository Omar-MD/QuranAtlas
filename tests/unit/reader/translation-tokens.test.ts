import { describe, it, expect } from 'vitest'
import { parseTranslationTokens } from '../../../src/reader/translation-tokens'

describe('parseTranslationTokens', () => {
  it('returns an empty list for an empty string', () => {
    expect(parseTranslationTokens('')).toEqual([])
  })

  it('returns a single text token when no markers are present', () => {
    const out = parseTranslationTokens('plain translation text')
    expect(out).toEqual([{ type: 'text', value: 'plain translation text' }])
  })

  it('splits a single marker into [text, fn, text]', () => {
    const out = parseTranslationTokens('before[1] after')
    expect(out).toEqual([
      { type: 'text', value: 'before' },
      { type: 'fn', idx: '1' },
      { type: 'text', value: ' after' },
    ])
  })

  it('handles a marker at the very start', () => {
    const out = parseTranslationTokens('[1] tail')
    expect(out).toEqual([
      { type: 'fn', idx: '1' },
      { type: 'text', value: ' tail' },
    ])
  })

  it('handles a marker at the very end', () => {
    const out = parseTranslationTokens('lead[3]')
    expect(out).toEqual([
      { type: 'text', value: 'lead' },
      { type: 'fn', idx: '3' },
    ])
  })

  it('handles multiple consecutive markers', () => {
    const out = parseTranslationTokens('a[1][2]b')
    expect(out).toEqual([
      { type: 'text', value: 'a' },
      { type: 'fn', idx: '1' },
      { type: 'fn', idx: '2' },
      { type: 'text', value: 'b' },
    ])
  })

  it('handles many markers spread through text', () => {
    const out = parseTranslationTokens('one[1] two[2] three[3] four[4]')
    expect(out).toEqual([
      { type: 'text', value: 'one' },
      { type: 'fn', idx: '1' },
      { type: 'text', value: ' two' },
      { type: 'fn', idx: '2' },
      { type: 'text', value: ' three' },
      { type: 'fn', idx: '3' },
      { type: 'text', value: ' four' },
      { type: 'fn', idx: '4' },
    ])
  })

  it('preserves multi-digit indices', () => {
    const out = parseTranslationTokens('x[42]y')
    expect(out).toEqual([
      { type: 'text', value: 'x' },
      { type: 'fn', idx: '42' },
      { type: 'text', value: 'y' },
    ])
  })

  it('does not match malformed markers like [a] or [12 or 12]', () => {
    const out = parseTranslationTokens('left [a] [12 right 12] end')
    expect(out).toEqual([{ type: 'text', value: 'left [a] [12 right 12] end' }])
  })

  it('preserves Unicode and brackets that are not markers', () => {
    const out = parseTranslationTokens('Allāh,[1] [the] Lord')
    expect(out).toEqual([
      { type: 'text', value: 'Allāh,' },
      { type: 'fn', idx: '1' },
      { type: 'text', value: ' [the] Lord' },
    ])
  })
})
