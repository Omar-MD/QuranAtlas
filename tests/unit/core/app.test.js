import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track call order across mocked router methods
const callOrder = []

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

vi.mock('../../../src/data/offline.js', () => ({
  initInstallPrompt: vi.fn(),
  getActivationState: vi.fn(() => Promise.resolve('none')),
  cancelDownload: vi.fn(),
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

describe('core/app.js init order', () => {
  beforeEach(() => {
    callOrder.length = 0
    vi.clearAllMocks()
  })

  it('calls router.register before router.init', async () => {
    // Reset modules so app.js re-executes its init() call
    vi.resetModules()

    // Re-import to trigger the auto-init at bottom of app.js
    const router = await import('../../../src/core/router.js')

    // Importing app.js triggers init() which calls router methods
    await import('../../../src/core/app.js')

    // Allow async init to complete
    await new Promise(r => setTimeout(r, 50))

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
})

describe('core/app.js error recovery', () => {
  it('renders error recovery UI when openDB fails', async () => {
    vi.resetModules()

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
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
    const main = document.createElement('main')
    main.id = 'main-content'
    document.body.appendChild(main)

    await import('../../../src/core/app.js')
    await new Promise(r => setTimeout(r, 100))

    const errorDiv = main.querySelector('.qa-error-state')
    expect(errorDiv).toBeTruthy()
    expect(errorDiv.textContent).toContain('Failed')

    const retryBtn = main.querySelector('.qa-retry-btn')
    expect(retryBtn).toBeTruthy()
  })
})
