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

async function flush() {
  for (let i = 0; i < 5; i++) { await Promise.resolve() }
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

  async function mountAndInit() {
    render(Hub, { props: {} })
    // doInit fires async — wait for getAll + reloadValuePool to settle.
    for (let i = 0; i < 8; i++) { await Promise.resolve() }
    await new Promise(r => setTimeout(r, 0))
    await flush()
  }

  it('E2: tap Surah segment → review.groupBy === "surah"', async () => {
    await mountAndInit()
    const surahSeg = document.querySelector('.qa-review-seg [data-group="surah"]') as HTMLButtonElement
    expect(surahSeg).not.toBeNull()
    await fireEvent.click(surahSeg)
    await flush()
    expect(review.groupBy).toBe('surah')

    const flatSeg = document.querySelector('[data-group="flat"]') as HTMLButtonElement
    await fireEvent.click(flatSeg)
    await flush()
    expect(review.groupBy).toBe('flat')

    const tagSeg = document.querySelector('[data-group="tag"]') as HTMLButtonElement
    await fireEvent.click(tagSeg)
    await flush()
    expect(review.groupBy).toBe('tag')
  })

  it('E5: tap a value chip → activeValue set + filter chip surfaces', async () => {
    await mountAndInit()
    const mercyChip = [...document.querySelectorAll('.qa-review-value-chip')]
      .find(el => el.textContent?.trim().toLowerCase().includes('mercy'))! as HTMLButtonElement
    expect(mercyChip).not.toBeNull()

    await fireEvent.click(mercyChip)
    await flush()

    expect(review.activeValue).toBe('mercy')
    expect(document.querySelector('.qa-review-active-filters')).not.toBeNull()
    expect(document.querySelector('.qa-review-filter-chip')!.textContent).toContain('mercy')
  })

  it('E5: × on value filter chip clears activeValue, surah filter remains', async () => {
    await mountAndInit()

    const mercyChip = [...document.querySelectorAll('.qa-review-value-chip')]
      .find(el => el.textContent?.trim().toLowerCase().includes('mercy'))! as HTMLButtonElement
    await fireEvent.click(mercyChip)
    await flush()

    const surahSelect = document.querySelector('[data-control="surah"]') as HTMLSelectElement
    surahSelect.value = '1'
    await fireEvent.change(surahSelect)
    await flush()

    expect(review.activeValue).toBe('mercy')
    expect(review.surahFilter).toBe(1)

    const dismissBtn = document.querySelector('.qa-review-filter-chip button') as HTMLButtonElement
    await fireEvent.click(dismissBtn)
    await flush()

    expect(review.activeValue).toBeNull()
    expect(review.surahFilter).toBe(1)
  })

  it('E5: Clear all → both activeValue and surahFilter reset', async () => {
    await mountAndInit()

    const faithChip = [...document.querySelectorAll('.qa-review-value-chip')]
      .find(el => el.textContent?.trim().toLowerCase().includes('faith'))! as HTMLButtonElement
    await fireEvent.click(faithChip)
    await flush()

    const surahSelect = document.querySelector('[data-control="surah"]') as HTMLSelectElement
    surahSelect.value = '1'
    await fireEvent.change(surahSelect)
    await flush()

    expect(review.activeValue).toBe('faith')
    expect(review.surahFilter).toBe(1)

    const clearAllBtn = document.querySelector('.qa-review-clear-all-btn') as HTMLButtonElement
    expect(clearAllBtn).not.toBeNull()
    await fireEvent.click(clearAllBtn)
    await flush()

    expect(review.activeValue).toBeNull()
    expect(review.surahFilter).toBeNull()
    expect(document.querySelector('.qa-review-active-filters')).toBeNull()
  })

  it('E5: tap value chip again toggles it off', async () => {
    await mountAndInit()
    const mercyChip = [...document.querySelectorAll('.qa-review-value-chip')]
      .find(el => el.textContent?.trim().toLowerCase().includes('mercy'))! as HTMLButtonElement
    await fireEvent.click(mercyChip)
    await flush()
    expect(review.activeValue).toBe('mercy')
    await fireEvent.click(mercyChip)
    await flush()
    expect(review.activeValue).toBeNull()
  })
})
