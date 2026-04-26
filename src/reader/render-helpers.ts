/**
 * Reader render helpers — pure functions that produce data / strings used by
 * Svelte components. All imperative DOM construction has been removed and
 * replaced by component templates in Verse.svelte / SurahHeader.svelte / Reader.svelte.
 *
 * Kept: basmala convention logic, surah header text formatting, verse key helpers.
 */

import type { SurahMeta } from '../data/dataset'
import { settings } from '../state/settings.svelte'

/**
 * Whether to render a standalone basmala before the first verse.
 *
 * Quranic conventions:
 *  - Surah 1 (Al-Fatiha): basmala IS verse 1 in the dataset — do NOT render separately.
 *  - Surah 9 (At-Tawbah): no basmala.
 *  - All others: render basmala between header and verse 1.
 */
export function shouldRenderBasmala(surahNum: number): boolean {
  return surahNum !== 1 && surahNum !== 9
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
