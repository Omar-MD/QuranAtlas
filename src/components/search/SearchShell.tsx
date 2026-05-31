import { useMemo } from 'react'

import { REACT_ROUTES } from '../../app/router/routes'
import type { SearchResultDto } from '../../search/schema'
import type { SavedSearchRecord } from '../../storage/types'
import { SavedSearchesRail } from './SavedSearchesRail'
import { SavedSearchesSheet } from './SavedSearchesSheet'
import { SearchHeader } from './SearchHeader'
import { SearchIndexGate } from './SearchIndexGate'
import { SearchResultDetail } from './SearchResultDetail'
import { SearchResultList } from './SearchResultList'
import { useSavedSearches } from './useSavedSearches'
import { useSearchRouteState } from './useSearchRouteState'

export function SearchShell() {
  const search = useSearchRouteState()
  const saved = useSavedSearches()
  const compatibilityKey = useMemo(
    () => search.packVersion ? `qa-search-core-hafs-v1:${search.packVersion}:abi1:normalizer1` : 'search-pack-abi-1-normalizer-1',
    [search.packVersion],
  )

  function openInRead(result: SearchResultDto) {
    if (!result.canOpenInRead || result.readerRefs.length !== 1) return
    const [surah, ayah] = result.readerRefs[0].split(':').map(Number)
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return
    window.location.hash = REACT_ROUTES.surah(surah, ayah)
  }

  async function loadSavedSearch(record: SavedSearchRecord) {
    const opened = await saved.openSearch(record.id)
    if (!opened) return
    search.setQuery(opened.intent.queryText)
    search.setMode(opened.intent.queryMode)
    search.submitSearch({ mode: opened.intent.queryMode, query: opened.intent.queryText })
  }

  function renameSavedSearch(id: string, currentName: string) {
    const nextName = window.prompt('Rename saved search', currentName)
    if (nextName) void saved.renameSearch(id, nextName)
  }

  const savedSearches = (
    <SavedSearchesRail
      onDelete={(id) => void saved.deleteSearch(id)}
      onLoad={(record) => void loadSavedSearch(record)}
      onRename={renameSavedSearch}
      records={saved.records}
    />
  )

  return (
    <main aria-label="Search" className="qar:mx-auto qar:grid qar:w-full qar:max-w-7xl qar:gap-5 qar:px-0 qar:py-0 md:qar:px-5 md:qar:py-5">
      <div className="qar:grid qar:gap-1 qar:px-5 md:qar:px-0">
        <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Read / Search</p>
        <h1 className="qar:m-0 qar:text-2xl qar:leading-tight">Search</h1>
      </div>
      <SearchHeader
        canSave={Boolean(search.query.trim())}
        mode={search.mode}
        onModeChange={search.setMode}
        onQueryChange={search.setQuery}
        onSaveSearch={() => void saved.saveSearch({
          mode: search.mode,
          packCompatibilityKey: compatibilityKey,
          query: search.query,
        })}
        onSubmit={() => search.submitSearch()}
        query={search.query}
      />
      <div aria-live="polite" className="qar:sr-only" role="status">
        {[search.searchStatus, saved.status].filter(Boolean).join('. ')}
      </div>
      <div className="qar:flex qar:flex-wrap qar:items-center qar:justify-between qar:gap-3 qar:px-5 md:qar:px-0">
        <p className="qar:m-0 qar:text-sm qar:text-muted">{search.packMessage}</p>
        <div className="qar-search-saved-sheet">
          <SavedSearchesSheet
            onDelete={(id) => void saved.deleteSearch(id)}
            onLoad={(record) => void loadSavedSearch(record)}
            onRename={renameSavedSearch}
            records={saved.records}
          />
        </div>
      </div>
      {search.error ? (
        <p className="qar:mx-5 qar:m-0 qar:rounded-surface qar:border qar:border-danger qar:bg-surface qar:p-3 qar:text-sm qar:text-danger md:qar:mx-0">
          {search.error}
        </p>
      ) : null}
      <div className="qar-search-layout qar:grid qar:gap-5 qar:px-5 md:qar:px-0">
        <div className="qar-search-saved-rail">{savedSearches}</div>
        <SearchIndexGate message={search.packMessage} ready={search.packState === 'active'}>
          <div className="qar:grid qar:gap-3">
            {search.resultCountMessage ? (
              <p className="qar:m-0 qar:text-sm qar:text-muted">{search.resultCountMessage}</p>
            ) : null}
            <SearchResultList
              onOpenInRead={openInRead}
              onSelect={search.setSelectedResult}
              results={search.results}
              selectedResultId={search.selectedResult?.resultId}
            />
          </div>
        </SearchIndexGate>
        <div>
          <SearchResultDetail
            exploreGraph={search.exploreGraph}
            onLoadExploreGraph={search.loadExploreGraph}
            packVersion={search.packVersion}
            result={search.selectedResult}
          />
        </div>
      </div>
    </main>
  )
}
