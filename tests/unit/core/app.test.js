import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track call order across mocked router methods
const callOrder = []

function waitForAppWork() {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

function createAppShell() {
  document.body.innerHTML = '<div id="top-bar"></div><main id="main-content"></main>'
}

function applyDefaultRuntimeMocks() {
  vi.doMock('../../../src/core/db.js', () => ({
    openDB: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve(null)),
    getMostRecentPosition: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/nav/index.js', () => ({
    init: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/data/offline.js', () => ({
    initInstallPrompt: vi.fn(),
    getActivationState: vi.fn(() => Promise.resolve('none')),
    cancelDownload: vi.fn(),
    checkStorageQuota: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/a11y/announcer.js', () => ({
    announce: vi.fn(),
  }))
}

async function silenceLogger() {
  // logger is now a noop wrapper in test env; no silencing needed
}

vi.mock('../../../src/core/router.js', () => ({
  init: vi.fn(() => callOrder.push('router.init')),
  register: vi.fn(() => callOrder.push('router.register')),
  navigate: vi.fn(),
}))

vi.mock('../../../src/core/db.js', () => ({
  openDB: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve(null)),
  getMostRecentPosition: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/nav/index.js', () => ({
  init: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/settings/theme.js', () => ({
  initTheme: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/about/pwa-install.js', () => ({
  initInstallListener: vi.fn(),
}))

vi.mock('../../../src/safety/sync.js', () => ({
  init: vi.fn(() => vi.fn()),
}))

vi.mock('../../../src/core/quota-banner.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/marks/indicator.js', () => ({
  init: vi.fn(() => vi.fn()),
}))

vi.mock('../../../src/marks/editor.js', () => ({
  setupLongPress: vi.fn(() => vi.fn()),
  openEditor: vi.fn(),
}))

vi.mock('../../../src/data/offline.js', () => ({
  initInstallPrompt: vi.fn(),
  getActivationState: vi.fn(() => Promise.resolve('none')),
  cancelDownload: vi.fn(),
  checkStorageQuota: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/reader/index.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/review/hub.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/settings/index.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/about/index.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/settings/font-size.js', () => ({
  initFontSize: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/settings/panel.js', () => ({
  initSettingsPanel: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/nav/ambient-dock.js', () => ({
  initAmbientDock: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/nav/ambient-pill.js', () => ({
  initAmbientPill: vi.fn(() => Promise.resolve()),
}))

describe('core/app.js init order', () => {
  beforeEach(() => {
    callOrder.length = 0
    vi.clearAllMocks()
    createAppShell()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('calls router.register before router.init', async () => {
    // Reset modules so app.js re-executes its init() call
    vi.resetModules()
    await silenceLogger()

    // Re-import to trigger the auto-init at bottom of app.js
    const router = await import('../../../src/core/router.js')

    // Importing app.js triggers init() which calls router methods
    await import('../../../src/core/app.js')

    // Allow async init to complete
    await waitForAppWork()

    // Verify router.register was called at least once
    expect(router.register).toHaveBeenCalled()
    // Verify router.init was called
    expect(router.init).toHaveBeenCalled()

    // The key assertion: ALL register calls must come BEFORE init
    const firstInitIndex = callOrder.indexOf('router.init')
    const lastRegisterIndex = callOrder.lastIndexOf('router.register')

    expect(lastRegisterIndex).toBeGreaterThan(-1)
    expect(firstInitIndex).toBeGreaterThan(-1)
    expect(firstInitIndex).toBeGreaterThan(lastRegisterIndex)
  })

  it('injects marks hooks into reader and review routes', async () => {
    vi.resetModules()
    await silenceLogger()

    const router = await import('../../../src/core/router.js')
    await import('../../../src/core/app.js')

    await waitForAppWork()

    expect(router.register).toHaveBeenCalledWith(
      '#/s/:surah',
      expect.any(Function),
      expect.objectContaining({
        initIndicators: expect.any(Function),
        setupLongPress: expect.any(Function),
      })
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/s/:surah/:ayah',
      expect.any(Function),
      expect.objectContaining({
        initIndicators: expect.any(Function),
        setupLongPress: expect.any(Function),
      })
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/review',
      expect.any(Function),
      expect.objectContaining({
        openEditor: expect.any(Function),
      })
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/t/:tag',
      expect.any(Function),
      expect.objectContaining({
        openEditor: expect.any(Function),
      })
    )
  })
})

describe('core/app.js error recovery', () => {
  it('renders error recovery UI when openDB fails', async () => {
    vi.resetModules()
    await silenceLogger()
    // Expected: boot failure path invokes logger.error once
    vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.doMock('../../../src/core/db.js', () => ({
      openDB: vi.fn().mockRejectedValue(new Error('IDB unavailable')),
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(),
      getMostRecentPosition: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../../src/nav/index.js', () => ({ init: vi.fn().mockResolvedValue() }))
    vi.doMock('../../../src/data/offline.js', () => ({
      initInstallPrompt: vi.fn(),
      getActivationState: vi.fn().mockResolvedValue('none'),
      cancelDownload: vi.fn().mockResolvedValue(),
    }))
    vi.doMock('../../../src/a11y/announcer.js', () => ({ announce: vi.fn() }))

    // Clear the body and add a fresh #main-content element
    document.body.innerHTML = '<main id="main-content"></main>'
    const main = document.getElementById('main-content')

    await import('../../../src/core/app.js')
    await new Promise(r => setTimeout(r, 100))

    const errorDiv = main.querySelector('.qa-error-state')
    expect(errorDiv).toBeTruthy()
    expect(errorDiv.textContent).toContain('Failed')

    const retryBtn = main.querySelector('.qa-retry-btn')
    expect(retryBtn).toBeTruthy()
  })

  it('navigates to the last saved surface on launch restore', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'lastSurface') {
        return Promise.resolve({ key, value: '#/review' })
      }
      return Promise.resolve(null)
    })

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await import('../../../src/core/app.js')
    await waitForAppWork()

    router.navigate.mockClear()
    events.emit(Events.ROUTER_LAUNCH_RESTORE)
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/review', { replace: true })
  })

  it('falls back to the most recent position on launch restore', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockResolvedValue(null)
    db.getMostRecentPosition.mockResolvedValue({ surah: 2, verse: 255 })

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await import('../../../src/core/app.js')
    await waitForAppWork()

    router.navigate.mockClear()
    events.emit(Events.ROUTER_LAUNCH_RESTORE)
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/2/255', { replace: true })
  })

  it('opens the default surah when no restore state exists', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockResolvedValue(null)
    db.getMostRecentPosition.mockResolvedValue(null)

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await import('../../../src/core/app.js')
    await waitForAppWork()

    router.navigate.mockClear()
    events.emit(Events.ROUTER_LAUNCH_RESTORE)
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/1', { replace: true })
  })

  it('routes navigation events to the reader with and without verse params', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await import('../../../src/core/app.js')
    await waitForAppWork()

    router.navigate.mockClear()

    events.emit(Events.NAVIGATION_NAVIGATE, { surah: 3, verse: 7 })
    events.emit(Events.NAVIGATION_NAVIGATE, { surah: 4 })
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/3/7')
    expect(router.navigate).toHaveBeenCalledWith('#/s/4')
  })

  it('adds the brand wordmark only once across re-initialization', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const app = await import('../../../src/core/app.js')
    await waitForAppWork()

    await app.init()
    await waitForAppWork()

    expect(document.querySelectorAll('.qa-brand')).toHaveLength(1)
  })

  it('cancels interrupted downloads and emits ready-for-download when online', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })

    const offline = await import('../../../src/data/offline.js')
    offline.getActivationState
      .mockResolvedValueOnce('downloading')
      .mockResolvedValueOnce('none')

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const readyForDownload = vi.fn()
    events.on(Events.APP_READY_FOR_DOWNLOAD, readyForDownload)

    const app = await import('../../../src/core/app.js')
    await waitForAppWork()

    expect(offline.cancelDownload).toHaveBeenCalledTimes(1)
    expect(readyForDownload).not.toHaveBeenCalled()

    offline.cancelDownload.mockClear()
    readyForDownload.mockClear()

    await app.init()
    await waitForAppWork()

    expect(offline.cancelDownload).not.toHaveBeenCalled()
    expect(readyForDownload).toHaveBeenCalledTimes(1)
  })
})
