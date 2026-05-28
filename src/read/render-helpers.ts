/**
 * Reader render helpers — pure functions that produce data / strings used by
 * Svelte components. All imperative DOM construction has been removed and
 * replaced by component templates in Verse.svelte / SurahHeader.svelte / Reader.svelte.
 *
 * Kept: basmala convention logic, surah header text formatting, verse key helpers.
 */

import type { SurahMeta } from '../data/dataset'
import { settings } from '../configure/state.svelte'
import type { Riwayah } from '../configure/riwayah'

/**
 * Whether to render a standalone basmala block before the first verse.
 *
 * Qaloon does not count the basmala as an ayah in Al-Fātiḥah, but tradition
 * still displays it above the surah text.
 *  - **Surah 9 (At-Tawbah)**: no basmala in any riwayah.
 *  - **All other surahs**: render the basmala block in every riwayah.
 */
export function shouldRenderBasmala(surahNum: number, riwayah: Riwayah = settings.riwayah): boolean {
  void riwayah
  if (surahNum === 9) { return false }
  if (surahNum === 1) { return true }
  return true
}

/**
 * Format the surah header meta line.
 * Surah name is rendered separately as the Arabic Mushaf title — this line
 * carries only the ordinal + verse count.
 * e.g. "SURAH 1 · 7 VERSES"
 */
export function formatSurahMeta(meta: SurahMeta): string {
  const count = meta.counts[settings.riwayah]
  return `SURAH ${meta.n} · ${count} VERSES`
}

/**
 * Return the Arabic surah name (no honorific prefix).
 * e.g. "الفاتحة"
 */
export function formatArabicSurahName(meta: SurahMeta): string {
  return meta.name_ar ?? ''
}

/**
 * Build the verse key string from surah + verse numbers.
 * e.g. "2:255"
 */
export function makeVerseKey(surah: number, verse: number): string {
  return `${surah}:${verse}`
}

/**
 * Validate surah number (1–114).
 */
export function isValidSurahNum(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 114
}
