import { del, get, put } from '../../core/db'
import { settings } from '../../configure/state.svelte'
import { getSurahs } from '../../data/dataset'
import type { SurahCount } from '../../data/juz'
import { createWirdBoundaries } from './metadata'
import { advanceWirdProgress, deriveWirdSummary, getLocalDayKey } from './progress'
import type { WirdPlan, WirdSummary } from './types'

const KEY = 'wirdPlan'

function clonePlan(plan: WirdPlan): WirdPlan {
  return JSON.parse(JSON.stringify(plan)) as WirdPlan
}

async function loadCounts(): Promise<SurahCount[]> {
  const surahs = await getSurahs()
  return surahs.map((surah) => ({
    n: surah.n,
    count: surah.counts[settings.riwayah] ?? surah.counts.qaloon,
  }))
}

function isPlan(value: unknown): value is WirdPlan {
  const candidate = value as Partial<WirdPlan> | null
  return !!candidate
    && typeof candidate.id === 'string'
    && !!candidate.startRef
    && !!candidate.endRef
    && !!candidate.progress
}

export async function loadWirdPlan(): Promise<WirdPlan | null> {
  const rec = await get('settings', KEY)
  const plan = isPlan((rec as { value?: unknown } | undefined)?.value)
    ? (rec as { value: WirdPlan }).value
    : null
  settings.wirdPlan = plan
  return plan
}

export async function saveWirdPlan(plan: WirdPlan): Promise<void> {
  const value = clonePlan(plan)
  await put('settings', { key: KEY, value })
  settings.wirdPlan = value
}

export async function clearWirdPlan(): Promise<void> {
  await del('settings', KEY)
  settings.wirdPlan = null
}

export async function getWirdSummary(dayKey = getLocalDayKey()): Promise<WirdSummary> {
  const plan = settings.wirdPlan ?? await loadWirdPlan()
  const counts = await loadCounts()
  const boundaries = createWirdBoundaries(counts)
  return deriveWirdSummary(plan, counts, boundaries, dayKey)
}

export async function advanceWirdFromReaderPosition(surah: number, verse: number): Promise<void> {
  const plan = settings.wirdPlan ?? await loadWirdPlan()
  if (!plan) { return }
  const counts = await loadCounts()
  const next = advanceWirdProgress(plan, { surah, verse }, counts)
  if (next !== plan) {
    await saveWirdPlan(next)
  }
}
