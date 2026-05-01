import { describe, it, expect } from 'vitest'
import { EDGE_KIND_SEEDS, inferDirectedFromKind } from '../../../../src/review/edges/kinds'

describe('edges/kinds', () => {
  it('ships seed kinds from spec §4.13', () => {
    expect(EDGE_KIND_SEEDS).toContain('parallel')
    expect(EDGE_KIND_SEEDS).toContain('explains')
    expect(EDGE_KIND_SEEDS).toContain('abrogates')
  })
  it('parallel + contrast + same-story + same-character + echo are symmetric', () => {
    expect(inferDirectedFromKind('parallel')).toBe(false)
    expect(inferDirectedFromKind('contrast')).toBe(false)
    expect(inferDirectedFromKind('same-story')).toBe(false)
    expect(inferDirectedFromKind('same-character')).toBe(false)
    expect(inferDirectedFromKind('echo')).toBe(false)
  })
  it('explains + expands + fulfills + abrogates are directed', () => {
    expect(inferDirectedFromKind('explains')).toBe(true)
    expect(inferDirectedFromKind('abrogates')).toBe(true)
  })
  it('unknown kinds default to directed', () => {
    expect(inferDirectedFromKind('custom-xyz')).toBe(true)
  })
})
