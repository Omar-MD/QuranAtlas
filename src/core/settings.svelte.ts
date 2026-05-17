import type { WirdPlan } from '../read/wird/types'
import type { Riwayah, RiwayahPackageStatus } from '../packs/riwayah'

export type { Riwayah } from '../packs/riwayah'

export type TranslationId = string | null
export type TafsirId = string
export type Theme = 'light' | 'sepia' | 'dark' | 'auto'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type ReadingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type MushafViewMode = 'auto' | 'fit-page' | 'fit-width'
export type RiwayahInstallState = Record<Riwayah, RiwayahPackageStatus | null>
export type RiwayahInstallIntent = {
  requested: Riwayah | null
  previousUsable: Riwayah
}

export type GlobalPosition = { surah: number; verse: number } | null

// Offline-selector state (N21). Sole writer: src/configure/offline-categories.ts.
export type OfflineCategoriesState = {
  text: {
    riwayat: Record<string, boolean>
    translations: Record<string, boolean>
    tafsir: Record<string, boolean>
  }
  pages: Record<string, boolean>
  search: boolean
}

export const DEFAULT_OFFLINE_CATEGORIES: OfflineCategoriesState = {
  text: { riwayat: {}, translations: {}, tafsir: {} },
  pages: {},
  search: false,
}

export const settings = $state({
  theme: 'auto' as Theme,
  riwayah: 'qaloon' as Riwayah,
  fontSize: 'md' as FontSize,
  translationId: 'bridges' as TranslationId,
  tafsirId: 'muyassar' as TafsirId,
  translationVisible: true,
  lineSpacing: 'md' as ReadingStep,
  wordSpacing: 'md' as ReadingStep,
  readerMargin: 'md' as ReadingStep,
  verseSpacing: 'md' as ReadingStep,
  mushafViewMode: 'auto' as MushafViewMode,
  nightMode: false,
  surahHeaderHidden: false,
  currentPosition: null as GlobalPosition,
  wirdPlan: null as WirdPlan | null,
  offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } as OfflineCategoriesState,
})

export const riwayahPackageState = $state<RiwayahInstallState>({
  hafs: null,
  warsh: null,
  qaloon: null,
})

export const riwayahInstallIntent = $state<RiwayahInstallIntent>({
  requested: null,
  previousUsable: 'qaloon',
})
