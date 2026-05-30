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
  if (entry.pageCount !== 604) throw new Error(`${entry.packId}: page count must be 604`)
  if (entry.totalBytes < 0) throw new Error(`${entry.packId}: totalBytes must be non-negative`)
  assertReactMushafUrl(entry.manifestUrl)
  assertMushafUrlIdentity(entry.manifestUrl, entry, 'manifest')
  for (const url of entry.pageUrls ?? []) {
    assertReactMushafUrl(url)
    assertMushafUrlIdentity(url, entry, 'page')
  }
  if (entry.pageUrls && entry.pageUrls.length !== entry.pageCount) {
    throw new Error(`${entry.packId}: page URL count must match page count`)
  }
  if (!entry.pageUrls?.length && !entry.pageUrlTemplate) throw new Error(`${entry.packId}: index requires page URLs or a deterministic page URL template`)
  if (entry.pageUrlTemplate) {
    const sample = entry.pageUrlTemplate.replace('{page}', '001')
    assertReactMushafUrl(sample)
    assertMushafUrlIdentity(sample, entry, 'page template')
  }
  return entry
}

function assertMushafUrlIdentity(url: string, entry: MushafAssetIndexEntry, context: string): void {
  const match = new URL(url, 'https://quranatlas.local').pathname.match(/^\/dataset\/mushaf-pages\/([^/]+)\/([^/]+)\//)
  if (!match) throw new Error(`${entry.packId}: invalid ${context} URL`)
  if (match[1] !== entry.riwayah) throw new Error(`${entry.packId}: riwayah mismatch in ${context} URL`)
  if (match[2] !== entry.mushafEditionId) throw new Error(`${entry.packId}: edition mismatch in ${context} URL`)
}
