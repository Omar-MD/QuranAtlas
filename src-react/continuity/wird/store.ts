import type { QuranAtlasReactDb } from '../../storage/db'
import type { QuranRef, WirdPlan } from './types'

const DEFAULT_END_REF: QuranRef = { surah: 114, verse: 6 }
const DEFAULT_REMINDER = { browserNotifications: 'default', enabled: false, time: '07:00' } as const

function isQuranRef(value: unknown): value is QuranRef {
  if (!value || typeof value !== 'object') return false
  const ref = value as Partial<QuranRef>
  return Number.isInteger(ref.surah) && Number.isInteger(ref.verse) && (ref.surah ?? 0) >= 1 && (ref.verse ?? 0) >= 1
}

function nextRef(ref: QuranRef): QuranRef {
  return { surah: ref.surah, verse: ref.verse + 1 }
}

function normalizeWirdPlan(value: unknown): WirdPlan | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<WirdPlan> & {
    cursor?: unknown
    start?: unknown
  }
  if (isQuranRef(raw.startRef) && isQuranRef(raw.endRef) && raw.progress) {
    return raw as WirdPlan
  }
  if (!isQuranRef(raw.start) || !isQuranRef(raw.cursor)) return null
  const targetEndOn = typeof raw.targetEndOn === 'string' ? raw.targetEndOn : new Date().toISOString().slice(0, 10)
  const startedOn = typeof raw.startedOn === 'string' ? raw.startedOn : targetEndOn
  return {
    endRef: DEFAULT_END_REF,
    progress: {
      completedThroughRef: raw.cursor,
      dayKey: targetEndOn,
      lastReadRef: raw.cursor,
      nextRef: nextRef(raw.cursor),
    },
    reminder: DEFAULT_REMINDER,
    startRef: raw.start,
    startedOn,
    targetEndOn,
    unit: 'verse',
  }
}

export async function readWirdPlan(db: QuranAtlasReactDb): Promise<WirdPlan | null> {
  const record = await db.settings.get('wirdPlan')
  return normalizeWirdPlan(record?.value)
}

export async function writeWirdPlan(db: QuranAtlasReactDb, plan: WirdPlan | null): Promise<void> {
  await db.settings.put({ key: 'wirdPlan', value: plan })
}
