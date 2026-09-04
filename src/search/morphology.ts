import type { SearchResultDto } from '../../shared/search'

export const SEARCH_MORPHOLOGY_SOURCE_NOTE =
  'Search analysis uses Hafs/Tanzil text for word forms, roots, morphology, and wording patterns. Open in Read resolves the active Reader riwayah at click time.'

export const SEARCH_SAME_ROOT_NOTE =
  'Same-root matches are morphological aids. They do not mean the verses have the same interpretation.'

export type SearchMorphologyDto = NonNullable<SearchResultDto['morphology']>

export interface SearchMorphologyRow {
  ayahId: number
  ref: `${number}:${number}`
  surah: number
  ayah: number
  tokenOrdinal: number
  wordPosition: number
  sourceToken: string
  normalizedSourceToken: string
  transliteration: string
  root: string | null
  lemma: string | null
  segments: Array<{
    segment: number
    transliteration: string
    pos: string
    features: string
    lemma?: string | null
    root?: string | null
  }>
}

export interface SearchMorphologyPostingRow {
  term: string
  postings: Array<{ ayahId: number; position: number }>
}

export interface SearchSurahContextRow {
  term: string
  total: number
  surahs: Array<{ surah: number; count: number }>
}
