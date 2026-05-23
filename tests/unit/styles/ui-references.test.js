import { describe, expect, it } from 'vitest'
import { checkUiReferences } from '../../../scripts/check-ui-references.mjs'

describe('check-ui-references', () => {
  it('fails orphan images', () => {
    const result = checkUiReferences({
      files: [
        {
          path: 'docs/ui-references/read/verse-row/default.mobile.light.png',
          content: null,
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'orphan-image')).toBe(true)
  })

  it('fails orphan notes', () => {
    const result = checkUiReferences({
      files: [
        {
          path: 'docs/ui-references/read/verse-row/default.mobile.light.md',
          content: '## Component\nVerse row',
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'orphan-note')).toBe(true)
  })

  it('fails notes missing required fields', () => {
    const result = checkUiReferences({
      files: [
        {
          path: 'docs/ui-references/read/verse-row/default.mobile.light.png',
          content: null,
        },
        {
          path: 'docs/ui-references/read/verse-row/default.mobile.light.md',
          content: '## Component\nVerse row',
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'missing-field')).toBe(true)
  })

  it('allows allowlisted matrix notes', () => {
    const result = checkUiReferences({
      files: [
        {
          path: 'docs/ui-references/README.md',
          content: '# UI References',
        },
        {
          path: 'docs/ui-references/configure/matrix.md',
          content: '# Matrix',
        },
      ],
      allowlist: [
        {
          path: 'docs/ui-references/configure/matrix.md',
          owner: 'configure',
          reason: 'Index note for migration inventory.',
          category: 'matrix-note',
        },
      ],
    })

    expect(result.ok).toBe(true)
  })

  it('fails flat reference paths outside the taxonomy', () => {
    const result = checkUiReferences({
      files: [
        {
          path: 'docs/ui-references/configure/asset-management.mobile.png',
          content: null,
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'invalid-path')).toBe(true)
  })

  it('fails stray system files', () => {
    const result = checkUiReferences({
      files: [
        {
          path: 'docs/ui-references/configure/.DS_Store',
          content: null,
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'system-file')).toBe(true)
  })
})
