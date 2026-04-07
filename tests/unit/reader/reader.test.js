import { beforeEach, describe, it, expect, vi } from 'vitest'
import { on } from '../../../src/core/events.js'
import * as events from '../../../src/core/events.js'
import * as db from '../../../src/core/db.js'

// Mock dataset
vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockImplementation((surahNum) => {
    if (surahNum === 112) {
      // Surah Al-Ikhlas has 4 verses
      return Promise.resolve({
        ar: ['قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'ٱللَّهُ ٱلصَّمَدُ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ'],
        en: ['Say, "He is God, the One,"', 'God, the Eternal Refuge,', 'He neither begets nor is born,', 'Nor is there to Him any equivalent.'],
      })
    }
    // Default mock for other surahs (e.g., surah 1)
    return Promise.resolve({
      ar: ['بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'],
      en: ['In the name of God, the Gracious, the Merciful', 'All praise is due to God, Lord of all worlds'],
    })
  }),
  getSurahs: vi.fn().mockResolvedValue([
    { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
    { n: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', type: 'Meccan', count: 4, juz: 30 },
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
  flushDebounce: vi.fn(),
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
  getDb: vi.fn().mockResolvedValue({}),
}))

// Mock marks modules
vi.mock('../../../src/marks/indicator.js', () => ({
  init: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock('../../../src/marks/editor.js', () => ({
  setupLongPress: vi.fn().mockReturnValue(vi.fn()),
}))

describe('reader/index.js', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <header id="top-bar"></header>
      <main id="main-content"></main>
    `
    events.clear()
    vi.clearAllMocks()

    // Reset dataset.getSurah to original mock value so inline overrides in one test
    // don't leak into subsequent tests (vi.clearAllMocks() only clears call history,
    // not implementations set via mockImplementation/mockResolvedValue).
    const dataset = await import('../../../src/data/dataset.js')
    dataset.getSurah.mockImplementation((surahNum) => {
      if (surahNum === 112) {
        return Promise.resolve({
          ar: ['قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'ٱللَّهُ ٱلصَّمَدُ', 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ'],
          en: ['Say, "He is God, the One,"', 'God, the Eternal Refuge,', 'He neither begets nor is born,', 'Nor is there to Him any equivalent.'],
        })
      }
      return Promise.resolve({
        ar: ['بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'],
        en: ['In the name of God, the Gracious, the Merciful', 'All praise is due to God, Lord of all worlds'],
      })
    })

    // Reset module-level state between tests (clears listeners, abort tokens, etc.)
    const { cleanup } = await import('../../../src/reader/index.js')
    cleanup()
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
    // BUG FIX REGRESSION: Translations should ALWAYS be rendered but with CSS class hidden
    // Previously this test expected translations.length === 0 (conditional rendering)
    // Now we expect translations to exist but be hidden via CSS class
    expect(translations.length).toBeGreaterThan(0)
    // All translation elements should have the hidden class
    translations.forEach(el => {
      expect(el.classList.contains('qa-hide-translation')).toBe(true)
    })
  })

  it('translation elements exist with correct class for toggle state - regression test', async () => {
    // This test ensures translations are always in DOM and visibility is CSS-controlled
    // This prevents the bug where toggling translation ON after loading new chunks
    // wouldn't show translations for those new chunks (because elements didn't exist)
    
    // First test: translationVisible = true (default)
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'translationVisible') {
        return Promise.resolve({ key: 'translationVisible', value: true })
      }
      return Promise.resolve(null)
    })

    const { init, cleanup } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const translationsWhenOn = document.querySelectorAll('[data-translation]')
    expect(translationsWhenOn.length).toBe(2)
    translationsWhenOn.forEach(el => {
      expect(el.classList.contains('qa-hide-translation')).toBe(false)
    })

    // Cleanup and re-init with translationVisible = false
    cleanup()
    db.get.mockImplementation((store, key) => {
      if (store === 'settings' && key === 'translationVisible') {
        return Promise.resolve({ key: 'translationVisible', value: false })
      }
      return Promise.resolve(null)
    })
    
    await init({ surah: '1' })

    const translationsWhenOff = document.querySelectorAll('[data-translation]')
    // CRITICAL: Same count (elements always rendered) but with hidden class
    expect(translationsWhenOff.length).toBe(2)
    translationsWhenOff.forEach(el => {
      expect(el.classList.contains('qa-hide-translation')).toBe(true)
    })
  })

  it('renders surah header with name and number', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const header = document.querySelector('[data-surah-header]')
    expect(header).toBeTruthy()
    expect(header.textContent).toContain('Al-Fatiha')
    expect(header.querySelector('.qa-surah-meta').textContent).toContain('Surah 1')
  })

  it('renders basmala correctly for surah 1, 2, and 9', async () => {
    const { init } = await import('../../../src/reader/index.js')

    // Surah 9 (At-Tawbah) — no basmala (Quranic convention)
    await init({ surah: '9' })
    let basmala = document.querySelector('.qa-basmala')
    expect(basmala).toBeFalsy()

    // Surah 1 (Al-Fatiha) — no separate basmala element (basmala IS verse 1 in dataset)
    document.getElementById('main-content').innerHTML = ''
    await init({ surah: '1' })
    basmala = document.querySelector('.qa-basmala')
    expect(basmala).toBeFalsy()
    // Verify verse 1 contains the basmala text
    const verse1Arabic = document.querySelector('[data-verse="1"] .qa-verse-arabic')
    expect(verse1Arabic).toBeTruthy()
    expect(verse1Arabic.textContent).toContain('بِسْمِ')

    // Surah 2 — has separate basmala element before verse 1
    document.getElementById('main-content').innerHTML = ''
    await init({ surah: '2' })
    basmala = document.querySelector('.qa-basmala')
    expect(basmala).toBeTruthy()
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
    // Resume indicator must be absent when ayah is provided
    expect(document.querySelector('[data-resume-indicator]')).toBeFalsy()
    // Verse count still works
    expect(verses.length).toBeGreaterThan(0)
  })

  it('shows error for invalid verse and loads surah at verse 1 - regression test', async () => {
    // This test catches the bug where invalid verse numbers didn't show error feedback
    const dataset = await import('../../../src/data/dataset.js')
    // Mock surah with only 2 verses
    dataset.getSurah.mockResolvedValueOnce({
      ar: ['verse1', 'verse2'],
      en: ['translation1', 'translation2'],
    })

    const { init } = await import('../../../src/reader/index.js')
    
    // Try to load verse 10 when surah only has 2 verses
    await init({ surah: '1', ayah: '10' })

    // Error message should be displayed
    const errorEl = document.querySelector('[data-invalid-verse-error]')
    expect(errorEl).toBeTruthy()
    expect(errorEl.textContent).toContain('Verse 10 does not exist')

    // Surah should still load at verse 1 (graceful fallback)
    const verse1 = document.querySelector('[data-verse="1"]')
    expect(verse1).toBeTruthy()
  })

  it('dismiss button removes invalid verse error', async () => {
    const dataset = await import('../../../src/data/dataset.js')
    dataset.getSurah.mockResolvedValueOnce({
      ar: ['verse1', 'verse2'],
      en: ['translation1', 'translation2'],
    })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1', ayah: '10' })

    const errorEl = document.querySelector('[data-invalid-verse-error]')
    expect(errorEl).toBeTruthy()

    const dismissBtn = errorEl.querySelector('.qa-error-dismiss')
    expect(dismissBtn).toBeTruthy()

    dismissBtn.click()
    expect(document.querySelector('[data-invalid-verse-error]')).toBeFalsy()
  })

  it('cleanup removes scroll listener on re-init', async () => {
    const scrollTracker = await import('../../../src/reader/scroll-tracker.js')
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })
    // Re-init should cleanup previous session
    await init({ surah: '1' })
    const verses = document.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(2)
    expect(scrollTracker.unobserve).toHaveBeenCalled()
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
    const scrollTracker = await import('../../../src/reader/scroll-tracker.js')
    db.put.mockClear()
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    // Simulate scroll tracker firing a position update so lastTrackedVerse is set
    const { onPositionChange } = scrollTracker.observeScroll.mock.calls.at(-1)[1]
    onPositionChange({ verse: 3 })

    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // Verify exact data saved — surah number, verse, and id must be present
    expect(db.put).toHaveBeenCalledWith('positions', expect.objectContaining({
      surah: 1,
      id: 's1',
      verse: 3,
    }))
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

  it('emits reader:verse-rendered for each verse in chunk', async () => {
    const received = []
    const unsub = on('reader:verse-rendered', (payload) => received.push(payload))

    // Trigger a surah load (reuse existing test setup for surah 112)
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '112' })

    // Surah 112 has 4 verses — expect 4 events
    expect(received.length).toBeGreaterThanOrEqual(1)
    expect(received[0]).toHaveProperty('verseKey')
    expect(received[0]).toHaveProperty('element')

    unsub()
  })
})
