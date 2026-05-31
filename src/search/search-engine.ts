import type { SearchQueryAstV1, SearchResultWindow, SearchSort } from '../../shared/search'
import { SearchPackReader } from './pack-reader'
import { SearchQueryExecutor } from '../search-worker/query-executor'
import { SearchCancellationToken } from '../search-worker/cancellation'

export async function executeSearchQueryAgainstReader({
  reader,
  query,
  limit = 25,
  sort = 'relevance',
}: {
  reader: SearchPackReader
  query: SearchQueryAstV1
  limit?: number
  sort?: SearchSort
}): Promise<SearchResultWindow> {
  const executor = new SearchQueryExecutor(reader)
  return executor.execute({
    query,
    limit,
    sort,
    token: new SearchCancellationToken('pure-search-executor'),
  })
}
