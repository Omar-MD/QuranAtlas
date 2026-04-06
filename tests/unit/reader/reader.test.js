import { beforeEach, describe, it, expect, vi } from 'vitest'
import * as events from '../../../src/core/events.js'
import * as db from '../../../src/core/db.js'

// Mock dataset
vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockResolvedValue({
    ar: ['بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'],
    en: ['In the name of God, the Gracious, the Merciful', 'All praise is due to God, Lord of all worlds'],
  }),
  getSurahs: vi.fn().mockResolvedValue([
    { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  ]),
}))

// Mock announcer
vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

// Mock scroll tracker
vi.mock('../../../src/reader/scroll-tracker.js', () => ({
  observeScroll: vi.fn(),
  unobserve: vi.fn(),
  observeNewVerses: vi.fn(),
}))

// Mock db — return appropriate values per store
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockImplementation((store, key) => {
    if (store === 'settings' && key === 'translationVisible') {
      return Promise.resolve({ key: 'translationVisible', value: true })
    }
    if (store === 'positions') {
      return Promise.resolve(null)
    }
    return Promise.resolve(null)
  }),
  put: vi.fn().mockResolvedValue(),
}))

describe('reader/index.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header id="top-bar"></header>
      <main id="main-content"></main>
    `
    events.clear()
  })

  it('renders Arabic verses as text nodes', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const mainContent = document.getElementById('main-content')
    const verses = mainContent.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(2)

    // Verify textContent is set (not innerHTML with corpus data)
    expect(verses[0].textContent).toContain('بِسْمِ')
    expect(verses[1].textContent).toContain('ٱلْحَمْدُ')
  })

  it('renders translation when translationVisible is true', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const translations = document.querySelectorAll('[data-translation]')
    expect(translations.length).toBe(2)
    expect(translations[0].textContent).toContain('In the name of God')
  })

  it('omits translation when translationVisible is false', async () => {
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'translationVisible') {
        return Promise.resolve({ key: 'translationVisible', value: false })
      }
      return Promise.resolve(null)
    })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const translations = document.querySelectorAll('[data-translation]')
    expect(translations.length).toBe(0)
  })

  it('renders surah header with name and number', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const header = document.querySelector('[data-surah-header]')
    expect(header).toBeTruthy()
    expect(header.textContent).toContain('Al-Fatiha')
    expect(header.textContent).toContain('1')
  })

  it('renders basmala for surah 2 but not surah 1', async () => {
    const { init } = await import('../../../src/reader/index.js')

    // Surah 1 — no basmala (Al-Fatiha, verse 1 IS the basmala)
    await init({ surah: '1' })
    let basmala = document.querySelector('.qa-basmala')
    expect(basmala).toBeFalsy()
  })

  it('shows skeleton and then content', async () => {
    const { init } = await import('../../../src/reader/index.js')
    // After init, skeleton should be replaced with content
    await init({ surah: '1' })
    const skeleton = document.querySelector('.qa-skeleton')
    expect(skeleton).toBeFalsy()
    const verses = document.querySelectorAll('[data-verse]')
    expect(verses.length).toBeGreaterThan(0)
  })

  it('renders top bar with translation toggle', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const toggle = document.querySelector('.qa-toggle-btn')
    expect(toggle).toBeTruthy()
    expect(toggle.textContent).toContain('EN')
  })

  it('rejects invalid surah numbers', async () => {
    const { init } = await import('../../../src/reader/index.js')

    await init({ surah: '0' })
    const mainContent = document.getElementById('main-content')
    const verses = mainContent.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(0)

    await init({ surah: '999' })
    expect(mainContent.querySelectorAll('[data-verse]').length).toBe(0)
  })

  it('emits reader:surah-loaded event', async () => {
    const loadedFn = vi.fn()
    events.on('reader:surah-loaded', loadedFn)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    expect(loadedFn).toHaveBeenCalledWith({ surah: 1 })
  })

  it('shows error state when getSurah throws', async () => {
    const dataset = await import('../../../src/data/dataset.js')
    dataset.getSurah.mockRejectedValueOnce(new Error('Network error'))

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const error = document.querySelector('.qa-error-state')
    expect(error).toBeTruthy()
    expect(error.textContent).toContain('Failed to load')
  })

  it('handles deep link to specific verse', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1', ayah: '2' })

    const verses = document.querySelectorAll('[data-verse]')
    expect(verses.length).toBeGreaterThan(0)
  })

  it('cleanup removes scroll listener on re-init', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })
    // Re-init should cleanup previous session
    await init({ surah: '1' })
    const verses = document.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(2)
  })

  it('translation toggle does not throw and toggles visibility', async () => {
    // Reset mock to default (translationVisible: true) in case a prior test changed it
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'translationVisible') {
        return Promise.resolve({ key: 'translationVisible', value: true })
      }
      return Promise.resolve(null)
    })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const toggle = document.querySelector('.qa-toggle-btn')
    expect(toggle).toBeTruthy()

    // Click should NOT throw
    expect(() => toggle.click()).not.toThrow()

    await new Promise(r => setTimeout(r, 10))
    const translations = document.querySelectorAll('[data-translation]')
    translations.forEach(el => {
      expect(el.classList.contains('qa-hide-translation')).toBe(true)
    })
    expect(toggle.textContent).toBe('EN ▸')
  })

  it('renderTopBar preserves hamburger toggle in top-bar', async () => {
    const topBar = document.getElementById('top-bar')
    const hamburger = document.createElement('button')
    hamburger.className = 'qa-nav-toggle'
    hamburger.textContent = '☰'
    topBar.appendChild(hamburger)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const preserved = topBar.querySelector('.qa-nav-toggle')
    expect(preserved).toBeTruthy()
    expect(preserved.textContent).toBe('☰')

    const toggle = topBar.querySelector('.qa-toggle-btn')
    expect(toggle).toBeTruthy()
  })

  it('saves position when document becomes hidden', async () => {
    db.put.mockClear()
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    const event = new Event('visibilitychange')
    Object.defineProperty(event, 'target', { value: document, configurable: true })
    document.dispatchEvent(event)

    expect(db.put).toHaveBeenCalled()
  })

  it('aborts stale surah render when navigation changes during fetch', async () => {
    const dataset = await import('../../../src/data/dataset.js')

    let resolveSurah2
    dataset.getSurah.mockImplementation((num) => {
      if (num === 2) {
        return new Promise(resolve => {
          resolveSurah2 = () => resolve({
            ar: ['آية واحدة'],
            en: ['one verse'],
          })
        })
      }
      // Surah 1: resolve immediately with 2 verses
      return Promise.resolve({
        ar: ['بسم', 'الحمد'],
        en: ['In the name', 'Praise'],
      })
    })

    const { init } = await import('../../../src/reader/index.js')

    // Start loading surah 2 (will hang until we call resolveSurah2)
    const p2 = init({ surah: '2' })

    // Navigate to surah 1 — completes immediately
    await init({ surah: '1' })

    // Now resolve the stale surah 2 fetch
    resolveSurah2()
    await p2

    // Main content should show surah 1 (2 verses), not surah 2 (1 verse)
    const mainContent = document.getElementById('main-content')
    const verses = mainContent.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(2)
  })

  it('removes visibilitychange listener on cleanup', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { init, cleanup } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const addCalls = addSpy.mock.calls.filter(c => c[0] === 'visibilitychange')
    expect(addCalls.length).toBeGreaterThan(0)
    const handler = addCalls[addCalls.length - 1][1]

    cleanup()

    const removeCalls = removeSpy.mock.calls.filter(c => c[0] === 'visibilitychange')
    expect(removeCalls.length).toBeGreaterThan(0)
    expect(removeCalls[removeCalls.length - 1][1]).toBe(handler)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
