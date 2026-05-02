/**
 * Theme management: load and apply user theme preferences.
 * 'auto' follows prefers-color-scheme; flips between light and dark at runtime.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../settings/state.svelte.ts'

const DEFAULT_THEME = 'light'
const THEME_OPTIONS = ['light', 'sepia', 'dark', 'auto']
const APPLIED_VARIANTS = ['light', 'sepia', 'dark']

// Keep the prefers-color-scheme listener wiring stable across theme changes.
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

  applyTheme(theme)
  Object.assign(settings, { theme: theme as typeof settings.theme })
  // SETTINGS_THEME_CHANGED removed (audit C-7) — emitter had no
  // listeners; the rune mutation above is the single source of truth.

  put('settings', { key: 'theme', value: theme }).catch((error) => {
    logger.error('Failed to save theme:', { theme, error })
  })

  return true
}

export function getThemeOptions(): string[] {
  return [...THEME_OPTIONS]
}

/**
 * Advance to the next theme in light → sepia → dark → light order, applying
 * + persisting it. Returns the new preference.
 *
 * `auto` is intentionally omitted from the cycle: when the OS is in dark
 * mode, `auto` resolves to `dark` and the cycle step `dark → auto` produced
 * a visually identical result, requiring two taps to actually move from
 * dark to light. Auto remains selectable via the Settings sheet swatches.
 * If the user is currently on `auto`, the next tap commits the resolved
 * variant first (light or dark depending on the OS) so the cycle is
 * deterministic from any starting state.
 */
const CYCLE_OPTIONS = ['light', 'sepia', 'dark'] as const

export async function cycleTheme(): Promise<string> {
  const pref = getCurrentThemePref()
  const current = pref === 'auto' ? resolveAuto() : pref
  const idx = CYCLE_OPTIONS.indexOf(current as typeof CYCLE_OPTIONS[number])
  const next = idx === -1
    ? CYCLE_OPTIONS[0]
    : CYCLE_OPTIONS[(idx + 1) % CYCLE_OPTIONS.length]
  await setTheme(next as string)
  return next as string
}

export async function initTheme(): Promise<void> {
  const theme = await loadTheme()
  applyTheme(theme)
  Object.assign(settings, { theme: theme as typeof settings.theme })
}
