import type { SearchResultDto } from '../../search/schema'
import { SearchResultList } from './SearchResultList'
import { toVerseCardViewModel } from './search-presentation-model'

export function SearchResults({ results }: { results: SearchResultDto[] }) {
  return <SearchResultList cards={results.map(toVerseCardViewModel)} onOpenInRead={() => undefined} onSelect={() => undefined} />
}
