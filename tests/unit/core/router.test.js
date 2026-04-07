import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as events from '../../../src/core/events.js'

describe('core/router.js', () => {
  beforeEach(async () => {
    events.clear()
    window.location.hash = ''
    const { clearRoutes } = await import('../../../src/core/router.js')
    clearRoutes()
  })

  it('register and navigate calls module init with params', async () => {
    const { register, navigate } = await import('../../../src/core/router.js')
    const mockInit = vi.fn()
    register('#/s/:surah', () => Promise.resolve({ init: mockInit }))

    navigate('#/s/2')

    // Wait for async handleRoute to complete
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith({ surah: '2' })
    }, { timeout: 100 })
  })

  it('emits router:launch-restore on empty hash', async () => {
    const restoreFn = vi.fn()
    events.on('router:launch-restore', restoreFn)

    const { init } = await import('../../../src/core/router.js')
    window.location.hash = ''
    init()

    // Wait for async handleRoute to complete
    await vi.waitFor(() => {
      expect(restoreFn).toHaveBeenCalledWith(undefined)
    }, { timeout: 100 })
  })

  it('navigate with replace uses replaceState', async () => {
    const spy = vi.spyOn(history, 'replaceState')
    const { navigate } = await import('../../../src/core/router.js')

    navigate('#/s/1', { replace: true })
    expect(spy).toHaveBeenCalledWith(null, '', '#/s/1')
    spy.mockRestore()
  })

  it('extracts multi-segment params correctly', async () => {
    const { register, navigate } = await import('../../../src/core/router.js')
    const mockInit = vi.fn()
    register('#/s/:surah/:ayah', () => Promise.resolve({ init: mockInit }))

    navigate('#/s/2/255')

    // Wait for async handleRoute to complete
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith({ surah: '2', ayah: '255' })
    }, { timeout: 100 })
  })
})
