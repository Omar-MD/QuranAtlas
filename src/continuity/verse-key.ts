// Canonical home for the verse-key grammar: the `${surah}:${verse}` string
// form and the QuranRef object form, plus the helpers that validate, parse,
// compare, and index them. This module must stay dependency-free.

export type QuranRef = { surah: number; verse: number }

// Per-surah ayah-count row consumed by the ref <-> absolute-index helpers.
export type SurahCount = { n: number; count: number }

// Number of surahs in the Quran.
export const SURAH_COUNT = 114

// Hafs ayah counts per surah (114 entries, 6236 ayat) — mirrored in
// scripts/data/lib/ayah.mjs; kept equal by scripts/data/check-search-packs.mjs
// (data -- check).
export const QURAN_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77,
  227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36,
  25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const

export function isValidQuranAyahRef(value: string): value is `${number}:${number}` {
  const match = /^(\d+):(\d+)$/.exec(value)
  if (!match) return false
  const surah = Number(match[1])
  const ayah = Number(match[2])
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || ayah < 1) return false
  return ayah <= (QURAN_AYAH_COUNTS[surah - 1] ?? 0)
}

export function isQuranRef(value: unknown): value is QuranRef {
  if (!value || typeof value !== 'object') return false
  const ref = value as Partial<QuranRef>
  return Number.isInteger(ref.surah) && Number.isInteger(ref.verse) && (ref.surah ?? 0) >= 1 && (ref.verse ?? 0) >= 1
}

// Object-form comparator: orders by surah, then by verse.
export function compareQuranRefs(a: QuranRef, b: QuranRef): number {
  if (a.surah !== b.surah) return a.surah - b.surah
  return a.verse - b.verse
}

// String-key comparator for `${surah}:${verse}` keys: orders by surah, then
// by verse. Complements compareQuranRefs for call sites that hold keys.
export function compareQuranRefKeys(left: string, right: string): number {
  const [leftSurah, leftAyah] = left.split(':').map(Number)
  const [rightSurah, rightAyah] = right.split(':').map(Number)
  return leftSurah - rightSurah || leftAyah - rightAyah
}

// Parses a `${surah}:${verse}` key into a QuranRef; null when either part is
// missing or not a positive integer.
export function parseQuranRefKey(key: string): QuranRef | null {
  const [surahPart, versePart] = key.split(':')
  const surah = Number.parseInt(surahPart ?? '', 10)
  const verse = Number.parseInt(versePart ?? '', 10)
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || surah < 1 || verse < 1) return null
  return { surah, verse }
}

// Surah segment of a verse key; null when it is not an integer in 1..114.
export function surahFromVerseKey(verseKey: string): number | null {
  const [surahPart] = verseKey.split(':')
  const parsed = Number.parseInt(surahPart ?? '', 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= SURAH_COUNT ? parsed : null
}

// Verse segment of a verse key, prefix-parsed like the rest of the parsing
// family (parseInt); 0 when no leading integer is present.
export function verseNumberOfKey(verseKey: string): number {
  const parsed = Number.parseInt(verseKey.split(':')[1] ?? '', 10)
  return Number.isInteger(parsed) ? parsed : 0
}

// Verse segment of a verse key parsed as a whole numeric token (Number());
// 0 when it is not finite. Distinct from verseNumberOfKey on malformed keys
// ("2:25x" -> 0 here vs 25 there; "2:25.5" -> 25.5 here vs 25 there).
export function verseNumberOfKeyFinite(verseKey: string): number {
  const [, verse] = verseKey.split(':')
  const parsed = Number(verse)
  return Number.isFinite(parsed) ? parsed : 0
}

// Absolute ayah index (1-based across the whole mushaf) for a QuranRef,
// given per-surah ayah counts.
export function refToIndex(ref: QuranRef, counts: ReadonlyArray<SurahCount>): number {
  let total = 0
  for (const row of counts) {
    if (row.n === ref.surah) return total + ref.verse
    total += row.count
  }
  return total + ref.verse
}

// Inverse of refToIndex: QuranRef for an absolute ayah index, clamped to the
// first verse when the index precedes the table and to the last row's last
// verse when it exceeds the table.
export function refFromIndex(index: number, counts: ReadonlyArray<SurahCount>): QuranRef {
  let remaining = Math.max(1, Math.floor(index))
  for (const row of counts) {
    if (remaining <= row.count) return { surah: row.n, verse: remaining }
    remaining -= row.count
  }
  const last = counts[counts.length - 1] ?? { n: 1, count: 1 }
  return { surah: last.n, verse: last.count }
}
