import type { QuranAtlasReactDb } from '../storage/db'
import { SURAH_COUNT, type QuranRef } from './verse-key'

export type RecentSurahPosition = QuranRef & { updatedAt?: number }

const RECENT_SURAH_LIMIT = 7

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

function normalizeRecentSurah(value: unknown): RecentSurahPosition | null {
  if (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= SURAH_COUNT) {
    return { surah: Number(value), verse: 1 }
  }
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<RecentSurahPosition>
  if (!Number.isInteger(candidate.surah) || !Number.isInteger(candidate.verse)) return null
  if ((candidate.surah ?? 0) < 1 || (candidate.surah ?? 0) > SURAH_COUNT || (candidate.verse ?? 0) < 1) return null
  return {
    surah: candidate.surah as number,
    updatedAt: Number.isFinite(candidate.updatedAt) ? Number(candidate.updatedAt) : undefined,
    verse: candidate.verse as number,
  }
}
