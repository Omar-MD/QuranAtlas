import type { SearchResultDto } from '../../search/schema'
import { SearchMorphologyPanel } from './SearchMorphologyPanel'
import { SearchGraphExplore } from './SearchGraphExplore'
import type { SearchExploreGraphState } from './useSearchRouteState'

export function SearchExplorePanel({
  graph,
  onLoadGraph,
  result,
}: {
  graph?: SearchExploreGraphState
  onLoadGraph?: (result: SearchResultDto) => void
  result?: SearchResultDto | null
}) {
  return (
    <div className="qar:grid qar:gap-3">
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Explore sections load from optional Search feature packs. Core Search results remain available when optional packs are missing.
      </p>
      <SearchMorphologyPanel result={result ?? null} />
      <SearchGraphExplore
        graph={graph ?? { error: null, loading: false, resultId: null, sections: [] }}
        onLoad={onLoadGraph}
        result={result ?? null}
      />
    </div>
  )
}
