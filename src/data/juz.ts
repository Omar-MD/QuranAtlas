/**
 * Juz boundaries + verse→juz math. 30 juz divisions of the Quran keyed by
 * (surah, verse) where each juz starts. Progress within a juz computed via
 * global verse index so juz label updates mid-surah (e.g. Al-Baqarah spans
 * juz 1, 2, 3).
 */

export type SurahCount = { n: number; count: number }

export const JUZ_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
] as const

export function globalVerseIndex(
  surah: number,
  verse: number,
  surahs: ReadonlyArray<SurahCount>,
): number {
  let idx = 0
  for (const s of surahs) {
    if (s.n === surah) { return idx + verse }
    idx += s.count
  }
  return idx + verse
}

export function juzProgress(
  surah: number,
  verse: number,
  surahs: ReadonlyArray<SurahCount>,
): { juz: number; pct: number } {
  if (!surahs.length) { return { juz: 1, pct: 0 } }
  const g = globalVerseIndex(surah, verse, surahs)
  let juz = 1
  let startG = 1
  let endG = 0
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    const [s, v] = JUZ_STARTS[i] as readonly [number, number]
    const sg = globalVerseIndex(s, v, surahs)
    if (g >= sg) { juz = i + 1; startG = sg }
    else { endG = sg - 1; break }
  }
  if (!endG) {
    const total = surahs.reduce((n, s) => n + s.count, 0)
    endG = total
  }
  const span = Math.max(1, endG - startG + 1)
  const within = Math.max(1, g - startG + 1)
  const pct = Math.min(100, Math.max(0, Math.round((within / span) * 100)))
  return { juz, pct }
}
