export type TranslationId = string | null
export type Theme = 'light' | 'sepia' | 'dark' | 'auto'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type ReadingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type Riwayah = 'hafs' | 'warsh' | 'qaloon'

export type GlobalPosition = { surah: number; verse: number } | null

// Audio settings (v2.0 milestone).
export type AudioSpeed = 0.75 | 1 | 1.25 | 1.5 | 2
export type AudioRepeatMode = 'off' | 'verse' | 'range' | 'surah'
export type AudioAutoScrollMode = 'smart' | 'always' | 'off'
export type AudioRepeat = { mode: AudioRepeatMode; count?: number }
export type AudioLoopRange = { from: string; to: string } | null

// Offline-selector state (N21). Sole writer: src/configure/offline-categories.ts.
export type OfflineCategoriesState = {
  text: {
    riwayat: Record<string, boolean>
    translations: Record<string, boolean>
    tafsir: Record<string, boolean>
  }
  audio: Record<string, boolean>   // reciter id → checked
  pages: Record<string, boolean>   // riwayah id → checked
  search: boolean
}

export const DEFAULT_OFFLINE_CATEGORIES: OfflineCategoriesState = {
  text: { riwayat: {}, translations: {}, tafsir: {} },
  audio: {},
  pages: {},
  search: false,
}

export const settings = $state({
  theme: 'auto' as Theme,
  riwayah: 'qaloon' as Riwayah,
  fontSize: 'md' as FontSize,
  translationId: 'saheeh' as TranslationId,
  translationVisible: true,
  lineSpacing: 'md' as ReadingStep,
  wordSpacing: 'md' as ReadingStep,
  readerMargin: 'md' as ReadingStep,
  verseSpacing: 'md' as ReadingStep,
  nightMode: false,
  surahHeaderHidden: false,
  currentPosition: null as GlobalPosition,
  audioReciter: null as string | null,
  audioSpeed: 1 as AudioSpeed,
  audioRepeat: { mode: 'off' as AudioRepeatMode } as AudioRepeat,
  audioLoopRange: null as AudioLoopRange,
  audioPrefetchNext: true,
  audioAutoScrollMode: 'smart' as AudioAutoScrollMode,
  audioFirstPlayHintShown: false,
  offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } as OfflineCategoriesState,
})
