import { Accordion, Button } from '../ui'
import type { SearchExploreGraphState } from './useSearchRouteState'
import {
  SEARCH_FOLLOWING_WORDING_NOTE,
  SEARCH_OCCURS_ONCE_NOTE,
  SEARCH_SHARED_WORDING_NOTE,
  SEARCH_WORDING_NOTE,
  type SearchGraphSection,
} from '../../search/graph'
import type { SearchResultDto } from '../../search/schema'
import { SearchCountsPatterns } from './SearchCountsPatterns'

export function SearchGraphExplore({
  graph,
  onLoad,
  result,
}: {
  graph: SearchExploreGraphState
  onLoad?: (result: SearchResultDto) => void
  result: SearchResultDto | null
}) {
  if (!result) return null
  const loadedForResult = graph.resultId === result.resultId && graph.sections.length > 0
  return (
    <div className="qar:grid qar:gap-3">
      <div className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-canvas qar:p-3">
        <p className="qar:m-0">{SEARCH_WORDING_NOTE}</p>
        <p className="qar:m-0">{SEARCH_SHARED_WORDING_NOTE}</p>
        <p className="qar:m-0">{SEARCH_FOLLOWING_WORDING_NOTE}</p>
        <p className="qar:m-0">{SEARCH_OCCURS_ONCE_NOTE}</p>
      </div>
      <Button disabled={graph.loading} onClick={() => onLoad?.(result)} type="button" variant="secondary">
        {graph.loading ? 'Loading Explore sections' : loadedForResult ? 'Refresh Explore sections' : 'Load Explore sections'}
      </Button>
      {graph.error ? <p className="qar:m-0 qar:text-danger">{graph.error}</p> : null}
      {loadedForResult ? <Accordion items={graph.sections.map(sectionToAccordionItem)} /> : null}
    </div>
  )
}

function sectionToAccordionItem(section: SearchGraphSection) {
  return {
    title: section.title,
    value: section.id,
    content: (
      <div className="qar:grid qar:gap-3">
        {section.note ? <p className="qar:m-0">{section.note}</p> : null}
        {section.unavailable ? (
          <p className="qar:m-0">Missing graph feature: {section.unavailable.reason}</p>
        ) : sectionContent(section)}
        {section.sourcePolicy.length > 0 ? (
          <dl className="qar:grid qar:gap-1 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-2">
            {section.sourcePolicy.map((row) => (
              <div className="qar:grid qar:gap-1" key={`${section.id}:${row.label}`}>
                <dt className="qar:text-muted">{row.label}</dt>
                <dd className="qar:m-0">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    ),
  }
}

function sectionContent(section: SearchGraphSection) {
  if (section.id === 'following-wording') {
    return (
      <ul className="qar:m-0 qar:grid qar:list-none qar:gap-2 qar:p-0">
        {section.rows.map((row) => (
          <li key={row.phrase} dir="auto">
            <bdi>{row.phrase}</bdi>
            {' -> '}
            {row.followers.map((follower) => `${follower.token} (${follower.count})`).join(', ')}
          </li>
        ))}
      </ul>
    )
  }
  if (section.id === 'shared-wording') {
    return (
      <ul className="qar:m-0 qar:grid qar:list-none qar:gap-2 qar:p-0">
        {section.rows.map((row) => (
          <li key={row.ref}>
            <span>{row.ref}: {row.sharedTokenCount} shared tokens</span>
            <span dir="auto"> <bdi>{row.sharedTokens.join(', ')}</bdi></span>
          </li>
        ))}
      </ul>
    )
  }
  if (section.id === 'repeated-phrases' || section.id === 'occurs-once') {
    return (
      <ul className="qar:m-0 qar:grid qar:list-none qar:gap-2 qar:p-0">
        {section.rows.map((row) => (
          <li key={`${section.id}:${row.phrase}`} dir="auto">
            <bdi>{row.phrase}</bdi> - {row.count} occurrence{row.count === 1 ? '' : 's'}
          </li>
        ))}
      </ul>
    )
  }
  if (section.id === 'ayah-endings') {
    return (
      <ul className="qar:m-0 qar:grid qar:list-none qar:gap-2 qar:p-0">
        {section.rows.map((row) => (
          <li key={`${row.phrase}:${row.length}`} dir="auto">
            <bdi>{row.phrase}</bdi> - occurs {row.countInIndex} time{row.countInIndex === 1 ? '' : 's'} as an ayah ending in this index
          </li>
        ))}
      </ul>
    )
  }
  if (section.id === 'counts-patterns') return <SearchCountsPatterns section={section} />
  return null
}
