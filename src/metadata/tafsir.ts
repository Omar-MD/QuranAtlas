import {
  getTafsirs,
  type TafsirEntryMeta,
  type TafsirSurahPack,
} from '../data/dataset'
import { CACHE_DATASET } from '../core/constants'
import type { OptionalMetadataState } from './types'

export type TafsirMetadataResult = {
  state: OptionalMetadataState
  pack: TafsirSurahPack | null
  fallbackId: string | null
}

const DEFAULT_TAFSIR_ID = 'muyassar'
const FETCH_TIMEOUT_MS = 3000

export async function loadTafsirSources(): Promise<TafsirEntryMeta[]> {
  return getTafsirs()
}

type StrictTafsirResult =
  | { state: 'available' | 'empty'; pack: TafsirSurahPack }
  | { state: 'missing' | 'stale' | 'unavailable'; pack: null }

function tafsirUrl(tafsirId: string, surahNo: number): string {
  return `/dataset/tafsir/${tafsirId}/${String(surahNo).padStart(3, '0')}.json`
}

async function readCachedJson(url: string): Promise<unknown | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_DATASET)
  const cached = await cache.match(url)
  if (!cached) return null
  return cached.json()
}

async function fetchJsonNetworkFirst(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) {
      const error = new Error(`Failed to fetch ${url}: ${response.status}`)
      ;(error as Error & { status?: number }).status = response.status
      throw error
    }
    const cacheCopy = typeof response.clone === 'function' ? response.clone() : null
    const payload = await response.json()
    if (cacheCopy && typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_DATASET)
      await cache.put(url, cacheCopy)
    }
    return payload
  } catch (error) {
    clearTimeout(timeout)
    const cached = await readCachedJson(url)
    if (cached !== null) return cached
    throw error
  }
}

async function loadStrictTafsirPack(tafsirId: string, surahNo: number): Promise<StrictTafsirResult> {
  try {
    const pack = await fetchJsonNetworkFirst(tafsirUrl(tafsirId, surahNo)) as TafsirSurahPack
    return { state: pack.entries.length === 0 ? 'empty' : 'available', pack }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/404/.test(message)) {
      return { state: 'missing', pack: null }
    }
    if (/Invalid JSON|Unexpected token|JSON/.test(message)) {
      return { state: 'stale', pack: null }
    }
    return { state: 'unavailable', pack: null }
  }
}

export async function loadTafsirMetadataForSurah(
  tafsirId: string,
  surahNo: number,
): Promise<TafsirMetadataResult> {
  const requested = await loadStrictTafsirPack(tafsirId, surahNo)
  if (requested.pack) {
    return {
      state: requested.state,
      pack: requested.pack,
      fallbackId: null,
    }
  }

  if (tafsirId === DEFAULT_TAFSIR_ID) {
    return { state: requested.state, pack: null, fallbackId: null }
  }

  const fallback = await loadStrictTafsirPack(DEFAULT_TAFSIR_ID, surahNo)
  if (!fallback.pack) {
    return { state: requested.state, pack: null, fallbackId: null }
  }

  return {
    state: requested.state,
    pack: fallback.pack,
    fallbackId: DEFAULT_TAFSIR_ID,
  }
}

export type { TafsirEntry, TafsirEntryMeta, TafsirSurahPack } from '../data/dataset'
