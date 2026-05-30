import type { QuranAtlasReactDb } from './db'
import type { Riwayah, SettingRecord } from './types'

export type ReaderAssetBundleSettings = {
  riwayah: Riwayah
  quranTextStyleId: string
  mushafEditionId: string
}

export type OnboardingCompletionSettings = {
  riwayah: Riwayah
  translationId: string
}

export type ReactPreferenceStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ReactThemePreference = 'light' | 'sepia' | 'dark' | 'auto'
export type ReactNightModePreference = 'off' | 'on' | 'auto'
export type ReactMushafViewMode = 'auto' | 'fit-page' | 'fit-width'

export type ReactReaderPreferences = {
  fontSize: ReactPreferenceStep
  lineSpacing: ReactPreferenceStep
  mushafViewMode: ReactMushafViewMode
  nightMode: ReactNightModePreference
  readerMargin: ReactPreferenceStep
  theme: ReactThemePreference
  translationVisible: boolean
  verseSpacing: ReactPreferenceStep
  wordSpacing: ReactPreferenceStep
  wirdReaderStatusVisible: boolean
}

export const DEFAULT_REACT_READER_PREFERENCES: ReactReaderPreferences = {
  fontSize: 'md',
  lineSpacing: 'md',
  mushafViewMode: 'auto',
  nightMode: 'off',
  readerMargin: 'md',
  theme: 'light',
  translationVisible: true,
  verseSpacing: 'md',
  wordSpacing: 'md',
  wirdReaderStatusVisible: true,
}

const READER_PREFERENCE_KEYS = [
  'translationVisible',
  'wirdReaderStatusVisible',
  'fontSize',
  'lineSpacing',
  'wordSpacing',
  'readerMargin',
  'verseSpacing',
  'theme',
  'nightMode',
  'mushafViewMode',
] as const

function asStep(value: unknown): ReactPreferenceStep | null {
  return value === 'xs' || value === 'sm' || value === 'md' || value === 'lg' || value === 'xl' ? value : null
}

function asTheme(value: unknown): ReactThemePreference | null {
  return value === 'light' || value === 'sepia' || value === 'dark' || value === 'auto' ? value : null
}

function asNightMode(value: unknown): ReactNightModePreference | null {
  return value === 'off' || value === 'on' || value === 'auto' ? value : null
}

function asMushafViewMode(value: unknown): ReactMushafViewMode | null {
  return value === 'auto' || value === 'fit-page' || value === 'fit-width' ? value : null
}

export async function writeReaderAssetBundleSettings(db: QuranAtlasReactDb, settings: ReaderAssetBundleSettings): Promise<void> {
  const records: SettingRecord[] = [
    { key: 'riwayah', value: settings.riwayah },
    { key: 'quranTextStyleId', value: settings.quranTextStyleId },
    { key: 'mushafEditionId', value: settings.mushafEditionId },
  ]
  await db.transaction('rw', db.settings, async () => {
    await db.settings.bulkPut(records)
  })
}

export async function readReactReaderPreferences(db: QuranAtlasReactDb): Promise<ReactReaderPreferences> {
  const records = await db.settings.bulkGet([...READER_PREFERENCE_KEYS])
  const values = Object.fromEntries(records.map((record, index) => [READER_PREFERENCE_KEYS[index], record?.value]))
  return {
    fontSize: asStep(values.fontSize) ?? DEFAULT_REACT_READER_PREFERENCES.fontSize,
    lineSpacing: asStep(values.lineSpacing) ?? DEFAULT_REACT_READER_PREFERENCES.lineSpacing,
    mushafViewMode: asMushafViewMode(values.mushafViewMode) ?? DEFAULT_REACT_READER_PREFERENCES.mushafViewMode,
    nightMode: asNightMode(values.nightMode) ?? DEFAULT_REACT_READER_PREFERENCES.nightMode,
    readerMargin: asStep(values.readerMargin) ?? DEFAULT_REACT_READER_PREFERENCES.readerMargin,
    theme: asTheme(values.theme) ?? DEFAULT_REACT_READER_PREFERENCES.theme,
    translationVisible: typeof values.translationVisible === 'boolean'
      ? values.translationVisible
      : DEFAULT_REACT_READER_PREFERENCES.translationVisible,
    verseSpacing: asStep(values.verseSpacing) ?? DEFAULT_REACT_READER_PREFERENCES.verseSpacing,
    wordSpacing: asStep(values.wordSpacing) ?? DEFAULT_REACT_READER_PREFERENCES.wordSpacing,
    wirdReaderStatusVisible: typeof values.wirdReaderStatusVisible === 'boolean'
      ? values.wirdReaderStatusVisible
      : DEFAULT_REACT_READER_PREFERENCES.wirdReaderStatusVisible,
  }
}

export async function writeReactReaderPreferences(db: QuranAtlasReactDb, preferences: ReactReaderPreferences): Promise<void> {
  const records: SettingRecord[] = [
    { key: 'translationVisible', value: preferences.translationVisible },
    { key: 'wirdReaderStatusVisible', value: preferences.wirdReaderStatusVisible },
    { key: 'fontSize', value: preferences.fontSize },
    { key: 'lineSpacing', value: preferences.lineSpacing },
    { key: 'wordSpacing', value: preferences.wordSpacing },
    { key: 'readerMargin', value: preferences.readerMargin },
    { key: 'verseSpacing', value: preferences.verseSpacing },
    { key: 'theme', value: preferences.theme },
    { key: 'nightMode', value: preferences.nightMode },
    { key: 'mushafViewMode', value: preferences.mushafViewMode },
  ]
  await db.transaction('rw', db.settings, async () => {
    await db.settings.bulkPut(records)
  })
}

export async function writeOnboardingCompletion(db: QuranAtlasReactDb, settings: OnboardingCompletionSettings): Promise<void> {
  const records: SettingRecord[] = [
    { key: 'onboardingComplete', value: true },
    { key: 'riwayah', value: settings.riwayah },
    { key: 'translationId', value: settings.translationId },
  ]
  await db.transaction('rw', db.settings, async () => {
    await db.settings.bulkPut(records)
  })
}
