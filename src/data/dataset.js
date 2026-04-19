/**
 * Corpus access layer.
 * Deep module: callers never know whether data comes from cache or network.
 */

import { CACHE_DATASET } from '../core/constants.js'

const DATASET_BASE = '/dataset'
const FETCH_TIMEOUT_MS = 3000

/**
 * Network-first fetch with cache fallback.
 * Tries network with 3s timeout, then falls back to cache.
 * @param {string} url - Relative URL (e.g., '/dataset/surah/001.json')
 * @returns {Promise<object>}
 */
async function fetchNetworkFirst(url) {
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
      if (cacheError.message.startsWith('Invalid JSON')) { throw cacheError }
      // Cache not available
    }
    throw networkError
  }
}

/**
 * Get the full list of dataset URLs from manifest.json.
 * @returns {Promise<string[]>}
 */
export async function getManifestUrls() {
  const res = await fetch(`${DATASET_BASE}/manifest.json`)
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: ${res.status}`)
  }
  const manifest = await res.json()
  return Object.keys(manifest.files).map(f => `${DATASET_BASE}/${f}`)
}

/**
 * Get a single surah by number.
 * @param {number} n - Surah number (1-114)
 * @returns {Promise<{ar: string[], en: string[]}>}
 */
export async function getSurah(n) {
  if (n < 1 || n > 114 || !Number.isInteger(n)) {
    throw new Error(`Invalid surah number: ${n}`)
  }

  const padded = String(n).padStart(3, '0')
  const url = `${DATASET_BASE}/surah/${padded}.json`
  return fetchNetworkFirst(url)
}

/**
 * Get all surahs metadata.
 * @returns {Promise<Array>}
 */
export async function getSurahs() {
  const url = `${DATASET_BASE}/surahs.json`
  return fetchNetworkFirst(url)
}

/**
 * Get the list of translations actually present in the shipped dataset.
 * Sourced from provenance.json so the UI never offers options the corpus
 * does not contain. Today the dataset carries exactly one translation;
 * when additional translations are added, provenance.json's `translation`
 * field should become an array and this function will surface them all.
 * @returns {Promise<Array<{id: string, name: string, subtitle: string}>>}
 */
export async function getTranslations() {
  const provenance = await fetchNetworkFirst(`${DATASET_BASE}/provenance.json`)
  const entries = Array.isArray(provenance.translation)
    ? provenance.translation
    : provenance.translation ? [provenance.translation] : []

  return entries.map((entry) => {
    const name = entry.name || 'Translation'
    const id = entry.id || slugify(name)
    const subtitle = entry.author ? `${entry.author}` : (entry.source || '')
    return { id, name, subtitle }
  })
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')[0] || 'translation'
}
