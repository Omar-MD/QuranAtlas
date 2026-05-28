import { getSurahs } from '../data/dataset'
import { loadRiwayah, type Riwayah } from '../packs/riwayah'
import { get, put, del } from '../core/db'
import { logger } from '../core/logger'
import type { GlobalPosition } from '../core/settings.svelte'

type SavedPosition = {
  surah?: unknown
  verse?: unknown
} | null | undefined

const FIRST_SURAH = 1
const LAST_SURAH = 114
const KEY = 'currentPosition'
const MADINAN_AYAH_COUNTS = [
  7, 285, 200, 175, 122, 167, 206, 76, 130, 109, 121, 111, 44, 54, 99, 128, 110, 105, 99,
  134, 111, 76, 119, 62, 77, 226, 95, 88, 69, 59, 33, 30, 73, 54, 46, 82, 182, 86, 72, 84,
  53, 50, 89, 56, 36, 34, 39, 29, 18, 45, 60, 47, 61, 55, 77, 99, 28, 21, 24, 13, 14, 11,
  11, 18, 12, 12, 31, 52, 52, 44, 30, 28, 18, 55, 39, 31, 50, 40, 45, 42, 29, 19, 36, 25,
  22, 17, 19, 26, 32, 20, 15, 21, 11, 8, 8, 20, 5, 8, 9, 11, 10, 8, 3, 9, 5, 5, 6, 3, 6,
  3, 5, 4, 5, 6,
] as const

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function getFallbackAyahCount(surah: number): number | null {
  const counts = MADINAN_AYAH_COUNTS
  return counts[surah - 1] ?? null
}

async function getAyahCount(surah: number, riwayah: Riwayah): Promise<number | null> {
  try {
    const surahs = await getSurahs()
    const meta = surahs.find((entry) => entry.n === surah)
    const count = meta?.counts?.[riwayah]
    if (isPositiveInteger(count)) {
      return count
    }
  } catch {
    // Fall back to the shipped riwayah count tables so saved-position restore
    // keeps working on cold offline launch before /dataset/surahs.json loads.
  }

  return getFallbackAyahCount(surah)
}

export async function loadGlobalPosition(riwayah?: Riwayah): Promise<GlobalPosition> {
  try {
    const rec = await get('settings', KEY)
    const value = rec?.value as { surah?: unknown; verse?: unknown } | null | undefined
    const target = await resolveSavedPositionTarget(value, riwayah ?? await loadRiwayah())
    if (!target || !value) {
      return null
    }
    const parsed = value as { surah: number; verse: number }
    return { surah: parsed.surah, verse: parsed.verse }
  } catch (error) {
    logger.error('Failed to load global position:', { error })
    return null
  }
}

export async function saveGlobalPosition(surah: number, verse: number): Promise<void> {
  const value = { surah, verse }
  try {
    await put('settings', { key: KEY, value })
  } catch (error) {
    logger.error('Failed to save global position:', { surah, verse, error })
    throw error
  }
}

export async function clearGlobalPosition(): Promise<void> {
  try {
    await del('settings', KEY)
  } catch (error) {
    logger.error('Failed to clear global position:', { error })
  }
}

export async function resolveSavedPositionTarget(
  position: SavedPosition,
  riwayah: Riwayah
): Promise<string | null> {
  if (!position || !isPositiveInteger(position.surah) || !isPositiveInteger(position.verse)) {
    return null
  }

  const surah = position.surah
  const verse = position.verse
  if (surah < FIRST_SURAH || surah > LAST_SURAH) {
    return null
  }

  const ayahCount = await getAyahCount(surah, riwayah)
  if (ayahCount === null) {
    return null
  }

  if (verse > ayahCount) {
    return null
  }

  return `#/s/${surah}/${verse}`
}
