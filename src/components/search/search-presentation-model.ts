import type { ParsedSearchQuery, SearchBriefDto, SearchQueryMode, SearchResultDto } from '../../search/schema'
import { formatSearchReference, laneLabel, mappingLabel, modeLabel } from './search-labels'
import { getResultMatchEvidence } from './search-result-evidence'

export type SearchWorkspaceTab = 'overview' | 'verses' | 'explore' | 'sources'
export type SearchExploreModuleId =
  | 'surah-distribution'
  | 'forms-by-count'
  | 'query-level-morphology-summary'
  | 'translation-context-terms'
  | 'source-boundary'
  | 'following-wording'
  | 'shared-wording'
  | 'repeated-phrases'
  | 'occurs-once'
  | 'ayah-endings'
  | 'counts-patterns'
  | 'selected-token'

export type SearchOverviewAction = {
  label: string
  target: SearchWorkspaceTab
  focusModule?: SearchExploreModuleId
}

export type SearchOverviewFact = {
  label: string
  scope: 'all indexed matches' | 'known results' | 'shown results'
  value: string
}

export type SearchOverviewRankedRow = {
  label: string
  scope: 'all indexed matches' | 'known results' | 'shown results'
  value: string
}

export type SearchOverviewViewModel = {
  actions: SearchOverviewAction[]
  caveat: string | null
  facts: SearchOverviewFact[]
  interpretedAs: string
  primaryMatchType: string
  queryLabel: string
  topForms: SearchOverviewRankedRow[]
  topSurahs: SearchOverviewRankedRow[]
}

export type SearchVerseCardViewModel = {
  canHighlightWordsInRead: boolean
  canOpenInRead: boolean
  id: string
  matchReason: string
  matchTypeLabel: string
  primaryText: string
  refLabel: string
  result: SearchResultDto
  secondaryText: string | null
}

export type SearchDetailsViewModel = {
  alsoMatched: string[]
  evidenceRows: Array<{ label: string; value: string }>
  readerMappingRows: Array<{ label: string; value: string }>
  result: SearchResultDto
  sourceRows: Array<{ label: string; value: string }>
  textRows: Array<{ label: string; value: string }>
  title: string
  whyMatched: string
}

export type SearchSourcesViewModel = {
  mappingSummary: Array<{ label: string; value: string }>
  sourceNotes: Array<{ label: string; value: string }>
  sourceRows: Array<{ label: string; value: string }>
}

export type SearchOutputViewModel = {
  defaultTab: SearchWorkspaceTab
  details: SearchDetailsViewModel | null
  exploreModules: SearchExploreModuleId[]
  overview: SearchOverviewViewModel | null
  sources: SearchSourcesViewModel | null
  tabs: Array<{ label: string; value: SearchWorkspaceTab }>
  verseCards: SearchVerseCardViewModel[]
}

export function defaultTabForParsedSearch(parsed: ParsedSearchQuery, mode: SearchQueryMode): SearchWorkspaceTab {
  if (parsed.reference) return 'verses'
  if (mode === 'phrase') return 'verses'
  if (mode === 'all' && isExplicitPhraseShape(parsed)) return 'verses'
  return 'overview'
}

export function toOverviewViewModel(
  brief: SearchBriefDto | null,
  hasMoreResults: boolean,
  results: SearchResultDto[],
): SearchOverviewViewModel | null {
  if (!brief) return null
  const facts: SearchOverviewFact[] = []
  if (brief.counts.occurrenceCountKnown && brief.counts.occurrenceCount !== null) {
    facts.push({
      label: 'Occurrences in this search index',
      scope: 'all indexed matches',
      value: String(brief.counts.occurrenceCount),
    })
  } else {
    facts.push({
      label: 'Known results',
      scope: 'known results',
      value: String(brief.counts.matchedResultCount),
    })
  }
  if (brief.counts.matchedSourceAyahCount !== null) {
    facts.push({
      label: 'Matched ayat',
      scope: 'all indexed matches',
      value: String(brief.counts.matchedSourceAyahCount),
    })
  }
  facts.push({
    label: 'Shown results',
    scope: 'shown results',
    value: hasMoreResults ? `${brief.counts.shownWindowCount} shown; more available` : String(brief.counts.shownWindowCount),
  })

  return {
    actions: overviewActionsForBrief(brief),
    caveat: caveatForBrief(brief),
    facts,
    interpretedAs: modeLabel(brief.query.mode),
    primaryMatchType: brief.evidenceTypes[0] ? evidenceLabel(brief.evidenceTypes[0]) : 'Search match',
    queryLabel: brief.query.rawText,
    topForms: topFormsForShownResults(results),
    topSurahs: brief.distribution.surahsWithMostIndexedMatches.slice(0, 4).map((item) => ({
      label: `Surah ${item.surah}`,
      scope: 'all indexed matches',
      value: `${item.matchedSourceAyahCount} matched ayat`,
    })),
  }
}

export function toVerseCardViewModel(result: SearchResultDto): SearchVerseCardViewModel {
  const evidence = getResultMatchEvidence(result)
  return {
    canHighlightWordsInRead: result.canHighlightWordsInRead,
    canOpenInRead: result.canOpenInRead,
    id: result.resultId,
    matchReason: evidence.whyMatched,
    matchTypeLabel: laneLabel(evidence.lane),
    primaryText: result.sourceText || result.snippet,
    refLabel: formatSearchReference(result.sourceRef),
    result,
    secondaryText: evidence.translationContextExcerpt ?? null,
  }
}

export function toDetailsViewModel(result: SearchResultDto | null): SearchDetailsViewModel | null {
  if (!result) return null
  const evidence = getResultMatchEvidence(result)
  const evidenceRows: Array<{ label: string; value: string }> = [
    { label: 'Matched in', value: laneLabel(evidence.lane) },
  ]
  if (evidence.sourcePosition !== undefined) evidenceRows.push({ label: 'Source word position', value: String(evidence.sourcePosition) })
  if (evidence.sourcePositions?.length) evidenceRows.push({ label: 'Source word positions', value: evidence.sourcePositions.join(', ') })
  if (evidence.wordPosition !== undefined) evidenceRows.push({ label: 'Morphology word position', value: String(evidence.wordPosition) })
  if (evidence.phraseLength !== undefined) evidenceRows.push({ label: 'Phrase length', value: String(evidence.phraseLength) })
  if (evidence.matchedQueryToken) evidenceRows.push({ label: 'Matched query token', value: evidence.matchedQueryToken })
  if (evidence.matchedQueryTokens?.length) evidenceRows.push({ label: 'Matched query tokens', value: evidence.matchedQueryTokens.join(', ') })
  if (evidence.matchedSourceToken) evidenceRows.push({ label: 'Matched source token', value: evidence.matchedSourceToken })
  if (evidence.matchedSourceTokens?.length) evidenceRows.push({ label: 'Matched source tokens', value: evidence.matchedSourceTokens.join(', ') })
  if (evidence.normalizedTokens?.length) evidenceRows.push({ label: 'Normalized tokens', value: evidence.normalizedTokens.join(', ') })
  if (evidence.morphology?.root) evidenceRows.push({ label: 'Root', value: evidence.morphology.root })
  if (evidence.morphology?.lemma) evidenceRows.push({ label: 'Lemma', value: evidence.morphology.lemma })

  return {
    alsoMatched: result.matchLanes.filter((lane) => lane !== evidence.lane).map(laneLabel),
    evidenceRows,
    readerMappingRows: [
      { label: 'Opens in Reader', value: result.canOpenInRead ? 'Available' : 'Search source only' },
      {
        label: 'Corresponding ayah in Reader',
        value: result.readerRefs.length > 0 ? result.readerRefs.join(', ') : 'No validated Reader target',
      },
      { label: 'Word highlight', value: result.canHighlightWordsInRead ? 'Available' : 'Word highlight unavailable' },
    ],
    result,
    sourceRows: [
      { label: 'Source ref', value: result.sourceRef },
      { label: 'Reader refs', value: result.readerRefs.length > 0 ? result.readerRefs.join(', ') : 'No validated Reader target' },
      { label: 'Mapping state', value: mappingLabel(result.mappingState) },
    ],
    textRows: [
      { label: 'Search text', value: result.sourceText },
      ...(result.readerText ? [{ label: 'Reader text', value: result.readerText }] : []),
      ...(evidence.translationContextExcerpt ? [{ label: 'Translation/context excerpt', value: evidence.translationContextExcerpt }] : []),
    ],
    title: formatSearchReference(result.sourceRef),
    whyMatched: evidence.whyMatched,
  }
}

export function toSourcesViewModel(brief: SearchBriefDto | null): SearchSourcesViewModel | null {
  if (!brief) return null
  const frame = brief.sourceFrame
  return {
    mappingSummary: Object.entries(brief.mappingStateCounts ?? {}).map(([label, value]) => ({
      label: mappingLabel(label as keyof NonNullable<SearchBriefDto['mappingStateCounts']>),
      value: String(value),
    })),
    sourceNotes: brief.sourceNotes.map((note) => ({ label: note.label, value: note.text })),
    sourceRows: [
      { label: 'Pack id', value: frame.packId },
      { label: 'Pack version', value: frame.packVersion },
      { label: 'Pack hash', value: frame.contentHash },
      { label: 'Search source', value: frame.sourceRiwayah === 'hafs' ? 'Hafs analytical Search source' : frame.sourceRiwayah },
      { label: 'Source ids', value: frame.sourceIds.join(', ') },
      { label: 'License ids', value: frame.licenseIds.join(', ') },
      { label: 'Normalizer version', value: String(frame.normalizerVersion) },
      { label: 'Query AST version', value: String(frame.queryAstVersion) },
      { label: 'Rank version', value: frame.rankVersion },
      { label: 'Tokenization policy', value: `Search normalizer/tokenizer policy v${frame.normalizerVersion}` },
      { label: 'Boundary policy', value: 'Search matches and graph windows are bounded to indexed source ayah policy.' },
    ],
  }
}

export function deriveSearchOutputViewModel(input: {
  brief: SearchBriefDto | null
  defaultTab: SearchWorkspaceTab
  hasMoreResults: boolean
  results: SearchResultDto[]
  selectedResult: SearchResultDto | null
}): SearchOutputViewModel {
  return {
    defaultTab: input.defaultTab,
    details: toDetailsViewModel(input.selectedResult),
    exploreModules: exploreModulesForBrief(input.brief),
    overview: toOverviewViewModel(input.brief, input.hasMoreResults, input.results),
    sources: toSourcesViewModel(input.brief),
    tabs: [
      { label: 'Overview', value: 'overview' },
      { label: 'Verses', value: 'verses' },
      { label: 'Explore', value: 'explore' },
      { label: 'Sources', value: 'sources' },
    ],
    verseCards: input.results.map(toVerseCardViewModel),
  }
}

function overviewActionsForBrief(brief: SearchBriefDto): SearchOverviewAction[] {
  const actions: SearchOverviewAction[] = [{ label: 'View verses', target: 'verses' }]
  if (brief.distribution.surahsWithMostIndexedMatches.length > 0) {
    actions.push({ label: 'Show distribution', target: 'explore', focusModule: 'surah-distribution' })
  }
  if (brief.evidenceTypes.some((type) => type === 'same-root' || type === 'lemma' || type === 'same-written-form')) {
    actions.push({ label: 'View forms', target: 'explore', focusModule: 'forms-by-count' })
  }
  actions.push({ label: 'Open Explore', target: 'explore' })
  return actions
}

function caveatForBrief(brief: SearchBriefDto): string | null {
  if (brief.evidenceTypes.includes('translation-context')) {
    return 'These results match indexed translation/context text, not necessarily exact Arabic wording.'
  }
  if (brief.evidenceTypes.some((type) => type === 'same-root' || type === 'lemma' || type === 'same-written-form')) {
    return 'Same-root matches are morphology aids. They do not imply the same interpretation.'
  }
  return null
}

function evidenceLabel(type: string): string {
  if (type === 'reference') return 'Reference'
  if (type === 'exact-source-phrase') return 'Exact phrase'
  if (type === 'translation-context') return 'Translation/context'
  if (type === 'same-root') return 'Same root'
  if (type === 'same-written-form') return 'Same written form'
  if (type === 'arabic-text') return 'Arabic text'
  if (type === 'exact-word-form') return 'Exact word form'
  if (type === 'lemma') return 'Lemma'
  return type
}

function exploreModulesForBrief(brief: SearchBriefDto | null): SearchExploreModuleId[] {
  if (!brief) return []
  const modules: SearchExploreModuleId[] = []
  if (brief.distribution.surahsWithMostIndexedMatches.length > 0) modules.push('surah-distribution')
  if (brief.evidenceTypes.some((type) => type === 'same-root' || type === 'lemma' || type === 'same-written-form')) {
    modules.push('forms-by-count', 'query-level-morphology-summary')
  }
  if (brief.evidenceTypes.includes('translation-context')) {
    modules.push('translation-context-terms', 'source-boundary')
  }
  for (const feature of brief.featureAvailability) {
    if (feature.status !== 'available') continue
    if (feature.section === 'following-wording') modules.push('following-wording')
    if (feature.section === 'shared-wording') modules.push('shared-wording')
    if (feature.section === 'repeated-phrases') modules.push('repeated-phrases')
    if (feature.section === 'occurs-once') modules.push('occurs-once')
    if (feature.section === 'ayah-endings') modules.push('ayah-endings')
    if (feature.section === 'counts-patterns') modules.push('counts-patterns')
  }
  return Array.from(new Set(modules))
}

function topFormsForShownResults(results: SearchResultDto[]): SearchOverviewRankedRow[] {
  const counts = new Map<string, number>()
  for (const result of results) {
    const form = result.morphology?.sourceToken
    if (!form) continue
    counts.set(form, (counts.get(form) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([label, count]) => ({ label, scope: 'shown results', value: `${count} shown result${count === 1 ? '' : 's'}` }))
}

function isExplicitPhraseShape(parsed: ParsedSearchQuery): boolean {
  const raw = parsed.ast.rawText.trim()
  const hasQuotePair = /^["'“‘].+["'”’]$/.test(raw)
  return hasQuotePair && parsed.phraseTokens.length >= 2
}
