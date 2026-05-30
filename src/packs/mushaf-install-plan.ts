import { buildCacheInstallPlan, type CacheInstallPlan } from '../offline/cache-plan'
import { reactMushafPackCacheName } from './mushaf-cache'
import { MUSHAF_PAGE_COUNT, mushafPageUrl } from './mushaf-paths'
import { validateMushafAssetIndexEntry, type MushafAssetIndexEntry } from './mushaf-index'

export type MushafInstallPlan = CacheInstallPlan & {
  riwayah: string
  mushafEditionId: string
}

export function buildMushafInstallPlan(entry: MushafAssetIndexEntry): MushafInstallPlan {
  const valid = validateMushafAssetIndexEntry(entry)
  const urls = valid.pageUrls ?? Array.from({ length: MUSHAF_PAGE_COUNT }, (_, index) => mushafPageUrl(valid, index + 1))
  const genericPlan = buildCacheInstallPlan({
    packId: valid.packId,
    kind: 'mushaf-pages',
    version: valid.version,
    totalBytes: valid.totalBytes,
    urls,
  })
  return {
    ...genericPlan,
    cacheName: reactMushafPackCacheName(valid),
    riwayah: valid.riwayah,
    mushafEditionId: valid.mushafEditionId,
  }
}
