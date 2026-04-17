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
})
