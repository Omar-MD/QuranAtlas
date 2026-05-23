import { describe, expect, it } from 'vitest'
import { runSelectorLivenessCheck } from '../../../scripts/check-selector-liveness.mjs'

describe('check-selector-liveness', () => {
  it('reports css classes with no code reference', () => {
    const result = runSelectorLivenessCheck({
      cssFiles: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { color: var(--qa-text); }',
        },
      ],
      codeFiles: [],
      advisory: false,
    })

    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'css-only-class')).toBe(true)
  })

  it('recognises svelte class directives and classList mutations', () => {
    const result = runSelectorLivenessCheck({
      cssFiles: [
        {
          path: 'src/styles/surfaces/onboard/swatches.css',
          content: '.qa-onb-sw--auto {}\n.qa-onb-active {}',
        },
      ],
      codeFiles: [
        {
          path: 'src/onboard/Swatches.svelte',
          content: `<div class:qa-onb-sw--auto={isAuto}></div>\n<script>node.classList.add('qa-onb-active')</script>`,
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(true)
  })

  it('allows dynamic patterns only with full allowlist metadata', () => {
    const result = runSelectorLivenessCheck({
      cssFiles: [],
      codeFiles: [
        {
          path: 'src/onboard/Swatches.svelte',
          content: "const className = `qa-onb-sw--${theme}`",
        },
      ],
      allowlist: [
        {
          pattern: '^qa-onb-sw--',
          owner: 'onboard',
          category: 'dynamic-class',
          reason: 'Theme swatch modifiers are runtime-generated.',
          removeWhen: 'Swatches move to explicit enum mapping.',
        },
      ],
      advisory: false,
    })

    expect(result.ok).toBe(true)
    expect(result.uncertain.length).toBe(0)
  })

  it('stays green in advisory mode', () => {
    const result = runSelectorLivenessCheck({
      cssFiles: [
        {
          path: 'src/styles/surfaces/read/ambient-dock.css',
          content: '.qa-read-ambient-dock { color: var(--qa-text); }',
        },
      ],
      codeFiles: [],
      advisory: true,
    })

    expect(result.ok).toBe(true)
    expect(result.findings.some((f) => f.code === 'css-only-class')).toBe(true)
  })
})
