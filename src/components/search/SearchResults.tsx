import type { SearchResultDto } from '../../search/schema'
import { SearchResultList } from './SearchResultList'

export function SearchResults({ results }: { results: SearchResultDto[] }) {
  return <SearchResultList onOpenInRead={() => undefined} onSelect={() => undefined} results={results} />
}
