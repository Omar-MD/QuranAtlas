import { SearchIndexGate } from './SearchIndexGate'

export function SearchPage() {
  return (
    <main className="qar:grid qar:gap-4 qar:px-5 qar:py-5" aria-label="Search">
      <h2 className="qar:m-0 qar:text-xl qar:leading-tight">Search</h2>
      <SearchIndexGate ready={false}>
        <p>Search is planned future work.</p>
      </SearchIndexGate>
    </main>
  )
}
