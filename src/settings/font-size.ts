/**
 * Font size preference: persisted in IDB settings store, applied via data-font-size
 * attribute on <html> and a CSS variable --qa-font-size-base.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../state/settings.svelte.ts'

const DEFAULT_SIZE = 'md'
const OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl'] as const
type FontSizeOption = typeof OPTIONS[number]
const SCALE: Record<FontSizeOption, number> = { xs: 0.75, sm: 0.875, md: 1.0, lg: 1.15, xl: 1.3 }
const LEGACY_MAP: Record<string, FontSizeOption> = { small: 'sm', medium: 'md', large: 'lg' }

export function getFontSizeOptions(): FontSizeOption[] {
  return [...OPTIONS]
}

export function applyFontSize(size: string): void {
  const safeSize = OPTIONS.includes(size as FontSizeOption) ? (size as FontSizeOption) : DEFAULT_SIZE
  document.documentElement.setAttribute('data-font-size', safeSize)
  document.documentElement.style.setProperty('--qa-font-size-base', String(SCALE[safeSize]))
}

export async function loadFontSize(): Promise<FontSizeOption> {
  try {
    const saved = await get('settings', 'fontSize')
    const raw = saved?.value as string | undefined
    if (!raw) { return DEFAULT_SIZE }
    if (OPTIONS.includes(raw as FontSizeOption)) { return raw as FontSizeOption }
    const mapped = LEGACY_MAP[raw]
    if (mapped) {
      put('settings', { key: 'fontSize', value: mapped }).catch(() => {})
      return mapped
    }
    return DEFAULT_SIZE
  } catch (error) {
    logger.error('Failed to load font size', { error })
    return DEFAULT_SIZE
  }
}

export async function setFontSize(size: string): Promise<boolean> {
  if (!OPTIONS.includes(size as FontSizeOption)) { return false }
  applyFontSize(size)
  Object.assign(settings, { fontSize: size as typeof settings.fontSize })
  // SETTINGS_FONT_SIZE_CHANGED removed (audit C-7) — emitter had no
  // listeners; the rune mutation above is the single source of truth.
  put('settings', { key: 'fontSize', value: size }).catch((error) => {
    logger.error('Failed to save font size', { size, error })
  })
  return true
}

/**
 * Reset the font-size preference to the default step (md).
 */
export async function resetFontSize(): Promise<boolean> {
  return setFontSize(DEFAULT_SIZE)
}

export async function initFontSize(): Promise<void> {
  const size = await loadFontSize()
  applyFontSize(size)
  Object.assign(settings, { fontSize: size as typeof settings.fontSize })
}
