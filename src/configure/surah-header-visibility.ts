/**
 * Surah header visibility: persisted user preference for whether the in-reader
 * Surah Header (title + meta + juz progress) is shown above each surah.
 * Sole writer for the `surahHeaderHidden` IDB key.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from './state.svelte.ts'
import { reader } from '../read/state.svelte.ts'

const DEFAULT = false

export async function loadSurahHeaderHidden(): Promise<boolean> {
  try {
    const rec = await get('settings', 'surahHeaderHidden')
    const raw = (rec as { value?: unknown } | undefined)?.value
    return typeof raw === 'boolean' ? raw : DEFAULT
  } catch (error) {
    logger.error('Failed to load surah header visibility', { error })
    return DEFAULT
  }
}

export async function setSurahHeaderHidden(hidden: boolean): Promise<boolean> {
  settings.surahHeaderHidden = hidden
  reader.surahHeaderHidden = hidden
  try {
    await put('settings', { key: 'surahHeaderHidden', value: hidden })
  } catch (error) {
    logger.error('Failed to save surah header visibility', { hidden, error })
  }
  return hidden
}

export async function toggleSurahHeaderHidden(): Promise<boolean> {
  return setSurahHeaderHidden(!settings.surahHeaderHidden)
}

export async function initSurahHeaderHidden(): Promise<void> {
  const hidden = await loadSurahHeaderHidden()
  settings.surahHeaderHidden = hidden
  reader.surahHeaderHidden = hidden
}
