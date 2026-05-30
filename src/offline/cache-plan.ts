import { validateAssetIndexEntry, type AssetIndexEntry } from './asset-index'
import { reactAssetPackCacheName } from './cache-names'

export type CacheInstallPlan = {
  packId: string
  cacheName: string
  version: string
  totalBytes: number
  urls: string[]
}

export function buildCacheInstallPlan(entry: AssetIndexEntry): CacheInstallPlan {
  const valid = validateAssetIndexEntry(entry)
  return {
    packId: valid.packId,
    cacheName: reactAssetPackCacheName(valid),
    version: valid.version,
    totalBytes: valid.totalBytes,
    urls: [...valid.urls],
  }
}
