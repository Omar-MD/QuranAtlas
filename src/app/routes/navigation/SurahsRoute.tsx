import { useEffect, useState, type KeyboardEvent } from 'react'
import { Search as SearchIcon } from 'lucide-react'

import { NavigationPageRecipe } from '../../../design-system/recipes/navigation-page'
import { SurahList } from '../../../components/navigation/SurahList'
import { Input, SegmentedControl } from '../../../components/ui'
import { openReactDb } from '../../../storage/db'
import { readRecentSurahs, type RecentSurahPosition } from '../../../continuity/recent-surahs'
import { useSurahsRouteState, type SurahsFilter } from './useSurahsRouteState'

type ParsedRef = { surah: number; verse: number }

function parseRefQuery(query: string): ParsedRef | null {
  const match = query.trim().match(/^(\d{1,3})\s*:\s*(\d{1,3})$/)
  if (!match) return null
  const surah = Number(match[1])
  const verse = Number(match[2])
  if (!Number.isInteger(surah) || !Number.isInteger(verse)) return null
  return { surah, verse }
}

export function SurahsRoute() {
  const { query, filter, setQuery, setFilter } = useSurahsRouteState()
  const [recentSurahs, setRecentSurahs] = useState<RecentSurahPosition[]>([])

  useEffect(() => {
    let cancelled = false
    void openReactDb()
      .then((db) => readRecentSurahs(db))
      .then((rows) => {
        if (!cancelled) setRecentSurahs(rows)
      })
      .catch(() => {
        if (!cancelled) setRecentSurahs([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const ref = parseRefQuery(query)
    if (!ref) return
    event.preventDefault()
    window.location.hash = `#/s/${ref.surah}/${ref.verse}`
  }

  return (
    <NavigationPageRecipe title="Surahs">
      <div className="qar:mx-auto qar:grid qar:w-full qar:max-w-page qar:gap-3">
        <div className="qar:grid qar:gap-2">
          <Input
            autoComplete="off"
            className="qar-react-nav-drawer-search-input"
            hideLabel
            label="Search surah by name, number, or verse reference"
            labelClassName="qar-react-nav-drawer-source-search"
            maxLength={20}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by name, number, or 2:255"
            prefix={
              <SearchIcon aria-hidden="true" className="qar-react-nav-drawer-search-icon" size={15} strokeWidth={1.7} />
            }
            type="search"
            value={query}
          />
          <SegmentedControl
            label="Surah filter"
            onValueChange={(next) => setFilter(next as SurahsFilter)}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Recent', value: 'recent' },
            ]}
            value={filter}
          />
        </div>
        <SurahList
          filter={filter}
          onNavigate={(hash) => {
            window.location.hash = hash
          }}
          query={query}
          recentSurahs={recentSurahs}
        />
      </div>
    </NavigationPageRecipe>
  )
}
