/**
 * Component test for CommandSheet.svelte — ports F6 keyboard tests to unit:
 *
 *   F6: ⌘K opens the command sheet (and a second ⌘K closes it)
 *   F6: ArrowDown / ArrowUp move focus across results; Escape closes
 *   F6: G then S chord navigates to #/surahs (and G then R → #/review,
 *       G then A → #/about, G then P → #/settings)
 *
 * As of 2026-05-01 (audit N22) the global-keydown handler lives in
 * `src/navigate/global-shortcuts.ts`, not inside CommandSheet.svelte. Tests
 * call `initGlobalShortcuts()` after render so the document listener
 * is wired and dispatched ⌘K / g-chord events still drive the sheet via
 * `commandSheetBridge`.
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 2, name: 'Al-Baqarah', counts: { hafs: 286, warsh: 286, qaloon: 286 } },
  ])),
  getSurah: vi.fn(async () => ({ ayat: [{ aya_text: 'بِسْمِ' }] })),
}))
vi.mock('../../../src/data/surah-meanings', () => ({ getMeaning: vi.fn(() => null) }))
vi.mock('../../../src/mark/store', () => ({ getAll: vi.fn(async () => []) }))
vi.mock('../../../src/mark/tags.js', () => ({
  getAllUsedTags: vi.fn(async () => []),
  getColorForTag: vi.fn(() => '#fff'),
  getSlotForTag: vi.fn(() => 'p0'),
}))
vi.mock('../../../src/configure/theme', () => ({
  setTheme: vi.fn(async () => true),
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
vi.mock('../../../src/read/tafsir-bridge.ts', () => ({ openTafsirPreview: vi.fn() }))
vi.mock('../../../src/navigate/reader-actions.js', () => ({
  nextVerse: vi.fn(), prevVerse: vi.fn(),
  nextSurah: vi.fn(), prevSurah: vi.fn(),
  firstVerse: vi.fn(), lastVerse: vi.fn(),
  openCurrentTafsir: vi.fn(),
}))
vi.mock('../../../src/navigate/shortcuts-sheet.js', () => ({
  openShortcutsSheet: vi.fn(),
  isShortcutsSheetOpen: vi.fn(() => false),
}))
vi.mock('../../../src/read/global-position', () => ({
  loadGlobalPosition: vi.fn(async () => null),
}))
vi.mock('../../../src/a11y/announcer', () => ({ announce: vi.fn() }))

import CommandSheet from '../../../src/navigate/CommandSheet.svelte'
import { commandSheet } from '../../../src/navigate/state-command-sheet.svelte'
import { initGlobalShortcuts } from '../../../src/navigate/global-shortcuts'

async function flush() {
  for (let i = 0; i < 4; i++) { await Promise.resolve() }
}

describe('CommandSheet.svelte (F6 keyboard)', () => {
  let teardownShortcuts: (() => void) | null = null

  beforeEach(() => {
    Object.assign(commandSheet, { query: '', results: [], focusIndex: 0, isOpen: false })
    window.location.hash = ''
    teardownShortcuts = initGlobalShortcuts()
  })

  afterEach(() => {
    teardownShortcuts?.()
    teardownShortcuts = null
  })

  it('F6: ⌘K opens the sheet; second ⌘K closes it', async () => {
    render(CommandSheet)
    await flush()

    const sheet = document.querySelector('.qa-cmd-sheet')!
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    await flush()
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    await flush()
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('F6: Escape closes an open sheet', async () => {
    render(CommandSheet)
    await flush()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    await flush()
    expect(document.querySelector('.qa-cmd-sheet')!.classList.contains('qa-cmd--hidden')).toBe(false)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()
    expect(document.querySelector('.qa-cmd-sheet')!.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('F6: ArrowDown / ArrowUp move focusIndex across results', async () => {
    render(CommandSheet)
    await flush()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    await flush()

    // Type a verse ref so the result list has multiple items: "Open verse" /
    // "Study this verse" / "Copy reference".
    const input = document.querySelector('.qa-cmd-input') as HTMLInputElement
    expect(input).not.toBeNull()
    await fireEvent.input(input, { target: { value: '2:255' } })
    await flush()
    await flush()

    // First result is active by default.
    const before = commandSheet.focusIndex
    expect(before).toBe(0)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await flush()
    expect(commandSheet.focusIndex).toBe(1)

    const items = [...document.querySelectorAll('.qa-cmd-item')].map((el) => el.textContent ?? '')
    expect(items.some((text) => text.includes('Study this verse'))).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    await flush()
    expect(commandSheet.focusIndex).toBe(2)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    await flush()
    expect(commandSheet.focusIndex).toBe(1)
  })

  it('F6: G then S chord navigates to #/surahs', async () => {
    render(CommandSheet)
    await flush()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))
    await flush()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    await flush()

    expect(window.location.hash).toBe('#/surahs')
  })

  it('F6: G then R chord navigates to #/review', async () => {
    render(CommandSheet)
    await flush()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    await flush()

    expect(window.location.hash).toBe('#/review')
  })
})
