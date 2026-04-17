import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const THEME_CSS = readFileSync(resolve(__dirname, '../../../src/core/theme.css'), 'utf8')

describe('theme.css — responsive breakpoint tokens', () => {
  it('defines --qa-bp-tablet: 768px in :root', () => {
    expect(THEME_CSS).toMatch(/--qa-bp-tablet:\s*768px/)
  })

  it('defines --qa-bp-desktop: 1180px in :root', () => {
    expect(THEME_CSS).toMatch(/--qa-bp-desktop:\s*1180px/)
  })

  it('defines --qa-text-size-arabic as clamp(2.25rem, 1.8rem + 2.2vw, 3.5rem)', () => {
    expect(THEME_CSS).toMatch(
      /--qa-text-size-arabic:\s*clamp\(\s*2\.25rem\s*,\s*1\.8rem\s*\+\s*2\.2vw\s*,\s*3\.5rem\s*\)/
    )
  })

  it('defines --qa-text-size-translation as clamp(1.125rem, 1rem + 0.6vw, 1.5rem)', () => {
    expect(THEME_CSS).toMatch(
      /--qa-text-size-translation:\s*clamp\(\s*1\.125rem\s*,\s*1rem\s*\+\s*0\.6vw\s*,\s*1\.5rem\s*\)/
    )
  })

  it('overrides --qa-text-size-ui to 1.0625rem at min-width: 768px', () => {
    const block = THEME_CSS.match(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/)
    expect(block, 'tablet :root override block must exist').not.toBeNull()
    expect(block[0]).toMatch(/--qa-text-size-ui:\s*1\.0625rem/)
  })

  it('overrides --qa-text-size-meta to 0.9375rem at min-width: 768px', () => {
    const block = THEME_CSS.match(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/)
    expect(block, 'tablet :root override block must exist').not.toBeNull()
    expect(block[0]).toMatch(/--qa-text-size-meta:\s*0\.9375rem/)
  })
})
