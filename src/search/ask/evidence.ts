import type {
  EvidenceAtom,
  EvidenceCardLite,
  MatchCardLite,
  MorphologyEvidence,
  SearchPackManifestV1,
  SearchPlanLite,
  SearchResultDto,
  SourceFamilyStatusLite,
} from '../../../shared/search'

export function sourceFamilyStatusesFromManifest(manifest: SearchPackManifestV1): SourceFamilyStatusLite[] {
  return [
    { sourceKind: 'quran-text', availability: 'available', canSupportClaims: true },
    {
      sourceKind: 'translation',
      availability: manifest.features.includes('translation') ? 'available' : 'not-indexed',
      canSupportClaims: manifest.features.includes('translation'),
    },
    {
      sourceKind: 'morphology',
      availability: manifest.features.includes('morphology') ? 'available' : 'not-indexed',
      canSupportClaims: manifest.features.includes('morphology'),
    },
    { sourceKind: 'reader-mapping', availability: 'available', canSupportClaims: false },
  ]
}

export function searchPlanForPreview(input: {
  lens: SearchPlanLite['primaryLens']
  queryForm: string
  sourceKinds: Array<'quran-text' | 'translation' | 'morphology'>
  failed?: boolean
}): SearchPlanLite {
  return {
    primaryLens: input.lens,
    lanes: [{
      id: input.lens,
      sourceKinds: input.sourceKinds,
      queryForm: input.queryForm,
      status: input.failed ? 'failed' : 'executed',
      skipReason: input.failed ? 'Search execution failed for this source lane.' : undefined,
    }],
    excludedSources: [],
  }
}

export function evidenceAtomForResult(result: SearchResultDto, manifest: SearchPackManifestV1): EvidenceAtom | null {
  const lane = result.matchEvidence.lane
  const base = {
    id: `evidence:${result.resultId}`,
    sourceId: sourceIdForLane(lane, manifest),
    sourceVersion: manifest.packVersion,
    refs: [result.sourceRef],
  }
  if (lane === 'translation' || lane === 'context') {
    return {
      ...base,
      evidenceType: 'translation',
      sourceKind: 'translation',
      translationId: sourceIdForLane(lane, manifest),
      displayTarget: { type: 'verse-ref', refs: [result.sourceRef] },
    }
  }
  if (lane === 'same-written-form' || lane === 'same-root' || lane === 'lemma' || lane === 'surah-context') {
    const target = morphologyEvidenceTargetForResult(result)
    if (!target) return null
    return {
      ...base,
      evidenceType: 'morphology',
      sourceKind: 'morphology',
      displayTarget: { type: 'token', tokenRefs: [`${result.sourceRef}:${target.wordPosition}`] },
      rowId: target.rowId,
      sourceToken: target.sourceToken,
      normalizedSourceToken: target.normalizedSourceToken,
      analysisScope: 'token',
      root: result.matchEvidence.morphology?.root ?? result.morphology?.root ?? undefined,
      lemma: result.matchEvidence.morphology?.lemma ?? result.morphology?.lemma ?? undefined,
    }
  }
  return {
    ...base,
    evidenceType: 'quran-text',
    sourceKind: 'quran-text',
    displayTarget: { type: 'verse-ref', refs: [result.sourceRef] },
  }
}

export function evidenceCardForResult(input: {
  result: SearchResultDto
  evidenceAtomId: string
  claimSupportId: string
}): EvidenceCardLite {
  const snippetSource = snippetSourceForResult(input.result)
  return {
    id: `evidence-card:${input.result.resultId}`,
    refLabel: input.result.sourceRef,
    evidenceAtomIds: [input.evidenceAtomId],
    claimSupportIds: [input.claimSupportId],
    title: input.result.sourceRef,
    snippet: input.result.snippet,
    snippetSource,
    sourceText: input.result.sourceText,
    translationText: input.result.translationText,
    matchReason: input.result.matchEvidence.whyMatched,
    readerAction: readerActionForResult(input.result),
  }
}

export function matchCardForResult(result: SearchResultDto, evidenceAtomId: string): MatchCardLite {
  return {
    id: `match-card:${result.resultId}`,
    refLabel: result.sourceRef,
    evidenceAtomIds: [evidenceAtomId],
    title: result.sourceRef,
    snippet: result.snippet,
    snippetSource: snippetSourceForResult(result),
    sourceText: result.sourceText,
    translationText: result.translationText,
    matchReason: result.matchEvidence.whyMatched,
    readerAction: readerActionForResult(result),
  }
}

function sourceIdForLane(lane: SearchResultDto['matchEvidence']['lane'], manifest: SearchPackManifestV1): string {
  if (lane === 'translation' || lane === 'context') {
    return manifest.sourceIds.find((id) => id.includes('translation') || id.includes('bridges')) ?? manifest.sourceIds[0] ?? manifest.packId
  }
  if (lane === 'same-written-form' || lane === 'same-root' || lane === 'lemma' || lane === 'surah-context') {
    return manifest.sourceIds.find((id) => id.includes('qac') || id.includes('morphology')) ?? manifest.sourceIds[0] ?? manifest.packId
  }
  return manifest.sourceIds.find((id) => id.includes('hafs') || id.includes('tanzil')) ?? manifest.sourceIds[0] ?? manifest.packId
}

function snippetSourceForResult(result: SearchResultDto): EvidenceCardLite['snippetSource'] {
  const lane = result.matchEvidence.lane
  if (lane === 'translation' || lane === 'context') return 'translation'
  if (lane === 'same-written-form' || lane === 'same-root' || lane === 'lemma' || lane === 'surah-context') return 'deterministic-template'
  return 'quran-text'
}

function readerActionForResult(result: SearchResultDto): EvidenceCardLite['readerAction'] {
  if (!result.canOpenInRead) {
    return { type: 'unavailable', reason: 'No validated Reader target is available for this Search source result.' }
  }
  const mappingWarning = result.canHighlightWordsInRead
    ? undefined
    : 'Word-level Reader highlighting is unavailable for this evidence.'
  return { type: 'open-source-in-reader', sourceRef: result.sourceRef, mappingWarning }
}

function morphologyEvidenceTargetForResult(result: SearchResultDto): Pick<
  MorphologyEvidence,
  'rowId' | 'sourceToken' | 'normalizedSourceToken'
> & { wordPosition: number } | null {
  const wordPosition = result.matchEvidence.wordPosition ?? result.morphology?.wordPosition
  const rowId = result.matchEvidence.morphology?.rowId
  const sourceToken = result.matchEvidence.morphology?.sourceToken ?? result.morphology?.sourceToken
  const normalizedSourceToken = result.matchEvidence.matchedSourceToken ?? sourceToken
  if (typeof wordPosition !== 'number' || !Number.isInteger(wordPosition) || wordPosition < 1) return null
  if (!rowId || !sourceToken || !normalizedSourceToken) return null
  return { wordPosition, rowId, sourceToken, normalizedSourceToken }
}
