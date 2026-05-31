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
      className="qar:sticky qar:top-0 qar:z-20 qar:grid qar:gap-3 qar:border-b qar:border-border qar:bg-canvas/95 qar:px-5 qar:py-4 qar:backdrop-blur md:qar:static md:qar:border-b-0 md:qar:bg-transparent md:qar:px-0 md:qar:py-0"
      onSubmit={(event) => {
        event.preventDefault()
        submitForm(event.currentTarget)
      }}
      ref={formRef}
    >
      <div className="qar:flex qar:flex-wrap qar:items-end qar:gap-3">
        <div className="qar:min-w-0 qar:flex-1">
          <SearchBox onQueryChange={onQueryChange} query={query} />
        </div>
        <Button
          onClick={(event) => {
            event.preventDefault()
            submitForm(formRef.current)
          }}
          type="submit"
          variant="primary"
        >
          Search
        </Button>
        <Button disabled={!canSave} onClick={onSaveSearch} type="button" variant="secondary">Save search</Button>
      </div>
      <div className="qar:overflow-x-auto qar:pb-1">
        <SearchModeControl mode={mode} onModeChange={onModeChange} />
      </div>
    </form>
  )
}
