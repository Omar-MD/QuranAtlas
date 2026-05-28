import { useMemo, useState } from 'react'

import { searchShard } from '../../search/search-engine'
import type { SearchShard } from '../../search/schema'
import { SearchBox } from './SearchBox'
import { SearchIndexGate } from './SearchIndexGate'
import { SearchResults } from './SearchResults'

const PREVIEW_SHARD: SearchShard = {
  id: 'preview',
  generatedAt: '2026-05-25T00:00:00.000Z',
  entries: [
    { id: 'translation:1:1', lane: 'translation', sourceRiwayah: 'qaloon', sourceRef: { surah: 1, verse: 1 }, text: 'Most Compassionate Most Merciful' },
    { id: 'metadata:67:1', lane: 'metadata', sourceRiwayah: 'qaloon', sourceRef: { surah: 67, verse: 1 }, text: 'sovereignty creation accountability' },
  ],
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchShard(PREVIEW_SHARD, query), [query])
  return (
    <main className="qar:grid qar:gap-4 qar:px-5 qar:py-5" aria-label="Search">
      <h2 className="qar:m-0 qar:text-xl qar:leading-tight">Search</h2>
      <SearchIndexGate ready>
        <SearchBox onQueryChange={setQuery} query={query} />
        <SearchResults results={results} />
      </SearchIndexGate>
    </main>
  )
}
