import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect } from 'vitest'
import { checkAtLayer, listStyleCheckFiles } from '../../../scripts/check-at-layer.mjs'

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

  it('discovers nested pattern css files for checking', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'qa-at-layer-'))
    mkdirSync(join(repoRoot, 'src/styles/patterns'), { recursive: true })
    writeFileSync(
      join(repoRoot, 'src/styles/patterns/sheet.css'),
      '@layer surfaces { .qa-sheet { color: var(--qa-text); } }',
    )

    expect(listStyleCheckFiles(repoRoot)).toContain('src/styles/patterns/sheet.css')
  })
})
