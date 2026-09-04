import type { SearchBriefDto } from '../../search/schema'
import { SearchOverview } from './SearchOverview'
import { toOverviewViewModel } from './search-presentation-model'

type SearchBriefProps = {
  brief: SearchBriefDto | null
  hasMoreResults: boolean
}

export function SearchBrief({ brief, hasMoreResults }: SearchBriefProps) {
  return (
    <SearchOverview
      onAction={() => undefined}
      overview={toOverviewViewModel(brief, hasMoreResults, [])}
    />
  )
}
