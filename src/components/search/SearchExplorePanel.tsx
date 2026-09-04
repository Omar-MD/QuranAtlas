import type { SearchResultDto } from '../../search/schema'
import { SearchGraphExplore } from './SearchGraphExplore'
import { SearchMorphologyPanel } from './SearchMorphologyPanel'
import type { SearchExploreModuleId, SearchExploreSummary } from './search-presentation-model'
import type { SearchExploreGraphState } from './useSearchRouteState'

export function SearchExplorePanel({
  focusedModule,
  graph,
  modules,
  onLoadGraph,
  seedResult,
  summaries,
}: {
  focusedModule?: SearchExploreModuleId | null
  graph?: SearchExploreGraphState
  modules: SearchExploreModuleId[]
  onLoadGraph?: (result: SearchResultDto) => void
  seedResult?: SearchResultDto | null
  summaries: SearchExploreSummary[]
}) {
  const graphState = graph ?? { error: null, loading: false, resultId: null, sections: [] }
  if (modules.length === 0) {
    return <p className="qar-search-results-empty">No Explore modules are available for this query.</p>
  }
  const graphModules = modules.filter(isGraphModule)
  return (
    <div className="qar-search-explore-panel" data-focused-module={focusedModule ?? undefined}>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Explore is query-level unless a selected-token action is opened from Details.
      </p>
      {summaries.length > 0 ? <ExploreSummaryList focusedModule={focusedModule} summaries={summaries} /> : null}
      {!seedResult && graphModules.length > 0 ? (
        <div className="qar-search-explore-result-note">
          <p>Result-level graph sections are available after opening Details on a verse.</p>
          <ul>
            {graphModules.map((module) => <li key={module}>{exploreModuleLabel(module)}</li>)}
          </ul>
        </div>
      ) : null}
      {seedResult ? (
        <section aria-label="Selected-token morphology details" className="qar:grid qar:gap-2">
          <h3 className="qar:m-0 qar:text-sm qar:font-semibold">Selected-token morphology details</h3>
          <SearchMorphologyPanel result={seedResult} />
        </section>
      ) : null}
      {seedResult && graphModules.length > 0 ? (
        <SearchGraphExplore graph={graphState} onLoad={onLoadGraph} result={seedResult} />
      ) : null}
    </div>
  )
}

function ExploreSummaryList({ focusedModule, summaries }: { focusedModule?: SearchExploreModuleId | null; summaries: SearchExploreSummary[] }) {
  return (
    <ul className="qar-search-explore-modules">
      {summaries.map((summary) => (
        <li data-focused={summary.id === focusedModule ? 'true' : undefined} key={summary.id}>
          <h3>{summary.title}</h3>
          <p>{summary.description}</p>
          <dl>
            {summary.rows.map((row) => (
              <div key={`${summary.id}:${row.label}`}>
                <dt>{row.label}</dt>
                <dd>
                  <bdi>{row.value}</bdi>
                  <small>{row.scope}</small>
                </dd>
              </div>
            ))}
          </dl>
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

function isGraphModule(module: SearchExploreModuleId): boolean {
  return module === 'following-wording'
    || module === 'shared-wording'
    || module === 'repeated-phrases'
    || module === 'occurs-once'
    || module === 'ayah-endings'
    || module === 'counts-patterns'
}
