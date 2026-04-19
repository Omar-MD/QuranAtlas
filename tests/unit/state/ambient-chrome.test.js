import { describe, it, expect, beforeEach } from 'vitest'

describe('state/ambient-chrome.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/ambient-chrome.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/ambient-chrome.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({
      dockVisible: true,
      pillLabel: '',
      dockFadeTimerHandle: null,
      pillFadeTimerHandle: null,
    })
  })

  it('set() shallow-merges patches', () => {
    state.set({ dockVisible: false })
    expect(state.get().dockVisible).toBe(false)
    expect(state.get().pillLabel).toBe('') // untouched
  })
})
