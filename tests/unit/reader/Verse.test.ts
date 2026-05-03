import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/core/events', () => ({
  emit: vi.fn(),
}))

vi.mock('../../../src/marks/VerseTagPanel.svelte', () => ({
  default: class MockVerseTagPanel {},
}))

import Verse from '../../../src/reader/Verse.svelte'

describe('reader/Verse.svelte', () => {
  it('keeps meaning and knowledge collapsed until the verse body is activated', async () => {
    const { container, queryByText } = render(Verse, {
      props: {
        verseKey: '2:255',
        arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
        translation: 'Allah - there is no deity except Him.',
        translationVisible: true,
        themes: ['divine-guidance'],
        passageSummary: 'A passage about Allah’s absolute sovereignty.',
      },
    })

    expect(queryByText('Allah - there is no deity except Him.')).toBeNull()
    expect(queryByText('divine guidance')).toBeNull()
    expect(queryByText('A passage about Allah’s absolute sovereignty.')).toBeNull()

    const verseBody = container.querySelector('.qa-verse-body-summary')
    expect(verseBody).not.toBeNull()

    await fireEvent.click(verseBody!)

    expect(queryByText('Allah - there is no deity except Him.')).not.toBeNull()
    expect(queryByText('divine guidance')).not.toBeNull()
    expect(queryByText('A passage about Allah’s absolute sovereignty.')).not.toBeNull()
  })
})
