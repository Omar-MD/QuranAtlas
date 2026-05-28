import {
  DEFAULT_READER_ASSET_PROFILE,
  readerAssetProfileRows,
  type ReaderAssetInventoryGroup,
} from '../../../shared/reader-assets/default-profile'

export type AssetRowGroup = ReaderAssetInventoryGroup

export type AssetRowView = {
  id: string
  group: AssetRowGroup
  label: string
  status: 'default-installed'
  active: true
  primaryAction: null
  secondaryAction: null
  meta: string
  sizeText: string
}

export function defaultAssetInventoryRows(): AssetRowView[] {
  return readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE).map((row) => ({
    id: row.id,
    group: row.group,
    label: row.label,
    status: 'default-installed',
    active: true,
    primaryAction: null,
    secondaryAction: null,
    meta:
      row.group === 'quran-text' ? 'Qaloon Quran text and required font'
        : row.group === 'mushaf' ? 'Qaloon Quran.ws page manifest and pages'
          : 'Bridges English translation',
    sizeText: 'Included',
  }))
}
