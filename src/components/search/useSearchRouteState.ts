import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AnswerPreview, MatchCardLite, SearchLensLite, SearchQueryAstV1 } from '../../../shared/search'
import { REACT_ROUTES } from '../../app/router/routes'
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
  canSaveSearch: boolean
  activeWorkspaceTab: SearchWorkspaceTab
  answerPreview: AnswerPreview | null
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  brief: SearchBriefDto | null
  canLoadAllMatches: boolean
  defaultWorkspaceTab: SearchWorkspaceTab
  exploreSeedResult: SearchResultDto | null
  focusedExploreModule: SearchExploreModuleId | null
  loadingAllMatches: boolean
  resultCountMessage: string
  results: SearchResultDto[]
  searchStatus: string
  selectedResult: SearchResultDto | null
  hasMoreResults: boolean
  canLoadMoreResults: boolean
  exploreGraph: SearchExploreGraphState
  loadExploreGraph: (result: SearchResultDto) => void
  loadMoreAllMatches: () => void
  loadMoreResults: () => void
  openAllMatches: () => void
  openResultExplore: (result: SearchResultDto, module?: SearchExploreModuleId) => void
  setActiveWorkspaceTab: (tab: SearchWorkspaceTab) => void
  setExploreSeedResult: (result: SearchResultDto | null) => void
  setFocusedExploreModule: (module: SearchExploreModuleId | null) => void
  setMode: (mode: SearchQueryMode) => void
  setQuery: (query: string) => void
  setSelectedResult: (result: SearchResultDto | null) => void
  submitSearch: (next?: { mode?: SearchQueryMode; query?: string; selectedResultId?: string | null; tab?: SearchWorkspaceTab | null }) => void
}

type SearchHashState = {
  mode?: SearchQueryMode
  query?: string
  selectedResultId?: string
  tab?: SearchWorkspaceTab
}

export function useSearchRouteState(options: {
  client?: SearchClient
  initialMode?: SearchQueryMode
  initialQuery?: string
  sort?: SearchSort
} = {}): SearchRouteState {
  const initialHashState = useMemo(() => readSearchHashState(), [])
  const [query, setQuery] = useState(options.initialQuery ?? initialHashState.query ?? '')
  const [mode, setMode] = useState<SearchQueryMode>(options.initialMode ?? initialHashState.mode ?? 'all')
  const [packState, setPackState] = useState<SearchRoutePackState>('loading')
  const [packVersion, setPackVersion] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [brief, setBrief] = useState<SearchBriefDto | null>(null)
  const [results, setResults] = useState<SearchResultDto[]>([])
  const [answerPreview, setAnswerPreview] = useState<AnswerPreview | null>(null)
  const [allMatches, setAllMatches] = useState<MatchCardLite[]>([])
  const [allMatchesOpen, setAllMatchesOpen] = useState(false)
  const [allMatchesCursor, setAllMatchesCursor] = useState<SearchResultCursor | null>(null)
  const [loadingAllMatches, setLoadingAllMatches] = useState(false)
  const [resultCountMessage, setResultCountMessage] = useState('')
  const [searchStatus, setSearchStatus] = useState('Loading search index')
  const [selectedResult, setSelectedResult] = useState<SearchResultDto | null>(null)
  const [resultCursor, setResultCursor] = useState<SearchResultCursor | null>(null)
  const [loadingMoreResults, setLoadingMoreResults] = useState(false)
  const [emptyResultMessage, setEmptyResultMessage] = useState(defaultEmptyResultMessage)
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<SearchWorkspaceTab>(initialHashState.tab ?? 'overview')
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
  const restoredHashStateRef = useRef(false)
  const pendingSelectedResultIdRef = useRef<string | null>(initialHashState.selectedResultId ?? null)
  const loadingMoreRef = useRef(false)
  const loadingAllMatchesRef = useRef(false)
  const selectedResultRef = useRef<SearchResultDto | null>(null)
  const answerPreviewRef = useRef<AnswerPreview | null>(null)
  const activeQueryRef = useRef<{ ast: SearchQueryAstV1; mode: SearchQueryMode; query: string } | null>(null)
  const sort = options.sort ?? 'relevance'

  const resetEvidenceState = useCallback((status?: string) => {
    setBrief(null)
    setResults([])
    answerPreviewRef.current = null
    setAnswerPreview(null)
    setAllMatches([])
    setAllMatchesOpen(false)
    setAllMatchesCursor(null)
    setLoadingAllMatches(false)
    loadingAllMatchesRef.current = false
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

  const submitSearch = useCallback((next?: { mode?: SearchQueryMode; query?: string; selectedResultId?: string | null; tab?: SearchWorkspaceTab | null }) => {
    const effectiveQuery = next?.query ?? query
    const effectiveMode = next?.mode ?? mode
    const trimmed = effectiveQuery.trim()
    requestSequence.current += 1
    const sequence = requestSequence.current
    setQuery(effectiveQuery)
    setMode(effectiveMode)
    if (!trimmed) {
      setEmptyResultMessage(defaultEmptyResultMessage)
      setError(null)
      resetEvidenceState(packState === 'active' ? 'Search data is ready on this device.' : packMessageForState(packState))
      writeSearchHashState({})
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
    const requestedTab = next?.tab ?? null
    const nextActiveTab = requestedTab ?? nextDefaultTab
    pendingSelectedResultIdRef.current = next?.selectedResultId ?? null
    setDefaultWorkspaceTab(nextDefaultTab)
    setActiveWorkspaceTab(nextActiveTab)
    setExploreSeedResult(null)
    setFocusedExploreModule(null)
    setError(null)
    setSearchStatus('Searching')
    setBrief(null)
    setResults([])
    answerPreviewRef.current = null
    setAnswerPreview(null)
    setAllMatches([])
    setAllMatchesOpen(false)
    setAllMatchesCursor(null)
    setLoadingAllMatches(false)
    loadingAllMatchesRef.current = false
    selectedResultRef.current = null
    setSelectedResult(null)
    setResultCursor(null)
    setResultCountMessage('')
    setLoadingMoreResults(false)
    loadingMoreRef.current = false
    setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
    activeQueryRef.current = { ast: parsed.ast, mode: effectiveMode, query: trimmed }
    writeSearchHashState({
      mode: effectiveMode,
      query: trimmed,
      tab: nextActiveTab,
    })
    void client.askPreview({ query: trimmed, lens: lensForMode(effectiveMode), sort }).then((preview) => {
      if (sequence !== requestSequence.current) return
      answerPreviewRef.current = preview
      setAnswerPreview(preview)
      setBrief(null)
      setResults([])
      selectedResultRef.current = null
      setSelectedResult(null)
      setResultCursor(null)
      setAllMatches([])
      setAllMatchesCursor(null)
      setAllMatchesOpen(false)
      setLoadingAllMatches(false)
      loadingAllMatchesRef.current = false
      setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
      const countMessage = statusForAnswerPreview(preview)
      setEmptyResultMessage(preview.recovery?.message ?? emptyResultMessageForMode(effectiveMode))
      setResultCountMessage(countMessage)
      setSearchStatus(countMessage)
      writeSearchHashState({
        mode: effectiveMode,
        query: trimmed,
        tab: nextActiveTab,
      })
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      const message = caught instanceof Error ? caught.message : 'Search failed'
      setError(message)
      setSearchStatus(message)
      setResultCursor(null)
    })
  }, [client, mode, packState, query, resetEvidenceState, sort])

  useEffect(() => {
    if (restoredHashStateRef.current || !readyRef.current || !initialHashState.query?.trim()) return
    restoredHashStateRef.current = true
    submitSearch({
      mode: initialHashState.mode ?? 'all',
      query: initialHashState.query,
      selectedResultId: initialHashState.selectedResultId ?? null,
      tab: initialHashState.tab ?? null,
    })
  }, [initialHashState.mode, initialHashState.query, initialHashState.selectedResultId, initialHashState.tab, packState, submitSearch])

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

  const openAllMatches = useCallback(() => {
    const preview = answerPreviewRef.current
    const activeQuery = activeQueryRef.current
    if (!preview || !activeQuery || loadingAllMatchesRef.current) return
    const sequence = requestSequence.current
    const activePreviewId = preview.id
    const activeQueryIdentity = activeQueryIdentityFor(activeQuery)
    loadingAllMatchesRef.current = true
    setAllMatchesOpen(true)
    setLoadingAllMatches(true)
    setSearchStatus('Loading all matches')
    void client.getAskMatchesPage({
      previewId: activePreviewId,
      query: activeQuery.query,
      lens: lensForMode(activeQuery.mode),
      limit: 10,
      sort,
    }).then((page) => {
      if (sequence !== requestSequence.current) return
      if (answerPreviewRef.current?.id !== activePreviewId) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      setAllMatches(page.matchCards)
      setAllMatchesCursor(page.nextCursor ?? null)
      setSearchStatus(`${page.matchCards.length} matches shown`)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      if (answerPreviewRef.current?.id !== activePreviewId) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      const message = caught instanceof Error ? caught.message : 'All matches are unavailable'
      setError(message)
      setSearchStatus(message)
    }).finally(() => {
      if (sequence !== requestSequence.current) return
      if (answerPreviewRef.current?.id !== activePreviewId) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      loadingAllMatchesRef.current = false
      setLoadingAllMatches(false)
    })
  }, [client, sort])

  const loadMoreAllMatches = useCallback(() => {
    const preview = answerPreviewRef.current
    const activeQuery = activeQueryRef.current
    const cursor = allMatchesCursor
    if (!preview || !activeQuery || !cursor || loadingAllMatchesRef.current) return
    const sequence = requestSequence.current
    const activePreviewId = preview.id
    const activeQueryIdentity = activeQueryIdentityFor(activeQuery)
    loadingAllMatchesRef.current = true
    setLoadingAllMatches(true)
    setSearchStatus('Loading more matches')
    void client.getAskMatchesPage({
      previewId: activePreviewId,
      query: activeQuery.query,
      lens: lensForMode(activeQuery.mode),
      cursor,
      limit: 10,
      sort,
    }).then((page) => {
      if (sequence !== requestSequence.current) return
      if (answerPreviewRef.current?.id !== activePreviewId) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      const merged = mergeMatchCards(allMatches, page.matchCards)
      setAllMatches(merged)
      setAllMatchesCursor(page.nextCursor ?? null)
      setSearchStatus(`${merged.length} matches shown`)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      if (answerPreviewRef.current?.id !== activePreviewId) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      const message = caught instanceof Error ? caught.message : 'All matches are unavailable'
      setError(message)
      setSearchStatus(message)
    }).finally(() => {
      if (sequence !== requestSequence.current) return
      if (answerPreviewRef.current?.id !== activePreviewId) return
      if (activeQueryIdentityFor(activeQueryRef.current) !== activeQueryIdentity) return
      loadingAllMatchesRef.current = false
      setLoadingAllMatches(false)
    })
  }, [allMatches, allMatchesCursor, client, sort])

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
    writeSearchHashState({})
  }, [packState, resetEvidenceState])

  const setSearchMode = useCallback((nextMode: SearchQueryMode) => {
    setMode(nextMode)
  }, [])

  const setSearchActiveWorkspaceTab = useCallback((tab: SearchWorkspaceTab) => {
    setActiveWorkspaceTab(tab)
    if (!activeQueryRef.current) return
    writeSearchHashState({
      mode: activeQueryRef.current.mode,
      query: activeQueryRef.current.query,
      selectedResultId: selectedResultRef.current?.resultId,
      tab,
    })
  }, [])

  const setSearchSelectedResult = useCallback((result: SearchResultDto | null) => {
    selectedResultRef.current = result
    setSelectedResult(result)
    if (!activeQueryRef.current) return
    writeSearchHashState({
      mode: activeQueryRef.current.mode,
      query: activeQueryRef.current.query,
      selectedResultId: result?.resultId,
      tab: activeWorkspaceTab,
    })
  }, [activeWorkspaceTab])

  const openResultExplore = useCallback((result: SearchResultDto, module: SearchExploreModuleId = 'selected-token') => {
    selectedResultRef.current = result
    setSelectedResult(result)
    setExploreSeedResult(result)
    setFocusedExploreModule(module)
    setActiveWorkspaceTab('explore')
    if (!activeQueryRef.current) return
    writeSearchHashState({
      mode: activeQueryRef.current.mode,
      query: activeQueryRef.current.query,
      selectedResultId: result.resultId,
      tab: 'explore',
    })
  }, [])

  const canSaveSearch = Boolean(
    activeQueryRef.current
    && activeQueryRef.current.query === query.trim()
    && activeQueryRef.current.mode === mode
    && !error
  )

  return {
    error,
    emptyResultMessage,
    mode,
    packMessage: packMessageForState(packState),
    packState,
    packVersion,
    query,
    canSaveSearch,
    activeWorkspaceTab,
    answerPreview,
    allMatches,
    allMatchesOpen,
    brief,
    canLoadAllMatches: Boolean(allMatchesCursor) && !loadingAllMatches,
    defaultWorkspaceTab,
    exploreSeedResult,
    focusedExploreModule,
    loadingAllMatches,
    resultCountMessage,
    results,
    searchStatus,
    selectedResult,
    hasMoreResults: Boolean(resultCursor),
    canLoadMoreResults: Boolean(resultCursor) && !loadingMoreResults,
    exploreGraph,
    loadExploreGraph,
    loadMoreAllMatches,
    loadMoreResults,
    openAllMatches,
    openResultExplore,
    setActiveWorkspaceTab: setSearchActiveWorkspaceTab,
    setExploreSeedResult,
    setFocusedExploreModule,
    setMode: setSearchMode,
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

function mergeMatchCards(current: MatchCardLite[], next: MatchCardLite[]): MatchCardLite[] {
  const seen = new Set(current.map((card) => card.id))
  const merged = [...current]
  for (const card of next) {
    if (seen.has(card.id)) continue
    seen.add(card.id)
    merged.push(card)
  }
  return merged
}

function lensForMode(mode: SearchQueryMode): SearchLensLite {
  if (mode === 'arabic-text' || mode === 'exact-word-form') return 'quran-text'
  if (mode === 'translation' || mode === 'context') return 'translation'
  if (mode === 'phrase') return 'phrase'
  if (mode === 'same-written-form' || mode === 'same-root' || mode === 'lemma' || mode === 'surah-context') return 'morphology'
  return 'mixed'
}

function statusForAnswerPreview(preview: AnswerPreview): string {
  if (preview.mode === 'answer') return `${preview.evidenceCards.length} best evidence card(s)`
  if (preview.mode === 'partial-answer') return `${preview.evidenceCards.length} evidence card(s) with limits`
  if (preview.mode === 'evidence-only') return preview.recovery?.message ?? 'Evidence-only response'
  return preview.recovery?.message ?? 'No answer available'
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

function readSearchHashState(hash = typeof window === 'undefined' ? '' : window.location.hash): SearchHashState {
  const paramsText = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  if (!paramsText) return {}
  const params = new URLSearchParams(paramsText)
  const query = params.get('q')?.trim() || undefined
  const mode = searchModeFromParam(params.get('mode'))
  const tab = searchTabFromParam(params.get('tab'))
  const selectedResultId = params.get('selected') || undefined
  return { mode, query, selectedResultId, tab }
}

function writeSearchHashState(state: SearchHashState): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()
  if (state.query?.trim()) params.set('q', state.query.trim())
  if (state.mode && state.mode !== 'all') params.set('mode', state.mode)
  if (state.tab && state.tab !== 'overview') params.set('tab', state.tab)
  if (state.selectedResultId) params.set('selected', state.selectedResultId)
  const nextHash = params.toString() ? `${REACT_ROUTES.search}?${params.toString()}` : REACT_ROUTES.search
  if (window.location.hash === nextHash) return
  window.history.replaceState(null, '', nextHash)
}

function searchModeFromParam(value: string | null): SearchQueryMode | undefined {
  if (
    value === 'all'
    || value === 'arabic-text'
    || value === 'translation'
    || value === 'context'
    || value === 'exact-word-form'
    || value === 'phrase'
    || value === 'same-written-form'
    || value === 'same-root'
    || value === 'lemma'
    || value === 'surah-context'
  ) {
    return value
  }
  return undefined
}

function searchTabFromParam(value: string | null): SearchWorkspaceTab | undefined {
  if (value === 'overview' || value === 'verses' || value === 'explore' || value === 'sources') return value
  return undefined
}
