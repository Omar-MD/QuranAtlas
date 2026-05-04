/**
 * Juz boundaries + verse→juz math. 30 juz divisions of the Quran keyed by
 * (surah, verse) where each juz starts. Progress within a juz computed via
 * global verse index so juz label updates mid-surah (e.g. Al-Baqarah spans
 * juz 1, 2, 3).
 */

export type SurahCount = { n: number; count: number }
export type QuranRef = { surah: number; verse: number }
export type JuzRow = { n: number; start: QuranRef; end: QuranRef }

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

export function compareRefs(a: QuranRef, b: QuranRef): number {
  if (a.surah !== b.surah) { return a.surah - b.surah }
  return a.verse - b.verse
}

export function refFromGlobalIndex(index: number, surahs: ReadonlyArray<SurahCount>): QuranRef {
  let remaining = Math.max(1, Math.floor(index))
  for (const s of surahs) {
    if (remaining <= s.count) { return { surah: s.n, verse: remaining } }
    remaining -= s.count
  }
  const last = surahs[surahs.length - 1]
  return last ? { surah: last.n, verse: last.count } : { surah: 1, verse: 1 }
}

export function getJuzRows(surahs: ReadonlyArray<SurahCount>): JuzRow[] {
  const total = surahs.reduce((sum, s) => sum + s.count, 0)
  return JUZ_STARTS.map(([surah, verse], index) => {
    const next = JUZ_STARTS[index + 1]
    const endIndex = next
      ? globalVerseIndex(next[0], next[1], surahs) - 1
      : total
    return {
      n: index + 1,
      start: { surah, verse },
      end: refFromGlobalIndex(endIndex, surahs),
    }
  })
}

export function findJuzForRef(ref: QuranRef, surahs: ReadonlyArray<SurahCount>): number {
  const idx = globalVerseIndex(ref.surah, ref.verse, surahs)
  let current = 1
  for (let i = 0; i < JUZ_STARTS.length; i++) {
    const [surah, verse] = JUZ_STARTS[i] as readonly [number, number]
    if (idx >= globalVerseIndex(surah, verse, surahs)) {
      current = i + 1
      continue
    }
    break
  }
  return current
}
