import { describe, it, expect, beforeEach } from 'vitest'

describe('state/mark-editor.js', () => {
  let state
  beforeEach(async () => {
    const mod = await import('../../../src/state/mark-editor.js?t=' + Date.now())
    state = mod
  })

  it('exports exactly { get, set }', async () => {
    const mod = await import('../../../src/state/mark-editor.js')
    expect(Object.keys(mod).sort()).toEqual(['get', 'set'])
  })

  it('get() returns initial state shape', () => {
    expect(state.get()).toMatchObject({
      isOpen: false,
      currentVerseKey: null,
      selectedTags: [],
      draftNote: '',
    })
  })

  it('set() shallow-merges patches', () => {
    state.set({ isOpen: true, currentVerseKey: '2:255' })
    expect(state.get().isOpen).toBe(true)
    expect(state.get().draftNote).toBe('') // untouched
  })
})
