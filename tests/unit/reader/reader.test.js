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

// Mock db
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue({ key: 'translationVisible', value: true }),
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
    db.get.mockResolvedValueOnce({ key: 'translationVisible', value: false })

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

  it('emits reader:surah-loaded event', async () => {
    const loadedFn = vi.fn()
    events.on('reader:surah-loaded', loadedFn)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    expect(loadedFn).toHaveBeenCalledWith({ surah: 1 })
  })
})
