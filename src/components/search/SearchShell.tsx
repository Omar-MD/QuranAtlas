import { useEffect, useMemo, useRef, useState } from 'react'

import { isValidQuranAyahRef, SEARCH_NORMALIZER_VERSION } from '../../../shared/search'
import { REACT_ROUTES } from '../../app/router/routes'
import { ChromeFrame } from '../navigation/ChromeFrame'
import { useNavDrawerController } from '../navigation/nav-drawer-controller'
import { loadVerseAliases, type VerseAliases } from '../../data/verse-aliases'
import { cn } from '../../design-system/utils/cn'
import { mapSearchRefToReader, type SearchReaderRiwayah } from '../../search/result-mapping'
import type { SearchResultDto } from '../../search/schema'
import { openReactDb } from '../../storage/db'
import type { SavedSearchRecord } from '../../storage/types'
import { SavedSearchesNavPanel } from './SavedSearchesNavPanel'
import { SearchHeader } from './SearchHeader'
import { SearchIndexGate } from './SearchIndexGate'
import { SearchWorkspace } from './SearchWorkspace'
import { Status } from '../ui'
import { useSavedSearches } from './useSavedSearches'
import { useSearchRouteState } from './useSearchRouteState'

export function SearchShell() {
  const search = useSearchRouteState()
  const saved = useSavedSearches()
  const [savedStatusMessage, setSavedStatusMessage] = useState('')
  const drawer = useNavDrawerController()
  const aliasesPromiseRef = useRef<Promise<VerseAliases> | null>(null)
  const compatibilityKey = useMemo(
    () =>
      search.packVersion
        ? `qa-search-core-hafs-v1:${search.packVersion}:abi1:normalizer${SEARCH_NORMALIZER_VERSION}`
        : `search-pack-abi-1-normalizer-${SEARCH_NORMALIZER_VERSION}`,
    [search.packVersion],
  )

  function openInRead(result: SearchResultDto) {
    if (!result.canOpenInRead) return
    void resolveOpenInRead(result)
  }

  function openPreviewRefInRead(ref: string) {
    if (!isSearchAyahRef(ref)) return
    void resolvePreviewRefInRead(ref)
  }

  async function resolveOpenInRead(result: SearchResultDto) {
    const readerRiwayah = await readActiveReaderRiwayah()
    const aliases = readerRiwayah === 'qaloon' ? await loadSearchAliases(aliasesPromiseRef) : {}
    const mapping = mapSearchRefToReader({
      aliases,
      readerRiwayah,
      sourceRef: result.sourceRef,
    })
    if (!mapping.canOpenInRead || mapping.readerRefs.length !== 1) return
    const [surah, ayah] = mapping.readerRefs[0].split(':').map(Number)
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return
    window.location.hash = REACT_ROUTES.surah(surah, ayah)
  }

  async function resolvePreviewRefInRead(ref: `${number}:${number}`) {
    const readerRiwayah = await readActiveReaderRiwayah()
    const aliases = readerRiwayah === 'qaloon' ? await loadSearchAliases(aliasesPromiseRef) : {}
    const mapping = mapSearchRefToReader({
      aliases,
      readerRiwayah,
      sourceRef: ref,
    })
    if (!mapping.canOpenInRead || mapping.readerRefs.length !== 1) return
    const [surah, ayah] = mapping.readerRefs[0].split(':').map(Number)
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return
    window.location.hash = REACT_ROUTES.surah(surah, ayah)
  }

  async function loadSavedSearch(record: SavedSearchRecord) {
    let opened: SavedSearchRecord | null
    try {
      opened = await saved.openSearch(record.id)
    } catch (caught) {
      setSavedStatusMessage(caught instanceof Error ? caught.message : 'Saved search could not be opened')
      return
    }
    if (!opened) return
    search.setQuery(opened.intent.queryText)
    search.setMode('all')
    search.submitSearch({ query: opened.intent.queryText })
    drawer.dispatch({ type: 'route-transition' })
  }

  useEffect(() => {
    if (saved.status && !search.error) setSavedStatusMessage(saved.status)
  }, [saved.status, search.error])

  const lastSearchStatusRef = useRef(search.searchStatus)
  useEffect(() => {
    if (lastSearchStatusRef.current === search.searchStatus) return
    lastSearchStatusRef.current = search.searchStatus
    setSavedStatusMessage('')
  }, [search.searchStatus])

  const searchPanel = (
    <SavedSearchesNavPanel
      lastDeleted={saved.lastDeleted}
      onDelete={(id) => void saved.deleteSearch(id)}
      onLoad={(record) => void loadSavedSearch(record)}
      onUndoDelete={() => void saved.undoDelete()}
      records={saved.records}
    />
  )

  const packGateLoading =
    search.packState === 'loading' ||
    search.packState === 'installing' ||
    search.packState === 'staged' ||
    search.packState === 'verifying' ||
    search.packState === 'update available'

  const statusMessage = [search.searchStatus, savedStatusMessage && !search.error ? savedStatusMessage : '']
    .filter(Boolean)
    .join(' ')

  return (
    <ChromeFrame
      activeMode="search"
      controller={drawer}
      onOpenSettings={() => {
        window.location.hash = REACT_ROUTES.settings
      }}
      searchPanel={searchPanel}
      statusMessage={statusMessage}
    >
      <div className={cn('qar-react-search-page-shell', drawer.state.open && 'qar-react-search-page-shell--nav-open')}>
        <main aria-label="Search" className="qar-react-search-content">
          <div className="qar-react-search-content-inner">
            <h1 className="qar:mb-4 qar:text-2xl qar:font-semibold qar:text-text">Search</h1>
            <SearchHeader
              canSave={search.canSaveSearch}
              onQueryChange={search.setQuery}
              onSaveSearch={() =>
                void saved.saveSearch({
                  mode: 'all',
                  packCompatibilityKey: compatibilityKey,
                  query: search.query,
                })
              }
              onSubmit={(submittedQuery) => {
                search.setQuery(submittedQuery)
                search.submitSearch({ query: submittedQuery })
              }}
              query={search.query}
            />
            {search.error ? <Status description={search.error} title="Search unavailable" tone="error" /> : null}
            <SearchIndexGate
              loading={packGateLoading}
              message={search.packMessage}
              ready={search.packState === 'active'}
            >
              <SearchWorkspace
                activeTab={search.activeWorkspaceTab}
                allMatches={search.allMatches}
                allMatchesOpen={search.allMatchesOpen}
                answerPreview={search.answerPreview}
                brief={search.brief}
                canLoadAllMatches={search.canLoadAllMatches}
                canLoadMore={search.canLoadMoreResults}
                defaultTab={search.defaultWorkspaceTab}
                emptyMessage={search.emptyResultMessage}
                exploreGraph={search.exploreGraph}
                exploreSeedResult={search.exploreSeedResult}
                focusedExploreModule={search.focusedExploreModule}
                hasMore={search.hasMoreResults}
                onActiveTabChange={search.setActiveWorkspaceTab}
                onFocusExploreModule={search.setFocusedExploreModule}
                onLoadMoreAllMatches={search.loadMoreAllMatches}
                onLoadExploreGraph={search.loadExploreGraph}
                onLoadMore={search.loadMoreResults}
                onOpenAllMatches={search.openAllMatches}
                onOpenInRead={openInRead}
                onOpenPreviewInRead={openPreviewRefInRead}
                onOpenResultExplore={search.openResultExplore}
                onSelectResult={search.setSelectedResult}
                onSelectPreviewMatch={search.setSelectedPreviewMatch}
                selectedPreviewMatch={search.selectedPreviewMatch}
                loadingAllMatches={search.loadingAllMatches}
                packVersion={search.packVersion}
                resultCountMessage={search.resultCountMessage}
                results={search.results}
                selectedResult={search.selectedResult}
              />
            </SearchIndexGate>
          </div>
        </main>
      </div>
    </ChromeFrame>
  )
}

async function loadSearchAliases(ref: { current: Promise<VerseAliases> | null }): Promise<VerseAliases> {
  ref.current ??= loadVerseAliases()
    .then((value) => value.aliases)
    .catch(() => {
      ref.current = null
      return {}
    })
  return ref.current
}

async function readActiveReaderRiwayah(): Promise<SearchReaderRiwayah> {
  try {
    const db = await openReactDb()
    const setting = await db.settings.get('riwayah')
    return isSupportedSearchReaderRiwayah(setting?.value) ? setting.value : 'qaloon'
  } catch {
    return 'qaloon'
  }
}

function isSupportedSearchReaderRiwayah(value: unknown): value is SearchReaderRiwayah {
  return value === 'qaloon' || value === 'hafs'
}

function isSearchAyahRef(value: string): value is `${number}:${number}` {
  return isValidQuranAyahRef(value)
}
