import { describe, it, expect } from 'vitest'
import { createOverlayBridge, type BaseOverlayAPI } from '../../../src/core/persistent-overlay'

interface TestAPI extends BaseOverlayAPI {
  greet(name: string): string
}

describe('createOverlayBridge', () => {
  it('returns noop before register', () => {
    const bridge = createOverlayBridge<TestAPI>({ name: 'test' })
    expect(bridge.isOpen()).toBe(false)
    // Calling a method on the proxy before register is a no-op.
    const result = (bridge.api as unknown as Record<string, unknown>).greet
    expect(typeof result).toBe('function')
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
})
