import { Button } from '../ui'
import type { SearchResult } from '../../search/schema'

export function SearchResults({ results }: { results: SearchResult[] }) {
  if (results.length === 0) return <p className="qar:m-0 qar:text-sm qar:text-muted">No verified results yet.</p>
  return (
    <div className="qar:grid qar:gap-2" aria-label="Search results">
      {results.map((result) => (
        <article className="qar:grid qar:gap-2 qar:border-b qar:border-border qar:py-3" key={result.id}>
          <p className="qar:m-0 qar:text-xs qar:text-muted">{result.lane} · {result.sourceRef.surah}:{result.sourceRef.verse}</p>
          <p className="qar:m-0 qar:text-sm qar:text-text">{result.excerpt}</p>
          <Button size="sm" variant="secondary">Open result</Button>
        </article>
      ))}
    </div>
  )
}
