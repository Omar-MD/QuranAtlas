import type { SearchQueryMode, SearchResultWindow, SearchSort } from '../../shared/search'
import { getSearchClient, type SearchClient } from './client'
import { parseSearchQuery } from './query-parser'

export async function runSearchQuery({
  client = getSearchClient(),
  mode = 'all',
  packId = 'qa-search-core-hafs-v1',
  queryText,
  sort = 'relevance',
}: {
  client?: SearchClient
  mode?: SearchQueryMode
  packId?: string
  queryText: string
  sort?: SearchSort
}): Promise<SearchResultWindow> {
  const parsed = parseSearchQuery(queryText, { mode })
  await client.init(packId)
  return client.query({ query: parsed.ast, sort })
}

export { SearchClient, getSearchClient, resetSearchClient } from './client'
