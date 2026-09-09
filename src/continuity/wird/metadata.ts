import { HIZB_STARTS } from '../../data/hizb-index'
import { DEFAULT_JUZ_STARTS } from '../../data/juz-index'
import { refFromIndex, refToIndex } from './progress'
import type { QuranRef, SurahCount, WirdBoundaries, WirdBoundary } from './types'

// Juz/hizb boundary tables are single-sourced from src/data (juz-starts.json
// and hizb-starts.json via juz-index.ts / hizb-index.ts) so wirḍ boundaries can
// never drift from the reader's juz/hizb indexes.
const JUZ_STARTS = DEFAULT_JUZ_STARTS.map((row) => [row.start.surah, row.start.verse] as const)

export function totalVerses(counts: SurahCount[]): number {
  return counts.reduce((sum, row) => sum + row.count, 0)
}

function rowsFromStarts(
  starts: ReadonlyArray<readonly [number, number]>,
  counts: ReadonlyArray<SurahCount>,
): WirdBoundary[] {
  const total = totalVerses([...counts])
  return starts.map(([surah, verse], index) => {
    const next = starts[index + 1]
    const endIndex = next ? refToIndex({ surah: next[0], verse: next[1] }, counts) - 1 : total
    return {
      end: refFromIndex(endIndex, counts),
      n: index + 1,
      start: { surah, verse } satisfies QuranRef,
    }
  })
}

export function createWirdBoundaries(
  counts: ReadonlyArray<SurahCount>,
  page: WirdBoundaries['page'] = [],
): WirdBoundaries {
  return {
    hizb: rowsFromStarts(HIZB_STARTS, counts),
    juz: rowsFromStarts(JUZ_STARTS, counts),
    page,
  }
}

export function createPageWirdBoundariesFromStarts(
  starts: ReadonlyArray<{ n: number; start: QuranRef }>,
  counts: ReadonlyArray<SurahCount>,
): WirdBoundary[] {
  const rows = [...starts]
    .filter((row) => Number.isInteger(row.n) && row.n >= 1 && row.start.surah >= 1 && row.start.verse >= 1)
    .sort((a, b) => a.n - b.n)
  const total = totalVerses([...counts])
  return rows.map((row, index) => {
    const next = rows[index + 1]
    const endIndex = next ? refToIndex(next.start, counts) - 1 : total
    return {
      end: refFromIndex(endIndex, counts),
      n: row.n,
      start: row.start,
    }
  })
}
