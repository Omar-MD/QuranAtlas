import { get, put } from '../../core/db/connection'
import { logger } from '../../core/logger'
import { settings, type MushafViewMode } from '../../configure/state.svelte'

const KEY = 'mushafViewMode'
const DEFAULT: MushafViewMode = 'auto'
const OPTIONS = ['auto', 'fit-page', 'fit-width'] as const

export function getMushafViewModeOptions(): MushafViewMode[] {
  return [...OPTIONS]
}

export function isMushafViewMode(value: unknown): value is MushafViewMode {
  return typeof value === 'string' && (OPTIONS as readonly string[]).includes(value)
}

export async function loadMushafViewMode(): Promise<MushafViewMode> {
  try {
    const saved = await get('settings', KEY)
    const raw = (saved as { value?: unknown } | undefined)?.value
    return isMushafViewMode(raw) ? raw : DEFAULT
  } catch (error) {
    logger.error('Failed to load Mushaf view mode', { error })
    return DEFAULT
  }
}

export async function setMushafViewMode(mode: MushafViewMode): Promise<boolean> {
  if (!isMushafViewMode(mode)) return false
  settings.mushafViewMode = mode
  try {
    await put('settings', { key: KEY, value: mode })
  } catch (error) {
    logger.error('Failed to save Mushaf view mode', { mode, error })
  }
  return true
}

export async function initMushafViewMode(): Promise<void> {
  settings.mushafViewMode = await loadMushafViewMode()
}
