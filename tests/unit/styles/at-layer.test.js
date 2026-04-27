import { describe, it, expect } from 'vitest'
import { checkAtLayer } from '../../../scripts/check-at-layer.mjs'

describe('at-layer enforcement', () => {
  it('flags bare rule outside @layer', () => {
    const fixture = `.qa-foo { color: red; }`
    const { errors } = checkAtLayer(fixture, 'test.css')
    expect(errors).toHaveLength(1)
  })

  it('passes rule inside @layer', () => {
    const fixture = `@layer surfaces { .qa-foo { color: red; } }`
    const { errors } = checkAtLayer(fixture, 'test.css')
    expect(errors).toEqual([])
  })

  it('allows @layer-statement-only files', () => {
    const fixture = `@layer reset, tokens, base; @import "x.css";`
    const { errors } = checkAtLayer(fixture, 'test.css')
    expect(errors).toEqual([])
  })
})
