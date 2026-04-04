/**
 * Corpus access layer.
 * Deep module: callers never know whether data comes from cache or network.
 */

import { CACHE_DATASET } from '../core/constants.js'

const DATASET_BASE = '/dataset'
const FETCH_TIMEOUT_MS = 3000

/**
 * Try to get a response from the dataset cache, falling back to network.
 * @param {string} url - Relative URL (e.g., '/dataset/surah/001.json')
 * @returns {Promise<object>}
 */
async function fetchWithCacheFallback(url) {
  // Try cache first (service worker)
  try {
    const cache = await caches.open(CACHE_DATASET)
    const cached = await cache.match(url)
    if (cached) {
      return cached.json()
    }
  } catch {
    // Cache not available, fall through to network
  }

  // Network with timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`)
    }
    return res.json()
  } finally {
    clearTimeout(timeout)
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
  return fetchWithCacheFallback(url)
}

/**
 * Get all surahs metadata.
 * @returns {Promise<Array>}
 */
export async function getSurahs() {
  const url = `${DATASET_BASE}/surahs.json`
  return fetchWithCacheFallback(url)
}
