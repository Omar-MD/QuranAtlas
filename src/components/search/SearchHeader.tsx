import type { SearchQueryMode } from '../../search/schema'
import { useRef } from 'react'
import { Button } from '../ui'
import { SearchBox } from './SearchBox'
import { SearchModeControl } from './SearchModeControl'

export function SearchHeader({
  canSave,
  mode,
  onModeChange,
  onQueryChange,
  onSaveSearch,
  onSubmit,
  query,
}: {
  canSave: boolean
  mode: SearchQueryMode
  onModeChange: (mode: SearchQueryMode) => void
  onQueryChange: (query: string) => void
  onSaveSearch: () => void
  onSubmit: (query: string) => void
  query: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  function submitForm(form: HTMLFormElement | null) {
    const data = form ? new FormData(form) : null
    const submittedQuery = data?.get('query')
    onSubmit(typeof submittedQuery === 'string' ? submittedQuery : query)
  }

  return (
    <form
      className="qar-search-controls"
      onSubmit={(event) => {
        event.preventDefault()
        submitForm(event.currentTarget)
      }}
      ref={formRef}
    >
      <div className="qar-search-controls-primary">
        <div className="qar-search-query-field">
          <SearchBox onQueryChange={onQueryChange} query={query} />
        </div>
        <Button
          className="qar-search-submit"
          onClick={(event) => {
            event.preventDefault()
            submitForm(formRef.current)
          }}
          type="submit"
          variant="primary"
        >
          Search
        </Button>
        <Button className="qar-search-save" disabled={!canSave} onClick={onSaveSearch} type="button" variant="secondary">Save search</Button>
      </div>
      <div className="qar-search-mode-strip">
        <SearchModeControl mode={mode} onModeChange={onModeChange} />
      </div>
    </form>
  )
}
