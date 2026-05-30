import type { QuranAtlasReactDb } from '../storage/db'

export type RecentSurahPosition = {
  surah: number
  verse: number
  updatedAt?: number
}

const RECENT_SURAH_LIMIT = 7

let recentWriteQueue: Promise<void> = Promise.resolve()

export function normalizeRecentSurahs(value: unknown): RecentSurahPosition[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<number>()
  const rows: RecentSurahPosition[] = []

  for (const item of value) {
    const row = normalizeRecentSurah(item)
    if (!row || seen.has(row.surah)) continue
    seen.add(row.surah)
    rows.push(row)
    if (rows.length >= RECENT_SURAH_LIMIT) break
  }

  return rows
}

export async function readRecentSurahs(db: QuranAtlasReactDb): Promise<RecentSurahPosition[]> {
  const record = await db.settings.get('recentSurahs')
  return normalizeRecentSurahs(record?.value)
}

export function trackRecentSurahPosition(
  db: QuranAtlasReactDb,
  position: Pick<RecentSurahPosition, 'surah' | 'verse'>,
  updatedAt = Date.now(),
): Promise<void> {
  recentWriteQueue = recentWriteQueue.catch(() => undefined).then(async () => {
    const record = await db.settings.get('recentSurahs')
    const previous = normalizeRecentSurahs(record?.value)
    const next = [
      { surah: position.surah, updatedAt, verse: position.verse },
      ...previous.filter((row) => row.surah !== position.surah),
    ].slice(0, RECENT_SURAH_LIMIT)
    await db.settings.put({ key: 'recentSurahs', value: next })
  })
  return recentWriteQueue
}

function normalizeRecentSurah(value: unknown): RecentSurahPosition | null {
  if (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 114) {
    return { surah: Number(value), verse: 1 }
  }
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<RecentSurahPosition>
  if (!Number.isInteger(candidate.surah) || !Number.isInteger(candidate.verse)) return null
  if ((candidate.surah ?? 0) < 1 || (candidate.surah ?? 0) > 114 || (candidate.verse ?? 0) < 1) return null
  return {
    surah: candidate.surah as number,
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : undefined,
    verse: candidate.verse as number,
  }
}
