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

  it('at desktop, container collapses to single column when translation hidden (uses :has)', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /:has\(\s*\.qa-verse-translation\.qa-hide-translation\s*\)/.test(b[1]))
    expect(hit, 'expected a desktop :has() rule for translation-off collapse').toBeDefined()
    // container max-width shrinks to 900px in the translation-hidden state
    expect(hit[1]).toMatch(/max-width:\s*900px/)
  })

  it('bumps .qa-dock-item size at tablet (42×42px)', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-dock-item\s*\{[^}]*width:\s*2\.625rem/.test(b[1]) &&
      /\.qa-dock-item\s*\{[^}]*height:\s*2\.625rem/.test(b[1])
    )
    expect(hit, 'expected a min-width: 768px block bumping .qa-dock-item to 42×42px').toBeDefined()
  })

  it('at desktop, .qa-dock-label un-hides (position: static)', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-dock-label\s*\{[^}]*position:\s*static/.test(b[1]))
    expect(hit, 'expected a min-width: 1180px block un-hiding .qa-dock-label').toBeDefined()
  })

  it('at desktop, .qa-dock-item becomes pill-shaped with gap + padding', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-dock-item\s*\{[^}]*border-radius:\s*999px/.test(b[1]) &&
      /\.qa-dock-item\s*\{[^}]*gap:\s*0\.5rem/.test(b[1])
    )
    expect(hit, 'expected .qa-dock-item to be pill-shaped with gap 0.5rem at desktop').toBeDefined()
  })

  it('sheet-to-centered-modal triggers at min-width: 768px (not 720px)', () => {
    // The .qa-sheet centered-modal rules must live in a 768px block now.
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet\s*\{[^}]*top:\s*10vh/.test(b[1]) &&
      /\.qa-sheet\s*\{[^}]*width:\s*min\(480px,\s*calc\(100vw\s*-\s*32px\)\)/.test(b[1])
    )
    expect(hit, 'expected sheet-centered-modal rules under min-width: 768px').toBeDefined()
  })

  it('no remaining @media (min-width: 720px) targeting .qa-sheet', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*720px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const sheetHit = blocks.find(b => /\.qa-sheet\s*\{/.test(b[1]))
    expect(sheetHit, 'no 720px block should still target .qa-sheet').toBeUndefined()
  })

  it('at desktop, .qa-sheet--mark widens to 640px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet\.qa-sheet--mark[^{]*\{[^}]*width:\s*min\(640px,\s*calc\(100vw\s*-\s*32px\)\)/.test(b[1])
    )
    expect(hit, 'expected .qa-sheet--mark to widen to 640px at desktop').toBeDefined()
  })

  it('at desktop, .qa-mark-body becomes a 2-column grid', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet--mark\s+\.qa-mark-body\s*\{[^}]*display:\s*grid/.test(b[1]) &&
      /\.qa-sheet--mark\s+\.qa-mark-body\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/.test(b[1])
    )
    expect(hit, 'expected .qa-mark-body to be 2-col grid at desktop').toBeDefined()
  })

  it('at desktop, mark-body left column hosts quote + note; right hosts tags', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-mark-quote[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-note[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-selected[^{]*\{[^}]*grid-column:\s*2/.test(b[1])
    )
    expect(hit, 'expected quote+note in col 1 and selected tags in col 2').toBeDefined()
  })

  it('at desktop, .qa-cmd-sheet caps max-width at 640px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-cmd-sheet\s*\{[^}]*max-width:\s*640px/.test(b[1]))
    expect(hit, 'expected .qa-cmd-sheet to cap at 640px at desktop').toBeDefined()
  })

  it('at tablet+, .qa-cmd-foot is explicitly shown', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-cmd-foot\s*\{[^}]*display:\s*flex/.test(b[1]))
    expect(hit, 'expected .qa-cmd-foot display:flex at min-width 768px').toBeDefined()
  })

  it('onboarding landscape guard: max-height: 500px shrinks .qa-onb-page', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*max-height:\s*500px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-onb-page\s*\{[^}]*min-height:\s*100%/.test(b[1]) &&
      /\.qa-onb-page\s*\{[^}]*justify-content:\s*flex-start/.test(b[1])
    )
    expect(hit, 'expected .qa-onb-page height guard at max-height 500px').toBeDefined()
  })
})
