/**
 * Review state persistence.
 * Persists/restores view mode, filters, sort, and grouping to IDB positions["review"].
 * Written on every state change (immediate, no debounce).
 *
 * Note: Review state is stored in the 'positions' object store with a special id 'review'.
 * This store typically stores reading positions (surah, verse), so we include these fields
 * with dummy values (0) to maintain compatibility. This is an intentional schema reuse
 * to avoid creating a dedicated store for a single record.
 *
 * SOLE WRITER: This module is the ONLY writer for positions['review'] (CLAUDE.md Rule 5).
 */

import { get, put } from '../core/db'

const POSITION_ID = 'review'

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
 * Note: This stores in the 'positions' store with dummy surah/verse values
 * (0) because the store requires these fields for reading position records.
 * The actual review state is stored in the additional fields.
 */
export async function save(reviewState: ReviewStateRecord): Promise<void> {
  await put('positions', {
    id: POSITION_ID,
    surah: 0,
    verse: 0,
    savedAt: Date.now(),
    ...reviewState,
  })
}

/**
 * Load review state from IDB.
 */
export async function load(): Promise<ReviewStateRecord | null> {
  const record = await get('positions', POSITION_ID)
  if (!record) {
    return null
  }
  return record as unknown as ReviewStateRecord
}
