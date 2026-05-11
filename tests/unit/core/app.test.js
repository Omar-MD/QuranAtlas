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
  vi.doMock('../../../src/onboard/state', () => ({
    isComplete: vi.fn(() => Promise.resolve(true)),
    markComplete: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/onboard/Onboarding.svelte', () => ({
    default: vi.fn(),
  }))
  vi.doMock('../../../src/core/db.js', () => ({
    openDB: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
    LAYER_NAMES: [
      'threads', 'subjects', 'audience', 'speaker', 'quotedSpeaker',
      'mode', 'form', 'tone', 'people', 'places', 'events', 'divineNames',
    ],
  }))
  vi.doMock('../../../src/read/global-position', () => ({
    loadGlobalPosition: vi.fn(() => Promise.resolve(null)),
    saveGlobalPosition: vi.fn(() => Promise.resolve()),
    clearGlobalPosition: vi.fn(() => Promise.resolve()),
  }))
  vi.doMock('../../../src/navigate/command-sheet.js', () => ({
    initCommandSheet: vi.fn(() => Promise.resolve()),
    openCommandSheet: vi.fn(),
    closeCommandSheet: vi.fn(),
    destroyCommandSheet: vi.fn(),
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

vi.mock('../../../src/core/router.js', () => ({
  init: vi.fn(() => callOrder.push('router.init')),
  register: vi.fn(() => callOrder.push('router.register')),
  navigate: vi.fn(),
}))

vi.mock('../../../src/core/db.js', () => ({
  openDB: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
  LAYER_NAMES: [
    'threads', 'subjects', 'audience', 'speaker', 'quotedSpeaker',
    'mode', 'form', 'tone', 'people', 'places', 'events', 'divineNames',
  ],
}))

vi.mock('../../../src/read/global-position', () => ({
  loadGlobalPosition: vi.fn(() => Promise.resolve(null)),
  saveGlobalPosition: vi.fn(() => Promise.resolve()),
  clearGlobalPosition: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/navigate/command-sheet.js', () => ({
  initCommandSheet: vi.fn(() => Promise.resolve()),
  openCommandSheet: vi.fn(),
  closeCommandSheet: vi.fn(),
  destroyCommandSheet: vi.fn(),
}))

vi.mock('../../../src/configure/theme.js', () => ({
  initTheme: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/configure/about/pwa-install.js', () => ({
  initInstallListener: vi.fn(),
}))

vi.mock('../../../src/infra/safety/sync.js', () => ({
  init: vi.fn(() => vi.fn()),
  suppressNextVersionChange: vi.fn(),
  registerTopic: vi.fn(() => vi.fn()),
  broadcast: vi.fn(),
  broadcastMarkChange: vi.fn(),
  broadcastEdgeChange: vi.fn(),
  broadcastBookmarkChange: vi.fn(),
  broadcastRiwayahChange: vi.fn(),
}))

vi.mock('../../../src/mark/indicator', () => ({
  initIndicators: vi.fn(() => vi.fn()),
  init: vi.fn(() => vi.fn()), // legacy alias
}))

vi.mock('../../../src/mark/editor-bridge', () => ({
  openEditor: vi.fn(),
  registerEditor: vi.fn(),
}))

vi.mock('../../../src/mark/long-press', () => ({
  longPress: vi.fn(),
  setupLongPress: vi.fn(() => vi.fn()),
  setupTapGestures: vi.fn(() => vi.fn()),
}))

vi.mock('../../../src/mark/tag/session-bridge', () => ({
  beginFast: vi.fn(() => Promise.resolve()),
  openDeep: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/read/tafsir-bridge', () => ({
  openTafsirPreview: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../src/read/tafsir-state.svelte', () => ({
  tafsirState: { previewOpen: false },
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

vi.mock('../../../src/review/hub.js', () => ({
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
    createAppShell()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('calls router.register before router.init', async () => {
    // Reset modules so app-bootstrap re-executes fresh
    vi.resetModules()
    await silenceLogger()

    const router = await import('../../../src/core/router.js')

    // Import and explicitly call initBootstrap (replaces auto-init from old app.js)
    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()

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
    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()

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
      '#/m/:page',
      expect.any(Function)
    )
    // #/review is a Svelte component route — no hooks object
    expect(router.register).toHaveBeenCalledWith(
      '#/review',
      expect.any(Function)
    )
    // FVR: each layer route passes { layer } as hook — check threads and people
    expect(router.register).toHaveBeenCalledWith(
      '#/threads/:value',
      expect.any(Function),
      { layer: 'threads' }
    )
    expect(router.register).toHaveBeenCalledWith(
      '#/people/:value',
      expect.any(Function),
      { layer: 'people' }
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
      LAYER_NAMES: [
        'threads', 'subjects', 'audience', 'speaker', 'quotedSpeaker',
        'mode', 'form', 'tone', 'people', 'places', 'events', 'divineNames',
      ],
    }))
    vi.doMock('../../../src/read/global-position', () => ({
      loadGlobalPosition: vi.fn().mockResolvedValue(null),
      saveGlobalPosition: vi.fn().mockResolvedValue(),
      clearGlobalPosition: vi.fn().mockResolvedValue(),
    }))
    vi.doMock('../../../src/navigate/command-sheet.js', () => ({ initCommandSheet: vi.fn().mockResolvedValue(), openCommandSheet: vi.fn(), closeCommandSheet: vi.fn(), destroyCommandSheet: vi.fn() }))
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

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
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

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
    await waitForAppWork()

    router.navigate.mockClear()
    events.emit(Events.ROUTER_LAUNCH_RESTORE)
    await waitForAppWork()

    expect(router.navigate).toHaveBeenCalledWith('#/review', { replace: true })
  })

  it('falls back to the global position on launch restore', async () => {
    vi.resetModules()
    applyDefaultRuntimeMocks()
    await silenceLogger()
    createAppShell()

    const db = await import('../../../src/core/db.js')
    db.get.mockResolvedValue(null)
    const gp = await import('../../../src/read/global-position')
    gp.loadGlobalPosition.mockResolvedValue({ surah: 2, verse: 255 })

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
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
    const gp = await import('../../../src/read/global-position')
    gp.loadGlobalPosition.mockResolvedValue(null)

    const events = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    const router = await import('../../../src/core/router.js')

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
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

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
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

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
    await waitForAppWork()

    // Call initBootstrap again (replaces old app.init() re-call test)
    await initBootstrap()
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

    const { initBootstrap } = await import('../../../src/app-bootstrap.ts')
    await initBootstrap()
    await waitForAppWork()

    expect(offline.cancelDownload).toHaveBeenCalledTimes(1)
    expect(readyForDownload).not.toHaveBeenCalled()

    offline.cancelDownload.mockClear()
    readyForDownload.mockClear()

    await initBootstrap()
    await waitForAppWork()

    expect(offline.cancelDownload).not.toHaveBeenCalled()
    expect(readyForDownload).toHaveBeenCalledTimes(1)
  })
})
