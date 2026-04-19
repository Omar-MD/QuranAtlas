import { describe, it, expect, beforeEach } from 'vitest'

describe('state/settings.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/settings.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/settings.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({
      theme: 'auto',
      fontSize: 'md',
      translationId: null,
      translationVisible: true,
    })
  })

  it('set() shallow-merges patches', () => {
    state.set({ theme: 'dark' })
    expect(state.get().theme).toBe('dark')
    expect(state.get().fontSize).toBe('md') // untouched
  })
})
