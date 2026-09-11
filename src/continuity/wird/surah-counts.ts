import type { ReaderSurahIndexEntry } from '../../data/surah-index'
import type { SurahCount } from './types'

// Counts used before the surah index resolves (or when it cannot): the first
// surah, the longest surah, and the last surah bracket the whole mushaf so
// wird math degrades instead of emptying.
export const FALLBACK_WIRD_COUNTS: SurahCount[] = [
  { n: 1, count: 7 },
  { n: 2, count: 286 },
  { n: 114, count: 6 },
]

// Qaloun verse counts per surah in surah order; callers gate on index
// completeness (length === 114) before trusting the result for wird math.
export function wirdCountsFromSurahIndex(index: ReaderSurahIndexEntry[]): SurahCount[] {
  return index.map((row) => ({ count: row.counts.qaloon, n: row.n }))
}
