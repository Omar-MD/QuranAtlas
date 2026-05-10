import type { Riwayah } from '../../configure/state.svelte'

export type QuranRef = {
  surah: number
  verse: number
}

export type QuranWsSourceSlug = 'hafs' | 'warsh' | 'qalun'

export type MushafManifestPage = {
  page: number
  assetPath: string
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
  assetPath: string
  assetUrl: string
  bytes: number
  hash?: string
  firstVerse: QuranRef
  sourcePdfUrl: string
}

export type MushafPackAvailability = {
  riwayah: Riwayah
  available: boolean
  manifestUrl: string
}
