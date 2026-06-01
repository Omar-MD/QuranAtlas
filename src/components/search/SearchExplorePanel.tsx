import type { SearchResultDto } from '../../search/schema'
import { SearchGraphExplore } from './SearchGraphExplore'
import { SearchMorphologyPanel } from './SearchMorphologyPanel'
import type { SearchExploreModuleId } from './search-presentation-model'
import type { SearchExploreGraphState } from './useSearchRouteState'

export function SearchExplorePanel({
  focusedModule,
  graph,
  modules,
  onLoadGraph,
  seedResult,
}: {
  focusedModule?: SearchExploreModuleId | null
  graph?: SearchExploreGraphState
  modules: SearchExploreModuleId[]
  onLoadGraph?: (result: SearchResultDto) => void
  seedResult?: SearchResultDto | null
}) {
  const graphState = graph ?? { error: null, loading: false, resultId: null, sections: [] }
  if (modules.length === 0) {
    return <p className="qar-search-results-empty">No Explore modules are available for this query.</p>
  }
  return (
    <div className="qar-search-explore-panel" data-focused-module={focusedModule ?? undefined}>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Explore is query-level unless a selected-token action is opened from Details.
      </p>
      <ExploreModuleList focusedModule={focusedModule} modules={modules} />
      {seedResult ? (
        <section aria-label="Selected-token morphology details" className="qar:grid qar:gap-2">
          <h3 className="qar:m-0 qar:text-sm qar:font-semibold">Selected-token morphology details</h3>
          <SearchMorphologyPanel result={seedResult} />
        </section>
      ) : null}
      {seedResult && hasGraphModule(modules) ? (
        <SearchGraphExplore graph={graphState} onLoad={onLoadGraph} result={seedResult} />
      ) : null}
    </div>
  )
}

function ExploreModuleList({ focusedModule, modules }: { focusedModule?: SearchExploreModuleId | null; modules: SearchExploreModuleId[] }) {
  return (
    <ul className="qar-search-explore-modules">
      {modules.map((module) => (
        <li data-focused={module === focusedModule ? 'true' : undefined} key={module}>
          {exploreModuleLabel(module)}
        </li>
      ))}
    </ul>
  )
}

function exploreModuleLabel(module: SearchExploreModuleId): string {
  if (module === 'surah-distribution') return 'Surah distribution'
  if (module === 'forms-by-count') return 'Forms by count'
  if (module === 'query-level-morphology-summary') return 'Query-level morphology summary'
  if (module === 'translation-context-terms') return 'Matched translation/context terms'
  if (module === 'source-boundary') return 'Source/context boundary'
  if (module === 'following-wording') return 'Attested following wording'
  if (module === 'shared-wording') return 'Shared wording'
  if (module === 'repeated-phrases') return 'Repeated phrases'
  if (module === 'occurs-once') return 'Occurs once'
  if (module === 'ayah-endings') return 'Ayah endings'
  if (module === 'counts-patterns') return 'Counts & patterns'
  return 'Selected-token morphology details'
}

function hasGraphModule(modules: SearchExploreModuleId[]): boolean {
  return modules.some((module) => (
    module === 'following-wording'
    || module === 'shared-wording'
    || module === 'repeated-phrases'
    || module === 'occurs-once'
    || module === 'ayah-endings'
    || module === 'counts-patterns'
  ))
}
