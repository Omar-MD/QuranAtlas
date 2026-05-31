export const SEARCH_MAPPING_STATES = [
  'same-wording-in-reader',
  'corresponding-ayah-in-reader',
  'different-ayah-boundary',
  'no-reader-ayah-alignment',
  'no-reader-token-alignment',
  'hafs-source-only',
] as const

export type SearchMappingState = typeof SEARCH_MAPPING_STATES[number]
export type SearchMappingAliasRole = 'identity-verified' | 'alias-verified' | 'split' | 'merged' | 'missing' | 'source-only'
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

export function assertSearchMappingAsset(asset: SearchMappingAsset): void {
  if (!SEARCH_MAPPING_STATES.includes(asset.mappingState)) {
    throw new Error(`unsupported Search mapping state ${asset.mappingState}`)
  }
  if (asset.readerRefs.length === 0 && asset.canOpenInRead) {
    throw new Error('Search mapping cannot open in Read without reader refs')
  }
  if (asset.canHighlightWordsInRead && asset.mappingState !== 'same-wording-in-reader') {
    throw new Error('Search mapping cannot highlight Reader words without same wording validation')
  }
  if (asset.aliasRole === 'identity-verified' && asset.mappingState !== 'same-wording-in-reader') {
    throw new Error('Search mapping identity aliases must be explicitly same-wording in Reader')
  }
  if (asset.sourceCorpusId === asset.readerCorpusId && asset.sourceRef === asset.readerRefs[0]?.verseKey) {
    throw new Error('Search mapping must not silently fall back to an identity reader ref')
  }
  if (!asset.reason.trim()) {
    throw new Error('Search mapping reason is required')
  }
}
