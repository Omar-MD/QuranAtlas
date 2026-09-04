import type { QuranAtlasReactDb } from '../../storage/db'
import type { SettingRecord } from '../../storage/types'
import { advanceWirdProgressFromReaderPosition, getLocalDayKey } from './progress'
import type { BrowserNotificationState, QuranRef, SurahCount, WirdPlan, WirdUnit } from './types'

export const REACT_WIRD_PLAN_CHANGED_EVENT = 'quranatlas-react-wird-plan-changed'

const DEFAULT_END_REF: QuranRef = { surah: 114, verse: 6 }
const DEFAULT_REMINDER = { browserNotifications: 'default', enabled: false, time: '07:00' } as const
const VALID_UNITS = new Set<WirdUnit>(['juz', 'hizb', 'page', 'verse'])
const VALID_NOTIFICATION_STATES = new Set<BrowserNotificationState>(['unsupported', 'default', 'granted', 'denied'])

export type WirdSettingsReader = {
  settings: {
    get: (key: string) => Promise<SettingRecord | undefined>
  }
}

function isQuranRef(value: unknown): value is QuranRef {
  if (!value || typeof value !== 'object') return false
  const ref = value as Partial<QuranRef>
  return Number.isInteger(ref.surah) && Number.isInteger(ref.verse) && (ref.surah ?? 0) >= 1 && (ref.verse ?? 0) >= 1
}

function nextRef(ref: QuranRef): QuranRef {
  return { surah: ref.surah, verse: ref.verse + 1 }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function asPositiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : fallback
}

function asUnit(value: unknown): WirdUnit {
  return typeof value === 'string' && VALID_UNITS.has(value as WirdUnit) ? value as WirdUnit : 'verse'
}

function asReminder(value: unknown) {
  if (!value || typeof value !== 'object') return DEFAULT_REMINDER
  const raw = value as { browserNotifications?: unknown; enabled?: unknown; time?: unknown }
  const browserNotifications = typeof raw.browserNotifications === 'string' && VALID_NOTIFICATION_STATES.has(raw.browserNotifications as BrowserNotificationState)
    ? raw.browserNotifications as BrowserNotificationState
    : DEFAULT_REMINDER.browserNotifications
  return {
    browserNotifications,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_REMINDER.enabled,
    time: typeof raw.time === 'string' && raw.time.length > 0 ? raw.time : DEFAULT_REMINDER.time,
  }
}

export function normalizeWirdPlan(value: unknown): WirdPlan | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<WirdPlan> & {
    cursor?: unknown
    start?: unknown
  }
  const today = getLocalDayKey()
  if (isQuranRef(raw.startRef) && isQuranRef(raw.endRef) && raw.progress && typeof raw.progress === 'object') {
    const progress = raw.progress as Partial<WirdPlan['progress']>
    const completedThroughRef = isQuranRef(progress.completedThroughRef) ? progress.completedThroughRef : null
    const next = isQuranRef(progress.nextRef)
      ? progress.nextRef
      : completedThroughRef
        ? nextRef(completedThroughRef)
        : raw.startRef
    const dayKey = asString(progress.dayKey, today)
    return {
      endRef: raw.endRef,
      history: Array.isArray(raw.history) ? raw.history : [],
      id: asString(raw.id, `wird-${dayKey}`),
      progress: {
        completedThroughRef,
        dayKey,
        lastReadRef: isQuranRef(progress.lastReadRef) ? progress.lastReadRef : completedThroughRef ?? raw.startRef,
        nextRef: next,
        todayEndRef: isQuranRef(progress.todayEndRef) ? progress.todayEndRef : next,
        todayStartRef: isQuranRef(progress.todayStartRef) ? progress.todayStartRef : next,
      },
      reminder: asReminder(raw.reminder),
      startRef: raw.startRef,
      startedOn: asString(raw.startedOn, dayKey),
      targetDays: asPositiveInteger(raw.targetDays, 1),
      targetEndOn: asString(raw.targetEndOn, dayKey),
      unit: asUnit(raw.unit),
    }
  }
  if (!isQuranRef(raw.start) || !isQuranRef(raw.cursor)) return null
  const targetEndOn = asString(raw.targetEndOn, today)
  const startedOn = asString(raw.startedOn, targetEndOn)
  return {
    endRef: DEFAULT_END_REF,
    history: [],
    id: asString(raw.id, `wird-${targetEndOn}`),
    progress: {
      completedThroughRef: raw.cursor,
      dayKey: targetEndOn,
      lastReadRef: raw.cursor,
      nextRef: nextRef(raw.cursor),
      todayEndRef: nextRef(raw.cursor),
      todayStartRef: nextRef(raw.cursor),
    },
    reminder: DEFAULT_REMINDER,
    startRef: raw.start,
    startedOn,
    targetDays: asPositiveInteger(raw.targetDays, 1),
    targetEndOn,
    unit: 'verse',
  }
}

export async function readWirdPlan(db: WirdSettingsReader): Promise<WirdPlan | null> {
  const record = await db.settings.get('wirdPlan')
  return normalizeWirdPlan(record?.value)
}

export async function writeWirdPlan(db: QuranAtlasReactDb, plan: WirdPlan | null): Promise<void> {
  if (!plan) {
    await db.settings.delete('wirdPlan')
    emitWirdPlanChanged(null)
    return
  }
  const value = JSON.parse(JSON.stringify(plan)) as WirdPlan
  await db.settings.put({ key: 'wirdPlan', value })
  emitWirdPlanChanged(value)
}

export async function advanceWirdFromReaderPosition(
  db: QuranAtlasReactDb,
  readRef: QuranRef,
  counts: ReadonlyArray<SurahCount>,
  dayKey = getLocalDayKey(),
): Promise<WirdPlan | null> {
  const plan = await readWirdPlan(db)
  if (!plan) return null
  const next = advanceWirdProgressFromReaderPosition(plan, readRef, counts, dayKey)
  await writeWirdPlan(db, next)
  return next
}

export function notifyWirdPlanChanged(plan: WirdPlan | null): void {
  emitWirdPlanChanged(plan)
}

export function subscribeWirdPlanChanged(listener: (plan: WirdPlan | null) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  function onWirdPlanChanged(event: Event): void {
    listener(((event as CustomEvent<WirdPlan | null>).detail ?? null))
  }
  window.addEventListener(REACT_WIRD_PLAN_CHANGED_EVENT, onWirdPlanChanged)
  return () => window.removeEventListener(REACT_WIRD_PLAN_CHANGED_EVENT, onWirdPlanChanged)
}

function emitWirdPlanChanged(plan: WirdPlan | null): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REACT_WIRD_PLAN_CHANGED_EVENT, { detail: plan }))
}
