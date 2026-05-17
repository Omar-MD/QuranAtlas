export const SEARCH_RESULT_GROUP_ORDER = [
  'surah',
  'verse',
  'tafsir-study',
  'command',
] as const

export type SearchResultGroup = typeof SEARCH_RESULT_GROUP_ORDER[number]

export const SEARCH_RESULT_GROUP_LABELS: Record<SearchResultGroup, string> = {
  surah: 'Surahs',
  verse: 'Verse',
  'tafsir-study': 'Study',
  command: 'Commands',
}

export function isSearchResultGroup(value: string): value is SearchResultGroup {
  return SEARCH_RESULT_GROUP_ORDER.includes(value as SearchResultGroup)
}
