import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DailyWirdCard } from '../../../src/components/reader/wird/DailyWirdCard'
import { WirdDetail } from '../../../src/components/navigation/wird/WirdDetail'
import { openReactDb, closeReactDb } from '../../../src/storage/db'
import { advanceWirdProgress, createWirdPlan, deriveWirdSummary, getLocalDayKey } from '../../../src/continuity/wird/progress'
import { advanceWirdFromReaderPosition, readWirdPlan, writeWirdPlan } from '../../../src/continuity/wird/store'
import type { SurahCount, WirdPlan, WirdSummary } from '../../../src/continuity/wird/types'

const counts: SurahCount[] = [{ n: 1, count: 7 }, { n: 2, count: 286 }]
const boundaryCounts: SurahCount[] = [...counts, { n: 3, count: 200 }]
const activePlan: WirdPlan = {
  id: 'wird-active',
  startRef: { surah: 2, verse: 1 },
  endRef: { surah: 2, verse: 20 },
  targetDays: 2,
  targetEndOn: '2026-05-05',
  startedOn: '2026-05-04',
  unit: 'verse',
  reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
  progress: {
    completedThroughRef: { surah: 2, verse: 7 },
    dayKey: '2026-05-04',
    lastReadRef: { surah: 2, verse: 7 },
    nextRef: { surah: 2, verse: 8 },
    todayEndRef: { surah: 2, verse: 10 },
    todayStartRef: { surah: 2, verse: 1 },
  },
  history: [],
}

const activeSummary: WirdSummary = {
  state: 'active',
  plan: activePlan,
  percent: 35,
  todayPercent: 70,
  nextRef: { surah: 2, verse: 8 },
  todayRangeLabel: '2:1-2:10',
  remainingLabel: '13 verses left',
  reminderLabel: null,
}

async function resetReactDb() {
  closeReactDb()
  const db = await openReactDb()
  await Promise.all([
    db.settings.clear(),
    db.activationState.clear(),
    db.datasetMeta.clear(),
    db.bookmarks.clear(),
  ])
  closeReactDb()
}

describe('React Daily Wird coverage', () => {
  it('does not move completed progress backward', () => {
    const plan = createWirdPlan({
      startRef: { surah: 1, verse: 1 },
      endRef: { surah: 2, verse: 10 },
      targetEndOn: '2026-06-01',
      startedOn: '2026-05-25',
      unit: 'verse',
      reminder: { enabled: false, time: '07:00', browserNotifications: 'default' },
    }, counts, '2026-05-25')
    const progressed = advanceWirdProgress(plan, { surah: 2, verse: 5 }, counts, '2026-05-25')
    const backward = advanceWirdProgress(progressed, { surah: 1, verse: 3 }, counts, '2026-05-25')
    expect(backward.progress.completedThroughRef).toEqual({ surah: 2, verse: 5 })
    expect(backward.progress.nextRef).toEqual({ surah: 2, verse: 6 })
  })

  it('summarizes no-plan state without writing progress', () => {
    expect(deriveWirdSummary(null, counts).state).toBe('no-plan')
  })

  it('renders the reader-adjacent no-plan card', () => {
    render(<DailyWirdCard plan={null} counts={counts} />)
    expect(screen.getByRole('button', { name: /start daily wird/i })).toBeInTheDocument()
    expect(screen.getByText('Create a plan to build a consistent rhythm.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create plan/i })).toBeNull()
  })

  it('renders Juz remaining labels from boundary counts without raw verse progress copy', () => {
    const plan = createWirdPlan({
      startRef: { surah: 1, verse: 1 },
      endRef: { surah: 3, verse: 200 },
      targetEndOn: '2026-05-08',
      startedOn: '2026-05-04',
      unit: 'juz',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, boundaryCounts, '2026-05-04')

    render(<DailyWirdCard plan={plan} counts={boundaryCounts} />)

    const card = screen.getByRole('button', { name: /today/i })
    expect(card).toHaveTextContent('4 ajza left')
    expect(card).not.toHaveTextContent('493 ajza left')
    expect(card).not.toHaveTextContent(/complete/i)
  })

  it('formats drawer progress without concatenating the next ref and daily assignment range', () => {
    const today = getLocalDayKey()
    render(
      <DailyWirdCard
        plan={{
          ...activePlan,
          startedOn: today,
          targetEndOn: today,
          progress: {
            ...activePlan.progress,
            dayKey: today,
          },
        }}
        counts={counts}
      />,
    )

    const card = screen.getByRole('button', { name: /today/i })
    expect(card).toHaveTextContent('Continue from 2:8')
    expect(card).toHaveTextContent('2:1-2:10')
    expect(card).not.toHaveTextContent('2:8 2:1-2:10')
  })

  it('opens active Wird detail actions for Continue and reset confirmation', () => {
    const onContinue = vi.fn()
    const onReset = vi.fn()
    render(
      <WirdDetail
        counts={counts}
        currentPosition={{ surah: 2, verse: 7 }}
        onBack={vi.fn()}
        onContinue={onContinue}
        onCreate={vi.fn()}
        onRequestBrowserNotifications={vi.fn()}
        onReset={onReset}
        summary={activeSummary}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /continue wird/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /reset plan/i }))
    expect(onReset).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirm reset/i }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('submits setup payloads from the no-plan detail', () => {
    const onCreate = vi.fn()
    render(
      <WirdDetail
        counts={counts}
        currentPosition={{ surah: 2, verse: 1 }}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        onCreate={onCreate}
        onRequestBrowserNotifications={vi.fn()}
        onReset={vi.fn()}
        summary={deriveWirdSummary(null, counts)}
      />,
    )

    expect(screen.getByRole('button', { name: /create plan/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '30 days' }))
    fireEvent.click(screen.getByRole('button', { name: /create plan/i }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      startMode: 'current',
      targetDays: 30,
      targetEndOn: null,
      unit: 'juz',
    }))
  })

  it('reads seeded Daily Wird continuity from the shared settings store', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await db.settings.put({
      key: 'wirdPlan',
      value: {
        cursor: { surah: 1, verse: 3 },
        start: { surah: 1, verse: 1 },
        targetEndOn: '2026-06-01',
      },
    })

    await expect(readWirdPlan(db)).resolves.toMatchObject({
      progress: {
        completedThroughRef: { surah: 1, verse: 3 },
        nextRef: { surah: 1, verse: 4 },
      },
      startRef: { surah: 1, verse: 1 },
    })
    closeReactDb()
  })

  it('advances the shared stored plan from reader position without rewinding', async () => {
    await resetReactDb()
    const db = await openReactDb()
    await writeWirdPlan(db, activePlan)

    await advanceWirdFromReaderPosition(db, { surah: 2, verse: 12 }, counts, '2026-05-04')
    await advanceWirdFromReaderPosition(db, { surah: 2, verse: 4 }, counts, '2026-05-04')

    await expect(readWirdPlan(db)).resolves.toMatchObject({
      progress: {
        completedThroughRef: { surah: 2, verse: 12 },
        nextRef: { surah: 2, verse: 13 },
      },
    })
    closeReactDb()
  })
})
