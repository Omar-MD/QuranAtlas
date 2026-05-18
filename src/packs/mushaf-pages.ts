import { CACHE_DATASET } from '../core/constants'
import { clampMushafPage } from '../read/mushaf/navigation'
import { parseViewBox } from '../read/mushaf/sizing'
import type {
  MushafManifest,
  MushafManifestPage,
  MushafPackAvailability,
  MushafResolvedPage,
  QuranRef,
  QuranWsSourceSlug,
} from '../read/mushaf/types'
import {
  DEFAULT_RIWAYAH,
  assertRiwayah,
  getRiwayahLabels,
  getRiwayahPackResult,
  type PackReason,
  type Riwayah,
} from './riwayah'
import { canUseMushafAsset, getMushafAsset } from './mushaf-assets'

const BASE = '/dataset/mushaf-pages'
const manifestPromises = new Map<string, Promise<MushafManifest>>()

const DEFAULT_MUSHAF_EDITION_BY_RIWAYAH: Record<Riwayah, string> = {
  hafs: 'hafs-quran-ws-v1',
  warsh: 'warsh-quran-ws-v1',
  qaloon: 'qalun-quran-ws-v1',
}

type MushafPagePackResultBase = {
  riwayah: Riwayah
  mushafEditionId: string
  totalBytes: number
  optional: boolean
  manifestUrl: string
}

export type MushafPagePackResult =
  | (MushafPagePackResultBase & { kind: 'usable'; reason: 'baseline' | 'cached' })
  | (MushafPagePackResultBase & { kind: 'installable'; reason: 'not-cached' | 'quota-refused' })
  | (MushafPagePackResultBase & { kind: 'missing'; reason: 'missing' | 'removed' })
  | (MushafPagePackResultBase & { kind: 'stale'; reason: 'partial-cache' | 'removed' | 'security-rejected' })
  | (MushafPagePackResultBase & { kind: 'unavailable'; reason: 'missing' | 'removed' | 'security-rejected' })
  | (MushafPagePackResultBase & {
    kind: 'switched-to-baseline'
    reason: 'missing' | 'removed' | 'security-rejected'
    fallbackRiwayah: typeof DEFAULT_RIWAYAH
    fallbackManifestUrl: string
  })

export class MushafPackUnavailableError extends Error {
  code = 'MUSHAF_PACK_UNAVAILABLE' as const
  promptable = true as const
  packageType = 'pages' as const

  constructor(public riwayah: Riwayah, public status?: number, public mushafEditionId = DEFAULT_MUSHAF_EDITION_BY_RIWAYAH[riwayah]) {
    super(`Mushaf page pack is not available for ${riwayah}/${mushafEditionId}`)
    this.name = 'MushafPackUnavailableError'
  }
}

function manifestKey(riwayah: Riwayah, mushafEditionId: string): string {
  return `${riwayah}/${mushafEditionId}`
}

function editionForRiwayah(riwayah: Riwayah, mushafEditionId?: string): string {
  return mushafEditionId ?? DEFAULT_MUSHAF_EDITION_BY_RIWAYAH[riwayah]
}

function manifestUrl(riwayah: Riwayah, mushafEditionId = editionForRiwayah(riwayah)): string {
  return `${BASE}/${riwayah}/${mushafEditionId}/manifest.json`
}

function baseResult(
  riwayah: Riwayah,
  mushafEditionId = editionForRiwayah(riwayah),
  totalBytes = 0,
  optional = riwayah !== DEFAULT_RIWAYAH,
): MushafPagePackResultBase {
  return {
    riwayah,
    mushafEditionId,
    totalBytes,
    optional,
    manifestUrl: manifestUrl(riwayah, mushafEditionId),
  }
}

async function cachedResponse(url: string): Promise<Response | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_DATASET)
  return (await cache.match(url)) || (await cache.match(new URL(url, location.origin).href)) || null
}

async function cacheResponse(url: string, response: Response): Promise<void> {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_DATASET)
  await cache.put(url, response)
}

function pad3(page: number): string {
  return String(page).padStart(3, '0')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertQuranRef(raw: unknown, context: string): QuranRef {
  if (!isRecord(raw)) throw new Error(`Invalid Mushaf first verse ${context}`)
  const { surah, verse } = raw
  if (
    !Number.isInteger(surah)
    || (surah as number) < 1
    || (surah as number) > 114
    || !Number.isInteger(verse)
    || (verse as number) < 1
  ) {
    throw new Error(`Invalid Mushaf first verse ${context}`)
  }
  return { surah: surah as number, verse: verse as number }
}

function assertAssetPath(path: unknown, page: number): string {
  if (typeof path !== 'string' || !/^pages\/\d{3}\.svg$/.test(path) || path.includes('..')) {
    throw new Error(`Invalid Mushaf asset path at page ${page}`)
  }
  const expected = `pages/${pad3(page)}.svg`
  if (path !== expected) {
    throw new Error(`Invalid Mushaf asset path at page ${page}: expected ${expected}`)
  }
  return path
}

function assertPage(raw: unknown, index: number): MushafManifestPage {
  if (!isRecord(raw)) throw new Error(`Invalid Mushaf page entry at index ${index}`)

  const page = raw.page
  if (!Number.isInteger(page) || (page as number) < 1) {
    throw new Error(`Invalid Mushaf page number at index ${index}`)
  }

  const pageNumber = page as number
  const assetPath = assertAssetPath(raw.assetPath, pageNumber)
  if (typeof raw.viewBox !== 'string') {
    throw new Error(`Invalid Mushaf viewBox at page ${pageNumber}`)
  }
  parseViewBox(raw.viewBox)

  if (!Number.isInteger(raw.bytes) || (raw.bytes as number) <= 0) {
    throw new Error(`Invalid Mushaf byte count at page ${pageNumber}`)
  }
  if (typeof raw.hash !== 'undefined' && typeof raw.hash !== 'string') {
    throw new Error(`Invalid Mushaf hash at page ${pageNumber}`)
  }
  if (typeof raw.sourcePdfUrl !== 'string' || !raw.sourcePdfUrl.startsWith('https://pdf.quran.ws/')) {
    throw new Error(`Invalid Mushaf source PDF URL at page ${pageNumber}`)
  }

  return {
    page: pageNumber,
    assetPath,
    viewBox: raw.viewBox.trim(),
    bytes: raw.bytes as number,
    ...(typeof raw.hash === 'string' ? { hash: raw.hash } : {}),
    sourcePdfUrl: raw.sourcePdfUrl,
    firstVerse: assertQuranRef(raw.firstVerse, `at page ${pageNumber}`),
  }
}

function assertVerseToPage(raw: unknown, pageCount: number): Record<string, number> {
  if (!isRecord(raw)) throw new Error('Invalid Mushaf verse-to-page map')

  const verseToPage: Record<string, number> = {}
  for (const [key, page] of Object.entries(raw)) {
    const match = key.match(/^([1-9]\d*):([1-9]\d*)$/)
    if (!match) {
      throw new Error(`Invalid Mushaf verse key: ${key}`)
    }
    const surah = Number.parseInt(match[1]!, 10)
    if (surah > 114) {
      throw new Error(`Invalid Mushaf verse key: ${key}`)
    }
    if (!Number.isInteger(page) || (page as number) < 1 || (page as number) > pageCount) {
      throw new Error(`Invalid Mushaf verse page for ${key}: ${String(page)}`)
    }
    verseToPage[key] = page as number
  }
  return verseToPage
}

function assertManifest(raw: unknown, expectedRiwayah: Riwayah, expectedMushafEditionId: string): MushafManifest {
  if (!isRecord(raw)) throw new Error('Invalid Mushaf manifest')

  if (raw.version !== 1) {
    throw new Error(`Unsupported Mushaf manifest version: ${String(raw.version)}`)
  }
  if (raw.riwayah !== expectedRiwayah) {
    throw new Error(`Mushaf manifest riwayah mismatch: ${String(raw.riwayah)}`)
  }
  if (raw.mushafEditionId !== expectedMushafEditionId) {
    throw new Error(`Mushaf manifest edition mismatch: ${String(raw.mushafEditionId)}`)
  }
  assertRiwayah(raw.riwayah, 'Mushaf riwayah')

  const expectedSourceSlug = getRiwayahLabels(expectedRiwayah).sourceSlug
  if (raw.sourceSlug !== expectedSourceSlug) {
    throw new Error(`Invalid quran.ws source slug for ${expectedRiwayah}: ${String(raw.sourceSlug)}`)
  }
  if (!Number.isInteger(raw.pageCount) || (raw.pageCount as number) < 1) {
    throw new Error(`Invalid Mushaf page count: ${String(raw.pageCount)}`)
  }
  if (!isRecord(raw.attribution)
    || raw.attribution.provider !== 'quran.ws'
    || typeof raw.attribution.sourceUrl !== 'string'
    || !raw.attribution.sourceUrl.startsWith('https://pdf.quran.ws/')) {
    throw new Error('Invalid Mushaf attribution')
  }
  if (!Array.isArray(raw.pages)) {
    throw new Error('Invalid Mushaf manifest pages')
  }

  const pageCount = raw.pageCount as number
  const pages = raw.pages.map((page, index) => assertPage(page, index))
  if (pages.length !== pageCount) {
    throw new Error(`Mushaf manifest pages must contain ${pageCount} contiguous entries`)
  }
  pages.forEach((page, index) => {
    if (page.page !== index + 1) {
      throw new Error('Mushaf manifest pages must be contiguous from page 1')
    }
  })
  const firstRatio = ratioForViewBox(pages[0]!.viewBox)
  for (const page of pages) {
    const ratio = ratioForViewBox(page.viewBox)
    if (Math.abs(ratio - firstRatio) > 0.001) {
      throw new Error(`Mushaf manifest page ${page.page} has an unexpected viewBox aspect ratio`)
    }
  }

  return {
    version: 1,
    riwayah: raw.riwayah,
    mushafEditionId: raw.mushafEditionId as string,
    sourceSlug: raw.sourceSlug as QuranWsSourceSlug,
    pageCount,
    attribution: {
      provider: 'quran.ws',
      sourceUrl: raw.attribution.sourceUrl,
    },
    verseToPage: assertVerseToPage(raw.verseToPage, pageCount),
    pages,
  }
}

function reasonFromManifestError(error: unknown): Extract<PackReason, 'missing' | 'security-rejected'> {
  if (error instanceof MushafPackUnavailableError) return 'missing'
  return 'security-rejected'
}

export function clearMushafManifestCache(): void {
  manifestPromises.clear()
}

export async function loadMushafManifest(riwayah: Riwayah, mushafEditionId = editionForRiwayah(riwayah)): Promise<MushafManifest> {
  assertRiwayah(riwayah, 'Mushaf riwayah')

  const key = manifestKey(riwayah, mushafEditionId)
  const existing = manifestPromises.get(key)
  if (existing) return existing

  const url = manifestUrl(riwayah, mushafEditionId)
  const readResponse = async (response: Response): Promise<MushafManifest> => {
    if (!response.ok) {
      throw new MushafPackUnavailableError(riwayah, response.status, mushafEditionId)
    }
    const cacheCopy = typeof response.clone === 'function' ? response.clone() : null
    let raw: unknown
    try {
      raw = await response.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new MushafPackUnavailableError(riwayah, response.status, mushafEditionId)
      }
      throw error
    }
    const manifest = assertManifest(raw, riwayah, mushafEditionId)
    if (cacheCopy) await cacheResponse(url, cacheCopy).catch(() => undefined)
    return manifest
  }

  const promise = fetch(url).then(readResponse).catch(async (error) => {
    try {
      const cached = await cachedResponse(url).catch(() => null)
      if (cached) return await readResponse(cached)
    } catch {
      manifestPromises.delete(key)
      throw error
    }
    manifestPromises.delete(key)
    throw error
  })
  manifestPromises.set(key, promise)
  return promise
}

export async function getMushafPackAvailability(riwayah: Riwayah, mushafEditionId = editionForRiwayah(riwayah)): Promise<MushafPackAvailability> {
  assertRiwayah(riwayah, 'Mushaf riwayah')

  try {
    await loadMushafManifest(riwayah, mushafEditionId)
    return { riwayah, mushafEditionId, available: true, manifestUrl: manifestUrl(riwayah, mushafEditionId) }
  } catch (error) {
    if (error instanceof MushafPackUnavailableError) {
      manifestPromises.delete(manifestKey(riwayah, mushafEditionId))
      return { riwayah, mushafEditionId, available: false, manifestUrl: manifestUrl(riwayah, mushafEditionId) }
    }
    throw error
  }
}

export async function getMushafPagePackResult(
  riwayah: Riwayah,
  options: { mushafEditionId?: string; fallbackToBaseline?: boolean; installBlocked?: 'quota-refused'; missingReason?: 'missing' | 'removed' } = {},
): Promise<MushafPagePackResult> {
  const mushafEditionId = editionForRiwayah(riwayah, options.mushafEditionId)
  const packResult = await getRiwayahPackResult(riwayah, {
    installBlocked: options.installBlocked,
    missingReason: options.missingReason,
  })
  const initial = baseResult(riwayah, mushafEditionId, packResult.totalBytes, packResult.optional)
  if (packResult.kind === 'installable') {
    return { ...initial, kind: 'installable', reason: packResult.reason }
  }
  if (packResult.kind === 'missing') {
    return { ...initial, kind: 'missing', reason: packResult.reason }
  }
  if (packResult.kind === 'stale') {
    return { ...initial, kind: 'stale', reason: packResult.reason }
  }
  if (packResult.kind === 'unavailable') {
    return { ...initial, kind: 'unavailable', reason: packResult.reason }
  }
  if (packResult.kind === 'switched-to-baseline') {
    const fallbackMushafEditionId = editionForRiwayah(packResult.fallbackRiwayah)
    return {
      ...initial,
      kind: 'switched-to-baseline',
      reason: packResult.reason,
      fallbackRiwayah: packResult.fallbackRiwayah,
      fallbackManifestUrl: manifestUrl(packResult.fallbackRiwayah, fallbackMushafEditionId),
    }
  }

  try {
    await assertRenderableMushafAsset(riwayah, mushafEditionId)
    await loadMushafManifest(riwayah, mushafEditionId)
    return { ...initial, kind: 'usable', reason: packResult.reason }
  } catch (error) {
    const reason = reasonFromManifestError(error)
    if (reason === 'missing') {
      return { ...initial, kind: 'missing', reason }
    }
    return { ...initial, kind: 'unavailable', reason }
  }
}

export async function resolveMushafPagePack(
  riwayah: Riwayah,
  options: { mushafEditionId?: string; fallbackToBaseline?: boolean; installBlocked?: 'quota-refused'; missingReason?: 'missing' | 'removed' } = {},
): Promise<MushafPagePackResult> {
  const mushafEditionId = editionForRiwayah(riwayah, options.mushafEditionId)
  const result = await getMushafPagePackResult(riwayah, options)
  if (!options.fallbackToBaseline || riwayah === DEFAULT_RIWAYAH) return result
  if (result.kind === 'installable' || result.kind === 'stale' || result.kind === 'usable') return result
  const baseline = await getMushafPagePackResult(DEFAULT_RIWAYAH)
  if (baseline.kind !== 'usable') return result
  const fallbackMushafEditionId = editionForRiwayah(DEFAULT_RIWAYAH)
  return {
    ...baseResult(riwayah, mushafEditionId, result.totalBytes, result.optional),
    kind: 'switched-to-baseline',
    reason: result.reason,
    fallbackRiwayah: DEFAULT_RIWAYAH,
    fallbackManifestUrl: manifestUrl(DEFAULT_RIWAYAH, fallbackMushafEditionId),
  }
}

export async function resolveMushafPage({
  riwayah,
  mushafEditionId = editionForRiwayah(riwayah),
  page,
}: {
  riwayah: Riwayah
  mushafEditionId?: string
  page: number
}): Promise<MushafResolvedPage> {
  await assertRenderableMushafAsset(riwayah, mushafEditionId)
  const manifest = await loadMushafManifest(riwayah, mushafEditionId)
  const clampedPage = clampMushafPage(page, manifest.pageCount)
  const entry = manifest.pages.find((candidate) => candidate.page === clampedPage)
  if (!entry) {
    throw new Error(`Mushaf manifest for ${riwayah} has no page ${clampedPage}`)
  }

  return {
    riwayah,
    mushafEditionId,
    page: clampedPage,
    pageCount: manifest.pageCount,
    riwayahLabel: getRiwayahLabels(riwayah).runtimeFull,
    assetPath: entry.assetPath,
    assetUrl: `${BASE}/${riwayah}/${mushafEditionId}/${entry.assetPath}`,
    viewBox: parseViewBox(entry.viewBox),
    viewBoxText: entry.viewBox,
    bytes: entry.bytes,
    ...(entry.hash ? { hash: entry.hash } : {}),
    firstVerse: { surah: entry.firstVerse.surah, verse: entry.firstVerse.verse },
    sourcePdfUrl: entry.sourcePdfUrl,
  }
}

function ratioForViewBox(viewBox: string): number {
  const parsed = parseViewBox(viewBox)
  return parsed.width / parsed.height
}

export async function pageForVerse({
  riwayah,
  mushafEditionId = editionForRiwayah(riwayah),
  surah,
  verse,
}: {
  riwayah: Riwayah
  mushafEditionId?: string
  surah: number
  verse: number
}): Promise<number | null> {
  await assertRenderableMushafAsset(riwayah, mushafEditionId)
  const manifest = await loadMushafManifest(riwayah, mushafEditionId)
  return manifest.verseToPage[`${surah}:${verse}`] ?? null
}

async function assertRenderableMushafAsset(riwayah: Riwayah, mushafEditionId: string): Promise<void> {
  let asset = null
  try {
    asset = await getMushafAsset(riwayah, mushafEditionId)
  } catch {
    throw new MushafPackUnavailableError(riwayah, undefined, mushafEditionId)
  }
  if (!asset) throw new MushafPackUnavailableError(riwayah, undefined, mushafEditionId)
  if (asset.shipped) return
  if (!(await canUseMushafAsset(riwayah, mushafEditionId))) {
    throw new MushafPackUnavailableError(riwayah, undefined, mushafEditionId)
  }
}
