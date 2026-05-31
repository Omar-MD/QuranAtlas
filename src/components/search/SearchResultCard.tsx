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
  const primaryIsOpen = result.canOpenInRead && result.readerRefs.length === 1
  return (
    <article
      aria-label={`Search result ${result.sourceRef}`}
      className="qar:grid qar:gap-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4"
      data-selected={selected ? 'true' : undefined}
    >
      <div className="qar:flex qar:flex-wrap qar:items-center qar:gap-2">
        <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted" dir="auto">
          {formatSearchReference(result.sourceRef)}
        </p>
        <Badge>{mappingLabel(result.mappingState)}</Badge>
      </div>
      <p className="qar:m-0 qar:text-base qar:leading-7 qar:text-text" dir="auto">
        <bdi>{result.snippet}</bdi>
      </p>
      <div className="qar:flex qar:flex-wrap qar:gap-2" aria-label={`Match lanes for ${result.sourceRef}`}>
        {result.matchLanes.map((lane) => (
          <Badge key={lane}>{laneLabel(lane)}</Badge>
        ))}
      </div>
      <div className="qar:flex qar:flex-wrap qar:gap-2">
        {primaryIsOpen ? (
          <Button onClick={() => onOpenInRead(result)} size="sm" variant="primary">
            Open {result.readerRefs[0]} in Read
          </Button>
        ) : null}
        <Button onClick={() => onSelect(result)} size="sm" variant={primaryIsOpen ? 'secondary' : 'primary'}>
          Details
        </Button>
      </div>
    </article>
  )
}
