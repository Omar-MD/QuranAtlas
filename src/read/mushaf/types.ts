import type { Riwayah } from '../../configure/state.svelte'
import type { SvgViewBox } from './sizing'

export type QuranRef = {
  surah: number
  verse: number
}

export type QuranWsSourceSlug = 'hafs' | 'warsh' | 'qalun'

export type MushafManifestPage = {
  page: number
  assetPath: string
  viewBox: string
  bytes: number
  hash?: string
  sourcePdfUrl: string
  firstVerse: QuranRef
}

export type MushafManifest = {
  version: 1
  riwayah: Riwayah
  sourceSlug: QuranWsSourceSlug
  pageCount: number
  attribution: {
    provider: 'quran.ws'
    sourceUrl: string
  }
  verseToPage: Record<string, number>
  pages: MushafManifestPage[]
}

export type MushafResolvedPage = {
  page: number
  pageCount: number
  riwayahLabel: string
  assetPath: string
  assetUrl: string
  viewBox: SvgViewBox
  viewBoxText: string
  bytes: number
  hash?: string
  firstVerse: QuranRef
  sourcePdfUrl: string
}

export type InlineMushafSvg = {
  markup: string
  viewBox: SvgViewBox
  viewBoxText: string
}

export type MushafPageLoadState =
  | 'manifest-loading'
  | 'svg-loading'
  | 'ready'
  | 'asset-error'
  | 'offline-missing'
  | 'install-prompt'

export type MushafPackAvailability = {
  riwayah: Riwayah
  available: boolean
  manifestUrl: string
}
