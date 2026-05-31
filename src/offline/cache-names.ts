import type { AssetIndexEntry } from './asset-index'

export const REACT_CACHE_PREFIX = 'quran-atlas-react'
export const SEARCH_PACK_CACHE_PREFIX = 'quran-atlas-search-pack'

export function reactAssetPackCacheName(entry: Pick<AssetIndexEntry, 'packId' | 'version'>): string {
  return `${REACT_CACHE_PREFIX}-asset-pack-${entry.packId.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}--${entry.version}`
}

export function searchPackCacheName(contentHash: string): string {
  if (!/^[a-f0-9]{12,64}$/.test(contentHash)) {
    throw new Error(`invalid Search pack content hash ${contentHash}`)
  }
  return `${SEARCH_PACK_CACHE_PREFIX}-${contentHash}`
}
