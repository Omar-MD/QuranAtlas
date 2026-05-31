import { Input } from '../ui'

export function SearchBox({ onQueryChange, query }: { onQueryChange: (query: string) => void; query: string }) {
  return (
    <Input
      autoComplete="off"
      hideLabel
      label="Search Quran text, translation, or context"
      name="query"
      onChange={(event) => onQueryChange(event.currentTarget.value)}
      placeholder="Search..."
      value={query}
    />
  )
}
