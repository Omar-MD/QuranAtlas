import { describe, it, expect, vi, beforeEach } from 'vitest'
import { on, emit, clear } from '../../../src/core/events.js'
import { Events } from '../../../src/core/constants.js'

describe('core/events.js', () => {
  beforeEach(() => {
    clear()
  })

  it('delivers payload to subscriber', () => {
    const handler = vi.fn()
    on(Events.MARKS_SAVED, handler)
    emit(Events.MARKS_SAVED, { value: 42 })
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('supports multiple subscribers for the same event', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on(Events.MARKS_SAVED, h1)
    on(Events.MARKS_SAVED, h2)
    emit(Events.MARKS_SAVED, 'data')
    expect(h1).toHaveBeenCalledWith('data')
    expect(h2).toHaveBeenCalledWith('data')
  })

  it('unsubscribe stops delivery', () => {
    const handler = vi.fn()
    const unsub = on(Events.MARKS_SAVED, handler)
    unsub()
    emit(Events.MARKS_SAVED, 'data')
    expect(handler).not.toHaveBeenCalled()
  })

  it('emit with no subscribers does not throw for a known event', () => {
    expect(() => emit(Events.DB_VERSION_CHANGE, {})).not.toThrow()
  })

  it('clear(type) removes only that type', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on(Events.MARKS_SAVED, h1)
    on(Events.MARKS_DELETED, h2)
    clear(Events.MARKS_SAVED)
    emit(Events.MARKS_SAVED, 'x')
    emit(Events.MARKS_DELETED, 'y')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledWith('y')
  })

  it('clear() removes all listeners', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on(Events.MARKS_SAVED, h1)
    on(Events.MARKS_DELETED, h2)
    clear()
    emit(Events.MARKS_SAVED, 'x')
    emit(Events.MARKS_DELETED, 'y')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('handler error does not break other subscribers', () => {
    const bad = vi.fn(() => { throw new Error('oops') })
    const good = vi.fn()
    on(Events.MARKS_SAVED, bad)
    on(Events.MARKS_SAVED, good)
    emit(Events.MARKS_SAVED, 'data')
    expect(good).toHaveBeenCalledWith('data')
  })
})
