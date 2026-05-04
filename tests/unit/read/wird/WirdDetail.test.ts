import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import type { GlobalPosition } from '../../../../src/configure/state.svelte'
import WirdDetail from '../../../../src/read/wird/WirdDetail.svelte'
import type { WirdPlan, WirdSummary } from '../../../../src/read/wird/types'

const noPlan: WirdSummary = {
  state: 'no-plan',
  plan: null,
  percent: 0,
  todayPercent: 0,
  nextRef: null,
  todayRangeLabel: 'Start daily wird',
  remainingLabel: 'Choose a finish target',
  reminderLabel: null,
}

const activePlan: WirdPlan = {
  id: 'wird-active',
  startRef: { surah: 2, verse: 1 },
  endRef: { surah: 2, verse: 20 },
  targetDays: 10,
  targetEndOn: '2026-05-14',
  startedOn: '2026-05-04',
  unit: 'page',
  reminder: { enabled: true, time: '08:00', browserNotifications: 'default' },
  progress: {
    lastReadRef: { surah: 2, verse: 1 },
    nextRef: { surah: 2, verse: 10 },
    dayKey: '2026-05-04',
    todayStartRef: { surah: 2, verse: 1 },
    todayEndRef: { surah: 2, verse: 10 },
    completedThroughRef: { surah: 2, verse: 7 },
  },
  history: [],
}

describe('WirdDetail', () => {
  it('renders setup with valid defaults and disabled create until target is selected', () => {
    render(WirdDetail, {
      props: {
        summary: noPlan,
        currentPosition: { surah: 2, verse: 255 } satisfies GlobalPosition,
        onBack: vi.fn(),
        onCreate: vi.fn(),
        onContinue: vi.fn(),
        onReset: vi.fn(),
        onRequestBrowserNotifications: vi.fn(),
      },
    })
    expect(document.querySelector('[data-testid="wird-detail-title"]')?.textContent).toBe('Daily Wird')
    expect(document.body.textContent).toContain('Current position')
    expect(document.body.textContent).toContain('2:255')
    expect(document.querySelector('[data-testid="wird-create"]')).toBeDisabled()
  })

  it('submits a setup payload after selecting a finish target', async () => {
    const onCreate = vi.fn()
    render(WirdDetail, {
      props: {
        summary: noPlan,
        currentPosition: { surah: 2, verse: 1 },
        onBack: vi.fn(),
        onCreate,
        onContinue: vi.fn(),
        onReset: vi.fn(),
        onRequestBrowserNotifications: vi.fn(),
      },
    })
    await fireEvent.click(document.querySelector('[data-testid="wird-target-30"]')!)
    await fireEvent.click(document.querySelector('[data-testid="wird-create"]')!)
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      unit: 'juz',
      startMode: 'current',
      targetDays: 30,
      targetEndOn: null,
    }))
  })

  it('submits a custom finish date payload', async () => {
    const onCreate = vi.fn()
    render(WirdDetail, {
      props: {
        summary: noPlan,
        currentPosition: { surah: 2, verse: 1 },
        onBack: vi.fn(),
        onCreate,
        onContinue: vi.fn(),
        onReset: vi.fn(),
        onRequestBrowserNotifications: vi.fn(),
      },
    })
    await fireEvent.click(document.querySelector('[data-testid="wird-target-custom"]')!)
    await fireEvent.input(document.querySelector('[data-testid="wird-finish-date"]')!, {
      target: { value: '2026-05-20' },
    })
    await fireEvent.click(document.querySelector('[data-testid="wird-create"]')!)
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      targetDays: null,
      targetEndOn: '2026-05-20',
    }))
  })

  it('renders active plan actions and confirms reset', async () => {
    const onContinue = vi.fn()
    const onReset = vi.fn()
    render(WirdDetail, {
      props: {
        summary: {
          state: 'active',
          plan: activePlan,
          percent: 25,
          todayPercent: 50,
          nextRef: { surah: 2, verse: 10 },
          todayRangeLabel: '2:1-2:20',
          remainingLabel: '40 verses left',
          reminderLabel: 'Reminder 08:00',
        } satisfies WirdSummary,
        currentPosition: null,
        onBack: vi.fn(),
        onCreate: vi.fn(),
        onContinue,
        onReset,
        onRequestBrowserNotifications: vi.fn(),
      },
    })
    expect(document.querySelector('[data-testid="wird-edit"]')).not.toBeNull()
    await fireEvent.click(document.querySelector('[data-testid="wird-continue"]')!)
    expect(onContinue).toHaveBeenCalledTimes(1)

    await fireEvent.click(document.querySelector('[data-testid="wird-reset"]')!)
    expect(onReset).not.toHaveBeenCalled()
    await fireEvent.click(document.querySelector('[data-testid="wird-reset-confirm"]')!)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('shows browser notification request only when reminders are enabled and permission is default', async () => {
    const onRequestBrowserNotifications = vi.fn()
    render(WirdDetail, {
      props: {
        summary: {
          state: 'active',
          plan: activePlan,
          percent: 25,
          todayPercent: 50,
          nextRef: { surah: 2, verse: 10 },
          todayRangeLabel: '2:1-2:20',
          remainingLabel: '40 verses left',
          reminderLabel: 'Reminder 08:00',
        } satisfies WirdSummary,
        currentPosition: null,
        onBack: vi.fn(),
        onCreate: vi.fn(),
        onContinue: vi.fn(),
        onReset: vi.fn(),
        onRequestBrowserNotifications,
      },
    })

    await fireEvent.click(document.querySelector('[data-testid="wird-edit"]')!)
    expect(document.querySelector('[data-testid="wird-enable-browser-notifications"]')).not.toBeNull()
    await fireEvent.click(document.querySelector('[data-testid="wird-enable-browser-notifications"]')!)
    expect(onRequestBrowserNotifications).toHaveBeenCalledTimes(1)
  })
})
