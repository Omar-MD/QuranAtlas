/**
 * Corpus access layer (KFGQPC riwayat dataset).
 * Deep module: callers never know whether data comes from cache or network.
 */

import { CACHE_DATASET } from '../core/constants'
import { loadRiwayah } from '../settings/riwayah'

const DATASET_BASE = '/dataset'
const FETCH_TIMEOUT_MS = 3000

export type AyahRecord = {
  id: number
  jozz: number
  page: string
  line_start: number
  line_end: number
  aya_no: number
  aya_text: string
  aya_text_emlaey?: string
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
}

export type TranslationPayload = {
  id: string
  surah: number
  ayat: Array<{ aya_no: number; text: string }>
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
  name?: string
  author?: string
  source?: string
}

type ProvenanceJson = {
  corpus?: unknown
  riwayat?: ProvenanceRiwayahEntry[]
  translations?: ProvenanceTranslationEntry[]
  fonts?: unknown
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
  return fetchNetworkFirst(url) as Promise<SurahPayload>
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
 *
 * Currently empty — translation packs land in a future milestone. The
 * picker / toggle / onboarding screen all tolerate an empty list.
 */
export async function getTranslations(): Promise<TranslationEntry[]> {
  const provenance = await fetchNetworkFirst(`${DATASET_BASE}/provenance.json`) as ProvenanceJson
  const entries = Array.isArray(provenance.translations) ? provenance.translations : []
  return entries.map((entry) => {
    const name = entry.name || 'Translation'
    const id = entry.id || slugify(name)
    const subtitle = entry.author ? entry.author : (entry.source || '')
    return { id, name, subtitle }
  })
}

/**
 * Load a translation pack for a single surah. Returns null when the
 * translation isn't shipped — no translations ship today, so this always
 * returns null. Wired up later when translation packs land.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loadTranslationForSurah(_translationId: string, _surahNo: number): Promise<TranslationPayload | null> {
  return null
}

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')[0] || 'translation'
}
