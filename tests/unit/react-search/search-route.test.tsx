import userEvent from '@testing-library/user-event'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchRouteState } from '../../../src/components/search/useSearchRouteState'
import { defaultTabForParsedSearch } from '../../../src/components/search/search-presentation-model'
import type { VerseAliases } from '../../../src/data/verse-aliases'
import type { SearchClient } from '../../../src/search/client'
import {
  SEARCH_FOLLOWING_WORDING_NOTE,
  SEARCH_OCCURS_ONCE_NOTE,
  SEARCH_SHARED_WORDING_NOTE,
  SEARCH_WORDING_NOTE,
} from '../../../src/search/graph'
import { parseSearchQuery } from '../../../src/search/query-parser'
import type { SearchBriefDto, SearchResultCursor, SearchResultDto } from '../../../src/search/schema'
import type { SavedSearchRecord } from '../../../src/storage/types'
import type { AnswerPreview, MatchCardLite } from '../../../shared/search'

const mockUseSearchRouteState = vi.fn<[], SearchRouteState>()
let mockReaderRiwayah: 'hafs' | 'qaloon' = 'hafs'
let mockVerseAliases: VerseAliases = {}
const mockSaved = {
  deleteSearch: vi.fn(),
  openSearch: vi.fn(),
  records: [] as SavedSearchRecord[],
  refresh: vi.fn(),
  renameSearch: vi.fn(),
  saveSearch: vi.fn(),
  status: '',
}

vi.mock('../../../src/components/search/useSearchRouteState', () => ({
  useSearchRouteState: () => mockUseSearchRouteState(),
}))

vi.mock('../../../src/components/search/useSavedSearches', () => ({
  useSavedSearches: () => mockSaved,
}))

vi.mock('../../../src/storage/db', () => ({
  openReactDb: vi.fn(async () => ({
    settings: {
      get: vi.fn(async (key: string) => (key === 'riwayah' ? { value: mockReaderRiwayah } : undefined)),
    },
  })),
}))

vi.mock('../../../src/data/verse-aliases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/data/verse-aliases')>()
  return {
    ...actual,
    loadVerseAliases: vi.fn(async () => ({ aliases: mockVerseAliases })),
  }
})

import { SearchShell } from '../../../src/components/search/SearchShell'

function result(overrides: Partial<SearchResultDto> = {}): SearchResultDto {
  return {
    resultId: 'result-1',
    sourceRef: '2:255',
    readerRefs: ['2:255'],
    mappingState: 'corresponding-ayah-in-reader',
    canOpenInRead: true,
    canHighlightWordsInRead: false,
    matchLanes: ['translation'],
    matchEvidence: {
      lane: 'translation',
      matchedQueryToken: 'Allah',
      matchedSourceToken: 'Allah',
      normalizedTokens: ['allah'],
      translationContextExcerpt: 'Allah - there is no deity except Him',
      whyMatched: 'The query token occurs in the indexed translation/context text.',
    },
    snippet: 'Allah - there is no deity except Him',
    rankKey: 'translation:2:255',
    sourceText: 'Allah - there is no deity except Him, the Ever-Living...',
    readerText: 'ٱللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
    ...overrides,
  }
}

function brief(overrides: Partial<SearchBriefDto> = {}): SearchBriefDto {
  return {
    query: {
      rawText: 'mercy',
      normalizedText: 'mercy',
      tokens: ['mercy'],
      mode: 'translation',
      sourceLanes: ['translation'],
    },
    counts: {
      matchedSourceAyahCount: 1,
      matchedResultCount: 1,
      shownWindowCount: 1,
      occurrenceCount: 1,
      occurrenceCountKnown: true,
      aggregateStatus: 'full',
    },
    sourceFrame: {
      packId: 'qa-search-core-hafs-v1',
      packVersion: '1.0.0',
      contentHash: '30de5b0bf847be88e4ec316863517a01',
      sourceRiwayah: 'hafs',
      sourceIds: ['tanzil-hafs'],
      licenseIds: ['tanzil-permissive'],
      normalizerVersion: 1,
      queryAstVersion: 1,
      rankVersion: 'phase-1-rank-v1',
    },
    laneCounts: [{
      lane: 'translation',
      matchedSourceAyahCount: 1,
      matchedResultCount: 1,
      occurrenceCount: 1,
      occurrenceCountKnown: true,
    }],
    distribution: {
      firstRef: '2:255',
      lastRef: '2:255',
      surahsWithMostIndexedMatches: [{ surah: 2, matchedSourceAyahCount: 1, occurrenceCount: 1 }],
    },
    evidenceTypes: ['translation-context'],
    representativeRefs: [{ label: 'top-ranked', ref: '2:255' }],
    mappingStateCounts: { 'corresponding-ayah-in-reader': 1 },
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
      { section: 'counts-patterns', status: 'available' },
    ],
    sourceNotes: [
      {
        id: 'search-source-boundary',
        label: 'Search source boundary',
        text: 'Search analysis uses the Hafs analytical Search source; Reader opening resolves the active riwayah at click time.',
      },
      {
        id: 'translation-context-not-tafsir',
        label: 'Translation/context boundary',
        text: 'Translation/context matches are indexed search hints, not tafsir or generated interpretation.',
      },
      {
        id: 'same-root-not-interpretation',
        label: 'Same-root boundary',
        text: 'Same-root matches are morphology evidence, not a claim that two ayat mean the same thing.',
      },
    ],
    ...overrides,
  }
}

function routeState(overrides: Partial<SearchRouteState> = {}): SearchRouteState {
  return {
    error: null,
    emptyResultMessage: 'Enter a word, phrase, or ayah reference. Save only the searches you want to keep.',
    mode: 'all',
    packMessage: 'Search data is ready on this device.',
    packState: 'active',
    packVersion: '1.0.0',
    query: '',
    activeWorkspaceTab: 'overview',
    answerPreview: null,
    allMatches: [],
    allMatchesOpen: false,
    brief: null,
    canLoadAllMatches: false,
    defaultWorkspaceTab: 'overview',
    exploreSeedResult: null,
    focusedExploreModule: null,
    loadingAllMatches: false,
    resultCountMessage: '',
    results: [],
    searchStatus: 'Search data is ready on this device.',
    selectedResult: null,
    hasMoreResults: false,
    canLoadMoreResults: false,
    exploreGraph: { error: null, loading: false, resultId: null, sections: [] },
    loadExploreGraph: vi.fn(),
    loadMoreResults: vi.fn(),
    loadMoreAllMatches: vi.fn(),
    openAllMatches: vi.fn(),
    openResultExplore: vi.fn(),
    setActiveWorkspaceTab: vi.fn(),
    setExploreSeedResult: vi.fn(),
    setFocusedExploreModule: vi.fn(),
    setMode: vi.fn(),
    setQuery: vi.fn(),
    setSelectedResult: vi.fn(),
    submitSearch: vi.fn(),
    ...overrides,
  }
}

describe('Search route UI', () => {
  beforeEach(() => {
    window.location.hash = '#/search'
    mockReaderRiwayah = 'hafs'
    mockVerseAliases = {}
    mockSaved.records = []
    mockSaved.status = ''
    vi.clearAllMocks()
  })

  it('renders the shipped Search shell with Overview workspace copy and query Sources ledger', async () => {
    const selected = result()
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      brief: brief(),
      defaultWorkspaceTab: 'overview',
      query: 'mercy',
      resultCountMessage: '1 matched source ayah, 1 indexed occurrence',
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    expect(screen.getByRole('main', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search Quran text, translation, or context')).toHaveAttribute('placeholder', 'Search...')
    expect(screen.getByRole('tab', { name: 'Search mode: Exact word form' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Search mode: Same root' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Search result workspace' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'mercy' })).toBeInTheDocument()
    expect(screen.getByText('Occurrences in this search index')).toBeInTheDocument()
    expect(screen.getAllByText('all indexed matches').length).toBeGreaterThan(0)
    expect(screen.getByText(/not necessarily exact Arabic wording/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open in Read' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Sources' }))
    expect(mockUseSearchRouteState.mock.results[0]?.value.setActiveWorkspaceTab).toHaveBeenCalledWith('sources')
  })

  it('renders AnswerPreview claims, evidence regions, and opens All Matches explicitly', async () => {
    const openAllMatches = vi.fn()
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      answerPreview: answerPreviewWithClaims(),
      openAllMatches,
      query: 'mercy',
      resultCountMessage: '1 best evidence card',
    }))

    render(<SearchShell />)

    expect(screen.getByRole('heading', { name: 'mercy' })).toBeInTheDocument()
    expect(screen.getByText('The indexed translation renders mercy language for this query.')).toBeInTheDocument()
    expect(screen.queryByText('This unsupported claim must not render.')).not.toBeInTheDocument()
    expect(screen.getByText('1 citation · Translation renders')).toBeInTheDocument()

    const basis = screen.getByRole('region', { name: 'Evidence basis' })
    expect(within(basis).getByText('Translation')).toBeInTheDocument()
    expect(within(basis).getByText('Used')).toBeInTheDocument()
    expect(within(basis).getByText(/Translation evidence was used/i)).toBeInTheDocument()

    const bestEvidence = screen.getByRole('region', { name: 'Best evidence' })
    expect(within(bestEvidence).getByText('Allah - there is no deity except Him')).toBeInTheDocument()
    expect(within(bestEvidence).getByText('The indexed translation contains the query.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show all matches' }))
    expect(openAllMatches).toHaveBeenCalledTimes(1)
  })

  it('renders a reference Ask preview on Overview instead of an empty Verses panel', () => {
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      answerPreview: answerPreview({
        id: 'preview-reference',
        query: '2:255',
        queryUnderstanding: {
          ...answerPreview().queryUnderstanding,
          originalQuery: '2:255',
          normalizedQuery: '2:255',
          intent: 'open-reference',
          lens: 'reference',
        },
        searchPlan: {
          primaryLens: 'reference',
          lanes: [{ id: 'reference', sourceKinds: ['quran-text'], queryForm: '2:255', status: 'executed' }],
          excludedSources: [],
        },
        mode: 'evidence-only',
        answerability: {
          status: 'evidence-only',
          renderPermission: 'no-answer-claims',
          reasons: ['insufficient-evidence'],
        },
        claims: [],
        claimSupports: [],
        evidenceCards: [],
      }),
      defaultWorkspaceTab: 'overview',
      emptyResultMessage: 'No results match this search.',
      query: '2:255',
    }))

    render(<SearchShell />)

    expect(screen.getByRole('heading', { name: '2:255' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Evidence basis' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Best evidence' })).toBeInTheDocument()
    expect(screen.queryByText('No results match this search.')).not.toBeInTheDocument()
  })

  it('renders evidence-only recovery without answer claim prose', () => {
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      answerPreview: answerPreviewWithClaims({
        answerability: {
          status: 'evidence-only',
          renderPermission: 'no-answer-claims',
          reasons: ['absence-claim-unproven'],
        },
        mode: 'evidence-only',
        claims: [],
        claimSupports: [],
        evidenceCards: [],
        recovery: {
          message: 'This v1 search can show related evidence, but it cannot answer absence claims as prose.',
          suggestedQueries: [],
          actions: ['show-related-evidence'],
        },
      }),
      query: 'Where does the Quran never mention sleep?',
    }))

    render(<SearchShell />)

    expect(screen.getByText('This v1 search can show related evidence, but it cannot answer absence claims as prose.')).toBeInTheDocument()
    expect(screen.queryByText('The indexed translation renders mercy language for this query.')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Evidence basis' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Best evidence' })).toBeInTheDocument()
  })

  it('renders the All Matches region and loads more matches on request', async () => {
    const loadMoreAllMatches = vi.fn()
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      allMatches: [
        matchCard({ id: 'match-2-255', refLabel: '2:255' }),
        matchCard({ id: 'match-3-7', refLabel: '3:7', snippet: 'It is He who has sent down to you the Book...' }),
      ],
      allMatchesOpen: true,
      answerPreview: answerPreviewWithClaims(),
      canLoadAllMatches: true,
      loadMoreAllMatches,
      query: 'mercy',
    }))

    render(<SearchShell />)

    const allMatches = screen.getByRole('region', { name: 'All matches' })
    expect(within(allMatches).getByText('2:255')).toBeInTheDocument()
    expect(within(allMatches).getByText('It is He who has sent down to you the Book...')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show all matches' })).not.toBeInTheDocument()

    await userEvent.click(within(allMatches).getByRole('button', { name: 'Load more matches' }))
    expect(loadMoreAllMatches).toHaveBeenCalledTimes(1)
  })

  it('opens preview Reader actions through validated Reader mapping and hides unavailable Reader actions', async () => {
    mockReaderRiwayah = 'qaloon'
    mockVerseAliases = { '3': [{ hafs: 7, warsh: 7, qaloon: 8 }] }
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      answerPreview: answerPreviewWithClaims({
        evidenceCards: [
          {
            ...answerPreviewWithClaims().evidenceCards[0],
            id: 'evidence-3-7',
            refLabel: '3:7',
            readerAction: { type: 'open-source-in-reader', sourceRef: '3:7', mappingWarning: 'Reader opens the mapped ayah only.' },
          },
          {
            ...answerPreviewWithClaims().evidenceCards[0],
            id: 'evidence-4-1',
            refLabel: '4:1',
            readerAction: { type: 'unavailable', reason: 'No safe Reader mapping is available.' },
          },
        ],
      }),
      query: 'mercy',
    }))

    render(<SearchShell />)

    const unavailableCard = screen.getByRole('article', { name: 'Evidence 4:1' })
    expect(within(unavailableCard).queryByRole('button', { name: 'Open in Reader' })).not.toBeInTheDocument()
    expect(screen.getByText('Reader opens the mapped ayah only.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open in Reader' }))
    await waitFor(() => expect(window.location.hash).toBe('#/s/3/8'))
  })

  it('does not navigate preview Reader actions with impossible source refs', async () => {
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'overview',
      answerPreview: answerPreviewWithClaims({
        evidenceCards: [{
          ...answerPreviewWithClaims().evidenceCards[0],
          id: 'evidence-invalid-ref',
          refLabel: '2:999',
          readerAction: { type: 'open-source-in-reader', sourceRef: '2:999' },
        }],
      }),
      query: 'mercy',
    }))

    render(<SearchShell />)

    await userEvent.click(screen.getByRole('button', { name: 'Open in Reader' }))
    expect(window.location.hash).toBe('#/search')
  })

  it('renders query-level Sources when that workspace tab is active', () => {
    const selected = result()
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'sources',
      brief: brief(),
      query: 'mercy',
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    expect(screen.getByText('Pack id')).toBeInTheDocument()
    expect(screen.getByText('qa-search-core-hafs-v1')).toBeInTheDocument()
    expect(screen.getByText('Pack hash')).toBeInTheDocument()
    expect(screen.getByText('Normalizer version')).toBeInTheDocument()
    expect(screen.getByText('Reader mapping summary')).toBeInTheDocument()
    expect(screen.getAllByText(/Translation\/context matches are indexed search hints/i).length).toBeGreaterThan(0)
  })

  it('shows selected-result morphology only after explicit Explore seeding', () => {
    const selected = result({
      matchLanes: ['same-root'],
      matchEvidence: {
        lane: 'same-root',
        matchedText: 'الله',
        matchedQueryToken: 'الله',
        matchedSourceToken: 'الله',
        normalizedTokens: ['الله'],
        wordPosition: 1,
        morphology: {
          sourceToken: 'الله',
          root: 'Alh',
          lemma: '{ll~ah',
        },
        whyMatched: 'The same QAC morphology root occurs in this Hafs source ayah.',
      },
      canHighlightWordsInRead: false,
      morphology: {
        sourceNote: 'Search analysis uses Hafs/Tanzil text for word forms, roots, morphology, and wording patterns. Open in Read resolves the active Reader riwayah at click time.',
        root: 'Alh',
        lemma: '{ll~ah',
        sourceToken: 'الله',
        transliteration: '{ll~ah',
        wordPosition: 1,
        tokenOrdinal: 0,
        sameRootCount: 2,
        sameWrittenFormCount: 2,
        lemmaCount: 2,
      },
    })
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'explore',
      brief: brief({
        query: {
          rawText: 'الله',
          normalizedText: 'الله',
          tokens: ['الله'],
          mode: 'same-root',
          sourceLanes: ['arabic-text'],
          morphologyMode: 'same-root',
        },
        evidenceTypes: ['same-root'],
      }),
      mode: 'same-root',
      query: 'الله',
      exploreSeedResult: selected,
      focusedExploreModule: 'selected-token',
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    expect(screen.getByText('Forms by count')).toBeInTheDocument()
    expect(screen.getByText('Selected-token morphology details')).toBeInTheDocument()
    expect(screen.getAllByText('Same root').length).toBeGreaterThan(0)
    expect(screen.getByText('Alh')).toBeInTheDocument()
    expect(screen.getByText('Word-level match not available in Reader text')).toBeInTheDocument()
  })

  it('keeps Explore visible with a concise empty state when no modules are available', () => {
    const selected = result({
      matchLanes: ['arabic-text'],
      matchEvidence: {
        lane: 'arabic-text',
        matchedText: 'الله',
        matchedQueryToken: 'الله',
        matchedSourceToken: 'الله',
        normalizedTokens: ['الله'],
        whyMatched: 'The query token occurs in the indexed Hafs source text.',
      },
    })
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'explore',
      brief: brief({
        query: {
          rawText: 'الله',
          normalizedText: 'الله',
          tokens: ['الله'],
          mode: 'arabic-text',
          sourceLanes: ['arabic-text'],
        },
        evidenceTypes: ['arabic-text'],
        distribution: {
          firstRef: null,
          lastRef: null,
          surahsWithMostIndexedMatches: [],
        },
        featureAvailability: brief().featureAvailability.map((feature) => ({ ...feature, status: 'missing' })),
      }),
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    expect(screen.getByText('No Explore modules are available for this query.')).toBeInTheDocument()
  })

  it('loads memory graph Explore sections on demand with exact source notes and accessible disclosures', async () => {
    const selected = result({
      matchLanes: ['phrase'],
      snippet: 'بسم الله الرحمن الرحيم',
      matchEvidence: {
        lane: 'phrase',
        matchedText: 'بسم الله',
        matchedQueryTokens: ['بسم', 'الله'],
        matchedSourceTokens: ['بسم', 'الله'],
        normalizedTokens: ['بسم', 'الله'],
        phraseLength: 2,
        whyMatched: 'The exact phrase occurs in the indexed Hafs source text within one ayah.',
      },
    })
    const loadExploreGraph = vi.fn()
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'explore',
      brief: brief({
        query: {
          rawText: 'بسم الله',
          normalizedText: 'بسم الله',
          tokens: ['بسم', 'الله'],
          mode: 'phrase',
          sourceLanes: ['arabic-text'],
        },
        evidenceTypes: ['exact-source-phrase'],
        sourceNotes: [
          {
            id: 'search-source-boundary',
            label: 'Search source boundary',
            text: 'Search analysis uses the Hafs analytical Search source; Reader opening resolves the active riwayah at click time.',
          },
          {
            id: 'following-wording-not-generated',
            label: 'Following wording boundary',
            text: SEARCH_FOLLOWING_WORDING_NOTE,
          },
        ],
      }),
      mode: 'phrase',
      query: 'بسم الله',
      exploreSeedResult: selected,
      focusedExploreModule: 'selected-token',
      results: [selected],
      selectedResult: selected,
      loadExploreGraph,
      exploreGraph: {
        error: null,
        loading: false,
        resultId: selected.resultId,
        sections: [
          {
            id: 'following-wording',
            title: 'Attested following wording',
            note: SEARCH_FOLLOWING_WORDING_NOTE,
            sourcePolicy: [{ label: 'Boundary policy', value: 'Phrase windows stay within one ayah and one surah.' }],
            rows: [{ phrase: 'بسم الله', followers: [{ token: 'الرحمن', count: 1, refs: [{ ref: '1:1', position: 0, phraseLength: 2 }] }] }],
            cursor: null,
          },
          {
            id: 'shared-wording',
            title: 'Shared wording',
            note: SEARCH_SHARED_WORDING_NOTE,
            sourcePolicy: [{ label: 'Source text', value: 'Indexed Hafs Search text' }],
            rows: [{ ref: '2:255', sharedTokenCount: 1, sharedTokens: ['الله'] }],
            cursor: null,
          },
          {
            id: 'repeated-phrases',
            title: 'Repeated phrases',
            sourcePolicy: [],
            rows: [{ phrase: 'بسم الله', count: 2, refs: [{ ref: '1:1', position: 0 }] }],
            cursor: null,
          },
          {
            id: 'occurs-once',
            title: 'Occurs once in this index',
            note: SEARCH_OCCURS_ONCE_NOTE,
            sourcePolicy: [],
            rows: [{ phrase: 'الله الرحمن', count: 1, refs: [{ ref: '1:1', position: 1 }] }],
            cursor: null,
          },
          {
            id: 'ayah-endings',
            title: 'Ayah endings',
            sourcePolicy: [],
            rows: [{ phrase: 'الرحيم', length: 1, countInIndex: 1 }],
            cursor: null,
          },
          {
            id: 'counts-patterns',
            title: 'Counts & patterns',
            sourcePolicy: [],
            summary: {
              tokenCounts: { totalTokens: 9, uniqueTokens: 7 },
              phraseCounts: [{ length: 2, count: 4 }],
              rootCounts: [{ root: 'Alh', count: 2 }],
              surahDistribution: [{ surah: 1, ayahCount: 1, tokenCount: 4 }],
              ayahEndings: [{ term: 'الرحيم', count: 1 }],
              adjacencyCounts: { ayahsWithSharedWording: 1, sharedEdges: 1 },
            },
            cursor: null,
          },
        ],
      },
    }))

    render(<SearchShell />)
    expect(screen.getByText(SEARCH_WORDING_NOTE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh Explore sections' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attested following wording' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shared wording' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Counts & patterns' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh Explore sections' }))
    expect(loadExploreGraph).toHaveBeenCalledWith(selected)
    await userEvent.click(screen.getByRole('button', { name: 'Attested following wording' }))
    expect(screen.getAllByText(SEARCH_FOLLOWING_WORDING_NOTE).length).toBeGreaterThan(0)
    expect(screen.getByText('Phrase windows stay within one ayah and one surah.')).toBeInTheDocument()
  })

  it('uses Details as the primary action when Reader mapping is unavailable', () => {
    const noMapping = result({
      canOpenInRead: false,
      mappingState: 'hafs-source-only',
      readerRefs: [],
    })
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'verses',
      brief: brief(),
      results: [noMapping],
      selectedResult: noMapping,
    }))

    render(<SearchShell />)

    expect(screen.queryByRole('button', { name: 'Open in Read' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getAllByText('Search source only').length).toBeGreaterThan(0)
  })

  it('opens selected-token Explore only from the Details action', async () => {
    const selected = result()
    const openResultExplore = vi.fn()
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'verses',
      brief: brief(),
      openResultExplore,
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Explore selected result' }))

    expect(openResultExplore).toHaveBeenCalledWith(selected, 'selected-token')
  })

  it('navigates to Read only through a validated single Reader ref', async () => {
    const selected = result()
    mockUseSearchRouteState.mockReturnValue(routeState({ activeWorkspaceTab: 'verses', brief: brief(), results: [selected], selectedResult: selected }))

    render(<SearchShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open in Read' }))

    expect(window.location.hash).toBe('#/s/2/255')
  })

  it('does not navigate legacy result Reader actions with impossible source refs', async () => {
    const selected = result({
      resultId: 'result-invalid-ref',
      sourceRef: '2:999',
      readerRefs: ['2:999'],
      rankKey: 'translation:2:999',
      canOpenInRead: true,
    })
    mockUseSearchRouteState.mockReturnValue(routeState({
      activeWorkspaceTab: 'verses',
      brief: brief(),
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open in Read' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(window.location.hash).toBe('#/search')
  })

  it('loads a saved search and recomputes against the active Search index', async () => {
    const state = routeState()
    mockUseSearchRouteState.mockReturnValue(state)
    const savedRecord: SavedSearchRecord = {
      id: 'saved-1',
      schemaVersion: 1,
      intent: {
        schemaVersion: 1,
        id: 'saved-1',
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
    mockSaved.records = [savedRecord]
    mockSaved.openSearch.mockResolvedValue(savedRecord)

    render(<SearchShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    await userEvent.click(screen.getByRole('button', { name: 'Load saved search Mercy' }))

    await waitFor(() => expect(state.submitSearch).toHaveBeenCalledWith({ mode: 'translation', query: 'mercy' }))
  })
})

describe('Search workspace tab defaults', () => {
  it('uses fresh adaptive defaults from parsed query intent', () => {
    expect(defaultTabForParsedSearch(parseSearchQuery('2:255', { mode: 'all' }), 'all')).toBe('verses')
    expect(defaultTabForParsedSearch(parseSearchQuery('بسم الله', { mode: 'phrase' }), 'phrase')).toBe('verses')
    expect(defaultTabForParsedSearch(parseSearchQuery('\"بسم الله\"', { mode: 'all' }), 'all')).toBe('verses')
    expect(defaultTabForParsedSearch(parseSearchQuery('الله الرحمن', { mode: 'all' }), 'all')).toBe('overview')
    expect(defaultTabForParsedSearch(parseSearchQuery('الله', { mode: 'exact-word-form' }), 'exact-word-form')).toBe('overview')
    expect(defaultTabForParsedSearch(parseSearchQuery('mercy', { mode: 'translation' }), 'translation')).toBe('overview')
  })
})

describe('useSearchRouteState Ask route state', () => {
  beforeEach(() => {
    window.location.hash = '#/search'
    vi.clearAllMocks()
  })

  it('stores the Ask preview and clears the legacy result window on submit', async () => {
    const preview = answerPreview({ id: 'preview-mercy', query: 'mercy' })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({
      client,
      initialMode: 'translation',
      initialQuery: 'mercy',
    }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch())

    await waitFor(() => expect(result.current.answerPreview).toEqual(preview))
    expect(client.askPreview).toHaveBeenCalledWith({
      query: 'mercy',
      lens: 'translation',
      queryAst: expect.objectContaining({ mode: 'translation' }),
      sort: 'relevance',
    })
    expect(client.query).not.toHaveBeenCalled()
    expect(result.current.brief).toBeNull()
    expect(result.current.results).toEqual([])
    expect(result.current.selectedResult).toBeNull()
    expect(result.current.hasMoreResults).toBe(false)
    expect(result.current.searchStatus).toBe('1 best evidence card')
    expect(result.current.resultCountMessage).toBe('1 best evidence card')
  })

  it.each([
    { mode: 'all' as const, query: '2:255' },
    { mode: 'phrase' as const, query: 'بسم الله' },
  ])('defaults $query Ask preview submissions to the Overview workspace', async ({ mode, query }) => {
    const preview = answerPreview({ id: `preview-${mode}`, query })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({
      client,
      initialMode: mode,
      initialQuery: query,
    }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch())

    await waitFor(() => expect(result.current.answerPreview?.id).toBe(preview.id))
    expect(result.current.activeWorkspaceTab).toBe('overview')
    expect(result.current.defaultWorkspaceTab).toBe('overview')
    expect(window.location.hash).not.toContain('tab=verses')
  })

  it('restores an explicit Search tab from the URL while loading the Ask preview', async () => {
    window.location.hash = '#/search?q=mercy&tab=sources'
    const preview = answerPreview({ id: 'preview-restored-sources', query: 'mercy' })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({ client }))

    await waitFor(() => expect(result.current.answerPreview?.id).toBe(preview.id))
    expect(result.current.activeWorkspaceTab).toBe('sources')
    expect(result.current.defaultWorkspaceTab).toBe('overview')
    expect(client.askPreview).toHaveBeenCalledWith(expect.objectContaining({ query: 'mercy' }))
    expect(window.location.hash).toContain('tab=sources')
  })

  it.each([
    { mode: 'answer' as const, count: 2, expected: '2 best evidence cards' },
    { mode: 'partial-answer' as const, count: 1, expected: '1 evidence card with limits' },
    { mode: 'partial-answer' as const, count: 2, expected: '2 evidence cards with limits' },
  ])('pluralizes $mode Ask preview status copy for $count evidence cards', async ({ mode, count, expected }) => {
    const preview = answerPreview({
      id: `preview-${mode}-${count}`,
      mode,
      answerability: mode === 'answer'
        ? { status: 'answerable', reasons: [], renderPermission: 'answer-preview' }
        : { status: 'partially-answerable', reasons: ['insufficient-evidence'], renderPermission: 'answer-preview' },
      evidenceCards: evidenceCards(count),
    })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({
      client,
      initialMode: 'translation',
      initialQuery: 'mercy',
    }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch())

    await waitFor(() => expect(result.current.searchStatus).toBe(expected))
    expect(result.current.resultCountMessage).toBe(expected)
  })

  it.each([
    { mode: 'exact-word-form' as const, query: 'الله', lens: 'quran-text' },
    { mode: 'context' as const, query: 'mercy', lens: 'translation' },
    { mode: 'lemma' as const, query: 'ktb', lens: 'morphology' },
  ])('preserves $mode execution AST while using $lens Ask lens hints', async ({ mode, query, lens }) => {
    const preview = answerPreview({ id: `preview-${mode}`, query })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({
      client,
      initialMode: mode,
      initialQuery: query,
    }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch())

    await waitFor(() => expect(result.current.answerPreview?.id).toBe(preview.id))
    expect(client.askPreview).toHaveBeenCalledWith(expect.objectContaining({
      query,
      lens,
      queryAst: expect.objectContaining({ mode }),
    }))
  })

  it('opens All Matches with the preview id, active query, lens, and structured cursor', async () => {
    const preview = answerPreview({ id: 'preview-allah', query: 'Allah' })
    const cursor = searchCursor({ lastStableResultKey: 'translation:2:255' })
    const match = matchCard({ id: 'match-1', refLabel: '2:255' })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
      getAskMatchesPage: vi.fn(async () => ({
        previewId: preview.id,
        evidenceAtoms: [],
        matchCards: [match],
        nextCursor: cursor,
      })),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({
      client,
      initialMode: 'translation',
      initialQuery: 'Allah',
    }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch())
    await waitFor(() => expect(result.current.answerPreview?.id).toBe(preview.id))

    act(() => result.current.openAllMatches())

    await waitFor(() => expect(result.current.allMatches).toEqual([match]))
    expect(client.getAskMatchesPage).toHaveBeenCalledWith({
      previewId: preview.id,
      query: 'Allah',
      lens: 'translation',
      queryAst: expect.objectContaining({ mode: 'translation' }),
      limit: 10,
      sort: 'relevance',
    })
    expect(result.current.allMatchesOpen).toBe(true)
    expect(result.current.canLoadAllMatches).toBe(true)
    expect(result.current.loadingAllMatches).toBe(false)
    expect(result.current.searchStatus).toBe('1 matches shown')
  })

  it('loads more All Matches by reusing the structured cursor and appending unique cards', async () => {
    const preview = answerPreview({ id: 'preview-root', query: 'ktb' })
    const firstCursor = searchCursor({ lastStableResultKey: 'morphology:first' })
    const firstMatch = matchCard({ id: 'match-1', refLabel: '2:2' })
    const nextMatch = matchCard({ id: 'match-2', refLabel: '2:3' })
    const client = mockSearchClient({
      askPreview: vi.fn(async () => preview),
      getAskMatchesPage: vi.fn()
        .mockResolvedValueOnce({
          previewId: preview.id,
          evidenceAtoms: [],
          matchCards: [firstMatch],
          nextCursor: firstCursor,
        })
        .mockResolvedValueOnce({
          previewId: preview.id,
          evidenceAtoms: [],
          matchCards: [firstMatch, nextMatch],
          nextCursor: undefined,
        }),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({
      client,
      initialMode: 'same-root',
      initialQuery: 'ktb',
    }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch())
    await waitFor(() => expect(result.current.answerPreview?.id).toBe(preview.id))
    act(() => result.current.openAllMatches())
    await waitFor(() => expect(result.current.allMatches).toEqual([firstMatch]))

    act(() => result.current.loadMoreAllMatches())

    await waitFor(() => expect(result.current.allMatches).toEqual([firstMatch, nextMatch]))
    expect(client.getAskMatchesPage).toHaveBeenLastCalledWith({
      previewId: preview.id,
      query: 'ktb',
      lens: 'morphology',
      queryAst: expect.objectContaining({ mode: 'same-root' }),
      cursor: firstCursor,
      limit: 10,
      sort: 'relevance',
    })
    expect(result.current.canLoadAllMatches).toBe(false)
  })

  it('ignores stale preview and All Matches responses after a newer submit', async () => {
    const stalePreview = createDeferred<AnswerPreview>()
    const staleMatches = createDeferred<{
      previewId: string
      evidenceAtoms: []
      matchCards: MatchCardLite[]
      nextCursor?: SearchResultCursor
    }>()
    const previewA = answerPreview({ id: 'preview-a', query: 'mercy' })
    const previewB = answerPreview({ id: 'preview-b', query: 'guidance' })
    const previewC = answerPreview({ id: 'preview-c', query: 'light' })
    const client = mockSearchClient({
      askPreview: vi.fn()
        .mockReturnValueOnce(stalePreview.promise)
        .mockResolvedValueOnce(previewB)
        .mockResolvedValueOnce(previewC),
      getAskMatchesPage: vi.fn(() => staleMatches.promise),
    })
    const { useSearchRouteState } = await actualSearchRouteStateModule()

    const { result } = renderHook(() => useSearchRouteState({ client, initialMode: 'translation' }))

    await waitFor(() => expect(result.current.packState).toBe('active'))
    act(() => result.current.submitSearch({ query: 'mercy', mode: 'translation' }))
    act(() => result.current.submitSearch({ query: 'guidance', mode: 'translation' }))
    await waitFor(() => expect(result.current.answerPreview?.id).toBe(previewB.id))

    await act(async () => stalePreview.resolve(previewA))
    expect(result.current.answerPreview?.id).toBe(previewB.id)

    act(() => result.current.openAllMatches())
    expect(client.getAskMatchesPage).toHaveBeenCalledWith({
      previewId: previewB.id,
      query: 'guidance',
      lens: 'translation',
      queryAst: expect.objectContaining({ mode: 'translation' }),
      limit: 10,
      sort: 'relevance',
    })
    act(() => result.current.submitSearch({ query: 'light', mode: 'translation' }))
    await waitFor(() => expect(result.current.answerPreview?.id).toBe(previewC.id))

    await act(async () => staleMatches.resolve({
      previewId: previewB.id,
      evidenceAtoms: [],
      matchCards: [matchCard({ id: 'stale-match' })],
      nextCursor: searchCursor({ lastStableResultKey: 'stale' }),
    }))
    expect(result.current.answerPreview?.id).toBe(previewC.id)
    expect(result.current.allMatches).toEqual([])
    expect(result.current.allMatchesOpen).toBe(false)
  })
})

async function actualSearchRouteStateModule(): Promise<typeof import('../../../src/components/search/useSearchRouteState')> {
  return vi.importActual('../../../src/components/search/useSearchRouteState')
}

function mockSearchClient(overrides: Partial<Record<keyof SearchClient, unknown>> = {}): SearchClient {
  return {
    init: vi.fn(async () => ({ packId: 'qa-search-core-hafs-v1', packVersion: '1.0.0' })),
    dispose: vi.fn(async () => undefined),
    askPreview: vi.fn(async () => answerPreview()),
    getAskMatchesPage: vi.fn(async () => ({ previewId: 'preview-1', evidenceAtoms: [], matchCards: [], nextCursor: undefined })),
    query: vi.fn(),
    explore: vi.fn(),
    ...overrides,
  } as unknown as SearchClient
}

function answerPreviewWithClaims(overrides: Partial<AnswerPreview> = {}): AnswerPreview {
  return answerPreview({
    id: 'preview-mercy-claims',
    query: 'mercy',
    claims: [
      {
        id: 'claim-supported',
        text: 'The indexed translation renders mercy language for this query.',
        templateId: 'translation-renders',
        slots: { query: 'mercy' },
        attribution: 'translation-renders',
        predicate: 'renders',
        supportId: 'support-supported',
      },
      {
        id: 'claim-unsupported',
        text: 'This unsupported claim must not render.',
        templateId: 'translation-renders',
        slots: { query: 'mercy' },
        attribution: 'translation-renders',
        predicate: 'renders',
        supportId: 'support-insufficient',
      },
    ],
    claimSupports: [
      { id: 'support-supported', claimId: 'claim-supported', supportIds: ['atom-supported'], verdict: 'supported' },
      { id: 'support-insufficient', claimId: 'claim-unsupported', supportIds: ['atom-supported'], verdict: 'insufficient' },
    ],
    evidenceAtoms: [{
      id: 'atom-supported',
      evidenceType: 'translation',
      sourceKind: 'translation',
      sourceId: 'bridges-translation',
      sourceVersion: 'fixture',
      refs: ['2:255'],
      displayTarget: { type: 'verse-ref', refs: ['2:255'] },
      translationId: 'bridges-translation',
    }],
    evidenceBasis: {
      quranText: 'available-not-used',
      translation: 'used',
      morphology: 'available-not-used',
      note: 'Translation evidence was used for this preview.',
    },
    evidenceCards: [{
      id: 'evidence-supported',
      refLabel: '2:255',
      evidenceAtomIds: ['atom-supported'],
      claimSupportIds: ['support-supported'],
      title: '2:255',
      snippet: 'Allah - there is no deity except Him',
      snippetSource: 'translation',
      matchReason: 'The indexed translation contains the query.',
      readerAction: { type: 'open-in-reader', ref: '2:255' },
    }],
    sourceFamilyStatuses: [
      { sourceKind: 'translation', availability: 'available', canSupportClaims: true },
    ],
    ...overrides,
  })
}

function answerPreview(overrides: Partial<AnswerPreview> = {}): AnswerPreview {
  const query = overrides.query ?? 'mercy'
  return {
    id: 'preview-1',
    query,
    queryUnderstanding: {
      originalQuery: query,
      normalizedQuery: query.toLowerCase(),
      intent: 'find-occurrences',
      lens: 'translation',
      confidence: 'high',
      alternatives: [],
      normalizationWarnings: [],
    },
    searchPlan: {
      primaryLens: 'translation',
      lanes: [{ id: 'translation', sourceKinds: ['translation'], queryForm: query, status: 'executed' }],
      excludedSources: [],
    },
    mode: 'answer',
    answerability: { status: 'answerable', reasons: [], renderPermission: 'answer-preview' },
    claims: [],
    claimSupports: [],
    evidenceAtoms: [],
    evidenceBasis: {
      quranText: 'available-not-used',
      translation: 'used',
      morphology: 'available-not-used',
      note: 'Translation evidence was used for this preview.',
    },
    evidenceCards: [{
      id: 'evidence-1',
      refLabel: '2:255',
      evidenceAtomIds: ['atom-1'],
      claimSupportIds: ['support-1'],
      title: '2:255',
      snippet: 'Allah - there is no deity except Him',
      snippetSource: 'translation',
      matchReason: 'The indexed translation contains the query.',
      readerAction: { type: 'open-in-reader', ref: '2:255' },
    }],
    sourceFamilyStatuses: [
      { sourceKind: 'translation', availability: 'available', canSupportClaims: true },
    ],
    ...overrides,
  }
}

function matchCard(overrides: Partial<MatchCardLite> = {}): MatchCardLite {
  return {
    id: 'match-1',
    refLabel: '2:255',
    evidenceAtomIds: ['atom-1'],
    title: '2:255',
    snippet: 'Allah - there is no deity except Him',
    snippetSource: 'translation',
    matchReason: 'The indexed translation contains the query.',
    readerAction: { type: 'open-in-reader', ref: '2:255' },
    ...overrides,
  }
}

function evidenceCards(count: number): AnswerPreview['evidenceCards'] {
  return Array.from({ length: count }, (_, index) => ({
    ...answerPreview().evidenceCards[0],
    id: `evidence-${index + 1}`,
    refLabel: `2:${255 + index}`,
  }))
}

function searchCursor(overrides: Partial<SearchResultCursor> = {}): SearchResultCursor {
  return {
    packId: 'qa-search-core-hafs-v1',
    packVersion: '1.0.0',
    queryHash: 'query-hash',
    queryAstVersion: 1,
    rankVersion: 'phase-1-rank-v1',
    sort: 'relevance',
    lastStableResultKey: 'translation:2:255',
    ...overrides,
  }
}

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}
