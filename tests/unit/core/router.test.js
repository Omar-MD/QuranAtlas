import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as events from '../../../src/core/events.js'
import { logger } from '../../../src/core/logger.js'

function findLogContext(spy, message) {
  const call = spy.mock.calls.find(([msg]) => msg === message)
  expect(call).toBeTruthy()
  return call?.[1]
}

describe('core/router.js', () => {
  beforeEach(async () => {
    events.clear()
    window.location.hash = ''
    const { clearRoutes } = await import('../../../src/core/router.js')
    clearRoutes()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('register and navigate calls module init with params', async () => {
    const { register, navigate } = await import('../../../src/core/router.js')
    const mockInit = vi.fn()
    register('#/s/:surah', () => Promise.resolve({ init: mockInit }))

    navigate('#/s/2')

    // Wait for async handleRoute to complete
    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith({ surah: '2' }, {})
    }, { timeout: 100 })
  })

  it('forwards registered hooks to module init', async () => {
    const { register, navigate } = await import('../../../src/core/router.js')
    const mockInit = vi.fn()
    const hooks = { openEditor: vi.fn() }
    register('#/review', () => Promise.resolve({ init: mockInit }), hooks)

    navigate('#/review')

    await vi.waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith({}, hooks)
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
      expect(mockInit).toHaveBeenCalledWith({ surah: '2', ayah: '255' }, {})
    }, { timeout: 100 })
  })

  it('logs structured context when rejecting invalid route params', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { register, navigate } = await import('../../../src/core/router.js')

    register('#/s/:surah', () => Promise.resolve({ init: vi.fn() }))

    navigate('#/s/javascript:alert(1)')

    await vi.waitFor(() => {
      expect(findLogContext(warnSpy, 'Router: rejected param with XSS pattern:')).toEqual({ key: 'surah' })
      expect(findLogContext(errorSpy, 'Route rejected: invalid parameters')).toEqual({ route: '#/s/javascript:alert(1)' })
    }, { timeout: 100 })
  })

  it('popstate with unchanged hash does not re-run the route', async () => {
    const { register, navigate, init } = await import('../../../src/core/router.js')
    const mockInit = vi.fn()
    register('#/s/:surah', () => Promise.resolve({ init: mockInit }))

    // init() adds popstate listener; navigate() sets lastHashHandled = '#/s/2'
    init()
    navigate('#/s/2')

    // Let all spurious calls (from jsdom hashchange + lingering listeners) settle
    await new Promise(r => setTimeout(r, 50))
    mockInit.mockClear()

    // Simulate modal popping its history entry — hash is still '#/s/2'
    window.dispatchEvent(new PopStateEvent('popstate'))

    await new Promise(r => setTimeout(r, 50))
    expect(mockInit).toHaveBeenCalledTimes(0) // guard skipped all popstate handlers
  })

  it('logs structured context when route init fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { register, navigate } = await import('../../../src/core/router.js')

    register('#/review', () => Promise.resolve({ init: vi.fn().mockRejectedValue(new Error('boom')) }))

    navigate('#/review')

    await vi.waitFor(() => {
      const context = findLogContext(errorSpy, 'Route failed:')
      expect(context).toMatchObject({ route: '#/review' })
      expect(context.error).toBeInstanceOf(Error)
      expect(context.error.message).toBe('boom')
    }, { timeout: 100 })
  })
})
