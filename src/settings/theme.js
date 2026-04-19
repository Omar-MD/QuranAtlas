/**
 * Theme management: load and apply user theme preferences.
 * 'auto' follows prefers-color-scheme; flips between light and dark at runtime.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import * as settingsState from '../state/settings.js'

const DEFAULT_THEME = 'light'
const THEME_OPTIONS = ['light', 'sepia', 'dark', 'auto']
const APPLIED_VARIANTS = ['light', 'sepia', 'dark']

let mediaQuery = null
let mediaListener = null

export async function loadTheme() {
  try {
    const saved = await get('settings', 'theme')
    return saved?.value || DEFAULT_THEME
  } catch (error) {
    logger.error('Failed to load theme:', { error })
    return DEFAULT_THEME
  }
}

function resolveAuto() {
  if (typeof window === 'undefined' || !window.matchMedia) { return 'light' }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme) {
  if (!THEME_OPTIONS.includes(theme)) {
    logger.warn('Invalid theme:', { theme })
    return
  }

  const variant = theme === 'auto' ? resolveAuto() : theme

  document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia')
  document.documentElement.classList.add(`theme-${variant}`)
  document.documentElement.setAttribute('data-theme', variant)
  document.documentElement.setAttribute('data-theme-pref', theme)

  if (theme === 'auto') {
    if (!mediaQuery && typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaListener = () => { applyTheme('auto') }
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', mediaListener)
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(mediaListener)
      }
    }
  } else if (mediaQuery && mediaListener) {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', mediaListener)
    } else if (typeof mediaQuery.removeListener === 'function') {
      mediaQuery.removeListener(mediaListener)
    }
    mediaQuery = null
    mediaListener = null
  }
}

function getCurrentThemePref() {
  const pref = document.documentElement.getAttribute('data-theme-pref')
  if (THEME_OPTIONS.includes(pref)) { return pref }
  const dataTheme = document.documentElement.getAttribute('data-theme')
  if (APPLIED_VARIANTS.includes(dataTheme)) { return dataTheme }
  const classTheme = APPLIED_VARIANTS.find((t) =>
    document.documentElement.classList.contains(`theme-${t}`)
  )
  return classTheme || DEFAULT_THEME
}

export async function setTheme(theme) {
  if (!THEME_OPTIONS.includes(theme)) {
    logger.warn('Invalid theme:', { theme })
    return false
  }

  const from = getCurrentThemePref()
  applyTheme(theme)
  settingsState.set({ theme })
  emit(Events.SETTINGS_THEME_CHANGED, { from, to: theme })

  put('settings', { key: 'theme', value: theme }).catch((error) => {
    logger.error('Failed to save theme:', { theme, error })
  })

  return true
}

export function getThemeOptions() {
  return [...THEME_OPTIONS]
}

/**
 * Advance to the next theme in light → sepia → dark → auto → light order,
 * applying + persisting it. Returns the new preference.
 */
export async function cycleTheme() {
  const pref = getCurrentThemePref()
  const idx = THEME_OPTIONS.indexOf(pref)
  const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length]
  await setTheme(next)
  return next
}

export async function initTheme() {
  const theme = await loadTheme()
  applyTheme(theme)
  settingsState.set({ theme })
}
