import { describe, it, expect, beforeEach } from 'vitest'
import { surahs } from '../../../../src/navigate/surahs/state.svelte.ts'

describe('state/surahs.svelte.ts', () => {
  beforeEach(() => {
    surahs.searchQuery = ''
    surahs.filter = 'all'
  })

  it('has correct initial state', () => {
    expect(surahs.searchQuery).toBe('')
    expect(surahs.filter).toBe('all')
  })

  it('fields are directly assignable', () => {
    surahs.searchQuery = 'baqarah'
    expect(surahs.searchQuery).toBe('baqarah')
    expect(surahs.filter).toBe('all') // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(surahs, { searchQuery: 'test', filter: 'bookmarked' })
    expect(surahs.searchQuery).toBe('test')
    expect(surahs.filter).toBe('bookmarked')
  })
})
