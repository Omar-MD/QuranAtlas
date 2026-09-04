import { useEffect, useRef, useState } from 'react'

import { openReactDb } from '../../storage/db'
import { readWirdPlan, writeWirdPlan } from '../../continuity/wird/store'
import {
  DEFAULT_REACT_READER_PREFERENCES,
  readReactReaderPreferences,
  writeReactReaderPreferences,
  type NormalizedReactMushafViewMode,
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

const COMPACT_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 600px)'
const LANDSCAPE_FIT_WIDTH_DISABLED_KEY = 'quranatlas:mushaf-landscape-fit-width-disabled'

export type SettingsFormState =
  | { status: 'loading'; preferences: ReactReaderPreferences }
  | { status: 'ready'; preferences: ReactReaderPreferences }
  | { status: 'error'; preferences: ReactReaderPreferences }

export type MushafFramingWriteStatus = 'idle' | 'saving' | 'error'

export function useSettingsForm(): {
  mushafFramingWriteStatus: MushafFramingWriteStatus
  retryMushafPageFraming: () => void
  setMushafViewMode: (value: NormalizedReactMushafViewMode) => void
  setMushafFitWidth: (value: boolean) => void
  setMushafPageFraming: (value: number) => void
  setNightMode: (value: ReactNightModePreference) => void
  setReadingFlow: (value: ReactPreferenceStep) => void
  setFontSize: (value: ReactPreferenceStep) => void
  setTheme: (value: ReactThemePreference) => void
  setTranslationVisible: (value: boolean) => void
  setWirdReaderStatusVisible: (value: boolean) => void
  state: SettingsFormState
} {
  const [state, setState] = useState<SettingsFormState>({
    preferences: DEFAULT_REACT_READER_PREFERENCES,
    status: 'loading',
  })
  const hasUserChangesRef = useRef(false)
  const latestMushafFramingWriteRef = useRef(0)
  const persistedMushafPageFramingRef = useRef(DEFAULT_REACT_READER_PREFERENCES.mushafPageFraming)
  const preferencesRef = useRef<ReactReaderPreferences>(DEFAULT_REACT_READER_PREFERENCES)
  const retryMushafPageFramingRef = useRef<number | null>(null)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [mushafFramingWriteStatus, setMushafFramingWriteStatus] = useState<MushafFramingWriteStatus>('idle')

  useEffect(() => {
    let active = true
    void openReactDb()
      .then(readReactReaderPreferences)
      .then((preferences) => {
        if (!active || hasUserChangesRef.current) return
        preferencesRef.current = preferences
        persistedMushafPageFramingRef.current = preferences.mushafPageFraming
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

  function updatePreferences(
    updater: (current: ReactReaderPreferences) => ReactReaderPreferences,
    afterWrite?: (preferences: ReactReaderPreferences) => Promise<void>,
  ): void {
    hasUserChangesRef.current = true
    const next = updater(preferencesRef.current)
    updateVisiblePreferences(next)
    writeQueueRef.current = writeQueueRef.current
      .then(async () => {
        const db = await openReactDb()
        await writeReactReaderPreferences(db, {
          ...next,
          mushafPageFraming: persistedMushafPageFramingRef.current,
        })
        await afterWrite?.(next)
      })
      .catch(() => undefined)
  }

  function updateVisiblePreferences(next: ReactReaderPreferences): void {
    preferencesRef.current = next
    setState({ preferences: next, status: 'ready' })
    applyReactReaderAppearance(next)
    applyReactReaderTypography(next)
    emitReactReaderPreferencesChanged(next)
  }

  function persistMushafPageFraming(value: number): void {
    hasUserChangesRef.current = true
    const mushafPageFraming = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
    const next = { ...preferencesRef.current, mushafPageFraming }
    const writeId = latestMushafFramingWriteRef.current + 1
    latestMushafFramingWriteRef.current = writeId
    retryMushafPageFramingRef.current = mushafPageFraming
    setMushafFramingWriteStatus('saving')
    updateVisiblePreferences(next)

    const write = writeQueueRef.current.then(async () => {
      const db = await openReactDb()
      await writeReactReaderPreferences(db, next)
    })
    writeQueueRef.current = write.catch(() => undefined)
    void write
      .then(() => {
        persistedMushafPageFramingRef.current = mushafPageFraming
        if (latestMushafFramingWriteRef.current !== writeId) return
        retryMushafPageFramingRef.current = null
        setMushafFramingWriteStatus('idle')
      })
      .catch(() => {
        if (latestMushafFramingWriteRef.current !== writeId) return
        updateVisiblePreferences({
          ...preferencesRef.current,
          mushafPageFraming: persistedMushafPageFramingRef.current,
        })
        setMushafFramingWriteStatus('error')
      })
  }

  return {
    mushafFramingWriteStatus,
    retryMushafPageFraming: () => {
      if (retryMushafPageFramingRef.current !== null) {
        persistMushafPageFraming(retryMushafPageFramingRef.current)
      }
    },
    setFontSize: (fontSize) => updatePreferences((current) => ({ ...current, fontSize })),
    setMushafViewMode: (mushafViewMode) => updatePreferences((current) => ({ ...current, mushafViewMode })),
    setMushafFitWidth: (mushafFitWidth) => {
      updateLandscapeFitWidthOverride(mushafFitWidth)
      updatePreferences((current) => ({ ...current, mushafFitWidth }))
    },
    setMushafPageFraming: persistMushafPageFraming,
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
    setWirdReaderStatusVisible: (wirdReaderStatusVisible) => updatePreferences(
      (current) => ({ ...current, wirdReaderStatusVisible }),
      async () => {
        if (wirdReaderStatusVisible) return
        const db = await openReactDb()
        const plan = await readWirdPlan(db)
        if (!plan?.reminder.enabled) return
        await writeWirdPlan(db, {
          ...plan,
          reminder: { ...plan.reminder, enabled: false },
        })
      },
    ),
    state,
  }
}

function updateLandscapeFitWidthOverride(mushafFitWidth: boolean): void {
  try {
    if (mushafFitWidth) {
      window.sessionStorage.removeItem(LANDSCAPE_FIT_WIDTH_DISABLED_KEY)
    } else if (window.matchMedia?.(COMPACT_LANDSCAPE_QUERY).matches) {
      window.sessionStorage.setItem(LANDSCAPE_FIT_WIDTH_DISABLED_KEY, 'true')
    }
  } catch {
    /* no-op */
  }
}
