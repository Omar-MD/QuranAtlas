export const SEARCH_PACK_CACHE_PREFIX = 'quran-atlas-search-pack'

export function searchPackCacheName(contentHash: string): string {
  if (!/^[a-f0-9]{12,64}$/.test(contentHash)) {
    throw new Error(`invalid Search pack content hash ${contentHash}`)
  }
  return `${SEARCH_PACK_CACHE_PREFIX}-${contentHash}`
}
