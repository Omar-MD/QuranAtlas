import { render } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 1, name: 'Al-Fatihah', name_ar: 'الفاتحة', counts: { hafs: 7, warsh: 7, qaloon: 7 } },
    { n: 2, name: 'Al-Baqarah', name_ar: 'البقرة', counts: { hafs: 286, warsh: 286, qaloon: 286 } },
  ])),
}))

vi.mock('../../../../src/data/surah-meanings', () => ({
  getMeaning: vi.fn(() => null),
}))

vi.mock('../../../../src/navigate/bookmarks/store', () => ({
  getAllForRiwayah: vi.fn(async () => []),
}))

vi.mock('../../../../src/configure/state-recent-surahs.svelte', () => ({
  loadRecentSurahs: vi.fn(async () => [2, 1]),
}))

vi.mock('../../../../src/read/global-position', () => ({
  loadGlobalPosition: vi.fn(async () => null),
}))

import SurahList from '../../../../src/navigate/surahs/SurahList.svelte'
import { surahs as surahsState } from '../../../../src/navigate/surahs/state.svelte'
import { settings } from '../../../../src/configure/state.svelte'

async function flush() {
  for (let i = 0; i < 8; i++) { await Promise.resolve() }
}

describe('SurahList.svelte', () => {
  beforeEach(() => {
    Object.assign(surahsState, { searchQuery: '', filter: 'all' })
    Object.assign(settings, { riwayah: 'qaloon', currentPosition: null })
  })

  it('renders the compact header rail above search instead of a pill row', async () => {
    render(SurahList)
    await flush()

    const rail = document.querySelector('.qa-sl-rail') as HTMLElement | null
    expect(rail).not.toBeNull()
    expect(rail!.textContent).toContain('Browse')
    expect(rail!.textContent).toContain('Surahs')

    const toggle = rail!.querySelector('.qa-sl-rail-switch') as HTMLElement | null
    expect(toggle).not.toBeNull()
    expect(toggle!.textContent).toContain('All')
    expect(toggle!.textContent).toContain('Recent')
    expect(toggle!.querySelector('.qa-sl-rail-switch-option--on')?.textContent).toContain('All')

    const search = document.querySelector('.qa-sl-search') as HTMLElement | null
    expect(search).not.toBeNull()
    expect(rail!.compareDocumentPosition(search!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    expect(document.querySelector('.qa-sl-seg')).toBeNull()
    expect(document.querySelector('.qa-sl-seg-item')).toBeNull()
  })
})
