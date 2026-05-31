import type { Meta, StoryObj } from '@storybook/react-vite'

import { SearchIndexGate } from './SearchIndexGate'
import { SearchResultDetail } from './SearchResultDetail'
import { SearchResultList } from './SearchResultList'
import { SavedSearchesRail } from './SavedSearchesRail'
import type { SearchResultDto } from '../../search/schema'
import type { SavedSearchRecord } from '../../storage/types'

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

export const Results: Story = {
  render: () => (
    <main className="qar:grid qar:gap-4 qar:p-5" aria-label="Search">
      <SearchResultList onOpenInRead={() => undefined} onSelect={() => undefined} results={[fixtureResult]} />
    </main>
  ),
}

export const Detail: Story = {
  render: () => (
    <main className="qar:max-w-xl qar:p-5" aria-label="Search">
      <SearchResultDetail packVersion="1.0.0" result={fixtureResult} />
    </main>
  ),
}

export const SavedSearches: Story = {
  render: () => (
    <main className="qar:max-w-xs qar:p-5" aria-label="Search">
      <SavedSearchesRail onDelete={() => undefined} onLoad={() => undefined} onRename={() => undefined} records={[fixtureSavedSearch]} />
    </main>
  ),
}

export const NoMapping: Story = {
  render: () => (
    <main className="qar:grid qar:gap-4 qar:p-5" aria-label="Search">
      <SearchResultList
        onOpenInRead={() => undefined}
        onSelect={() => undefined}
        results={[{ ...fixtureResult, canOpenInRead: false, mappingState: 'hafs-source-only', readerRefs: [] }]}
      />
    </main>
  ),
}

export const OfflineUnavailable: Story = {
  render: () => (
    <main className="qar:p-5" aria-label="Search">
      <SearchIndexGate message="Search data is not available on this device." ready={false} />
    </main>
  ),
}

export const SourcePanel: Story = {
  render: () => (
    <main className="qar:max-w-xl qar:p-5" aria-label="Search">
      <SearchResultDetail packVersion="1.0.0" result={fixtureResult} />
    </main>
  ),
}

const fixtureResult: SearchResultDto = {
  resultId: 'result-2-255',
  sourceRef: '2:255',
  readerRefs: ['2:255'],
  mappingState: 'corresponding-ayah-in-reader',
  canOpenInRead: true,
  canHighlightWordsInRead: false,
  matchLanes: ['translation'],
  snippet: 'Allah - there is no deity except Him, the Ever-Living...',
  rankKey: 'translation:2:255',
  sourceText: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.',
  readerText: 'ٱللَّهُ لَا إِلَٰهَ إِلَّا هُوَ',
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
