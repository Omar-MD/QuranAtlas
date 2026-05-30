import type { QuranAtlasReactDb } from '../storage/db'

export type CurrentPosition = { surah: number; verse: number }

export function isValidCurrentPosition(position: unknown): position is CurrentPosition {
  if (!position || typeof position !== 'object') return false
  const candidate = position as CurrentPosition
  return Number.isInteger(candidate.surah) && candidate.surah >= 1 && candidate.surah <= 114 && Number.isInteger(candidate.verse) && candidate.verse >= 1
}

export async function writeCurrentPosition(db: QuranAtlasReactDb, position: CurrentPosition): Promise<void> {
  await db.settings.put({ key: 'currentPosition', value: position })
}
