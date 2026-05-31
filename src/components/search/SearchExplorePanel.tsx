import { Accordion } from '../ui'
import type { SearchResultDto } from '../../search/schema'
import { SearchMorphologyPanel } from './SearchMorphologyPanel'

export function SearchExplorePanel({ result }: { result?: SearchResultDto | null }) {
  return (
    <div className="qar:grid qar:gap-3">
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Explore sections load from optional Search feature packs. Core Search results remain available when optional packs are missing.
      </p>
      <SearchMorphologyPanel result={result ?? null} />
      <Accordion
        items={[
          {
            title: 'Counts & patterns',
            content: 'Unavailable until counts and pattern packs are active.',
            value: 'counts-patterns',
          },
        ]}
      />
    </div>
  )
}
