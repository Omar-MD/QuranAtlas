import type { SearchQueryMode } from '../../search/schema'
import { SegmentedControl } from '../ui'
import { SEARCH_MODE_OPTIONS } from './search-labels'

export function SearchModeControl({
  mode,
  onModeChange,
}: {
  mode: SearchQueryMode
  onModeChange: (mode: SearchQueryMode) => void
}) {
  return (
    <SegmentedControl
      label="Search mode"
      onValueChange={(value) => onModeChange(value as SearchQueryMode)}
      options={SEARCH_MODE_OPTIONS}
      value={mode}
    />
  )
}
