/**
 * Global reading position — single record (current surah + verse) that
 * supersedes the per-surah `positions` store dropped in DB v4.
 *
 * Persisted under settings key `'currentPosition'` as `{ surah, verse }`.
 *
 * SOLE WRITER for `settings.currentPosition` (CLAUDE.md Rule 5). All other
 * code reads via `loadGlobalPosition()`.
 */

import { get, put, del } from '../core/db'
import { settings, type GlobalPosition } from '../settings/state.svelte'
import { logger } from '../core/logger'

const KEY = 'currentPosition'

/** Read the current global reading position from IDB. */
export async function loadGlobalPosition(): Promise<GlobalPosition> {
  try {
    const rec = await get('settings', KEY)
    const v = rec?.value as { surah?: unknown; verse?: unknown } | null | undefined
    if (!v || typeof v.surah !== 'number' || typeof v.verse !== 'number') {
      return null
    }
    const pos = { surah: v.surah, verse: v.verse }
    settings.currentPosition = pos
    return pos
  } catch (error) {
    logger.error('Failed to load global position:', { error })
    return null
  }
}

/** Persist `{ surah, verse }` as the global position. Sole writer. */
export async function saveGlobalPosition(surah: number, verse: number): Promise<void> {
  try {
    const value = { surah, verse }
    await put('settings', { key: KEY, value })
    settings.currentPosition = value
  } catch (error) {
    logger.error('Failed to save global position:', { surah, verse, error })
  }
}

/** Remove the persisted global position (used by clear-data flow). */
export async function clearGlobalPosition(): Promise<void> {
  try {
    await del('settings', KEY)
    settings.currentPosition = null
  } catch (error) {
    logger.error('Failed to clear global position:', { error })
  }
}
