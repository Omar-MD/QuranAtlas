import type { WirdPlan } from '../read/wird/types'
import type { Riwayah, RiwayahPackageStatus } from '../packs/riwayah'
import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'

export type { Riwayah } from '../packs/riwayah'

export type TranslationId = string | null
export type Theme = 'light' | 'sepia' | 'dark' | 'auto'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type ReadingStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type MushafViewMode = 'auto' | 'fit-page' | 'fit-width'
export type NightMode = 'off' | 'on' | 'auto'
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
  }
  pages: Record<string, boolean>
  search: boolean
}

export const DEFAULT_OFFLINE_CATEGORIES: OfflineCategoriesState = {
  text: { riwayat: {}, translations: {} },
  pages: {},
  search: false,
}

export const settings = $state({
  theme: 'auto' as Theme,
  riwayah: DEFAULT_READER_ASSET_PROFILE.riwayah as Riwayah,
  fontSize: 'md' as FontSize,
  translationId: DEFAULT_READER_ASSET_PROFILE.translationId as TranslationId,
  translationVisible: true,
  lineSpacing: 'md' as ReadingStep,
  wordSpacing: 'md' as ReadingStep,
  readerMargin: 'md' as ReadingStep,
  verseSpacing: 'md' as ReadingStep,
  mushafViewMode: 'auto' as MushafViewMode,
  quranTextStyleId: DEFAULT_READER_ASSET_PROFILE.quranTextStyleId,
  mushafEditionId: DEFAULT_READER_ASSET_PROFILE.mushafEditionId,
  nightMode: 'off' as NightMode,
  surahHeaderHidden: false,
  currentPosition: null as GlobalPosition,
  wirdPlan: null as WirdPlan | null,
  offlineCategories: { ...DEFAULT_OFFLINE_CATEGORIES } as OfflineCategoriesState,
})

export const riwayahPackageState = $state<RiwayahInstallState>({
  qaloon: null,
})

export const riwayahInstallIntent = $state<RiwayahInstallIntent>({
  requested: null,
  previousUsable: 'qaloon',
})
