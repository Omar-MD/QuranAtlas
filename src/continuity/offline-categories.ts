import { get } from '../core/db.js'
import { logger } from '../core/logger.js'

export type OfflineCategoriesState = {
  text: {
    riwayat: Record<string, boolean>
    translations: Record<string, boolean>
    tafsir: Record<string, boolean>
  }
  pages: Record<string, boolean>
  search: boolean
}

export const DEFAULT_OFFLINE_CATEGORIES: OfflineCategoriesState = {
  text: { riwayat: {}, translations: {}, tafsir: {} },
  pages: {},
  search: false,
}

const KEY = 'offlineCategories'

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function booleanRecord(raw: unknown): Record<string, boolean> {
  if (!isPlainRecord(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([, v]) => typeof v === 'boolean')
  ) as Record<string, boolean>
}

export function normalizeOfflineCategories(raw: unknown): OfflineCategoriesState {
  if (!isPlainRecord(raw)) return { ...DEFAULT_OFFLINE_CATEGORIES }
  const text = isPlainRecord(raw.text) ? raw.text : {}
  const pages = isPlainRecord(raw.pages) ? raw.pages : {}
  const oldRiwayatText = {
    hafs: text.hafs === true,
    warsh: text.warsh === true,
    qaloon: text.qaloon === true,
  }
  const sourceAwareText = {
    riwayat: booleanRecord(text.riwayat),
    translations: booleanRecord(text.translations),
    tafsir: booleanRecord(text.tafsir),
  }
  const hasSourceAwareRiwayat = isPlainRecord(text.riwayat)
  const riwayat = hasSourceAwareRiwayat
    ? sourceAwareText.riwayat
    : oldRiwayatText
  const pagesRecord = booleanRecord(pages)
  const normalizedPages = pagesRecord._all === true
    ? { qaloon: true }
    : pagesRecord
  return {
    text: { ...sourceAwareText, riwayat },
    pages: normalizedPages,
    search: raw.search === true,
  }
}

export async function loadOfflineCategories(): Promise<OfflineCategoriesState> {
  try {
    const record = await get('settings', KEY)
    return normalizeOfflineCategories(record?.value)
  } catch (error) {
    logger.error('Failed to load offlineCategories', { error })
    return { ...DEFAULT_OFFLINE_CATEGORIES }
  }
}
