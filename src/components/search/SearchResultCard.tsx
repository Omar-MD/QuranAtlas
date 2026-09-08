import { ArrowUpRight } from 'lucide-react'

import type { SearchResultDto } from '../../search/schema'
import { Button, IconButton, ListRow, ListRowActions, Tooltip } from '../ui'
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
    <ListRow
      action={
        <ListRowActions>
          {card.canOpenInRead ? (
            <Tooltip content="Open in Reader">
              <IconButton label={`Open ${card.refLabel} in Reader`} onClick={() => onOpenInRead(card.result)}>
                <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.75} />
              </IconButton>
            </Tooltip>
          ) : null}
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
        </ListRowActions>
      }
      aria-label={`Search result ${card.refLabel}`}
      current={selected}
      meta={card.secondaryText ? <bdi>{card.secondaryText}</bdi> : undefined}
      num={card.refLabel}
      title={<bdi>{card.primaryText}</bdi>}
    />
  )
}
