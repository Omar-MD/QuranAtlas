/**
 * Offline categories preference: per-feature opt-in for the offline selector.
 * Sole writer of `settings.offlineCategories` (N21).
 *
 * Shape lives at `state/settings.svelte.ts::OfflineCategoriesState`.
 */

import { put } from '../core/db.js'
import { logger } from '../core/logger.js'
import {
  settings,
} from './state.svelte.ts'
import {
  loadOfflineCategories as loadStoredOfflineCategories,
  normalizeOfflineCategories as normalize,
  type OfflineCategoriesState,
} from '../continuity/offline-categories'

const KEY = 'offlineCategories'

export async function loadOfflineCategories(): Promise<OfflineCategoriesState> {
  return loadStoredOfflineCategories()
}

export async function setOfflineCategories(next: OfflineCategoriesState): Promise<void> {
  const safe = normalize(next)
  Object.assign(settings, { offlineCategories: safe })
  try {
    await put('settings', { key: KEY, value: safe })
  } catch (error) {
    logger.error('Failed to save offlineCategories', { error })
  }
}

export async function initOfflineCategories(): Promise<void> {
  const loaded = await loadOfflineCategories()
  Object.assign(settings, { offlineCategories: loaded })
}
