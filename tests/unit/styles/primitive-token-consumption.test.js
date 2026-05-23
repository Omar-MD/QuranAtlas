import { describe, expect, it } from 'vitest'
import { runPrimitiveTokenConsumptionCheck } from '../../../scripts/check-primitive-token-consumption.mjs'

describe('check-primitive-token-consumption', () => {
  it('flags primitive token usage outside token files', () => {
    const result = runPrimitiveTokenConsumptionCheck({
      files: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { color: var(--c-ink); }',
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'primitive-token')).toBe(true)
  })

  it('allows semantic tokens and file-local qa variables', () => {
    const result = runPrimitiveTokenConsumptionCheck({
      files: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { --qa-local: var(--qa-text); color: var(--qa-local); }',
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(true)
  })

  it('allows explicit compatibility exceptions with removal conditions', () => {
    const result = runPrimitiveTokenConsumptionCheck({
      files: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { color: var(--c-ink); }',
        },
      ],
      allowlist: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          owner: 'read',
          reason: 'Compatibility shim during token migration.',
          removeWhen: 'Ambient dock adopts semantic token.',
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(true)
  })
})
