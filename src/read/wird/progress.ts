import { compareRefs, globalVerseIndex, refFromGlobalIndex, type SurahCount } from '../../data/juz'
import type {
  QuranRef,
  WirdBoundaries,
  WirdBoundary,
  WirdPlan,
  WirdReminder,
  WirdSummary,
  WirdUnit,
} from './types'

export function getLocalDayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function refToIndex(ref: QuranRef, counts: ReadonlyArray<SurahCount>): number {
  return globalVerseIndex(ref.surah, ref.verse, counts)
}

export function refFromIndex(index: number, counts: ReadonlyArray<SurahCount>): QuranRef {
  return refFromGlobalIndex(index, counts)
}

function clampIndex(index: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(index)))
}

function inclusiveDays(fromDay: string, toDay: string): number {
  const from = new Date(`${fromDay}T00:00:00`)
  const to = new Date(`${toDay}T00:00:00`)
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1
  return Math.max(1, days)
}

function computeAssignment(
  plan: Pick<WirdPlan, 'startRef' | 'endRef' | 'targetEndOn' | 'progress'>,
  counts: ReadonlyArray<SurahCount>,
  dayKey: string,
) {
  const planStart = refToIndex(plan.startRef, counts)
  const planEnd = refToIndex(plan.endRef, counts)
  const completed = plan.progress.completedThroughRef
    ? refToIndex(plan.progress.completedThroughRef, counts)
    : planStart - 1
  const next = clampIndex(completed + 1, planStart, planEnd)
  const remaining = Math.max(1, planEnd - next + 1)
  const days = inclusiveDays(dayKey, plan.targetEndOn)
  const portion = Math.max(1, Math.ceil(remaining / days))
  const todayStart = refFromIndex(next, counts)
  const todayEnd = refFromIndex(clampIndex(next + portion - 1, planStart, planEnd), counts)
  return { todayStart, todayEnd, nextRef: todayStart }
}

export function createWirdPlan(
  input: {
    startRef: QuranRef
    endRef: QuranRef
    targetEndOn: string
    startedOn: string
    unit: WirdUnit
    reminder: WirdReminder
  },
  counts: ReadonlyArray<SurahCount>,
  todayKey = getLocalDayKey(),
): WirdPlan {
  if (compareRefs(input.startRef, input.endRef) >= 0) {
    throw new Error('Start point must be before the plan end reference')
  }

  const targetDays = inclusiveDays(input.startedOn, input.targetEndOn)
  const base: WirdPlan = {
    id: `wird-${Date.now().toString(36)}`,
    startRef: input.startRef,
    endRef: input.endRef,
    targetDays,
    targetEndOn: input.targetEndOn,
    startedOn: input.startedOn,
    unit: input.unit,
    reminder: input.reminder,
    progress: {
      lastReadRef: input.startRef,
      nextRef: input.startRef,
      dayKey: todayKey,
      todayStartRef: input.startRef,
      todayEndRef: input.startRef,
      completedThroughRef: null,
    },
    history: [],
  }

  const assignment = computeAssignment(base, counts, todayKey)
  return {
    ...base,
    progress: {
      ...base.progress,
      nextRef: assignment.nextRef,
      todayStartRef: assignment.todayStart,
      todayEndRef: assignment.todayEnd,
    },
  }
}

export function recomputeForDay(
  plan: WirdPlan,
  counts: ReadonlyArray<SurahCount>,
  dayKey: string,
): WirdPlan {
  if (plan.progress.dayKey === dayKey) { return plan }
  const assignment = computeAssignment(plan, counts, dayKey)
  return {
    ...plan,
    progress: {
      ...plan.progress,
      dayKey,
      nextRef: assignment.nextRef,
      todayStartRef: assignment.todayStart,
      todayEndRef: assignment.todayEnd,
    },
    history: [
      ...plan.history.filter((entry) => entry.dayKey !== plan.progress.dayKey),
      {
        dayKey: plan.progress.dayKey,
        assignedStartRef: plan.progress.todayStartRef,
        assignedEndRef: plan.progress.todayEndRef,
        completedThroughRef: plan.progress.completedThroughRef,
      },
    ],
  }
}

export function advanceWirdProgress(
  plan: WirdPlan,
  readRef: QuranRef,
  counts: ReadonlyArray<SurahCount>,
  dayKey = getLocalDayKey(),
): WirdPlan {
  const current = recomputeForDay(plan, counts, dayKey)
  if (compareRefs(readRef, current.startRef) < 0 || compareRefs(readRef, current.endRef) > 0) {
    return current
  }

  const prevIdx = current.progress.completedThroughRef
    ? refToIndex(current.progress.completedThroughRef, counts)
    : refToIndex(current.startRef, counts) - 1
  const nextIdx = Math.max(prevIdx, refToIndex(readRef, counts))
  const planEnd = refToIndex(current.endRef, counts)
  const clampedCompleted = clampIndex(nextIdx, 1, planEnd)
  const completedThroughRef = refFromIndex(clampedCompleted, counts)
  const nextRef = refFromIndex(clampIndex(clampedCompleted + 1, 1, planEnd), counts)

  return {
    ...current,
    progress: {
      ...current.progress,
      lastReadRef: readRef,
      completedThroughRef,
      nextRef: clampedCompleted >= planEnd ? current.endRef : nextRef,
    },
  }
}

function labelRef(ref: QuranRef): string {
  return `${ref.surah}:${ref.verse}`
}

function unitName(unit: WirdUnit, amount: number): string {
  if (unit === 'verse') { return amount === 1 ? 'verse' : 'verses' }
  if (unit === 'page') { return amount === 1 ? 'page' : 'pages' }
  if (unit === 'juz') { return amount === 1 ? 'juz' : 'ajza' }
  return amount === 1 ? 'hizb' : 'ahzab'
}

function countVerseUnits(start: number, end: number): number {
  return Math.max(0, end - start + 1)
}

function countBoundaryUnits(
  items: WirdBoundary[],
  counts: ReadonlyArray<SurahCount>,
  start: number,
  end: number,
): number {
  if (!items.length || start > end) { return 0 }
  return items.filter((item) => {
    const itemStart = refToIndex(item.start, counts)
    const itemEnd = refToIndex(item.end, counts)
    return itemEnd >= start && itemStart <= end
  }).length
}

function countRemainingUnits(
  unit: WirdUnit,
  counts: ReadonlyArray<SurahCount>,
  boundaries: WirdBoundaries | null,
  start: number,
  end: number,
): number {
  if (unit === 'verse') { return countVerseUnits(start, end) }
  if (!boundaries) { return countVerseUnits(start, end) }
  if (unit === 'juz') { return countBoundaryUnits(boundaries.juz, counts, start, end) }
  if (unit === 'hizb') { return countBoundaryUnits(boundaries.hizb, counts, start, end) }
  return countBoundaryUnits(boundaries.page, counts, start, end)
}

function parseSummaryArgs(
  arg3?: WirdBoundaries | string,
  arg4?: string,
): { boundaries: WirdBoundaries | null; dayKey: string } {
  if (typeof arg3 === 'string') {
    return { boundaries: null, dayKey: arg3 }
  }
  return { boundaries: arg3 ?? null, dayKey: arg4 ?? getLocalDayKey() }
}

export function deriveWirdSummary(
  plan: WirdPlan | null,
  counts: ReadonlyArray<SurahCount>,
  arg3?: WirdBoundaries | string,
  arg4?: string,
): WirdSummary {
  const { boundaries, dayKey } = parseSummaryArgs(arg3, arg4)

  if (!plan) {
    return {
      state: 'no-plan',
      plan: null,
      percent: 0,
      todayPercent: 0,
      nextRef: null,
      todayRangeLabel: 'Start daily wird',
      remainingLabel: 'Choose a finish target',
      reminderLabel: null,
    }
  }

  const current = recomputeForDay(plan, counts, dayKey)
  const start = refToIndex(current.startRef, counts)
  const end = refToIndex(current.endRef, counts)
  const completed = current.progress.completedThroughRef
    ? refToIndex(current.progress.completedThroughRef, counts)
    : start - 1
  const todayStart = refToIndex(current.progress.todayStartRef, counts)
  const todayEnd = refToIndex(current.progress.todayEndRef, counts)
  const total = Math.max(1, end - start + 1)
  const done = Math.max(0, completed - start + 1)
  const todayDone = Math.max(0, Math.min(completed, todayEnd) - todayStart + 1)
  const todaySpan = Math.max(1, todayEnd - todayStart + 1)
  const percent = Math.min(100, Math.round((done / total) * 100))
  const todayPercent = Math.min(100, Math.round((todayDone / todaySpan) * 100))
  const remainingStart = Math.min(end, completed + 1)
  const remaining = completed >= end
    ? 0
    : countRemainingUnits(current.unit, counts, boundaries, remainingStart, end)
  const state = percent >= 100
    ? 'plan-complete'
    : todayPercent >= 100
      ? 'today-complete'
      : current.progress.dayKey > current.startedOn && completed < todayStart
        ? 'behind-target'
        : 'active'

  return {
    state,
    plan: current,
    percent,
    todayPercent,
    nextRef: current.progress.nextRef,
    todayRangeLabel: `${labelRef(current.progress.todayStartRef)}-${labelRef(current.progress.todayEndRef)}`,
    remainingLabel: `${remaining} ${unitName(current.unit, remaining)} left`,
    reminderLabel: current.reminder.enabled ? `Reminder ${current.reminder.time}` : null,
  }
}
