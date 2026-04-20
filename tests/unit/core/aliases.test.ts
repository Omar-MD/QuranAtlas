import { describe, it, expect } from 'vitest'
import { resolveCanonical, isProtectedFromAliasing, buildAliasMap } from '../../../src/core/aliases'

describe('aliases', () => {
  it('resolves known form to canonical', () => {
    expect(resolveCanonical('moses')).toBe('musa')
    expect(resolveCanonical('مومنين')).toBe('muminin')
    expect(resolveCanonical('jannah')).toBe('paradise')
  })

  it('returns input unchanged when no alias matches', () => {
    expect(resolveCanonical('xyz')).toBe('xyz')
  })

  it('protects rank/quality terms from aliasing', () => {
    expect(isProtectedFromAliasing('muminin')).toBe(true)
    expect(isProtectedFromAliasing('muslimin')).toBe(true)
    expect(isProtectedFromAliasing('musa')).toBe(false)
  })

  it('buildAliasMap returns form→canonical map', () => {
    const map = buildAliasMap()
    expect(map.get('moses')).toBe('musa')
    expect(map.get('musa')).toBeUndefined()
  })
})
