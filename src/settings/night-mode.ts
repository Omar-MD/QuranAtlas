/**
 * Night recitation mode: dim+warm overlay, composes over any theme.
 * Sole writer for the `nightMode` IDB key.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../state/settings.svelte.ts'

const DEFAULT = false

export function applyNightMode(on: boolean): void {
  if (on) {
    document.documentElement.setAttribute('data-night-mode', 'on')
  } else {
    document.documentElement.removeAttribute('data-night-mode')
  }
}

export async function loadNightMode(): Promise<boolean> {
  try {
    const rec = await get('settings', 'nightMode')
    const raw = (rec as { value?: unknown } | undefined)?.value
    return typeof raw === 'boolean' ? raw : DEFAULT
  } catch (error) {
    logger.error('Failed to load night mode', { error })
    return DEFAULT
  }
}

export async function setNightMode(on: boolean): Promise<boolean> {
  applyNightMode(on)
  Object.assign(settings, { nightMode: on })
  try {
    await put('settings', { key: 'nightMode', value: on })
  } catch (error) {
    logger.error('Failed to save night mode', { on, error })
  }
  return true
}

export async function toggleNightMode(): Promise<boolean> {
  const next = !settings.nightMode
  await setNightMode(next)
  return next
}

export async function initNightMode(): Promise<void> {
  const on = await loadNightMode()
  applyNightMode(on)
  Object.assign(settings, { nightMode: on })
}
