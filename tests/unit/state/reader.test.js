import { describe, it, expect, beforeEach } from 'vitest'

describe('state/reader.js', () => {
  let state

  beforeEach(async () => {
    const mod = await import('../../../src/state/reader.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set } — no other bindings', async () => {
    const mod = await import('../../../src/state/reader.js')
    const exported = Object.keys(mod)
    expect(exported.sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    const s = state.get()
    expect(s).toMatchObject({
      currentSurah: null,
      currentSurahNum: null,
      currentVerseKey: null,
      fontMultiplier: 1.0,
      translationVisible: true,
      scrollY: 0,
      renderedCount: 0,
      isRendering: false,
      scrollAppendRafPending: false,
      lastTrackedVerse: null,
    })
  })

  it('set() shallow-merges patches', () => {
    state.set({ currentVerseKey: '2:255' })
    expect(state.get().currentVerseKey).toBe('2:255')
    expect(state.get().fontMultiplier).toBe(1.0) // untouched
  })

  it('set() does not throw', () => {
    expect(() => state.set({ scrollY: 500 })).not.toThrow()
  })
})
