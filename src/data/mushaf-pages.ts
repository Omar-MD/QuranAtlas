import { CACHE_DATASET } from '../core/constants'
import type { Riwayah } from '../configure/state.svelte'
import { clampMushafPage } from '../read/mushaf/navigation'
import { parseViewBox } from '../read/mushaf/sizing'
import { isRiwayahUsable } from './riwayah-packages'
import type {
  MushafManifest,
  MushafManifestPage,
  MushafPackAvailability,
  MushafResolvedPage,
  QuranRef,
  QuranWsSourceSlug,
} from '../read/mushaf/types'

const BASE = '/dataset/mushaf-pages'
const manifestPromises = new Map<Riwayah, Promise<MushafManifest>>()
const SOURCE_SLUG_BY_RIWAYAH: Record<Riwayah, QuranWsSourceSlug> = {
  hafs: 'hafs',
  warsh: 'warsh',
  qaloon: 'qalun',
}
const RIWAYAH_LABELS: Record<Riwayah, string> = {
  hafs: 'Ḥafṣ ʿan ʿĀṣim',
  warsh: 'Warsh ʿan Nāfiʿ',
  qaloon: 'Qālūn ʿan Nāfiʿ',
}

export class MushafPackUnavailableError extends Error {
  code = 'MUSHAF_PACK_UNAVAILABLE' as const
  promptable = true as const
  packageType = 'pages' as const

  constructor(public riwayah: Riwayah, public status?: number) {
    super(`Mushaf page pack is not available for ${riwayah}`)
    this.name = 'MushafPackUnavailableError'
  }
}

function manifestUrl(riwayah: Riwayah): string {
  return `${BASE}/${riwayah}/manifest.json`
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

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
}

function assertRiwayah(value: unknown): asserts value is Riwayah {
  if (!isRiwayah(value)) {
    throw new Error(`Invalid Mushaf riwayah: ${String(value)}`)
  }
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

function assertManifest(raw: unknown, expectedRiwayah: Riwayah): MushafManifest {
  if (!isRecord(raw)) throw new Error('Invalid Mushaf manifest')

  if (raw.version !== 1) {
    throw new Error(`Unsupported Mushaf manifest version: ${String(raw.version)}`)
  }
  if (raw.riwayah !== expectedRiwayah) {
    throw new Error(`Mushaf manifest riwayah mismatch: ${String(raw.riwayah)}`)
  }
  assertRiwayah(raw.riwayah)

  const expectedSourceSlug = SOURCE_SLUG_BY_RIWAYAH[expectedRiwayah]
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

export function clearMushafManifestCache(): void {
  manifestPromises.clear()
}

export async function loadMushafManifest(riwayah: Riwayah): Promise<MushafManifest> {
  assertRiwayah(riwayah)

  const existing = manifestPromises.get(riwayah)
  if (existing) return existing

  const url = manifestUrl(riwayah)
  const readResponse = async (response: Response): Promise<MushafManifest> => {
    if (!response.ok) {
      throw new MushafPackUnavailableError(riwayah, response.status)
    }
    const cacheCopy = typeof response.clone === 'function' ? response.clone() : null
    let raw: unknown
    try {
      raw = await response.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new MushafPackUnavailableError(riwayah, response.status)
      }
      throw error
    }
    const manifest = assertManifest(raw, riwayah)
    if (cacheCopy) await cacheResponse(url, cacheCopy).catch(() => undefined)
    return manifest
  }

  const promise = fetch(url).then(readResponse).catch(async (error) => {
    const cached = await cachedResponse(url).catch(() => null)
    if (cached) return readResponse(cached)
    manifestPromises.delete(riwayah)
    throw error
  })
  manifestPromises.set(riwayah, promise)
  return promise
}

export async function getMushafPackAvailability(riwayah: Riwayah): Promise<MushafPackAvailability> {
  assertRiwayah(riwayah)

  try {
    await loadMushafManifest(riwayah)
    return { riwayah, available: true, manifestUrl: manifestUrl(riwayah) }
  } catch (error) {
    if (error instanceof MushafPackUnavailableError) {
      manifestPromises.delete(riwayah)
      return { riwayah, available: false, manifestUrl: manifestUrl(riwayah) }
    }
    throw error
  }
}

export async function resolveMushafPage({
  riwayah,
  page,
}: {
  riwayah: Riwayah
  page: number
}): Promise<MushafResolvedPage> {
  await assertRenderableRiwayah(riwayah)
  const manifest = await loadMushafManifest(riwayah)
  const clampedPage = clampMushafPage(page, manifest.pageCount)
  const entry = manifest.pages.find((candidate) => candidate.page === clampedPage)
  if (!entry) {
    throw new Error(`Mushaf manifest for ${riwayah} has no page ${clampedPage}`)
  }

  return {
    page: clampedPage,
    pageCount: manifest.pageCount,
    riwayahLabel: RIWAYAH_LABELS[riwayah],
    assetPath: entry.assetPath,
    assetUrl: `${BASE}/${riwayah}/${entry.assetPath}`,
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
  surah,
  verse,
}: {
  riwayah: Riwayah
  surah: number
  verse: number
}): Promise<number | null> {
  await assertRenderableRiwayah(riwayah)
  const manifest = await loadMushafManifest(riwayah)
  return manifest.verseToPage[`${surah}:${verse}`] ?? null
}

async function assertRenderableRiwayah(riwayah: Riwayah): Promise<void> {
  try {
    if (!(await isRiwayahUsable(riwayah))) {
      if (riwayah === 'qaloon' && typeof navigator !== 'undefined' && navigator.onLine === false) return
      throw new MushafPackUnavailableError(riwayah)
    }
  } catch (error) {
    if (error instanceof MushafPackUnavailableError) throw error
    if (riwayah !== 'qaloon') throw new MushafPackUnavailableError(riwayah)
  }
}
