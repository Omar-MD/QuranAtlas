/**
 * Component test for Hub.svelte — ports E2 / E5 state-machine behaviors.
 *
 *   E2: tap groupBy segment → review.groupBy updates
 *   E5: tap a value chip → review.activeValue toggles + filter chip appears
 *   E5: surah filter onchange → review.surahFilter set + filter chip appears
 *   E5: × on value filter chip → activeValue cleared, surah filter retained
 *   E5: Clear all → both filters cleared
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/marks/store', () => ({
  getAll: vi.fn(async () => ([
    { verseKey: '1:1',   threads: ['mercy', 'faith'],     subjects: [], audience: [], speaker: [], quotedSpeaker: [], mode: [], form: [], tone: [], people: [], places: [], events: [], divineNames: [], _canon: { threads: ['mercy', 'faith'] }, note: '', updatedAt: 4, createdAt: 4 },
    { verseKey: '2:255', threads: ['mercy'],              subjects: [], audience: [], speaker: [], quotedSpeaker: [], mode: [], form: [], tone: [], people: [], places: [], events: [], divineNames: [], _canon: { threads: ['mercy'] },          note: '', updatedAt: 3, createdAt: 3 },
    { verseKey: '3:190', threads: ['faith', 'reflection'],subjects: [], audience: [], speaker: [], quotedSpeaker: [], mode: [], form: [], tone: [], people: [], places: [], events: [], divineNames: [], _canon: { threads: ['faith', 'reflection'] }, note: '', updatedAt: 2, createdAt: 2 },
    { verseKey: '112:1', threads: ['faith'],              subjects: [], audience: [], speaker: [], quotedSpeaker: [], mode: [], form: [], tone: [], people: [], places: [], events: [], divineNames: [], _canon: { threads: ['faith'] },          note: '', updatedAt: 1, createdAt: 1 },
  ])),
  getByLayerCanonical: vi.fn(async () => []),
  getAllCanonicalValues: vi.fn(async () => ['mercy', 'faith', 'reflection']),
}))

vi.mock('../../../src/marks/tags', () => ({
  getColorForTag: vi.fn(() => '#fff'),
  getSlotForTag: vi.fn(() => 'p0'),
}))
vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 1,   name: 'Al-Fatihah', counts: { hafs: 7,   warsh: 7,   qaloon: 7   } },
    { n: 2,   name: 'Al-Baqarah', counts: { hafs: 286, warsh: 286, qaloon: 286 } },
    { n: 3,   name: 'Al-Imran',   counts: { hafs: 200, warsh: 200, qaloon: 200 } },
    { n: 112, name: 'Al-Ikhlas',  counts: { hafs: 4,   warsh: 4,   qaloon: 4   } },
  ])),
}))
vi.mock('../../../src/safety/input-validator', () => ({
  validateLayerParam: vi.fn(() => ({ valid: false })),
}))
vi.mock('../../../src/a11y/announcer', () => ({ announce: vi.fn() }))
vi.mock('../../../src/marks/editor-bridge', () => ({ openEditor: vi.fn() }))
vi.mock('../../../src/core/ui-bridge', () => ({ clearUndoToast: vi.fn() }))

import Hub from '../../../src/review/Hub.svelte'
import { review } from '../../../src/state/review.svelte'
import { openDB, del } from '../../../src/core/db'

// Find element by selector + optional text predicate. Polls so async Svelte
// init (mocked getAll/getSurahs/reloadValuePool) has time to settle without
// brittle hard-coded microtask counts.
function $$<T extends Element = HTMLElement>(
  selector: string,
  predicate?: (el: Element) => boolean,
): Promise<T> {
  return vi.waitFor(() => {
    const list = [...document.querySelectorAll(selector)]
    const el = predicate ? list.find(predicate) : list[0]
    if (!el) throw new Error(`element not found: ${selector}${predicate ? ' (predicate)' : ''}`)
    return el as unknown as T
  }, { timeout: 1500, interval: 10 })
}

describe('Hub.svelte (E2 / E5)', () => {
  beforeEach(async () => {
    await openDB()
    try { await del('meta', 'review') } catch { /* ignore */ }
    Object.assign(review, {
      view: 'all', groupBy: 'tag', sort: 'recent',
      activeTag: null, activeTags: [], activeLayer: 'threads',
      activeValue: null, surahFilter: null,
    })
    window.location.hash = '#/review'
  })

  async function mount() {
    render(Hub, { props: {} })
    // Wait for value chips (rendered after async getAllCanonicalValues +
    // reloadValuePool) — that's the latest async state in init.
    await $$('.qa-review-value-chip')
  }

  it('E2: tap Surah segment → review.groupBy === "surah"', async () => {
    await mount()
    await fireEvent.click(await $$<HTMLButtonElement>('.qa-review-seg [data-group="surah"]'))
    await vi.waitFor(() => expect(review.groupBy).toBe('surah'))

    await fireEvent.click(await $$<HTMLButtonElement>('[data-group="flat"]'))
    await vi.waitFor(() => expect(review.groupBy).toBe('flat'))

    await fireEvent.click(await $$<HTMLButtonElement>('[data-group="tag"]'))
    await vi.waitFor(() => expect(review.groupBy).toBe('tag'))
  })

  it('E5: tap a value chip → activeValue set + filter chip surfaces', async () => {
    await mount()
    const mercyChip = await $$<HTMLButtonElement>(
      '.qa-review-value-chip',
      el => !!el.textContent?.trim().toLowerCase().includes('mercy'),
    )
    await fireEvent.click(mercyChip)

    await vi.waitFor(() => expect(review.activeValue).toBe('mercy'))
    await $$('.qa-review-active-filters')
    const chip = await $$('.qa-review-filter-chip')
    expect(chip.textContent).toContain('mercy')
  })

  it('E5: × on value filter chip clears activeValue, surah filter remains', async () => {
    await mount()
    const mercyChip = await $$<HTMLButtonElement>(
      '.qa-review-value-chip',
      el => !!el.textContent?.trim().toLowerCase().includes('mercy'),
    )
    await fireEvent.click(mercyChip)
    await vi.waitFor(() => expect(review.activeValue).toBe('mercy'))

    const surahSelect = await $$<HTMLSelectElement>('[data-control="surah"]')
    surahSelect.value = '1'
    await fireEvent.change(surahSelect)
    await vi.waitFor(() => expect(review.surahFilter).toBe(1))

    const dismissBtn = await $$<HTMLButtonElement>('.qa-review-filter-chip button')
    await fireEvent.click(dismissBtn)

    await vi.waitFor(() => {
      expect(review.activeValue).toBeNull()
      expect(review.surahFilter).toBe(1)
    })
  })

  it('E5: Clear all → both activeValue and surahFilter reset', async () => {
    await mount()
    const faithChip = await $$<HTMLButtonElement>(
      '.qa-review-value-chip',
      el => !!el.textContent?.trim().toLowerCase().includes('faith'),
    )
    await fireEvent.click(faithChip)
    await vi.waitFor(() => expect(review.activeValue).toBe('faith'))

    const surahSelect = await $$<HTMLSelectElement>('[data-control="surah"]')
    surahSelect.value = '1'
    await fireEvent.change(surahSelect)
    await vi.waitFor(() => expect(review.surahFilter).toBe(1))

    const clearAllBtn = await $$<HTMLButtonElement>('.qa-review-clear-all-btn')
    await fireEvent.click(clearAllBtn)

    await vi.waitFor(() => {
      expect(review.activeValue).toBeNull()
      expect(review.surahFilter).toBeNull()
      expect(document.querySelector('.qa-review-active-filters')).toBeNull()
    })
  })

  it('E5: tap value chip again toggles it off', async () => {
    await mount()
    const mercyChip = await $$<HTMLButtonElement>(
      '.qa-review-value-chip',
      el => !!el.textContent?.trim().toLowerCase().includes('mercy'),
    )
    await fireEvent.click(mercyChip)
    await vi.waitFor(() => expect(review.activeValue).toBe('mercy'))
    await fireEvent.click(mercyChip)
    await vi.waitFor(() => expect(review.activeValue).toBeNull())
  })
})
