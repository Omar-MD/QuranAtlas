import type { NormalizedReactMushafViewMode, ReactReaderPreferences, ReactThemePreference } from './settings-writer'

export const REACT_READER_PREFERENCES_CHANGED_EVENT = 'quranatlas-react-reader-preferences-changed'

export type ReactReaderPreferencesChangedEvent = CustomEvent<Partial<ReactReaderPreferences>>

export function emitReactReaderPreferencesChanged(preferences: Partial<ReactReaderPreferences>): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REACT_READER_PREFERENCES_CHANGED_EVENT, { detail: preferences }))
}

export function subscribeReactReaderPreferencesChanged(
  listener: (preferences: Partial<ReactReaderPreferences>) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined
  function onPreferencesChanged(event: Event): void {
    listener((event as ReactReaderPreferencesChangedEvent).detail ?? {})
  }
  window.addEventListener(REACT_READER_PREFERENCES_CHANGED_EVENT, onPreferencesChanged)
  return () => window.removeEventListener(REACT_READER_PREFERENCES_CHANGED_EVENT, onPreferencesChanged)
}

export function applyReactReaderAppearance(
  preferences: Pick<ReactReaderPreferences, 'theme'> & Partial<Pick<ReactReaderPreferences, 'dimPageImages'>>,
): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.themePref = preferences.theme
  const resolvedTheme = resolveTheme(preferences.theme)
  root.dataset.theme = resolvedTheme
  syncThemeColorMeta()
  // The Night-mode pair is retired (A3): no night attribute is set; the Dim
  // page images switch is the only image treatment and applies in Dark only.
  delete root.dataset.nightMode
  if (preferences.dimPageImages !== undefined) {
    root.dataset.dimPageImages = preferences.dimPageImages ? 'on' : 'off'
  }
}

// Installed-PWA chrome (D6): the browser bar follows the active theme by
// mirroring the --qa-react-chrome token (accent chrome on light/sepia, dark
// canvas chrome on dark). Reading the computed token keeps this file free of
// colour literals and automatically tracks semantic.css; the initial value
// stays whatever index.html shipped (the light chrome) until first apply.
function syncThemeColorMeta(): void {
  if (typeof document === 'undefined') return
  const chrome = getComputedStyle(document.documentElement).getPropertyValue('--qa-react-chrome').trim()
  if (!chrome) return
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.setAttribute('content', chrome)
  }
}

export function subscribeReactSystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined
  const query = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!query) return () => undefined
  function syncTheme() {
    const root = document.documentElement
    if (root.dataset.themePref === 'auto') {
      root.dataset.theme = query.matches ? 'dark' : 'light'
      syncThemeColorMeta()
    }
  }
  query.addEventListener('change', syncTheme)
  return () => query.removeEventListener('change', syncTheme)
}

export function applyReactReaderTypography(preferences: Partial<ReactReaderPreferences>): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // Arabic (28/31/34/38/42) and translation (16/18/20/22/24) sizes are
  // separate controls (brief §1.3); the legacy single fontSize key drives the
  // Arabic ladder.
  if (preferences.fontSize) root.dataset.arabicSize = preferences.fontSize
  if (preferences.translationFontSize) root.dataset.translationSize = preferences.translationFontSize
  if (preferences.verseSpacing) root.dataset.verseSpacing = preferences.verseSpacing
}

export function isReactMushafViewMode(value: unknown): value is NormalizedReactMushafViewMode {
  return value === 'auto' || value === 'fit-page' || value === 'continuous'
}

function resolveTheme(theme: ReactThemePreference): 'light' | 'sepia' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}
