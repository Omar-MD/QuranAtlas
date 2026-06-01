export type SourceKindV1 = 'quran-text' | 'translation' | 'morphology' | 'reader-mapping'

export type QueryIntentLite =
  | 'open-reference'
  | 'find-occurrences'
  | 'answer-question'
  | 'trace-language'
  | 'unknown'

export type SearchLensLite =
  | 'reference'
  | 'quran-text'
  | 'translation'
  | 'phrase'
  | 'morphology'
  | 'mixed'

export type QueryUnderstandingLite = {
  originalQuery: string
  normalizedQuery: string
  intent: QueryIntentLite
  lens: SearchLensLite
  confidence: 'high' | 'medium' | 'low'
  selectedCandidateId?: string
  alternatives: Array<{
    id: string
    label: string
    lens: SearchLensLite
    reason: string
  }>
  normalizationWarnings: string[]
}

export type SearchPlanLite = {
  primaryLens: SearchLensLite
  lanes: Array<{
    id: string
    sourceKinds: SourceKindV1[]
    queryForm: string
    status: 'executed' | 'skipped' | 'failed'
    skipReason?: string
  }>
  excludedSources: Array<{
    sourceKind: SourceKindV1
    reason: 'not-installed' | 'not-indexed' | 'unsupported-for-query' | 'failed'
  }>
}

export type SourceFamilyStatusLite = {
  sourceKind: SourceKindV1
  availability: 'available' | 'not-installed' | 'not-indexed' | 'unsupported-for-query' | 'failed'
  canSupportClaims: boolean
  failureReason?: 'missing' | 'incompatible-schema' | 'parse-failed' | 'load-failed'
}

export type TextRange = {
  ref: string
  startOffset?: number
  endOffset?: number
}

export type EvidenceDisplayTarget =
  | { type: 'verse-ref'; refs: string[] }
  | { type: 'quote-range'; range: TextRange }
  | { type: 'token'; tokenRefs: string[] }

export type BaseEvidenceAtom = {
  id: string
  sourceKind: SourceKindV1
  sourceId: string
  sourceVersion: string
  refs: string[]
  displayTarget: EvidenceDisplayTarget
  quoteHash?: string
}

export type QuranTextEvidence = BaseEvidenceAtom & {
  evidenceType: 'quran-text'
  sourceKind: 'quran-text'
  displayTarget: Extract<EvidenceDisplayTarget, { type: 'verse-ref' | 'quote-range' }>
}

export type TranslationEvidence = BaseEvidenceAtom & {
  evidenceType: 'translation'
  sourceKind: 'translation'
  translationId: string
  displayTarget: Extract<EvidenceDisplayTarget, { type: 'verse-ref' | 'quote-range' }>
}

export type MorphologyEvidence = BaseEvidenceAtom & {
  evidenceType: 'morphology'
  sourceKind: 'morphology'
  displayTarget: Extract<EvidenceDisplayTarget, { type: 'token' }>
  rowId: string
  sourceToken: string
  normalizedSourceToken: string
  analysisScope: 'token' | 'segment'
  root?: string
  lemma?: string
}

export type ReaderMappingEvidence = BaseEvidenceAtom & {
  evidenceType: 'reader-mapping'
  sourceKind: 'reader-mapping'
  fromRiwayah: 'hafs' | 'qalun' | string
  toRiwayah: 'hafs' | 'qalun' | string
  mappingStatus: 'same-riwayah' | 'verse-level-only' | 'token-level-mapped' | 'token-level-different' | 'unmapped'
}

export type EvidenceAtom =
  | QuranTextEvidence
  | TranslationEvidence
  | MorphologyEvidence
  | ReaderMappingEvidence

export type ClaimAttributionLite =
  | 'quran-mentions'
  | 'quran-states'
  | 'translation-renders'
  | 'morphology-analyzes'

export type ClaimPredicateLite = 'mentions' | 'states' | 'renders' | 'analyzes'

export type ClaimSupport = {
  id: string
  claimId: string
  supportIds: [string, ...string[]]
  verdict: 'supported' | 'insufficient'
}

export type ClaimTemplateIdLite =
  | 'quran-mentions'
  | 'quran-states'
  | 'translation-renders'
  | 'morphology-analyzes'

export type AnswerClaim = {
  id: string
  text: string
  templateId: ClaimTemplateIdLite
  slots: Record<string, string>
  attribution: ClaimAttributionLite
  predicate: ClaimPredicateLite
  supportId: string
}

export type DeferredSourceRequirement =
  | 'tafsir'
  | 'asbab'
  | 'hadith'
  | 'theme'
  | 'cross-reference'

export type AnswerBlockerLite =
  | 'insufficient-evidence'
  | 'ambiguous-query'
  | 'requires-tafsir'
  | 'requires-deferred-source'
  | 'source-unavailable'
  | 'absence-claim-unproven'
  | 'legal-boundary'
  | 'medical-boundary'
  | 'fiqh-boundary'
  | 'personal-crisis-boundary'
  | 'personal-pastoral-boundary'
  | 'broad-theological-boundary'
  | 'inflammatory-religious-attack-boundary'
  | 'outside-current-scope'

export type AnswerabilityDecision =
  | { status: 'answerable'; reasons: []; renderPermission: 'answer-preview' }
  | { status: 'partially-answerable'; reasons: AnswerBlockerLite[]; renderPermission: 'answer-preview' }
  | {
      status: 'evidence-only' | 'needs-clarification' | 'not-answerable'
      reasons: AnswerBlockerLite[]
      renderPermission: 'no-answer-claims'
    }

export type EvidenceBasisLite = {
  quranText: 'used' | 'available-not-used' | 'not-available'
  translation: 'used' | 'available-not-used' | 'not-available'
  morphology: 'used' | 'available-not-used' | 'not-available'
  note: string
}

export type EvidenceCardLite = {
  id: string
  refLabel: string
  evidenceAtomIds: [string, ...string[]]
  claimSupportIds: [string, ...string[]]
  title: string
  snippet: string
  snippetSource: 'quran-text' | 'translation' | 'deterministic-template'
  matchReason: string
  readerAction:
    | { type: 'open-in-reader'; ref: string; mappingWarning?: string }
    | { type: 'unavailable'; reason: string }
}

export type MatchCardLite = {
  id: string
  refLabel: string
  evidenceAtomIds: [string, ...string[]]
  title: string
  snippet: string
  snippetSource: 'quran-text' | 'translation' | 'deterministic-template'
  matchReason: string
  readerAction:
    | { type: 'open-in-reader'; ref: string; mappingWarning?: string }
    | { type: 'unavailable'; reason: string }
}

export type NoAnswerRecoveryLite = {
  message: string
  suggestedQueries: Array<{
    label: string
    query: string
    lens?: SearchLensLite
  }>
  actions: Array<'refine-query' | 'show-related-evidence' | 'open-reader'>
  requiredDeferredSources?: DeferredSourceRequirement[]
}

export type AnswerPreview = {
  id: string
  query: string
  queryUnderstanding: QueryUnderstandingLite
  searchPlan: SearchPlanLite
  mode: 'answer' | 'partial-answer' | 'evidence-only' | 'no-answer'
  answerability: AnswerabilityDecision
  claims: AnswerClaim[]
  claimSupports: ClaimSupport[]
  evidenceAtoms: EvidenceAtom[]
  evidenceBasis: EvidenceBasisLite
  evidenceCards: EvidenceCardLite[]
  recovery?: NoAnswerRecoveryLite
  sourceFamilyStatuses: SourceFamilyStatusLite[]
}

export type EvidenceMatchesPageLite = {
  previewId: string
  evidenceAtoms: EvidenceAtom[]
  matchCards: MatchCardLite[]
  nextCursor?: string
}

type ClaimAuthorityKey = `${ClaimAttributionLite}:${ClaimPredicateLite}`

export const V1_CLAIM_AUTHORITY: Partial<Record<ClaimAuthorityKey, readonly SourceKindV1[]>> = {
  'quran-mentions:mentions': ['quran-text'],
  'quran-states:states': ['quran-text'],
  'translation-renders:renders': ['translation'],
  'morphology-analyzes:analyzes': ['morphology'],
} as const

const SOURCE_KINDS: readonly SourceKindV1[] = ['quran-text', 'translation', 'morphology', 'reader-mapping']

export function answerPreviewModeForDecision(status: AnswerabilityDecision['status']): AnswerPreview['mode'] {
  if (status === 'answerable') return 'answer'
  if (status === 'partially-answerable') return 'partial-answer'
  if (status === 'evidence-only') return 'evidence-only'
  return 'no-answer'
}

export function assertAnswerPreviewContract(preview: AnswerPreview): void {
  const expectedMode = answerPreviewModeForDecision(preview.answerability.status)
  if (preview.mode !== expectedMode) {
    throw new Error(`AnswerPreview mode ${preview.mode} does not match answerability ${preview.answerability.status}`)
  }
  if (preview.claims.length > 3) throw new Error('AnswerPreview claims exceed v1 limit')
  if (preview.evidenceCards.length > 5) throw new Error('AnswerPreview evidence cards exceed v1 limit')
  if (preview.evidenceAtoms.length > 20) throw new Error('AnswerPreview evidence atoms exceed v1 limit')
  if (preview.answerability.renderPermission === 'no-answer-claims' && preview.claims.length > 0) {
    throw new Error('no-answer render permission requires empty claims')
  }

  const evidenceById = new Map(preview.evidenceAtoms.map((atom) => [atom.id, atom]))
  for (const atom of preview.evidenceAtoms) {
    if (!SOURCE_KINDS.includes(atom.sourceKind)) throw new Error(`unsupported v1 source kind ${atom.sourceKind}`)
    if (atom.sourceKind !== atom.evidenceType) throw new Error(`evidence ${atom.id} has mismatched sourceKind/evidenceType`)
    if (atom.refs.length === 0) throw new Error(`evidence ${atom.id} must include at least one ref`)
  }

  const supportById = new Map(preview.claimSupports.map((support) => [support.id, support]))
  const claimById = new Map(preview.claims.map((claim) => [claim.id, claim]))

  for (const support of preview.claimSupports) {
    const claim = claimById.get(support.claimId)
    if (!claim && support.verdict === 'supported') throw new Error(`supported claim support ${support.id} points to missing claim`)
    if (support.supportIds.length === 0) throw new Error(`claim support ${support.id} has no evidence`)
    for (const supportId of support.supportIds) {
      if (!evidenceById.has(supportId)) throw new Error(`claim support ${support.id} references missing evidence ${supportId}`)
    }
  }

  for (const claim of preview.claims) {
    const support = supportById.get(claim.supportId)
    if (!support) throw new Error(`claim ${claim.id} references missing support ${claim.supportId}`)
    if (support.claimId !== claim.id) throw new Error(`claim ${claim.id} support ${support.id} points to ${support.claimId}`)
    if (support.verdict !== 'supported') throw new Error(`claim ${claim.id} cannot render with insufficient support`)
    const authorityKey: ClaimAuthorityKey = `${claim.attribution}:${claim.predicate}`
    const allowedKinds = V1_CLAIM_AUTHORITY[authorityKey]
    if (!allowedKinds) throw new Error(`claim ${claim.id} has unsupported authority key ${authorityKey}`)
    for (const supportId of support.supportIds) {
      const atom = evidenceById.get(supportId)
      if (!atom) throw new Error(`claim ${claim.id} references missing evidence ${supportId}`)
      if (!(allowedKinds as readonly string[]).includes(atom.evidenceType)) {
        throw new Error(`claim ${claim.id} cannot use ${atom.evidenceType} evidence for ${authorityKey}`)
      }
    }
  }

  for (const card of preview.evidenceCards) {
    for (const atomId of card.evidenceAtomIds) {
      if (!evidenceById.has(atomId)) throw new Error(`evidence card ${card.id} references missing evidence ${atomId}`)
    }
    for (const supportId of card.claimSupportIds) {
      const support = supportById.get(supportId)
      if (!support || support.verdict !== 'supported') {
        throw new Error(`evidence card ${card.id} references unsupported claim support ${supportId}`)
      }
    }
  }

  for (const status of preview.sourceFamilyStatuses) {
    if (status.canSupportClaims && status.availability !== 'available') {
      throw new Error(`source family ${status.sourceKind} canSupportClaims requires available status`)
    }
  }
}
