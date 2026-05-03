/**
 * Pure-state tests for the TagSessionState rune.
 *
 * Ports the non-gesture pieces of journey-c-marking that exercise the
 * session lifecycle (begin / end / toggle / totalSelected) without
 * needing a verse mounted in the DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TagSessionState, tagSession } from '../../../../src/mark/tag/state.svelte'
import { LAYER_NAMES } from '../../../../src/core/db'

describe('state/tag-session.svelte.ts', () => {
  beforeEach(() => {
    tagSession.end()
  })

  it('starts empty', () => {
    const s = new TagSessionState()
    expect(s.verseKey).toBeNull()
    expect(s.quickbarOpen).toBe(false)
    expect(s.note).toBe('')
    expect(s.totalSelected()).toBe(0)
    for (const l of LAYER_NAMES) { expect(s.draft[l]).toEqual([]) }
  })

  it('begin() seeds verseKey, copies the current draft per layer, and sets the note', () => {
    const s = new TagSessionState()
    s.begin('1:1', { threads: ['mercy'], audience: ['muminin'] }, 'a thought')
    expect(s.verseKey).toBe('1:1')
    expect(s.note).toBe('a thought')
    expect(s.draft.threads).toEqual(['mercy'])
    expect(s.draft.audience).toEqual(['muminin'])
    // Other layers default to empty arrays.
    expect(s.draft.subjects).toEqual([])
  })

  it('begin() clones the input arrays so external mutation does not bleed into the draft', () => {
    const s = new TagSessionState()
    const seed = ['mercy']
    s.begin('1:1', { threads: seed }, '')
    seed.push('faith')
    expect(s.draft.threads).toEqual(['mercy'])
  })

  it('toggle() flips a value on the named layer', () => {
    const s = new TagSessionState()
    s.begin('1:1')
    s.toggle('threads', 'mercy')
    expect(s.draft.threads).toEqual(['mercy'])
    s.toggle('threads', 'mercy')
    expect(s.draft.threads).toEqual([])
  })

  it('totalSelected() sums across all layers', () => {
    const s = new TagSessionState()
    s.begin('1:1')
    s.toggle('threads', 'mercy')
    s.toggle('audience', 'muminin')
    s.toggle('audience', 'all-people')
    expect(s.totalSelected()).toBe(3)
  })

  it('end() clears verseKey, quickbarOpen, the draft, and the note', () => {
    const s = new TagSessionState()
    s.begin('1:1', { threads: ['mercy'] }, 'note')
    s.quickbarOpen = true
    s.end()
    expect(s.verseKey).toBeNull()
    expect(s.quickbarOpen).toBe(false)
    expect(s.note).toBe('')
    expect(s.totalSelected()).toBe(0)
  })
})
