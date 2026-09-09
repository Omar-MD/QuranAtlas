export const SEARCH_PACK_REGISTRY_RUNTIME_URL = '/search-packs/registry.json'
export const SEARCH_PACKS_RUNTIME_PREFIX = '/search-packs/packs/'
export const SEARCH_PACKS_FILESYSTEM_PREFIX = 'public/search-packs/packs/'

export function assertNoStableMutableSearchUrls(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  if (text.includes('/dataset/search/')) {
    throw new Error('Search packs must not use stable mutable /dataset/search/** URLs')
  }
}

export function buildSearchRegistry({ generatedAt, manifest }) {
  const registry = {
    registryVersion: 1,
    registryUrl: SEARCH_PACK_REGISTRY_RUNTIME_URL,
    generatedAt,
    packs: [
      {
        packId: manifest.packId,
        packVersion: manifest.packVersion,
        contentHash: manifest.contentHash,
        manifestUrl: `${SEARCH_PACKS_RUNTIME_PREFIX}${manifest.contentHash}/manifest.json`,
        sourceRiwayah: manifest.sourceRiwayah,
        features: manifest.features,
        minAppVersion: manifest.minAppVersion,
        minWorkerVersion: manifest.minWorkerVersion,
        totalBytes: manifest.totalBytes,
      },
    ],
  }
  assertNoStableMutableSearchUrls(registry)
  return registry
}
