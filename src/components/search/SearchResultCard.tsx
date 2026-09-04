import { ArrowUpRight } from 'lucide-react'

import type { SearchResultDto } from '../../search/schema'
import { Button, IconButton, Tooltip } from '../ui'
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
        {card.canOpenInRead ? (
          <Tooltip content="Open in Reader">
            <IconButton
              className="qar-search-result-jump"
              label={`Open ${card.refLabel} in Reader`}
              onClick={() => onOpenInRead(card.result)}
            >
              <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.75} />
            </IconButton>
          </Tooltip>
        ) : null}
      </div>
      <div className="qar-search-result-passages">
        <p className="qar-search-result-snippet qar-search-result-arabic" dir="rtl" lang="ar">
          <bdi>{card.primaryText}</bdi>
        </p>
        {card.secondaryText ? (
          <p className="qar-search-result-context" dir="ltr">
            <bdi>{card.secondaryText}</bdi>
          </p>
        ) : null}
      </div>
      <div className="qar-search-result-actions">
        <Button
          onClick={(event) => {
            onDetailsTrigger?.(event.currentTarget)
            onSelect(card.result)
          }}
          size="sm"
          variant="secondary"
        >
          Details
        </Button>
      </div>
    </article>
  )
}
