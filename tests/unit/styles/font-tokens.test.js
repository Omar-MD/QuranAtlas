import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Reader Arabic font-token guard.
 *
 * Each riwayah is paired with its own KFGQPC Uthmanic mushaf cut. Using
 * a different riwayah's font cut mis-renders combining marks, since each
 * cut is authored against its own orthography:
 *   - Hafs   → KFGQPC Uthmanic Hafs   (--ff-kfgqpc-hafs)
 *   - Warsh  → KFGQPC Uthmanic Warsh  (--ff-kfgqpc-warsh)
 *   - Qaloon → KFGQPC Uthmanic Qaloon (--ff-kfgqpc-qaloon)
 *
 * The Amiri / Amiri Quran family was dropped 2026-04-28 — Noto Naskh
 * Arabic is the cross-riwayah fallback in each token's font-family chain;
 * bare `serif` is the last resort.
 */

const repoRoot = process.cwd()
const primitivesCss = readFileSync(resolve(repoRoot, 'src/styles/tokens/primitives.css'), 'utf8')
const semanticCss = readFileSync(resolve(repoRoot, 'src/styles/tokens/semantic.css'), 'utf8')

describe('arabic font tokens — KFGQPC default per riwayah', () => {
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

  it('drops the --ff-amiri-quran token (Amiri family removed 2026-04-28)', () => {
    expect(primitivesCss).not.toMatch(/--ff-amiri-quran/)
    expect(semanticCss).not.toMatch(/--ff-amiri-quran/)
  })

  it('each KFGQPC token chains to Noto Naskh Arabic as cross-riwayah fallback', () => {
    for (const riwayah of ['hafs', 'warsh', 'qaloon']) {
      const re = new RegExp(`--ff-kfgqpc-${riwayah}\\s*:\\s*([^;]+);`)
      const match = primitivesCss.match(re)
      expect(match[1], `--ff-kfgqpc-${riwayah} fallback chain`).toContain("'Noto Naskh Arabic'")
    }
  })

  it('binds each riwayah to its own KFGQPC token', () => {
    const expected = {
      hafs:   'kfgqpc-hafs',
      warsh:  'kfgqpc-warsh',
      qaloon: 'kfgqpc-qaloon',
    }
    for (const [riwayah, token] of Object.entries(expected)) {
      const re = new RegExp(
        `:root\\[data-riwayah=['"]${riwayah}['"]\\][^{]*\\{[^}]*--qa-font-arabic\\s*:\\s*var\\(--ff-${token}\\)`,
      )
      expect(semanticCss, `${riwayah} → --ff-${token}`).toMatch(re)
    }
  })

  it('does not bind two riwayat to the same KFGQPC cut (cross-riwayah font misuse guard)', () => {
    const offenders = []
    for (const riwayah of ['hafs', 'warsh', 'qaloon']) {
      for (const otherCut of ['hafs', 'warsh', 'qaloon']) {
        if (riwayah === otherCut) continue
        const re = new RegExp(
          `:root\\[data-riwayah=['"]${riwayah}['"]\\][^{]*\\{[^}]*--qa-font-arabic\\s*:\\s*var\\(--ff-kfgqpc-${otherCut}\\)`,
        )
        if (re.test(semanticCss)) offenders.push(`${riwayah} → kfgqpc-${otherCut}`)
      }
    }
    expect(offenders, 'no riwayah uses another riwayah\'s KFGQPC cut').toEqual([])
  })

  it('drops the legacy --ff-scheherazade-new token (picker removed)', () => {
    expect(primitivesCss).not.toMatch(/--ff-scheherazade-new/)
    expect(semanticCss).not.toMatch(/--ff-scheherazade-new/)
  })

  it('drops every [data-arabic-font="..."] selector (picker removed)', () => {
    expect(semanticCss).not.toMatch(/data-arabic-font/)
  })

  it('drops every [data-engine="safari"] font-fallback rule', () => {
    expect(semanticCss).not.toMatch(/data-engine\s*=\s*['"]safari['"]/)
  })
})
