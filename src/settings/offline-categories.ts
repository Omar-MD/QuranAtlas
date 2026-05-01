/**
 * Offline categories preference: per-feature opt-in for the offline selector.
 * Sole writer of `settings.offlineCategories` (N21).
 *
 * Shape lives at `state/settings.svelte.ts::OfflineCategoriesState`.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import {
  DEFAULT_OFFLINE_CATEGORIES,
  type OfflineCategoriesState,
  settings,
} from '../state/settings.svelte.ts'

const KEY = 'offlineCategories'

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function normalize(raw: unknown): OfflineCategoriesState {
  if (!isPlainRecord(raw)) return { ...DEFAULT_OFFLINE_CATEGORIES }
  const text = isPlainRecord(raw.text) ? raw.text : {}
  const audio = isPlainRecord(raw.audio) ? raw.audio : {}
  const pages = isPlainRecord(raw.pages) ? raw.pages : {}
  return {
    text: {
      hafs: text.hafs === true,
      warsh: text.warsh === true,
      qaloon: text.qaloon === true,
    },
    audio: Object.fromEntries(
      Object.entries(audio).filter(([, v]) => typeof v === 'boolean')
    ) as Record<string, boolean>,
    pages: Object.fromEntries(
      Object.entries(pages).filter(([, v]) => typeof v === 'boolean')
    ) as Record<string, boolean>,
    search: raw.search === true,
  }
}

export async function loadOfflineCategories(): Promise<OfflineCategoriesState> {
  try {
    const record = await get('settings', KEY)
    return normalize(record?.value)
  } catch (error) {
    logger.error('Failed to load offlineCategories', { error })
    return { ...DEFAULT_OFFLINE_CATEGORIES }
  }
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
