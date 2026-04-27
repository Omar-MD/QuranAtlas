/**
 * Component tests for NavDrawer.svelte — ports F-mobile-2/6/7/8/9 to unit:
 *
 *   F-mobile-2: switch to Review tab → Hub row + 12 layer rows
 *   F-mobile-6: search filters in-drawer surah list (free-text)
 *   F-mobile-7: Bookmarked filter narrows list to bookmarked surahs
 *   F-mobile-8: typing 2:255 does NOT auto-navigate; hint mentions Enter
 *   F-mobile-9: typing 255 lists only surahs with at least 255 verses
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
}))
vi.mock('../../../src/data/surah-meanings', () => ({
  getMeaning: vi.fn(() => null),
}))
vi.mock('../../../src/marks/store', () => ({
  getAll: vi.fn(async () => ([{ verseKey: '67:1' }])),
}))
vi.mock('../../../src/core/db', async (orig) => {
  const actual = await orig<typeof import('../../../src/core/db')>()
  return { ...actual, get: vi.fn(async () => undefined) }
})

import NavDrawer from '../../../src/nav/NavDrawer.svelte'
import { openNavDrawer } from '../../../src/nav/nav-drawer-bridge'
import { surahs as surahsState } from '../../../src/state/surahs.svelte'
import { settings } from '../../../src/state/settings.svelte'
import { Events } from '../../../src/core/constants'
import { on, clear } from '../../../src/core/events'

async function flush() {
  for (let i = 0; i < 4; i++) { await Promise.resolve() }
}

async function mountAndOpen(tab: 'surahs' | 'review' = 'surahs') {
  render(NavDrawer)
  await flush()
  openNavDrawer(tab)
  await flush()
  await flush()
}

describe('NavDrawer.svelte (F-mobile)', () => {
  beforeEach(() => {
    Object.assign(surahsState, { searchQuery: '', filter: 'all' })
    Object.assign(settings, { riwayah: 'qaloon', currentPosition: null })
    clear()
  })

  it('F-mobile-2: Review tab renders Hub row + 12 layer rows', async () => {
    await mountAndOpen('review')
    expect(document.querySelector('.qa-nav-drawer-hub-row')).not.toBeNull()
    expect(document.querySelectorAll('.qa-nav-drawer-layer-row').length).toBe(12)
  })

  it('F-mobile-6: typing free text filters the surah list', async () => {
    await mountAndOpen('surahs')
    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    expect(search).not.toBeNull()
    await fireEvent.input(search, { target: { value: 'mulk' } })
    await flush()

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect([...rows].some(r => r.textContent?.includes('Al-Mulk'))).toBe(true)
    expect([...rows].some(r => r.textContent?.includes('Al-Fatihah'))).toBe(false)
  })

  it('F-mobile-7: Bookmarked pill narrows the list to bookmarked surahs', async () => {
    await mountAndOpen('surahs')

    const bookmarked = [...document.querySelectorAll('.qa-nav-drawer-pill')]
      .find(el => el.textContent?.includes('Bookmarked'))! as HTMLButtonElement
    await fireEvent.click(bookmarked)
    await flush()

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect(rows.length).toBe(1)
    expect(rows[0]!.getAttribute('data-surah')).toBe('67')
  })

  it('F-mobile-8: typing 2:255 does NOT auto-navigate; hint mentions Enter; Enter commits', async () => {
    let navigatedTo: { surah: number; verse: number } | null = null
    on(Events.NAVIGATION_NAVIGATE, (p: unknown) => { navigatedTo = p as typeof navigatedTo })

    await mountAndOpen('surahs')

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
    await mountAndOpen('surahs')

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      const ar = row.querySelector('.qa-nav-drawer-surah-ar') as HTMLElement | null
      expect(ar, `row ${row.getAttribute('data-surah')} has Arabic span`).not.toBeNull()
      expect(ar!.textContent?.trim().length, `row ${row.getAttribute('data-surah')} Arabic non-empty`).toBeGreaterThan(0)
      expect(ar!.getAttribute('dir')).toBe('rtl')
      expect(ar!.getAttribute('lang')).toBe('ar')
    }
    // Spot-check that one of the known mock values is present
    expect(document.querySelector('[data-surah="67"] .qa-nav-drawer-surah-ar')!.textContent)
      .toContain('المُلك')
  })

  it('F-mobile-9: typing 255 (out of surah-index range) lists only surahs with ≥ 255 verses', async () => {
    await mountAndOpen('surahs')

    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    await fireEvent.input(search, { target: { value: '255' } })
    await flush()

    const rows = document.querySelectorAll('.qa-nav-drawer-surah-row')
    expect(rows.length).toBe(1)
    expect(rows[0]!.getAttribute('data-surah')).toBe('2')
    expect(document.querySelector('.qa-nav-drawer-search-hint')!.textContent).toMatch(/255 verses/)
  })
})
