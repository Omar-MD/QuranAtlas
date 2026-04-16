import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(),
  openDB: vi.fn().mockResolvedValue({}),
}))

function setupShell() {
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  const toggle = document.createElement('button')
  toggle.className = 'qa-nav-toggle'
  toggle.setAttribute('aria-label', 'Open navigation')
  toggle.textContent = '\u2630'
  topBar.appendChild(toggle)

  const main = document.createElement('main')
  main.id = 'main-content'
  main.style.overflow = 'auto'
  main.style.height = '300px'

  const footer = document.createElement('footer')
  footer.id = 'bottom-nav'

  document.body.appendChild(topBar)
  document.body.appendChild(main)
  document.body.appendChild(footer)
}

describe('nav/ambient-dock.js', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
    window.location.hash = '#/s/1'
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/ambient-dock.js')
    mod.destroyAmbientDock()
    window.location.hash = ''
  })

  it('renders 4 dock items with read, search, review, more tabs', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const items = document.querySelectorAll('#bottom-nav .qa-dock-item')
    expect(items).toHaveLength(4)
    const ids = Array.from(items).map(el => el.getAttribute('data-tab'))
    expect(ids).toEqual(['read', 'search', 'review', 'more'])
  })

  it('marks the read tab active when on a reader route', async () => {
    window.location.hash = '#/s/1'
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.classList.contains('qa-dock-item--active')).toBe(true)
  })

  it('marks the review tab active when on a review route', async () => {
    window.location.hash = '#/review'
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const review = document.querySelector('#bottom-nav [data-tab="review"]')
    expect(review.classList.contains('qa-dock-item--active')).toBe(true)
  })

  it('updates active tab on hashchange', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const review = document.querySelector('#bottom-nav [data-tab="review"]')
    expect(review.classList.contains('qa-dock-item--active')).toBe(true)
    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.classList.contains('qa-dock-item--active')).toBe(false)
  })

  it('search glyph triggers a click on the existing hamburger toggle (stopgap)', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const toggle = document.querySelector('.qa-nav-toggle')
    const clickSpy = vi.fn()
    toggle.addEventListener('click', clickSpy)

    const search = document.querySelector('#bottom-nav [data-tab="search"]')
    search.click()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('read glyph navigates to the last-read surah stored in settings', async () => {
    vi.resetModules()
    vi.doMock('../../../src/core/db.js', () => ({
      get: vi.fn().mockImplementation((store, key) => {
        if (store === 'settings' && key === 'lastSurface') {
          return Promise.resolve({ key, value: '#/s/67/14' })
        }
        return Promise.resolve(null)
      }),
      put: vi.fn().mockResolvedValue(),
      openDB: vi.fn().mockResolvedValue({}),
    }))
    setupShell()
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.getAttribute('href')).toBe('#/s/67')
    vi.doUnmock('../../../src/core/db.js')
  })

  it('defaults read href to surah 1 when no last-read exists', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.getAttribute('href')).toBe('#/s/1')
  })

  it('hides dock when user scrolls down past threshold in #main-content', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const footer = document.getElementById('bottom-nav')
    const main = document.getElementById('main-content')

    Object.defineProperty(main, 'scrollTop', { value: 200, writable: true, configurable: true })
    main.dispatchEvent(new Event('scroll'))

    expect(footer.classList.contains('qa-dock--hidden')).toBe(true)
  })

  it('shows dock again when user scrolls back up past threshold', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const footer = document.getElementById('bottom-nav')
    const main = document.getElementById('main-content')

    Object.defineProperty(main, 'scrollTop', { value: 200, writable: true, configurable: true })
    main.dispatchEvent(new Event('scroll'))
    expect(footer.classList.contains('qa-dock--hidden')).toBe(true)

    Object.defineProperty(main, 'scrollTop', { value: 100, writable: true, configurable: true })
    main.dispatchEvent(new Event('scroll'))
    expect(footer.classList.contains('qa-dock--hidden')).toBe(false)
  })

  it('destroyAmbientDock empties the footer and removes listeners', async () => {
    const { initAmbientDock, destroyAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()
    destroyAmbientDock()

    const footer = document.getElementById('bottom-nav')
    expect(footer.children).toHaveLength(0)
    expect(footer.classList.contains('qa-dock--hidden')).toBe(false)
  })
})
