import { useEffect, useMemo, useRef, useState } from 'react'

import { REACT_ROUTES } from '../../app/router/routes'
import { useBookmarks } from '../../continuity/bookmarks/use-bookmarks'
import { loadVerseAliases, type VerseAliases } from '../../data/verse-aliases'
import { cn } from '../../design-system/utils/cn'
import { mapSearchRefToReader, type SearchReaderRiwayah } from '../../search/result-mapping'
import type { SearchResultDto } from '../../search/schema'
import { openReactDb } from '../../storage/db'
import type { SavedSearchRecord } from '../../storage/types'
import { NavDrawer } from '../navigation/NavDrawer'
import { useNavDrawerController } from '../navigation/nav-drawer-controller'
import { ReaderChrome } from '../reader/ReaderChrome'
import { SavedSearchesNavPanel } from './SavedSearchesNavPanel'
import { SearchHeader } from './SearchHeader'
import { SearchIndexGate } from './SearchIndexGate'
import { SearchWorkspace } from './SearchWorkspace'
import { useSavedSearches } from './useSavedSearches'
import { useSearchRouteState } from './useSearchRouteState'

export function SearchShell() {
  const search = useSearchRouteState()
  const saved = useSavedSearches()
  const [savedStatusMessage, setSavedStatusMessage] = useState('')
  const { bookmarks, deleteBookmark } = useBookmarks()
  const { dispatch: dispatchDrawer, state: drawerState } = useNavDrawerController()
  const aliasesPromiseRef = useRef<Promise<VerseAliases> | null>(null)
  const compatibilityKey = useMemo(
    () => search.packVersion ? `qa-search-core-hafs-v1:${search.packVersion}:abi1:normalizer1` : 'search-pack-abi-1-normalizer-1',
    [search.packVersion],
  )

  function openInRead(result: SearchResultDto) {
    if (!result.canOpenInRead) return
    void resolveOpenInRead(result)
  }

  function openPreviewRefInRead(ref: string) {
    const match = /^(\d{1,3}):(\d{1,3})$/.exec(ref)
    if (!match) return
    const surah = Number(match[1])
    const ayah = Number(match[2])
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return
    if (surah < 1 || surah > 114 || ayah < 1) return
    window.location.hash = REACT_ROUTES.surah(surah, ayah)
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

  async function loadSavedSearch(record: SavedSearchRecord) {
    const opened = await saved.openSearch(record.id)
    if (!opened) return
    search.setQuery(opened.intent.queryText)
    search.setMode(opened.intent.queryMode)
    search.submitSearch({ mode: opened.intent.queryMode, query: opened.intent.queryText })
    dispatchDrawer({ type: 'route-transition' })
  }

  function navigate(hash: string) {
    window.location.hash = hash
    dispatchDrawer({ type: 'route-transition' })
  }

  useEffect(() => {
    if (!drawerState.open) return undefined
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dispatchDrawer({ reason: 'escape', type: 'close' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatchDrawer, drawerState.open])

  useEffect(() => {
    if (saved.status && !search.error) setSavedStatusMessage(saved.status)
  }, [saved.status, search.error])

  useEffect(() => {
    setSavedStatusMessage('')
  }, [search.searchStatus])

  const savedSearchesPanel = (
    <SavedSearchesNavPanel
      lastDeleted={saved.lastDeleted}
      onDelete={(id) => void saved.deleteSearch(id)}
      onLoad={(record) => void loadSavedSearch(record)}
      onUndoDelete={() => void saved.undoDelete()}
      records={saved.records}
    />
  )

  return (
    <div className={cn('qar-search-page-shell', drawerState.open && 'qar-search-page-shell--nav-open')}>
      <div className="qar-search-reader-chrome">
        <ReaderChrome
          hideSettings
          mode="verse"
          onOpenNavigation={() => dispatchDrawer({ returnFocusId: 'reader-navigation-trigger', type: 'open' })}
        />
      </div>
      {drawerState.open && (
        <div className="qar-react-nav-drawer-overlay qar-search-nav-drawer-overlay" onClick={() => dispatchDrawer({ reason: 'outside', type: 'close' })} role="presentation">
          <NavDrawer
            activeMode="search"
            bookmarks={bookmarks}
            currentLabel="Search"
            mode="verse"
            onClose={() => dispatchDrawer({ reason: 'button', type: 'close' })}
            onDeleteBookmark={deleteBookmark}
            onNavigate={navigate}
            open
            searchPanel={savedSearchesPanel}
            showWird={false}
          />
        </div>
      )}
      <main aria-label="Search" className="qar-search-content">
        <div className="qar-search-content-inner">
          <h1 className="qar:sr-only">Search</h1>
          <SearchHeader
            canSave={search.canSaveSearch}
            mode={search.mode}
            onModeChange={search.setMode}
            onQueryChange={search.setQuery}
            onSaveSearch={() => void saved.saveSearch({
              mode: search.mode,
              packCompatibilityKey: compatibilityKey,
              query: search.query,
            })}
            onSubmit={(submittedQuery) => {
              search.setQuery(submittedQuery)
              search.submitSearch({ query: submittedQuery })
            }}
            query={search.query}
          />
          <div aria-live="polite" className="qar:sr-only" role="status">
            {search.searchStatus}
          </div>
          {savedStatusMessage && !search.error ? (
            <div aria-live="polite" className="qar:sr-only" role="status">
              {savedStatusMessage}
            </div>
          ) : null}
          <div className="qar-search-status-row">
            <p>{search.packMessage}</p>
          </div>
          {search.error ? (
            <p className="qar-search-error">
              {search.error}
            </p>
          ) : null}
          <SearchIndexGate message={search.packMessage} ready={search.packState === 'active'}>
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
