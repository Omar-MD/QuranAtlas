import type { SearchResultDto, SearchSort } from './schema'

export const SEARCH_RANK_VERSION = 'phase-1-rank-v1'

const LANE_WEIGHT: Record<SearchResultDto['matchLanes'][number], number> = {
  phrase: 0,
  'exact-word-form': 1,
  'arabic-text': 2,
  translation: 3,
  context: 4,
  'same-written-form': 5,
  'same-root': 6,
  lemma: 7,
  'surah-context': 8,
}

export function rankSearchResults(results: SearchResultDto[], sort: SearchSort): SearchResultDto[] {
  const ranked = [...results]
  ranked.sort((left, right) => compareResults(left, right, sort))
  return ranked.map((result, index) => ({
    ...result,
    rankKey: `${SEARCH_RANK_VERSION}:${String(index).padStart(6, '0')}:${stableResultKey(result)}`,
  }))
}

export function stableResultKey(result: Pick<SearchResultDto, 'sourceRef' | 'matchLanes' | 'resultId'>): string {
  return [
    sourceRefOrderKey(result.sourceRef),
    bestLane(result.matchLanes),
    result.resultId,
  ].join('|')
}

function compareResults(left: SearchResultDto, right: SearchResultDto, sort: SearchSort): number {
  if (sort === 'mushaf-order' || sort === 'surah-order') return compareRefs(left.sourceRef, right.sourceRef) || left.resultId.localeCompare(right.resultId)
  if (sort === 'recent') return right.resultId.localeCompare(left.resultId)
  return compareLane(left, right)
    || compareRefs(left.sourceRef, right.sourceRef)
    || left.rankKey.localeCompare(right.rankKey)
    || left.resultId.localeCompare(right.resultId)
}

function compareLane(left: SearchResultDto, right: SearchResultDto): number {
  return LANE_WEIGHT[bestLane(left.matchLanes)] - LANE_WEIGHT[bestLane(right.matchLanes)]
}

function bestLane(lanes: SearchResultDto['matchLanes']): SearchResultDto['matchLanes'][number] {
  return [...lanes].sort((left, right) => LANE_WEIGHT[left] - LANE_WEIGHT[right])[0] ?? 'context'
}

function compareRefs(left: string, right: string): number {
  const [leftSurah, leftAyah] = left.split(':').map(Number)
  const [rightSurah, rightAyah] = right.split(':').map(Number)
  return (leftSurah - rightSurah) || (leftAyah - rightAyah)
}

function sourceRefOrderKey(ref: string): string {
  const [surah, ayah] = ref.split(':').map(Number)
  return `${String(surah).padStart(3, '0')}:${String(ayah).padStart(3, '0')}`
}
