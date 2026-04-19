import { describe, it, expect, beforeEach } from 'vitest'

describe('state/command-sheet.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/command-sheet.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/command-sheet.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({ query: '', results: [], focusIndex: 0, isOpen: false })
  })

  it('set() shallow-merges patches', () => {
    state.set({ query: 'baqarah', isOpen: true })
    expect(state.get().query).toBe('baqarah')
    expect(state.get().focusIndex).toBe(0) // untouched
  })
})
