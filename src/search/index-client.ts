import type { SearchShard } from './schema'

export async function loadSearchShard(packId = 'baseline', fetcher: typeof fetch = fetch): Promise<SearchShard | null> {
  const response = await fetcher(`/dataset/search/${packId}/index.json`)
  if (!response.ok) return null
  return response.json() as Promise<SearchShard>
}
