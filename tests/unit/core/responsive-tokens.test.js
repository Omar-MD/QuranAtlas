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

  it('overrides --qa-text-size-ui to 1.125rem at min-width: 1180px', () => {
    const block = THEME_CSS.match(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/)
    expect(block, 'desktop :root override block must exist').not.toBeNull()
    expect(block[0]).toMatch(/--qa-text-size-ui:\s*1\.125rem/)
  })

  it('overrides --qa-text-size-meta to 1rem at min-width: 1180px', () => {
    const block = THEME_CSS.match(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/)
    expect(block, 'desktop :root override block must exist').not.toBeNull()
    expect(block[0]).toMatch(/--qa-text-size-meta:\s*1rem/)
  })

  it('bumps .qa-verse padding + border gap at tablet', () => {
    // Extract any min-width: 768px block that contains .qa-verse
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => b[1].includes('.qa-verse'))
    expect(hit, 'expected a min-width: 768px block containing .qa-verse').toBeDefined()
    expect(hit[1]).toMatch(/\.qa-verse\s*\{[^}]*padding:\s*1\.875rem\s+0/)
  })

  it('at desktop, #main-content max-width expands to 1180px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => b[1].includes('#main-content'))
    expect(hit, 'expected a min-width: 1180px block containing #main-content').toBeDefined()
    expect(hit[1]).toMatch(/#main-content\s*\{[^}]*max-width:\s*1180px/)
  })

  it('at desktop, .qa-verse padding bumped to 2.25rem', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => b[1].includes('.qa-verse'))
    expect(hit, 'expected a min-width: 1180px block containing .qa-verse').toBeDefined()
    expect(hit[1]).toMatch(/\.qa-verse\s*\{[^}]*padding:\s*2\.25rem\s+0/)
  })

  it('at desktop, #main-content becomes a 2-column grid', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /#main-content\s*\{[^}]*display:\s*grid/.test(b[1]) &&
      /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/.test(b[1])
    )
    expect(hit, 'expected a min-width: 1180px block making #main-content a 2-col grid').toBeDefined()
  })

  it('at desktop, .qa-verse uses subgrid for row alignment', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-verse\s*\{[^}]*grid-template-columns:\s*subgrid/.test(b[1]))
    expect(hit, 'expected .qa-verse to use subgrid at desktop').toBeDefined()
  })

  it('at desktop, non-verse children of #main-content span both columns', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-surah-header[^{]*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(b[1]) &&
      /\.qa-basmala[^{]*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(b[1]) &&
      /\.qa-surah-end[^{]*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(b[1])
    )
    expect(hit, 'expected header/basmala/end-marker to span both columns').toBeDefined()
  })

  it('at desktop, .qa-verse-arabic uses text-align: start (right under RTL)', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-verse-arabic\s*\{[^}]*text-align:\s*start/.test(b[1]))
    expect(hit, 'expected .qa-verse-arabic text-align: start at desktop').toBeDefined()
  })
})
