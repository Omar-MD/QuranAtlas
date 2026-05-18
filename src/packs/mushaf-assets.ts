import { CACHE_DATASET, DATASET_MUSHAF_ASSETS_PATH } from '../core/constants'
import { cacheNameFor } from '../infra/sw/route-defs'
import { assertRiwayah, type Riwayah } from './riwayah'
import type { AssetStatusKind, MushafAsset, MushafAssetIndex } from './asset-types'

let mushafAssetIndexPromise: Promise<MushafAssetIndex> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function originForRuntime(): string {
  return typeof location !== 'undefined' ? location.origin : 'http://localhost'
}

function assertDatasetUrl(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.includes('://') || value.includes('..') || !value.startsWith('/dataset/mushaf-pages/')) {
    throw new Error(`Mushaf asset index contains an invalid same-origin dataset URL for ${context}`)
  }
  const url = new URL(value, originForRuntime())
  if (url.origin !== originForRuntime() || !url.pathname.startsWith('/dataset/mushaf-pages/')) {
    throw new Error(`Mushaf asset index contains an invalid same-origin dataset URL for ${context}`)
  }
  return value
}

function assertPositiveBytes(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Mushaf asset index has invalid byte count for ${context}`)
  }
  return value
}

function assertMushafAsset(raw: unknown): MushafAsset {
  if (!isRecord(raw)) throw new Error('Invalid Mushaf asset entry')
  assertRiwayah(raw.riwayah, 'Mushaf asset riwayah')
  if (typeof raw.mushafEditionId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/.test(raw.mushafEditionId)) {
    throw new Error(`Invalid mushafEditionId: ${String(raw.mushafEditionId)}`)
  }
  const expectedPrefix = `/dataset/mushaf-pages/${raw.riwayah}/${raw.mushafEditionId}/`
  const manifestUrl = assertDatasetUrl(raw.manifestUrl, `${raw.riwayah}.${raw.mushafEditionId}.manifestUrl`)
  if (manifestUrl !== `${expectedPrefix}manifest.json`) {
    throw new Error(`Mushaf asset ${raw.riwayah}/${raw.mushafEditionId} has invalid manifestUrl`)
  }
  const files = Array.isArray(raw.files)
    ? raw.files.map((file, index) => {
        if (!isRecord(file)) throw new Error(`Invalid Mushaf asset file at ${index}`)
        const url = assertDatasetUrl(file.url, `${raw.riwayah}.${raw.mushafEditionId}.files[${index}]`)
        if (!url.startsWith(expectedPrefix)) {
          throw new Error(`Mushaf asset ${raw.riwayah}/${raw.mushafEditionId} file escapes edition path`)
        }
        return {
          url,
          bytes: assertPositiveBytes(file.bytes, `${raw.riwayah}.${raw.mushafEditionId}.files[${index}]`),
        }
      })
    : null
  if (!files || files.length === 0) throw new Error(`Mushaf asset ${raw.riwayah}/${raw.mushafEditionId} has no files`)
  const totalBytes = assertPositiveBytes(raw.totalBytes, `${raw.riwayah}.${raw.mushafEditionId}.totalBytes`)
  if (files.reduce((sum, file) => sum + file.bytes, 0) !== totalBytes) {
    throw new Error(`Mushaf asset ${raw.riwayah}/${raw.mushafEditionId} totalBytes mismatch`)
  }
  const pageCount = raw.pageCount
  if (!Number.isInteger(pageCount) || (pageCount as number) <= 0) {
    throw new Error(`Mushaf asset ${raw.riwayah}/${raw.mushafEditionId} has invalid pageCount`)
  }
  return {
    riwayah: raw.riwayah,
    mushafEditionId: raw.mushafEditionId,
    label: String(raw.label ?? raw.mushafEditionId),
    tradition: String(raw.tradition ?? ''),
    providerId: String(raw.providerId ?? ''),
    licenseId: String(raw.licenseId ?? ''),
    visibility: raw.visibility === 'baseline' ? 'baseline' : 'optional',
    shipped: raw.shipped === true,
    manifestUrl,
    files,
    totalBytes,
    pageCount: pageCount as number,
    provenance: isRecord(raw.provenance) ? raw.provenance : {},
  }
}

function assertMushafAssetIndex(raw: unknown): MushafAssetIndex {
  if (!isRecord(raw)) throw new Error('Invalid Mushaf asset index')
  if (raw.version !== 1) throw new Error(`Unsupported Mushaf asset index version: ${String(raw.version)}`)
  if (!isRecord(raw.defaults)) throw new Error('Mushaf asset index missing defaults')
  if (!Array.isArray(raw.assets)) throw new Error('Mushaf asset index assets must be an array')
  const assets = raw.assets.map(assertMushafAsset)
  const defaults: Partial<Record<Riwayah, string>> = {}
  for (const [riwayah, mushafEditionId] of Object.entries(raw.defaults)) {
    assertRiwayah(riwayah, 'Mushaf asset default riwayah')
    if (typeof mushafEditionId !== 'string') throw new Error(`Mushaf asset default ${riwayah} must be a string`)
    if (!assets.some((asset) => asset.riwayah === riwayah && asset.mushafEditionId === mushafEditionId)) {
      throw new Error(`Mushaf asset default ${riwayah} references missing edition ${mushafEditionId}`)
    }
    defaults[riwayah] = mushafEditionId
  }
  return { version: 1, defaults, assets }
}

async function cachedIndexResponse(): Promise<Response | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_DATASET)
  return (await cache.match(DATASET_MUSHAF_ASSETS_PATH)) || null
}

async function fetchMushafAssetIndex(): Promise<MushafAssetIndex> {
  try {
    const response = await fetch(DATASET_MUSHAF_ASSETS_PATH)
    if (!response.ok) throw new Error(`Failed to fetch Mushaf asset index: ${response.status}`)
    return assertMushafAssetIndex(await response.json())
  } catch (networkError) {
    const cached = await cachedIndexResponse().catch(() => null)
    if (!cached) throw networkError
    return assertMushafAssetIndex(await cached.json())
  }
}

export function clearMushafAssetIndexCacheForTests(): void {
  mushafAssetIndexPromise = null
}

export async function loadMushafAssetIndex(): Promise<MushafAssetIndex> {
  mushafAssetIndexPromise ??= fetchMushafAssetIndex().catch((error) => {
    mushafAssetIndexPromise = null
    throw error
  })
  return mushafAssetIndexPromise
}

export async function getMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<MushafAsset | null> {
  assertRiwayah(riwayah, 'Mushaf asset riwayah')
  const index = await loadMushafAssetIndex()
  return index.assets.find((asset) => asset.riwayah === riwayah && asset.mushafEditionId === mushafEditionId) ?? null
}

export async function defaultMushafEditionForRiwayah(riwayah: Riwayah): Promise<string> {
  assertRiwayah(riwayah, 'Mushaf asset riwayah')
  const index = await loadMushafAssetIndex()
  const id = index.defaults[riwayah]
  return id ?? index.defaults.qaloon ?? 'qalun-quran-ws-v1'
}

async function cacheHasIndexedUrl(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  const absolute = new URL(url, originForRuntime())
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return false
  const cache = await caches.open(cacheName)
  return Boolean((await cache.match(absolute.href)) || (await cache.match(url)))
}

async function cachedFileCount(asset: MushafAsset): Promise<number> {
  let cached = 0
  for (const file of asset.files) {
    if (await cacheHasIndexedUrl(file.url)) cached += 1
  }
  return cached
}

async function manifestIdentityMatches(asset: MushafAsset): Promise<boolean> {
  const response = await fetch(asset.manifestUrl)
  if (!response.ok) return false
  const raw = await response.json()
  return isRecord(raw)
    && raw.version === 1
    && raw.riwayah === asset.riwayah
    && raw.mushafEditionId === asset.mushafEditionId
}

export async function getMushafAssetStatus(riwayah: Riwayah, mushafEditionId: string): Promise<AssetStatusKind> {
  const asset = await getMushafAsset(riwayah, mushafEditionId)
  if (!asset) return 'incompatible'
  if (asset.shipped) {
    return await manifestIdentityMatches(asset).catch(() => false) ? 'shipped' : 'unavailable'
  }
  const cached = await cachedFileCount(asset)
  if (cached === asset.files.length) return 'installed'
  if (cached > 0) return 'incomplete'
  return 'installable'
}

export async function canUseMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<boolean> {
  const asset = await getMushafAsset(riwayah, mushafEditionId)
  if (!asset) return false
  const status = await getMushafAssetStatus(riwayah, mushafEditionId)
  if (status !== 'shipped' && status !== 'installed' && status !== 'cached') return false
  return manifestIdentityMatches(asset).catch(() => false)
}
