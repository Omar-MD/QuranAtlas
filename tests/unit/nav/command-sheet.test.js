import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as events from '../../../src/core/events.js'

const MOCK_SURAHS = [
  { n: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', type: 'Meccan', count: 7 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', type: 'Meccan', count: 30 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6 },
]

vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn().mockResolvedValue(MOCK_SURAHS),
}))

vi.mock('../../../src/data/surah-meanings.js', () => ({
  getMeaning: vi.fn((n) => ({ 1: 'The Opening', 2: 'The Cow', 67: 'The Sovereignty', 114: 'Mankind' })[n] || ''),
}))

function setupShell() {
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  document.body.appendChild(topBar)
}

describe('nav/command-sheet.js — shell', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/command-sheet.js')
    mod.destroyCommandSheet()
  })

  it('mounts a hidden scrim + sheet into <body>', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    const scrim = document.querySelector('.qa-cmd-scrim')
    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(scrim).toBeTruthy()
    expect(sheet).toBeTruthy()
    expect(scrim.classList.contains('qa-cmd--hidden')).toBe(true)
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
    expect(sheet.getAttribute('role')).toBe('dialog')
    expect(sheet.getAttribute('aria-modal')).toBe('true')
  })

  it('renders a search input and a results container', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    const input = document.querySelector('.qa-cmd-input')
    const results = document.querySelector('.qa-cmd-results')
    expect(input).toBeTruthy()
    expect(input.getAttribute('type')).toBe('search')
    expect(input.getAttribute('placeholder')).toBe('Search surah, verse, tag, or command')
    expect(results).toBeTruthy()
    expect(results.getAttribute('role')).toBe('listbox')
  })

  it('openCommandSheet reveals the sheet and focuses the input', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()

    const scrim = document.querySelector('.qa-cmd-scrim')
    const sheet = document.querySelector('.qa-cmd-sheet')
    const input = document.querySelector('.qa-cmd-input')
    expect(scrim.classList.contains('qa-cmd--hidden')).toBe(false)
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)
    expect(document.activeElement).toBe(input)
  })

  it('closeCommandSheet hides the sheet', async () => {
    const { initCommandSheet, openCommandSheet, closeCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()
    closeCommandSheet()

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('clicking the scrim closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()
    document.querySelector('.qa-cmd-scrim').click()

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('pressing Escape while open closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('destroyCommandSheet removes DOM and detaches listeners', async () => {
    const { initCommandSheet, destroyCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    destroyCommandSheet()

    expect(document.querySelector('.qa-cmd-scrim')).toBeFalsy()
    expect(document.querySelector('.qa-cmd-sheet')).toBeFalsy()

    // Post-destroy open is a no-op and must not throw
    expect(() => openCommandSheet()).not.toThrow()
    expect(document.querySelector('.qa-cmd-sheet')).toBeFalsy()
  })
})
