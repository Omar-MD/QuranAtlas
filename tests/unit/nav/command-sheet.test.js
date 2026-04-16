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

describe('nav/command-sheet.js — resolver + rendering', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
    events.clear()
    window.location.hash = ''
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/command-sheet.js')
    mod.destroyCommandSheet()
  })

  async function typeQuery(q) {
    const input = document.querySelector('.qa-cmd-input')
    input.value = q
    input.dispatchEvent(new Event('input', { bubbles: true }))
    // Allow any async getSurahs resolution to settle
    await new Promise(r => setTimeout(r, 0))
  }

  it('renders an Actions group on empty query with Open Review and Open Settings', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('')

    const groups = document.querySelectorAll('.qa-cmd-group')
    expect(groups.length).toBeGreaterThanOrEqual(1)
    const titles = Array.from(groups).map(g => g.querySelector('.qa-cmd-group-title')?.textContent)
    expect(titles).toContain('Actions')

    const items = document.querySelectorAll('.qa-cmd-item')
    const labels = Array.from(items).map(el => el.querySelector('.qa-cmd-item-label')?.textContent)
    expect(labels).toContain('Open Review')
    expect(labels).toContain('Open Settings')
  })

  it('renders a Surahs group matching by number', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('67')

    const items = document.querySelectorAll('.qa-cmd-item[data-kind="surah"]')
    expect(items).toHaveLength(1)
    expect(items[0].getAttribute('data-surah')).toBe('67')
    expect(items[0].textContent).toContain('Al-Mulk')
  })

  it('renders a Surahs group matching by name substring, capped at 6', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const items = document.querySelectorAll('.qa-cmd-item[data-kind="surah"]')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(6)
    const names = Array.from(items).map(el => el.textContent)
    expect(names.some(n => n.includes('Al-Fatihah'))).toBe(true)
  })

  it('renders a Verses group on direct-ref like 2:255', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('2:255')

    const groups = document.querySelectorAll('.qa-cmd-group')
    const titles = Array.from(groups).map(g => g.querySelector('.qa-cmd-group-title')?.textContent)
    expect(titles).toContain('Verses')

    const item = document.querySelector('.qa-cmd-item[data-kind="verse"]')
    expect(item).toBeTruthy()
    expect(item.getAttribute('data-surah')).toBe('2')
    expect(item.getAttribute('data-verse')).toBe('255')
    expect(item.textContent).toContain('2:255')
    expect(item.textContent).toContain('Al-Baqarah')
  })

  it('shows an empty state when the query has no matches', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('zzzzz')

    expect(document.querySelectorAll('.qa-cmd-item')).toHaveLength(0)
    const empty = document.querySelector('.qa-cmd-empty')
    expect(empty).toBeTruthy()
    expect(empty.textContent).toMatch(/no matches/i)
  })

  it('activating a surah item emits NAVIGATION_NAVIGATE { surah } and closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    // Import events dynamically so we share the same mitt instance command-sheet uses
    const evts = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('67')

    const navFn = vi.fn()
    evts.on(Events.NAVIGATION_NAVIGATE, navFn)

    const item = document.querySelector('.qa-cmd-item[data-kind="surah"]')
    item.click()

    expect(navFn).toHaveBeenCalledWith({ surah: 67 })
    expect(document.querySelector('.qa-cmd-sheet').classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('activating a verse item emits NAVIGATION_NAVIGATE { surah, verse }', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    // Import events dynamically so we share the same mitt instance command-sheet uses
    const evts = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('2:255')

    const navFn = vi.fn()
    evts.on(Events.NAVIGATION_NAVIGATE, navFn)

    const item = document.querySelector('.qa-cmd-item[data-kind="verse"]')
    item.click()

    expect(navFn).toHaveBeenCalledWith({ surah: 2, verse: 255 })
  })

  it('activating Open Review changes hash to #/review and closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('')

    const item = Array.from(document.querySelectorAll('.qa-cmd-item'))
      .find(el => el.textContent.includes('Open Review'))
    expect(item).toBeTruthy()
    item.click()

    expect(window.location.hash).toBe('#/review')
    expect(document.querySelector('.qa-cmd-sheet').classList.contains('qa-cmd--hidden')).toBe(true)
  })
})

describe('nav/command-sheet.js — keyboard', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
    events.clear()
    window.location.hash = ''
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/command-sheet.js')
    mod.destroyCommandSheet()
  })

  async function typeQuery(q) {
    const input = document.querySelector('.qa-cmd-input')
    input.value = q
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 0))
  }

  it('first item is active on render', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const items = document.querySelectorAll('.qa-cmd-item')
    expect(items[0].classList.contains('qa-cmd--active')).toBe(true)
    expect(items[0].getAttribute('aria-selected')).toBe('true')
  })

  it('ArrowDown moves selection to the next item', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const input = document.querySelector('.qa-cmd-input')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    const items = document.querySelectorAll('.qa-cmd-item')
    expect(items[0].classList.contains('qa-cmd--active')).toBe(false)
    expect(items[1].classList.contains('qa-cmd--active')).toBe(true)
  })

  it('ArrowUp on the first item wraps to the last', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const input = document.querySelector('.qa-cmd-input')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))

    const items = document.querySelectorAll('.qa-cmd-item')
    expect(items[items.length - 1].classList.contains('qa-cmd--active')).toBe(true)
  })

  it('Enter activates the currently selected item', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    const evts = await import('../../../src/core/events.js')
    const { Events } = await import('../../../src/core/constants.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('67')

    const navFn = vi.fn()
    evts.on(Events.NAVIGATION_NAVIGATE, navFn)

    const input = document.querySelector('.qa-cmd-input')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(navFn).toHaveBeenCalledWith({ surah: 67 })
    expect(document.querySelector('.qa-cmd-sheet').classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('global Cmd+K opens the sheet', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)
  })

  it('global Ctrl+K opens the sheet', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)
  })

  it('Cmd+K while open closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })
})
