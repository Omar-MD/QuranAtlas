import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import * as events from '../../../src/core/events.js'

const MOCK_SURAHS = [
  { n: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  { n: 36, name: 'Ya-Sin', arabic: 'يس', type: 'Meccan', count: 83, juz: 22 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6, juz: 30 },
]

vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockResolvedValue({ ar: ['test'], en: ['test'] }),
  getSurahs: vi.fn().mockResolvedValue(MOCK_SURAHS),
}))

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(),
  openDB: vi.fn().mockResolvedValue({}),
}))

describe('nav/index.js', () => {
  beforeEach(async () => {
    document.body.innerHTML = [
      '<div id="app-shell">',
      '<header id="top-bar"></header>',
      '<main id="main-content"></main>',
      '<nav id="nav-surface" hidden></nav>',
      '<footer id="bottom-nav"></footer>',
      '</div>',
    ].join('')
    events.clear()

    // Mock matchMedia for jsdom
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Destroy any previous instance
    const { destroy } = await import('../../../src/nav/index.js')
    destroy()
  })

  it('renders surah list into #nav-surface', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const navSurface = document.getElementById('nav-surface')
    const items = navSurface.querySelectorAll('.qa-nav-item')
    expect(items.length).toBe(4)
    expect(items[0].textContent).toContain('Al-Fatihah')
    expect(items[1].textContent).toContain('Al-Baqarah')
  })

  it('renders search input', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const search = document.querySelector('.qa-nav-search')
    expect(search).toBeTruthy()
    expect(search.type).toBe('search')
  })

  it('filters surah list on search input', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const search = document.querySelector('.qa-nav-search')
    search.value = 'ba'
    search.dispatchEvent(new Event('input'))

    const visibleItems = document.querySelectorAll('.qa-nav-item:not([hidden])')
    expect(visibleItems.length).toBe(1)
    expect(visibleItems[0].textContent).toContain('Al-Baqarah')
  })

  it('highlights current surah on reader:position-changed', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    events.emit('reader:position-changed', { surah: 2, verse: 1 })

    const current = document.querySelector('.qa-nav-current')
    expect(current).toBeTruthy()
    expect(current.getAttribute('data-surah')).toBe('2')
  })

  it('emits navigation:navigate on surah click', async () => {
    const navFn = vi.fn()
    events.on('navigation:navigate', navFn)

    const { init } = await import('../../../src/nav/index.js')
    await init()

    const firstItem = document.querySelector('.qa-nav-item')
    firstItem.click()

    expect(navFn).toHaveBeenCalledWith({ surah: 1 })
  })

  it('adds hamburger toggle to top-bar', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const toggle = document.querySelector('.qa-nav-toggle')
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens nav panel on hamburger click', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const toggle = document.querySelector('.qa-nav-toggle')
    toggle.click()

    const navSurface = document.getElementById('nav-surface')
    expect(navSurface.classList.contains('qa-nav-open')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('closes nav on Escape key', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    // Open nav first
    const toggle = document.querySelector('.qa-nav-toggle')
    toggle.click()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    const navSurface = document.getElementById('nav-surface')
    expect(navSurface.classList.contains('qa-nav-open')).toBe(false)
  })

  it('emits navigation:navigate on Enter key on surah item', async () => {
    const navFn = vi.fn()
    events.on('navigation:navigate', navFn)

    const { init } = await import('../../../src/nav/index.js')
    await init()

    const firstItem = document.querySelector('.qa-nav-item')
    firstItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(navFn).toHaveBeenCalledWith({ surah: 1 })
  })

  it('sets aria-invalid on invalid search submit', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const search = document.querySelector('.qa-nav-search')
    search.value = 'xyz'
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(search.getAttribute('aria-invalid')).toBe('true')
  })

  it('closes nav on backdrop click', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const toggle = document.querySelector('.qa-nav-toggle')
    toggle.click()

    const navSurface = document.getElementById('nav-surface')
    expect(navSurface.classList.contains('qa-nav-open')).toBe(true)

    const backdrop = document.querySelector('.qa-nav-backdrop')
    backdrop.click()

    expect(navSurface.classList.contains('qa-nav-open')).toBe(false)
  })

  it('emits navigation:navigate on Space key on surah item', async () => {
    const navFn = vi.fn()
    events.on('navigation:navigate', navFn)

    const { init } = await import('../../../src/nav/index.js')
    await init()

    const firstItem = document.querySelector('.qa-nav-item')
    firstItem.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))

    expect(navFn).toHaveBeenCalledWith({ surah: 1 })
  })

  it('highlights current surah on reader:surah-loaded', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    events.emit('reader:surah-loaded', { surah: 36 })

    const current = document.querySelector('.qa-nav-current')
    expect(current).toBeTruthy()
    expect(current.getAttribute('data-surah')).toBe('36')
  })

  it('does not emit navigation:navigate on invalid search submit', async () => {
    const navFn = vi.fn()
    events.on('navigation:navigate', navFn)

    const { init } = await import('../../../src/nav/index.js')
    await init()

    const search = document.querySelector('.qa-nav-search')
    search.value = 'xyz'
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(navFn).not.toHaveBeenCalled()
  })

  it('sets aria-current on highlighted surah', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    events.emit('reader:position-changed', { surah: 2, verse: 1 })

    const current = document.querySelector('.qa-nav-current')
    expect(current.getAttribute('aria-current')).toBe('page')
  })

  it('navigates surah list with arrow keys', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const items = document.querySelectorAll('.qa-nav-item')
    items[0].focus()
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    expect(document.activeElement).toBe(items[1])
  })

  it('auto-closes nav on mobile after surah click', async () => {
    // Set matchMedia to mobile (matches: true)
    let changeCallback = null
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn().mockImplementation((_, cb) => { changeCallback = cb }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { init } = await import('../../../src/nav/index.js')
    await init()

    // Open nav
    const toggle = document.querySelector('.qa-nav-toggle')
    toggle.click()

    const navSurface = document.getElementById('nav-surface')
    expect(navSurface.classList.contains('qa-nav-open')).toBe(true)

    // Click a surah — should auto-close on mobile
    const firstItem = document.querySelector('.qa-nav-item')
    firstItem.click()

    expect(navSurface.classList.contains('qa-nav-open')).toBe(false)
  })

  it('destroy removes backdrop and resets state', async () => {
    const { init, destroy } = await import('../../../src/nav/index.js')
    await init()

    expect(document.querySelector('.qa-nav-backdrop')).toBeTruthy()

    destroy()

    expect(document.querySelector('.qa-nav-backdrop')).toBeFalsy()
  })

  it('destroy prevents events from triggering handlers after cleanup', async () => {
    const { init, destroy } = await import('../../../src/nav/index.js')
    await init()

    destroy()

    events.emit('reader:position-changed', { surah: 2, verse: 1 })

    const current = document.querySelector('.qa-nav-current')
    expect(current).toBeFalsy()
  })
})
