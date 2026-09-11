import { isQuranRef, type QuranRef } from '../continuity/verse-key'
import {
  MUSHAF_FULL_RENDITION_WIDTH,
  MUSHAF_PAGE_COUNT,
  MUSHAF_PREVIEW_RENDITION_WIDTH,
  isMushafIdentityPart,
  isMushafRenditionWidth,
  isMushafUnitRect,
  mushafEditionAssetUrl,
  mushafManifestUrl,
  mushafSvgPageAssetPath,
  mushafWebpPageAssetPath,
  type MushafPackIdentity,
  type MushafUnitRect,
} from './mushaf-paths'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type MushafExternalImageDescriptor = {
  assetPath: string
  bytes: number
  sha256: string
  width: number
  height: number
  mimeType: 'image/webp'
}

export type MushafExternalImageSource = MushafExternalImageDescriptor & {
  assetUrl: string
}

export type MushafPageFraming = {
  textFrame: MushafUnitRect
  sideLane: 'left' | 'right' | 'none'
}

export type MushafManifestPageV1 = {
  page: number
  assetPath: string
  viewBox: string
  displayViewBox: string
  firstVerse: QuranRef
}

export type MushafManifestPageV2 = {
  page: number
  firstVerse: QuranRef
  framing: MushafPageFraming
  media: {
    kind: 'external-image'
    fallback: MushafExternalImageDescriptor
    sources: MushafExternalImageDescriptor[]
  }
}

export type MushafManifestV1 = {
  version: 1
  riwayah: string
  mushafEditionId: string
  pageCount: number
  pages: MushafManifestPageV1[]
  verseToPage: Record<string, number>
}

export type MushafManifestV2 = {
  version: 2
  riwayah: string
  mushafEditionId: string
  pageCount: number
  pages: MushafManifestPageV2[]
  verseToPage: Record<string, number>
}

export type MushafManifest = MushafManifestV1 | MushafManifestV2

// Raw (unvalidated) shape of /dataset/indexes/mushaf-assets.json as fetched at
// runtime. Strict parsing of the entries lives in parseMushafAssetIndex below.
export type MushafAssetIndexEntryRaw = {
  riwayah?: unknown
  mushafEditionId?: unknown
  manifestUrl?: unknown
  pageCount?: unknown
  version?: unknown
  pageUrls?: unknown
  files?: Array<Record<string, unknown>>
}

export type MushafAssetIndex = {
  assets?: MushafAssetIndexEntryRaw[]
}

export type MushafEditionIndexEntry = {
  riwayah: string
  mushafEditionId: string
  label: string
  shortLabel?: string
  pageCount: number
  version: 'v1' | 'v2'
  manifestUrl: string
  totalBytes: number
  pageUrls?: string[]
  files: Array<{ url: string; bytes: number; sha256?: string }>
}

export function parseMushafAssetIndex(value: unknown): MushafEditionIndexEntry[] {
  if (!isMushafAssetIndex(value)) throw new Error('Mushaf edition availability index is invalid')
  const entries: MushafEditionIndexEntry[] = []
  for (const asset of value.assets) {
    if (!isMushafAssetDescriptor(asset)) throw new Error('Mushaf edition availability entry is invalid')
    if (!isAvailableQaloonMushaf(asset)) continue
    entries.push(parseMushafEditionEntry(asset))
  }
  return entries
}

export function findMushafAssetIndexEntry(
  index: MushafAssetIndex,
  expected: { riwayah: string; mushafEditionId: string; pageCount: number; version?: 'v2' },
): MushafAssetIndexEntryRaw | undefined {
  return index.assets?.find(
    (asset) =>
      asset.riwayah === expected.riwayah &&
      asset.mushafEditionId === expected.mushafEditionId &&
      asset.manifestUrl === mushafManifestUrl(expected) &&
      asset.pageCount === expected.pageCount &&
      (expected.version === undefined || asset.version === expected.version),
  )
}

export function mushafPackId(identity: MushafPackIdentity): string {
  if (!isMushafIdentityPart(identity.riwayah) || !isMushafIdentityPart(identity.mushafEditionId)) {
    throw new Error('Invalid Mushaf pack identity')
  }
  return `mushaf-pages--${identity.riwayah}--${identity.mushafEditionId}`
}

export function identityFromMushafPackId(packId: string): MushafPackIdentity | undefined {
  const match = /^mushaf-pages--([a-z0-9][a-z0-9-]*)--([a-z0-9][a-z0-9-]*)$/.exec(packId)
  return match ? { riwayah: match[1], mushafEditionId: match[2] } : undefined
}

export { isMushafUnitRect } from './mushaf-paths'

export function isMushafPageFraming(value: unknown): value is MushafPageFraming {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const framing = value as Partial<MushafPageFraming>
  return Boolean(
    framing.textFrame &&
      isMushafUnitRect(framing.textFrame) &&
      (framing.sideLane === 'left' || framing.sideLane === 'right' || framing.sideLane === 'none'),
  )
}

export function assertMushafManifest(
  value: unknown,
  expected: { riwayah: string; mushafEditionId: string },
): asserts value is MushafManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Mushaf manifest')
  }
  const manifest = value as Partial<MushafManifest>
  if (manifest.version !== 1 && manifest.version !== 2) throw new Error('Unsupported Mushaf manifest version')
  if (manifest.riwayah !== expected.riwayah) throw new Error('Mushaf manifest riwayah mismatch')
  if (manifest.mushafEditionId !== expected.mushafEditionId) throw new Error('Mushaf manifest edition mismatch')
  if (!Number.isInteger(manifest.pageCount) || (manifest.pageCount ?? 0) < 1) {
    throw new Error('Invalid Mushaf page count')
  }
  if (!isRecord(manifest.verseToPage)) throw new Error('Invalid Mushaf verse-to-page map')
  if (manifest.version === 2) {
    if (!Array.isArray(manifest.pages)) throw new Error('Invalid Mushaf manifest pages')
    for (const page of manifest.pages) assertMushafManifestPage(page)
  }
}

export function assertMushafManifestPage(value: unknown): asserts value is MushafManifestPageV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid V2 Mushaf manifest page')
  const page = value as Partial<MushafManifestPageV2>
  if (typeof page.page !== 'number' || !Number.isInteger(page.page) || !isQuranRef(page.firstVerse)) {
    throw new Error('Invalid V2 Mushaf manifest page')
  }
  if (!isMushafPageFraming(page.framing) || page.media?.kind !== 'external-image') {
    throw new Error('Invalid V2 Mushaf manifest page')
  }
  const sources = page.media.sources
  if (!Array.isArray(sources) || sources.length !== 2) throw new Error('Invalid V2 Mushaf media sources')
  for (const descriptor of sources) assertMushafExternalImageDescriptor(descriptor, page.page)
  assertMushafExternalImageDescriptor(page.media.fallback, page.page)
  const preview = sources.find((source) => source.width === MUSHAF_PREVIEW_RENDITION_WIDTH)
  const full = sources.find((source) => source.width === MUSHAF_FULL_RENDITION_WIDTH)
  if (!preview || !full || !sameMushafExternalImageDescriptor(page.media.fallback, full)) {
    throw new Error(`Invalid V2 Mushaf rendition roles at page ${page.page}`)
  }
}

export function assertMushafExternalImageDescriptor(
  value: unknown,
  page: number,
): asserts value is MushafExternalImageDescriptor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid V2 Mushaf external-image descriptor at page ${page}`)
  }
  const descriptor = value as Partial<MushafExternalImageDescriptor>
  const width = descriptor.width
  if (
    !isMushafRenditionWidth(width ?? 0) ||
    descriptor.assetPath !== mushafWebpPageAssetPath(page, width ?? 0) ||
    !Number.isInteger(descriptor.bytes) ||
    (descriptor.bytes ?? 0) <= 0 ||
    typeof descriptor.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(descriptor.sha256) ||
    !Number.isInteger(descriptor.height) ||
    (descriptor.height ?? 0) <= 0 ||
    descriptor.mimeType !== 'image/webp'
  ) {
    throw new Error(`Invalid V2 Mushaf external-image descriptor at page ${page}`)
  }
}

export function sameMushafExternalImageDescriptor(
  file: Record<string, unknown> | undefined,
  descriptor: MushafExternalImageDescriptor,
): boolean {
  return Boolean(
    file &&
      file.bytes === descriptor.bytes &&
      file.sha256 === descriptor.sha256 &&
      file.width === descriptor.width &&
      file.height === descriptor.height &&
      file.mimeType === descriptor.mimeType,
  )
}

function isMushafAssetIndex(value: unknown): value is MushafAssetIndex & { assets: MushafAssetIndexEntryRaw[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Array.isArray((value as Record<string, unknown>).assets)
}

function isMushafAssetDescriptor(
  value: unknown,
): value is Record<string, unknown> & { label: string; mushafEditionId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const asset = value as Record<string, unknown>
  return (
    typeof asset.riwayah === 'string' &&
    typeof asset.pageCount === 'number' &&
    typeof asset.mushafEditionId === 'string' &&
    typeof asset.label === 'string' &&
    isAcceptedMushafAvailability(asset.availability)
  )
}

function isAvailableQaloonMushaf(asset: Record<string, unknown> & { label: string; mushafEditionId: string }): boolean {
  return (
    asset.riwayah === 'qaloon' &&
    asset.pageCount === MUSHAF_PAGE_COUNT &&
    (asset.availability === undefined || asset.availability === 'available')
  )
}

function parseMushafEditionEntry(
  asset: Record<string, unknown> & { label: string; mushafEditionId: string },
): MushafEditionIndexEntry {
  const riwayah = asset.riwayah
  const mushafEditionId = asset.mushafEditionId
  if (typeof riwayah !== 'string' || riwayah === '') {
    throw new Error('Mushaf edition entry is invalid: missing riwayah')
  }
  if (mushafEditionId === '') {
    throw new Error('Mushaf edition entry is invalid: missing edition id')
  }
  if (!isMushafIdentityPart(mushafEditionId)) {
    throw new Error(`Mushaf edition entry is invalid: bad edition id: ${mushafEditionId}`)
  }
  if (asset.label === '') {
    throw new Error(`Mushaf edition entry is invalid: missing label: ${mushafEditionId}`)
  }
  if (typeof asset.manifestUrl !== 'string' || asset.manifestUrl === '') {
    throw new Error(`Mushaf edition entry is invalid: missing manifest URL: ${mushafEditionId}`)
  }
  if (typeof asset.totalBytes !== 'number' || !Number.isFinite(asset.totalBytes) || asset.totalBytes < 0) {
    throw new Error(`Mushaf edition entry is invalid: missing total bytes: ${mushafEditionId}`)
  }
  if (typeof asset.pageCount !== 'number' || !Number.isInteger(asset.pageCount) || asset.pageCount <= 0) {
    throw new Error(`Mushaf edition entry is invalid: missing page count: ${mushafEditionId}`)
  }
  const pageCount = asset.pageCount
  const version = editionIndexVersion(asset, mushafEditionId)

  const manifestUrl = mushafManifestUrl({ riwayah, mushafEditionId })
  if (asset.manifestUrl !== manifestUrl) {
    throw new Error(`Mushaf edition entry is invalid: manifest URL outside the edition scope: ${mushafEditionId}`)
  }

  // Expected file set per source kind. Inline-SVG editions (v1, the quran.ws
  // shape) ship one page per logical page; external-image editions (v2, the
  // private PDF shape) ship a preview (1280px) and full (2136px) WebP pair.
  const expectedUrls = new Set<string>([manifestUrl])
  const expectedPageUrls: string[] = []
  for (let page = 1; page <= pageCount; page += 1) {
    const editionPageUrl = (assetPath: string) => mushafEditionAssetUrl({ riwayah, mushafEditionId }, assetPath)
    if (version === 'v2') {
      expectedUrls.add(editionPageUrl(mushafWebpPageAssetPath(page, MUSHAF_PREVIEW_RENDITION_WIDTH)))
      expectedUrls.add(editionPageUrl(mushafWebpPageAssetPath(page, MUSHAF_FULL_RENDITION_WIDTH)))
      expectedPageUrls.push(editionPageUrl(mushafWebpPageAssetPath(page, MUSHAF_FULL_RENDITION_WIDTH)))
    } else {
      expectedUrls.add(editionPageUrl(mushafSvgPageAssetPath(page)))
    }
  }
  const pageUrls = readEditionPageUrls(asset.pageUrls, mushafEditionId)
  if (version === 'v2' && (pageUrls == null || pageUrls.length !== expectedPageUrls.length)) {
    throw new Error(`Mushaf edition entry is invalid: v2 entries require the full page URL list: ${mushafEditionId}`)
  }
  if (pageUrls != null && pageUrls.join('\n') !== expectedPageUrls.join('\n')) {
    throw new Error(
      `Mushaf edition entry is invalid: page URL list disagrees with the edition scope: ${mushafEditionId}`,
    )
  }

  if (!Array.isArray(asset.files)) {
    throw new Error(`Mushaf edition entry is invalid: missing files: ${mushafEditionId}`)
  }
  const files: Array<{ url: string; bytes: number; sha256?: string }> = []
  const seenUrls = new Set<string>()
  let totalBytes = 0
  for (const row of asset.files) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Mushaf edition entry is invalid: bad file row: ${mushafEditionId}`)
    }
    const file = row as Record<string, unknown>
    if (
      typeof file.url !== 'string' ||
      typeof file.bytes !== 'number' ||
      !Number.isFinite(file.bytes) ||
      file.bytes < 0
    ) {
      throw new Error(`Mushaf edition entry is invalid: bad file row: ${mushafEditionId}`)
    }
    if (seenUrls.has(file.url)) {
      throw new Error(`Mushaf edition entry is invalid: duplicate file URL: ${file.url}`)
    }
    seenUrls.add(file.url)
    if (!expectedUrls.has(file.url)) {
      throw new Error(`Mushaf edition entry is invalid: unexpected file URL: ${file.url}`)
    }
    const sha256 = typeof file.sha256 === 'string' ? file.sha256.trim().toLowerCase() : undefined
    if (version === 'v2' && sha256 == null) {
      throw new Error(`Mushaf edition entry is invalid: missing file sha256: ${file.url}`)
    }
    if (sha256 != null && !/^[a-f0-9]{64}$/.test(sha256)) {
      throw new Error(`Mushaf edition entry is invalid: bad file sha256: ${file.url}`)
    }
    totalBytes += file.bytes
    files.push({ url: file.url, bytes: file.bytes, ...(sha256 != null ? { sha256 } : {}) })
  }
  if (files.length !== expectedUrls.size) {
    const expectedFiles =
      version === 'v2' ? `manifest + ${pageCount} preview/full page pairs` : `manifest + ${pageCount} pages`
    throw new Error(`Mushaf edition entry is invalid: expected ${expectedFiles}: ${mushafEditionId}`)
  }
  if (totalBytes !== asset.totalBytes) {
    throw new Error(`Mushaf edition entry is invalid: total bytes mismatch: ${mushafEditionId}`)
  }
  return {
    riwayah,
    mushafEditionId,
    label: asset.label,
    ...(typeof asset.shortLabel === 'string' && asset.shortLabel.trim() !== '' ? { shortLabel: asset.shortLabel } : {}),
    pageCount,
    version,
    manifestUrl,
    totalBytes: asset.totalBytes,
    ...(pageUrls != null ? { pageUrls } : {}),
    files,
  }
}

function editionIndexVersion(
  asset: Record<string, unknown> & { mushafEditionId: string },
  mushafEditionId: string,
): 'v1' | 'v2' {
  if (asset.version === undefined) return 'v1'
  if (asset.version === 'v1' || asset.version === 'v2') return asset.version
  throw new Error(`Mushaf edition entry is invalid: unsupported version: ${mushafEditionId}`)
}

function readEditionPageUrls(value: unknown, mushafEditionId: string): string[] | null {
  if (value === undefined) return null
  if (!Array.isArray(value) || value.some((url) => typeof url !== 'string')) {
    throw new Error(`Mushaf edition entry is invalid: bad page URL list: ${mushafEditionId}`)
  }
  return value as string[]
}

function isAcceptedMushafAvailability(value: unknown): value is undefined | 'available' | 'unavailable' | 'not-built' {
  return value === undefined || value === 'available' || value === 'unavailable' || value === 'not-built'
}
