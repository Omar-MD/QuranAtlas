import { beforeEach, describe, it, expect, vi } from 'vitest'

// Mock dataset with 60 verses (to test chunking)
const mockSurah = {
  ar: Array.from({ length: 60 }, (_, i) => `Arabic verse ${i + 1}`),
  en: Array.from({ length: 60 }, (_, i) => `English verse ${i + 1}`),
}

vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

// Create mock functions that persist across module resets
const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockResolvedValue(mockSurah),
  getSurahs: vi.fn().mockResolvedValue([
    { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  ]),
}))

vi.mock('../../../src/core/db.js', () => ({
  get: mockGet,
  put: mockPut,
}))

vi.mock('../../../src/reader/scroll-tracker.js', () => ({
  observeScroll: vi.fn(),
  unobserve: vi.fn(),
  observeNewVerses: vi.fn(),
}))

describe('reader/index.js — Story 2', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header id="top-bar"></header>
      <main id="main-content"></main>
    `
    mockGet.mockReset()
    mockPut.mockReset()
    mockGet.mockResolvedValue({ key: 'translationVisible', value: true })
    mockPut.mockResolvedValue()
  })

  it('renders only first 50 verses initially', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const verses = document.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(50)
  })

  it('shows resume indicator when saved position exists', async () => {
    mockGet.mockImplementation(async (storeName, key) => {
      if (storeName === 'positions' && key === 's2') {
        return { id: 's2', surah: 2, verse: 25, savedAt: Date.now() }
      }
      return { key: 'translationVisible', value: true }
    })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const indicator = document.querySelector('[data-resume-indicator]')
    expect(indicator).toBeTruthy()
  })

  it('does not show resume indicator when no saved position', async () => {
    mockGet.mockImplementation(async (storeName, key) => {
      if (storeName === 'positions' && key === 's2') {
        return undefined
      }
      return { key: 'translationVisible', value: true }
    })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const indicator = document.querySelector('[data-resume-indicator]')
    expect(indicator).toBeFalsy()
  })

  it('renders end marker after all verses', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const endMarker = document.querySelector('[data-surah-end]')
    expect(endMarker).toBeTruthy()
    expect(endMarker.textContent).toContain('End of')

    // End marker should be after all rendered verses
    const lastVerse = document.querySelector('[data-verse="50"]')
    expect(endMarker.compareDocumentPosition(lastVerse) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('does not show resume indicator with deep link ayah param', async () => {
    mockGet.mockImplementation(async (storeName, key) => {
      if (storeName === 'positions' && key === 's2') {
        return { id: 's2', surah: 2, verse: 25, savedAt: Date.now() }
      }
      return { key: 'translationVisible', value: true }
    })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2', ayah: '10' })

    const indicator = document.querySelector('[data-resume-indicator]')
    expect(indicator).toBeFalsy()
  })

  it('emits reader:surah-loaded event', async () => {
    const events = await import('../../../src/core/events.js')
    const loadedFn = vi.fn()
    events.on('reader:surah-loaded', loadedFn)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    expect(loadedFn).toHaveBeenCalledWith({ surah: 2 })
  })
})
