import { refFromIndex, refToIndex } from './progress'
import type { QuranRef, SurahCount, WirdBoundaries, WirdBoundary } from './types'

export const PREVIEW_SURAH_COUNTS: SurahCount[] = [
  { n: 1, count: 7 },
  { n: 2, count: 286 },
  { n: 3, count: 200 },
]

const JUZ_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
] as const

const HIZB_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 75], [2, 142], [2, 253], [3, 93], [3, 147], [4, 24], [4, 88], [4, 148], [5, 27],
  [5, 82], [6, 36], [6, 111], [7, 88], [8, 41], [9, 93], [10, 26], [11, 6], [11, 84], [12, 53],
  [15, 1], [17, 1], [18, 75], [20, 135], [21, 1], [22, 1], [23, 1], [24, 21], [25, 21], [26, 111],
  [27, 56], [28, 51], [29, 46], [33, 31], [35, 1], [36, 28], [37, 145], [39, 32], [41, 47], [43, 24],
  [46, 1], [48, 18], [51, 31], [53, 33], [58, 1], [62, 1], [67, 1], [72, 1], [78, 1], [83, 15],
  [87, 1], [90, 1], [94, 1], [100, 9], [104, 1], [107, 1], [112, 1], [113, 1], [114, 1], [114, 6],
] as const

export function totalVerses(counts: SurahCount[]): number {
  return counts.reduce((sum, row) => sum + row.count, 0)
}

function rowsFromStarts(starts: ReadonlyArray<readonly [number, number]>, counts: ReadonlyArray<SurahCount>): WirdBoundary[] {
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
