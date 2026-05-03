// Loads + caches per-(reciter, surah) word-level timing JSON. Word-level
// timing ships from day one (audio spec §3, "C — both shipped, verse
// default") so v2.1 word-karaoke is a pure UI toggle without re-running
// forced alignment. v2.0 audio renders verse-grain only — but we still
// load the word-level JSON because the verse boundaries are derived from
// the first word of each ayah.
//
// JSON shape (per surah file at /dataset/audio/{reciter}/timing/{NNN}.json):
//   {
//     surah: number,
//     reciter: string,
//     ayahs: [
//       { ayah: 1, t0: 0, t1: 4200, words: [
//           { w: 0, t0: 0, t1: 380 },
//           { w: 1, t0: 380, t1: 920 },
//           ...
//         ]
//       },
//       ...
//     ]
//   }
//
// In-memory LRU keeps the last 8 surah-files per reciter resident so
// continuous-listen + casual surah-hopping doesn't re-fetch on every
// transition. The SW cache (`qa-audio-timing-{reciter}-v1`) handles
// disk-side caching independently.

import { logger } from '../core/logger'

export interface WordTiming {
  w: number
  t0: number
  t1: number
}

export interface AyahTiming {
  ayah: number
  t0: number
  t1: number
  words: WordTiming[]
}

export interface SurahTiming {
  surah: number
  reciter: string
  ayahs: AyahTiming[]
}

const LRU_CAPACITY = 8
const cache = new Map<string, SurahTiming>()

function cacheKey(reciter: string, surah: number): string {
  return `${reciter}:${surah}`
}

function trimLru(): void {
  while (cache.size > LRU_CAPACITY) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) { break }
    cache.delete(oldest)
  }
}

export function getCachedTiming(reciter: string, surah: number): SurahTiming | null {
  const k = cacheKey(reciter, surah)
  const v = cache.get(k)
  if (v) {
    // Move to MRU.
    cache.delete(k)
    cache.set(k, v)
    return v
  }
  return null
}

export async function loadTiming(reciter: string, surah: number): Promise<SurahTiming | null> {
  const cached = getCachedTiming(reciter, surah)
  if (cached) { return cached }
  const url = `/dataset/audio/${encodeURIComponent(reciter)}/timing/${String(surah).padStart(3, '0')}.json`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      logger.warn('audio.timing fetch failed', { reciter, surah, status: response.status })
      return null
    }
    const data = await response.json()
    if (!isSurahTiming(data)) {
      logger.warn('audio.timing payload invalid', { reciter, surah })
      return null
    }
    cache.set(cacheKey(reciter, surah), data)
    trimLru()
    return data
  } catch (error) {
    logger.warn('audio.timing fetch error', { reciter, surah, error })
    return null
  }
}

function isSurahTiming(v: unknown): v is SurahTiming {
  if (!v || typeof v !== 'object') { return false }
  const o = v as { surah?: unknown; reciter?: unknown; ayahs?: unknown }
  if (typeof o.surah !== 'number') { return false }
  if (typeof o.reciter !== 'string') { return false }
  if (!Array.isArray(o.ayahs)) { return false }
  for (const a of o.ayahs) {
    const ay = a as { ayah?: unknown; t0?: unknown; t1?: unknown; words?: unknown }
    if (typeof ay.ayah !== 'number') { return false }
    if (typeof ay.t0 !== 'number') { return false }
    if (typeof ay.t1 !== 'number') { return false }
    if (!Array.isArray(ay.words)) { return false }
  }
  return true
}

/**
 * Find the ayah whose `[t0, t1)` window contains `positionMs`. Returns
 * null if no ayah covers the position (e.g. positionMs is before the
 * first ayah or after the last ayah's t1).
 */
export function ayahAtMs(timing: SurahTiming, positionMs: number): AyahTiming | null {
  for (const a of timing.ayahs) {
    if (positionMs >= a.t0 && positionMs < a.t1) { return a }
  }
  // After last ayah's t1, return the last ayah (audio ended on it).
  if (timing.ayahs.length > 0 && positionMs >= timing.ayahs[timing.ayahs.length - 1]!.t1) {
    return timing.ayahs[timing.ayahs.length - 1]!
  }
  return null
}

export function ayahStartMs(timing: SurahTiming, ayahNumber: number): number | null {
  const a = timing.ayahs.find((x) => x.ayah === ayahNumber)
  return a ? a.t0 : null
}

/** Test-only helper. */
export function _clearTimingCacheForTest(): void {
  cache.clear()
}
