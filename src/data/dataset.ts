/**
 * Corpus access layer.
 * Deep module: callers never know whether data comes from cache or network.
 */

import { CACHE_DATASET } from '../core/constants'

const DATASET_BASE = '/dataset'
const FETCH_TIMEOUT_MS = 3000

export type SurahData = {
  ar: string[]
  en: string[]
}

export type SurahMeta = {
  n: number
  name: string
  count: number
  [key: string]: unknown
}

export type TranslationEntry = {
  id: string
  name: string
  subtitle: string
}

type ManifestJson = {
  files: Record<string, unknown>
}

type ProvenanceTranslationEntry = {
  id?: string
  name?: string
  author?: string
  source?: string
}

type ProvenanceJson = {
  translation?: ProvenanceTranslationEntry | ProvenanceTranslationEntry[]
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

/**
 * Get the full list of dataset URLs from manifest.json.
 */
export async function getManifestUrls(): Promise<string[]> {
  const res = await fetch(`${DATASET_BASE}/manifest.json`)
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: ${res.status}`)
  }
  const manifest = await res.json() as ManifestJson
  return Object.keys(manifest.files).map(f => `${DATASET_BASE}/${f}`)
}

/**
 * Get a single surah by number.
 */
export async function getSurah(n: number): Promise<SurahData> {
  if (n < 1 || n > 114 || !Number.isInteger(n)) {
    throw new Error(`Invalid surah number: ${n}`)
  }

  const padded = String(n).padStart(3, '0')
  const url = `${DATASET_BASE}/surah/${padded}.json`
  return fetchNetworkFirst(url) as Promise<SurahData>
}

/**
 * Get all surahs metadata.
 */
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
  const entries = Array.isArray(provenance.translation)
    ? provenance.translation
    : provenance.translation ? [provenance.translation] : []

  return entries.map((entry) => {
    const name = entry.name || 'Translation'
    const id = entry.id || slugify(name)
    const subtitle = entry.author ? entry.author : (entry.source || '')
    return { id, name, subtitle }
  })
}

function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')[0] || 'translation'
}
