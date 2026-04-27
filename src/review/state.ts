/**
 * Review state persistence.
 * Persists/restores view mode, filters, sort, and grouping to IDB meta["review"].
 * Written on every state change (immediate, no debounce).
 *
 * SOLE WRITER: This module is the ONLY writer for meta['review'] (CLAUDE.md Rule 5).
 *
 * Stored under the `meta` object store (DB v4+). Pre-v4 the record lived
 * in `positions['review']` with dummy surah/verse fields; the v4 schema
 * change (cross-surah infinite scroll 2026-04-25) dropped that store and
 * relocated this record to `meta`.
 */

import { get, put } from '../core/db'

const RECORD_ID = 'review'

export type ReviewStateRecord = {
  view: string
  activeTag: string | null
  activeLayer: string
  activeValue: string | null
  surahFilter: number | null
  sortBy: string
  groupBy: string
}

const DEFAULT_STATE: ReviewStateRecord = {
  view: 'all',
  activeTag: null,
  activeLayer: 'threads',
  activeValue: null,
  surahFilter: null,
  sortBy: 'updatedAt',
  groupBy: 'tag',
}

/**
 * Get default review state.
 */
export function getDefaultState(): ReviewStateRecord {
  return { ...DEFAULT_STATE }
}

/**
 * Save review state to IDB.
 */
export async function save(reviewState: ReviewStateRecord): Promise<void> {
  await put('meta', {
    id: RECORD_ID,
    savedAt: Date.now(),
    ...reviewState,
  })
}

/**
 * Load review state from IDB.
 */
export async function load(): Promise<ReviewStateRecord | null> {
  const record = await get('meta', RECORD_ID)
  if (!record) {
    return null
  }
  return record as unknown as ReviewStateRecord
}
