import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SearchQueryAstV1 } from '../../../shared/search'
import type { SearchPackAvailabilityState } from '../../offline/search/repair'
import { getSearchClient, type SearchClient } from '../../search/client'
import { parseSearchQuery, SearchQueryParseError } from '../../search/query-parser'
import type { SearchBriefDto, SearchQueryMode, SearchResultCursor, SearchResultDto, SearchSort } from '../../search/schema'
import type { SearchGraphSection } from '../../search/graph'
import { defaultTabForParsedSearch, type SearchExploreModuleId, type SearchWorkspaceTab } from './search-presentation-model'

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
  activeWorkspaceTab: SearchWorkspaceTab
  brief: SearchBriefDto | null
  defaultWorkspaceTab: SearchWorkspaceTab
  exploreSeedResult: SearchResultDto | null
  focusedExploreModule: SearchExploreModuleId | null
  resultCountMessage: string
  results: SearchResultDto[]
  searchStatus: string
  selectedResult: SearchResultDto | null
  hasMoreResults: boolean
  canLoadMoreResults: boolean
  exploreGraph: SearchExploreGraphState
  loadExploreGraph: (result: SearchResultDto) => void
  loadMoreResults: () => void
  openResultExplore: (result: SearchResultDto, module?: SearchExploreModuleId) => void
  setActiveWorkspaceTab: (tab: SearchWorkspaceTab) => void
  setExploreSeedResult: (result: SearchResultDto | null) => void
  setFocusedExploreModule: (module: SearchExploreModuleId | null) => void
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
  const [brief, setBrief] = useState<SearchBriefDto | null>(null)
  const [results, setResults] = useState<SearchResultDto[]>([])
  const [resultCountMessage, setResultCountMessage] = useState('')
  const [searchStatus, setSearchStatus] = useState('Loading search index')
  const [selectedResult, setSelectedResult] = useState<SearchResultDto | null>(null)
  const [resultCursor, setResultCursor] = useState<SearchResultCursor | null>(null)
  const [loadingMoreResults, setLoadingMoreResults] = useState(false)
  const [emptyResultMessage, setEmptyResultMessage] = useState(defaultEmptyResultMessage)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<SearchWorkspaceTab>('overview')
  const [defaultWorkspaceTab, setDefaultWorkspaceTab] = useState<SearchWorkspaceTab>('overview')
  const [exploreSeedResult, setExploreSeedResult] = useState<SearchResultDto | null>(null)
  const [focusedExploreModule, setFocusedExploreModule] = useState<SearchExploreModuleId | null>(null)
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
  const selectedResultRef = useRef<SearchResultDto | null>(null)
  const activeQueryRef = useRef<{ ast: SearchQueryAstV1; mode: SearchQueryMode; query: string } | null>(null)
  const sort = options.sort ?? 'relevance'

  const resetEvidenceState = useCallback((status?: string) => {
    setBrief(null)
    setResults([])
    selectedResultRef.current = null
    setSelectedResult(null)
    setResultCursor(null)
    setResultCountMessage('')
    setLoadingMoreResults(false)
    loadingMoreRef.current = false
    activeQueryRef.current = null
    setActiveWorkspaceTab('overview')
    setDefaultWorkspaceTab('overview')
    setExploreSeedResult(null)
    setFocusedExploreModule(null)
    setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
    if (status !== undefined) setSearchStatus(status)
  }, [])

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
      setEmptyResultMessage(defaultEmptyResultMessage)
      setError(null)
      resetEvidenceState(packState === 'active' ? 'Search data is ready on this device.' : packMessageForState(packState))
      return
    }
    if (!readyRef.current) {
      setError('Search data is not available on this device.')
      resetEvidenceState('Search data is not available on this device.')
      return
    }
    let parsed
    try {
      parsed = parseSearchQuery(trimmed, { mode: effectiveMode })
    } catch (caught) {
      const message = caught instanceof SearchQueryParseError ? caught.message : 'Search query is unsupported'
      setError(message)
      resetEvidenceState(message)
      return
    }
    const nextDefaultTab = defaultTabForParsedSearch(parsed, effectiveMode)
    setDefaultWorkspaceTab(nextDefaultTab)
    setActiveWorkspaceTab(nextDefaultTab)
    setExploreSeedResult(null)
    setFocusedExploreModule(null)
    setError(null)
    setSearchStatus('Searching')
    setBrief(null)
    setResults([])
    selectedResultRef.current = null
    setSelectedResult(null)
    setResultCursor(null)
    setResultCountMessage('')
    setLoadingMoreResults(false)
    loadingMoreRef.current = false
    setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
    activeQueryRef.current = { ast: parsed.ast, mode: effectiveMode, query: trimmed }
    void client.query({ query: parsed.ast, sort }).then((window) => {
      if (sequence !== requestSequence.current) return
      setBrief(window.brief)
      setResults(window.results)
      selectedResultRef.current = window.results[0] ?? null
      setSelectedResult(window.results[0] ?? null)
      setResultCursor(window.cursor)
      setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
      const countMessage = formatBriefResultCount(window.brief, Boolean(window.cursor))
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
  }, [client, mode, packState, query, resetEvidenceState, sort])

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
      const nextBrief = {
        ...window.brief,
        counts: {
          ...window.brief.counts,
          shownWindowCount: merged.length,
        },
      }
      const countMessage = formatBriefResultCount(nextBrief, Boolean(window.cursor))
      setBrief(nextBrief)
      setResults(merged)
      setSelectedResult((current) => {
        const next = current ?? merged[0] ?? null
        selectedResultRef.current = next
        return next
      })
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
    const sequence = requestSequence.current
    const activeQueryIdentity = activeQueryIdentityFor(activeQueryRef.current)
    const requestedResultId = result.resultId
    void client.explore({ query: parsed.ast, result, limit: 8 }).then((response) => {
      if (sequence !== requestSequence.current) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      if (selectedResultRef.current?.resultId !== requestedResultId) return
      setExploreGraph({ error: null, loading: false, resultId: result.resultId, sections: response.sections })
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      if (selectedResultRef.current?.resultId !== requestedResultId) return
      setExploreGraph({
        error: caught instanceof Error ? caught.message : 'Explore sections are unavailable',
        loading: false,
        resultId: result.resultId,
        sections: [],
      })
    })
  }, [client, mode, query])

  const setSearchQuery = useCallback((nextQuery: string) => {
    setQuery(nextQuery)
    if (nextQuery.trim()) return
    requestSequence.current += 1
    setError(null)
    setEmptyResultMessage(defaultEmptyResultMessage)
    resetEvidenceState(packState === 'active' ? 'Search data is ready on this device.' : packMessageForState(packState))
  }, [packState, resetEvidenceState])

  const setSearchSelectedResult = useCallback((result: SearchResultDto | null) => {
    selectedResultRef.current = result
    setSelectedResult(result)
  }, [])

  const openResultExplore = useCallback((result: SearchResultDto, module: SearchExploreModuleId = 'selected-token') => {
    selectedResultRef.current = result
    setSelectedResult(result)
    setExploreSeedResult(result)
    setFocusedExploreModule(module)
    setActiveWorkspaceTab('explore')
  }, [])

  return {
    error,
    emptyResultMessage,
    mode,
    packMessage: packMessageForState(packState),
    packState,
    packVersion,
    query,
    activeWorkspaceTab,
    brief,
    defaultWorkspaceTab,
    exploreSeedResult,
    focusedExploreModule,
    resultCountMessage,
    results,
    searchStatus,
    selectedResult,
    hasMoreResults: Boolean(resultCursor),
    canLoadMoreResults: Boolean(resultCursor) && !loadingMoreResults,
    exploreGraph,
    loadExploreGraph,
    loadMoreResults,
    openResultExplore,
    setActiveWorkspaceTab,
    setExploreSeedResult,
    setFocusedExploreModule,
    setMode,
    setQuery: setSearchQuery,
    setSelectedResult: setSearchSelectedResult,
    submitSearch,
  }
}

const defaultEmptyResultMessage = 'Enter a word, phrase, or ayah reference. Save only the searches you want to keep.'

function formatBriefResultCount(brief: SearchBriefDto, hasMore: boolean): string {
  const sourceAyahCount = brief.counts.matchedSourceAyahCount
  const resultRows = brief.counts.matchedResultCount
  const shown = brief.counts.shownWindowCount
  if (sourceAyahCount !== null) {
    if (hasMore || shown < resultRows) return `${sourceAyahCount} matched source ayat, ${shown} shown result rows`
    return `${sourceAyahCount} matched source ayat, ${resultRows} matched result rows`
  }
  if (hasMore || shown < resultRows) return `Showing ${shown} of ${resultRows} matched result rows`
  return `${resultRows} matched result row${resultRows === 1 ? '' : 's'}`
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

function activeQueryIdentityFor(activeQuery: { mode: SearchQueryMode; query: string } | null): string | null {
  return activeQuery ? `${activeQuery.mode}:${activeQuery.query}` : null
}
