/**
 * Review state persistence.
 * Persists/restores view mode, filters, sort, and grouping to IDB positions["review"].
 * Written on every state change (immediate, no debounce).
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
  if (!record) return null
  return record
}
