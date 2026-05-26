import type { SurahCount } from './types'

export const PREVIEW_SURAH_COUNTS: SurahCount[] = [
  { n: 1, count: 7 },
  { n: 2, count: 286 },
  { n: 3, count: 200 },
]

export function totalVerses(counts: SurahCount[]): number {
  return counts.reduce((sum, row) => sum + row.count, 0)
}
