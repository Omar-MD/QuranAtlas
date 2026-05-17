import { describe, it, expect, vi, beforeEach } from 'vitest'
import { on, emit, clear } from '../../../src/core/events.js'
import { Events } from '../../../src/core/constants.js'

describe('core/events.js', () => {
  beforeEach(() => {
    clear()
  })

  it('delivers payload to subscriber', () => {
    const handler = vi.fn()
    on(Events.BOOKMARKS_SAVED, handler)
    emit(Events.BOOKMARKS_SAVED, { value: 42 })
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('supports multiple subscribers for the same event', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on(Events.BOOKMARKS_SAVED, h1)
    on(Events.BOOKMARKS_SAVED, h2)
    emit(Events.BOOKMARKS_SAVED, 'data')
    expect(h1).toHaveBeenCalledWith('data')
    expect(h2).toHaveBeenCalledWith('data')
  })

  it('unsubscribe stops delivery', () => {
    const handler = vi.fn()
    const unsub = on(Events.BOOKMARKS_SAVED, handler)
    unsub()
    emit(Events.BOOKMARKS_SAVED, 'data')
    expect(handler).not.toHaveBeenCalled()
  })

  it('emit with no subscribers does not throw for a known event', () => {
    expect(() => emit(Events.DB_VERSION_CHANGE, {})).not.toThrow()
  })

  it('clear(type) removes only that type', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on(Events.BOOKMARKS_SAVED, h1)
    on(Events.BOOKMARKS_DELETED, h2)
    clear(Events.BOOKMARKS_SAVED)
    emit(Events.BOOKMARKS_SAVED, 'x')
    emit(Events.BOOKMARKS_DELETED, 'y')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledWith('y')
  })

  it('clear() removes all listeners', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on(Events.BOOKMARKS_SAVED, h1)
    on(Events.BOOKMARKS_DELETED, h2)
    clear()
    emit(Events.BOOKMARKS_SAVED, 'x')
    emit(Events.BOOKMARKS_DELETED, 'y')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('handler error does not break other subscribers', () => {
    const bad = vi.fn(() => { throw new Error('oops') })
    const good = vi.fn()
    on(Events.BOOKMARKS_SAVED, bad)
    on(Events.BOOKMARKS_SAVED, good)
    emit(Events.BOOKMARKS_SAVED, 'data')
    expect(good).toHaveBeenCalledWith('data')
  })

  it('keeps removed review, mark, edge, and audio events out of the enum', () => {
    expect(Events.REVIEW_OPEN).toBeUndefined()
    expect(Events.REVIEW_FILTER).toBeUndefined()
    expect(Events.MARKS_SAVED).toBeUndefined()
    expect(Events.MARKS_DELETED).toBeUndefined()
    expect(Events.MARKS_UNDO).toBeUndefined()
    expect(Events.MARKS_SAVE_FAILED).toBeUndefined()
    expect(Events.EDGES_SAVED).toBeUndefined()
    expect(Events.EDGES_DELETED).toBeUndefined()
    expect(Events.EDGES_SAVE_FAILED).toBeUndefined()
    expect(Events.SYNC_EDGES_UPDATED).toBeUndefined()
    expect(Events.AUDIO_STARTED).toBeUndefined()
    expect(Events.AUDIO_VERSE_CHANGED).toBeUndefined()
    expect(Events.AUDIO_PAUSED).toBeUndefined()
    expect(Events.AUDIO_ENDED).toBeUndefined()
    expect(Events.AUDIO_ERROR).toBeUndefined()
    expect(Events.AUDIO_RECITER_CHANGED).toBeUndefined()
  })
})
