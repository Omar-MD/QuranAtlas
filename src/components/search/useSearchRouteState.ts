import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { assertSearchPackManifestUrls, type SearchPackManifestV1 } from '../../../shared/search'
import { installSearchPack, verifyStagedSearchPack, activateSearchPack } from '../../offline/search/activation'
import { reconcileSearchPackState, type SearchPackAvailabilityState } from '../../offline/search/repair'
import { getSearchClient, type SearchClient } from '../../search/client'
import { parseSearchQuery, SearchQueryParseError } from '../../search/query-parser'
import type { SearchQueryMode, SearchResultDto, SearchSort } from '../../search/schema'

export type SearchRoutePackState = SearchPackAvailabilityState | 'loading'

export type SearchRouteState = {
  error: string | null
  mode: SearchQueryMode
  packMessage: string
  packState: SearchRoutePackState
  packVersion?: string
  query: string
  resultCountMessage: string
  results: SearchResultDto[]
  searchStatus: string
  selectedResult: SearchResultDto | null
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
  const client = useMemo(() => options.client ?? getSearchClient(), [options.client])
  const requestSequence = useRef(0)
  const readyRef = useRef(false)
  const sort = options.sort ?? 'relevance'

  useEffect(() => {
    let active = true

    async function prepareSearchPack() {
      try {
        setPackState('loading')
        setSearchStatus('Loading search index')
        let state = await reconcileSearchPackState()
        if (!active) return
        setPackState(state.state)

        if (state.state === 'available online' || state.state === 'update available') {
          const manifest = await fetchManifest(state.activePack?.manifestUrl)
          if (!active) return
          setPackState('installing')
          await installSearchPack(manifest)
          if (!active) return
          setPackState('verifying')
          await verifyStagedSearchPack(manifest)
          if (!active) return
          await activateSearchPack(manifest)
          state = await reconcileSearchPackState()
          if (!active) return
          setPackVersion(manifest.packVersion)
          setPackState(state.state)
        }

        if (state.state === 'active') {
          await client.init()
          if (!active) return
          await client.preloadCore()
          if (!active) return
          readyRef.current = true
          setError(null)
          setPackState('active')
          setSearchStatus('Search data is ready on this device.')
          return
        }

        setSearchStatus(packMessageForState(state.state))
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
      return
    }
    setError(null)
    setSearchStatus('Searching')
    void client.query({ query: parsed.ast, sort }).then((window) => {
      if (sequence !== requestSequence.current) return
      setResults(window.results)
      setSelectedResult(window.results[0] ?? null)
      const count = window.totalKnownResults ?? window.results.length
      setResultCountMessage(`${count} result${count === 1 ? '' : 's'}`)
      setSearchStatus(`${count} result${count === 1 ? '' : 's'}`)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      const message = caught instanceof Error ? caught.message : 'Search failed'
      setError(message)
      setSearchStatus(message)
    })
  }, [client, mode, packState, query, sort])

  return {
    error,
    mode,
    packMessage: packMessageForState(packState),
    packState,
    packVersion,
    query,
    resultCountMessage,
    results,
    searchStatus,
    selectedResult,
    setMode,
    setQuery,
    setSelectedResult,
    submitSearch,
  }
}

async function fetchManifest(url?: string): Promise<SearchPackManifestV1> {
  if (!url) throw new Error('No compatible Search pack is available')
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch Search pack manifest')
  const manifest = await response.json() as SearchPackManifestV1
  assertSearchPackManifestUrls(manifest)
  return manifest
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
