import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import DailyWirdCard from '../../../../src/read/wird/DailyWirdCard.svelte'
import type { WirdSummary } from '../../../../src/read/wird/types'

const active: WirdSummary = {
  state: 'active',
  plan: null,
  percent: 32,
  todayPercent: 40,
  nextRef: { surah: 2, verse: 12 },
  todayRangeLabel: '2:1-2:20',
  remainingLabel: '88 verses left',
  reminderLabel: 'Reminder 08:00',
}

describe('DailyWirdCard', () => {
  it('renders active plan progress as a locked ledger button card', () => {
    render(DailyWirdCard, { props: { summary: active, onOpen: vi.fn() } })
    const card = document.querySelector('[data-testid="wird-card"]') as HTMLButtonElement
    expect(card).not.toBeNull()
    expect(card.querySelector('.qa-wird-card-status-badge')).not.toBeNull()
    expect(card.querySelector('.qa-wird-card-status-badge [data-icon="wird-book"]')).not.toBeNull()
    expect(card.querySelector('.qa-wird-card-kicker')?.textContent).toContain('Today')
    expect(card.querySelector('.qa-wird-card-line')?.textContent).toContain('2:12')
    expect(card.querySelector('.qa-wird-card-meter')).not.toBeNull()
    expect(card.querySelector('.qa-wird-card-reminder-row')?.textContent).toContain('Reminder')
    expect(card.textContent).toContain('Today')
    expect(card.textContent).toContain('2:12')
    const bar = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders no-plan state without a progressbar', () => {
    render(DailyWirdCard, {
      props: {
        summary: {
          state: 'no-plan',
          plan: null,
          percent: 0,
          todayPercent: 0,
          nextRef: null,
          todayRangeLabel: 'Start daily wird',
          remainingLabel: 'Choose a finish target',
          reminderLabel: null,
        } satisfies WirdSummary,
        onOpen: vi.fn(),
      },
    })
    expect(document.body.textContent).toContain('Start daily wird')
    expect(document.querySelector('.qa-wird-card-status-badge')).not.toBeNull()
    expect(document.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('calls onOpen when tapped', async () => {
    const onOpen = vi.fn()
    render(DailyWirdCard, { props: { summary: active, onOpen } })
    await fireEvent.click(document.querySelector('[data-testid="wird-card"]')!)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
