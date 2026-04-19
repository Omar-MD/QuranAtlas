/**
 * Font size preference: persisted in IDB settings store, applied via data-font-size
 * attribute on <html> and a CSS variable --qa-font-size-base.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import * as settingsState from '../state/settings.js'

const DEFAULT_SIZE = 'md'
const OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl']
const SCALE = { xs: 0.75, sm: 0.875, md: 1.0, lg: 1.15, xl: 1.3 }
const LEGACY_MAP = { small: 'sm', medium: 'md', large: 'lg' }

export function getFontSizeOptions() {
  return [...OPTIONS]
}

export function applyFontSize(size) {
  if (!OPTIONS.includes(size)) { size = DEFAULT_SIZE }
  document.documentElement.setAttribute('data-font-size', size)
  document.documentElement.style.setProperty('--qa-font-size-base', String(SCALE[size]))
}

export async function loadFontSize() {
  try {
    const saved = await get('settings', 'fontSize')
    const raw = saved?.value
    if (!raw) { return DEFAULT_SIZE }
    if (OPTIONS.includes(raw)) { return raw }
    if (LEGACY_MAP[raw]) {
      const mapped = LEGACY_MAP[raw]
      put('settings', { key: 'fontSize', value: mapped }).catch(() => {})
      return mapped
    }
    return DEFAULT_SIZE
  } catch (error) {
    logger.error('Failed to load font size', { error })
    return DEFAULT_SIZE
  }
}

export async function setFontSize(size) {
  if (!OPTIONS.includes(size)) { return false }
  applyFontSize(size)
  settingsState.set({ fontSize: size })
  emit(Events.SETTINGS_FONT_SIZE_CHANGED, /** @type {import('../core/constants.js').SettingsFontSizeChangedPayload} */({ size }))
  put('settings', { key: 'fontSize', value: size }).catch((error) => {
    logger.error('Failed to save font size', { size, error })
  })
  return true
}

/**
 * Reset the font-size preference to the default step (md).
 */
export async function resetFontSize() {
  return setFontSize(DEFAULT_SIZE)
}

export async function initFontSize() {
  const size = await loadFontSize()
  applyFontSize(size)
  settingsState.set({ fontSize: size })
}
