import { describe, expect, it } from 'vitest'
import { runDesignLiteralCheck } from '../../../scripts/check-design-literals.mjs'

describe('check-design-literals', () => {
  it('flags hardcoded colours, motion, and radius literals', () => {
    const result = runDesignLiteralCheck({
      files: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { color: #fff; transition: color 120ms ease; border-radius: 8px; }',
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'hardcoded-color')).toBe(true)
    expect(result.findings.some((f) => f.code === 'raw-motion')).toBe(true)
    expect(result.findings.some((f) => f.code === 'raw-radius')).toBe(true)
  })

  it('accepts local waivers for intentional literals', () => {
    const result = runDesignLiteralCheck({
      files: [
        {
          path: 'src/styles/surfaces/onboard/swatches.css',
          content: '/* qa-design-literal-allow color: theme swatch preview */\n.qa-onb-swatch { background: #f5e6ba; }',
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(true)
  })

  it('stays green in advisory mode', () => {
    const result = runDesignLiteralCheck({
      files: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { color: #fff; }',
        },
      ],
      advisory: true,
    })

    expect(result.ok).toBe(true)
    expect(result.findings.some((f) => f.code === 'hardcoded-color')).toBe(true)
  })
})
