import {
  assertAnswerPreviewContract,
  type AnswerBlockerLite,
  type AnswerClaim,
  type AnswerPreview,
  type ClaimAttributionLite,
  type ClaimPredicateLite,
  type ClaimSupport,
  type ClaimTemplateIdLite,
  type EvidenceAtom,
  type EvidenceBasisLite,
  type EvidenceMatchesPageLite,
  type QueryUnderstandingLite,
  type SearchLensLite,
  type SearchPlanLite,
  type SearchPackManifestV1,
  type SearchQueryAstV1,
  type SearchResultCursor,
  type SearchResultDto,
  type SearchSort,
  type SourceKindV1,
} from '../../../shared/search'
import { SearchCancelledError, type SearchCancellationToken } from '../../search-worker/cancellation'
import { SearchQueryExecutor } from '../../search-worker/query-executor'
import { SearchPackReader, SearchPackReaderError } from '../pack-reader'
import { stableQueryHash } from '../query-parser'
import {
  evidenceAtomForResult,
  evidenceCardForResult,
  matchCardForResult,
  searchPlanForPreview,
  sourceFamilyStatusesFromManifest,
} from './evidence'
import { blockersForAskQuery, recoveryForAskBlockers } from './boundaries'
import { understandAskQuery } from './query-understanding'

export const ASK_PREVIEW_LIMIT = 5
export const ASK_PREVIEW_EVIDENCE_ATOM_LIMIT = 20
export const ASK_MATCHES_PAGE_LIMIT = 10

type BuildPreviewInput = {
  query: string
  lens?: SearchLensLite
  queryAst?: SearchQueryAstV1
  sort: SearchSort
  token: SearchCancellationToken
}

type BuildMatchesPageInput = {
  previewId: string
  query: string
  lens?: SearchLensLite
  queryAst?: SearchQueryAstV1
  cursor?: SearchResultCursor
  limit: number
  sort: SearchSort
  token: SearchCancellationToken
}

type EvidenceResultPair = {
  atom: EvidenceAtom
  result: SearchResultDto
}

export class AskSearchPreviewBuilder {
  private readonly reader: SearchPackReader
  private readonly executor: SearchQueryExecutor

  constructor(reader: SearchPackReader) {
    this.reader = reader
    this.executor = new SearchQueryExecutor(reader)
  }

  async buildPreview(input: BuildPreviewInput): Promise<AnswerPreview> {
    const { understanding, parsed, parseError } = understandAskQuery(input.query, input.lens)
    const effectiveAst = input.queryAst ?? parsed?.ast ?? null
    const sourceFamilyStatuses = sourceFamilyStatusesFromManifest(this.reader.manifest)
    const sourceKinds = sourceKindsForLens(understanding.lens)
    const basePlan = searchPlanForPreview({
      lens: understanding.lens,
      queryForm: effectiveAst?.normalizedText ?? understanding.normalizedQuery,
      sourceKinds,
      failed: Boolean(parseError && !effectiveAst),
    })

    if (!effectiveAst) {
      return this.validatedPreview({
        id: previewIdFor({
          query: input.query,
          lens: understanding.lens,
          queryAst: effectiveAst,
          sort: input.sort,
          manifest: this.reader.manifest,
        }),
        query: input.query,
        queryUnderstanding: understanding,
        searchPlan: skippedSearchPlan(basePlan, 'The query could not be parsed into an executable Search intent.'),
        mode: 'no-answer',
        answerability: {
          status: 'needs-clarification',
          reasons: ['ambiguous-query'],
          renderPermission: 'no-answer-claims',
        },
        claims: [],
        claimSupports: [],
        evidenceAtoms: [],
        evidenceBasis: evidenceBasisFor(sourceFamilyStatuses, []),
        evidenceCards: [],
        recovery: recoveryForAskBlockers(input.query, ['ambiguous-query']),
        sourceFamilyStatuses,
      })
    }

    const blockers = blockersForAskQuery(input.query, understanding)
    if (blockers.length > 0) {
      const ambiguous = blockers.includes('ambiguous-query')
      return this.validatedPreview({
        id: previewIdFor({
          query: input.query,
          lens: understanding.lens,
          queryAst: effectiveAst,
          sort: input.sort,
          manifest: this.reader.manifest,
        }),
        query: input.query,
        queryUnderstanding: understanding,
        searchPlan: skippedSearchPlan(basePlan, 'The Ask preview boundary policy blocked prose claims before Search execution.'),
        mode: ambiguous ? 'no-answer' : 'evidence-only',
        answerability: {
          status: ambiguous ? 'needs-clarification' : 'evidence-only',
          reasons: blockers,
          renderPermission: 'no-answer-claims',
        },
        claims: [],
        claimSupports: [],
        evidenceAtoms: [],
        evidenceBasis: evidenceBasisFor(sourceFamilyStatuses, []),
        evidenceCards: [],
        recovery: recoveryForAskBlockers(input.query, blockers),
        sourceFamilyStatuses,
      })
    }

    let results: SearchResultDto[]
    let searchPlan = basePlan
    try {
      const window = await this.executor.execute({
        query: effectiveAst,
        limit: ASK_PREVIEW_LIMIT,
        sort: input.sort,
        token: input.token,
      })
      results = window.results
    } catch (error) {
      if (error instanceof SearchCancelledError) throw error
      const blockersForFailure: AnswerBlockerLite[] = ['source-unavailable']
      searchPlan = searchPlanForPreview({
        lens: understanding.lens,
        queryForm: effectiveAst.normalizedText,
        sourceKinds,
        failed: true,
      })
      return this.validatedPreview({
        id: previewIdFor({
          query: input.query,
          lens: understanding.lens,
          queryAst: effectiveAst,
          sort: input.sort,
          manifest: this.reader.manifest,
        }),
        query: input.query,
        queryUnderstanding: understanding,
        searchPlan,
        mode: 'evidence-only',
        answerability: {
          status: 'evidence-only',
          reasons: blockersForFailure,
          renderPermission: 'no-answer-claims',
        },
        claims: [],
        claimSupports: [],
        evidenceAtoms: [],
        evidenceBasis: evidenceBasisFor(sourceFamilyStatuses, []),
        evidenceCards: [],
        recovery: recoveryForAskBlockers(input.query, blockersForFailure),
        sourceFamilyStatuses,
      })
    }

    const evidencePairs = evidencePairsForResults(results, this.reader.manifest).slice(0, ASK_PREVIEW_EVIDENCE_ATOM_LIMIT)
    const evidenceAtoms = evidencePairs.map((pair) => pair.atom)
    const firstPair = evidencePairs[0]
    if (!firstPair) {
      const insufficient: AnswerBlockerLite[] = ['insufficient-evidence']
      return this.validatedPreview(evidenceOnlyPreview({
        query: input.query,
        lens: understanding.lens,
        queryAst: effectiveAst,
        sort: input.sort,
        manifest: this.reader.manifest,
        understanding,
        searchPlan,
        evidenceAtoms,
        sourceFamilyStatuses,
        reasons: insufficient,
      }))
    }

    const claim = claimForEvidence({
      atom: firstPair.atom,
      result: firstPair.result,
      understanding,
      tokenCount: effectiveAst.tokens.length,
    })
    if (!claim) {
      const insufficient: AnswerBlockerLite[] = ['insufficient-evidence']
      return this.validatedPreview(evidenceOnlyPreview({
        query: input.query,
        lens: understanding.lens,
        queryAst: effectiveAst,
        sort: input.sort,
        manifest: this.reader.manifest,
        understanding,
        searchPlan,
        evidenceAtoms,
        sourceFamilyStatuses,
        reasons: insufficient,
      }))
    }
    const claimSupport: ClaimSupport = {
      id: `support:${claim.id}`,
      claimId: claim.id,
      supportIds: [firstPair.atom.id],
      verdict: 'supported',
    }
    const preview: AnswerPreview = {
      id: previewIdFor({
        query: input.query,
        lens: understanding.lens,
        queryAst: effectiveAst,
        sort: input.sort,
        manifest: this.reader.manifest,
      }),
      query: input.query,
      queryUnderstanding: understanding,
      searchPlan,
      mode: 'answer',
      answerability: { status: 'answerable', reasons: [], renderPermission: 'answer-preview' },
      claims: [claim],
      claimSupports: [claimSupport],
      evidenceAtoms,
      evidenceBasis: evidenceBasisFor(sourceFamilyStatuses, evidenceAtoms),
      evidenceCards: [evidenceCardForResult({
        result: firstPair.result,
        evidenceAtomId: firstPair.atom.id,
        claimSupportId: claimSupport.id,
      })],
      sourceFamilyStatuses,
    }
    return this.validatedPreview(preview)
  }

  async buildMatchesPage(input: BuildMatchesPageInput): Promise<EvidenceMatchesPageLite> {
    const { understanding, parsed } = understandAskQuery(input.query, input.lens)
    const effectiveAst = input.queryAst ?? parsed?.ast ?? null
    const expectedPreviewId = previewIdFor({
      query: input.query,
      lens: understanding.lens,
      queryAst: effectiveAst,
      sort: input.sort,
      manifest: this.reader.manifest,
    })
    if (input.previewId !== expectedPreviewId) {
      throw new SearchPackReaderError(
        'stale-epoch',
        'Ask preview id no longer matches this query, lens, sort, or pack',
        true,
      )
    }
    if (!effectiveAst) return { previewId: expectedPreviewId, evidenceAtoms: [], matchCards: [] }

    const window = await this.executor.execute({
      query: effectiveAst,
      cursor: input.cursor,
      limit: clampMatchesLimit(input.limit),
      sort: input.sort,
      token: input.token,
    })
    const evidencePairs = evidencePairsForResults(window.results, this.reader.manifest).slice(0, ASK_MATCHES_PAGE_LIMIT)
    return {
      previewId: expectedPreviewId,
      evidenceAtoms: evidencePairs.map((pair) => pair.atom),
      matchCards: evidencePairs.map((pair) => matchCardForResult(pair.result, pair.atom.id)),
      nextCursor: window.cursor ?? undefined,
    }
  }

  private validatedPreview(preview: AnswerPreview): AnswerPreview {
    assertAnswerPreviewContract(preview)
    return preview
  }
}

function evidencePairsForResults(results: SearchResultDto[], manifest: SearchPackReader['manifest']): EvidenceResultPair[] {
  const pairs: EvidenceResultPair[] = []
  for (const result of results) {
    const atom = evidenceAtomForResult(result, manifest)
    if (!atom) continue
    pairs.push({ atom, result })
  }
  return pairs
}

function claimForEvidence(input: {
  atom: EvidenceAtom
  result: SearchResultDto
  understanding: QueryUnderstandingLite
  tokenCount: number
}): AnswerClaim | null {
  if (!canRenderClaim(input)) return null
  const term = claimTermFor(input.result)
  if (!term) return null
  const ref = input.atom.refs[0] ?? input.result.sourceRef
  const supportId = `support:claim:${input.atom.id}`
  const authority = claimAuthorityForEvidence(input.atom)
  return {
    id: `claim:${input.atom.id}`,
    text: claimTextFor(authority.templateId, term, ref),
    templateId: authority.templateId,
    slots: { term, ref },
    attribution: authority.attribution,
    predicate: authority.predicate,
    supportId,
  }
}

function evidenceOnlyPreview(input: {
  query: string
  lens: SearchLensLite
  queryAst?: SearchQueryAstV1
  sort: SearchSort
  manifest: SearchPackManifestV1
  understanding: QueryUnderstandingLite
  searchPlan: SearchPlanLite
  evidenceAtoms: EvidenceAtom[]
  sourceFamilyStatuses: AnswerPreview['sourceFamilyStatuses']
  reasons: AnswerBlockerLite[]
}): AnswerPreview {
  return {
    id: previewIdFor({
      query: input.query,
      lens: input.lens,
      queryAst: input.queryAst,
      sort: input.sort,
      manifest: input.manifest,
    }),
    query: input.query,
    queryUnderstanding: input.understanding,
    searchPlan: input.searchPlan,
    mode: 'evidence-only',
    answerability: {
      status: 'evidence-only',
      reasons: input.reasons,
      renderPermission: 'no-answer-claims',
    },
    claims: [],
    claimSupports: [],
    evidenceAtoms: input.evidenceAtoms,
    evidenceBasis: evidenceBasisFor(input.sourceFamilyStatuses, input.evidenceAtoms),
    evidenceCards: [],
    recovery: recoveryForAskBlockers(input.query, input.reasons),
    sourceFamilyStatuses: input.sourceFamilyStatuses,
  }
}

function canRenderClaim(input: {
  atom: EvidenceAtom
  result: SearchResultDto
  understanding: QueryUnderstandingLite
  tokenCount: number
}): boolean {
  if (input.understanding.intent === 'open-reference' || input.understanding.intent === 'answer-question') return false
  if (input.tokenCount !== 1) return false
  if (!input.result.matchEvidence.matchedQueryToken) return false
  if (input.atom.evidenceType === 'translation') return input.understanding.lens === 'translation'
  if (input.atom.evidenceType === 'morphology') return input.understanding.lens === 'morphology'
  if (input.atom.evidenceType === 'quran-text') {
    return input.understanding.lens === 'quran-text'
      || input.understanding.lens === 'phrase'
  }
  return false
}

function claimAuthorityForEvidence(atom: EvidenceAtom): {
  templateId: ClaimTemplateIdLite
  attribution: ClaimAttributionLite
  predicate: ClaimPredicateLite
} {
  if (atom.evidenceType === 'translation') {
    return { templateId: 'translation-renders', attribution: 'translation-renders', predicate: 'renders' }
  }
  if (atom.evidenceType === 'morphology') {
    return { templateId: 'morphology-analyzes', attribution: 'morphology-analyzes', predicate: 'analyzes' }
  }
  return { templateId: 'quran-mentions', attribution: 'quran-mentions', predicate: 'mentions' }
}

function claimTextFor(templateId: ClaimTemplateIdLite, term: string, ref: string): string {
  if (templateId === 'translation-renders') return `Translation evidence renders "${term}" at ${ref}.`
  if (templateId === 'morphology-analyzes') return `Morphology evidence analyzes "${term}" at ${ref}.`
  return `Quran text evidence mentions "${term}" at ${ref}.`
}

function claimTermFor(result: SearchResultDto): string | null {
  return result.matchEvidence.matchedQueryToken ?? null
}

function evidenceBasisFor(
  sourceFamilyStatuses: AnswerPreview['sourceFamilyStatuses'],
  evidenceAtoms: EvidenceAtom[],
): EvidenceBasisLite {
  const used = new Set<SourceKindV1>(evidenceAtoms.map((atom) => atom.sourceKind))
  return {
    quranText: evidenceUseFor('quran-text', sourceFamilyStatuses, used),
    translation: evidenceUseFor('translation', sourceFamilyStatuses, used),
    morphology: evidenceUseFor('morphology', sourceFamilyStatuses, used),
    note: evidenceAtoms.length > 0
      ? 'Answer claims use the listed typed evidence only.'
      : 'No typed evidence atom was available for a v1 prose claim.',
  }
}

function evidenceUseFor(
  sourceKind: 'quran-text' | 'translation' | 'morphology',
  sourceFamilyStatuses: AnswerPreview['sourceFamilyStatuses'],
  used: Set<SourceKindV1>,
): EvidenceBasisLite['quranText'] {
  if (used.has(sourceKind)) return 'used'
  const status = sourceFamilyStatuses.find((entry) => entry.sourceKind === sourceKind)
  return status?.availability === 'available' ? 'available-not-used' : 'not-available'
}

function skippedSearchPlan(plan: SearchPlanLite, skipReason: string): SearchPlanLite {
  return {
    ...plan,
    lanes: plan.lanes.map((lane) => ({
      ...lane,
      status: 'skipped',
      skipReason,
    })),
  }
}

function sourceKindsForLens(lens: SearchLensLite): Array<'quran-text' | 'translation' | 'morphology'> {
  if (lens === 'translation') return ['translation']
  if (lens === 'morphology') return ['morphology']
  if (lens === 'mixed') return ['quran-text', 'translation']
  return ['quran-text']
}

function clampMatchesLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 1
  return Math.min(ASK_MATCHES_PAGE_LIMIT, Math.max(1, Math.floor(limit)))
}

function previewIdFor(input: {
  query: string
  lens: SearchLensLite
  queryAst?: SearchQueryAstV1 | null
  sort: SearchSort
  manifest: SearchPackManifestV1
}): string {
  const queryHash = input.queryAst ? stableQueryHash(input.queryAst) : stableQueryHash({
    astVersion: 1,
    mode: 'all',
    rawText: input.query,
    normalizedText: input.query.trim().toLowerCase(),
    tokens: [input.query.trim().toLowerCase()].filter(Boolean),
    filters: {},
  })
  return `ask-preview:${input.manifest.packId}:${input.manifest.packVersion}:${input.manifest.contentHash}:${input.lens}:${input.sort}:${queryHash}`
}
