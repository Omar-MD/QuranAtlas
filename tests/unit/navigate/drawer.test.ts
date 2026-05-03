/**
 * Component tests for NavDrawer.svelte — top tabs Read · Study; Read sub-tabs
 * Surahs · Bookmarks. Ports F-mobile-2/6/8/9 to unit and adds bookmark coverage:
 *
 *   F-mobile-2: switch to Study tab → Hub row + 12 layer rows
 *   F-mobile-6: search filters in-drawer surah list (free-text)
 *   F-mobile-8: typing 2:255 does NOT auto-navigate; hint mentions Enter
 *   F-mobile-9: typing 255 lists only surahs with at least 255 verses
 *   F-bookmarks-1: Read>Bookmarks sub-tab renders empty-state when no bookmarks
 *   F-bookmarks-2: Read>Bookmarks lists grouped rows by surah after seed
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 1,   name: 'Al-Fatihah', name_ar: 'الفَاتِحة',  counts: { hafs: 7,   warsh: 7,   qaloon: 7   } },
    { n: 2,   name: 'Al-Baqarah', name_ar: 'البَقَرَة',   counts: { hafs: 286, warsh: 286, qaloon: 286 } },
    { n: 18,  name: 'Al-Kahf',    name_ar: 'الكَهف',     counts: { hafs: 110, warsh: 110, qaloon: 110 } },
    { n: 67,  name: 'Al-Mulk',    name_ar: 'المُلك',     counts: { hafs: 30,  warsh: 30,  qaloon: 30  } },
    { n: 112, name: 'Al-Ikhlas',  name_ar: 'الإخلَاص',   counts: { hafs: 4,   warsh: 4,   qaloon: 4   } },
  ])),
  getSurah: vi.fn(async (n: number) => ({
    riwayah: 'qaloon',
    version: 'test',
    sura_no: n,
    sura_name_ar: '',
    sura_name_en: '',
    ayat: [
      { id: 1, jozz: 1, page: '1', line_start: 1, line_end: 1, aya_no: 1, aya_text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' },
      { id: 255, jozz: 3, page: '42', line_start: 1, line_end: 3, aya_no: 255, aya_text: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ' },
    ],
  })),
}))
vi.mock('../../../src/data/surah-meanings', () => ({
  getMeaning: vi.fn(() => null),
}))
vi.mock('../../../src/core/db', async (orig) => {
  const actual = await orig<typeof import('../../../src/core/db')>()
  return { ...actual, get: vi.fn(async () => undefined) }
})

import NavDrawer from '../../../src/navigate/NavDrawer.svelte'
import { openNavDrawer } from '../../../src/navigate/nav-drawer-bridge'
import { surahs as surahsState } from '../../../src/navigate/surahs/state.svelte'
import { settings } from '../../../src/configure/state.svelte'
import { Events } from '../../../src/core/constants'
import { on, clear } from '../../../src/core/events'
import { add as addBookmark } from '../../../src/navigate/bookmarks/store'
import { deleteDB, openDB } from '../../../src/core/db'

async function flush() {
  for (let i = 0; i < 8; i++) { await Promise.resolve() }
}

async function deepFlush() {
  for (let i = 0; i < 12; i++) {
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    await flush()
  }
}

async function mountAndOpen(tab: 'read' | 'study' = 'read', subTab?: 'surahs' | 'bookmarks') {
  render(NavDrawer)
  await flush()
  openNavDrawer(tab, subTab)
  await flush()
  await flush()
}

describe('NavDrawer.svelte (F-mobile)', () => {
  beforeEach(async () => {
    Object.assign(surahsState, { searchQuery: '', filter: 'all' })
    Object.assign(settings, { riwayah: 'qaloon', currentPosition: null })
    clear()
    try { await deleteDB() } catch { /* fresh */ }
    await openDB()
  })

  it('F-mobile-2: Study tab renders Hub row + 12 layer rows', async () => {
    await mountAndOpen('study')
    expect(document.querySelector('.qa-nav-drawer-hub-row')).not.toBeNull()
    expect(document.querySelectorAll('.qa-nav-drawer-layer-row').length).toBe(12)
  })

  it('F-mobile-6: typing free text in Read>Surahs filters the surah list', async () => {
    await mountAndOpen('read', 'surahs')
    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    expect(search).not.toBeNull()
    await fireEvent.input(search, { target: { value: 'mulk' } })
    await flush()

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect([...rows].some(r => r.textContent?.includes('Al-Mulk'))).toBe(true)
    expect([...rows].some(r => r.textContent?.includes('Al-Fatihah'))).toBe(false)
  })

  it('F-mobile-8: typing 2:255 does NOT auto-navigate; hint mentions Enter; Enter commits', async () => {
    let navigatedTo: { surah: number; verse: number } | null = null
    on(Events.NAVIGATION_NAVIGATE, (p: unknown) => { navigatedTo = p as typeof navigatedTo })

    await mountAndOpen('read', 'surahs')

    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    await fireEvent.input(search, { target: { value: '2:255' } })
    await flush()

    expect(navigatedTo).toBeNull()
    const hint = document.querySelector('.qa-nav-drawer-search-hint')
    expect(hint).not.toBeNull()
    expect(hint!.textContent).toMatch(/Enter/)

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect(rows.length).toBe(1)
    expect(rows[0]!.getAttribute('data-surah')).toBe('2')

    await fireEvent.keyDown(search, { key: 'Enter' })
    await flush()
    expect(navigatedTo).toEqual({ surah: 2, verse: 255 })
  })

  it('renders the Arabic surah name (name_ar) on every row', async () => {
    await mountAndOpen('read', 'surahs')

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const ar = row.querySelector('.qa-nav-drawer-surah-ar') as HTMLElement | null
      expect(ar, `row ${row.getAttribute('data-surah')} has Arabic span`).not.toBeNull()
      expect(ar!.textContent?.trim().length, `row ${row.getAttribute('data-surah')} Arabic non-empty`).toBeGreaterThan(0)
      expect(ar!.getAttribute('dir')).toBe('rtl')
      expect(ar!.getAttribute('lang')).toBe('ar')
    }
    expect(document.querySelector('[data-surah="67"] .qa-nav-drawer-surah-ar')!.textContent)
      .toContain('المُلك')
  })

  it('F-mobile-9: typing 255 (out of surah-index range) lists only surahs with ≥ 255 verses', async () => {
    await mountAndOpen('read', 'surahs')

    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    await fireEvent.input(search, { target: { value: '255' } })
    await flush()

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect(rows.length).toBe(1)
    expect(rows[0]!.getAttribute('data-surah')).toBe('2')
    expect(document.querySelector('.qa-nav-drawer-search-hint')!.textContent).toMatch(/255 verses/)
  })

  it('F-bookmarks-1: Read>Bookmarks renders the empty state when nothing is bookmarked', async () => {
    await mountAndOpen('read', 'bookmarks')
    await deepFlush()
    const empty = document.querySelector('[data-bookmarks-empty]')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toMatch(/Tap a verse number/i)
  })

  it('F-bookmarks-2: Read>Bookmarks lists grouped rows after seeding', async () => {
    await addBookmark('2:255', 'qaloon')
    await addBookmark('2:1', 'qaloon')
    await addBookmark('1:1', 'qaloon')

    await mountAndOpen('read', 'bookmarks')
    await deepFlush()

    const sections = document.querySelectorAll('.qa-bookmarks-section')
    expect(sections.length).toBe(2)
    expect(sections[0]!.getAttribute('data-surah')).toBe('1')
    expect(sections[1]!.getAttribute('data-surah')).toBe('2')

    const baqarahRows = sections[1]!.querySelectorAll('.qa-bookmarks-row')
    expect(baqarahRows.length).toBe(2)
    const refs = [...baqarahRows].map(r => r.getAttribute('data-verse-key'))
    expect(refs).toEqual(['2:1', '2:255'])
  })
})
