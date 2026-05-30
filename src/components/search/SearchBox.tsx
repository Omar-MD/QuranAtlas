import { Input } from '../ui'

export function SearchBox({ onQueryChange, query }: { onQueryChange: (query: string) => void; query: string }) {
  return <Input label="Search QuranAtlas" onChange={(event) => onQueryChange(event.currentTarget.value)} value={query} />
}
