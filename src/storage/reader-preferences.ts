import type {
  NormalizedReactMushafViewMode,
  ReactNightModePreference,
  ReactPreferenceStep,
  ReactReaderPreferences,
  ReactThemePreference,
} from './settings-writer'

export const REACT_READER_PREFERENCES_CHANGED_EVENT = 'quranatlas-react-reader-preferences-changed'

export type ReactReaderPreferencesChangedEvent = CustomEvent<Partial<ReactReaderPreferences>>

const FONT_SIZE_SCALE: Record<ReactPreferenceStep, number> = {
  lg: 1.15,
  md: 1,
  sm: 0.875,
  xl: 1.3,
  xs: 0.75,
}

export function emitReactReaderPreferencesChanged(preferences: ReactReaderPreferences): void {
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

export function applyReactReaderAppearance(preferences: Pick<ReactReaderPreferences, 'nightMode' | 'theme'>): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.themePref = preferences.theme
  root.dataset.theme = resolveTheme(preferences.theme)
  if (preferences.nightMode === 'off') {
    delete root.dataset.nightMode
  } else {
    root.dataset.nightMode = preferences.nightMode
  }
}

export function applyReactReaderTypography(preferences: Partial<ReactReaderPreferences>): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (preferences.fontSize) {
    root.dataset.fontSize = preferences.fontSize
    root.style.setProperty('--qa-react-font-size-base', String(FONT_SIZE_SCALE[preferences.fontSize]))
  }
  if (preferences.lineSpacing) root.dataset.lineSpacing = preferences.lineSpacing
  if (preferences.readerMargin) root.dataset.readerMargin = preferences.readerMargin
  if (preferences.verseSpacing) root.dataset.verseSpacing = preferences.verseSpacing
  if (preferences.wordSpacing) root.dataset.wordSpacing = preferences.wordSpacing
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

export function isNightModeEnabled(nightMode: ReactNightModePreference): boolean {
  if (nightMode === 'on') return true
  if (nightMode === 'auto') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return false
}
