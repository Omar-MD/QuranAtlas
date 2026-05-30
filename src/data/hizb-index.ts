import { loadReaderSurahIndex } from './surah-index'

export type QuranRef = { surah: number; verse: number }

export type HizbIndexEntry = {
  end: QuranRef
  n: number
  start: QuranRef
}

type HizbSurahCount = { count: number; n: number }

const HIZB_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 75], [2, 142], [2, 253], [3, 93], [3, 147], [4, 24], [4, 88], [4, 148], [5, 27],
  [5, 82], [6, 36], [6, 111], [7, 88], [8, 41], [9, 93], [10, 26], [11, 6], [11, 84], [12, 53],
  [15, 1], [17, 1], [18, 75], [20, 135], [21, 1], [22, 1], [23, 1], [24, 21], [25, 21], [26, 111],
  [27, 56], [28, 51], [29, 46], [33, 31], [35, 1], [36, 28], [37, 145], [39, 32], [41, 47], [43, 24],
  [46, 1], [48, 18], [51, 31], [53, 33], [58, 1], [62, 1], [67, 1], [72, 1], [78, 1], [83, 15],
  [87, 1], [90, 1], [94, 1], [100, 9], [104, 1], [107, 1], [112, 1], [113, 1], [114, 1], [114, 6],
] as const

export function buildHizbRows(counts: ReadonlyArray<HizbSurahCount>): HizbIndexEntry[] {
  const total = counts.reduce((sum, row) => sum + row.count, 0)
  return HIZB_STARTS.map(([surah, verse], index) => {
    const next = HIZB_STARTS[index + 1]
    const endIndex = next ? refToIndex({ surah: next[0], verse: next[1] }, counts) - 1 : total
    return {
      end: refFromIndex(endIndex, counts),
      n: index + 1,
      start: { surah, verse },
    }
  })
}

export async function loadHizbIndex(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<HizbIndexEntry[]> {
  const rows = await loadReaderSurahIndex(fetcher, signal)
  return buildHizbRows(rows.map((row) => ({ count: row.counts.qaloon, n: row.n })))
}

function refToIndex(ref: QuranRef, counts: ReadonlyArray<HizbSurahCount>): number {
  let total = 0
  for (const row of counts) {
    if (row.n === ref.surah) return total + ref.verse
    total += row.count
  }
  return total + ref.verse
}

function refFromIndex(index: number, counts: ReadonlyArray<HizbSurahCount>): QuranRef {
  let remaining = Math.max(1, Math.floor(index))
  for (const row of counts) {
    if (remaining <= row.count) return { surah: row.n, verse: remaining }
    remaining -= row.count
  }
  const last = counts[counts.length - 1] ?? { count: 1, n: 1 }
  return { surah: last.n, verse: last.count }
}
