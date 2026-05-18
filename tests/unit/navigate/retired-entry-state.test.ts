import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('removed command sheet state', () => {
  it('does not ship a command sheet state module', () => {
    const retiredModule = ['../../../src/navigate/state', 'command', 'sheet.svelte.ts'].join('-')
    expect(existsSync(new URL(retiredModule, import.meta.url))).toBe(false)
  })
})
