import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'

export type AssetPackKind = 'translation' | 'metadata' | 'mushaf-pages' | 'search-index'

export type AssetIndexEntry = {
  packId: string
  kind: AssetPackKind
  version: string
  totalBytes: number
  urls: string[]
}

export function assertDatasetUrl(url: string): void {
  assertRuntimeDatasetUrl(url)
}

export function validateAssetIndexEntry(entry: AssetIndexEntry): AssetIndexEntry {
  if (!entry.packId) throw new Error('Asset pack requires packId')
  if (entry.totalBytes < 0) throw new Error(`${entry.packId}: totalBytes must be non-negative`)
  if (entry.urls.length === 0) throw new Error(`${entry.packId}: at least one URL is required`)
  for (const url of entry.urls) assertDatasetUrl(url)
  return entry
}
