/**
 * Theme management: load and apply user theme preferences.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'

const DEFAULT_THEME = 'light'
const THEME_OPTIONS = ['light', 'dark', 'sepia']

/**
 * Load the saved theme or default.
 * @returns {Promise<string>} The current theme name
 */
export async function loadTheme() {
  try {
    const saved = await get('settings', 'theme')
    return saved?.value || DEFAULT_THEME
  } catch (error) {
    console.error('Failed to load theme:', error)
    return DEFAULT_THEME
  }
}

/**
 * Apply a theme to the document.
 * @param {string} theme - Theme name (light, dark, sepia)
 */
export function applyTheme(theme) {
  if (!THEME_OPTIONS.includes(theme)) {
    console.warn('Invalid theme:', theme)
    return
  }

  // Remove existing theme classes
  document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia')
  // Add new theme class
  document.documentElement.classList.add(`theme-${theme}`)
  // Store for CSS reference
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Save and apply a theme.
 * @param {string} theme - Theme name to save and apply
 * @returns {Promise<boolean>} Success status
 */
export async function setTheme(theme) {
  if (!THEME_OPTIONS.includes(theme)) {
    console.warn('Invalid theme:', theme)
    return false
  }

  // Apply theme synchronously for instant visual response
  applyTheme(theme)
  emit(Events.SETTINGS_THEME_CHANGED, { theme })

  // Persist asynchronously — fire-and-forget, UI is already updated
  put('settings', { key: 'theme', value: theme }).catch((error) => {
    console.error('Failed to save theme:', error)
  })

  return true
}

/**
 * Get available theme options.
 * @returns {Array<string>} Theme option names
 */
export function getThemeOptions() {
  return [...THEME_OPTIONS]
}

/**
 * Initialize theme on app start.
 */
export async function initTheme() {
  const theme = await loadTheme()
  applyTheme(theme)
}
