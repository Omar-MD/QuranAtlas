import { describe, it, expect, beforeEach } from 'vitest'

describe('state/review.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/review.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/review.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({
      view: 'all',
      groupBy: 'tag',
      sort: 'recent',
      activeTag: null,
      activeTags: [],
      surahFilter: null,
    })
  })

  it('set() shallow-merges patches', () => {
    state.set({ activeTag: 'mercy' })
    expect(state.get().activeTag).toBe('mercy')
    expect(state.get().view).toBe('all') // untouched
  })
})
