/**
 * Review state persistence.
 * Persists/restores view mode, filters, sort, and grouping to IDB positions["review"].
 * Written on every state change (immediate, no debounce).
 * 
 * Note: Review state is stored in the 'positions' object store with a special id 'review'.
 * This store typically stores reading positions (surah, verse), so we include these fields
 * with dummy values (0) to maintain compatibility. This is an intentional schema reuse
 * to avoid creating a dedicated store for a single record.
 */

import { get, put } from '../core/db.js'

const POSITION_ID = 'review'

const DEFAULT_STATE = {
  view: 'all',
  activeTag: null,
  surahFilter: null,
  sortBy: 'updatedAt',
  groupBy: 'surah',
}

/**
 * Get default review state.
 * @returns {object}
 */
export function getDefaultState() {
  return { ...DEFAULT_STATE }
}

/**
 * Save review state to IDB.
 * Note: This stores in the 'positions' store with dummy surah/verse values
 * (0) because the store requires these fields for reading position records.
 * The actual review state is stored in the additional fields.
 * @param {object} reviewState
 */
export async function save(reviewState) {
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
 * @returns {Promise<object|null>}
 */
export async function load() {
  const record = await get('positions', POSITION_ID)
  if (!record) {
    return null
  }
  return record
}
