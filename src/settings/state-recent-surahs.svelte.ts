// Sole writer for `settings.recentSurahs`. Pre-fix App.svelte did its
// own read-modify-write directly (audit R-08 / R-27, 2026-04-29) — two
// rapid surah switches could race the get + put against each other,
// silently dropping one of the entries from the recent list.
//
// Serialise writes through a single in-flight promise. Each call awaits
// the previous one before starting; readers get a consistent slice.

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'

const CAP = 7

let inFlight: Promise<void> = Promise.resolve()

export async function trackRecentSurah(surah: number): Promise<void> {
  // Chain on the previous write so we never race two read-modify-writes.
  inFlight = inFlight.then(async () => {
    try {
      const rec = await get('settings', 'recentSurahs')
      const prev = Array.isArray(rec?.value) ? (rec.value as number[]) : []
      const next = [surah, ...prev.filter((n) => n !== surah)].slice(0, CAP)
      await put('settings', { key: 'recentSurahs', value: next })
      emit(Events.SETTINGS_RECENT_SURAHS_UPDATED, { surahs: next })
    } catch (error) {
      logger.error('Failed to track recent surah', { surah, error })
    }
  })
  return inFlight
}

export async function loadRecentSurahs(): Promise<number[]> {
  try {
    const rec = await get('settings', 'recentSurahs')
    return Array.isArray(rec?.value) ? (rec.value as number[]) : []
  } catch {
    return []
  }
}
