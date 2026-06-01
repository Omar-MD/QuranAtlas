import type { Meta, StoryObj } from '@storybook/react-vite'

import { SearchIndexGate } from './SearchIndexGate'
import { SearchResultDetail } from './SearchResultDetail'
import { SavedSearchesNavPanel } from './SavedSearchesNavPanel'
import { SearchWorkspace } from './SearchWorkspace'
import type { SearchBriefDto, SearchResultDto } from '../../search/schema'
import type { SavedSearchRecord } from '../../storage/types'
import { deriveSearchOutputViewModel, type SearchWorkspaceTab } from './search-presentation-model'

const meta = {
  title: 'React Search/Search',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <main className="qar:grid qar:gap-5 qar:p-5" aria-label="Search">
      <h1 className="qar:m-0 qar:text-2xl">Search</h1>
      <SearchIndexGate ready={false} />
    </main>
  ),
}

export const Loading: Story = {
  render: () => (
    <main className="qar:p-5" aria-label="Search">
      <SearchIndexGate message="Loading search index" ready={false} />
    </main>
  ),
}

export const OverviewBroad: Story = {
  render: () => <WorkspaceStory activeTab="overview" brief={fixtureBrief} results={[fixtureResult, fixtureArabicResult]} />,
}

export const OverviewMorphology: Story = {
  render: () => <WorkspaceStory activeTab="overview" brief={fixtureMorphologyBrief} results={[fixtureMorphologyResult]} />,
}

export const VersesReference: Story = {
  render: () => <WorkspaceStory activeTab="verses" brief={fixtureReferenceBrief} defaultTab="verses" results={[fixtureArabicResult]} selectedResult={fixtureArabicResult} />,
}

export const VersesPhrase: Story = {
  render: () => <WorkspaceStory activeTab="verses" brief={fixturePhraseBrief} defaultTab="verses" results={[fixtureArabicResult]} selectedResult={fixtureArabicResult} />,
}

export const ExploreMissingPacks: Story = {
  render: () => (
    <WorkspaceStory
      activeTab="explore"
      brief={{
        ...fixtureBrief,
        featureAvailability: fixtureBrief.featureAvailability.map((feature) => ({ ...feature, status: 'missing' })),
      }}
      results={[fixtureResult]}
    />
  ),
}

export const Sources: Story = {
  render: () => <WorkspaceStory activeTab="sources" brief={fixtureBrief} results={[fixtureResult]} />,
}

export const DetailsNoMapping: Story = {
  render: () => {
    const noMappingResult = { ...fixtureResult, canOpenInRead: false, mappingState: 'hafs-source-only' as const, readerRefs: [] }
    return <WorkspaceStory activeTab="verses" brief={fixtureBrief} results={[noMappingResult]} selectedResult={noMappingResult} />
  },
}

export const MobileDetails: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => (
    <main className="qar:max-w-sm qar:p-4" aria-label="Search">
      <SearchResultDetail
        details={deriveSearchOutputViewModel({
          brief: fixtureBrief,
          defaultTab: 'verses',
          hasMoreResults: false,
          results: [fixtureResult],
          selectedResult: fixtureResult,
        }).details}
        onClose={() => undefined}
      />
    </main>
  ),
}

export const SavedSearches: Story = {
  render: () => (
    <main className="qar:max-w-xs qar:p-5" aria-label="Search">
      <SavedSearchesNavPanel onDelete={() => undefined} onLoad={() => undefined} onRename={() => undefined} records={[fixtureSavedSearch]} />
    </main>
  ),
}

export const NoMapping: Story = {
  render: () => {
    const noMappingResult = { ...fixtureResult, canOpenInRead: false, mappingState: 'hafs-source-only' as const, readerRefs: [] }
    return <WorkspaceStory activeTab="verses" brief={fixtureBrief} results={[noMappingResult]} selectedResult={noMappingResult} />
  },
}

export const OfflineUnavailable: Story = {
  render: () => (
    <main className="qar:p-5" aria-label="Search">
      <SearchIndexGate message="Search data is not available on this device." ready={false} />
    </main>
  ),
}

function WorkspaceStory({
  activeTab,
  brief,
  defaultTab = 'overview',
  results,
  selectedResult = null,
}: {
  activeTab: SearchWorkspaceTab
  brief: SearchBriefDto
  defaultTab?: SearchWorkspaceTab
  results: SearchResultDto[]
  selectedResult?: SearchResultDto | null
}) {
  return (
    <main className="qar:grid qar:gap-4 qar:p-5" aria-label="Search">
      <SearchWorkspace
        activeTab={activeTab}
        brief={brief}
        canLoadMore={false}
        defaultTab={defaultTab}
        emptyMessage="No results match this search."
        exploreGraph={{ error: null, loading: false, resultId: null, sections: [] }}
        exploreSeedResult={null}
        focusedExploreModule={null}
        hasMore={false}
        onActiveTabChange={() => undefined}
        onFocusExploreModule={() => undefined}
        onLoadExploreGraph={() => undefined}
        onLoadMore={() => undefined}
        onOpenInRead={() => undefined}
        onOpenResultExplore={() => undefined}
        onSelectResult={() => undefined}
        packVersion={brief.sourceFrame.packVersion}
        resultCountMessage={`${brief.counts.shownWindowCount} shown results`}
        results={results}
        selectedResult={selectedResult}
      />
    </main>
  )
}

const fixtureResult: SearchResultDto = {
  resultId: 'result-2-255',
  sourceRef: '2:255',
  readerRefs: ['2:255'],
  mappingState: 'corresponding-ayah-in-reader',
  canOpenInRead: true,
  canHighlightWordsInRead: false,
  matchLanes: ['translation'],
  matchEvidence: {
    lane: 'translation',
    matchedQueryToken: 'Allah',
    matchedSourceToken: 'allah',
    normalizedTokens: ['allah'],
    translationContextExcerpt: 'Allah - there is no deity except Him, the Ever-Living...',
    whyMatched: 'The query token occurs in the indexed translation/context text.',
  },
  snippet: 'Allah - there is no deity except Him, the Ever-Living...',
  rankKey: 'translation:2:255',
  sourceText: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.',
  readerText: 'ٱللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
}

const fixtureArabicResult: SearchResultDto = {
  ...fixtureResult,
  resultId: 'result-1-1',
  sourceRef: '1:1',
  readerRefs: ['1:1'],
  matchLanes: ['phrase'],
  matchEvidence: {
    lane: 'phrase',
    matchedText: 'بسم الله',
    matchedQueryTokens: ['بسم', 'الله'],
    matchedSourceTokens: ['بسم', 'الله'],
    normalizedTokens: ['بسم', 'الله'],
    sourcePosition: 0,
    phraseLength: 2,
    whyMatched: 'The exact source phrase occurs in this source ayah.',
  },
  snippet: 'بسم الله الرحمن الرحيم',
  rankKey: 'phrase:1:1',
  sourceText: 'بسم الله الرحمن الرحيم',
  readerText: undefined,
}

const fixtureMorphologyResult: SearchResultDto = {
  ...fixtureArabicResult,
  resultId: 'result-root-1-1',
  matchLanes: ['same-root'],
  matchEvidence: {
    lane: 'same-root',
    matchedText: 'ٱللَّهِ',
    matchedQueryToken: 'الله',
    matchedSourceToken: 'ٱللَّهِ',
    normalizedTokens: ['الله'],
    wordPosition: 2,
    morphology: {
      sourceToken: 'ٱللَّهِ',
      root: 'اله',
      lemma: 'ٱللَّه',
      rowId: '1:2',
    },
    whyMatched: 'The same QAC morphology root occurs in this Hafs source ayah.',
  },
  snippet: 'ٱللَّهِ',
  sourceText: 'ٱللَّهِ',
  morphology: {
    sourceNote: 'Search analysis uses Hafs/Tanzil text for word forms, roots, morphology, and wording patterns.',
    root: 'اله',
    lemma: 'ٱللَّه',
    sourceToken: 'ٱللَّهِ',
    transliteration: 'llahi',
    wordPosition: 2,
    tokenOrdinal: 2,
    sameRootCount: 2699,
    sameWrittenFormCount: 2699,
    lemmaCount: 2699,
  },
}

const fixtureBrief: SearchBriefDto = {
  query: {
    rawText: 'Allah',
    normalizedText: 'allah',
    tokens: ['allah'],
    mode: 'translation',
    sourceLanes: ['translation'],
  },
  counts: {
    matchedSourceAyahCount: 18,
    matchedResultCount: 114,
    shownWindowCount: 25,
    occurrenceCount: 114,
    occurrenceCountKnown: true,
    aggregateStatus: 'full',
  },
  sourceFrame: {
    packId: 'qa-search-core-hafs-v1',
    packVersion: '1.0.0',
    contentHash: '30de5b0bf847be88e4ec316863517a01',
    sourceRiwayah: 'hafs',
    sourceIds: ['tanzil-hafs', 'bridges-translation'],
    licenseIds: ['tanzil-permissive', 'bridges-attribution'],
    normalizerVersion: 1,
    queryAstVersion: 1,
    rankVersion: 'phase-1-rank-v1',
  },
  laneCounts: [
    { lane: 'translation', matchedSourceAyahCount: 18, matchedResultCount: 114, occurrenceCount: 114, occurrenceCountKnown: true },
    { lane: 'arabic-text', matchedSourceAyahCount: 3, matchedResultCount: 3, occurrenceCount: 3, occurrenceCountKnown: true },
  ],
  distribution: {
    firstRef: '1:1',
    lastRef: '112:1',
    surahsWithMostIndexedMatches: [
      { surah: 2, matchedSourceAyahCount: 4, occurrenceCount: 14 },
      { surah: 3, matchedSourceAyahCount: 3, occurrenceCount: 10 },
      { surah: 1, matchedSourceAyahCount: 2, occurrenceCount: 6 },
    ],
  },
  evidenceTypes: ['translation-context', 'arabic-text'],
  representativeRefs: [
    { label: 'top-ranked', ref: '2:255' },
    { label: 'first-in-mushaf-order', ref: '1:1' },
    { label: 'different-surah-example', ref: '112:1' },
    { label: 'translation-context-example', ref: '2:255' },
  ],
  mappingStateCounts: { 'corresponding-ayah-in-reader': 114 },
  featureAvailability: [
    { section: 'morphology', status: 'available' },
    { section: 'same-written-form', status: 'available' },
    { section: 'same-root', status: 'available' },
    { section: 'lemma', status: 'available' },
    { section: 'following-wording', status: 'available' },
    { section: 'shared-wording', status: 'available' },
    { section: 'repeated-phrases', status: 'available' },
    { section: 'occurs-once', status: 'available' },
    { section: 'ayah-endings', status: 'available' },
    { section: 'counts-patterns', status: 'offline-unavailable' },
  ],
  sourceNotes: [
    {
      id: 'search-source-boundary',
      label: 'Search source boundary',
      text: 'Arabic matches are from the Hafs/Tanzil Search source. Reader opening uses validated mapping when available.',
    },
    {
      id: 'translation-context-not-tafsir',
      label: 'Translation/context boundary',
      text: 'Translation/context matches are indexed translation/context evidence, not tafsir and not a claim that Arabic wording shares one meaning.',
    },
  ],
}

const fixtureMorphologyBrief: SearchBriefDto = {
  ...fixtureBrief,
  query: {
    rawText: 'الله',
    normalizedText: 'الله',
    tokens: ['الله'],
    mode: 'same-root',
    sourceLanes: ['arabic-text'],
    morphologyMode: 'same-root',
  },
  counts: {
    matchedSourceAyahCount: 2699,
    matchedResultCount: 2699,
    shownWindowCount: 1,
    occurrenceCount: 2699,
    occurrenceCountKnown: true,
    aggregateStatus: 'full',
  },
  evidenceTypes: ['same-root'],
  sourceNotes: [
    fixtureBrief.sourceNotes[0],
    {
      id: 'same-root-not-interpretation',
      label: 'Same-root boundary',
      text: 'Same-root results are QAC morphology evidence in the Hafs Search index. Shared root does not mean shared interpretation, ruling, topic, or rhetorical purpose.',
    },
  ],
}

const fixtureReferenceBrief: SearchBriefDto = {
  ...fixtureBrief,
  query: {
    rawText: '1:1',
    normalizedText: '1:1',
    tokens: [],
    mode: 'all',
    sourceLanes: ['arabic-text'],
  },
  counts: {
    matchedSourceAyahCount: 1,
    matchedResultCount: 1,
    shownWindowCount: 1,
    occurrenceCount: null,
    occurrenceCountKnown: false,
    aggregateStatus: 'full',
  },
  evidenceTypes: ['reference'],
}

const fixturePhraseBrief: SearchBriefDto = {
  ...fixtureBrief,
  query: {
    rawText: 'بسم الله',
    normalizedText: 'بسم الله',
    tokens: ['بسم', 'الله'],
    mode: 'phrase',
    sourceLanes: ['arabic-text'],
  },
  counts: {
    matchedSourceAyahCount: 1,
    matchedResultCount: 1,
    shownWindowCount: 1,
    occurrenceCount: 1,
    occurrenceCountKnown: true,
    aggregateStatus: 'full',
  },
  evidenceTypes: ['exact-source-phrase'],
}

const fixtureSavedSearch: SavedSearchRecord = {
  id: 'saved-mercy',
  schemaVersion: 1,
  intent: {
    schemaVersion: 1,
    id: 'saved-mercy',
    name: 'Mercy',
    queryText: 'mercy',
    queryMode: 'translation',
    queryAstVersion: 1,
    filters: { sourceLane: ['translation'] },
    sourceLanes: ['translation'],
    sort: 'relevance',
    compatiblePackRequirements: { packAbiMajor: 1, normalizerVersion: 1, requiredFeatures: ['core'] },
    displayPreferences: { showSourceNotes: true },
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: null,
  },
  packCompatibilityKey: 'search-pack-abi-1-normalizer-1',
  createdAt: 1,
  updatedAt: 1,
  lastOpenedAt: null,
  lastRunAt: null,
}
