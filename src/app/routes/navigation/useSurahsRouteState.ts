import { useEffect, useState } from 'react'

import { REACT_ROUTES } from '../../router/routes'

export type SurahsFilter = 'all' | 'recent'

export type SurahsRouteState = {
  query: string
  filter: SurahsFilter
  setQuery: (query: string) => void
  setFilter: (filter: SurahsFilter) => void
}

type SurahsHashState = {
  query: string
  filter: SurahsFilter
}

function readSurahsHashState(hash = typeof window === 'undefined' ? '' : window.location.hash): SurahsHashState {
  if (hash.split('?')[0] !== REACT_ROUTES.surahs) return { query: '', filter: 'all' }
  const paramsText = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const params = new URLSearchParams(paramsText)
  const query = params.get('q')?.trim() || ''
  const filter: SurahsFilter = params.get('filter') === 'recent' ? 'recent' : 'all'
  return { query, filter }
}

function writeSurahsHashState(state: SurahsHashState): void {
  if (typeof window === 'undefined') return
  // Stale async continuations must never reclaim the address bar: only write
  // while the surahs route still owns the current hash.
  if (window.location.hash.split('?')[0] !== REACT_ROUTES.surahs) return
  const params = new URLSearchParams()
  if (state.query.trim()) params.set('q', state.query.trim())
  if (state.filter === 'recent') params.set('filter', 'recent')
  const nextHash = params.toString() ? `${REACT_ROUTES.surahs}?${params.toString()}` : REACT_ROUTES.surahs
  if (window.location.hash === nextHash) return
  window.history.replaceState(null, '', nextHash)
}

export function useSurahsRouteState(): SurahsRouteState {
  const [hashState, setHashState] = useState<SurahsHashState>(() => readSurahsHashState())

  function setQuery(query: string) {
    setHashState((current) => {
      const next = { ...current, query }
      writeSurahsHashState(next)
      return next
    })
  }

  function setFilter(filter: SurahsFilter) {
    setHashState((current) => {
      const next = { ...current, filter }
      writeSurahsHashState(next)
      return next
    })
  }

  // Rehydrate when the surahs hash changes out-of-band (manual edits, in-page
  // hash links). Our own writes use replaceState, which fires no hashchange,
  // so this cannot loop.
  useEffect(() => {
    function onHashChange() {
      if (window.location.hash.split('?')[0] !== REACT_ROUTES.surahs) return
      const next = readSurahsHashState()
      setHashState((current) => (current.query === next.query && current.filter === next.filter ? current : next))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return { query: hashState.query, filter: hashState.filter, setQuery, setFilter }
}
