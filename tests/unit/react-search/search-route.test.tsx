import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchRouteState } from '../../../src/components/search/useSearchRouteState'
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
    mode: 'all',
    packMessage: 'Search data is ready on this device.',
    packState: 'active',
    packVersion: '1.0.0',
    query: '',
    resultCountMessage: '',
    results: [],
    searchStatus: 'Search data is ready on this device.',
    selectedResult: null,
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
    expect(screen.queryByRole('tab', { name: /Root/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open 2:255 in Read' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Source' }))
    expect(screen.getByText(/Search analysis currently uses a Hafs text source/i)).toBeInTheDocument()
    expect(screen.queryByText(/word-level/i)).not.toBeInTheDocument()
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

    expect(screen.queryByRole('button', { name: /Open .* in Read/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByText('Hafs source only')).toBeInTheDocument()
  })

  it('navigates to Read only through a validated single Reader ref', async () => {
    const selected = result()
    mockUseSearchRouteState.mockReturnValue(routeState({ results: [selected], selectedResult: selected }))

    render(<SearchShell />)
    await userEvent.click(screen.getByRole('button', { name: 'Open 2:255 in Read' }))

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
    await userEvent.click(screen.getByRole('button', { name: 'Mercy' }))

    await waitFor(() => expect(state.submitSearch).toHaveBeenCalledWith({ mode: 'translation', query: 'mercy' }))
  })
})
