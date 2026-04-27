import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Reader Arabic font-token guard.
 *
 * Asserts the single-font Arabic typography wiring shipped 2026-04-27:
 * Amiri Quran (Khaled Hosny, OFL) is the only Quranic Arabic face the app
 * loads, used by all three riwayat (Hafs, Warsh, Qaloon) on every engine.
 * No KFGQPC dependency, no engine-conditional fallback.
 *
 * Validated via Rule 5 break-and-restore at the time of writing — the
 * assertions below were verified to fail when:
 *   - `--ff-amiri-quran` was redefined to `serif` (no Amiri Quran first)
 *   - the riwayah binding pointed at a stale `--ff-kfgqpc-hafs` token
 *   - `[data-engine='safari']` rule was reintroduced to semantic.css
 */

const repoRoot = process.cwd()
const primitivesCss = readFileSync(resolve(repoRoot, 'src/styles/tokens/primitives.css'), 'utf8')
const semanticCss = readFileSync(resolve(repoRoot, 'src/styles/tokens/semantic.css'), 'utf8')

describe('arabic font tokens — Amiri Quran is the single Quranic face', () => {
  it('defines --ff-amiri-quran with Amiri Quran as the primary family', () => {
    const match = primitivesCss.match(/--ff-amiri-quran\s*:\s*([^;]+);/)
    expect(match, '--ff-amiri-quran token defined').not.toBeNull()
    expect(match[1].trim()).toMatch(/^'Amiri Quran'/)
  })

  it('initial --qa-font-arabic resolves to var(--ff-amiri-quran)', () => {
    expect(semanticCss).toMatch(/--qa-font-arabic\s*:\s*var\(--ff-amiri-quran\)/)
  })

  it('binds all three riwayat to --ff-amiri-quran', () => {
    for (const riwayah of ['hafs', 'warsh', 'qaloon']) {
      const re = new RegExp(`:root\\[data-riwayah=['"]${riwayah}['"]\\]`)
      expect(semanticCss, `riwayah selector ${riwayah}`).toMatch(re)
    }
    const bindingMatches = semanticCss.match(/--qa-font-arabic\s*:\s*var\(--ff-amiri-quran\)/g) ?? []
    expect(bindingMatches.length, 'at least 2 bindings (root + riwayah block)').toBeGreaterThanOrEqual(2)
  })

  it('drops every --ff-kfgqpc-* token reference', () => {
    const offenders = []
    for (const css of [primitivesCss, semanticCss]) {
      const matches = css.match(/--ff-kfgqpc-[a-z]+/g)
      if (matches) offenders.push(...matches)
    }
    expect(offenders, 'no --ff-kfgqpc-* references in token files').toEqual([])
  })

  it('drops every [data-engine="safari"] font-fallback rule', () => {
    expect(semanticCss).not.toMatch(/data-engine\s*=\s*['"]safari['"]/)
  })
})
