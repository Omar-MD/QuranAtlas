import { describe, it, expect, vi } from 'vitest'
import { createOverlayBridge, type BaseOverlayAPI } from '../../../src/core/persistent-overlay'

interface TestAPI extends BaseOverlayAPI {
  open(): void
  greet(name: string): string
}

interface TestPayloadAPI extends BaseOverlayAPI {
  open(opts: { id: string }): void
}

describe('createOverlayBridge', () => {
  it('returns noop before register without mounter', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    expect(bridge.isOpen()).toBe(false)
    const result = (bridge.api as unknown as Record<string, unknown>).greet
    expect(typeof result).toBe('function')
    // Call without mounter — should be silent no-op, no throw.
    expect(() => bridge.api.open()).not.toThrow()
  })

  it('proxies method calls to registered API', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    let opened = false
    const api: TestAPI = {
      open: () => { opened = true },
      close: () => { opened = false },
      isOpen: () => opened,
      greet: (name: string) => `hello ${name}`,
    }
    bridge.register(api)
    bridge.api.open()
    expect(bridge.isOpen()).toBe(true)
    expect(bridge.api.greet('world')).toBe('hello world')
    bridge.api.close()
    expect(bridge.isOpen()).toBe(false)
  })

  it('unregister clears the registration', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    const api: TestAPI = {
      open: () => undefined,
      close: () => undefined,
      isOpen: () => true,
      greet: () => 'hi',
    }
    bridge.register(api)
    expect(bridge.isOpen()).toBe(true)
    bridge.unregister()
    expect(bridge.isOpen()).toBe(false)
  })

  it('isOpen() handles a registered API that throws', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    bridge.register({
      open: () => undefined,
      close: () => undefined,
      isOpen: () => { throw new Error('boom') },
      greet: () => '',
    })
    expect(bridge.isOpen()).toBe(false)
  })

  it('setMounter fires once on first call before register', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    const mounter = vi.fn()
    bridge.setMounter(mounter)
    bridge.api.open()
    bridge.api.greet('a')
    bridge.api.close()
    // Mounter triggers exactly once across multiple pre-register calls.
    expect(mounter).toHaveBeenCalledTimes(1)
  })

  it('drains pending queue on register, in arrival order, with payloads', () => {
    const bridge = createOverlayBridge<TestPayloadAPI>({ name: 'test' })
    bridge.setMounter(() => undefined)
    const calls: Array<{ id: string }> = []
    bridge.api.open({ id: 'first' })
    bridge.api.open({ id: 'second' })
    bridge.api.open({ id: 'third' })
    bridge.register({
      open: (opts) => { calls.push(opts) },
      close: () => undefined,
      isOpen: () => false,
    })
    expect(calls.map(c => c.id)).toEqual(['first', 'second', 'third'])
  })

  it('post-register calls bypass the queue and dispatch directly', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    bridge.setMounter(() => undefined)
    let opened = false
    bridge.register({
      open: () => { opened = true },
      close: () => undefined,
      isOpen: () => opened,
      greet: () => 'hi',
    })
    bridge.api.open()
    expect(opened).toBe(true)
  })

  it('unregister clears pending queue + re-arms the mounter', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    const mounter = vi.fn()
    bridge.setMounter(mounter)
    bridge.api.open()
    expect(mounter).toHaveBeenCalledTimes(1)
    bridge.unregister()
    // After unregister, next pre-register call should re-fire the mounter.
    bridge.api.open()
    expect(mounter).toHaveBeenCalledTimes(2)
  })

  it('register replaces a prior registration and drains fresh queue', () => {
    const bridge = createOverlayBridge<TestPayloadAPI>({ name: 'test' })
    bridge.setMounter(() => undefined)
    const calls: string[] = []
    bridge.api.open({ id: 'a' })
    bridge.register({
      open: (opts) => calls.push('first:' + opts.id),
      close: () => undefined,
      isOpen: () => false,
    })
    expect(calls).toEqual(['first:a'])
    // Replace registration mid-flight (HMR-like).
    bridge.unregister()
    bridge.api.open({ id: 'b' })
    bridge.register({
      open: (opts) => calls.push('second:' + opts.id),
      close: () => undefined,
      isOpen: () => false,
    })
    expect(calls).toEqual(['first:a', 'second:b'])
  })
})
