/**
 * Corpus access layer (KFGQPC riwayat dataset).
 * Deep module: callers never know whether data comes from cache or network.
 */

import { CACHE_DATASET } from '../core/constants'
import { loadRiwayah } from '../settings/riwayah'

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
  riwayah: 'hafs' | 'warsh' | 'qaloon'
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
}

export type TafsirEntryMeta = {
  id: string
  name: string
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

export type TafsirEntry = {
  id: string
  startKey: string
  endKey: string
  ayahKeys: string[]
  sourceGranularity: 'ayah' | 'range'
  text: string
}

export type TafsirSurahPack = {
  tafsirId: string
  tafsirVersion: string
  language: string
  surahNo: number
  entries: TafsirEntry[]
}

export type SourceIndexEntry = {
  id: string
  type: 'riwayah' | 'translation' | 'tafsir'
  label: string
  language: string | null
  visibility: 'baseline' | 'optional' | 'internal'
  default: boolean
  availableInManifest: boolean
  outputPath: string
  sourceUrl: string
}

export type SourceIndex = {
  version: number
  profile: string
  defaults: { riwayah: string; translation: string; tafsir: string }
  sources: SourceIndexEntry[]
}

type ManifestJson = { files: Record<string, unknown> }

type ProvenanceRiwayahEntry = {
  id: 'hafs' | 'warsh' | 'qaloon'
  label: string
  version: string
  ayatCount: number
  fontFamily: string
  minLineHeight: number
}

type ProvenanceTranslationEntry = {
  id?: string
  label?: string
  translator?: string
  language?: string
  version?: string
  ayatCount?: number
  footnoteCount?: number
  hasIntros?: boolean
  license?: string
  licenseUrl?: string
  source?: string
  sourceUrl?: string
  fetchedAt?: string
}

type ProvenanceJson = {
  corpus?: unknown
  riwayat?: ProvenanceRiwayahEntry[]
  translations?: ProvenanceTranslationEntry[]
  tafsir?: unknown
  fonts?: unknown
}

const DEFAULT_RIWAYAH = 'qaloon'
const DEFAULT_TRANSLATION = 'saheeh'
const DEFAULT_TAFSIR = 'muyassar'

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
      return await res.json()
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
  const res = await fetch(`${DATASET_BASE}/manifest.json`)
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: ${res.status}`)
  }
  const manifest = await res.json() as ManifestJson
  return Object.keys(manifest.files).map(f => `${DATASET_BASE}/${f}`)
}

/** Get a single surah by number, in the active Riwayah. */
export async function getSurah(n: number): Promise<SurahPayload> {
  if (n < 1 || n > 114 || !Number.isInteger(n)) {
    throw new Error(`Invalid surah number: ${n}`)
  }
  const riwayah = await loadRiwayah()
  const padded = String(n).padStart(3, '0')
  const url = `${DATASET_BASE}/riwayat/${riwayah}/${padded}.json`
  try {
    return await fetchNetworkFirst(url) as SurahPayload
  } catch (error) {
    if (riwayah !== DEFAULT_RIWAYAH && isUnavailablePackError(error)) {
      return fetchNetworkFirst(`${DATASET_BASE}/riwayat/${DEFAULT_RIWAYAH}/${padded}.json`) as Promise<SurahPayload>
    }
    throw error
  }
}

/** Get the 114-entry surahs metadata. */
export async function getSurahs(): Promise<SurahMeta[]> {
  const url = `${DATASET_BASE}/surahs.json`
  return fetchNetworkFirst(url) as Promise<SurahMeta[]>
}

/**
 * Get the list of translations actually present in the shipped dataset.
 * Sourced from provenance.json so the UI never offers options the corpus
 * does not contain.
 */
export async function getTranslations(): Promise<TranslationEntry[]> {
  const provenance = await fetchNetworkFirst(`${DATASET_BASE}/provenance.json`) as ProvenanceJson
  const entries = Array.isArray(provenance.translations) ? provenance.translations : []
  return entries.map((entry) => {
    const name = entry.label || 'Translation'
    const id = entry.id || slugify(name)
    const subtitle = entry.translator || entry.source || ''
    const language = entry.language || 'en'
    return { id, name, subtitle, language }
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
  const padded = String(surahNo).padStart(3, '0')
  const url = `${DATASET_BASE}/translations/${translationId}/${padded}.json`
  try {
    return await fetchNetworkFirst(url) as TranslationPayload
  } catch (e) {
    if (translationId !== DEFAULT_TRANSLATION && isUnavailablePackError(e)) {
      return loadTranslationForSurah(DEFAULT_TRANSLATION, surahNo)
    }
    if (isUnavailablePackError(e)) return null
    throw e
  }
}

export async function getSourceIndex(): Promise<SourceIndex> {
  return fetchNetworkFirst(`${DATASET_BASE}/indexes/sources.json`) as Promise<SourceIndex>
}

export async function getTafsirs(): Promise<TafsirEntryMeta[]> {
  const index = await getSourceIndex()
  return index.sources
    .filter((entry) => entry.type === 'tafsir')
    .map((entry) => ({
      id: entry.id,
      name: entry.label,
      language: entry.language ?? 'ar',
      availableInManifest: entry.availableInManifest,
    }))
}

export async function loadTafsirForSurah(tafsirId: string, surahNo: number): Promise<TafsirSurahPack | null> {
  if (!tafsirId) { return null }
  if (surahNo < 1 || surahNo > 114 || !Number.isInteger(surahNo)) {
    throw new Error(`Invalid surah number: ${surahNo}`)
  }
  const padded = String(surahNo).padStart(3, '0')
  const url = `${DATASET_BASE}/tafsir/${tafsirId}/${padded}.json`
  try {
    return await fetchNetworkFirst(url) as TafsirSurahPack
  } catch (error) {
    if (tafsirId !== DEFAULT_TAFSIR && isUnavailablePackError(error)) {
      return loadTafsirForSurah(DEFAULT_TAFSIR, surahNo)
    }
    if (isUnavailablePackError(error)) return null
    throw error
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
