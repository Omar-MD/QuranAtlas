import { describe, expect, it } from 'vitest'
import { analyseStyleEntry } from '../../../scripts/check-style-entry.mjs'

describe('check-style-entry', () => {
  it('fails stale imports', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./missing.css');",
      files: ['src/styles/index.css'],
      entryPath: 'src/styles/index.css',
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'stale-import')).toBe(true)
  })

  it('fails duplicate imports', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./base.css');\n@import url('./base.css');",
      files: ['src/styles/index.css', 'src/styles/base.css'],
      entryPath: 'src/styles/index.css',
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'duplicate-import')).toBe(true)
  })

  it('fails unimported nested shipping partials', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./base.css');",
      files: ['src/styles/index.css', 'src/styles/base.css', 'src/styles/surfaces/read/ambient-dock.css'],
      entryPath: 'src/styles/index.css',
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'missing-import')).toBe(true)
  })

  it('reports ordered imports with resolved paths', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./base.css');",
      files: ['src/styles/index.css', 'src/styles/base.css'],
      entryPath: 'src/styles/index.css',
      repoRoot: '/repo',
      report: true,
    })

    expect(result.report).toContain('1\tsrc/styles/base.css\t/repo/src/styles/base.css')
  })

  it('allows non-entry files only with owner and reason', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./base.css');",
      files: ['src/styles/index.css', 'src/styles/base.css', 'src/styles/surfaces/read/private.css'],
      entryPath: 'src/styles/index.css',
      allowlist: [
        {
          path: 'src/styles/surfaces/read/private.css',
          owner: 'read',
          reason: 'Generated fixture not shipped.',
        },
      ],
    })

    expect(result.ok).toBe(true)
  })
})
