import type { SearchResultDto } from '../../search/schema'
import { Button, Tabs } from '../ui'
import { SearchExplorePanel } from './SearchExplorePanel'
import { SearchSourcePanel } from './SearchSourcePanel'
import { formatSearchReference, laneLabel } from './search-labels'

export function SearchResultDetail({
  onClose,
  packVersion,
  result,
}: {
  onClose?: () => void
  packVersion?: string
  result: SearchResultDto | null
}) {
  if (!result) {
    return (
      <aside aria-label="Search result detail" className="qar:grid qar:gap-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4">
        <p className="qar:m-0 qar:text-sm qar:text-muted">Select a result to inspect its Match, Explore, and Source details.</p>
      </aside>
    )
  }

  return (
    <aside aria-label={`Search result detail ${result.sourceRef}`} className="qar:grid qar:gap-4 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4">
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
        <div>
          <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted" dir="auto">
            {formatSearchReference(result.sourceRef)}
          </p>
          <h3 className="qar:m-0 qar:text-lg qar:leading-tight">Match</h3>
        </div>
        {onClose ? <Button onClick={onClose} size="sm" variant="ghost">Close</Button> : null}
      </div>
      <Tabs
        label={`Details for ${result.sourceRef}`}
        items={[
          {
            label: 'Match',
            value: 'match',
            content: (
              <div className="qar:grid qar:gap-3">
                <div>
                  <p className="qar:m-0 qar:text-xs qar:text-muted">Matched passage</p>
                  <p className="qar:m-0 qar:text-base qar:leading-7" dir="auto"><bdi>{result.snippet}</bdi></p>
                </div>
                <div>
                  <p className="qar:m-0 qar:text-xs qar:text-muted">Search source text</p>
                  <p className="qar:m-0 qar:leading-7" dir="auto"><bdi>{result.sourceText}</bdi></p>
                </div>
                {result.readerText ? (
                  <div>
                    <p className="qar:m-0 qar:text-xs qar:text-muted">Reader text</p>
                    <p className="qar:m-0 qar:leading-7" dir="auto"><bdi>{result.readerText}</bdi></p>
                  </div>
                ) : null}
                <p className="qar:m-0 qar:text-sm qar:text-muted" dir="auto">
                  Match reason: {result.matchLanes.map(laneLabel).join(', ')}
                </p>
              </div>
            ),
          },
          {
            label: 'Explore',
            value: 'explore',
            content: <SearchExplorePanel result={result} />,
          },
          {
            label: 'Source',
            value: 'source',
            content: <SearchSourcePanel packVersion={packVersion} result={result} />,
          },
        ]}
      />
    </aside>
  )
}
