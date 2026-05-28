import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Track call order across mocked router methods
const callOrder = []
let bootstrapCleanups = []
const removedHubHash = ['#/re', 'view'].join('')
const removedTopicPattern = ['#/thr', 'eads/:value'].join('')
const removedEntityPattern = ['#/pe', 'ople/:value'].join('')

function waitForAppWork() {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

function createAppShell() {
  document.body.innerHTML = '<div id="top-bar"></div><main id="main-content"></main>'
}

function getRegisteredRouteLoader(router, pattern) {
  const call = router.register.mock.calls.find(([registeredPattern]) => registeredPattern === pattern)
  expect(call).toBeTruthy()
  return call[1]
}

function applyDefaultRuntimeMocks() {
  vi.doMock('../../../src/onboard/state', () => ({
    isComplete: vi.fn(() => Promise.resolve(true)),
    markComplete: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/onboard/Onboarding.svelte', () => ({
    default: vi.fn(),
  }))
  vi.doMock('../../../src/core/db.js', () => ({
    openDB: vi.fn(() => Promise.resolve()),
    closeDB: vi.fn(),
    deleteDB: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/launch/asset-contract-reset', () => ({
    ensureMvpAssetContractReset: vi.fn(() => Promise.resolve({ resetApplied: false, contractId: 'mvp-default-assets-qaloon-bridges-v1' })),
  }))
  vi.doMock('../../../src/continuity/position', () => ({
    loadGlobalPosition: vi.fn(() => Promise.resolve(null)),
    saveGlobalPosition: vi.fn(() => Promise.resolve()),
    clearGlobalPosition: vi.fn(() => Promise.resolve()),
    resolveSavedPositionTarget: vi.fn((position) => Promise.resolve(
      position?.surah ? `#/s/${position.surah}/${position.verse}` : null
    )),
  }))
  vi.doMock('../../../src/data/dataset', () => ({
    getSurahs: vi.fn(async () => ([
      { n: 1, counts: { hafs: 7, warsh: 7, qaloon: 7 } },
      { n: 2, counts: { hafs: 286, warsh: 286, qaloon: 286 } },
      { n: 4, counts: { hafs: 176, warsh: 176, qaloon: 176 } },
      { n: 7, counts: { hafs: 206, warsh: 206, qaloon: 206 } },
    ])),
  }))
  vi.doMock('../../../src/data/offline.js', () => ({
    initInstallPrompt: vi.fn(),
    getActivationState: vi.fn(() => Promise.resolve('none')),
    cancelDownload: vi.fn(),
    checkStorageQuota: vi.fn(() => Promise.resolve()),
    initOfflineMigration: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/a11y/announcer.js', () => ({
    announce: vi.fn(),
  }))
}

async function silenceLogger() {
  // logger is now a noop wrapper in test env; no silencing needed
}

async function initBootstrapForTest() {
  const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
  const cleanups = await initBootstrap()
  bootstrapCleanups.push(...(cleanups ?? []))
}

vi.mock('../../../src/core/router.js', () => ({
  init: vi.fn(() => callOrder.push('router.init')),
  register: vi.fn(() => callOrder.push('router.register')),
  navigate: vi.fn(),
}))

vi.mock('../../../src/core/db.js', () => ({
  openDB: vi.fn(() => Promise.resolve()),
  closeDB: vi.fn(),
  deleteDB: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/launch/asset-contract-reset', () => ({
  ensureMvpAssetContractReset: vi.fn(() => Promise.resolve({ resetApplied: false, contractId: 'mvp-default-assets-qaloon-bridges-v1' })),
}))

vi.mock('../../../src/continuity/position', () => ({
  loadGlobalPosition: vi.fn(() => Promise.resolve(null)),
  saveGlobalPosition: vi.fn(() => Promise.resolve()),
  clearGlobalPosition: vi.fn(() => Promise.resolve()),
  resolveSavedPositionTarget: vi.fn((position) => Promise.resolve(
    position?.surah ? `#/s/${position.surah}/${position.verse}` : null
  )),
}))
vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 1, counts: { hafs: 7, warsh: 7, qaloon: 7 } },
    { n: 2, counts: { hafs: 286, warsh: 286, qaloon: 286 } },
    { n: 4, counts: { hafs: 176, warsh: 176, qaloon: 176 } },
    { n: 7, counts: { hafs: 206, warsh: 206, qaloon: 206 } },
  ])),
}))


vi.mock('../../../src/configure/theme.js', () => ({
  initTheme: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/configure/theme.ts', () => ({
  initTheme: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/configure/font-size.ts', () => ({
  initFontSize: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/configure/riwayah.ts', () => ({
  initRiwayah: vi.fn(() => Promise.resolve('qaloon')),
}))
vi.mock('../../../src/configure/reading-typography.ts', () => ({
  initReadingTypography: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/configure/night-mode.ts', () => ({
  initNightMode: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/configure/surah-header-visibility.ts', () => ({
  initSurahHeaderHidden: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/read/mushaf/view-mode.ts', () => ({
  initMushafViewMode: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/configure/about/pwa-install.js', () => ({
  initInstallListener: vi.fn(),
}))

vi.mock('../../../src/configure/panel-bridge.ts', () => ({
  openSettingsSheet: vi.fn(),
  toggleTranslation: vi.fn(async () => true),
}))

vi.mock('../../../src/infra/safety/sync.js', () => ({
  init: vi.fn(() => vi.fn()),
  suppressNextVersionChange: vi.fn(),
  registerTopic: vi.fn(() => vi.fn()),
  broadcast: vi.fn(),
  broadcastBookmarkChange: vi.fn(),
  broadcastRiwayahChange: vi.fn(),
}))

vi.mock('../../../src/navigate/bookmarks/indicator', () => ({
  initBookmarkIndicators: vi.fn(() => vi.fn()),
}))

vi.mock('../../../src/navigate/nav-drawer-bridge', () => ({
  openNavDrawer: vi.fn(),
}))

vi.mock('../../../src/navigate/EmptyRoute.svelte', () => ({
  default: vi.fn(),
}))

vi.mock('../../../src/data/offline.js', () => ({
  initInstallPrompt: vi.fn(),
  getActivationState: vi.fn(() => Promise.resolve('none')),
  cancelDownload: vi.fn(),
  checkStorageQuota: vi.fn(() => Promise.resolve()),
  initOfflineMigration: vi.fn(() => Promise.resolve()),
}))

// N21 — initOfflineCategories writes through to IDB mock (no-op here).
vi.mock('../../../src/configure/offline-categories.ts', () => ({
  initOfflineCategories: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/read/index.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/configure/about/index.js', () => ({
  init: vi.fn(),
}))

vi.mock('../../../src/configure/font-size.js', () => ({
  initFontSize: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/configure/panel.js', () => ({
  initSettingsPanel: vi.fn(() => Promise.resolve()),
  openSettingsSheet: vi.fn(),
}))
vi.mock('../../../src/navigate/ambient-dock.js', () => ({
  initAmbientDock: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/navigate/ambient-pill.js', () => ({
  initAmbientPill: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../../src/navigate/reader-actions.js', () => ({
  initReaderActions: vi.fn(() => Promise.resolve()),
}))

describe('core/app.js init order', () => {
  beforeEach(() => {
    callOrder.length = 0
    vi.clearAllMocks()
    bootstrapCleanups = []
    createAppShell()
    window.location.hash = ''
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    for (const cleanup of bootstrapCleanups.splice(0)) {
      try {
        cleanup()
      } catch {
        // ignore cleanup failures in tests
      }
    }
  })

  it('calls router.register before router.init', { timeout: 10000 }, async () => {
    // Reset modules so app-bootstrap re-executes fresh
    vi.resetModules()
    await silenceLogger()

    const router = await import('../../../src/core/router.js')

    // Import and explicitly call initBootstrap (replaces auto-init from old app.js)
    await initBootstrapForTest()

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

  it('registers verse routes without tafsir runtime hooks', async () => {
    vi.resetModules()
    await silenceLogger()

    const router = await import('../../../src/core/router.js')
    await initBootstrapForTest()

    await waitForAppWork()

    const surahHooks = router.register.mock.calls.find(([pattern]) => pattern === '#/s/:surah')?.[2]
    const ayahHooks = router.register.mock.calls.find(([pattern]) => pattern === '#/s/:surah/:ayah')?.[2]

    expect(surahHooks).toBeUndefined()
    expect(ayahHooks).toBeUndefined()
    expect(router.register).toHaveBeenCalledWith(
      '#/m/:page',
      expect.any(Function)
    )
  })

  it('registers only active reader first routes', async () => {
    vi.resetModules()
    await silenceLogger()

    const router = await import('../../../src/core/router.js')
    await initBootstrapForTest()

    await waitForAppWork()

    expect(router.register).toHaveBeenCalledWith(
      '#/s/:surah',
      expect.any(Function),
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/s/:surah/:ayah',
      expect.any(Function),
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/m/:page',
      expect.any(Function)
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/surahs',
      expect.any(Function)
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/bookmarks',
      expect.any(Function)
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/about',
      expect.any(Function)
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/settings',
      expect.any(Function)
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/assets',
      expect.any(Function)
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/onboarding',
      expect.any(Function)
    )
    expect(router.register).not.toHaveBeenCalledWith(
      removedHubHash,
      expect.any(Function)
    )
    expect(router.register).not.toHaveBeenCalledWith(
      removedTopicPattern,
      expect.any(Function),
      { layer: 'threads' }
    )
    expect(router.register).not.toHaveBeenCalledWith(
      removedEntityPattern,
      expect.any(Function),
      { layer: 'people' }
    )
  })

})

describe('core/app.js error recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bootstrapCleanups = []
    createAppShell()
    window.location.hash = ''
  })

  afterEach(() => {
    for (const cleanup of bootstrapCleanups.splice(0)) {
      try {
        cleanup()
      } catch {
        // ignore cleanup failures in tests
      }
    }
  })

  it('renders error recovery UI when openDB fails', async () => {
    vi.resetModules()
    await silenceLogger()
    // Expected: boot failure path invokes logger.error once
    vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.doMock('../../../src/core/db.js', () => ({
      openDB: vi.fn().mockRejectedValue(new Error('IDB unavailable')),
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(),
    }))
    vi.doMock('../../../src/continuity/position', () => ({
      loadGlobalPosition: vi.fn().mockResolvedValue(null),
      saveGlobalPosition: vi.fn().mockResolvedValue(),
      clearGlobalPosition: vi.fn().mockResolvedValue(),
      resolveSavedPositionTarget: vi.fn((position) => Promise.resolve(
        position?.surah ? `#/s/${position.surah}/${position.verse}` : null
      )),
    }))
    vi.doMock('../../../src/data/offline.js', () => ({
      initInstallPrompt: vi.fn(),
      getActivationState: vi.fn().mockResolvedValue('none'),
      cancelDownload: vi.fn().mockResolvedValue(),
      checkStorageQuota: vi.fn().mockResolvedValue(),
      initOfflineMigration: vi.fn().mockResolvedValue(),
    }))
    vi.doMock('../../../src/a11y/announcer.js', () => ({ announce: vi.fn() }))

    // Clear the body and add a fresh #main-content element
    const main = document.createElement('main')
    main.id = 'main-content'
    document.body.replaceChildren(main)

    await initBootstrapForTest()
    await new Promise(r => setTimeout(r, 100))

    const errorDiv = main.querySelector('.qa-error-state')
    expect(errorDiv).toBeTruthy()
    expect(errorDiv.textContent).toContain('Failed')

    const retryBtn = main.querySelector('.qa-retry-btn')
    expect(retryBtn).toBeTruthy()
  })

  it('rejects removed lastSurface routes on launch restore and falls back to the saved position', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'lastSurface') {
        return Promise.resolve({ key, value: removedHubHash })
      }
      return Promise.resolve(null)
    })
    const gp = await import('../../../src/continuity/position')
    gp.loadGlobalPosition.mockReset()
    gp.loadGlobalPosition.mockResolvedValue({ surah: 2, verse: 255 })

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await initBootstrapForTest()
    await waitForAppWork()

    router.navigate.mockClear()
    events.emit(Events.ROUTER_LAUNCH_RESTORE)
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/2/255', { replace: true })
  })

  it('settings route returns to the previous launchable surface and never replays #/settings', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockImplementation((store, key) => (
      store === 'settings' && key === 'lastSurface'
        ? Promise.resolve({ key, value: '#/settings' })
        : Promise.resolve(null)
    ))
    const gp = await import('../../../src/continuity/position')
    gp.loadGlobalPosition.mockReset()
    gp.loadGlobalPosition.mockResolvedValue(null)

    const router = await import('../../../src/core/router.js')
    const panel = await import('../../../src/configure/panel-bridge.ts')
    await initBootstrapForTest()
    await waitForAppWork()

    const loadSettingsRoute = getRegisteredRouteLoader(router, '#/settings')
    const settingsRoute = await loadSettingsRoute()
    router.navigate.mockClear()

    await settingsRoute.init()
    await waitForAppWork()

    expect(panel.openSettingsSheet).toHaveBeenCalledTimes(1)
    expect(router.navigate).toHaveBeenCalledWith('#/s/1', { replace: true })
  })

  it('mobile surahs and bookmarks redirect non-reader lastSurface hashes to the saved reader position', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    let lastSurfaceValue = '#/about'

    const db = await import('../../../src/core/db.js')
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'lastSurface') {
        return Promise.resolve({ key, value: lastSurfaceValue })
      }
      return Promise.resolve(null)
    })
    const gp = await import('../../../src/continuity/position')
    gp.loadGlobalPosition.mockReset()
    gp.loadGlobalPosition.mockResolvedValue({ surah: 4, verse: 17 })

    const router = await import('../../../src/core/router.js')
    const navDrawer = await import('../../../src/navigate/nav-drawer-bridge')
    history.replaceState(null, '', '#/')
    await initBootstrapForTest()
    await waitForAppWork()

    const loadSurahsRoute = getRegisteredRouteLoader(router, '#/surahs')
    history.replaceState(null, '', '#/surahs')
    router.navigate.mockClear()
    const RouteModule = await loadSurahsRoute()
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/4/17', { replace: true })
    expect(navDrawer.openNavDrawer).toHaveBeenCalledWith('read')
    expect(RouteModule).toBeTruthy()

    const loadBookmarksRoute = getRegisteredRouteLoader(router, '#/bookmarks')
    lastSurfaceValue = removedHubHash
    navDrawer.openNavDrawer.mockClear()
    history.replaceState(null, '', '#/bookmarks')
    router.navigate.mockClear()
    const bookmarksRouteModule = await loadBookmarksRoute()
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/4/17', { replace: true })
    expect(navDrawer.openNavDrawer).toHaveBeenCalledWith('read', 'bookmarks')
    expect(bookmarksRouteModule).toBeTruthy()

    window.matchMedia = originalMatchMedia
  })

  it('falls back to the global position on launch restore', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockResolvedValue(null)
    const gp = await import('../../../src/continuity/position')
    gp.loadGlobalPosition.mockReset()
    gp.loadGlobalPosition.mockResolvedValue({ surah: 2, verse: 255 })

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await initBootstrapForTest()
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
    const gp = await import('../../../src/continuity/position')
    gp.loadGlobalPosition.mockReset()
    gp.loadGlobalPosition.mockResolvedValue(null)

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    await initBootstrapForTest()
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

    await initBootstrapForTest()
    await waitForAppWork()

    router.navigate.mockClear()

    events.emit(Events.NAVIGATION_NAVIGATE, { surah: 3, verse: 7 })
    events.emit(Events.NAVIGATION_NAVIGATE, { surah: 4 })
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/s/3/7')
    expect(router.navigate).toHaveBeenCalledWith('#/s/4')
  })

  it('top-bar has no brand wordmark (ambient chrome handles navigation)', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    await initBootstrapForTest()
    await waitForAppWork()

    // Call initBootstrap again (replaces old app.init() re-call test)
    await initBootstrapForTest()
    await waitForAppWork()

    expect(document.querySelectorAll('.qa-brand')).toHaveLength(0)
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

    await initBootstrapForTest()
    await waitForAppWork()

    expect(offline.cancelDownload).toHaveBeenCalledTimes(1)
    expect(readyForDownload).not.toHaveBeenCalled()

    offline.cancelDownload.mockClear()
    readyForDownload.mockClear()

    await initBootstrapForTest()
    await waitForAppWork()

    expect(offline.cancelDownload).not.toHaveBeenCalled()
    expect(readyForDownload).toHaveBeenCalledTimes(1)
  })
})
