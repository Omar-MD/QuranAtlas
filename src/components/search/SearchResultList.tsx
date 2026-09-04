import type { SearchResultDto } from '../../search/schema'
import { Button } from '../ui'
import { SearchResultCard } from './SearchResultCard'
import type { SearchVerseCardViewModel } from './search-presentation-model'

export function SearchResultList({
  canLoadMore,
  cards,
  emptyMessage,
  hasMore,
  onDetailsTrigger,
  onLoadMore,
  onOpenInRead,
  onSelect,
  selectedResultId,
}: {
  canLoadMore?: boolean
  cards: SearchVerseCardViewModel[]
  emptyMessage?: string
  hasMore?: boolean
  onDetailsTrigger?: (node: HTMLButtonElement | null) => void
  onLoadMore?: () => void
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  selectedResultId?: string
}) {
  if (cards.length === 0) {
    return (
      <p className="qar-search-results-empty">
        {emptyMessage ?? 'Enter a word, phrase, or ayah reference.'}
      </p>
    )
  }
  return (
    <section aria-label="Verses" className="qar-search-result-list">
      {cards.map((card) => (
        <SearchResultCard
          card={card}
          key={card.id}
          onDetailsTrigger={onDetailsTrigger}
          onOpenInRead={onOpenInRead}
          onSelect={onSelect}
          selected={card.id === selectedResultId}
        />
      ))}
      {hasMore ? (
        <Button disabled={!canLoadMore} onClick={onLoadMore} type="button" variant="secondary">
          {canLoadMore ? 'Load more results' : 'Loading more results'}
        </Button>
      ) : null}
    </section>
  )
}
