import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Tokens now split across semantic.css; surface rules in _legacy.css +
// per-surface files under surfaces/ (migrates per-surface in PRs 2-13).
// Onboarding styles co-located in Onboarding.svelte.
const PRIMITIVES_CSS = readFileSync(resolve(__dirname, '../../../src/styles/tokens/primitives.css'), 'utf8')
const SEMANTIC_CSS = readFileSync(resolve(__dirname, '../../../src/styles/tokens/semantic.css'), 'utf8')
const LEGACY_CSS = readFileSync(resolve(__dirname, '../../../src/styles/surfaces/_legacy.css'), 'utf8')
const SHEET_CSS = readFileSync(resolve(__dirname, '../../../src/styles/surfaces/sheet.css'), 'utf8')
const MODAL_CSS = readFileSync(resolve(__dirname, '../../../src/styles/surfaces/modal.css'), 'utf8')
const APP_SHELL_CSS = readFileSync(resolve(__dirname, '../../../src/styles/surfaces/app-shell.css'), 'utf8')
const ABOUT_CSS = readFileSync(resolve(__dirname, '../../../src/styles/surfaces/about.css'), 'utf8')
const ONBOARDING_CSS = readFileSync(resolve(__dirname, '../../../src/styles/surfaces/onboarding.css'), 'utf8')
const THEME_CSS = `${PRIMITIVES_CSS}\n${SEMANTIC_CSS}\n${LEGACY_CSS}\n${SHEET_CSS}\n${MODAL_CSS}\n${APP_SHELL_CSS}\n${ABOUT_CSS}\n${ONBOARDING_CSS}`

describe('styles — responsive breakpoint tokens', () => {
  it('defines --qa-bp-tablet: 768px in :root', () => {
    expect(THEME_CSS).toMatch(/--(qa-bp|bp)-tablet:\s*768px/)
  })

  it('defines --qa-bp-desktop: 1180px in :root', () => {
    expect(THEME_CSS).toMatch(/--(qa-bp|bp)-desktop:\s*1180px/)
  })

  it('defines --qa-text-size-arabic as clamp(2.125rem, 1.85rem + 1.4vw, 2.75rem)', () => {
    // Value either directly on the semantic token or via --fs-arabic primitive.
    expect(THEME_CSS).toMatch(
      /--(qa-text-size-arabic|fs-arabic):\s*clamp\(\s*2\.125rem\s*,\s*1\.85rem\s*\+\s*1\.4vw\s*,\s*2\.75rem\s*\)/
    )
  })

  it('defines --qa-text-size-translation as clamp(1.0625rem, 1rem + 0.3vw, 1.125rem)', () => {
    expect(THEME_CSS).toMatch(
      /--(qa-text-size-translation|fs-translation):\s*clamp\(\s*1\.0625rem\s*,\s*1rem\s*\+\s*0\.3vw\s*,\s*1\.125rem\s*\)/
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

  it('overrides --qa-text-size-ui to 1.125rem (or var(--fs-lg)) at min-width: 1180px', () => {
    const block = THEME_CSS.match(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/)
    expect(block, 'desktop :root override block must exist').not.toBeNull()
    expect(block[0]).toMatch(/--qa-text-size-ui:\s*(1\.125rem|var\(--fs-lg\))/)
    // Primitive --fs-lg is 1.125rem — verified in primitives.css
    expect(SEMANTIC_CSS).toMatch(/--qa-text-size-ui:\s*var\(--fs-lg\)|--qa-text-size-ui:\s*1\.125rem/)
  })

  it('overrides --qa-text-size-meta to 1rem (or var(--fs-md)) at min-width: 1180px', () => {
    const block = THEME_CSS.match(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{\s*:root\s*\{[^}]*\}\s*\}/)
    expect(block, 'desktop :root override block must exist').not.toBeNull()
    expect(block[0]).toMatch(/--qa-text-size-meta:\s*(1rem|var\(--fs-md\))/)
  })

  // .qa-verse tablet rules moved to Reader.svelte <style> block (Phase 5 migration)

  it('at desktop, #main-content max-width expands to 1180px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /#main-content\s*\{[^}]*max-width:\s*1180px/.test(b[1]))
    expect(hit, 'expected a min-width: 1180px block with #main-content { max-width: 1180px }').toBeDefined()
  })

  // .qa-verse desktop padding rules moved to Reader.svelte <style> block (Phase 5 migration)

  it('at desktop, reader #main-content caps at 960px for a comfortable reading measure', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /#main-content:has\(\.qa-verse\)\s*\{[^}]*max-width:\s*960px/.test(b[1])
    )
    expect(hit, 'expected a min-width: 1180px block capping #main-content:has(.qa-verse) at 960px').toBeDefined()
  })

  // .qa-verse-arabic desktop margin rules moved to Reader.svelte <style> block (Phase 5 migration)

  /* .qa-dock-item responsive rules now live in nav/AmbientDock.svelte <style> */

  it('sheet-to-centered-modal triggers at min-width: 768px (not 720px)', () => {
    // The .qa-sheet centered-modal rules must live in a 768px block now.
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      // Accept both split positioning (top: 50%) and shorthand inset.
      (/\.qa-sheet\s*\{[^}]*top:\s*50%/.test(b[1]) || /\.qa-sheet\s*\{[^}]*inset:\s*50%/.test(b[1])) &&
      /\.qa-sheet\s*\{[^}]*width:\s*min\(480px,\s*calc\(100vw\s*-\s*32px\)\)/.test(b[1])
    )
    expect(hit, 'expected sheet-centered-modal rules under min-width: 768px').toBeDefined()
  })

  it('no remaining @media (min-width: 720px) targeting .qa-sheet', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*720px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const sheetHit = blocks.find(b => /\.qa-sheet\s*\{/.test(b[1]))
    expect(sheetHit, 'no 720px block should still target .qa-sheet').toBeUndefined()
  })

  it('at desktop, .qa-sheet--mark widens to 820px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet\.qa-sheet--mark[^{]*\{[^}]*width:\s*min\(820px,\s*calc\(100vw\s*-\s*48px\)\)/.test(b[1])
    )
    expect(hit, 'expected .qa-sheet--mark to widen to 820px at desktop').toBeDefined()
  })

  // NOTE: .qa-mark-body 2-col grid and flex-column left/right layout are now
  // co-located in src/marks/Editor.svelte <style> (Task 7 of the Svelte migration).
  // These theme.css assertions were removed from this test file accordingly.

  /* .qa-cmd-sheet/.qa-cmd-foot responsive rules now live in nav/CommandSheet.svelte <style> */

  it('onboarding landscape guard: max-height: 500px shrinks .qa-onb-page', () => {
    // Onboarding CSS lives in src/styles/surfaces/onboarding.css (PR 6 migration).
    const blocks = [...ONBOARDING_CSS.matchAll(/@media\s*\(\s*max-height:\s*500px\s*\)\s*\{([\s\S]*?)\n    \}\s*\n  \}/g)]
    const hit = blocks.find(b =>
      /\.qa-onb-page\s*\{[^}]*min-height:\s*100%/.test(b[1]) &&
      /\.qa-onb-page\s*\{[^}]*justify-content:\s*flex-start/.test(b[1])
    )
    expect(hit, 'expected .qa-onb-page height guard at max-height 500px').toBeDefined()
  })
})
