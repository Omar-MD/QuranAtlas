/**
 * Corpus access layer (KFGQPC riwayat dataset).
 * Deep module: callers never know whether data comes from cache or network.
 */

import { CACHE_DATASET } from '../core/constants'
import { settings } from '../core/settings.svelte'
import type { Riwayah } from '../packs/riwayah'
import { getTextAsset, canUseTextAsset } from '../packs/text-assets'
import { getRiwayahPackageEntry } from './riwayah-packages'

const DATASET_BASE = '/dataset'
const FETCH_TIMEOUT_MS = 3000

export type AyahRecord = {
  // id / line_start / line_end carried for Hafs only (audit R-24,
  // 2026-04-29) because the v2.1 page-image mushaf renderer will
  // need them. Warsh + Qaloon ship without these fields.
  id?: number
  jozz: number
  page: string
  line_start?: number
  line_end?: number
  aya_no: number
  aya_text: string
}

export type SurahPayload = {
  riwayah: Riwayah
  version: string
  sura_no: number
  sura_name_ar: string
  sura_name_en: string
  ayat: AyahRecord[]
}

export type SurahMeta = {
  n: number
  name: string
  name_ar: string
  counts: { hafs: number; warsh: number; qaloon: number }
}

export type TranslationEntry = {
  id: string
  name: string
  subtitle: string
  language: string
  availableInManifest: boolean
}

export type TranslationVerse = { key: string; text: string }

export type TranslationPayload = {
  translationId: string
  translationVersion: string
  surahNo: number
  intro: string[]
  verses: TranslationVerse[]
  footnotes: Record<string, string>
}

export type SourceIndexEntry = {
  id: string
  type: 'riwayah' | 'translation'
  label: string
  displayLabel?: string | null
  role?: string | null
  trustTier?: string | null
  language: string | null
  translator?: string | null
  sourceProvider?: string | null
  licenseStatus?: string | null
  visibility: 'baseline' | 'optional' | 'internal'
  default: boolean
  availableInManifest: boolean
  outputPath: string
  sourceUrl: string
}

export type SourceIndex = {
  version: number
  profile: string
  defaults: { riwayah: string; translation: string; tafsir: string | null }
  sources: SourceIndexEntry[]
}

type DatasetManifestFile = {
  path: string
  lane: 'text' | 'knowledge' | 'reflection' | 'search' | 'pages'
  category: string
  bytes: number
}

type ManifestJson = { files: DatasetManifestFile[] }

const DEFAULT_TRANSLATION = 'bridges'

export type RiwayahTextAvailability = {
  riwayah: Riwayah
  available: boolean
  manifestUrl: string
}

export class RiwayahPackUnavailableError extends Error {
  code = 'RIWAYAH_PACK_UNAVAILABLE' as const
  promptable = true as const
  packageType = 'text' as const

  constructor(public riwayah: Riwayah) {
    super(`Riwayah text pack is not available for ${riwayah}`)
    this.name = 'RiwayahPackUnavailableError'
  }
}

async function assertRenderableTextAsset(riwayah: Riwayah, textStyleId: string): Promise<void> {
  let asset = null
  try {
    asset = await getTextAsset(riwayah, textStyleId)
  } catch {
    throw new RiwayahPackUnavailableError(riwayah)
  }
  if (!asset) throw new RiwayahPackUnavailableError(riwayah)
  if (asset.shipped) return
  if (!(await canUseTextAsset(riwayah, textStyleId))) {
    throw new RiwayahPackUnavailableError(riwayah)
  }
}

/**
 * Network-first fetch with cache fallback.
 * Tries network with 3s timeout, then falls back to cache.
 */
async function fetchNetworkFirst(url: string): Promise<unknown> {
  // Try network first with timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`)
    }
    try {
      const cacheCopy = typeof res.clone === 'function' ? res.clone() : null
      const payload = await res.json()
      try {
        if (!cacheCopy) return payload
        const cache = await caches.open(CACHE_DATASET)
        await cache.put(url, cacheCopy)
      } catch {
        // Cache Storage may be unavailable in private or test contexts.
      }
      return payload
    } catch {
      // Corrupted network response — delete any stale cache entry and re-throw
      try {
        const cache = await caches.open(CACHE_DATASET)
        await cache.delete(url)
      } catch {
        // Cache delete failed; ignore
      }
      throw new Error(`Invalid JSON in network response for ${url}`)
    }
  } catch (networkError) {
    clearTimeout(timeout)
    // Network failed — fall back to cache
    try {
      const cache = await caches.open(CACHE_DATASET)
      const cached = await cache.match(url)
      if (cached) {
        try {
          return await cached.json()
        } catch {
          // Corrupted cache entry — delete it so next load re-fetches
          await cache.delete(url)
          throw new Error(`Invalid JSON in cached response for ${url}`)
        }
      }
    } catch (cacheError) {
      if (cacheError instanceof Error && cacheError.message.startsWith('Invalid JSON')) { throw cacheError }
      // Cache not available
    }
    throw networkError
  }
}

/** Get the full list of dataset URLs from manifest.json. */
export async function getManifestUrls(): Promise<string[]> {
  const manifest = await loadDatasetManifest()
  return manifest.files.map((file) => `${DATASET_BASE}/${file.path}`)
}

export async function getRiwayahTextAvailability(riwayah: Riwayah): Promise<RiwayahTextAvailability> {
  try {
    const entry = await getRiwayahPackageEntry(riwayah)
    if (entry) {
      return {
        riwayah,
        available: entry.text.available,
        manifestUrl: `${DATASET_BASE}/manifest.json`,
      }
    }
  } catch {
    // Older cached deployments may not have the package index yet; keep the
    // manifest path as a compatibility fallback.
  }
  const manifest = await loadDatasetManifest()
  return {
    riwayah,
    available: manifest.files.some((file) => file.path.startsWith(`quran-text/${riwayah}/`)),
    manifestUrl: `${DATASET_BASE}/manifest.json`,
  }
}

/** Get a single surah by number, in the active Riwayah. */
export async function getSurah(n: number): Promise<SurahPayload> {
  if (n < 1 || n > 114 || !Number.isInteger(n)) {
    throw new Error(`Invalid surah number: ${n}`)
  }
  const riwayah = settings.riwayah
  const quranTextStyleId = settings.quranTextStyleId
  await assertRenderableTextAsset(riwayah, quranTextStyleId)
  const padded = String(n).padStart(3, '0')
  const url = `${DATASET_BASE}/quran-text/${riwayah}/${quranTextStyleId}/${padded}.json`
  return fetchNetworkFirst(url) as Promise<SurahPayload>
}

/** Get the 114-entry surahs metadata. */
export async function getSurahs(): Promise<SurahMeta[]> {
  const url = `${DATASET_BASE}/surahs.json`
  return fetchNetworkFirst(url) as Promise<SurahMeta[]>
}

/** Get the list of cataloged translation sources, including opt-in packs. */
export async function getTranslations(): Promise<TranslationEntry[]> {
  const index = await getSourceIndex()
  return index.sources
    .filter((entry) => entry.type === 'translation')
    .map((entry) => {
      const name = entry.displayLabel || entry.label || 'Translation'
      const id = entry.id || slugify(name)
      const subtitle = entry.translator || entry.sourceProvider || ''
      const language = entry.language || 'en'
      return {
        id,
        name,
        subtitle,
        language,
        availableInManifest: entry.availableInManifest,
      }
    })
}

/**
 * Load a translation pack for a single surah. Returns null when no pack is
 * shipped for the requested id (graceful when the user picks a translation
 * that has been removed from the dataset).
 */
export async function loadTranslationForSurah(translationId: string, surahNo: number): Promise<TranslationPayload | null> {
  if (!translationId) { return null }
  if (surahNo < 1 || surahNo > 114 || !Number.isInteger(surahNo)) {
    throw new Error(`Invalid surah number: ${surahNo}`)
  }
  if (translationId !== DEFAULT_TRANSLATION && !(await isTranslationSourceCataloged(translationId))) {
    return null
  }
  const padded = String(surahNo).padStart(3, '0')
  const url = `${DATASET_BASE}/translations/${translationId}/${padded}.json`
  try {
    return await fetchNetworkFirst(url) as TranslationPayload
  } catch (e) {
    if (isUnavailablePackError(e)) return null
    throw e
  }
}

export async function getSourceIndex(): Promise<SourceIndex> {
  return fetchNetworkFirst(`${DATASET_BASE}/indexes/sources.json`) as Promise<SourceIndex>
}

async function isTranslationSourceCataloged(translationId: string): Promise<boolean> {
  try {
    const index = await getSourceIndex()
    return index.sources.some((entry) => entry.type === 'translation' && entry.id === translationId)
  } catch {
    return true
  }
}

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')[0] || 'translation'
}

async function loadDatasetManifest(): Promise<ManifestJson> {
  const manifest = await fetchNetworkFirst(`${DATASET_BASE}/manifest.json`) as ManifestJson
  if (!Array.isArray(manifest.files)) {
    throw new Error('Invalid dataset manifest: files must be an inventory array')
  }
  return manifest
}

function isUnavailablePackError(error: unknown): boolean {
  return (
    error instanceof Error
    && /404|Failed to fetch|Invalid JSON in network response/.test(error.message)
  )
}

export {
  clearKnowledgeDatasetCache,
  getAyahKnowledge,
  getPassageForAyah,
  getThemesForAyah,
  loadAyahKnowledgeForSurah,
  loadPassagesForSurah,
} from './knowledge-dataset'
