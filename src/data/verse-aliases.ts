/**
 * Per-ayah verse-equivalence aliases across the three shipped riwayat.
 *
 * Translations ship Hafs-keyed (Kufan numbering); Warsh and Qaloon (Madinan
 * numbering) partition the same Quranic text differently in ~50 surahs. This
 * module loads the mechanically-derived alias table from
 * `public/dataset/translations/_verse-aliases.json` and exposes a helper to
 * resolve the correct Hafs key(s) for a (riwayah, surahNo, ayahNo) tuple.
 *
 * Source: `scripts/derive-verse-aliases.mjs` aligns each surah's word
 * streams across riwayat and emits per-ayah aliases. KFGQPC's Madinah
 * Mushaf is the authoritative scholarly source — splits are encoded in the
 * dataset itself.
 *
 * Quality flag: 7 surahs (7, 27, 36, 40, 41, 56, 57) align via ayah-DP
 * fallback because of qira'at-level word-count drift; their aliases carry
 `aliasMeta[n].method === 'ayah-dp'` and are structurally valid but less
 * confident than the 53 word-stream surahs.
 */

import { CACHE_DATASET } from '../core/constants'
import type { Riwayah } from '../state/settings.svelte'

const ALIASES_URL = '/dataset/translations/_verse-aliases.json'
const FETCH_TIMEOUT_MS = 3000

export type AliasEntry = {
  hafs: number
  warsh: number | number[] | null
  qaloon: number | number[] | null
}

export type VerseAliases = {
  _meta: { version: number, description: string, generator: string, source: string, method: string, generatedAt: string }
  aliases: Record<string, AliasEntry[]>
  aliasMeta: Record<string, { method: 'word-stream' | 'ayah-dp', warshMethod: string, qaloonMethod: string, reviewRecommended: boolean }>
}

let cached: VerseAliases | null = null
let inFlight: Promise<VerseAliases | null> | null = null

async function fetchAliases(): Promise<VerseAliases | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(ALIASES_URL, { signal: controller.signal })
    clearTimeout(timeout)
    if (res.ok) { return await res.json() as VerseAliases }
    throw new Error(`fetch failed: ${res.status}`)
  } catch {
    clearTimeout(timeout)
    try {
      const cache = await caches.open(CACHE_DATASET)
      const cachedRes = await cache.match(ALIASES_URL)
      if (cachedRes) { return await cachedRes.json() as VerseAliases }
    } catch {
      // cache miss
    }
    return null
  }
}

export async function loadVerseAliases(): Promise<VerseAliases | null> {
  if (cached) { return cached }
  if (inFlight) { return inFlight }
  inFlight = fetchAliases().then((v) => {
    cached = v
    inFlight = null
    return v
  })
  return inFlight
}

export type TranslationRole =
  /** 1:1 alias, or surah without aliases (identity). */
  | 'identity'
  /** Multiple Hafs ayat → this Madinan ayah (Hafs combine, all parts shown). */
  | 'merged'
  /** First half of a Hafs split → multiple Madinan ayat. Show full translation. */
  | 'primary'
  /** Second+ half of a Hafs split. Translation lives on `primary` ayah; this
   * ayah shows a continuation marker. */
  | 'continuation'
  /** No Hafs equivalent (e.g. Warsh / Qaloon's surah-1 first ayah, since
   * Bismillah isn't counted as an ayah there). */
  | 'none'

export type TranslationResolution = {
  role: TranslationRole
  hafsKeys: string[]
  /** When `role: 'continuation'`, the Madinan ayah index of the primary
   * (first split-half) — used to render a "continued from N" marker. */
  primaryAyah?: number
}

/**
 * Resolve translation lookup info for `(riwayah, surahNo, ayahNo)`.
 *
 * Hafs is always identity. For Warsh / Qaloon:
 * - 1:1 alias → `identity`
 * - Multiple Hafs ayat point to this Madinan ayah → `merged`
 *   (Hafs split, Madinan combines — translations from each Hafs ayah are
 *    concatenated to cover the verse content)
 * - One Hafs ayah's split list contains this Madinan ayah:
 *     - This is the FIRST in the list → `primary` (show full translation)
 *     - Otherwise → `continuation` (show marker, translation on primary)
 * - No alias entry covers this Madinan ayah → `none`
 */
export function resolveTranslationFor(
  aliases: VerseAliases | null,
  riwayah: Riwayah,
  surahNo: number,
  ayahNo: number,
): TranslationResolution {
  if (riwayah === 'hafs' || !aliases) {
    return { role: 'identity', hafsKeys: [`${surahNo}:${ayahNo}`] }
  }
  const surahAliases = aliases.aliases[String(surahNo)]
  if (!surahAliases) {
    return { role: 'identity', hafsKeys: [`${surahNo}:${ayahNo}`] }
  }
  // Walk the alias table once; collect every Hafs entry that touches this
  // Madinan ayah, plus the role hint per entry.
  const hits: Array<{ hafs: number, isSplitContinuation: boolean, splitFirst?: number }> = []
  for (const entry of surahAliases) {
    const target = entry[riwayah]
    if (target === ayahNo) {
      hits.push({ hafs: entry.hafs, isSplitContinuation: false })
    } else if (Array.isArray(target) && target.includes(ayahNo)) {
      const first = target[0]
      const isContinuation = ayahNo !== first
      hits.push({
        hafs: entry.hafs,
        isSplitContinuation: isContinuation,
        splitFirst: isContinuation ? first : undefined,
      })
    }
  }
  if (hits.length === 0) {
    return { role: 'none', hafsKeys: [] }
  }
  if (hits.length === 1) {
    const h = hits[0]!
    if (h.isSplitContinuation) {
      return { role: 'continuation', hafsKeys: [`${surahNo}:${h.hafs}`], primaryAyah: h.splitFirst }
    }
    // Could still be `primary` — check whether any other Madinan ayah shares
    // this Hafs ayah's alias list (i.e. this Hafs ayah's target is an array).
    const entry = surahAliases.find((e) => e.hafs === h.hafs)
    if (entry && Array.isArray(entry[riwayah])) {
      return { role: 'primary', hafsKeys: [`${surahNo}:${h.hafs}`] }
    }
    return { role: 'identity', hafsKeys: [`${surahNo}:${h.hafs}`] }
  }
  // Multiple Hafs ayat → this Madinan ayah (merge): concat translations.
  return { role: 'merged', hafsKeys: hits.map((h) => `${surahNo}:${h.hafs}`) }
}

/**
 * Legacy helper — returns just the Hafs translation keys for a (riwayah,
 * surah, ayah) tuple. Equivalent to `resolveTranslationFor(...).hafsKeys`
 * but treats `continuation` like `primary` (returns the source Hafs key)
 * because the build-time coverage check needs the lookup to succeed for
 * BOTH halves of a split. Reader-side rendering uses the role-aware variant
 * to decide whether to display the translation or a continuation marker.
 */
export function resolveHafsKeysFor(
  aliases: VerseAliases | null,
  riwayah: Riwayah,
  surahNo: number,
  ayahNo: number,
): string[] {
  return resolveTranslationFor(aliases, riwayah, surahNo, ayahNo).hafsKeys
}
