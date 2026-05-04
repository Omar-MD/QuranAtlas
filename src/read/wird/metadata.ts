import { getHizbRows } from '../../data/hizb'
import { getJuzRows, type SurahCount } from '../../data/juz'
import type { WirdBoundaries } from './types'

export function createWirdBoundaries(
  counts: ReadonlyArray<SurahCount>,
  page: WirdBoundaries['page'] = [],
): WirdBoundaries {
  return {
    juz: getJuzRows(counts),
    hizb: getHizbRows(counts),
    page,
  }
}
