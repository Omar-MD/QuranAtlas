import { assertReactMushafUrl, type MushafPackIdentity } from './mushaf-paths'

export type MushafAssetIndexEntry = MushafPackIdentity & {
  packId: string
  label: string
  manifestUrl: string
  pageCount: number
  totalBytes: number
  version: string
  provenance: string
  pageUrlTemplate?: string
  pageUrls?: string[]
  integrity?: Record<string, string>
  deliveryMode: 'on-demand-pack'
  availability: 'available' | 'unavailable' | 'not-built'
}

export function validateMushafAssetIndexEntry(entry: MushafAssetIndexEntry): MushafAssetIndexEntry {
  if (entry.deliveryMode !== 'on-demand-pack') throw new Error(`${entry.packId}: Mushaf pages are on-demand packs`)
  if (entry.pageCount !== 604) throw new Error(`${entry.packId}: expected 604 pages`)
  if (entry.totalBytes < 0) throw new Error(`${entry.packId}: totalBytes must be non-negative`)
  assertReactMushafUrl(entry.manifestUrl)
  for (const url of entry.pageUrls ?? []) assertReactMushafUrl(url)
  if (!entry.pageUrls?.length && !entry.pageUrlTemplate) throw new Error(`${entry.packId}: index requires page URLs or a deterministic page URL template`)
  if (entry.pageUrlTemplate) assertReactMushafUrl(entry.pageUrlTemplate.replace('{page}', '001'))
  return entry
}
