import { refFromGlobalIndex, globalVerseIndex, type QuranRef, type SurahCount } from './juz'

export const HIZB_STARTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 75], [2, 142], [2, 253], [3, 93], [3, 147], [4, 24], [4, 88], [4, 148], [5, 27],
  [5, 82], [6, 36], [6, 111], [7, 88], [8, 41], [9, 93], [10, 26], [11, 6], [11, 84], [12, 53],
  [15, 1], [17, 1], [18, 75], [20, 135], [21, 1], [22, 1], [23, 1], [24, 21], [25, 21], [26, 111],
  [27, 56], [28, 51], [29, 46], [33, 31], [35, 1], [36, 28], [37, 145], [39, 32], [41, 47], [43, 24],
  [46, 1], [48, 18], [51, 31], [53, 33], [58, 1], [62, 1], [67, 1], [72, 1], [78, 1], [83, 15],
  [87, 1], [90, 1], [94, 1], [100, 9], [104, 1], [107, 1], [112, 1], [113, 1], [114, 1], [114, 6],
] as const

export type HizbRow = { n: number; start: QuranRef; end: QuranRef }

export function getHizbRows(surahs: ReadonlyArray<SurahCount>): HizbRow[] {
  const total = surahs.reduce((sum, s) => sum + s.count, 0)
  return HIZB_STARTS.map(([surah, verse], index) => {
    const next = HIZB_STARTS[index + 1]
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
