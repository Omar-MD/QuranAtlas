import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkThemeParity } from '../../../scripts/check-theme-parity.mjs'

const semanticCss = readFileSync(
  resolve(process.cwd(), 'src/styles/tokens/semantic.css'),
  'utf8',
)

describe('theme parity', () => {
  it('every token defined in a theme override exists in :root', () => {
    const result = checkThemeParity(semanticCss)
    expect(result.errors).toEqual([])
  })

  it('detects orphan token in dark override when :root missing it', () => {
    const fixture = `
      :root { --qa-foo: red; }
      html[data-theme="dark"] { --qa-foo: blue; --qa-bar: green; }
    `
    const result = checkThemeParity(fixture)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/--qa-bar.*dark.*not defined in :root/)
  })

  it('passes when override is subset of root', () => {
    const fixture = `
      :root { --qa-foo: red; --qa-bar: blue; }
      html[data-theme="sepia"] { --qa-foo: pink; }
    `
    const result = checkThemeParity(fixture)
    expect(result.errors).toEqual([])
  })
})
