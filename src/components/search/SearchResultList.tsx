import type { SearchResultDto } from '../../search/schema'
import { SearchResultCard } from './SearchResultCard'

export function SearchResultList({
  onOpenInRead,
  onSelect,
  results,
  selectedResultId,
}: {
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  results: SearchResultDto[]
  selectedResultId?: string
}) {
  if (results.length === 0) {
    return (
      <p className="qar-search-results-empty">
        Enter a word, phrase, or ayah reference. Save only the searches you want to keep.
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
    </section>
  )
}
