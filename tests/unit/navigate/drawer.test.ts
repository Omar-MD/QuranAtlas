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
    { n: 3,   name: 'Ali Imran',  name_ar: 'آل عِمران',   counts: { hafs: 200, warsh: 200, qaloon: 200 } },
    { n: 4,   name: 'An-Nisa',    name_ar: 'النِّساء',    counts: { hafs: 176, warsh: 176, qaloon: 176 } },
    { n: 18,  name: 'Al-Kahf',    name_ar: 'الكَهف',     counts: { hafs: 110, warsh: 110, qaloon: 110 } },
    { n: 67,  name: 'Al-Mulk',    name_ar: 'المُلك',     counts: { hafs: 30,  warsh: 30,  qaloon: 30  } },
    { n: 78,  name: 'An-Naba',    name_ar: 'النَّبَأ',    counts: { hafs: 40,  warsh: 40,  qaloon: 40  } },
    { n: 114, name: 'An-Nas',     name_ar: 'النَّاس',     counts: { hafs: 6,   warsh: 6,   qaloon: 6   } },
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
vi.mock('../../../src/core/router', () => ({
  navigate: vi.fn((hash: string) => {
    window.location.hash = hash
  }),
}))
vi.mock('../../../src/read/mushaf/mode-switch', () => ({
  mushafHrefForCurrentVerse: vi.fn(async () => '#/m/42'),
  verseHrefForMushafPage: vi.fn(async () => '#/s/2/255'),
}))

import NavDrawer from '../../../src/navigate/NavDrawer.svelte'
import { openNavDrawer } from '../../../src/navigate/nav-drawer-bridge'
import { surahs as surahsState } from '../../../src/navigate/surahs/state.svelte'
import { settings } from '../../../src/configure/state.svelte'
import { Events } from '../../../src/core/constants'
import { on, clear } from '../../../src/core/events'
import { add as addBookmark } from '../../../src/navigate/bookmarks/store'
import { deleteDB, openDB } from '../../../src/core/db'
import { navigate } from '../../../src/core/router'
import { mushafHrefForCurrentVerse, verseHrefForMushafPage } from '../../../src/read/mushaf/mode-switch'

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
    window.location.hash = '#/s/1'
    clear()
    vi.mocked(navigate).mockClear()
    vi.mocked(mushafHrefForCurrentVerse).mockResolvedValue('#/m/42')
    vi.mocked(verseHrefForMushafPage).mockResolvedValue('#/s/2/255')
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

  it('renders Surah, Juz, and Bookmarks as peer Read sources', async () => {
    await mountAndOpen('read', 'surahs')

    const source = document.querySelector('.qa-nav-drawer-source-tabs') as HTMLElement | null
    expect(source).not.toBeNull()
    expect(source!.textContent).toContain('Surah')
    expect(source!.textContent).toContain('Juz')
    expect(source!.textContent).toContain('Bookmarks')
    expect(source!.querySelector('[data-testid="read-source-surah"]')).toHaveAttribute('aria-selected', 'true')
    expect(source!.querySelector('[data-testid="read-source-juz"]')).toHaveAttribute('aria-selected', 'false')
    expect(source!.querySelector('[data-testid="read-source-bookmarks"]')).toHaveAttribute('aria-selected', 'false')

    expect(document.querySelector('.qa-nav-drawer-dest-switch')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-surah-rail')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-surah-rail-tool')).toBeNull()
  })

  it('renders the locked two-tier mobile header chrome', async () => {
    await mountAndOpen('read', 'surahs')
    const header = document.querySelector('.qa-nav-drawer-hdr') as HTMLElement
    expect(header).not.toBeNull()
    const productRow = header.querySelector('.qa-nav-drawer-product-row') as HTMLElement | null
    const modeRail = header.querySelector('.qa-nav-drawer-mode-rail') as HTMLElement | null
    expect(productRow).not.toBeNull()
    expect(modeRail).not.toBeNull()
    expect(productRow!.querySelector('.qa-nav-drawer-logo-svg')).not.toBeNull()
    expect(productRow!.querySelector('.qa-nav-drawer-logo-mark')).toBeNull()
    expect(productRow!.querySelector('.qa-nav-drawer-wordmark-text')?.textContent).toBe('QuranAtlas')
    expect(productRow!.querySelector('.qa-nav-drawer-about [data-icon="info"]')).not.toBeNull()
    expect(productRow!.querySelector('.qa-nav-drawer-close [data-icon="close"]')).not.toBeNull()
    expect(modeRail!.querySelector('.qa-nav-drawer-tabs')?.textContent).toContain('Read')
    expect(modeRail!.querySelector('.qa-nav-drawer-tabs')?.textContent).toContain('Study')
    expect(modeRail!.querySelector('[data-icon="read-book"]')).not.toBeNull()
    expect(modeRail!.querySelector('[data-icon="study-cap"]')).not.toBeNull()
    expect(modeRail!.querySelector('.qa-nav-drawer-tab-icon')?.textContent?.trim()).toBe('')
    expect(productRow!.compareDocumentPosition(modeRail!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(header.nextElementSibling?.classList.contains('qa-nav-drawer-tabs')).toBe(false)
  })

  it('places the Daily Wird card before the peer source controls in Read mode', async () => {
    await mountAndOpen('read', 'surahs')
    const card = document.querySelector('[data-testid="wird-card"]') as HTMLElement
    const source = document.querySelector('.qa-nav-drawer-source-tabs') as HTMLElement
    expect(card).not.toBeNull()
    expect(source).not.toBeNull()
    expect(card.compareDocumentPosition(source)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('places the reader mode switch above Read source controls', async () => {
    await mountAndOpen('read', 'surahs')
    const modeSwitch = document.querySelector('[data-testid="reader-mode-switch"]') as HTMLElement | null
    const source = document.querySelector('.qa-nav-drawer-source-panel') as HTMLElement | null

    expect(modeSwitch).not.toBeNull()
    expect(modeSwitch!.querySelector('[data-testid="reader-mode-verse"]')).toHaveAttribute('aria-pressed', 'true')
    expect(modeSwitch!.querySelector('[data-testid="reader-mode-mushaf"]')).toHaveAttribute('aria-pressed', 'false')
    expect(source).not.toBeNull()
    expect(modeSwitch!.compareDocumentPosition(source!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('shows page continuation controls on a Mushaf route and hides verse source controls', async () => {
    window.location.hash = '#/m/42'
    await mountAndOpen('read', 'surahs')

    const modeSwitch = document.querySelector('[data-testid="reader-mode-switch"]') as HTMLElement | null
    expect(modeSwitch).not.toBeNull()
    expect(modeSwitch!.querySelector('[data-testid="reader-mode-verse"]')).toHaveAttribute('aria-pressed', 'false')
    expect(modeSwitch!.querySelector('[data-testid="reader-mode-mushaf"]')).toHaveAttribute('aria-pressed', 'true')

    const pageControls = document.querySelector('[data-testid="mushaf-drawer-page"]') as HTMLElement | null
    expect(pageControls).not.toBeNull()
    expect(pageControls!.textContent).toContain('Page 42')
    expect(pageControls!.querySelector('[data-testid="mushaf-prev-page"]')).not.toBeNull()
    expect(pageControls!.querySelector('[data-testid="mushaf-next-page"]')).not.toBeNull()
    expect(pageControls!.querySelector('[data-testid="mushaf-open-page"]')).not.toBeNull()

    expect(document.querySelector('.qa-nav-drawer-source-panel')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-search-input')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')).toBeNull()
  })

  it('updates drawer reader mode active state after hashchange while mounted', async () => {
    window.location.hash = '#/s/2'
    await mountAndOpen('read', 'surahs')

    expect(document.querySelector('[data-testid="reader-mode-verse"]')).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('[data-testid="reader-mode-mushaf"]')).toHaveAttribute('aria-pressed', 'false')

    window.location.hash = '#/m/86'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await flush()

    expect(document.querySelector('[data-testid="reader-mode-verse"]')).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('[data-testid="reader-mode-mushaf"]')).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('[data-testid="mushaf-drawer-page"]')?.textContent).toContain('Page 86')
  })

  it('routes reader mode switches through Mushaf page helpers', async () => {
    window.location.hash = '#/s/2/255'
    await mountAndOpen('read', 'surahs')

    await fireEvent.click(document.querySelector('[data-testid="reader-mode-mushaf"]')!)
    await flush()
    expect(mushafHrefForCurrentVerse).toHaveBeenCalled()
    expect(navigate).toHaveBeenLastCalledWith('#/m/42')
    expect(document.querySelector('.qa-nav-drawer')).toBeNull()

    window.location.hash = '#/m/42'
    openNavDrawer('read', 'surahs')
    await flush()

    await fireEvent.click(document.querySelector('[data-testid="reader-mode-verse"]')!)
    await flush()
    expect(verseHrefForMushafPage).toHaveBeenCalledWith(42)
    expect(navigate).toHaveBeenLastCalledWith('#/s/2/255')
    expect(document.querySelector('.qa-nav-drawer')).toBeNull()
  })

  it('cancels stale async reader mode switches after the route changes', async () => {
    let resolveHref!: (href: string) => void
    vi.mocked(mushafHrefForCurrentVerse).mockImplementationOnce(() => new Promise((resolve) => {
      resolveHref = resolve
    }))

    window.location.hash = '#/s/2/255'
    await mountAndOpen('read', 'surahs')
    await fireEvent.click(document.querySelector('[data-testid="reader-mode-mushaf"]')!)
    await flush()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await flush()
    resolveHref('#/m/42')
    await flush()

    expect(navigate).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#/review')
  })

  it('keeps search and All/Recent controls Surah-only', async () => {
    await mountAndOpen('read', 'surahs')

    expect(document.querySelector('.qa-nav-drawer-search-input')).not.toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')?.textContent).toContain('All')
    expect(document.querySelector('.qa-nav-drawer-source-filter')?.textContent).toContain('Recent')

    await fireEvent.click(document.querySelector('[data-testid="read-source-juz"]')!)
    await flush()
    expect(document.querySelector('.qa-nav-drawer')).not.toBeNull()
    expect(document.querySelector('.qa-nav-drawer-search-input')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')).toBeNull()
    expect(document.querySelectorAll('.qa-juz-row').length).toBe(30)

    await fireEvent.click(document.querySelector('[data-testid="read-source-bookmarks"]')!)
    await deepFlush()
    expect(document.querySelector('.qa-nav-drawer-search-input')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')).toBeNull()
    expect(document.querySelector('[data-bookmarks-list]')).not.toBeNull()
  })

  it('emits navigation when a Juz row is tapped', async () => {
    let navigatedTo: { surah: number; verse: number } | null = null
    on(Events.NAVIGATION_NAVIGATE, (p: unknown) => { navigatedTo = p as typeof navigatedTo })
    await mountAndOpen('read', 'surahs')
    await fireEvent.click(document.querySelector('[data-testid="read-source-juz"]')!)
    await fireEvent.click(document.querySelector('[data-juz="2"] .qa-juz-row-btn')!)
    expect(navigatedTo).toEqual({ surah: 2, verse: 142 })
    expect(document.querySelector('.qa-nav-drawer')).toBeNull()
  })

  it('opens Daily Wird detail and routes Continue Wird to the next reference', async () => {
    Object.assign(settings, {
      wirdPlan: {
        id: 'wird-test',
        startRef: { surah: 2, verse: 1 },
        endRef: { surah: 2, verse: 20 },
        targetDays: 2,
        targetEndOn: '2026-05-05',
        startedOn: '2026-05-04',
        unit: 'verse',
        reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
        progress: {
          lastReadRef: { surah: 2, verse: 1 },
          nextRef: { surah: 2, verse: 8 },
          dayKey: '2026-05-04',
          todayStartRef: { surah: 2, verse: 1 },
          todayEndRef: { surah: 2, verse: 10 },
          completedThroughRef: { surah: 2, verse: 7 },
        },
        history: [],
      },
    })
    let navigatedTo: { surah: number; verse: number } | null = null
    on(Events.NAVIGATION_NAVIGATE, (p: unknown) => { navigatedTo = p as typeof navigatedTo })

    await mountAndOpen('read', 'surahs')
    await fireEvent.click(document.querySelector('[data-testid="wird-card"]')!)
    await fireEvent.click(document.querySelector('[data-testid="wird-continue"]')!)
    expect(navigatedTo).toEqual({ surah: 2, verse: 8 })
  })

  it('renders Daily Wird remaining text in the selected unit instead of falling back to verses', async () => {
    Object.assign(settings, {
      wirdPlan: {
        id: 'wird-juz-unit',
        startRef: { surah: 1, verse: 1 },
        endRef: { surah: 3, verse: 200 },
        targetDays: 2,
        targetEndOn: '2026-05-05',
        startedOn: '2026-05-04',
        unit: 'juz',
        reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
        progress: {
          lastReadRef: { surah: 1, verse: 1 },
          nextRef: { surah: 1, verse: 1 },
          dayKey: '2026-05-04',
          todayStartRef: { surah: 1, verse: 1 },
          todayEndRef: { surah: 2, verse: 247 },
          completedThroughRef: null,
        },
        history: [],
      },
    })

    await mountAndOpen('read', 'surahs')
    const card = document.querySelector('[data-testid="wird-card"]') as HTMLElement
    expect(card.textContent).toMatch(/\b4 ajza left\b/)
    expect(card.textContent).not.toMatch(/\b493 ajza left\b/)
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

  it('renders Surah no-results as text-only state', async () => {
    await mountAndOpen('read', 'surahs')
    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    await fireEvent.input(search, { target: { value: 'not-a-surah' } })
    await flush()

    expect(document.querySelectorAll('.qa-nav-drawer-surah-row').length).toBe(0)
    const state = document.querySelector('.qa-nav-drawer-list-state') as HTMLElement | null
    expect(state).not.toBeNull()
    expect(state!.textContent).toContain('No surahs match your search.')
    expect(state!.querySelector('svg')).toBeNull()
  })

  it('renders Juz rows with chevrons and text markers only', async () => {
    Object.assign(settings, {
      currentPosition: { surah: 2, verse: 150 },
      wirdPlan: {
        id: 'wird-juz-marker',
        startRef: { surah: 1, verse: 1 },
        endRef: { surah: 3, verse: 200 },
        targetDays: 2,
        targetEndOn: '2026-05-05',
        startedOn: '2026-05-04',
        unit: 'verse',
        reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
        progress: {
          lastReadRef: { surah: 2, verse: 250 },
          nextRef: { surah: 2, verse: 253 },
          dayKey: '2026-05-04',
          todayStartRef: { surah: 2, verse: 253 },
          todayEndRef: { surah: 3, verse: 20 },
          completedThroughRef: { surah: 2, verse: 252 },
        },
        history: [],
      },
    })
    await mountAndOpen('read', 'surahs')
    await fireEvent.click(document.querySelector('[data-testid="read-source-juz"]')!)
    await flush()

    const current = document.querySelector('.qa-juz-row--current') as HTMLElement | null
    const wird = document.querySelector('.qa-juz-row--wird') as HTMLElement | null
    expect(current).not.toBeNull()
    expect(current!.textContent).toContain('Current')
    expect(wird).not.toBeNull()
    expect(wird!.textContent).toContain('Wird')
    expect(document.querySelector('.qa-juz-chev')).not.toBeNull()
    expect(document.querySelector('.qa-juz-row svg')).toBeNull()
  })

  it('renders bookmark group headers with count badge only and row chevrons', async () => {
    await addBookmark('2:255', 'qaloon')
    await addBookmark('2:286', 'qaloon')
    await mountAndOpen('read', 'bookmarks')
    await deepFlush()

    const header = document.querySelector('.qa-bookmarks-section-hdr') as HTMLElement | null
    expect(header).not.toBeNull()
    expect(header!.textContent).toContain('Al-Baqarah')
    expect(header!.querySelector('.qa-bookmarks-section-count')?.textContent).toContain('2')
    expect(header!.querySelector('svg')).toBeNull()
    expect(header!.querySelector('.qa-bookmarks-row-chev')).toBeNull()

    const row = document.querySelector('.qa-bookmarks-row-btn') as HTMLElement | null
    expect(row).not.toBeNull()
    expect(row!.querySelector('.qa-bookmarks-row-chev')).not.toBeNull()
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
