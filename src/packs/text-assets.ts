import { CACHE_DATASET, DATASET_TEXT_ASSETS_PATH } from '../core/constants'
import { cacheNameFor } from '../infra/sw/route-defs'
import { assertRiwayah, type Riwayah } from './riwayah'
import type { AssetStatusKind, TextAsset, TextAssetIndex } from './asset-types'

let textAssetIndexPromise: Promise<TextAssetIndex> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function originForRuntime(): string {
  return typeof location !== 'undefined' ? location.origin : 'http://localhost'
}

function assertDatasetUrl(value: unknown, context: string, prefix = '/dataset/quran-text/'): string {
  if (typeof value !== 'string' || value.includes('://') || value.includes('..') || !value.startsWith(prefix)) {
    throw new Error(`Text asset index contains an invalid same-origin dataset URL for ${context}`)
  }
  const url = new URL(value, originForRuntime())
  if (url.origin !== originForRuntime() || !url.pathname.startsWith(prefix)) {
    throw new Error(`Text asset index contains an invalid same-origin dataset URL for ${context}`)
  }
  return value
}

function assertPositiveBytes(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Text asset index has invalid byte count for ${context}`)
  }
  return value
}

function assertTextAsset(raw: unknown): TextAsset {
  if (!isRecord(raw)) throw new Error('Invalid text asset entry')
  assertRiwayah(raw.riwayah, 'text asset riwayah')
  if (typeof raw.textStyleId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/.test(raw.textStyleId)) {
    throw new Error(`Invalid textStyleId: ${String(raw.textStyleId)}`)
  }
  const expectedTemplate = `quran-text/${raw.riwayah}/${raw.textStyleId}/{surah}.json`
  if (raw.outputPathTemplate !== expectedTemplate) {
    throw new Error(`Text asset ${raw.riwayah}/${raw.textStyleId} outputPathTemplate must be ${expectedTemplate}`)
  }
  const files = Array.isArray(raw.files)
    ? raw.files.map((file, index) => {
        if (!isRecord(file)) throw new Error(`Invalid text asset file at ${index}`)
        return {
          url: assertDatasetUrl(file.url, `${raw.riwayah}.${raw.textStyleId}.files[${index}]`),
          bytes: assertPositiveBytes(file.bytes, `${raw.riwayah}.${raw.textStyleId}.files[${index}]`),
        }
      })
    : null
  if (!files || files.length === 0) throw new Error(`Text asset ${raw.riwayah}/${raw.textStyleId} has no files`)
  const totalBytes = assertPositiveBytes(raw.totalBytes, `${raw.riwayah}.${raw.textStyleId}.totalBytes`)
  const summedBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  if (summedBytes !== totalBytes) {
    throw new Error(`Text asset ${raw.riwayah}/${raw.textStyleId} totalBytes mismatch`)
  }
  const ayahCount = raw.ayahCount
  if (!Number.isInteger(ayahCount) || (ayahCount as number) <= 0) {
    throw new Error(`Text asset ${raw.riwayah}/${raw.textStyleId} has invalid ayahCount`)
  }
  return {
    riwayah: raw.riwayah,
    textStyleId: raw.textStyleId,
    label: String(raw.label ?? raw.textStyleId),
    scriptFamily: String(raw.scriptFamily ?? ''),
    providerId: String(raw.providerId ?? ''),
    licenseId: String(raw.licenseId ?? ''),
    visibility: raw.visibility === 'baseline' ? 'baseline' : 'optional',
    shipped: raw.shipped === true,
    files,
    totalBytes,
    ayahCount: ayahCount as number,
    outputPathTemplate: raw.outputPathTemplate,
    provenance: isRecord(raw.provenance) ? raw.provenance : {},
  }
}

function assertTextAssetIndex(raw: unknown): TextAssetIndex {
  if (!isRecord(raw)) throw new Error('Invalid text asset index')
  if (raw.version !== 1) throw new Error(`Unsupported text asset index version: ${String(raw.version)}`)
  if (!isRecord(raw.defaults)) throw new Error('Text asset index missing defaults')
  if (!Array.isArray(raw.assets)) throw new Error('Text asset index assets must be an array')
  const assets = raw.assets.map(assertTextAsset)
  const defaults: Partial<Record<Riwayah, string>> = {}
  for (const [riwayah, textStyleId] of Object.entries(raw.defaults)) {
    assertRiwayah(riwayah, 'text asset default riwayah')
    if (typeof textStyleId !== 'string') throw new Error(`Text asset default ${riwayah} must be a string`)
    if (!assets.some((asset) => asset.riwayah === riwayah && asset.textStyleId === textStyleId)) {
      throw new Error(`Text asset default ${riwayah} references missing text style ${textStyleId}`)
    }
    defaults[riwayah] = textStyleId
  }
  return { version: 1, defaults, assets }
}

async function cachedIndexResponse(): Promise<Response | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_DATASET)
  return (await cache.match(DATASET_TEXT_ASSETS_PATH)) || null
}

async function fetchTextAssetIndex(): Promise<TextAssetIndex> {
  try {
    const response = await fetch(DATASET_TEXT_ASSETS_PATH)
    if (!response.ok) throw new Error(`Failed to fetch text asset index: ${response.status}`)
    return assertTextAssetIndex(await response.json())
  } catch (networkError) {
    const cached = await cachedIndexResponse().catch(() => null)
    if (!cached) throw networkError
    return assertTextAssetIndex(await cached.json())
  }
}

export function clearTextAssetIndexCacheForTests(): void {
  textAssetIndexPromise = null
}

export async function loadTextAssetIndex(): Promise<TextAssetIndex> {
  textAssetIndexPromise ??= fetchTextAssetIndex().catch((error) => {
    textAssetIndexPromise = null
    throw error
  })
  return textAssetIndexPromise
}

export async function getTextAsset(riwayah: Riwayah, textStyleId: string): Promise<TextAsset | null> {
  assertRiwayah(riwayah, 'text asset riwayah')
  const index = await loadTextAssetIndex()
  return index.assets.find((asset) => asset.riwayah === riwayah && asset.textStyleId === textStyleId) ?? null
}

export async function defaultTextStyleForRiwayah(riwayah: Riwayah): Promise<string> {
  assertRiwayah(riwayah, 'text asset riwayah')
  const index = await loadTextAssetIndex()
  const id = index.defaults[riwayah]
  if (!id) throw new Error(`Text asset default missing for ${riwayah}`)
  return id
}

async function cacheHasIndexedUrl(url: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false
  const absolute = new URL(url, originForRuntime())
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return false
  const cache = await caches.open(cacheName)
  return Boolean((await cache.match(absolute.href)) || (await cache.match(url)))
}

async function cachedFileCount(asset: TextAsset): Promise<number> {
  let cached = 0
  for (const file of asset.files) {
    if (await cacheHasIndexedUrl(file.url)) cached += 1
  }
  return cached
}

export async function getTextAssetStatus(riwayah: Riwayah, textStyleId: string): Promise<AssetStatusKind> {
  const asset = await getTextAsset(riwayah, textStyleId)
  if (!asset) return 'incompatible'
  if (asset.shipped) return 'shipped'
  const cached = await cachedFileCount(asset)
  if (cached === asset.files.length) return 'installed'
  if (cached > 0) return 'incomplete'
  return 'installable'
}

export async function canUseTextAsset(riwayah: Riwayah, textStyleId: string): Promise<boolean> {
  const status = await getTextAssetStatus(riwayah, textStyleId)
  return status === 'shipped' || status === 'installed' || status === 'cached'
}
