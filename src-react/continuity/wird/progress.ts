import type {
  QuranRef,
  SurahCount,
  WirdBoundaries,
  WirdBoundary,
  WirdPlan,
  WirdReminder,
  WirdSummary,
  WirdUnit,
} from './types'

export function getLocalDayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function compareRefs(a: QuranRef, b: QuranRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}

export function refToIndex(ref: QuranRef, counts: ReadonlyArray<SurahCount>): number {
  let total = 0
  for (const row of counts) {
    if (row.n === ref.surah) return total + ref.verse
    total += row.count
  }
  return total + ref.verse
}

export function refFromIndex(index: number, counts: ReadonlyArray<SurahCount>): QuranRef {
  let remaining = Math.max(1, Math.floor(index))
  for (const row of counts) {
    if (remaining <= row.count) return { surah: row.n, verse: remaining }
    remaining -= row.count
  }
  const last = counts[counts.length - 1] ?? { n: 1, count: 1 }
  return { surah: last.n, verse: last.count }
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
  return { nextRef: todayStart, todayEnd, todayStart }
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
  dayKey = getLocalDayKey(),
): WirdPlan {
  if (compareRefs(input.startRef, input.endRef) >= 0) {
    throw new Error('Start point must be before the plan end reference')
  }

  const targetDays = inclusiveDays(input.startedOn, input.targetEndOn)
  const base: WirdPlan = {
    id: `wird-${Date.now().toString(36)}`,
    ...input,
    targetDays,
    progress: {
      completedThroughRef: null,
      dayKey,
      lastReadRef: input.startRef,
      nextRef: input.startRef,
      todayEndRef: input.startRef,
      todayStartRef: input.startRef,
    },
    history: [],
  }
  const assignment = computeAssignment(base, counts, dayKey)
  return {
    ...base,
    progress: {
      ...base.progress,
      nextRef: assignment.nextRef,
      todayEndRef: assignment.todayEnd,
      todayStartRef: assignment.todayStart,
    },
  }
}

export function recomputeForDay(plan: WirdPlan, counts: ReadonlyArray<SurahCount>, dayKey: string): WirdPlan {
  if (plan.progress.dayKey === dayKey) return plan
  const assignment = computeAssignment(plan, counts, dayKey)
  return {
    ...plan,
    progress: {
      ...plan.progress,
      dayKey,
      nextRef: assignment.nextRef,
      todayEndRef: assignment.todayEnd,
      todayStartRef: assignment.todayStart,
    },
    history: [
      ...plan.history.filter((entry) => entry.dayKey !== plan.progress.dayKey),
      {
        assignedEndRef: plan.progress.todayEndRef,
        assignedStartRef: plan.progress.todayStartRef,
        completedThroughRef: plan.progress.completedThroughRef,
        dayKey: plan.progress.dayKey,
      },
    ],
  }
}

export function advanceWirdProgress(plan: WirdPlan, readRef: QuranRef, counts: ReadonlyArray<SurahCount>, dayKey = getLocalDayKey()): WirdPlan {
  const current = recomputeForDay(plan, counts, dayKey)
  if (compareRefs(readRef, current.startRef) < 0 || compareRefs(readRef, current.endRef) > 0) return current

  const previousIndex = current.progress.completedThroughRef
    ? refToIndex(current.progress.completedThroughRef, counts)
    : refToIndex(current.startRef, counts) - 1
  const nextIndex = Math.max(previousIndex, refToIndex(readRef, counts))
  const planEnd = refToIndex(current.endRef, counts)
  const completedIndex = clampIndex(nextIndex, 1, planEnd)
  const completedThroughRef = refFromIndex(completedIndex, counts)
  const nextRef = refFromIndex(clampIndex(completedIndex + 1, 1, planEnd), counts)

  return {
    ...current,
    progress: {
      ...current.progress,
      completedThroughRef,
      lastReadRef: readRef,
      nextRef: completedIndex >= planEnd ? current.endRef : nextRef,
    },
  }
}

function labelRef(ref: QuranRef): string {
  return `${ref.surah}:${ref.verse}`
}

function unitName(unit: WirdUnit, amount: number): string {
  if (unit === 'verse') return amount === 1 ? 'verse' : 'verses'
  if (unit === 'page') return amount === 1 ? 'page' : 'pages'
  if (unit === 'juz') return amount === 1 ? 'juz' : 'ajza'
  return amount === 1 ? 'hizb' : 'ahzab'
}

function countBoundaryUnits(
  items: WirdBoundary[],
  counts: ReadonlyArray<SurahCount>,
  start: number,
  end: number,
): number {
  if (!items.length || start > end) return 0
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
  if (unit === 'verse') return Math.max(0, end - start + 1)
  if (!boundaries) return Math.max(0, end - start + 1)
  if (unit === 'juz') return countBoundaryUnits(boundaries.juz, counts, start, end)
  if (unit === 'hizb') return countBoundaryUnits(boundaries.hizb, counts, start, end)
  return countBoundaryUnits(boundaries.page, counts, start, end)
}

function parseSummaryArgs(
  arg3?: WirdBoundaries | string,
  arg4?: string,
): { boundaries: WirdBoundaries | null; dayKey: string } {
  if (typeof arg3 === 'string') return { boundaries: null, dayKey: arg3 }
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
      nextRef: null,
      percent: 0,
      plan: null,
      remainingLabel: 'Choose a finish target',
      reminderLabel: null,
      state: 'no-plan',
      todayPercent: 0,
      todayRangeLabel: 'Start daily wird',
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
  const remaining = completed >= end ? 0 : countRemainingUnits(current.unit, counts, boundaries, remainingStart, end)
  const state = percent >= 100
    ? 'plan-complete'
    : todayPercent >= 100
      ? 'today-complete'
      : current.progress.dayKey > current.startedOn && completed < todayStart
        ? 'behind-target'
        : 'active'

  return {
    nextRef: current.progress.nextRef,
    percent,
    plan: current,
    remainingLabel: `${remaining} ${unitName(current.unit, remaining)} left`,
    reminderLabel: current.reminder.enabled ? `Reminder ${current.reminder.time}` : null,
    state,
    todayPercent,
    todayRangeLabel: `${labelRef(current.progress.todayStartRef)}-${labelRef(current.progress.todayEndRef)}`,
  }
}
