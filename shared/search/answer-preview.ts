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

type SupportedClaimAuthorityKey =
  | 'quran-mentions:mentions'
  | 'quran-states:states'
  | 'translation-renders:renders'
  | 'morphology-analyzes:analyzes'

export const V1_CLAIM_AUTHORITY: Record<SupportedClaimAuthorityKey, readonly SourceKindV1[]> = {
  'quran-mentions:mentions': ['quran-text'],
  'quran-states:states': ['quran-text'],
  'translation-renders:renders': ['translation'],
  'morphology-analyzes:analyzes': ['morphology'],
} as const

const SOURCE_KINDS: readonly SourceKindV1[] = ['quran-text', 'translation', 'morphology', 'reader-mapping']
const SOURCE_FAMILY_AVAILABILITIES: readonly SourceFamilyStatusLite['availability'][] = [
  'available',
  'not-installed',
  'not-indexed',
  'unsupported-for-query',
  'failed',
]
const SEARCH_PLAN_LANE_STATUSES: readonly SearchPlanLite['lanes'][number]['status'][] = ['executed', 'skipped', 'failed']
const SEARCH_PLAN_EXCLUDED_REASONS: readonly SearchPlanLite['excludedSources'][number]['reason'][] = [
  'not-installed',
  'not-indexed',
  'unsupported-for-query',
  'failed',
]
const ANSWERABILITY_STATUSES: readonly AnswerabilityDecision['status'][] = [
  'answerable',
  'partially-answerable',
  'evidence-only',
  'needs-clarification',
  'not-answerable',
]
const ANSWER_BLOCKERS: readonly AnswerBlockerLite[] = [
  'insufficient-evidence',
  'ambiguous-query',
  'requires-tafsir',
  'requires-deferred-source',
  'source-unavailable',
  'absence-claim-unproven',
  'legal-boundary',
  'medical-boundary',
  'fiqh-boundary',
  'personal-crisis-boundary',
  'personal-pastoral-boundary',
  'broad-theological-boundary',
  'inflammatory-religious-attack-boundary',
  'outside-current-scope',
]
const DEFERRED_SOURCE_REQUIREMENTS: readonly DeferredSourceRequirement[] = [
  'tafsir',
  'asbab',
  'hadith',
  'theme',
  'cross-reference',
]
const RENDER_PERMISSIONS: readonly AnswerabilityDecision['renderPermission'][] = ['answer-preview', 'no-answer-claims']
const READER_ACTION_TYPES: readonly EvidenceCardLite['readerAction']['type'][] = ['open-in-reader', 'unavailable']
const DISPLAY_TARGET_TYPES: readonly EvidenceDisplayTarget['type'][] = ['verse-ref', 'quote-range', 'token']
const MORPHOLOGY_ANALYSIS_SCOPES: readonly MorphologyEvidence['analysisScope'][] = ['token', 'segment']
const READER_MAPPING_STATUSES: readonly ReaderMappingEvidence['mappingStatus'][] = [
  'same-riwayah',
  'verse-level-only',
  'token-level-mapped',
  'token-level-different',
  'unmapped',
]
const CLAIM_SUPPORT_VERDICTS: readonly ClaimSupport['verdict'][] = ['supported', 'insufficient']

export function answerPreviewModeForDecision(status: AnswerabilityDecision['status']): AnswerPreview['mode'] {
  if (status === 'answerable') return 'answer'
  if (status === 'partially-answerable') return 'partial-answer'
  if (status === 'evidence-only') return 'evidence-only'
  return 'no-answer'
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`AnswerPreview ${label} must be an array`)
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error(`AnswerPreview ${label} must be an object`)
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`)
}

function assertKnownValue<T extends string>(value: unknown, allowed: readonly T[], label: string): asserts value is T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`unsupported ${label} ${String(value)}`)
  }
}

function assertSourceKind(sourceKind: unknown, label: string): asserts sourceKind is SourceKindV1 {
  assertKnownValue(sourceKind, SOURCE_KINDS, label)
}

function assertUniqueIds(items: Array<{ id: string }>, label: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    assertRecord(item, `${label} item`)
    if (typeof item.id !== 'string' || item.id.length === 0) throw new Error(`${label} item must include an id`)
    if (seen.has(item.id)) throw new Error(`${label} contains duplicate id ${item.id}`)
    seen.add(item.id)
  }
}

function assertNonEmptyStringArray(value: unknown, label: string): string[] {
  assertArray(value, label)
  if (value.length === 0) throw new Error(`AnswerPreview ${label} must include at least one item`)
  const strings: string[] = []
  for (const item of value) {
    assertNonEmptyString(item, `${label} item`)
    strings.push(item)
  }
  return strings
}

function assertDisplayTarget(
  target: EvidenceDisplayTarget,
  allowedTypes: readonly EvidenceDisplayTarget['type'][],
  label: string,
): string[] {
  assertRecord(target, `${label} displayTarget`)
  assertKnownValue(target.type, DISPLAY_TARGET_TYPES, `${label} displayTarget type`)
  if (!(allowedTypes as readonly string[]).includes(target.type)) {
    throw new Error(`${label} displayTarget type ${target.type} is not valid`)
  }

  if (target.type === 'verse-ref') {
    return assertNonEmptyStringArray(target.refs, `${label} displayTarget.refs`)
  }
  if (target.type === 'quote-range') {
    assertRecord(target.range, `${label} displayTarget.range`)
    assertNonEmptyString(target.range.ref, `${label} displayTarget.range.ref`)
    return [target.range.ref]
  }
  return assertNonEmptyStringArray(target.tokenRefs, `${label} displayTarget.tokenRefs`)
}

function assertEvidenceAtomVariant(atom: EvidenceAtom): void {
  const label = `evidence ${atom.id}`
  assertSourceKind(atom.evidenceType, 'evidence type')
  if (atom.sourceKind !== atom.evidenceType) throw new Error(`${label} has mismatched sourceKind/evidenceType`)
  const textTargetTypes = ['verse-ref', 'quote-range'] as const

  switch (atom.evidenceType) {
    case 'quran-text':
      assertDisplayTarget(atom.displayTarget, textTargetTypes, label)
      return
    case 'translation':
      assertNonEmptyString(atom.translationId, `${label} translationId`)
      assertDisplayTarget(atom.displayTarget, textTargetTypes, label)
      return
    case 'morphology':
      assertNonEmptyString(atom.rowId, `${label} rowId`)
      assertNonEmptyString(atom.sourceToken, `${label} sourceToken`)
      assertNonEmptyString(atom.normalizedSourceToken, `${label} normalizedSourceToken`)
      assertKnownValue(atom.analysisScope, MORPHOLOGY_ANALYSIS_SCOPES, `${label} analysisScope`)
      assertDisplayTarget(atom.displayTarget, ['token'], label)
      return
    case 'reader-mapping':
      assertNonEmptyString(atom.fromRiwayah, `${label} fromRiwayah`)
      assertNonEmptyString(atom.toRiwayah, `${label} toRiwayah`)
      assertKnownValue(atom.mappingStatus, READER_MAPPING_STATUSES, `${label} mappingStatus`)
      assertDisplayTarget(atom.displayTarget, DISPLAY_TARGET_TYPES, label)
      return
  }
}

function isSupportedClaimAuthorityKey(key: ClaimAuthorityKey): key is SupportedClaimAuthorityKey {
  return Object.prototype.hasOwnProperty.call(V1_CLAIM_AUTHORITY, key)
}

function assertAnswerabilityDecision(decision: AnswerabilityDecision): void {
  assertRecord(decision, 'answerability')
  assertKnownValue(decision.status, ANSWERABILITY_STATUSES, 'answerability status')
  assertKnownValue(decision.renderPermission, RENDER_PERMISSIONS, 'answerability renderPermission')
  assertArray(decision.reasons, 'answerability.reasons')
  for (const reason of decision.reasons) {
    assertKnownValue(reason, ANSWER_BLOCKERS, 'answerability reason')
  }

  const status = decision.status
  if (status === 'answerable') {
    if (decision.renderPermission !== 'answer-preview') {
      throw new Error('answerable decisions require answer-preview render permission')
    }
    if (decision.reasons.length > 0) throw new Error('answerable decisions require empty reasons')
    return
  }
  if (status === 'partially-answerable') {
    if (decision.renderPermission !== 'answer-preview') {
      throw new Error('partially-answerable decisions require answer-preview render permission')
    }
    return
  }
  if (decision.renderPermission !== 'no-answer-claims') {
    throw new Error(`${status} decisions require no-answer-claims render permission`)
  }
}

function assertDeferredSourceRequirements(preview: AnswerPreview): void {
  const reasons = preview.answerability.reasons as readonly AnswerBlockerLite[]
  const requiresDeferredSource = reasons.includes('requires-deferred-source')
  const deferredSources = preview.recovery?.requiredDeferredSources
  if (!requiresDeferredSource && deferredSources === undefined) return
  const requiredDeferredSources = assertNonEmptyStringArray(deferredSources, 'recovery.requiredDeferredSources')
  for (const source of requiredDeferredSources) {
    assertKnownValue(source, DEFERRED_SOURCE_REQUIREMENTS, 'required deferred source')
  }
}

function buildSourceStatusByKind(statuses: SourceFamilyStatusLite[]): Map<SourceKindV1, SourceFamilyStatusLite> {
  const sourceStatusByKind = new Map<SourceKindV1, SourceFamilyStatusLite>()
  for (const status of statuses) {
    assertRecord(status, 'source family status')
    assertSourceKind(status.sourceKind, 'source family source kind')
    assertKnownValue(status.availability, SOURCE_FAMILY_AVAILABILITIES, 'source family availability')
    if (typeof status.canSupportClaims !== 'boolean') {
      throw new Error(`source family ${status.sourceKind} canSupportClaims must be boolean`)
    }
    if (sourceStatusByKind.has(status.sourceKind)) {
      throw new Error(`source family statuses contain duplicate source kind ${status.sourceKind}`)
    }
    if (status.canSupportClaims && status.availability !== 'available') {
      throw new Error(`source family ${status.sourceKind} canSupportClaims requires available status`)
    }
    sourceStatusByKind.set(status.sourceKind, status)
  }
  return sourceStatusByKind
}

function assertSearchPlanSourceKinds(searchPlan: SearchPlanLite): void {
  assertRecord(searchPlan, 'searchPlan')
  assertArray(searchPlan.lanes, 'searchPlan.lanes')
  assertArray(searchPlan.excludedSources, 'searchPlan.excludedSources')

  for (const lane of searchPlan.lanes) {
    assertRecord(lane, 'searchPlan lane')
    assertKnownValue(lane.status, SEARCH_PLAN_LANE_STATUSES, 'searchPlan lane status')
    assertArray(lane.sourceKinds, 'searchPlan lane sourceKinds')
    for (const sourceKind of lane.sourceKinds) {
      assertSourceKind(sourceKind, 'searchPlan lane source kind')
    }
  }

  for (const excludedSource of searchPlan.excludedSources) {
    assertRecord(excludedSource, 'searchPlan excluded source')
    assertSourceKind(excludedSource.sourceKind, 'searchPlan excluded source kind')
    assertKnownValue(excludedSource.reason, SEARCH_PLAN_EXCLUDED_REASONS, 'searchPlan excluded source reason')
  }
}

export function assertAnswerPreviewContract(preview: AnswerPreview): void {
  assertRecord(preview, 'preview')
  assertArray(preview.claims, 'claims')
  assertArray(preview.claimSupports, 'claimSupports')
  assertArray(preview.evidenceAtoms, 'evidenceAtoms')
  assertArray(preview.evidenceCards, 'evidenceCards')
  assertArray(preview.sourceFamilyStatuses, 'sourceFamilyStatuses')
  assertSearchPlanSourceKinds(preview.searchPlan)
  assertAnswerabilityDecision(preview.answerability)
  assertDeferredSourceRequirements(preview)

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

  assertUniqueIds(preview.claims, 'claims')
  assertUniqueIds(preview.claimSupports, 'claimSupports')
  assertUniqueIds(preview.evidenceAtoms, 'evidenceAtoms')
  assertUniqueIds(preview.evidenceCards, 'evidenceCards')

  const sourceStatusByKind = buildSourceStatusByKind(preview.sourceFamilyStatuses)
  const evidenceById = new Map(preview.evidenceAtoms.map((atom) => [atom.id, atom]))
  for (const atom of preview.evidenceAtoms) {
    assertRecord(atom, 'evidence atom')
    assertSourceKind(atom.sourceKind, 'v1 source kind')
    assertArray(atom.refs, `evidence ${atom.id} refs`)
    if (atom.refs.length === 0) throw new Error(`evidence ${atom.id} must include at least one ref`)
    for (const ref of atom.refs) assertNonEmptyString(ref, `evidence ${atom.id} ref`)
    assertEvidenceAtomVariant(atom)
  }

  const supportById = new Map(preview.claimSupports.map((support) => [support.id, support]))
  const claimById = new Map(preview.claims.map((claim) => [claim.id, claim]))

  for (const support of preview.claimSupports) {
    assertRecord(support, 'claim support')
    assertArray(support.supportIds, `claim support ${support.id} supportIds`)
    assertKnownValue(support.verdict, CLAIM_SUPPORT_VERDICTS, `claim support ${support.id} verdict`)
    const claim = claimById.get(support.claimId)
    if (!claim && support.verdict === 'supported') throw new Error(`supported claim support ${support.id} points to missing claim`)
    if (support.supportIds.length === 0) throw new Error(`claim support ${support.id} has no evidence`)
    for (const supportId of support.supportIds) {
      if (!evidenceById.has(supportId)) throw new Error(`claim support ${support.id} references missing evidence ${supportId}`)
    }
  }

  for (const claim of preview.claims) {
    assertRecord(claim, 'claim')
    const support = supportById.get(claim.supportId)
    if (!support) throw new Error(`claim ${claim.id} references missing support ${claim.supportId}`)
    if (support.claimId !== claim.id) throw new Error(`claim ${claim.id} support ${support.id} points to ${support.claimId}`)
    if (support.verdict !== 'supported') throw new Error(`claim ${claim.id} cannot render with insufficient support`)
    const authorityKey: ClaimAuthorityKey = `${claim.attribution}:${claim.predicate}`
    if (!isSupportedClaimAuthorityKey(authorityKey)) throw new Error(`claim ${claim.id} has unsupported authority key ${authorityKey}`)
    const allowedKinds = V1_CLAIM_AUTHORITY[authorityKey]
    for (const supportId of support.supportIds) {
      const atom = evidenceById.get(supportId)
      if (!atom) throw new Error(`claim ${claim.id} references missing evidence ${supportId}`)
      if (!(allowedKinds as readonly string[]).includes(atom.evidenceType)) {
        throw new Error(`claim ${claim.id} cannot use ${atom.evidenceType} evidence for ${authorityKey}`)
      }
      const sourceStatus = sourceStatusByKind.get(atom.sourceKind)
      if (!sourceStatus) {
        throw new Error(`claim ${claim.id} evidence ${atom.id} uses source family ${atom.sourceKind} without sourceFamilyStatuses entry`)
      }
      if (sourceStatus.availability !== 'available' || !sourceStatus.canSupportClaims) {
        throw new Error(`claim ${claim.id} cannot use ${atom.evidenceType} evidence because source family ${atom.sourceKind} cannot support claims`)
      }
    }
  }

  for (const card of preview.evidenceCards) {
    assertRecord(card, 'evidence card')
    assertArray(card.evidenceAtomIds, `evidence card ${card.id} evidenceAtomIds`)
    assertArray(card.claimSupportIds, `evidence card ${card.id} claimSupportIds`)
    if (card.evidenceAtomIds.length === 0) throw new Error(`evidence card ${card.id} evidenceAtomIds must include at least one item`)
    if (card.claimSupportIds.length === 0) throw new Error(`evidence card ${card.id} claimSupportIds must include at least one item`)
    const cardEvidenceIds = new Set(card.evidenceAtomIds)
    const supportEvidenceIds = new Set<string>()
    const supportEvidenceRefs = new Set<string>()
    for (const atomId of card.evidenceAtomIds) {
      if (!evidenceById.has(atomId)) throw new Error(`evidence card ${card.id} references missing evidence ${atomId}`)
    }
    for (const supportId of card.claimSupportIds) {
      const support = supportById.get(supportId)
      if (!support || support.verdict !== 'supported') {
        throw new Error(`evidence card ${card.id} references unsupported claim support ${supportId}`)
      }
      if (!claimById.has(support.claimId)) {
        throw new Error(`evidence card ${card.id} support ${supportId} points to missing rendered claim ${support.claimId}`)
      }
      for (const supportEvidenceId of support.supportIds) {
        const supportEvidence = evidenceById.get(supportEvidenceId)
        if (!supportEvidence) throw new Error(`evidence card ${card.id} support ${supportId} references missing evidence ${supportEvidenceId}`)
        supportEvidenceIds.add(supportEvidenceId)
        for (const ref of supportEvidence.refs) supportEvidenceRefs.add(ref)
        if (!cardEvidenceIds.has(supportEvidenceId)) {
          throw new Error(`evidence card ${card.id} support ${supportId} evidence ${supportEvidenceId} is not included in card evidenceAtomIds`)
        }
      }
    }
    for (const atomId of card.evidenceAtomIds) {
      if (!supportEvidenceIds.has(atomId)) throw new Error(`evidence card ${card.id} includes unrelated evidence ${atomId}`)
    }
    assertRecord(card.readerAction, `evidence card ${card.id} readerAction`)
    assertKnownValue(card.readerAction.type, READER_ACTION_TYPES, `evidence card ${card.id} readerAction type`)
    if (card.readerAction.type === 'open-in-reader' && !supportEvidenceRefs.has(card.readerAction.ref)) {
      throw new Error(`evidence card ${card.id} open-in-reader ref ${card.readerAction.ref} is not linked support evidence`)
    }
  }
}
