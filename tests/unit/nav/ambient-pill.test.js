import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as events from '../../../src/core/events.js'
import { Events } from '../../../src/core/constants.js'

const MOCK_SURAHS = [
  { n: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', type: 'Meccan', count: 7 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', type: 'Meccan', count: 30 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6 },
]

vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn().mockResolvedValue(MOCK_SURAHS),
}))

function setupShell() {
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  const main = document.createElement('main')
  main.id = 'main-content'
  document.body.appendChild(topBar)
  document.body.appendChild(main)
}

describe('nav/ambient-pill.js', () => {
  beforeEach(() => {
    setupShell()
    events.clear()
    window.location.hash = '#/s/67'
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/ambient-pill.js')
    mod.destroyAmbientPill()
    window.location.hash = ''
  })

  it('appends a .qa-pill-ref element into #top-bar', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    const pill = document.querySelector('#top-bar .qa-pill-ref')
    expect(pill).toBeTruthy()
    expect(pill.getAttribute('role')).toBe('button')
    expect(pill.getAttribute('aria-label')).toBe('Current reading position — press Cmd+K to open command sheet')
  })

  it('renders the verse reference and surah name from READER_SURAH_LOADED + READER_POSITION_CHANGED', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    events.emit(Events.READER_SURAH_LOADED, { surah: 67 })
    await new Promise(r => setTimeout(r, 0))
    events.emit(Events.READER_POSITION_CHANGED, { surah: 67, verse: 14 })

    const ref = document.querySelector('.qa-pill-ref-text')
    expect(ref.textContent).toBe('67:14 · Al-Mulk')
  })

  it('defaults to verse 1 before a position event arrives', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    events.emit(Events.READER_SURAH_LOADED, { surah: 1 })
    await new Promise(r => setTimeout(r, 0))

    const ref = document.querySelector('.qa-pill-ref-text')
    expect(ref.textContent).toBe('1:1 · Al-Fatihah')
  })

  it('shows a ⌘K hint on the right', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    const hint = document.querySelector('.qa-pill-ref-hint')
    expect(hint).toBeTruthy()
    expect(hint.textContent).toBe('\u2318K')
  })

  it('hides the pill when the route is not a reader route', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const pill = document.querySelector('.qa-pill-ref')
    expect(pill.classList.contains('qa-pill-ref--hidden')).toBe(true)
  })

  it('pill stays hidden on reader route entry until AMBIENT_SURFACE event', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    window.location.hash = '#/s/67/14'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const pill = document.querySelector('.qa-pill-ref')
    // Pill stays hidden until tap-to-surface
    expect(pill.classList.contains('qa-pill-ref--hidden')).toBe(true)

    // AMBIENT_SURFACE reveals the pill
    events.emit(Events.AMBIENT_SURFACE, { reason: 'tap' })
    expect(pill.classList.contains('qa-pill-ref--hidden')).toBe(false)
  })

  it('destroyAmbientPill removes the pill and its listeners', async () => {
    const { initAmbientPill, destroyAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()
    destroyAmbientPill()

    expect(document.querySelector('.qa-pill-ref')).toBeFalsy()

    events.emit(Events.READER_POSITION_CHANGED, { surah: 1, verse: 1 })
    expect(document.querySelector('.qa-pill-ref')).toBeFalsy()
  })
})
