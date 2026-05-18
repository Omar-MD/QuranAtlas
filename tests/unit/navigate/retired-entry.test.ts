import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  openShortcutsSheet,
  isShortcutsSheetOpen,
  nextVerse,
  loadGlobalPosition,
} = vi.hoisted(() => ({
  openShortcutsSheet: vi.fn(),
  isShortcutsSheetOpen: vi.fn(() => false),
  nextVerse: vi.fn(),
  loadGlobalPosition: vi.fn(async () => ({ surah: 18, verse: 1 })),
}))

vi.mock('../../../src/navigate/shortcuts-sheet.js', () => ({
  openShortcutsSheet,
  isShortcutsSheetOpen,
}))
vi.mock('../../../src/configure/theme', () => ({
  cycleTheme: vi.fn(async () => 'light'),
}))
vi.mock('../../../src/configure/night-mode', () => ({
  toggleNightMode: vi.fn(async () => false),
}))
vi.mock('../../../src/configure/font-size', () => ({
  setFontSize: vi.fn(async () => true),
  loadFontSize: vi.fn(async () => 'md'),
  getFontSizeOptions: vi.fn(() => ['xs', 'sm', 'md', 'lg', 'xl']),
  resetFontSize: vi.fn(async () => true),
}))
vi.mock('../../../src/configure/panel-bridge', () => ({
  toggleTranslation: vi.fn(async () => true),
}))
vi.mock('../../../src/navigate/reader-actions.js', () => ({
  nextVerse,
  prevVerse: vi.fn(),
  nextSurah: vi.fn(),
  prevSurah: vi.fn(),
  firstVerse: vi.fn(),
  lastVerse: vi.fn(),
  openCurrentTafsir: vi.fn(),
}))
vi.mock('../../../src/continuity/position', () => ({
  loadGlobalPosition,
}))
vi.mock('../../../src/a11y/announcer', () => ({ announce: vi.fn() }))

import { initGlobalShortcuts } from '../../../src/navigate/global-shortcuts'

async function flush(): Promise<void> {
  for (let i = 0; i < 4; i++) { await Promise.resolve() }
}

function dispatchKey(key: string, init: KeyboardEventInit = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  }))
}

describe('removed command/search shortcuts', () => {
  let teardown: (() => void) | null = null

  beforeEach(() => {
    document.body.innerHTML = ''
    window.location.hash = '#/s/2/255'
    openShortcutsSheet.mockClear()
    isShortcutsSheetOpen.mockReset()
    isShortcutsSheetOpen.mockReturnValue(false)
    nextVerse.mockClear()
    loadGlobalPosition.mockClear()
    teardown = initGlobalShortcuts()
  })

  afterEach(() => {
    teardown?.()
    teardown = null
  })

  it('keeps removed command/search bindings inert', async () => {
    expect(() => initGlobalShortcuts()).not.toThrow()

    dispatchKey('k', { metaKey: true })
    dispatchKey('k', { ctrlKey: true })
    dispatchKey('/')
    dispatchKey('g')
    dispatchKey('p')
    await flush()

    expect(document.querySelector(['.qa', 'cmd', 'sheet'].join('-'))).toBeNull()
    expect(window.location.hash).toBe('#/s/2/255')
    expect(openShortcutsSheet).not.toHaveBeenCalled()
  })

  it('keeps retained global and reader shortcuts wired', async () => {
    dispatchKey('?')
    expect(openShortcutsSheet).toHaveBeenCalledTimes(1)

    dispatchKey('g')
    dispatchKey('s')
    expect(window.location.hash).toBe('#/surahs')

    window.location.hash = '#/s/2/255'
    dispatchKey('g')
    dispatchKey('a')
    expect(window.location.hash).toBe('#/about')

    window.location.hash = '#/s/2/255'
    dispatchKey('g')
    dispatchKey('h')
    await flush()
    expect(loadGlobalPosition).toHaveBeenCalled()
    expect(window.location.hash).toBe('#/s/18')

    window.location.hash = '#/s/2/255'
    dispatchKey('j')
    expect(nextVerse).toHaveBeenCalledTimes(1)
  })

  it('does not handle page-level shortcuts while the shortcuts sheet is open', () => {
    isShortcutsSheetOpen.mockReturnValue(true)

    dispatchKey('/')
    dispatchKey('j')

    expect(nextVerse).not.toHaveBeenCalled()
    expect(document.querySelector(['.qa', 'cmd', 'sheet'].join('-'))).toBeNull()
  })
})
