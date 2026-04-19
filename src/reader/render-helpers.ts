/**
 * Reader render helpers — pure functions that produce data / strings used by
 * Svelte components. All imperative DOM construction has been removed and
 * replaced by component templates in Verse.svelte / SurahHeader.svelte / Reader.svelte.
 *
 * Kept: basmala convention logic, surah header text formatting, verse key helpers.
 */

import type { SurahMeta } from '../data/dataset'

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
 * e.g. "AL-FATIHAH · SURAH 1 · 7 VERSES · MECCAN"
 */
export function formatSurahMeta(meta: SurahMeta): string {
  const nameUpper = (meta.name ?? '').toUpperCase()
  const typeUpper = (typeof meta['type'] === 'string' ? meta['type'] : '').toUpperCase()
  return `${nameUpper} · SURAH ${meta.n} · ${meta.count} VERSES · ${typeUpper}`
}

/**
 * Format the Arabic surah name with honorific prefix.
 * e.g. "سُورَةُ الفاتحة"
 */
export function formatArabicSurahName(meta: SurahMeta): string {
  const arabic = typeof meta['arabic'] === 'string' ? meta['arabic'] : ''
  return `سُورَةُ ${arabic}`
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
