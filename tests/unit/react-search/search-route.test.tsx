import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchRouteState } from '../../../src/components/search/useSearchRouteState'
import {
  SEARCH_FOLLOWING_WORDING_NOTE,
  SEARCH_OCCURS_ONCE_NOTE,
  SEARCH_SHARED_WORDING_NOTE,
  SEARCH_WORDING_NOTE,
} from '../../../src/search/graph'
import type { SearchResultDto } from '../../../src/search/schema'
import type { SavedSearchRecord } from '../../../src/storage/types'

const mockUseSearchRouteState = vi.fn<[], SearchRouteState>()
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
      get: vi.fn(async (key: string) => (key === 'riwayah' ? { value: 'hafs' } : undefined)),
    },
  })),
}))

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
    snippet: 'Allah - there is no deity except Him',
    rankKey: 'translation:2:255',
    sourceText: 'Allah - there is no deity except Him, the Ever-Living...',
    readerText: 'ٱللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
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
    resultCountMessage: '',
    results: [],
    searchStatus: 'Search data is ready on this device.',
    selectedResult: null,
    hasMoreResults: false,
    canLoadMoreResults: false,
    exploreGraph: { error: null, loading: false, resultId: null, sections: [] },
    loadExploreGraph: vi.fn(),
    loadMoreResults: vi.fn(),
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
    mockSaved.records = []
    mockSaved.status = ''
    vi.clearAllMocks()
  })

  it('renders the shipped Search shell with Phase 1 copy and source notes', async () => {
    const selected = result()
    mockUseSearchRouteState.mockReturnValue(routeState({
      query: 'mercy',
      resultCountMessage: '1 result',
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    expect(screen.getByRole('main', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search Quran text, translation, or context')).toHaveAttribute('placeholder', 'Search...')
    expect(screen.getByRole('tab', { name: 'Search mode: Exact word form' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Search mode: Same root' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in Read' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Source' }))
    expect(screen.getByText(/Search analysis uses Hafs\/Tanzil text/i)).toBeInTheDocument()
    expect(screen.getByText(/Same-root matches are morphological aids/i)).toBeInTheDocument()
    expect(screen.getByText(SEARCH_WORDING_NOTE)).toBeInTheDocument()
    expect(screen.getByText(SEARCH_SHARED_WORDING_NOTE)).toBeInTheDocument()
    expect(screen.getByText(SEARCH_FOLLOWING_WORDING_NOTE)).toBeInTheDocument()
    expect(screen.getByText(SEARCH_OCCURS_ONCE_NOTE)).toBeInTheDocument()
    expect(screen.getByText(/Boundary policy: phrase windows stay within one ayah and one surah/i)).toBeInTheDocument()
  })

  it('shows morphology warnings and avoids Qalun word highlighting for same-root results', async () => {
    const selected = result({
      matchLanes: ['same-root'],
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
      mode: 'same-root',
      query: 'الله',
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    await userEvent.click(screen.getByRole('tab', { name: 'Explore' }))
    expect(screen.getAllByText('Same root').length).toBeGreaterThan(0)
    expect(screen.getByText('Alh')).toBeInTheDocument()
    expect(screen.getByText(/Same-root matches are morphological aids/i)).toBeInTheDocument()
    expect(screen.getByText('Word-level match not available in Reader text')).toBeInTheDocument()
  })

  it('degrades morphology Explore at panel level when the active feature is missing', async () => {
    const selected = result({ matchLanes: ['arabic-text'] })
    mockUseSearchRouteState.mockReturnValue(routeState({
      results: [selected],
      selectedResult: selected,
    }))

    render(<SearchShell />)

    await userEvent.click(screen.getByRole('tab', { name: 'Explore' }))
    expect(screen.getByText('Missing morphology feature')).toBeInTheDocument()
  })

  it('loads memory graph Explore sections on demand with exact source notes and accessible disclosures', async () => {
    const selected = result({ matchLanes: ['phrase'], snippet: 'بسم الله الرحمن الرحيم' })
    const loadExploreGraph = vi.fn()
    mockUseSearchRouteState.mockReturnValue(routeState({
      mode: 'phrase',
      query: 'بسم الله',
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
    await userEvent.click(screen.getByRole('tab', { name: 'Explore' }))
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
    mockUseSearchRouteState.mockReturnValue(routeState({
      results: [result({
        canOpenInRead: false,
        mappingState: 'hafs-source-only',
        readerRefs: [],
      })],
    }))

    render(<SearchShell />)

    expect(screen.queryByRole('button', { name: 'Open in Read' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByText('Hafs Search source')).toBeInTheDocument()
  })

  it('navigates to Read only through a validated single Reader ref', async () => {
    const selected = result()
    mockUseSearchRouteState.mockReturnValue(routeState({ results: [selected], selectedResult: selected }))

    render(<SearchShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open in Read' }))

    expect(window.location.hash).toBe('#/s/2/255')
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
