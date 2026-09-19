import { loadReaderSurahIndex, type ReaderSurahIndexEntry } from '../../data/surah-index'
import type { SurahCount } from './types'

// Qaloun verse counts per surah in surah order; callers gate on index
// completeness (length === 114) before trusting the result for wird math.
export function wirdCountsFromSurahIndex(index: ReaderSurahIndexEntry[]): SurahCount[] {
  return index.map((row) => ({ count: row.counts.qaloon, n: row.n }))
}

// Shared module-level loader (brief §15.3): one cached promise behind every
// Wird consumer so display and creation always agree on the real 114-surah
// index. Fallback counts are never returned here; callers handle the failure.
// Only successful responses are cached: a rejected load evicts the promise so
// the Daily Wird "Try again" action performs a fresh request instead of
// rethrowing the cached rejection for the rest of the session (P6).
let cachedCounts: Promise<SurahCount[]> | null = null

export function loadWirdSurahCounts(): Promise<SurahCount[]> {
  cachedCounts ??= loadReaderSurahIndex(fetch)
    .then((rows) => wirdCountsFromSurahIndex(rows))
    .catch((error: unknown) => {
      cachedCounts = null
      throw error
    })
  return cachedCounts
}
