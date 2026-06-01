import type { SearchResultDto } from '../../search/schema'
import { Badge, Button } from '../ui'
import type { SearchVerseCardViewModel } from './search-presentation-model'

export function SearchResultCard({
  card,
  onDetailsTrigger,
  onOpenInRead,
  onSelect,
  selected,
}: {
  card: SearchVerseCardViewModel
  onDetailsTrigger?: (node: HTMLButtonElement | null) => void
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  selected?: boolean
}) {
  const primaryIsOpen = card.canOpenInRead
  return (
    <article
      aria-label={`Search result ${card.refLabel}`}
      aria-current={selected ? 'true' : undefined}
      className="qar-search-result-row"
      data-selected={selected ? 'true' : undefined}
    >
      <div className="qar-search-result-row-head">
        <p className="qar-search-result-ref" dir="auto">
          {card.refLabel}
        </p>
        <Badge>{card.matchTypeLabel}</Badge>
      </div>
      <div className="qar-search-result-passages">
        <p className="qar-search-result-snippet" dir="auto">
          <bdi>{card.primaryText}</bdi>
        </p>
        {card.secondaryText ? (
          <p className="qar-search-result-context" dir="auto">
            <bdi>{card.secondaryText}</bdi>
          </p>
        ) : null}
      </div>
      <p className="qar-search-result-why" dir="auto">
        <span>Matched:</span>
        {' '}
        <bdi>{card.matchReason}</bdi>
      </p>
      <div className="qar-search-result-actions">
        {primaryIsOpen ? (
          <Button onClick={() => onOpenInRead(card.result)} size="sm" variant="primary">
            Open in Read
          </Button>
        ) : null}
        <Button
          onClick={(event) => {
            onDetailsTrigger?.(event.currentTarget)
            onSelect(card.result)
          }}
          size="sm"
          variant={primaryIsOpen ? 'secondary' : 'primary'}
        >
          Details
        </Button>
      </div>
    </article>
  )
}
