import type { AssetIndexEntry } from './asset-index'

export const REACT_CACHE_PREFIX = 'quran-atlas-react'

export function reactAssetPackCacheName(entry: Pick<AssetIndexEntry, 'packId' | 'version'>): string {
  return `${REACT_CACHE_PREFIX}-asset-pack-${entry.packId.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}--${entry.version}`
}
