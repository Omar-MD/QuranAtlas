/**
 * Font size preference: persisted in IDB settings store, applied via data-font-size
 * attribute on <html> and a CSS variable --qa-font-size-base.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'

const DEFAULT_SIZE = 'medium'
const OPTIONS = ['small', 'medium', 'large']
const SCALE = { small: 0.875, medium: 1, large: 1.15 }

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
    return saved?.value || DEFAULT_SIZE
  } catch (error) {
    logger.error('Failed to load font size', { error })
    return DEFAULT_SIZE
  }
}

export async function setFontSize(size) {
  if (!OPTIONS.includes(size)) { return false }
  applyFontSize(size)
  emit(Events.SETTINGS_FONT_SIZE_CHANGED, { size })
  put('settings', { key: 'fontSize', value: size }).catch((error) => {
    logger.error('Failed to save font size', { size, error })
  })
  return true
}

export async function initFontSize() {
  const size = await loadFontSize()
  applyFontSize(size)
}
