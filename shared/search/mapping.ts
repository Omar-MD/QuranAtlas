export const SEARCH_MAPPING_STATES = [
  'same-wording-in-reader',
  'corresponding-ayah-in-reader',
  'different-ayah-boundary',
  'no-reader-ayah-alignment',
  'no-reader-token-alignment',
  'hafs-source-only',
] as const

export type SearchMappingState = (typeof SEARCH_MAPPING_STATES)[number]
export type SearchMappingAliasRole =
  | 'identity-verified'
  | 'alias-verified'
  | 'split'
  | 'merged'
  | 'missing'
  | 'source-only'
export type SearchMappingBoundaryRole = 'same-ayah' | 'reader-spans-multiple' | 'source-spans-multiple' | 'no-alignment'

export interface SearchReaderRef {
  surah: number
  ayah: number
  verseKey: `${number}:${number}`
}

export interface SearchMappingAsset {
  mappingId: string
  sourceCorpusId: string
  readerCorpusId: string
  sourceRef: `${number}:${number}`
  readerRefs: SearchReaderRef[]
  mappingState: SearchMappingState
  aliasRole: SearchMappingAliasRole
  boundaryRole: SearchMappingBoundaryRole
  canOpenInRead: boolean
  canHighlightWordsInRead: boolean
  reason: string
  sourceChecksum: string
  readerChecksum: string
  mappingVersion: number
}
