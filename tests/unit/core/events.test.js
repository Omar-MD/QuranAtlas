import { describe, it, expect, vi, beforeEach } from 'vitest'
import { on, emit, clear } from '../../../src/core/events.js'

describe('core/events.js', () => {
  beforeEach(() => {
    clear()
  })

  it('delivers payload to subscriber', () => {
    const handler = vi.fn()
    on('test:event', handler)
    emit('test:event', { value: 42 })
    expect(handler).toHaveBeenCalledWith({ value: 42 })
  })

  it('supports multiple subscribers for the same event', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on('test:event', h1)
    on('test:event', h2)
    emit('test:event', 'data')
    expect(h1).toHaveBeenCalledWith('data')
    expect(h2).toHaveBeenCalledWith('data')
  })

  it('unsubscribe stops delivery', () => {
    const handler = vi.fn()
    const unsub = on('test:event', handler)
    unsub()
    emit('test:event', 'data')
    expect(handler).not.toHaveBeenCalled()
  })

  it('emit with no subscribers does not throw', () => {
    expect(() => emit('nonexistent', {})).not.toThrow()
  })

  it('clear(type) removes only that type', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on('a', h1)
    on('b', h2)
    clear('a')
    emit('a', 'x')
    emit('b', 'y')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledWith('y')
  })

  it('clear() removes all listeners', () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    on('a', h1)
    on('b', h2)
    clear()
    emit('a', 'x')
    emit('b', 'y')
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('handler error does not break other subscribers', () => {
    const bad = vi.fn(() => { throw new Error('oops') })
    const good = vi.fn()
    on('test:event', bad)
    on('test:event', good)
    emit('test:event', 'data')
    expect(good).toHaveBeenCalledWith('data')
  })
})
