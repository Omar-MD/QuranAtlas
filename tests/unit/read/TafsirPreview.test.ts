import { render, fireEvent } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  closeTafsirPreview: vi.fn(),
  openTafsirSheet: vi.fn(),
  selectTafsirSource: vi.fn(async () => {}),
}))

vi.mock('../../../src/read/tafsir-state.svelte', () => ({
  tafsirState: {
    previewOpen: true,
    activeVerseKey: '1:1',
    available: [
      { id: 'muyassar', name: 'Tafsir Muyassar' },
      { id: 'mukhtasar', name: 'Al-Mukhtasar fi al-Tafsir' },
    ],
    selectedId: 'muyassar',
    pack: {
      tafsirId: 'muyassar',
      entries: [{
        id: '1:1',
        startKey: '1:1',
        endKey: '1:1',
        ayahKeys: ['1:1'],
        sourceGranularity: 'ayah',
        text: '<p>Preview text</p>',
      }],
    },
    loading: false,
    unavailable: false,
  },
  formatTafsirRange: vi.fn(() => '1:1'),
  getActiveTafsirEntry: vi.fn(() => ({
    id: '1:1',
    startKey: '1:1',
    endKey: '1:1',
    ayahKeys: ['1:1'],
    sourceGranularity: 'ayah',
    text: '<p>Preview text</p>',
  })),
  selectTafsirSource: mocks.selectTafsirSource,
  closeTafsirPreview: mocks.closeTafsirPreview,
}))

vi.mock('../../../src/read/tafsir-bridge', () => ({
  openTafsirSheet: mocks.openTafsirSheet,
  closeTafsirPreview: mocks.closeTafsirPreview,
}))

import TafsirPreview from '../../../src/read/TafsirPreview.svelte'

describe('read/TafsirPreview.svelte', () => {
  beforeEach(() => {
    mocks.closeTafsirPreview.mockClear()
    mocks.openTafsirSheet.mockClear()
    mocks.selectTafsirSource.mockClear()
  })

  it('renders close and expand controls for the inline tafsir view', () => {
    const { getByRole } = render(TafsirPreview, { props: { verseKey: '1:1' } })

    expect(getByRole('button', { name: 'Close tafsir preview' })).toBeTruthy()
    expect(getByRole('button', { name: 'Expand tafsir' })).toBeTruthy()
  })

  it('closes the inline tafsir view from the close control', async () => {
    const { getByRole } = render(TafsirPreview, { props: { verseKey: '1:1' } })

    await fireEvent.click(getByRole('button', { name: 'Close tafsir preview' }))

    expect(mocks.closeTafsirPreview).toHaveBeenCalledTimes(1)
  })
})
