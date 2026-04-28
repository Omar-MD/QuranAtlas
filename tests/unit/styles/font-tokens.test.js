import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Reader Arabic font-token guard.
 *
 * 2026-04-27: shipped the single-font (Amiri Quran) cascade after retiring
 * the KFGQPC trio for an iOS hollow-mark bug.
 *
 * 2026-04-28: re-introduced the KFGQPC trio (Hafs v22, Warsh V21, Qaloon V21)
 * AND Scheherazade New as opt-in alternates per Riwayah. Default for every
 * Riwayah is still Amiri Quran. The opt-in fonts only activate when the user
 * sets `<html data-arabic-font='kfgqpc'>` or `'scheherazade'` from the
 * Settings → Typography subview (per-Riwayah persistence in IDB keys
 * `arabicFont_hafs`, `arabicFont_warsh`, `arabicFont_qaloon`).
 *
 * The assertions below codify both the default-stays-Amiri-Quran invariant
 * AND the opt-in cascade shape so neither side regresses.
 */

const repoRoot = process.cwd()
const primitivesCss = readFileSync(resolve(repoRoot, 'src/styles/tokens/primitives.css'), 'utf8')
const semanticCss = readFileSync(resolve(repoRoot, 'src/styles/tokens/semantic.css'), 'utf8')

describe('arabic font tokens — Amiri Quran default + KFGQPC/Scheherazade opt-in', () => {
  it('defines --ff-amiri-quran with Amiri Quran as the primary family', () => {
    const match = primitivesCss.match(/--ff-amiri-quran\s*:\s*([^;]+);/)
    expect(match, '--ff-amiri-quran token defined').not.toBeNull()
    expect(match[1].trim()).toMatch(/^'Amiri Quran'/)
  })

  it('initial --qa-font-arabic resolves to var(--ff-amiri-quran)', () => {
    expect(semanticCss).toMatch(/--qa-font-arabic\s*:\s*var\(--ff-amiri-quran\)/)
  })

  it('binds all three riwayat default to --ff-amiri-quran', () => {
    for (const riwayah of ['hafs', 'warsh', 'qaloon']) {
      const re = new RegExp(`:root\\[data-riwayah=['"]${riwayah}['"]\\]`)
      expect(semanticCss, `riwayah selector ${riwayah}`).toMatch(re)
    }
    const bindingMatches = semanticCss.match(/--qa-font-arabic\s*:\s*var\(--ff-amiri-quran\)/g) ?? []
    expect(bindingMatches.length, 'at least 2 default bindings (root + riwayah block)').toBeGreaterThanOrEqual(2)
  })

  it('defines a --ff-kfgqpc-{riwayah} token for each riwayah with the matching family', () => {
    const expected = {
      hafs: 'KFGQPC Uthmanic Hafs',
      warsh: 'KFGQPC Uthmanic Warsh',
      qaloon: 'KFGQPC Uthmanic Qaloon',
    }
    for (const [riwayah, family] of Object.entries(expected)) {
      const re = new RegExp(`--ff-kfgqpc-${riwayah}\\s*:\\s*([^;]+);`)
      const match = primitivesCss.match(re)
      expect(match, `--ff-kfgqpc-${riwayah} token defined`).not.toBeNull()
      expect(match[1]).toContain(`'${family}'`)
    }
  })

  it('defines --ff-scheherazade-new with Scheherazade New as the primary family', () => {
    const match = primitivesCss.match(/--ff-scheherazade-new\s*:\s*([^;]+);/)
    expect(match, '--ff-scheherazade-new token defined').not.toBeNull()
    expect(match[1].trim()).toMatch(/^'Scheherazade New'/)
  })

  it('opt-in KFGQPC cascade activates only under [data-arabic-font="kfgqpc"] AND matching riwayah', () => {
    for (const riwayah of ['hafs', 'warsh', 'qaloon']) {
      const re = new RegExp(
        `:root\\[data-riwayah=['"]${riwayah}['"]\\]\\[data-arabic-font=['"]kfgqpc['"]\\][^{]*\\{[^}]*--qa-font-arabic\\s*:\\s*var\\(--ff-kfgqpc-${riwayah}\\)`,
      )
      expect(semanticCss, `kfgqpc cascade for ${riwayah}`).toMatch(re)
    }
  })

  it('opt-in Scheherazade cascade activates under [data-arabic-font="scheherazade"]', () => {
    expect(semanticCss).toMatch(
      /:root\[data-arabic-font=['"]scheherazade['"]\][^{]*\{[^}]*--qa-font-arabic\s*:\s*var\(--ff-scheherazade-new\)/,
    )
  })

  it('drops every [data-engine="safari"] font-fallback rule', () => {
    expect(semanticCss).not.toMatch(/data-engine\s*=\s*['"]safari['"]/)
  })
})
