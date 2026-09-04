import type { SearchResultDto, SearchResultMatchEvidence } from '../../search/schema'

export function getResultMatchEvidence(result: SearchResultDto): SearchResultMatchEvidence {
  const matchEvidence = (result as SearchResultDto & { matchEvidence?: SearchResultMatchEvidence }).matchEvidence
  if (matchEvidence) return matchEvidence

  const lane = result.matchLanes[0] ?? 'context'
  return {
    lane,
    matchedText: result.snippet,
    translationContextExcerpt: lane === 'translation' || lane === 'context' ? result.snippet : undefined,
    whyMatched: `This result matched the ${lane} Search lane.`,
  }
}
