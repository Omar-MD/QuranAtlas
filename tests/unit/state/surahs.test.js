import { describe, it, expect, beforeEach } from 'vitest'

describe('state/surahs.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/surahs.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/surahs.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({ searchQuery: '', filter: 'all' })
  })

  it('set() shallow-merges patches', () => {
    state.set({ searchQuery: 'baqarah' })
    expect(state.get().searchQuery).toBe('baqarah')
    expect(state.get().filter).toBe('all') // untouched
  })
})
