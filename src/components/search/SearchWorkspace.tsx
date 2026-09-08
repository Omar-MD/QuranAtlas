import { useEffect, useMemo, useRef, useState } from 'react'

import type { AnswerPreview, MatchCardLite } from '../../../shared/search'
import type { SearchBriefDto, SearchResultDto } from '../../search/schema'
import { Button, Status, Tabs } from '../ui'
import { SearchAnswerPreview } from './SearchAnswerPreview'
import { SearchExplorePanel } from './SearchExplorePanel'
import { SearchOverview } from './SearchOverview'
import { SearchResultDetail } from './SearchResultDetail'
import { SearchResultList } from './SearchResultList'
import { SearchSourcePanel } from './SearchSourcePanel'
import {
  deriveSearchOutputViewModel,
  type SearchExploreModuleId,
  type SearchWorkspaceTab,
} from './search-presentation-model'
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
  onSelectPreviewMatch: (match: MatchCardLite | null) => void
  packVersion?: string
  resultCountMessage: string
  results: SearchResultDto[]
  selectedResult: SearchResultDto | null
  selectedPreviewMatch: MatchCardLite | null
  loadingAllMatches: boolean
}

export function SearchWorkspace(props: SearchWorkspaceProps) {
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const detailPanelRef = useRef<HTMLDivElement | null>(null)
  const previewDetailPanelRef = useRef<HTMLDivElement | null>(null)
  const [detailsRequestId, setDetailsRequestId] = useState(0)
  const previewDetailsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mobileResultsScrollTopRef = useRef<number | null>(null)
  const viewModel = useMemo(
    () =>
      deriveSearchOutputViewModel({
        answerPreview: props.answerPreview,
        brief: props.brief,
        defaultTab: props.defaultTab,
        hasMoreResults: props.hasMore,
        results: props.results,
        selectedResult: props.selectedResult,
      }),
    [props.answerPreview, props.brief, props.defaultTab, props.hasMore, props.results, props.selectedResult],
  )
  const previewLane = props.answerPreview !== null && viewModel.previewSurface === 'preview'

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

  // Mobile focus/scroll parity for the preview detail (F4): opening Details
  // replaces the preview content, so focus must land in the panel.
  useEffect(() => {
    if (!props.selectedPreviewMatch || props.activeTab !== 'overview') return
    const panel = previewDetailPanelRef.current
    if (!panel || !window.matchMedia('(max-width: 767px)').matches) return
    window.setTimeout(() => {
      const top = panel.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
      panel.focus({ preventScroll: true })
    }, 0)
  }, [props.activeTab, props.selectedPreviewMatch])

  return (
    <section aria-label="Search result workspace" className="qar-react-search-workspace">
      <Tabs
        defaultValue={viewModel.defaultTab}
        items={[
          {
            label: 'Overview',
            value: 'overview',
            content:
              props.answerPreview && viewModel.previewSurface === 'no-results' ? (
                <Status description={props.emptyMessage} title="No results" tone="info" />
              ) : props.answerPreview || !viewModel.overview ? (
                <SearchAnswerPreview
                  ref={previewDetailPanelRef}
                  allMatches={props.allMatches}
                  allMatchesOpen={props.allMatchesOpen}
                  canLoadAllMatches={props.canLoadAllMatches}
                  loadingAllMatches={props.loadingAllMatches}
                  onLoadMoreAllMatches={props.onLoadMoreAllMatches}
                  onOpenAllMatches={props.onOpenAllMatches}
                  onOpenInRead={props.onOpenPreviewInRead}
                  onSelectMatch={(match, trigger) => {
                    if (window.matchMedia('(max-width: 767px)').matches)
                      mobileResultsScrollTopRef.current = window.scrollY
                    previewDetailsTriggerRef.current = trigger
                    props.onSelectPreviewMatch(match)
                  }}
                  onCloseMatch={() => {
                    props.onSelectPreviewMatch(null)
                    const scrollTop = mobileResultsScrollTopRef.current
                    mobileResultsScrollTopRef.current = null
                    if (scrollTop !== null) window.scrollTo({ behavior: 'auto', top: scrollTop })
                    const pendingTrigger = previewDetailsTriggerRef.current
                    previewDetailsTriggerRef.current = null
                    // The list is still hidden while React re-renders; focus
                    // lands on the trigger once it is visible again.
                    window.setTimeout(() => pendingTrigger?.focus(), 0)
                  }}
                  selectedMatch={props.selectedPreviewMatch}
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
            content:
              previewLane && props.answerPreview ? (
                <PreviewOnlyTabPanel
                  allMatchesOpen={props.allMatchesOpen}
                  loadingAllMatches={props.loadingAllMatches}
                  onOpenAllMatches={props.onOpenAllMatches}
                  onOpenOverview={() => openTab('overview')}
                  preview={props.answerPreview}
                  tab="verses"
                />
              ) : (
                <div
                  className="qar-react-search-verses-panel"
                  data-mobile-details={props.selectedResult ? 'true' : 'false'}
                >
                  {props.resultCountMessage ? (
                    <p className="qar-react-search-result-count">{props.resultCountMessage}</p>
                  ) : null}
                  <SearchResultList
                    canLoadMore={props.canLoadMore}
                    cards={viewModel.verseCards}
                    emptyMessage={props.emptyMessage}
                    hasMore={props.hasMore}
                    onDetailsTrigger={(node) => {
                      detailsTriggerRef.current = node
                      if (node && window.matchMedia('(max-width: 767px)').matches) {
                        mobileResultsScrollTopRef.current = window.scrollY
                      }
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
                      const scrollTop = mobileResultsScrollTopRef.current
                      mobileResultsScrollTopRef.current = null
                      if (scrollTop !== null && window.matchMedia('(max-width: 767px)').matches) {
                        window.scrollTo({ behavior: 'auto', top: scrollTop })
                      }
                      const trigger = detailsTriggerRef.current
                      window.setTimeout(() => trigger?.focus(), 0)
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
            content:
              previewLane && props.answerPreview ? (
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
            content:
              previewLane && props.answerPreview ? (
                <PreviewOnlyTabPanel
                  allMatchesOpen={props.allMatchesOpen}
                  loadingAllMatches={props.loadingAllMatches}
                  onOpenAllMatches={props.onOpenAllMatches}
                  onOpenOverview={() => openTab('overview')}
                  preview={props.answerPreview}
                  tab="sources"
                />
              ) : (
                <SearchSourcePanel packVersion={props.packVersion} sources={viewModel.sources} />
              ),
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
  function showAllMatches() {
    onOpenOverview()
    onOpenAllMatches()
  }

  return (
    <Status
      action={
        <>
          <Button onClick={onOpenOverview} size="sm" variant="primary">
            View Overview
          </Button>
          {!allMatchesOpen ? (
            <Button disabled={loadingAllMatches} onClick={showAllMatches} size="sm" variant="secondary">
              {loadingAllMatches ? 'Loading matches' : 'Show all matches'}
            </Button>
          ) : (
            <span className="qar:text-xs qar:text-muted">All matches are open on Overview.</span>
          )}
        </>
      }
      description={`${preview.query} is loaded as an answer preview. This tab has no separate result window for the preview state. Open Overview for supported answers and best evidence. Use Show all matches to expand the source-backed matches.`}
      title={previewOnlyTitle(tab)}
      tone="info"
    />
  )
}

function previewOnlyTitle(tab: 'verses' | 'explore' | 'sources'): string {
  if (tab === 'verses') return 'Verses use All matches for this preview'
  if (tab === 'explore') return 'Explore is not loaded for this preview'
  return 'Sources are summarized on Overview'
}
