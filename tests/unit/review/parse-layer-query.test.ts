import { describe, it, expect } from 'vitest'
import { parseLayerFromHash } from '../../../src/review/parse-layer-query'

describe('parseLayerFromHash', () => {
  it('returns null when no query string', () => {
    expect(parseLayerFromHash('#/review')).toBeNull()
  })

  it('returns null when query has no layer key', () => {
    expect(parseLayerFromHash('#/review?other=1')).toBeNull()
  })

  it('returns the layer name when valid', () => {
    expect(parseLayerFromHash('#/review?layer=people')).toBe('people')
    expect(parseLayerFromHash('#/review?layer=threads')).toBe('threads')
    expect(parseLayerFromHash('#/review?layer=divineNames')).toBe('divineNames')
  })

  it('returns null for invalid layer name', () => {
    expect(parseLayerFromHash('#/review?layer=bogus')).toBeNull()
    expect(parseLayerFromHash('#/review?layer=<script>')).toBeNull()
    expect(parseLayerFromHash('#/review?layer=')).toBeNull()
  })

  it('handles trailing query parameters', () => {
    expect(parseLayerFromHash('#/review?layer=mode&x=1')).toBe('mode')
  })

  it('handles non-#/review hashes by returning null', () => {
    expect(parseLayerFromHash('#/s/1?layer=people')).toBeNull()
    expect(parseLayerFromHash('')).toBeNull()
  })
})
