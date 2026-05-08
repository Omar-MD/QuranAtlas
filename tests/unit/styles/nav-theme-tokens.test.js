import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const semanticCss = readFileSync(resolve(process.cwd(), 'src/styles/tokens/semantic.css'), 'utf8')

const REQUIRED_NAV_TOKENS = [
  '--qa-nav-header-surface',
  '--qa-nav-row-surface',
  '--qa-nav-row-surface-hover',
  '--qa-nav-row-border',
  '--qa-nav-row-separator',
  '--qa-nav-current-bg',
  '--qa-nav-current-spine',
  '--qa-nav-control-surface',
  '--qa-nav-control-selected-surface',
  '--qa-nav-control-selected-text',
  '--qa-nav-control-border',
  '--qa-nav-badge-surface',
  '--qa-nav-badge-text',
  '--qa-nav-skeleton-surface',
  '--qa-nav-delete-surface',
  '--qa-nav-delete-text',
  '--qa-nav-shadow-row',
  '--qa-nav-shadow-control',
]

const THEME_AUDITED_TOKENS = [
  '--qa-nav-header-surface',
  '--qa-nav-row-surface',
  '--qa-nav-row-border',
  '--qa-nav-row-separator',
  '--qa-nav-current-bg',
  '--qa-nav-control-surface',
  '--qa-nav-control-selected-surface',
  '--qa-nav-badge-surface',
  '--qa-nav-skeleton-surface',
  '--qa-nav-delete-surface',
  '--qa-nav-delete-text',
  '--qa-nav-shadow-row',
  '--qa-nav-shadow-control',
]

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = semanticCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))
  return match?.[1] ?? ''
}

describe('nav drawer theme tokens', () => {
  it('defines every nav visual role in :root', () => {
    const root = cssBlock(':root')
    for (const token of REQUIRED_NAV_TOKENS) {
      expect(root, `${token} is defined in :root`).toContain(`${token}:`)
    }
  })

  it('audits nav visual roles for sepia and dark themes', () => {
    const sepia = cssBlock('html[data-theme="sepia"]')
    const dark = cssBlock('html[data-theme="dark"]')
    for (const token of THEME_AUDITED_TOKENS) {
      expect(sepia, `${token} has a sepia audit value`).toContain(`${token}:`)
      expect(dark, `${token} has a dark audit value`).toContain(`${token}:`)
    }
  })
})
