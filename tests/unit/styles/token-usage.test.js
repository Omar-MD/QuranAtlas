import { describe, it, expect } from 'vitest'
import { checkTokenUsage } from '../../../scripts/check-token-usage.mjs'

describe('token usage', () => {
  it('flags var(--qa-...) reference not declared in token CSS or file-local scope', () => {
    const semantic = `:root { --qa-foo: red; }`
    const surfaceFiles = [
      { path: 'surfaces/test.css', content: '.qa-t { color: var(--qa-unknown); background: var(--qa-foo); }' },
    ]
    const { errors } = checkTokenUsage({ semantic, surfaceFiles })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/--qa-unknown.*surfaces\/test\.css/)
  })

  it('passes when token is declared in consuming file itself (scoped custom prop)', () => {
    const semantic = `:root { --qa-a: red; }`
    const surfaceFiles = [
      { path: 'foo.svelte', content: `<div style="--qa-scoped: blue"><span class="x">ok</span></div>
<style>.x { color: var(--qa-scoped); background: var(--qa-a); }</style>` },
    ]
    const { errors } = checkTokenUsage({ semantic, surfaceFiles })
    expect(errors).toEqual([])
  })

  it('passes when all references declared', () => {
    const semantic = `:root { --qa-a: red; --qa-b: blue; }`
    const surfaceFiles = [
      { path: 'surfaces/ok.css', content: '.qa-t { color: var(--qa-a); background: var(--qa-b); }' },
    ]
    const { errors } = checkTokenUsage({ semantic, surfaceFiles })
    expect(errors).toEqual([])
  })

  it('flags undeclared token even inside a fallback', () => {
    const semantic = `:root { --qa-a: red; }`
    const surfaceFiles = [
      { path: 'surfaces/ok.css', content: '.qa-t { color: var(--qa-missing, var(--qa-a)); }' },
    ]
    const { errors } = checkTokenUsage({ semantic, surfaceFiles })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/--qa-missing/)
  })
})
