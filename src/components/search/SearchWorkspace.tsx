import { useEffect, useMemo, useRef, useState } from 'react'

import type { AnswerPreview, MatchCardLite } from '../../../shared/search'
import type { SearchBriefDto, SearchResultDto } from '../../search/schema'
import { Button, Tabs } from '../ui'
import { SearchAnswerPreview } from './SearchAnswerPreview'
import { SearchExplorePanel } from './SearchExplorePanel'
import { SearchOverview } from './SearchOverview'
import { SearchResultDetail } from './SearchResultDetail'
import { SearchResultList } from './SearchResultList'
import { SearchSourcePanel } from './SearchSourcePanel'
import { deriveSearchOutputViewModel, type SearchExploreModuleId, type SearchWorkspaceTab } from './search-presentation-model'
import type { SearchExploreGraphState } from './useSearchRouteState'

type SearchWorkspaceProps = {
  activeTab: SearchWorkspaceTab
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  answerPreview: AnswerPreview | null
  brief: SearchBriefDto | null
  canLoadMore: boolean
  canLoadAllMatches: boolean
  defaultTab: SearchWorkspaceTab
  emptyMessage: string
  exploreGraph: SearchExploreGraphState
  exploreSeedResult: SearchResultDto | null
  focusedExploreModule: SearchExploreModuleId | null
  hasMore: boolean
  onActiveTabChange: (tab: SearchWorkspaceTab) => void
  onFocusExploreModule: (module: SearchExploreModuleId | null) => void
  onLoadMoreAllMatches: () => void
  onLoadExploreGraph: (result: SearchResultDto) => void
  onLoadMore: () => void
  onOpenAllMatches: () => void
  onOpenInRead: (result: SearchResultDto) => void
  onOpenPreviewInRead: (ref: string) => void
  onOpenResultExplore: (result: SearchResultDto, module?: SearchExploreModuleId) => void
  onSelectResult: (result: SearchResultDto | null) => void
  packVersion?: string
  resultCountMessage: string
  results: SearchResultDto[]
  selectedResult: SearchResultDto | null
  loadingAllMatches: boolean
}

export function SearchWorkspace(props: SearchWorkspaceProps) {
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const detailPanelRef = useRef<HTMLDivElement | null>(null)
  const [detailsRequestId, setDetailsRequestId] = useState(0)
  const viewModel = useMemo(() => deriveSearchOutputViewModel({
    brief: props.brief,
    defaultTab: props.defaultTab,
    hasMoreResults: props.hasMore,
    results: props.results,
    selectedResult: props.selectedResult,
  }), [props.brief, props.defaultTab, props.hasMore, props.results, props.selectedResult])
  const hasPreviewOnlyData = Boolean(props.answerPreview && !props.brief && props.results.length === 0)

  function openTab(tab: SearchWorkspaceTab, focusModule?: SearchExploreModuleId) {
    props.onActiveTabChange(tab)
    props.onFocusExploreModule(focusModule ?? null)
  }

  useEffect(() => {
    if (!detailsRequestId || !props.selectedResult || props.activeTab !== 'verses') return
    const panel = detailPanelRef.current
    if (!panel || !window.matchMedia('(max-width: 767px)').matches) return
    window.setTimeout(() => {
      const top = panel.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
      panel.focus({ preventScroll: true })
    }, 0)
  }, [detailsRequestId, props.activeTab, props.selectedResult])

  return (
    <section aria-label="Search result workspace" className="qar-search-workspace">
      <Tabs
        defaultValue={viewModel.defaultTab}
        items={[
          {
            label: 'Overview',
            value: 'overview',
            content: props.answerPreview || !viewModel.overview ? (
              <SearchAnswerPreview
                allMatches={props.allMatches}
                allMatchesOpen={props.allMatchesOpen}
                canLoadAllMatches={props.canLoadAllMatches}
                loadingAllMatches={props.loadingAllMatches}
                onLoadMoreAllMatches={props.onLoadMoreAllMatches}
                onOpenAllMatches={props.onOpenAllMatches}
                onOpenInRead={props.onOpenPreviewInRead}
                preview={props.answerPreview}
              />
            ) : (
              <SearchOverview
                onAction={(action) => openTab(action.target, action.focusModule)}
                overview={viewModel.overview}
              />
            ),
          },
          {
            label: 'Verses',
            value: 'verses',
            content: hasPreviewOnlyData && props.answerPreview ? (
              <PreviewOnlyTabPanel
                allMatchesOpen={props.allMatchesOpen}
                loadingAllMatches={props.loadingAllMatches}
                onOpenAllMatches={props.onOpenAllMatches}
                onOpenOverview={() => openTab('overview')}
                preview={props.answerPreview}
                tab="verses"
              />
            ) : (
              <div className="qar-search-verses-panel">
                {props.resultCountMessage ? <p className="qar-search-result-count">{props.resultCountMessage}</p> : null}
                <SearchResultList
                  canLoadMore={props.canLoadMore}
                  cards={viewModel.verseCards}
                  emptyMessage={props.emptyMessage}
                  hasMore={props.hasMore}
                  onDetailsTrigger={(node) => {
                    detailsTriggerRef.current = node
                    if (node) setDetailsRequestId((current) => current + 1)
                  }}
                  onLoadMore={props.onLoadMore}
                  onOpenInRead={props.onOpenInRead}
                  onSelect={props.onSelectResult}
                  selectedResultId={props.selectedResult?.resultId}
                />
                <SearchResultDetail
                  details={viewModel.details}
                  onClose={() => {
                    props.onSelectResult(null)
                    detailsTriggerRef.current?.focus()
                  }}
                  onOpenExplore={props.onOpenResultExplore}
                  ref={detailPanelRef}
                />
              </div>
            ),
          },
          {
            label: 'Explore',
            value: 'explore',
            content: hasPreviewOnlyData && props.answerPreview ? (
              <PreviewOnlyTabPanel
                allMatchesOpen={props.allMatchesOpen}
                loadingAllMatches={props.loadingAllMatches}
                onOpenAllMatches={props.onOpenAllMatches}
                onOpenOverview={() => openTab('overview')}
                preview={props.answerPreview}
                tab="explore"
              />
            ) : (
              <SearchExplorePanel
                focusedModule={props.focusedExploreModule}
                graph={props.exploreGraph}
                modules={viewModel.exploreModules}
                onLoadGraph={props.onLoadExploreGraph}
                seedResult={props.exploreSeedResult}
                summaries={viewModel.exploreSummaries}
              />
            ),
          },
          {
            label: 'Sources',
            value: 'sources',
            content: hasPreviewOnlyData && props.answerPreview ? (
              <PreviewOnlyTabPanel
                allMatchesOpen={props.allMatchesOpen}
                loadingAllMatches={props.loadingAllMatches}
                onOpenAllMatches={props.onOpenAllMatches}
                onOpenOverview={() => openTab('overview')}
                preview={props.answerPreview}
                tab="sources"
              />
            ) : <SearchSourcePanel packVersion={props.packVersion} sources={viewModel.sources} />,
          },
        ]}
        label="Search result views"
        onValueChange={(value) => openTab(value as SearchWorkspaceTab)}
        value={props.activeTab}
      />
    </section>
  )
}

function PreviewOnlyTabPanel({
  allMatchesOpen,
  loadingAllMatches,
  onOpenAllMatches,
  onOpenOverview,
  preview,
  tab,
}: {
  allMatchesOpen: boolean
  loadingAllMatches: boolean
  onOpenAllMatches: () => void
  onOpenOverview: () => void
  preview: AnswerPreview
  tab: 'verses' | 'explore' | 'sources'
}) {
  const titleId = `search-preview-only-${tab}-title`
  function showAllMatches() {
    onOpenOverview()
    onOpenAllMatches()
  }

  return (
    <section aria-labelledby={titleId} className="qar-search-preview-tab-note">
      <p className="qar-search-overview-eyebrow">Answer preview active</p>
      <h3 id={titleId}>{previewOnlyTitle(tab)}</h3>
      <p dir="auto">
        <bdi>{preview.query}</bdi>
        {' '}
        is loaded as an Ask preview. This tab has no separate result window for the preview state.
      </p>
      <p>Open Overview for supported claims and best evidence. Use Show all matches to expand the source-backed matches.</p>
      <div className="qar-search-preview-tab-actions">
        <Button onClick={onOpenOverview} size="sm" variant="primary">
          View Overview
        </Button>
        {!allMatchesOpen ? (
          <Button disabled={loadingAllMatches} onClick={showAllMatches} size="sm" variant="secondary">
            {loadingAllMatches ? 'Loading matches' : 'Show all matches'}
          </Button>
        ) : (
          <span className="qar-search-preview-tab-status">All matches are open on Overview.</span>
        )}
      </div>
    </section>
  )
}

function previewOnlyTitle(tab: 'verses' | 'explore' | 'sources'): string {
  if (tab === 'verses') return 'Verses use All matches for this preview'
  if (tab === 'explore') return 'Explore is not loaded for this preview'
  return 'Sources are summarized on Overview'
}
