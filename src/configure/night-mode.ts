/**
 * Night recitation mode: dim+warm overlay, composes over any theme.
 * Sole writer for the `nightMode` IDB key.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings, type NightMode } from './state.svelte.ts'

const DEFAULT: NightMode = 'off'

export function applyNightMode(mode: NightMode | boolean): void {
  const normalized = normalizeNightMode(mode)
  if (normalized === 'on') {
    document.documentElement.setAttribute('data-night-mode', 'on')
  } else {
    document.documentElement.removeAttribute('data-night-mode')
  }
}

export function normalizeNightMode(value: unknown): NightMode {
  if (value === true) return 'on'
  if (value === false || value == null) return 'off'
  if (value === 'off' || value === 'on' || value === 'auto') return value
  return 'off'
}

export async function loadNightMode(): Promise<NightMode> {
  try {
    const rec = await get('settings', 'nightMode')
    const raw = (rec as { value?: unknown } | undefined)?.value
    return normalizeNightMode(raw)
  } catch (error) {
    logger.error('Failed to load night mode', { error })
    return DEFAULT
  }
}

export async function setNightMode(mode: NightMode): Promise<boolean> {
  const normalized = normalizeNightMode(mode)
  applyNightMode(normalized)
  Object.assign(settings, { nightMode: normalized })
  try {
    await put('settings', { key: 'nightMode', value: normalized })
  } catch (error) {
    logger.error('Failed to save night mode', { mode: normalized, error })
  }
  return true
}

export async function toggleNightMode(): Promise<NightMode> {
  const next: NightMode = normalizeNightMode(settings.nightMode) === 'on' ? 'off' : 'on'
  await setNightMode(next)
  return next
}

export async function initNightMode(): Promise<void> {
  const mode = await loadNightMode()
  applyNightMode(mode)
  Object.assign(settings, { nightMode: mode })
}
