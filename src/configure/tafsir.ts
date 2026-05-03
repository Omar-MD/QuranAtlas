import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from './state.svelte.ts'

const DEFAULT_TAFSIR_ID = 'muyassar'

export async function setTafsirId(id: string): Promise<void> {
  try {
    await put('settings', { key: 'tafsirId', value: id })
  } catch (error) {
    logger.error('Failed to write tafsirId', { id, error })
    return
  }
  Object.assign(settings, { tafsirId: id })
}

export async function loadTafsirId(): Promise<string | null> {
  try {
    const rec = await get('settings', 'tafsirId')
    return typeof rec?.value === 'string' ? rec.value : null
  } catch {
    return null
  }
}

export async function resolveSavedTafsirId(availableIds: string[]): Promise<string> {
  const saved = (await loadTafsirId()) ?? settings.tafsirId ?? DEFAULT_TAFSIR_ID
  const resolved = availableIds.includes(saved) ? saved : DEFAULT_TAFSIR_ID
  if (resolved !== saved) {
    await setTafsirId(resolved)
  }
  return resolved
}
