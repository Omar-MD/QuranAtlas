import rawProfile from './default-profile.json'

export type ReaderAssetProfile = {
  id: string
  label: string
  riwayah: 'qaloon'
  quranTextStyleId: string
  quranFontId: string
  mushafEditionId: string
  translationId: 'bridges'
  tafsirId: null
}

export type ReaderAssetInventoryGroup = 'quran-text' | 'mushaf' | 'translation'

export type ReaderAssetInventoryRow = {
  id: string
  group: ReaderAssetInventoryGroup
  label: string
  assetIds: string[]
}

export const MVP_ASSET_CONTRACT_ID = rawProfile.assetContractId as 'mvp-default-assets-qaloon-bridges-v1'
export const RESET_CACHE_NAME_PREFIXES = rawProfile.resetCacheNamePrefixes

export const DEFAULT_READER_ASSET_PROFILE = rawProfile.profile as ReaderAssetProfile

export function readerAssetProfileRows(profile: ReaderAssetProfile): ReaderAssetInventoryRow[] {
  return [
    {
      id: 'qaloon-text-font',
      group: 'quran-text',
      label: 'Qaloon Text + Font',
      assetIds: [profile.quranTextStyleId, profile.quranFontId],
    },
    {
      id: 'qaloon-mushaf',
      group: 'mushaf',
      label: 'Qaloon Mushaf',
      assetIds: [profile.mushafEditionId],
    },
    {
      id: 'bridges-translation',
      group: 'translation',
      label: 'Bridges Translation',
      assetIds: [profile.translationId],
    },
  ]
}
