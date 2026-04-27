export type TranslationId = string | null
export type Theme = 'light' | 'sepia' | 'dark' | 'auto'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type ReadingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type Riwayah = 'hafs' | 'warsh' | 'qaloon'

export type GlobalPosition = { surah: number; verse: number } | null

export const settings = $state({
  theme: 'auto' as Theme,
  riwayah: 'qaloon' as Riwayah,
  fontSize: 'md' as FontSize,
  translationId: null as TranslationId,
  translationVisible: true,
  lineSpacing: 'md' as ReadingStep,
  wordSpacing: 'md' as ReadingStep,
  readerMargin: 'md' as ReadingStep,
  verseSpacing: 'md' as ReadingStep,
  nightMode: false,
  surahHeaderHidden: false,
  currentPosition: null as GlobalPosition,
})
