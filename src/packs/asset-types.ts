import type { Riwayah } from './riwayah'

export const DEFAULT_TEXT_STYLE_ID = 'uthmani-kfgqpc-v1' as const
export const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1' as const

export type AssetVisibility = 'baseline' | 'optional'
export type AssetStatusKind =
  | 'shipped'
  | 'installable'
  | 'cached'
  | 'installed'
  | 'incomplete'
  | 'incompatible'
  | 'unavailable'
  | 'installing'

export type TextAsset = {
  riwayah: Riwayah
  textStyleId: string
  label: string
  scriptFamily: string
  providerId: string
  licenseId: string
  visibility: AssetVisibility
  shipped: boolean
  files: Array<{ url: string; bytes: number }>
  totalBytes: number
  ayahCount: number
  outputPathTemplate: string
  provenance: Record<string, unknown>
}

export type TextAssetIndex = {
  version: 1
  defaults: Partial<Record<Riwayah, string>>
  assets: TextAsset[]
}

export type MushafAsset = {
  riwayah: Riwayah
  mushafEditionId: string
  label: string
  tradition: string
  providerId: string
  licenseId: string
  visibility: AssetVisibility
  shipped: boolean
  manifestUrl: string
  files: Array<{ url: string; bytes: number }>
  totalBytes: number
  pageCount: number
  provenance: Record<string, unknown>
}

export type MushafAssetIndex = {
  version: 1
  defaults: Partial<Record<Riwayah, string>>
  assets: MushafAsset[]
}
