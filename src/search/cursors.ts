import { SEARCH_QUERY_AST_VERSION, type SearchResultCursor, type SearchSort } from '../../shared/search'
import { SEARCH_RANK_VERSION } from './ranking'

export function createSearchResultCursor({
  packId,
  packVersion,
  queryHash,
  sort,
  lastStableResultKey,
}: {
  packId: string
  packVersion: string
  queryHash: string
  sort: SearchSort
  lastStableResultKey: string
}): SearchResultCursor {
  return {
    packId,
    packVersion,
    queryHash,
    queryAstVersion: SEARCH_QUERY_AST_VERSION,
    rankVersion: SEARCH_RANK_VERSION,
    sort,
    lastStableResultKey,
  }
}

export function encodeSearchResultCursor(cursor: SearchResultCursor): string {
  return encodeURIComponent(JSON.stringify(cursor))
}

export function decodeSearchResultCursor(encoded: string): SearchResultCursor {
  return JSON.parse(decodeURIComponent(encoded)) as SearchResultCursor
}

export function assertSearchCursorValid(
  cursor: SearchResultCursor | undefined,
  expected: Pick<SearchResultCursor, 'packId' | 'packVersion' | 'queryHash' | 'sort'>,
): void {
  if (!cursor) return
  if (
    cursor.packId !== expected.packId
    || cursor.packVersion !== expected.packVersion
    || cursor.queryHash !== expected.queryHash
    || cursor.queryAstVersion !== SEARCH_QUERY_AST_VERSION
    || cursor.rankVersion !== SEARCH_RANK_VERSION
    || cursor.sort !== expected.sort
  ) {
    throw new Error('Search result cursor is no longer valid for this pack, query, rank, or sort')
  }
}
