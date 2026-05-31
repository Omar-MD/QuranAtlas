import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SearchQueryAstV1 } from '../../../shared/search'
import type { SearchPackAvailabilityState } from '../../offline/search/repair'
import { getSearchClient, type SearchClient } from '../../search/client'
import { parseSearchQuery, SearchQueryParseError } from '../../search/query-parser'
import type { SearchQueryMode, SearchResultCursor, SearchResultDto, SearchSort } from '../../search/schema'
import type { SearchGraphSection } from '../../search/graph'

export type SearchExploreGraphState = {
  error: string | null
  loading: boolean
  resultId: string | null
  sections: SearchGraphSection[]
}

export type SearchRoutePackState = SearchPackAvailabilityState | 'loading'

export type SearchRouteState = {
  error: string | null
  emptyResultMessage: string
  mode: SearchQueryMode
  packMessage: string
  packState: SearchRoutePackState
  packVersion?: string
  query: string
  resultCountMessage: string
  results: SearchResultDto[]
  searchStatus: string
  selectedResult: SearchResultDto | null
  hasMoreResults: boolean
  canLoadMoreResults: boolean
  exploreGraph: SearchExploreGraphState
  loadExploreGraph: (result: SearchResultDto) => void
  loadMoreResults: () => void
  setMode: (mode: SearchQueryMode) => void
  setQuery: (query: string) => void
  setSelectedResult: (result: SearchResultDto | null) => void
  submitSearch: (next?: { mode?: SearchQueryMode; query?: string }) => void
}

export function useSearchRouteState(options: {
  client?: SearchClient
  initialMode?: SearchQueryMode
  initialQuery?: string
  sort?: SearchSort
} = {}): SearchRouteState {
  const [query, setQuery] = useState(options.initialQuery ?? '')
  const [mode, setMode] = useState<SearchQueryMode>(options.initialMode ?? 'all')
  const [packState, setPackState] = useState<SearchRoutePackState>('loading')
  const [packVersion, setPackVersion] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResultDto[]>([])
  const [resultCountMessage, setResultCountMessage] = useState('')
  const [searchStatus, setSearchStatus] = useState('Loading search index')
  const [selectedResult, setSelectedResult] = useState<SearchResultDto | null>(null)
  const [resultCursor, setResultCursor] = useState<SearchResultCursor | null>(null)
  const [loadingMoreResults, setLoadingMoreResults] = useState(false)
  const [emptyResultMessage, setEmptyResultMessage] = useState(defaultEmptyResultMessage)
  const [exploreGraph, setExploreGraph] = useState<SearchExploreGraphState>({
    error: null,
    loading: false,
    resultId: null,
    sections: [],
  })
  const client = useMemo(() => options.client ?? getSearchClient(), [options.client])
  const requestSequence = useRef(0)
  const readyRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const activeQueryRef = useRef<{ ast: SearchQueryAstV1; mode: SearchQueryMode; query: string } | null>(null)
  const sort = options.sort ?? 'relevance'

  useEffect(() => {
    let active = true

    async function prepareSearchPack() {
      try {
        setPackState('loading')
        setSearchStatus('Loading search index')
        const initialized = await client.init()
        if (!active) return
        setPackVersion(initialized.packVersion)
        readyRef.current = true
        setError(null)
        setPackState('active')
        setSearchStatus('Search data is ready on this device.')
      } catch (caught) {
        if (!active) return
        readyRef.current = false
        setPackState('failed')
        setError(caught instanceof Error ? caught.message : 'Search data could not be prepared')
        setSearchStatus('Search data is not available on this device.')
      }
    }

    void prepareSearchPack()
    return () => {
      active = false
      readyRef.current = false
      void client.dispose().catch(() => undefined)
    }
  }, [client])

  const submitSearch = useCallback((next?: { mode?: SearchQueryMode; query?: string }) => {
    const effectiveQuery = next?.query ?? query
    const effectiveMode = next?.mode ?? mode
    const trimmed = effectiveQuery.trim()
    requestSequence.current += 1
    const sequence = requestSequence.current
    if (!trimmed) {
      setResults([])
      setSelectedResult(null)
      setResultCursor(null)
      setLoadingMoreResults(false)
      loadingMoreRef.current = false
      activeQueryRef.current = null
      setEmptyResultMessage(defaultEmptyResultMessage)
      setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
      setResultCountMessage('')
      setError(null)
      setSearchStatus(packState === 'active' ? 'Search data is ready on this device.' : packMessageForState(packState))
      return
    }
    if (!readyRef.current) {
      setError('Search data is not available on this device.')
      setSearchStatus('Search data is not available on this device.')
      return
    }
    let parsed
    try {
      parsed = parseSearchQuery(trimmed, { mode: effectiveMode })
    } catch (caught) {
      const message = caught instanceof SearchQueryParseError ? caught.message : 'Search query is unsupported'
      setError(message)
      setSearchStatus(message)
      setResultCursor(null)
      activeQueryRef.current = null
      return
    }
    setError(null)
    setSearchStatus('Searching')
    setResultCursor(null)
    setLoadingMoreResults(false)
    loadingMoreRef.current = false
    activeQueryRef.current = { ast: parsed.ast, mode: effectiveMode, query: trimmed }
    void client.query({ query: parsed.ast, sort }).then((window) => {
      if (sequence !== requestSequence.current) return
      setResults(window.results)
      setSelectedResult(window.results[0] ?? null)
      setResultCursor(window.cursor)
      setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
      const count = window.totalKnownResults ?? window.results.length
      const countMessage = formatResultCount(count, window.results.length, Boolean(window.cursor))
      setEmptyResultMessage(emptyResultMessageForMode(effectiveMode))
      setResultCountMessage(countMessage)
      setSearchStatus(countMessage)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      const message = caught instanceof Error ? caught.message : 'Search failed'
      setError(message)
      setSearchStatus(message)
      setResultCursor(null)
    })
  }, [client, mode, packState, query, sort])

  const loadMoreResults = useCallback(() => {
    const cursor = resultCursor
    const activeQuery = activeQueryRef.current
    if (!cursor || !activeQuery || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMoreResults(true)
    setSearchStatus('Loading more results')
    const sequence = requestSequence.current
    void client.query({ query: activeQuery.ast, cursor, sort }).then((window) => {
      if (sequence !== requestSequence.current) return
      const merged = mergeSearchResults(results, window.results)
      const count = window.totalKnownResults ?? merged.length
      const countMessage = formatResultCount(count, merged.length, Boolean(window.cursor))
      setResults(merged)
      setSelectedResult((current) => current ?? merged[0] ?? null)
      setResultCursor(window.cursor)
      setResultCountMessage(countMessage)
      setSearchStatus(countMessage)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      const message = caught instanceof Error ? caught.message : 'Search failed'
      setError(message)
      setSearchStatus(message)
    }).finally(() => {
      if (sequence !== requestSequence.current) return
      loadingMoreRef.current = false
      setLoadingMoreResults(false)
    })
  }, [client, resultCursor, results, sort])

  const loadExploreGraph = useCallback((result: SearchResultDto) => {
    if (!readyRef.current) {
      setExploreGraph({ error: 'Search data is not available on this device.', loading: false, resultId: result.resultId, sections: [] })
      return
    }
    let parsed
    try {
      parsed = parseSearchQuery(query.trim() || result.snippet || result.sourceText, { mode })
    } catch (caught) {
      const message = caught instanceof SearchQueryParseError ? caught.message : 'Explore query is unsupported'
      setExploreGraph({ error: message, loading: false, resultId: result.resultId, sections: [] })
      return
    }
    setExploreGraph((current) => current.resultId === result.resultId && current.sections.length > 0
      ? current
      : { error: null, loading: true, resultId: result.resultId, sections: [] })
    void client.explore({ query: parsed.ast, result, limit: 8 }).then((response) => {
      setExploreGraph({ error: null, loading: false, resultId: result.resultId, sections: response.sections })
    }).catch((caught) => {
      setExploreGraph({
        error: caught instanceof Error ? caught.message : 'Explore sections are unavailable',
        loading: false,
        resultId: result.resultId,
        sections: [],
      })
    })
  }, [client, mode, query])

  return {
    error,
    emptyResultMessage,
    mode,
    packMessage: packMessageForState(packState),
    packState,
    packVersion,
    query,
    resultCountMessage,
    results,
    searchStatus,
    selectedResult,
    hasMoreResults: Boolean(resultCursor),
    canLoadMoreResults: Boolean(resultCursor) && !loadingMoreResults,
    exploreGraph,
    loadExploreGraph,
    loadMoreResults,
    setMode,
    setQuery,
    setSelectedResult,
    submitSearch,
  }
}

const defaultEmptyResultMessage = 'Enter a word, phrase, or ayah reference. Save only the searches you want to keep.'

function formatResultCount(total: number, shown: number, hasMore: boolean): string {
  if (hasMore) return `Showing ${shown} of ${total} result${total === 1 ? '' : 's'}`
  return `${total} result${total === 1 ? '' : 's'}`
}

function mergeSearchResults(current: SearchResultDto[], next: SearchResultDto[]): SearchResultDto[] {
  const seen = new Set(current.map((result) => result.resultId))
  const merged = [...current]
  for (const result of next) {
    if (seen.has(result.resultId)) continue
    seen.add(result.resultId)
    merged.push(result)
  }
  return merged
}

function emptyResultMessageForMode(mode: SearchQueryMode): string {
  if (mode === 'exact-word-form') {
    return 'No exact word-form matches. Exact mode keeps Quranic marks and source spelling; try Arabic text mode for normalized matching.'
  }
  return 'No results match this search.'
}

function packMessageForState(state: SearchRoutePackState): string {
  if (state === 'active') return 'Search data is ready on this device.'
  if (state === 'loading' || state === 'installing' || state === 'staged' || state === 'verifying') return 'Loading search index'
  if (state === 'offline unavailable') return 'Search data is not available on this device.'
  if (state === 'failed') return 'Search data is not available on this device.'
  if (state === 'incompatible') return 'Search data is not available on this device.'
  if (state === 'update available') return 'Loading search index'
  return 'Search data is not available on this device.'
}
