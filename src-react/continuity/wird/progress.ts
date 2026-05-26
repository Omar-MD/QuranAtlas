import type { QuranRef, SurahCount, WirdPlan, WirdSummary } from './types'

function refOrdinal(ref: QuranRef, counts: SurahCount[]): number {
  let total = 0
  for (const row of counts) {
    if (row.n === ref.surah) return total + ref.verse
    total += row.count
  }
  return total + ref.verse
}

function refFromOrdinal(ordinal: number, counts: SurahCount[]): QuranRef {
  let remaining = Math.max(1, ordinal)
  for (const row of counts) {
    if (remaining <= row.count) return { surah: row.n, verse: remaining }
    remaining -= row.count
  }
  const last = counts[counts.length - 1] ?? { n: 1, count: 1 }
  return { surah: last.n, verse: last.count }
}

function nextRef(ref: QuranRef, counts: SurahCount[]): QuranRef {
  return refFromOrdinal(refOrdinal(ref, counts) + 1, counts)
}

export function createWirdPlan(
  input: Omit<WirdPlan, 'progress'>,
  counts: SurahCount[],
  dayKey: string,
): WirdPlan {
  return {
    ...input,
    progress: {
      completedThroughRef: input.startRef,
      dayKey,
      lastReadRef: input.startRef,
      nextRef: input.startRef,
    },
  }
}

export function advanceWirdProgress(plan: WirdPlan, readRef: QuranRef, counts: SurahCount[], dayKey: string): WirdPlan {
  const current = refOrdinal(plan.progress.completedThroughRef, counts)
  const next = refOrdinal(readRef, counts)
  if (next < current) return plan
  const completedThroughRef = readRef
  return {
    ...plan,
    progress: {
      completedThroughRef,
      dayKey,
      lastReadRef: readRef,
      nextRef: nextRef(completedThroughRef, counts),
    },
  }
}

export function deriveWirdSummary(plan: WirdPlan | null, counts: SurahCount[]): WirdSummary {
  if (!plan) return { state: 'no-plan', label: 'No Daily Wird plan' }
  const start = refOrdinal(plan.startRef, counts)
  const end = refOrdinal(plan.endRef, counts)
  const current = refOrdinal(plan.progress.completedThroughRef, counts)
  const percent = Math.min(100, Math.max(0, Math.round(((current - start + 1) / Math.max(1, end - start + 1)) * 100)))
  return {
    state: current >= end ? 'complete' : 'active',
    label: `${percent}% complete`,
    nextRef: plan.progress.nextRef,
    percent,
  }
}
