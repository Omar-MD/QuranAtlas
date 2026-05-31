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
      <p className="qar:m-0 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4 qar:text-sm qar:text-muted">
        Enter a word, phrase, or ayah reference. Save only the searches you want to keep.
      </p>
    )
  }
  return (
    <section aria-label="Search results" className="qar:grid qar:gap-3">
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
