import { describe, expect, it } from 'vitest'
import type { SurahCount } from '../../../../src/data/juz'
import {
  advanceWirdProgress,
  createWirdPlan,
  deriveWirdSummary,
  getLocalDayKey,
  refFromIndex,
  refToIndex,
} from '../../../../src/read/wird/progress'
import type { WirdBoundaries } from '../../../../src/read/wird/types'

const counts: SurahCount[] = [
  { n: 1, count: 7 },
  { n: 2, count: 286 },
  { n: 3, count: 200 },
]

const boundaries: WirdBoundaries = {
  juz: [
    { n: 1, start: { surah: 1, verse: 1 }, end: { surah: 2, verse: 141 } },
    { n: 2, start: { surah: 2, verse: 142 }, end: { surah: 3, verse: 92 } },
    { n: 3, start: { surah: 3, verse: 93 }, end: { surah: 3, verse: 200 } },
  ],
  hizb: [
    { n: 1, start: { surah: 1, verse: 1 }, end: { surah: 2, verse: 74 } },
    { n: 2, start: { surah: 2, verse: 75 }, end: { surah: 2, verse: 141 } },
    { n: 3, start: { surah: 2, verse: 142 }, end: { surah: 2, verse: 252 } },
    { n: 4, start: { surah: 2, verse: 253 }, end: { surah: 3, verse: 92 } },
    { n: 5, start: { surah: 3, verse: 93 }, end: { surah: 3, verse: 146 } },
    { n: 6, start: { surah: 3, verse: 147 }, end: { surah: 3, verse: 200 } },
  ],
  page: [
    { n: 1, start: { surah: 1, verse: 1 }, end: { surah: 2, verse: 25 } },
    { n: 2, start: { surah: 2, verse: 26 }, end: { surah: 2, verse: 59 } },
    { n: 3, start: { surah: 2, verse: 60 }, end: { surah: 2, verse: 91 } },
    { n: 4, start: { surah: 2, verse: 92 }, end: { surah: 2, verse: 123 } },
    { n: 5, start: { surah: 2, verse: 124 }, end: { surah: 2, verse: 157 } },
  ],
}

describe('Daily Wird progress math', () => {
  it('round-trips references through canonical verse indexes', () => {
    expect(refToIndex({ surah: 1, verse: 1 }, counts)).toBe(1)
    expect(refToIndex({ surah: 2, verse: 1 }, counts)).toBe(8)
    expect(refFromIndex(8, counts)).toEqual({ surah: 2, verse: 1 })
  })

  it('creates one active completion-target plan from current reader position', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 3, verse: 200 },
      targetEndOn: '2026-05-08',
      startedOn: '2026-05-04',
      unit: 'juz',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    expect(plan.startRef).toEqual({ surah: 2, verse: 1 })
    expect(plan.targetDays).toBe(5)
    expect(plan.progress.dayKey).toBe('2026-05-04')
    expect(plan.progress.todayStartRef).toEqual({ surah: 2, verse: 1 })
    expect(plan.progress.todayEndRef.surah).toBe(2)
  })

  it('redistributes missed days while preserving targetEndOn', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 3, verse: 200 },
      targetEndOn: '2026-05-08',
      startedOn: '2026-05-04',
      unit: 'verse',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    const summary = deriveWirdSummary(plan, counts, boundaries, '2026-05-06')
    expect(summary.plan?.progress.dayKey).toBe('2026-05-06')
    expect(summary.plan?.targetEndOn).toBe('2026-05-08')
    expect(refToIndex(summary.plan!.progress.todayEndRef, counts)).toBeGreaterThan(
      refToIndex(plan.progress.todayEndRef, counts),
    )
  })

  it('advances monotonically and never rewinds on backward scrolling', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 2, verse: 20 },
      targetEndOn: '2026-05-05',
      startedOn: '2026-05-04',
      unit: 'verse',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    const advanced = advanceWirdProgress(plan, { surah: 2, verse: 10 }, counts, '2026-05-04')
    const rewound = advanceWirdProgress(advanced, { surah: 2, verse: 3 }, counts, '2026-05-04')
    expect(rewound.progress.completedThroughRef).toEqual({ surah: 2, verse: 10 })
    expect(rewound.progress.nextRef).toEqual({ surah: 2, verse: 11 })
  })

  it('marks the full plan complete and keeps nextRef at the end', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 2, verse: 3 },
      targetEndOn: '2026-05-04',
      startedOn: '2026-05-04',
      unit: 'verse',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    const complete = advanceWirdProgress(plan, { surah: 2, verse: 3 }, counts, '2026-05-04')
    const summary = deriveWirdSummary(complete, counts, boundaries, '2026-05-04')
    expect(summary.state).toBe('plan-complete')
    expect(summary.percent).toBe(100)
    expect(summary.nextRef).toEqual({ surah: 2, verse: 3 })
  })

  it('uses real juz-unit remaining labels', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 3, verse: 200 },
      targetEndOn: '2026-05-08',
      startedOn: '2026-05-04',
      unit: 'juz',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    const summary = deriveWirdSummary(plan, counts, boundaries, '2026-05-04')
    expect(summary.remainingLabel).toBe('3 ajza left')
  })

  it('uses real hizb-unit remaining labels', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 75 },
      endRef: { surah: 3, verse: 200 },
      targetEndOn: '2026-05-08',
      startedOn: '2026-05-04',
      unit: 'hizb',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    const summary = deriveWirdSummary(plan, counts, boundaries, '2026-05-04')
    expect(summary.remainingLabel).toBe('5 ahzab left')
  })

  it('uses real page-unit remaining labels', () => {
    const plan = createWirdPlan({
      startRef: { surah: 2, verse: 26 },
      endRef: { surah: 2, verse: 157 },
      targetEndOn: '2026-05-08',
      startedOn: '2026-05-04',
      unit: 'page',
      reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
    }, counts, '2026-05-04')

    const summary = deriveWirdSummary(plan, counts, boundaries, '2026-05-04')
    expect(summary.remainingLabel).toBe('4 pages left')
  })

  it('uses the local calendar day key helper', () => {
    expect(getLocalDayKey(new Date('2026-05-04T12:00:00'))).toBe('2026-05-04')
  })
})
