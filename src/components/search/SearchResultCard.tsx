import type { SearchResultDto } from '../../search/schema'
import { Badge, Button } from '../ui'
import { formatSearchReference, laneLabel, mappingLabel } from './search-labels'

export function SearchResultCard({
  onOpenInRead,
  onSelect,
  result,
  selected,
}: {
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  result: SearchResultDto
  selected?: boolean
}) {
  const primaryIsOpen = result.canOpenInRead
  return (
    <article
      aria-label={`Search result ${result.sourceRef}`}
      aria-current={selected ? 'true' : undefined}
      className="qar-search-result-row"
      data-selected={selected ? 'true' : undefined}
    >
      <div className="qar-search-result-row-head">
        <p className="qar-search-result-ref" dir="auto">
          {formatSearchReference(result.sourceRef)}
        </p>
        <Badge>{mappingLabel(result.mappingState)}</Badge>
      </div>
      <p className="qar-search-result-snippet" dir="auto">
        <bdi>{result.snippet}</bdi>
      </p>
      <div className="qar-search-result-lanes" aria-label={`Match lanes for ${result.sourceRef}`}>
        {result.matchLanes.map((lane) => (
          <Badge key={lane}>{laneLabel(lane)}</Badge>
        ))}
      </div>
      <div className="qar-search-result-actions">
        {primaryIsOpen ? (
          <Button onClick={() => onOpenInRead(result)} size="sm" variant="primary">
            Open in Read
          </Button>
        ) : null}
        <Button onClick={() => onSelect(result)} size="sm" variant={primaryIsOpen ? 'secondary' : 'primary'}>
          Details
        </Button>
      </div>
    </article>
  )
}
