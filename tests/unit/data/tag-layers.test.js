import { describe, it, expect } from 'vitest'
import { LAYER_GROUPS, parseLayeredValue, autofillPrefix } from '../../../src/data/tag-layers.ts'

function groupById(id) {
  const g = LAYER_GROUPS.find(x => x.id === id)
  if (!g) { throw new Error(`Unknown group: ${id}`) }
  return g
}

describe('parseLayeredValue', () => {
  it('returns null for empty input', () => {
    expect(parseLayeredValue(groupById('speech'), '   ')).toBeNull()
  })

  it('rejects raw value with no prefix', () => {
    const g = groupById('speech')
    expect(parseLayeredValue(g, 'Allah')).toBeNull()
    expect(parseLayeredValue(g, 'no-colon-here')).toBeNull()
  })

  it('routes to matching layer when prefix is valid', () => {
    const g = groupById('speech')
    expect(parseLayeredValue(g, 'audience:Muminin')).toEqual({ layer: 'audience', value: 'Muminin' })
    expect(parseLayeredValue(g, 'quoted:Shaytan')).toEqual({ layer: 'quotedSpeaker', value: 'Shaytan' })
    expect(parseLayeredValue(g, 'form:oath')).toEqual({ layer: 'form', value: 'oath' })
  })

  it('is case-insensitive on prefix and tolerates whitespace', () => {
    const g = groupById('entities')
    expect(parseLayeredValue(g, 'People : Musa')).toEqual({ layer: 'people', value: 'Musa' })
    expect(parseLayeredValue(g, '  DIVINE:Ar-Rahman  ')).toEqual({ layer: 'divineNames', value: 'Ar-Rahman' })
  })

  it('accepts alias prefixes for divineNames and quotedSpeaker', () => {
    const ent = groupById('entities')
    expect(parseLayeredValue(ent, 'divineNames:Al-Malik')).toEqual({ layer: 'divineNames', value: 'Al-Malik' })
    expect(parseLayeredValue(ent, 'name:As-Salam')).toEqual({ layer: 'divineNames', value: 'As-Salam' })
    const sp = groupById('speech')
    expect(parseLayeredValue(sp, 'quotedspeaker:Iblis')).toEqual({ layer: 'quotedSpeaker', value: 'Iblis' })
  })

  it('rejects prefix that matches no layer in the group', () => {
    // speaker prefix is not valid in entities group
    expect(parseLayeredValue(groupById('entities'), 'speaker:Allah')).toBeNull()
    // completely unknown prefix
    expect(parseLayeredValue(groupById('themes'), 'xyz:mercy')).toBeNull()
  })

  it('rejects prefix with empty value', () => {
    expect(parseLayeredValue(groupById('speech'), 'speaker:')).toBeNull()
    expect(parseLayeredValue(groupById('speech'), 'speaker:   ')).toBeNull()
  })

  it('rejects leading colon (no prefix)', () => {
    expect(parseLayeredValue(groupById('themes'), ':mercy')).toBeNull()
  })
})

describe('autofillPrefix', () => {
  it('returns null for empty input', () => {
    expect(autofillPrefix(groupById('speech'), '')).toBeNull()
  })

  it('returns null once a colon is present', () => {
    expect(autofillPrefix(groupById('speech'), 'speaker:')).toBeNull()
    expect(autofillPrefix(groupById('speech'), 'speaker:Al')).toBeNull()
  })

  it('completes a partial prefix with trailing colon', () => {
    expect(autofillPrefix(groupById('speech'), 's')).toBe('speaker:')
    expect(autofillPrefix(groupById('speech'), 'q')).toBe('quoted:')
    expect(autofillPrefix(groupById('entities'), 'd')).toBe('divine:')
    expect(autofillPrefix(groupById('narrative'), 't')).toBe('tone:')
  })

  it('is case-insensitive', () => {
    expect(autofillPrefix(groupById('speech'), 'SP')).toBe('speaker:')
    expect(autofillPrefix(groupById('entities'), 'PeO')).toBe('people:')
  })

  it('returns null when typed equals a full prefix already', () => {
    // lets user type `:` themselves once they already have a complete word
    expect(autofillPrefix(groupById('speech'), 'speaker')).toBeNull()
    expect(autofillPrefix(groupById('entities'), 'divine')).toBeNull()
  })

  it('returns null when no prefix in the group starts with the fragment', () => {
    expect(autofillPrefix(groupById('themes'), 'xyz')).toBeNull()
    // speaker not in entities group
    expect(autofillPrefix(groupById('entities'), 'spea')).toBeNull()
  })

  it('picks the first matching alias in group-layer order', () => {
    // entities: people, places, events, divineNames → 'p' should hit people first
    expect(autofillPrefix(groupById('entities'), 'p')).toBe('people:')
    // narrative: mode first, then tone
    expect(autofillPrefix(groupById('narrative'), 'm')).toBe('mode:')
  })
})
