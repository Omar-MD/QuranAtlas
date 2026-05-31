import type { SearchResultDto } from '../../search/schema'
import { Button } from '../ui'
import { SearchResultCard } from './SearchResultCard'

export function SearchResultList({
  canLoadMore,
  emptyMessage,
  hasMore,
  onLoadMore,
  onOpenInRead,
  onSelect,
  results,
  selectedResultId,
}: {
  canLoadMore?: boolean
  emptyMessage?: string
  hasMore?: boolean
  onLoadMore?: () => void
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  results: SearchResultDto[]
  selectedResultId?: string
}) {
  if (results.length === 0) {
    return (
      <p className="qar-search-results-empty">
        {emptyMessage ?? 'Enter a word, phrase, or ayah reference. Save only the searches you want to keep.'}
      </p>
    )
  }
  return (
    <section aria-label="Search results" className="qar-search-result-list">
      {results.map((result) => (
        <SearchResultCard
          key={result.resultId}
          onOpenInRead={onOpenInRead}
          onSelect={onSelect}
          result={result}
          selected={result.resultId === selectedResultId}
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
