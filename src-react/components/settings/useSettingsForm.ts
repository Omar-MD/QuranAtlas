import { useEffect, useRef, useState } from 'react'

import { openReactDb } from '../../storage/db'
import {
  DEFAULT_REACT_READER_PREFERENCES,
  readReactReaderPreferences,
  writeReactReaderPreferences,
  type ReactMushafViewMode,
  type ReactNightModePreference,
  type ReactPreferenceStep,
  type ReactReaderPreferences,
  type ReactThemePreference,
} from '../../storage/settings-writer'
import {
  applyReactReaderAppearance,
  applyReactReaderTypography,
  emitReactReaderPreferencesChanged,
} from '../../storage/reader-preferences'

export type SettingsFormState =
  | { status: 'loading'; preferences: ReactReaderPreferences }
  | { status: 'ready'; preferences: ReactReaderPreferences }
  | { status: 'error'; preferences: ReactReaderPreferences }

export function useSettingsForm(): {
  setMushafViewMode: (value: ReactMushafViewMode) => void
  setNightMode: (value: ReactNightModePreference) => void
  setReadingFlow: (value: ReactPreferenceStep) => void
  setFontSize: (value: ReactPreferenceStep) => void
  setTheme: (value: ReactThemePreference) => void
  setTranslationVisible: (value: boolean) => void
  state: SettingsFormState
} {
  const [state, setState] = useState<SettingsFormState>({
    preferences: DEFAULT_REACT_READER_PREFERENCES,
    status: 'loading',
  })
  const hasUserChangesRef = useRef(false)
  const preferencesRef = useRef<ReactReaderPreferences>(DEFAULT_REACT_READER_PREFERENCES)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    void openReactDb()
      .then(readReactReaderPreferences)
      .then((preferences) => {
        if (!active || hasUserChangesRef.current) return
        preferencesRef.current = preferences
        applyReactReaderAppearance(preferences)
        applyReactReaderTypography(preferences)
        setState({ preferences, status: 'ready' })
      })
      .catch(() => {
        if (active && !hasUserChangesRef.current) setState({ preferences: DEFAULT_REACT_READER_PREFERENCES, status: 'error' })
      })
    return () => {
      active = false
    }
  }, [])

  function updatePreferences(updater: (current: ReactReaderPreferences) => ReactReaderPreferences): void {
    hasUserChangesRef.current = true
    const next = updater(preferencesRef.current)
    preferencesRef.current = next
    setState({ preferences: next, status: 'ready' })
    applyReactReaderAppearance(next)
    applyReactReaderTypography(next)
    emitReactReaderPreferencesChanged(next)
    writeQueueRef.current = writeQueueRef.current
      .then(async () => {
        const db = await openReactDb()
        await writeReactReaderPreferences(db, next)
      })
      .catch(() => undefined)
  }

  return {
    setFontSize: (fontSize) => updatePreferences((current) => ({ ...current, fontSize })),
    setMushafViewMode: (mushafViewMode) => updatePreferences((current) => ({ ...current, mushafViewMode })),
    setNightMode: (nightMode) => updatePreferences((current) => ({ ...current, nightMode })),
    setReadingFlow: (value) => updatePreferences((current) => ({
      ...current,
      lineSpacing: value,
      readerMargin: value,
      verseSpacing: value,
      wordSpacing: value,
    })),
    setTheme: (theme) => updatePreferences((current) => ({ ...current, theme })),
    setTranslationVisible: (translationVisible) => updatePreferences((current) => ({ ...current, translationVisible })),
    state,
  }
}
