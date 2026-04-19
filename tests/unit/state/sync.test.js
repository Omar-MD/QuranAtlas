import { describe, it, expect, beforeEach } from 'vitest'

describe('state/sync.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/sync.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/sync.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({ broadcastChannel: null })
  })

  it('set() shallow-merges patches', () => {
    const someMockChannel = {}
    state.set({ broadcastChannel: someMockChannel })
    expect(state.get().broadcastChannel).toBe(someMockChannel)
  })
})
