/**
 * Theme management: load and apply user theme preferences.
 * 'auto' follows prefers-color-scheme; flips between light and dark at runtime.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { settings } from '../state/settings.svelte.ts'

const DEFAULT_THEME = 'light'
const THEME_OPTIONS = ['light', 'sepia', 'dark', 'auto']
const APPLIED_VARIANTS = ['light', 'sepia', 'dark']

// prefers-color-scheme listener — preserved verbatim (see migration Rule 8.1)
let mediaQuery: MediaQueryList | null = null
let mediaListener: (() => void) | null = null

export async function loadTheme(): Promise<string> {
  try {
    const saved = await get('settings', 'theme')
    return (saved?.value as string) || DEFAULT_THEME
  } catch (error) {
    logger.error('Failed to load theme:', { error })
    return DEFAULT_THEME
  }
}

function resolveAuto(): string {
  if (typeof window === 'undefined' || !window.matchMedia) { return 'light' }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function syncThemeColorMeta(): void {
  if (typeof document === 'undefined') { return }
  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue('--qa-surface-app')
    .trim()
  if (!surface) { return }
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = surface
}

export function applyTheme(theme: string): void {
  if (!THEME_OPTIONS.includes(theme)) {
    logger.warn('Invalid theme:', { theme })
    return
  }

  const variant = theme === 'auto' ? resolveAuto() : theme

  document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia')
  document.documentElement.classList.add(`theme-${variant}`)
  document.documentElement.setAttribute('data-theme', variant)
  document.documentElement.setAttribute('data-theme-pref', theme)
  syncThemeColorMeta()

  if (theme === 'auto') {
    if (!mediaQuery && typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaListener = () => { applyTheme('auto') }
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', mediaListener)
      } else if (typeof (mediaQuery as MediaQueryList & { addListener?: (fn: () => void) => void }).addListener === 'function') {
        (mediaQuery as MediaQueryList & { addListener: (fn: () => void) => void }).addListener(mediaListener)
      }
    }
  } else if (mediaQuery && mediaListener) {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', mediaListener)
    } else if (typeof (mediaQuery as MediaQueryList & { removeListener?: (fn: () => void) => void }).removeListener === 'function') {
      (mediaQuery as MediaQueryList & { removeListener: (fn: () => void) => void }).removeListener(mediaListener)
    }
    mediaQuery = null
    mediaListener = null
  }
}

function getCurrentThemePref(): string {
  const pref = document.documentElement.getAttribute('data-theme-pref')
  if (pref && THEME_OPTIONS.includes(pref)) { return pref }
  const dataTheme = document.documentElement.getAttribute('data-theme')
  if (dataTheme && APPLIED_VARIANTS.includes(dataTheme)) { return dataTheme }
  const classTheme = APPLIED_VARIANTS.find((t) =>
    document.documentElement.classList.contains(`theme-${t}`)
  )
  return classTheme ?? DEFAULT_THEME
}

export async function setTheme(theme: string): Promise<boolean> {
  if (!THEME_OPTIONS.includes(theme)) {
    logger.warn('Invalid theme:', { theme })
    return false
  }

  const from = getCurrentThemePref()
  applyTheme(theme)
  Object.assign(settings, { theme: theme as typeof settings.theme })
  emit(Events.SETTINGS_THEME_CHANGED, { from, to: theme })

  put('settings', { key: 'theme', value: theme }).catch((error) => {
    logger.error('Failed to save theme:', { theme, error })
  })

  return true
}

export function getThemeOptions(): string[] {
  return [...THEME_OPTIONS]
}

/**
 * Advance to the next theme in light → sepia → dark → auto → light order,
 * applying + persisting it. Returns the new preference.
 */
export async function cycleTheme(): Promise<string> {
  const pref = getCurrentThemePref()
  const idx = THEME_OPTIONS.indexOf(pref)
  const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length] ?? DEFAULT_THEME
  await setTheme(next)
  return next
}

export async function initTheme(): Promise<void> {
  const theme = await loadTheme()
  applyTheme(theme)
  Object.assign(settings, { theme: theme as typeof settings.theme })
}
