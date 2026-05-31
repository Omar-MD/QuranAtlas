import { Button } from '../ui'
import type { SearchResultDto } from '../../search/schema'

export function SearchResults({ results }: { results: SearchResultDto[] }) {
  if (results.length === 0) return <p className="qar:m-0 qar:text-sm qar:text-muted">No verified results yet.</p>
  return (
    <div className="qar:grid qar:gap-2" aria-label="Search results">
      {results.map((result) => (
        <article className="qar:grid qar:gap-2 qar:border-b qar:border-border qar:py-3" key={result.resultId}>
          <p className="qar:m-0 qar:text-xs qar:text-muted">{result.matchLanes.join(', ')} · {result.sourceRef}</p>
          <p className="qar:m-0 qar:text-sm qar:text-text">{result.snippet}</p>
          <Button size="sm" variant="secondary">Open result</Button>
        </article>
      ))}
    </div>
  )
}
