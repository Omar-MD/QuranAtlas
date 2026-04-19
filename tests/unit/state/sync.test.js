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
    expect(state.get()).toMatchObject({ broadcastChannel: null, deferredQueue: [] })
  })

  it('set() shallow-merges patches', () => {
    state.set({ deferredQueue: ['2:1'] })
    expect(state.get().deferredQueue).toEqual(['2:1'])
    expect(state.get().broadcastChannel).toBeNull() // untouched
  })
})
