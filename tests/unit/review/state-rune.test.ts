import { describe, it, expect, beforeEach } from 'vitest'
import { review } from '../../../src/review/state.svelte.ts'

describe('state/review.svelte.ts', () => {
  beforeEach(() => {
    review.view = 'all'
    review.groupBy = 'tag'
    review.sort = 'recent'
    review.activeTag = null
    review.activeTags = []
    review.surahFilter = null
  })

  it('has correct initial state', () => {
    expect(review.view).toBe('all')
    expect(review.groupBy).toBe('tag')
    expect(review.sort).toBe('recent')
    expect(review.activeTag).toBeNull()
    expect(review.activeTags).toEqual([])
    expect(review.surahFilter).toBeNull()
  })

  it('fields are directly assignable', () => {
    review.activeTag = 'mercy'
    expect(review.activeTag).toBe('mercy')
    expect(review.view).toBe('all') // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(review, { view: 'tag', activeTag: 'guidance' })
    expect(review.view).toBe('tag')
    expect(review.activeTag).toBe('guidance')
    expect(review.groupBy).toBe('tag') // untouched
  })
})
