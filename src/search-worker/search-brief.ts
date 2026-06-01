import type {
  SearchBriefDto,
  SearchBriefEvidenceType,
  SearchBriefFeatureSection,
  SearchBriefFeatureStatus,
  SearchPackManifestV1,
  SearchQueryAstV1,
  SearchResultDto,
  SearchResultMatchEvidence,
  SearchResultMatchLane,
} from '../../shared/search'

type LaneCountKey = SearchResultMatchLane | 'reference'

export function buildSearchBrief({
  manifest,
  query,
  rankVersion,
  rankedResults,
  windowResults,
}: {
  manifest: SearchPackManifestV1
  query: SearchQueryAstV1
  rankVersion: string
  rankedResults: SearchResultDto[]
  windowResults: SearchResultDto[]
}): SearchBriefDto {
  const occurrenceCountKnown = occurrenceCountKnownForQuery(query)
  const sortedRefs = [...new Set(rankedResults.map((result) => result.sourceRef))].sort(compareRefs)
  const laneCounts = buildLaneCounts(rankedResults, query, occurrenceCountKnown)
  const evidenceTypes = buildEvidenceTypes(rankedResults, query)

  return {
    query: {
      rawText: query.rawText,
      normalizedText: query.normalizedText,
      tokens: query.tokens,
      mode: query.mode,
      sourceLanes: query.filters.sourceLane ?? sourceLanesForMode(query.mode),
      morphologyMode: morphologyModeForQuery(query),
    },
    counts: {
      matchedSourceAyahCount: sortedRefs.length,
      matchedResultCount: rankedResults.length,
      shownWindowCount: windowResults.length,
      occurrenceCount: occurrenceCountKnown ? rankedResults.length : null,
      occurrenceCountKnown,
      aggregateStatus: 'full',
    },
    sourceFrame: {
      packId: manifest.packId,
      packVersion: manifest.packVersion,
      contentHash: manifest.contentHash,
      sourceRiwayah: manifest.sourceRiwayah,
      sourceIds: manifest.sourceIds,
      licenseIds: manifest.licenseIds,
      normalizerVersion: manifest.normalizerVersion,
      queryAstVersion: manifest.queryAstVersion,
      rankVersion,
    },
    laneCounts,
    distribution: {
      firstRef: sortedRefs[0] ?? null,
      lastRef: sortedRefs[sortedRefs.length - 1] ?? null,
      surahsWithMostIndexedMatches: buildSurahDistribution(rankedResults, occurrenceCountKnown),
    },
    evidenceTypes,
    representativeRefs: buildRepresentativeRefs(rankedResults, query),
    mappingStateCounts: buildMappingStateCounts(rankedResults),
    featureAvailability: buildFeatureAvailability(manifest),
    sourceNotes: buildSourceNotes(query, manifest, evidenceTypes),
  }
}

export function evidenceForCandidate(input: {
  lane: SearchResultMatchLane
  query: SearchQueryAstV1
  matchedText?: string
  matchedQueryTokens?: string[]
  matchedSourceTokens?: string[]
  sourceToken?: string
  sourcePosition?: number
  sourcePositions?: number[]
  phraseLength?: number
  translationContextExcerpt?: string
}): SearchResultMatchEvidence {
  const matchedQueryTokens = input.matchedQueryTokens ?? input.query.tokens
  const matchedSourceTokens = input.matchedSourceTokens ?? (input.sourceToken ? [input.sourceToken] : undefined)
  const referenceQuery = isReferenceQuery(input.query)
  const matchedQueryToken = matchedQueryTokens.length === 1 ? matchedQueryTokens[0] : undefined
  const matchedSourceToken = matchedSourceTokens?.length === 1 ? matchedSourceTokens[0] : undefined

  return {
    lane: input.lane,
    matchedText: input.matchedText,
    matchedQueryToken,
    matchedQueryTokens: matchedQueryTokens.length > 1 ? matchedQueryTokens : undefined,
    matchedSourceToken,
    matchedSourceTokens: matchedSourceTokens && matchedSourceTokens.length > 1 ? matchedSourceTokens : undefined,
    normalizedTokens: input.query.tokens.length > 0 ? input.query.tokens : undefined,
    sourcePosition: input.sourcePosition,
    sourcePositions: input.sourcePositions,
    phraseLength: input.phraseLength,
    translationContextExcerpt: input.translationContextExcerpt,
    whyMatched: whyMatchedForCandidate({
      lane: input.lane,
      multiToken: matchedQueryTokens.length > 1,
      referenceQuery,
    }),
  }
}

export function evidenceForMorphologyResult(input: {
  lane: SearchResultMatchLane
  query: SearchQueryAstV1
  sourceToken: string
  root: string | null
  lemma: string | null
  wordPosition: number
  rowId?: string
}): SearchResultMatchEvidence {
  return {
    lane: input.lane,
    matchedText: input.sourceToken,
    matchedQueryToken: input.query.tokens[0],
    matchedSourceToken: input.sourceToken,
    normalizedTokens: input.query.tokens.length > 0 ? input.query.tokens : undefined,
    wordPosition: input.wordPosition,
    morphology: {
      sourceToken: input.sourceToken,
      root: input.root,
      lemma: input.lemma,
      rowId: input.rowId,
    },
    whyMatched: whyMatchedForMorphology(input.lane),
  }
}

function buildLaneCounts(
  rankedResults: SearchResultDto[],
  query: SearchQueryAstV1,
  occurrenceCountKnown: boolean,
): SearchBriefDto['laneCounts'] {
  const groups = new Map<LaneCountKey, { refs: Set<string>; resultCount: number }>()
  for (const result of rankedResults) {
    const lane = laneCountKeyForResult(result, query)
    const current = groups.get(lane) ?? { refs: new Set<string>(), resultCount: 0 }
    current.refs.add(result.sourceRef)
    current.resultCount += 1
    groups.set(lane, current)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => laneOrder(left) - laneOrder(right))
    .map(([lane, group]) => ({
      lane,
      matchedSourceAyahCount: group.refs.size,
      matchedResultCount: group.resultCount,
      occurrenceCount: occurrenceCountKnown ? group.resultCount : null,
      occurrenceCountKnown,
    }))
}

function buildSurahDistribution(
  rankedResults: SearchResultDto[],
  occurrenceCountKnown: boolean,
): SearchBriefDto['distribution']['surahsWithMostIndexedMatches'] {
  const groups = new Map<number, { refs: Set<string>; occurrenceCount: number }>()
  for (const result of rankedResults) {
    const surah = Number(result.sourceRef.split(':')[0])
    if (!Number.isInteger(surah)) continue
    const current = groups.get(surah) ?? { refs: new Set<string>(), occurrenceCount: 0 }
    current.refs.add(result.sourceRef)
    current.occurrenceCount += 1
    groups.set(surah, current)
  }

  return [...groups.entries()]
    .map(([surah, group]) => ({
      surah,
      matchedSourceAyahCount: group.refs.size,
      occurrenceCount: occurrenceCountKnown ? group.occurrenceCount : undefined,
    }))
    .sort((left, right) => right.matchedSourceAyahCount - left.matchedSourceAyahCount || left.surah - right.surah)
    .slice(0, 3)
}

function buildEvidenceTypes(rankedResults: SearchResultDto[], query: SearchQueryAstV1): SearchBriefEvidenceType[] {
  if (isReferenceQuery(query)) return ['reference']
  const types = new Set<SearchBriefEvidenceType>()
  for (const result of rankedResults) {
    for (const lane of result.matchLanes) {
      types.add(evidenceTypeForLane(lane))
    }
  }
  return [...types]
}

function buildRepresentativeRefs(
  rankedResults: SearchResultDto[],
  query: SearchQueryAstV1,
): SearchBriefDto['representativeRefs'] {
  const refs: SearchBriefDto['representativeRefs'] = []
  const firstRanked = rankedResults[0]
  if (firstRanked) refs.push({ label: 'top-ranked', ref: firstRanked.sourceRef })

  const mushafOrdered = [...rankedResults].sort((left, right) => compareRefs(left.sourceRef, right.sourceRef))
  const firstInMushafOrder = mushafOrdered[0]
  if (firstInMushafOrder) refs.push({ label: 'first-in-mushaf-order', ref: firstInMushafOrder.sourceRef })

  const firstSurah = firstRanked ? Number(firstRanked.sourceRef.split(':')[0]) : null
  const differentSurah = rankedResults.find((result) => Number(result.sourceRef.split(':')[0]) !== firstSurah)
  if (differentSurah) refs.push({ label: 'different-surah-example', ref: differentSurah.sourceRef })

  const translationContext = rankedResults.find((result) => result.matchLanes.some((lane) => lane === 'translation' || lane === 'context'))
  if (translationContext) refs.push({ label: 'translation-context-example', ref: translationContext.sourceRef })

  const arabicText = !isReferenceQuery(query)
    ? rankedResults.find((result) => result.matchLanes.some((lane) => lane === 'arabic-text' || lane === 'exact-word-form' || lane === 'phrase'))
    : null
  if (arabicText) refs.push({ label: 'arabic-text-example', ref: arabicText.sourceRef })

  return refs
}

function buildMappingStateCounts(rankedResults: SearchResultDto[]): SearchBriefDto['mappingStateCounts'] | undefined {
  if (rankedResults.length === 0) return undefined
  const counts: NonNullable<SearchBriefDto['mappingStateCounts']> = {}
  for (const result of rankedResults) {
    counts[result.mappingState] = (counts[result.mappingState] ?? 0) + 1
  }
  return counts
}

function buildFeatureAvailability(manifest: SearchPackManifestV1): SearchBriefDto['featureAvailability'] {
  return [
    featureStatus('morphology', manifest.features.includes('morphology')),
    featureStatus('same-written-form', manifest.features.includes('morphology')),
    featureStatus('same-root', manifest.features.includes('morphology')),
    featureStatus('lemma', manifest.features.includes('morphology')),
    featureStatus('following-wording', manifest.features.includes('following-wording')),
    featureStatus('shared-wording', manifest.features.includes('shared-wording')),
    featureStatus('repeated-phrases', manifest.features.includes('repeated-phrases')),
    featureStatus('occurs-once', manifest.features.includes('occurs-once')),
    featureStatus('ayah-endings', manifest.features.includes('ayah-endings')),
    featureStatus('counts-patterns', manifest.features.includes('counts-patterns')),
  ]
}

function featureStatus(section: SearchBriefFeatureSection, available: boolean): { section: SearchBriefFeatureSection; status: SearchBriefFeatureStatus } {
  return { section, status: available ? 'available' : 'missing' }
}

function buildSourceNotes(
  query: SearchQueryAstV1,
  manifest: SearchPackManifestV1,
  evidenceTypes: SearchBriefEvidenceType[],
): SearchBriefDto['sourceNotes'] {
  const notes: SearchBriefDto['sourceNotes'] = [{
    id: 'search-source-boundary',
    label: 'Search source boundary',
    text: 'Arabic matches are from the Hafs/Tanzil Search source. Reader opening uses validated mapping when available.',
  }]

  if (evidenceTypes.includes('translation-context') || query.filters.sourceLane?.some((lane) => lane === 'translation' || lane === 'context')) {
    notes.push({
      id: 'translation-context-not-tafsir',
      label: 'Translation/context boundary',
      text: 'Translation/context matches are indexed translation/context evidence, not tafsir and not a claim that Arabic wording shares one meaning.',
    })
  }

  if (query.mode === 'same-root' || query.mode === 'surah-context' || evidenceTypes.includes('same-root')) {
    notes.push({
      id: 'same-root-not-interpretation',
      label: 'Same-root boundary',
      text: 'Same-root results are QAC morphology evidence in the Hafs Search index. Shared root does not mean shared interpretation, ruling, topic, or rhetorical purpose.',
    })
  }

  if (query.mode === 'phrase' || manifest.features.includes('following-wording')) {
    notes.push({
      id: 'following-wording-not-generated',
      label: 'Following wording boundary',
      text: 'Following wording is attested source wording after the matched phrase. It is not prediction, autocomplete, paraphrase, or generated Quran text.',
    })
  }

  if (manifest.features.includes('shared-wording')) {
    notes.push({
      id: 'shared-wording-lexical-only',
      label: 'Shared wording boundary',
      text: 'Shared wording means lexical overlap in the active Search index. It does not establish thematic or interpretive equivalence.',
    })
  }

  if (manifest.features.includes('occurs-once')) {
    notes.push({
      id: 'occurs-once-index-policy',
      label: 'Occurs-once boundary',
      text: 'Occurs once means once under this Search index and graph policy, not a claim about every scholarly analysis of uniqueness.',
    })
  }

  return notes
}

function whyMatchedForCandidate(input: {
  lane: SearchResultMatchLane
  multiToken: boolean
  referenceQuery: boolean
}): string {
  if (input.referenceQuery) return 'This ayah matches the searched reference.'
  if (input.lane === 'phrase') return 'The exact source phrase occurs in this source ayah.'
  if (input.lane === 'exact-word-form') return 'The exact indexed word form occurs in this source ayah.'
  if (input.lane === 'arabic-text') {
    return input.multiToken
      ? 'All query tokens occur in this source ayah.'
      : 'The normalized Arabic query token occurs in this source ayah.'
  }
  if (input.lane === 'translation' || input.lane === 'context') {
    return input.multiToken
      ? 'All query tokens occur in this indexed translation/context row.'
      : 'The query token occurs in the indexed translation/context text.'
  }
  return 'This source ayah matches the selected Search mode.'
}

function whyMatchedForMorphology(lane: SearchResultMatchLane): string {
  if (lane === 'same-written-form') return 'The same indexed written form occurs in this Hafs source ayah.'
  if (lane === 'same-root') return 'The same QAC morphology root occurs in this Hafs source ayah.'
  if (lane === 'lemma') return 'The same QAC lemma occurs in this Hafs source ayah.'
  if (lane === 'surah-context') return 'This Hafs source ayah belongs to the indexed Surah context for the morphology key.'
  return 'This source ayah matches the selected morphology evidence.'
}

function occurrenceCountKnownForQuery(query: SearchQueryAstV1): boolean {
  if (isReferenceQuery(query)) return false
  if (query.mode === 'phrase' || query.mode === 'exact-word-form') return true
  if (query.mode === 'same-written-form' || query.mode === 'same-root' || query.mode === 'lemma' || query.mode === 'surah-context') return true
  return query.tokens.length === 1
}

function laneCountKeyForResult(result: SearchResultDto, query: SearchQueryAstV1): LaneCountKey {
  if (isReferenceQuery(query)) return 'reference'
  return result.matchEvidence?.lane ?? result.matchLanes[0] ?? 'context'
}

function evidenceTypeForLane(lane: SearchResultMatchLane): SearchBriefEvidenceType {
  if (lane === 'phrase') return 'exact-source-phrase'
  if (lane === 'translation' || lane === 'context') return 'translation-context'
  if (lane === 'arabic-text') return 'arabic-text'
  if (lane === 'exact-word-form') return 'exact-word-form'
  if (lane === 'same-written-form') return 'same-written-form'
  if (lane === 'same-root' || lane === 'surah-context') return 'same-root'
  if (lane === 'lemma') return 'lemma'
  return 'translation-context'
}

function sourceLanesForMode(mode: SearchQueryAstV1['mode']): SearchBriefDto['query']['sourceLanes'] {
  if (mode === 'translation') return ['translation']
  if (mode === 'context') return ['context']
  if (mode === 'all') return ['arabic-text', 'translation', 'context']
  return ['arabic-text']
}

function morphologyModeForQuery(query: SearchQueryAstV1): SearchBriefDto['query']['morphologyMode'] {
  if (query.mode === 'same-written-form' || query.mode === 'same-root' || query.mode === 'lemma' || query.mode === 'surah-context') return query.mode
  return undefined
}

function isReferenceQuery(query: SearchQueryAstV1): boolean {
  return query.tokens.length === 0 && /^\s*(?:\d+\s*:\s*\d+|surah\s+\d+\s+\d+)\s*$/i.test(query.rawText)
}

function laneOrder(lane: LaneCountKey): number {
  const order: Record<LaneCountKey, number> = {
    reference: 0,
    phrase: 1,
    'exact-word-form': 2,
    'arabic-text': 3,
    translation: 4,
    context: 5,
    'same-written-form': 6,
    'same-root': 7,
    lemma: 8,
    'surah-context': 9,
  }
  return order[lane]
}

function compareRefs(left: string, right: string): number {
  const [leftSurah, leftAyah] = left.split(':').map(Number)
  const [rightSurah, rightAyah] = right.split(':').map(Number)
  return (leftSurah - rightSurah) || (leftAyah - rightAyah)
}
