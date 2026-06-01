# Ask Search V1 Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the citation-first Ask/Search v1 hot path from `docs/superpowers/specs/ask-search-v1-runtime.md` on top of the existing deterministic Search route.

**Architecture:** Keep Reader First intact by extending the already lazy `#/search` surface instead of adding work to Reader routes. Add a typed `AnswerPreview` contract and validator in `shared/search/**`, derive preview evidence from existing Search worker result windows, render Answer / Evidence Basis / Best Evidence first, and load All Matches plus Method & Sources only after explicit user action.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Web Worker module, Dexie, Tailwind v4 semantic tokens, Vitest, Playwright.

---

## Spec Scope

This plan implements the v1 hot path from:

- `docs/superpowers/specs/2026-06-01-citation-first-ask-search-design.md`
- `docs/superpowers/specs/ask-search-v1-runtime.md`

This plan does not ship the lazy Trust Platform or roadmap extensions from:

- `docs/superpowers/specs/ask-search-trust-platform.md`
- `docs/superpowers/specs/ask-search-extension-roadmap.md`

Those specs define gated follow-on work. This plan only adds the v1 runtime seams needed to keep audit/replay/source-pack provenance and tafsir/asbab/hadith/theme/cross-reference extensions out of first answer paint.

The runtime spec explicitly names mandatory trust tests, so this plan includes automated tests only for those release-blocking requirements. Keep them focused on durable contracts, visible behavior, worker envelopes, and browser-only cold-start outcomes.

## File Structure

- Create `shared/search/answer-preview.ts`: v1 runtime types, authority matrix, `AnswerPreview` mode derivation, and contract validator.
- Modify `shared/search/index.ts`: export the new v1 runtime contract.
- Modify `shared/search/worker-protocol.ts`: add Ask preview and lazy matches envelopes to the existing Search worker protocol without removing current lexical Search envelopes.
- Create `src/search/ask/query-understanding.ts`: deterministic `QueryUnderstandingLite` derivation from raw text, selected lens, existing parser output, and parser failures.
- Create `src/search/ask/boundaries.ts`: fixed safety and scope boundary detection plus no-answer recovery copy.
- Create `src/search/ask/evidence.ts`: adapters from existing `SearchResultDto` rows into typed `EvidenceAtom`, `EvidenceCardLite`, and `MatchCardLite`.
- Create `src/search/ask/answer-preview-builder.ts`: deterministic v1 pipeline that executes bounded Search, enforces answerability, builds preview claims/support/evidence, and clamps lazy pages.
- Modify `src/search-worker/session.ts`: handle Ask preview and Ask matches requests through the new builder.
- Modify `src/search/client.ts`: expose `askPreview()` and `getAskMatchesPage()` methods and keep stale responses ignored by active request ids.
- Modify `src/components/search/useSearchRouteState.ts`: store `AnswerPreview`, lazy match state, and active Ask request identity.
- Create `src/components/search/SearchAnswerPreview.tsx`: renders answer/no-answer copy, compact Evidence Basis, Best Evidence cards, and Show all matches affordance.
- Modify `src/components/search/SearchWorkspace.tsx`: make the v1 preview the default workspace content while retaining existing Explore/Sources as explicit secondary surfaces.
- Modify `src/components/search/search.stories.tsx`: add answerable, evidence-only, no-answer, lazy matches, and mapping-warning stories.
- Modify `src/design-system/index.css`: add token-aligned classes for preview, evidence basis, citation chips, and lazy matches.
- Modify `src/design-system/registry/component-registry.json`: register the new SearchPage states and behavior coverage.
- Modify `vite.config.js`: explicitly exclude `/search-packs/**` from Workbox precache globs.
- Modify `docs/context/surfaces/search.md`: current-state behavior, invariants, inventory, and tests after `pnpm run docs`.
- Modify `docs/context/architecture.md`: note that Ask preview is part of the lazy Search route and Reader cold launch remains clean.
- Test in `tests/unit/shared/search-contracts.test.ts`: shared contract validator and authority matrix.
- Test in `tests/unit/react-search/search-worker.test.ts`: Ask worker envelopes, stale response behavior, page clamp, and source failure degradation.
- Test in `tests/unit/react-search/search-route.test.tsx`: visible preview rendering, citation action gating, no-answer empty claims, and lazy All Matches trigger.
- Test in `tests/e2e/search/react-search.spec.ts`: Ask/Search happy path from query to Reader open.
- Test in `tests/e2e/search/react-search-offline.spec.ts`: corrupt/missing Search pack family degrades without unsupported claims.
- Create `tests/e2e/search/react-search-cold-start.spec.ts`: Reader cold route network, worker, modulepreload, and IndexedDB cold-start guard.

### Task 1: Shared AnswerPreview Contract

**Files:**
- Create: `shared/search/answer-preview.ts`
- Modify: `shared/search/index.ts`
- Test: `tests/unit/shared/search-contracts.test.ts`

- [ ] **Step 1: Add the v1 runtime contract file**

Create `shared/search/answer-preview.ts` with this contract and validator:

```ts
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

export const V1_CLAIM_AUTHORITY = {
  'quran-mentions:mentions': ['quran-text'],
  'quran-states:states': ['quran-text'],
  'translation-renders:renders': ['translation'],
  'morphology-analyzes:analyzes': ['morphology'],
} as const satisfies Record<`${ClaimAttributionLite}:${ClaimPredicateLite}`, readonly SourceKindV1[]>

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
    const authorityKey = `${claim.attribution}:${claim.predicate}` as keyof typeof V1_CLAIM_AUTHORITY
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
```

- [ ] **Step 2: Export the runtime contract**

Add this line to `shared/search/index.ts`:

```ts
export * from './answer-preview'
```

- [ ] **Step 3: Add shared contract tests**

Extend `tests/unit/shared/search-contracts.test.ts` with these cases:

```ts
import {
  assertAnswerPreviewContract,
  type AnswerPreview,
} from '../../../shared/search'

function makeAnswerPreview(overrides: Partial<AnswerPreview> = {}): AnswerPreview {
  const preview: AnswerPreview = {
    id: 'preview-1',
    query: 'Allah',
    queryUnderstanding: {
      originalQuery: 'Allah',
      normalizedQuery: 'allah',
      intent: 'answer-question',
      lens: 'translation',
      confidence: 'high',
      alternatives: [],
      normalizationWarnings: [],
    },
    searchPlan: {
      primaryLens: 'translation',
      lanes: [{ id: 'translation', sourceKinds: ['translation'], queryForm: 'allah', status: 'executed' }],
      excludedSources: [],
    },
    mode: 'answer',
    answerability: { status: 'answerable', reasons: [], renderPermission: 'answer-preview' },
    claims: [{
      id: 'claim-1',
      text: 'Translation evidence renders "Allah" at 2:255.',
      templateId: 'translation-renders',
      slots: { term: 'Allah', ref: '2:255' },
      attribution: 'translation-renders',
      predicate: 'renders',
      supportId: 'support-1',
    }],
    claimSupports: [{ id: 'support-1', claimId: 'claim-1', supportIds: ['evidence-1'], verdict: 'supported' }],
    evidenceAtoms: [{
      id: 'evidence-1',
      evidenceType: 'translation',
      sourceKind: 'translation',
      sourceId: 'test-source',
      sourceVersion: '1.0.0',
      translationId: 'test-translation',
      refs: ['2:255'],
      displayTarget: { type: 'verse-ref', refs: ['2:255'] },
    }],
    evidenceBasis: {
      quranText: 'available-not-used',
      translation: 'used',
      morphology: 'available-not-used',
      note: 'Answer claims use the listed typed evidence only.',
    },
    evidenceCards: [{
      id: 'card-1',
      refLabel: '2:255',
      evidenceAtomIds: ['evidence-1'],
      claimSupportIds: ['support-1'],
      title: '2:255',
      snippet: 'Allah - there is no deity except Him',
      snippetSource: 'translation',
      matchReason: 'The query token occurs in indexed translation evidence.',
      readerAction: { type: 'open-in-reader', ref: '2:255' },
    }],
    sourceFamilyStatuses: [
      { sourceKind: 'quran-text', availability: 'available', canSupportClaims: true },
      { sourceKind: 'translation', availability: 'available', canSupportClaims: true },
      { sourceKind: 'morphology', availability: 'available', canSupportClaims: true },
    ],
    ...overrides,
  }
  return preview
}

it('validates v1 AnswerPreview support and source authority', () => {
  expect(() => assertAnswerPreviewContract(makeAnswerPreview())).not.toThrow()
  expect(() => assertAnswerPreviewContract(makeAnswerPreview({
    claims: [{
      ...makeAnswerPreview().claims[0],
      attribution: 'morphology-analyzes',
      predicate: 'analyzes',
      templateId: 'morphology-analyzes',
    }],
  }))).toThrow('cannot use translation evidence')
})

it('requires no-answer render permissions to carry no claims', () => {
  expect(() => assertAnswerPreviewContract(makeAnswerPreview({
    mode: 'no-answer',
    answerability: {
      status: 'not-answerable',
      reasons: ['absence-claim-unproven'],
      renderPermission: 'no-answer-claims',
    },
  }))).toThrow('empty claims')
  expect(() => assertAnswerPreviewContract(makeAnswerPreview({
    mode: 'no-answer',
    answerability: {
      status: 'not-answerable',
      reasons: ['absence-claim-unproven'],
      renderPermission: 'no-answer-claims',
    },
    claims: [],
    claimSupports: [],
    evidenceCards: [],
  }))).not.toThrow()
})
```

- [ ] **Step 4: Run the shared contract tests**

Run:

```bash
pnpm run test:node -- tests/unit/shared/search-contracts.test.ts
```

Expected: the shared Search contracts suite passes.

### Task 2: Deterministic Query Understanding And Boundaries

**Files:**
- Create: `src/search/ask/query-understanding.ts`
- Create: `src/search/ask/boundaries.ts`
- Test: `tests/unit/react-search/ask-preview.test.ts`

- [ ] **Step 1: Add query understanding**

Create `src/search/ask/query-understanding.ts`:

```ts
import type { QueryUnderstandingLite, SearchLensLite } from '../../../shared/search'
import { parseSearchQuery, SearchQueryParseError } from '../query-parser'
import { parseSearchReference } from '../reference-parser'
import type { ParsedSearchQuery } from '../schema'

export type AskQueryUnderstanding = {
  understanding: QueryUnderstandingLite
  parsed: ParsedSearchQuery | null
  parseError: SearchQueryParseError | null
}

export function understandAskQuery(query: string, lens?: SearchLensLite): AskQueryUnderstanding {
  const originalQuery = query
  const trimmed = query.trim()
  const reference = parseSearchReference(trimmed)
  const selectedLens = lens ?? lensForRawQuery(trimmed, Boolean(reference))
  try {
    const parsed = parseSearchQuery(trimmed, { mode: modeForLens(selectedLens) })
    return {
      parsed,
      parseError: null,
      understanding: {
        originalQuery,
        normalizedQuery: parsed.ast.normalizedText,
        intent: reference ? 'open-reference' : intentForQuery(trimmed, selectedLens),
        lens: selectedLens,
        confidence: confidenceFor(trimmed, selectedLens, parsed.phraseTokens.length),
        selectedCandidateId: reference ? `ref:${reference.ref}` : undefined,
        alternatives: alternativesFor(selectedLens),
        normalizationWarnings: [],
      },
    }
  } catch (error) {
    return {
      parsed: null,
      parseError: error instanceof SearchQueryParseError ? error : new SearchQueryParseError('Search query is unsupported'),
      understanding: {
        originalQuery,
        normalizedQuery: trimmed,
        intent: 'unknown',
        lens: selectedLens,
        confidence: 'low',
        alternatives: alternativesFor(selectedLens),
        normalizationWarnings: [error instanceof Error ? error.message : 'Search query is unsupported'],
      },
    }
  }
}

function lensForRawQuery(query: string, isReference: boolean): SearchLensLite {
  if (isReference) return 'reference'
  if (/["'“‘].+["'”’]/.test(query)) return 'phrase'
  if (/root|lemma|morpholog|same\s+root/i.test(query)) return 'morphology'
  if (/[\u0600-\u06ff]/.test(query)) return 'quran-text'
  if (query.includes('?')) return 'translation'
  return 'mixed'
}

function modeForLens(lens: SearchLensLite) {
  if (lens === 'reference') return 'all' as const
  if (lens === 'quran-text') return 'arabic-text' as const
  if (lens === 'translation') return 'translation' as const
  if (lens === 'phrase') return 'phrase' as const
  if (lens === 'morphology') return 'same-root' as const
  return 'all' as const
}

function intentForQuery(query: string, lens: SearchLensLite): QueryUnderstandingLite['intent'] {
  if (lens === 'morphology') return 'trace-language'
  if (lens === 'quran-text' || lens === 'phrase') return 'find-occurrences'
  if (query.includes('?') || /what|where|which|who|how/i.test(query)) return 'answer-question'
  return 'find-occurrences'
}

function confidenceFor(query: string, lens: SearchLensLite, phraseTokenCount: number): QueryUnderstandingLite['confidence'] {
  if (query.length < 2) return 'low'
  if (lens === 'phrase' && phraseTokenCount < 2) return 'low'
  if (lens === 'mixed') return 'medium'
  return 'high'
}

function alternativesFor(selectedLens: SearchLensLite): QueryUnderstandingLite['alternatives'] {
  return (['reference', 'quran-text', 'translation', 'phrase', 'morphology'] as const)
    .filter((lens) => lens !== selectedLens)
    .slice(0, 3)
    .map((lens) => ({
      id: `lens:${lens}`,
      label: lens,
      lens,
      reason: `Try ${lens} when this query should be interpreted through that source lane.`,
    }))
}
```

- [ ] **Step 2: Add fixed boundary handling**

Create `src/search/ask/boundaries.ts`:

```ts
import type {
  AnswerBlockerLite,
  NoAnswerRecoveryLite,
  QueryUnderstandingLite,
} from '../../../shared/search'

type BoundaryRule = {
  blocker: AnswerBlockerLite
  pattern: RegExp
}

const BOUNDARY_RULES: BoundaryRule[] = [
  { blocker: 'absence-claim-unproven', pattern: /\b(does not mention|never mentions|nowhere says|not mentioned|absent from)\b/i },
  { blocker: 'legal-boundary', pattern: /\b(legal advice|lawsuit|court|contract|immigration|criminal)\b/i },
  { blocker: 'medical-boundary', pattern: /\b(medical advice|diagnosis|treatment|medicine|symptom|doctor)\b/i },
  { blocker: 'fiqh-boundary', pattern: /\b(fatwa|halal for me|haram for me|ruling for me|personal fiqh)\b/i },
  { blocker: 'personal-crisis-boundary', pattern: /\b(suicide|self-harm|kill myself|immediate danger|hurt myself)\b/i },
  { blocker: 'personal-pastoral-boundary', pattern: /\b(what should i do spiritually|personal spiritual advice|counsel me|my crisis)\b/i },
  { blocker: 'broad-theological-boundary', pattern: /\b(islam says|the qur'?an teaches|what does islam think|all muslims believe)\b/i },
  { blocker: 'inflammatory-religious-attack-boundary', pattern: /\b(prove.*evil|attack.*religion|why.*inferior|mock.*islam)\b/i },
  { blocker: 'requires-deferred-source', pattern: /\b(tafsir|asbab|hadith|theme|cross-reference|cross reference)\b/i },
]

export function blockersForAskQuery(query: string, understanding: QueryUnderstandingLite): AnswerBlockerLite[] {
  const blockers = new Set<AnswerBlockerLite>()
  if (!query.trim()) blockers.add('ambiguous-query')
  if (understanding.confidence === 'low') blockers.add('ambiguous-query')
  for (const rule of BOUNDARY_RULES) {
    if (rule.pattern.test(query)) blockers.add(rule.blocker)
  }
  if (blockers.has('requires-deferred-source') && /\btafsir\b/i.test(query)) blockers.add('requires-tafsir')
  return [...blockers]
}

export function recoveryForAskBlockers(query: string, blockers: AnswerBlockerLite[]): NoAnswerRecoveryLite {
  const requiredDeferredSources = blockers.includes('requires-deferred-source')
    ? deferredSourcesForQuery(query)
    : undefined
  return {
    message: messageForBlockers(blockers),
    suggestedQueries: [
      { label: 'Search exact wording', query: query.replace(/\?+$/, '').trim(), lens: 'quran-text' },
      { label: 'Search translation evidence', query: query.replace(/\?+$/, '').trim(), lens: 'translation' },
      { label: 'Open a reference', query: '2:255', lens: 'reference' },
    ],
    actions: blockers.includes('insufficient-evidence')
      ? ['refine-query', 'show-related-evidence']
      : ['refine-query', 'open-reader'],
    requiredDeferredSources,
  }
}

function messageForBlockers(blockers: AnswerBlockerLite[]): string {
  if (blockers.includes('absence-claim-unproven')) return 'This v1 search can show related evidence, but it cannot answer absence claims as prose.'
  if (blockers.includes('requires-tafsir')) return 'This v1 search does not include tafsir evidence. Search the available text and translation evidence instead.'
  if (blockers.some((blocker) => blocker.endsWith('-boundary'))) return 'This query needs a safer evidence-only response in v1.'
  if (blockers.includes('ambiguous-query')) return 'This query needs a clearer reference, wording, or source lane.'
  return 'The available v1 sources are not enough to answer this query as prose.'
}

function deferredSourcesForQuery(query: string): NoAnswerRecoveryLite['requiredDeferredSources'] {
  const sources: NonNullable<NoAnswerRecoveryLite['requiredDeferredSources']> = []
  if (/\btafsir\b/i.test(query)) sources.push('tafsir')
  if (/\basbab\b/i.test(query)) sources.push('asbab')
  if (/\bhadith\b/i.test(query)) sources.push('hadith')
  if (/\btheme\b/i.test(query)) sources.push('theme')
  if (/\bcross[-\s]?reference\b/i.test(query)) sources.push('cross-reference')
  return sources.length > 0 ? sources : ['tafsir']
}
```

- [ ] **Step 3: Add focused tests for query and boundary behavior**

Create `tests/unit/react-search/ask-preview.test.ts` with this first describe block:

```ts
import { describe, expect, it } from 'vitest'

import { blockersForAskQuery } from '../../../src/search/ask/boundaries'
import { understandAskQuery } from '../../../src/search/ask/query-understanding'

describe('Ask/Search query understanding', () => {
  it('detects references, Arabic text, translation questions, and morphology lenses', () => {
    expect(understandAskQuery('2:255').understanding).toMatchObject({ intent: 'open-reference', lens: 'reference', confidence: 'high' })
    expect(understandAskQuery('الله').understanding).toMatchObject({ intent: 'find-occurrences', lens: 'quran-text', confidence: 'high' })
    expect(understandAskQuery('What mentions mercy?').understanding).toMatchObject({ intent: 'answer-question', lens: 'translation' })
    expect(understandAskQuery('same root رحمن').understanding).toMatchObject({ intent: 'trace-language', lens: 'morphology' })
  })

  it('blocks absence, deferred-source, personal, and broad theological prose', () => {
    const absence = understandAskQuery('Where does the Quran never mention sleep?')
    expect(blockersForAskQuery(absence.understanding.originalQuery, absence.understanding)).toContain('absence-claim-unproven')

    const tafsir = understandAskQuery('What does tafsir say about 2:255?')
    expect(blockersForAskQuery(tafsir.understanding.originalQuery, tafsir.understanding)).toEqual(
      expect.arrayContaining(['requires-tafsir', 'requires-deferred-source']),
    )

    const fiqh = understandAskQuery('Is this halal for me personally?')
    expect(blockersForAskQuery(fiqh.understanding.originalQuery, fiqh.understanding)).toContain('fiqh-boundary')

    const broad = understandAskQuery('What does Islam say about all non-Muslims?')
    expect(blockersForAskQuery(broad.understanding.originalQuery, broad.understanding)).toContain('broad-theological-boundary')
  })
})
```

- [ ] **Step 4: Run the focused React unit test**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/ask-preview.test.ts
```

Expected: the new query understanding tests pass.

### Task 3: Evidence Atom And Card Adapters

**Files:**
- Create: `src/search/ask/evidence.ts`
- Test: `tests/unit/react-search/ask-preview.test.ts`

- [ ] **Step 1: Add Search result to evidence adapters**

Append this file as `src/search/ask/evidence.ts`:

```ts
import type {
  EvidenceAtom,
  EvidenceCardLite,
  MatchCardLite,
  SearchPlanLite,
  SourceFamilyStatusLite,
} from '../../../shared/search'
import type { SearchPackManifestV1, SearchResultDto } from '../../../shared/search'

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

export function evidenceAtomForResult(result: SearchResultDto, manifest: SearchPackManifestV1): EvidenceAtom {
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
    return {
      ...base,
      evidenceType: 'morphology',
      sourceKind: 'morphology',
      displayTarget: { type: 'token', tokenRefs: [`${result.sourceRef}:${result.matchEvidence.wordPosition ?? result.morphology?.wordPosition ?? 0}`] },
      rowId: result.matchEvidence.morphology?.rowId ?? result.resultId,
      sourceToken: result.matchEvidence.morphology?.sourceToken ?? result.morphology?.sourceToken ?? result.snippet,
      normalizedSourceToken: result.matchEvidence.matchedQueryToken ?? result.matchEvidence.normalizedTokens?.[0] ?? result.snippet,
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
  if (!result.canOpenInRead) return { type: 'unavailable', reason: 'No validated Reader target is available for this Search source result.' }
  const ref = result.readerRefs.length === 1 ? result.readerRefs[0] : result.sourceRef
  const mappingWarning = result.canHighlightWordsInRead
    ? undefined
    : 'Word-level Reader highlighting is unavailable for this evidence.'
  return { type: 'open-in-reader', ref, mappingWarning }
}
```

- [ ] **Step 2: Add adapter tests**

Append to `tests/unit/react-search/ask-preview.test.ts`:

```ts
import type { SearchPackManifestV1, SearchResultDto } from '../../../shared/search'
import { evidenceAtomForResult, evidenceCardForResult, matchCardForResult } from '../../../src/search/ask/evidence'

const askManifest: SearchPackManifestV1 = {
  packId: 'qa-search-core-hafs-v1',
  packVersion: '1.0.0',
  packAbiVersion: '1.0',
  minAppVersion: '0.0.0',
  minWorkerVersion: '1.0.0',
  contentHash: 'abcdef1234567890abcdef1234567890',
  graphCorpusId: 'test-hafs',
  sourceRiwayah: 'hafs',
  features: ['core', 'arabic-text', 'translation', 'morphology'],
  requires: [],
  compatibleWith: ['test'],
  licenseIds: ['test-license'],
  sourceIds: ['tanzil-hafs', 'bridges-translation', 'qac-morphology'],
  normalizerVersion: 1,
  queryAstVersion: 1,
  checksumAlgorithm: 'sha-256',
  totalBytes: 1,
  estimatedMemoryBytes: 1,
  byteBudget: { maxShardBytes: 64_000, maxDecodedShardBytes: 64_000, maxResidentWorkerBytes: 128_000 },
  shards: [],
  notices: [],
  buildInputDigests: {},
  builtAt: '2026-06-01T00:00:00.000Z',
}

function askResult(overrides: Partial<SearchResultDto> = {}): SearchResultDto {
  return {
    resultId: 'r-2-255',
    sourceRef: '2:255',
    readerRefs: ['2:255'],
    mappingState: 'corresponding-ayah-in-reader',
    canOpenInRead: true,
    canHighlightWordsInRead: false,
    matchLanes: ['translation'],
    matchEvidence: {
      lane: 'translation',
      matchedQueryToken: 'Allah',
      matchedSourceToken: 'allah',
      translationContextExcerpt: 'Allah - there is no deity except Him',
      whyMatched: 'The query token occurs in indexed translation evidence.',
    },
    snippet: 'Allah - there is no deity except Him',
    rankKey: 'translation:2:255',
    sourceText: 'الله لا اله الا هو',
    ...overrides,
  }
}

describe('Ask/Search evidence adapters', () => {
  it('projects translation results into typed evidence and cards', () => {
    const atom = evidenceAtomForResult(askResult(), askManifest)
    expect(atom).toMatchObject({ evidenceType: 'translation', sourceKind: 'translation', refs: ['2:255'] })
    const card = evidenceCardForResult({ result: askResult(), evidenceAtomId: atom.id, claimSupportId: 'support-1' })
    expect(card).toMatchObject({ snippetSource: 'translation', readerAction: { type: 'open-in-reader', ref: '2:255' } })
  })

  it('does not imply Reader word highlighting for morphology matches', () => {
    const result = askResult({
      matchLanes: ['same-root'],
      matchEvidence: {
        lane: 'same-root',
        matchedQueryToken: 'الله',
        matchedSourceToken: 'ٱللَّهِ',
        wordPosition: 2,
        morphology: { sourceToken: 'ٱللَّهِ', root: 'اله', lemma: 'ٱللَّه', rowId: '1:2' },
        whyMatched: 'The same QAC morphology root occurs in this Hafs source ayah.',
      },
      snippet: 'ٱللَّهِ',
    })
    const atom = evidenceAtomForResult(result, askManifest)
    expect(atom).toMatchObject({ evidenceType: 'morphology', sourceKind: 'morphology' })
    expect(matchCardForResult(result, atom.id).readerAction).toMatchObject({
      type: 'open-in-reader',
      mappingWarning: 'Word-level Reader highlighting is unavailable for this evidence.',
    })
  })
})
```

- [ ] **Step 3: Run the focused React unit test**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/ask-preview.test.ts
```

Expected: query, boundary, and evidence adapter tests pass.

### Task 4: AnswerPreview Builder

**Files:**
- Create: `src/search/ask/answer-preview-builder.ts`
- Test: `tests/unit/react-search/ask-preview.test.ts`

- [ ] **Step 1: Add the preview builder**

Create `src/search/ask/answer-preview-builder.ts`:

```ts
import type {
  AnswerBlockerLite,
  AnswerClaim,
  AnswerPreview,
  ClaimSupport,
  EvidenceMatchesPageLite,
  SearchLensLite,
} from '../../../shared/search'
import { assertAnswerPreviewContract } from '../../../shared/search'
import type { SearchPackManifestV1, SearchResultCursor, SearchSort } from '../../../shared/search'
import type { SearchCancellationToken } from '../../search-worker/cancellation'
import { SearchQueryExecutor } from '../../search-worker/query-executor'
import type { SearchPackReader } from '../pack-reader'
import { blockersForAskQuery, recoveryForAskBlockers } from './boundaries'
import {
  evidenceAtomForResult,
  evidenceCardForResult,
  matchCardForResult,
  searchPlanForPreview,
  sourceFamilyStatusesFromManifest,
} from './evidence'
import { understandAskQuery } from './query-understanding'

export const ASK_PREVIEW_LIMIT = 5
export const ASK_PREVIEW_EVIDENCE_ATOM_LIMIT = 20
export const ASK_MATCHES_PAGE_LIMIT = 10

export class AskSearchPreviewBuilder {
  constructor(private readonly reader: SearchPackReader) {}

  async buildPreview(input: {
    query: string
    lens?: SearchLensLite
    sort: SearchSort
    token: SearchCancellationToken
  }): Promise<AnswerPreview> {
    const manifest = this.reader.manifest
    const understood = understandAskQuery(input.query, input.lens)
    const boundaryBlockers = blockersForAskQuery(input.query, understood.understanding)
    if (!understood.parsed) {
      return noAnswerPreview({
        blockers: [...new Set<AnswerBlockerLite>(['ambiguous-query', ...boundaryBlockers])],
        manifest,
        query: input.query,
        recoveryQuery: input.query,
        understanding: understood.understanding,
      })
    }
    if (boundaryBlockers.length > 0) {
      return noAnswerPreview({
        blockers: boundaryBlockers,
        manifest,
        query: input.query,
        recoveryQuery: input.query,
        understanding: understood.understanding,
      })
    }

    const executor = new SearchQueryExecutor(this.reader)
    const window = await executor.execute({
      query: understood.parsed.ast,
      limit: ASK_PREVIEW_LIMIT,
      sort: input.sort,
      token: input.token,
    })
    const results = window.results.slice(0, ASK_PREVIEW_LIMIT)
    if (results.length === 0) {
      return noAnswerPreview({
        blockers: ['insufficient-evidence'],
        manifest,
        query: input.query,
        recoveryQuery: input.query,
        understanding: understood.understanding,
      })
    }

    const evidenceAtoms = results
      .map((result) => evidenceAtomForResult(result, manifest))
      .slice(0, ASK_PREVIEW_EVIDENCE_ATOM_LIMIT)
    const claim = claimForEvidence(input.query, evidenceAtoms[0]?.id, results[0])
    const claimSupports: ClaimSupport[] = claim ? [{
      id: 'support:primary',
      claimId: claim.id,
      supportIds: [evidenceAtoms[0].id],
      verdict: 'supported',
    }] : []
    const claims = claim ? [claim] : []
    const preview: AnswerPreview = {
      id: `ask-preview:${stablePreviewIdentity(input.query, manifest.packId, manifest.packVersion)}`,
      query: input.query,
      queryUnderstanding: understood.understanding,
      searchPlan: searchPlanForPreview({
        lens: understood.understanding.lens,
        queryForm: understood.parsed.ast.normalizedText,
        sourceKinds: sourceKindsForPreview(results),
      }),
      mode: claim ? 'answer' : 'evidence-only',
      answerability: claim
        ? { status: 'answerable', reasons: [], renderPermission: 'answer-preview' }
        : { status: 'evidence-only', reasons: ['insufficient-evidence'], renderPermission: 'no-answer-claims' },
      claims,
      claimSupports,
      evidenceAtoms,
      evidenceBasis: {
        quranText: evidenceAtoms.some((atom) => atom.evidenceType === 'quran-text') ? 'used' : 'available-not-used',
        translation: evidenceAtoms.some((atom) => atom.evidenceType === 'translation') ? 'used' : 'available-not-used',
        morphology: evidenceAtoms.some((atom) => atom.evidenceType === 'morphology') ? 'used' : 'available-not-used',
        note: 'Preview claims and cards are derived from typed evidence in this response.',
      },
      evidenceCards: claimSupports.length > 0
        ? results.slice(0, claimSupports.length).map((result, index) => evidenceCardForResult({
          result,
          evidenceAtomId: evidenceAtoms[index].id,
          claimSupportId: claimSupports[index].id,
        }))
        : [],
      recovery: undefined,
      sourceFamilyStatuses: sourceFamilyStatusesFromManifest(manifest),
    }
    assertAnswerPreviewContract(preview)
    return preview
  }

  async buildMatchesPage(input: {
    previewId: string
    query: string
    lens?: SearchLensLite
    cursor?: SearchResultCursor
    limit: number
    sort: SearchSort
    token: SearchCancellationToken
  }): Promise<EvidenceMatchesPageLite> {
    const understood = understandAskQuery(input.query, input.lens)
    if (!understood.parsed) return { previewId: input.previewId, evidenceAtoms: [], matchCards: [] }
    const executor = new SearchQueryExecutor(this.reader)
    const window = await executor.execute({
      query: understood.parsed.ast,
      cursor: input.cursor,
      limit: Math.min(Math.max(input.limit, 1), ASK_MATCHES_PAGE_LIMIT),
      sort: input.sort,
      token: input.token,
    })
    const evidenceAtoms = window.results.slice(0, 30).map((result) => evidenceAtomForResult(result, this.reader.manifest))
    const matchCards = window.results.slice(0, ASK_MATCHES_PAGE_LIMIT).map((result, index) => matchCardForResult(result, evidenceAtoms[index].id))
    return {
      previewId: input.previewId,
      evidenceAtoms,
      matchCards,
      nextCursor: window.cursor ? JSON.stringify(window.cursor) : undefined,
    }
  }
}

function noAnswerPreview(input: {
  blockers: AnswerBlockerLite[]
  manifest: SearchPackManifestV1
  query: string
  recoveryQuery: string
  understanding: AnswerPreview['queryUnderstanding']
}): AnswerPreview {
  const preview: AnswerPreview = {
    id: `ask-preview:${stablePreviewIdentity(input.query, input.manifest.packId, input.manifest.packVersion)}`,
    query: input.query,
    queryUnderstanding: input.understanding,
    searchPlan: searchPlanForPreview({
      lens: input.understanding.lens,
      queryForm: input.understanding.normalizedQuery,
      sourceKinds: ['quran-text', 'translation'],
      failed: input.blockers.includes('source-unavailable'),
    }),
    mode: input.blockers.includes('ambiguous-query') ? 'no-answer' : 'evidence-only',
    answerability: {
      status: input.blockers.includes('ambiguous-query') ? 'needs-clarification' : 'evidence-only',
      reasons: input.blockers,
      renderPermission: 'no-answer-claims',
    },
    claims: [],
    claimSupports: [],
    evidenceAtoms: [],
    evidenceBasis: {
      quranText: 'available-not-used',
      translation: 'available-not-used',
      morphology: input.manifest.features.includes('morphology') ? 'available-not-used' : 'not-available',
      note: 'No answer claim is rendered because this query is outside the v1 answer contract.',
    },
    evidenceCards: [],
    recovery: recoveryForAskBlockers(input.recoveryQuery, input.blockers),
    sourceFamilyStatuses: sourceFamilyStatusesFromManifest(input.manifest),
  }
  assertAnswerPreviewContract(preview)
  return preview
}

function claimForEvidence(query: string, evidenceAtomId: string | undefined, result = undefined as import('../../../shared/search').SearchResultDto | undefined): AnswerClaim | null {
  if (!evidenceAtomId || !result) return null
  const lane = result.matchEvidence.lane
  if (lane === 'translation' || lane === 'context') {
    return {
      id: 'claim:primary',
      text: `Translation evidence renders "${query}" at ${result.sourceRef}.`,
      templateId: 'translation-renders',
      slots: { query, ref: result.sourceRef },
      attribution: 'translation-renders',
      predicate: 'renders',
      supportId: 'support:primary',
    }
  }
  if (lane === 'same-written-form' || lane === 'same-root' || lane === 'lemma' || lane === 'surah-context') {
    return {
      id: 'claim:primary',
      text: `Morphology evidence analyzes "${query}" at ${result.sourceRef}.`,
      templateId: 'morphology-analyzes',
      slots: { query, ref: result.sourceRef },
      attribution: 'morphology-analyzes',
      predicate: 'analyzes',
      supportId: 'support:primary',
    }
  }
  return {
    id: 'claim:primary',
    text: `The Quran text evidence mentions "${query}" at ${result.sourceRef}.`,
    templateId: 'quran-mentions',
    slots: { query, ref: result.sourceRef },
    attribution: 'quran-mentions',
    predicate: 'mentions',
    supportId: 'support:primary',
  }
}

function sourceKindsForPreview(results: import('../../../shared/search').SearchResultDto[]): Array<'quran-text' | 'translation' | 'morphology'> {
  const kinds = new Set<'quran-text' | 'translation' | 'morphology'>()
  for (const result of results) {
    const lane = result.matchEvidence.lane
    if (lane === 'translation' || lane === 'context') kinds.add('translation')
    else if (lane === 'same-written-form' || lane === 'same-root' || lane === 'lemma' || lane === 'surah-context') kinds.add('morphology')
    else kinds.add('quran-text')
  }
  return [...kinds]
}

function stablePreviewIdentity(query: string, packId: string, packVersion: string): string {
  let hash = 0x811c9dc5
  const input = `${packId}:${packVersion}:${query}`
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
```

- [ ] **Step 2: Add preview builder tests**

Append to `tests/unit/react-search/ask-preview.test.ts`:

```ts
import { AskSearchPreviewBuilder } from '../../../src/search/ask/answer-preview-builder'
import { SearchCancellationToken } from '../../../src/search-worker/cancellation'
import { SearchPackReader } from '../../../src/search/pack-reader'
import { createFixturePack } from './search-test-utils'

describe('Ask/Search preview builder', () => {
  it('builds an answer preview with supported claims from fixture Search evidence', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const builder = new AskSearchPreviewBuilder(new SearchPackReader(manifest, { cacheStorage }))
    const preview = await builder.buildPreview({
      query: 'Allah',
      lens: 'translation',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-test'),
    })

    expect(preview.mode).toBe('answer')
    expect(preview.claims[0]).toMatchObject({ attribution: 'translation-renders', predicate: 'renders' })
    expect(preview.claimSupports[0]?.supportIds[0]).toBe(preview.evidenceAtoms[0]?.id)
    expect(preview.evidenceCards.length).toBeLessThanOrEqual(5)
  })

  it('blocks absence claims with empty claims and recovery copy', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const builder = new AskSearchPreviewBuilder(new SearchPackReader(manifest, { cacheStorage }))
    const preview = await builder.buildPreview({
      query: 'Where is sleep never mentioned?',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-test'),
    })

    expect(preview.mode).toBe('evidence-only')
    expect(preview.claims).toEqual([])
    expect(preview.answerability.reasons).toContain('absence-claim-unproven')
    expect(preview.recovery?.message).toContain('cannot answer absence claims')
  })

  it('clamps lazy matches pages to ten cards', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const builder = new AskSearchPreviewBuilder(new SearchPackReader(manifest, { cacheStorage }))
    const page = await builder.buildMatchesPage({
      previewId: 'preview-1',
      query: 'Allah',
      lens: 'translation',
      limit: 999,
      sort: 'relevance',
      token: new SearchCancellationToken('ask-test'),
    })

    expect(page.matchCards.length).toBeLessThanOrEqual(10)
    expect(page.evidenceAtoms.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run the focused React unit test**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/ask-preview.test.ts
```

Expected: the preview builder tests pass.

### Task 5: Worker And Client Envelopes

**Files:**
- Modify: `shared/search/worker-protocol.ts`
- Modify: `src/search-worker/session.ts`
- Modify: `src/search/client.ts`
- Test: `tests/unit/react-search/search-worker.test.ts`

- [ ] **Step 1: Extend the combined worker protocol**

In `shared/search/worker-protocol.ts`, import the Ask types:

```ts
import type { AnswerPreview, EvidenceMatchesPageLite, SearchLensLite } from './answer-preview'
```

Add these two request members to `SearchWorkerRequest`:

```ts
  | { type: 'askPreview'; requestId: string; query: string; lens?: SearchLensLite; sort?: SearchSort }
  | { type: 'askMatchesPage'; requestId: string; previewId: string; query: string; lens?: SearchLensLite; cursor?: SearchResultCursor; limit: number; sort?: SearchSort }
```

Add these payload members to the `SearchWorkerResponse` ok payload union:

```ts
        | { kind: 'ask-preview'; answerPreview: AnswerPreview }
        | { kind: 'ask-matches-page'; page: EvidenceMatchesPageLite }
```

- [ ] **Step 2: Handle Ask requests in the worker session**

In `src/search-worker/session.ts`, import the builder:

```ts
import { AskSearchPreviewBuilder } from '../search/ask/answer-preview-builder'
```

Add this field to `SearchWorkerSession`:

```ts
  private askBuilder: AskSearchPreviewBuilder | null = null
```

In `init()`, after `this.executor = new SearchQueryExecutor(this.reader)`, add:

```ts
    this.askBuilder = new AskSearchPreviewBuilder(this.reader)
```

In `dispose()`, add:

```ts
    this.askBuilder = null
```

Add this private getter:

```ts
  private requireAskBuilder(): AskSearchPreviewBuilder {
    if (!this.askBuilder) throw new SearchPackReaderError('unavailable-pack', 'Search worker is not initialized', true)
    return this.askBuilder
  }
```

In `handle()`, before the existing `query` branch, add:

```ts
      if (request.type === 'askPreview') {
        await this.assertActivationUnchanged()
        const answerPreview = await this.requireAskBuilder().buildPreview({
          query: request.query,
          lens: request.lens,
          sort: request.sort ?? 'relevance',
          token,
        })
        token.throwIfCancelled()
        await this.assertActivationUnchanged()
        return this.ok(request.requestId, { kind: 'ask-preview', answerPreview })
      }
      if (request.type === 'askMatchesPage') {
        await this.assertActivationUnchanged()
        const page = await this.requireAskBuilder().buildMatchesPage({
          previewId: request.previewId,
          query: request.query,
          lens: request.lens,
          cursor: request.cursor,
          limit: request.limit,
          sort: request.sort ?? 'relevance',
          token,
        })
        token.throwIfCancelled()
        await this.assertActivationUnchanged()
        return this.ok(request.requestId, { kind: 'ask-matches-page', page })
      }
```

- [ ] **Step 3: Expose client methods**

In `src/search/client.ts`, import Ask types through the existing shared import:

```ts
  AnswerPreview,
  EvidenceMatchesPageLite,
  SearchLensLite,
```

Add these methods to `SearchClient`:

```ts
  async askPreview({
    query,
    lens,
    sort = 'relevance',
  }: {
    query: string
    lens?: SearchLensLite
    sort?: SearchSort
  }): Promise<AnswerPreview> {
    const response = await this.request({
      type: 'askPreview',
      requestId: this.nextRequestId(),
      query,
      lens,
      sort,
    })
    if (response.type !== 'ok' || response.payload.kind !== 'ask-preview') {
      throw new Error('Search worker returned a non-Ask preview response')
    }
    return response.payload.answerPreview
  }

  async getAskMatchesPage({
    previewId,
    query,
    lens,
    cursor,
    limit = 10,
    sort = 'relevance',
  }: {
    previewId: string
    query: string
    lens?: SearchLensLite
    cursor?: SearchResultCursor
    limit?: number
    sort?: SearchSort
  }): Promise<EvidenceMatchesPageLite> {
    const response = await this.request({
      type: 'askMatchesPage',
      requestId: this.nextRequestId(),
      previewId,
      query,
      lens,
      cursor,
      limit,
      sort,
    })
    if (response.type !== 'ok' || response.payload.kind !== 'ask-matches-page') {
      throw new Error('Search worker returned a non-Ask matches response')
    }
    return response.payload.page
  }
```

- [ ] **Step 4: Add worker envelope tests**

Extend `tests/unit/react-search/search-worker.test.ts`:

```ts
  it('serves Ask preview and lazy matches envelopes from the Search worker', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })

    const previewResponse = await session.handle({
      type: 'askPreview',
      requestId: 'ask-1',
      query: 'Allah',
      lens: 'translation',
      sort: 'relevance',
    })
    expect(previewResponse).toMatchObject({ type: 'ok', payload: { kind: 'ask-preview' } })
    if (previewResponse.type !== 'ok' || previewResponse.payload.kind !== 'ask-preview') throw new Error('expected Ask preview')
    expect(previewResponse.payload.answerPreview.claims.length).toBeGreaterThan(0)

    const pageResponse = await session.handle({
      type: 'askMatchesPage',
      requestId: 'ask-2',
      previewId: previewResponse.payload.answerPreview.id,
      query: 'Allah',
      lens: 'translation',
      limit: 99,
      sort: 'relevance',
    })
    expect(pageResponse).toMatchObject({ type: 'ok', payload: { kind: 'ask-matches-page' } })
    if (pageResponse.type !== 'ok' || pageResponse.payload.kind !== 'ask-matches-page') throw new Error('expected Ask matches page')
    expect(pageResponse.payload.page.matchCards.length).toBeLessThanOrEqual(10)
  })
```

- [ ] **Step 5: Run worker tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/search-worker.test.ts tests/unit/react-search/ask-preview.test.ts
```

Expected: Ask preview builder and worker envelope tests pass.

### Task 6: Route State Integration

**Files:**
- Modify: `src/components/search/useSearchRouteState.ts`
- Test: `tests/unit/react-search/search-route.test.tsx`

- [ ] **Step 1: Add Ask state to route state**

In `src/components/search/useSearchRouteState.ts`, import:

```ts
import type { AnswerPreview, EvidenceMatchesPageLite, MatchCardLite, SearchLensLite } from '../../../shared/search'
```

Add these fields to `SearchRouteState`:

```ts
  answerPreview: AnswerPreview | null
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  canLoadAllMatches: boolean
  loadingAllMatches: boolean
  openAllMatches: () => void
  loadMoreAllMatches: () => void
```

Add state near existing `results` state:

```ts
  const [answerPreview, setAnswerPreview] = useState<AnswerPreview | null>(null)
  const [allMatches, setAllMatches] = useState<MatchCardLite[]>([])
  const [allMatchesOpen, setAllMatchesOpen] = useState(false)
  const [allMatchesCursor, setAllMatchesCursor] = useState<SearchResultCursor | null>(null)
  const [loadingAllMatches, setLoadingAllMatches] = useState(false)
```

In `resetEvidenceState`, add:

```ts
    setAnswerPreview(null)
    setAllMatches([])
    setAllMatchesOpen(false)
    setAllMatchesCursor(null)
    setLoadingAllMatches(false)
```

In `submitSearch`, replace the initial `client.query({ query: parsed.ast, sort })` request with:

```ts
    const askLens = lensForMode(effectiveMode)
    void client.askPreview({ query: trimmed, lens: askLens, sort }).then((preview) => {
      if (sequence !== requestSequence.current) return
      setAnswerPreview(preview)
      setBrief(null)
      setResults([])
      selectedResultRef.current = null
      setSelectedResult(null)
      setResultCursor(null)
      setAllMatches([])
      setAllMatchesCursor(null)
      setAllMatchesOpen(false)
      setExploreGraph({ error: null, loading: false, resultId: null, sections: [] })
      setEmptyResultMessage(preview.recovery?.message ?? emptyResultMessageForMode(effectiveMode))
      const status = statusForAnswerPreview(preview)
      setResultCountMessage(status)
      setSearchStatus(status)
      writeSearchHashState({
        mode: effectiveMode,
        query: trimmed,
        tab: nextActiveTab,
      })
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      const message = caught instanceof Error ? caught.message : 'Search failed'
      setError(message)
      setSearchStatus(message)
      setResultCursor(null)
    })
```

Keep the existing `client.query` path only for `loadExploreGraph`, because Explore remains an explicit secondary surface.

Add these callbacks before the returned object:

```ts
  const openAllMatches = useCallback(() => {
    const preview = answerPreview
    const activeQuery = activeQueryRef.current
    if (!preview || !activeQuery || loadingAllMatches) return
    setAllMatchesOpen(true)
    setLoadingAllMatches(true)
    const sequence = requestSequence.current
    void client.getAskMatchesPage({
      previewId: preview.id,
      query: activeQuery.query,
      lens: lensForMode(activeQuery.mode),
      limit: 10,
      sort,
    }).then((page) => {
      if (sequence !== requestSequence.current) return
      setAllMatches(page.matchCards)
      setAllMatchesCursor(page.nextCursor ? JSON.parse(page.nextCursor) as SearchResultCursor : null)
      setSearchStatus(`${page.matchCards.length} matches shown`)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      setError(caught instanceof Error ? caught.message : 'Search failed')
    }).finally(() => {
      if (sequence !== requestSequence.current) return
      setLoadingAllMatches(false)
    })
  }, [answerPreview, client, loadingAllMatches, sort])

  const loadMoreAllMatches = useCallback(() => {
    const preview = answerPreview
    const activeQuery = activeQueryRef.current
    if (!preview || !activeQuery || !allMatchesCursor || loadingAllMatches) return
    setLoadingAllMatches(true)
    const sequence = requestSequence.current
    void client.getAskMatchesPage({
      previewId: preview.id,
      query: activeQuery.query,
      lens: lensForMode(activeQuery.mode),
      cursor: allMatchesCursor,
      limit: 10,
      sort,
    }).then((page) => {
      if (sequence !== requestSequence.current) return
      setAllMatches((current) => [...current, ...page.matchCards])
      setAllMatchesCursor(page.nextCursor ? JSON.parse(page.nextCursor) as SearchResultCursor : null)
    }).catch((caught) => {
      if (sequence !== requestSequence.current) return
      setError(caught instanceof Error ? caught.message : 'Search failed')
    }).finally(() => {
      if (sequence !== requestSequence.current) return
      setLoadingAllMatches(false)
    })
  }, [allMatchesCursor, answerPreview, client, loadingAllMatches, sort])
```

Add helpers near the bottom:

```ts
function lensForMode(mode: SearchQueryMode): SearchLensLite {
  if (mode === 'arabic-text' || mode === 'exact-word-form') return 'quran-text'
  if (mode === 'translation' || mode === 'context') return 'translation'
  if (mode === 'phrase') return 'phrase'
  if (mode === 'same-written-form' || mode === 'same-root' || mode === 'lemma' || mode === 'surah-context') return 'morphology'
  return 'mixed'
}

function statusForAnswerPreview(preview: AnswerPreview): string {
  if (preview.mode === 'answer') return `${preview.evidenceCards.length} best evidence card${preview.evidenceCards.length === 1 ? '' : 's'}`
  if (preview.mode === 'partial-answer') return `${preview.evidenceCards.length} evidence card${preview.evidenceCards.length === 1 ? '' : 's'} with limits`
  if (preview.mode === 'evidence-only') return preview.recovery?.message ?? 'Evidence-only response'
  return preview.recovery?.message ?? 'No answer available'
}
```

Return the new fields:

```ts
    answerPreview,
    allMatches,
    allMatchesOpen,
    canLoadAllMatches: Boolean(allMatchesCursor) && !loadingAllMatches,
    loadingAllMatches,
    openAllMatches,
    loadMoreAllMatches,
```

- [ ] **Step 2: Update route-state test fixtures**

In `tests/unit/react-search/search-route.test.tsx`, update `routeState()` to include:

```ts
    answerPreview: null,
    allMatches: [],
    allMatchesOpen: false,
    canLoadAllMatches: false,
    loadingAllMatches: false,
    openAllMatches: vi.fn(),
    loadMoreAllMatches: vi.fn(),
```

- [ ] **Step 3: Run route tests after the type change**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/search-route.test.tsx
```

Expected: existing Search route UI tests compile and pass with the additional route-state fields.

### Task 7: V1 Preview UI

**Files:**
- Create: `src/components/search/SearchAnswerPreview.tsx`
- Modify: `src/components/search/SearchWorkspace.tsx`
- Modify: `src/components/search/search.stories.tsx`
- Modify: `src/design-system/index.css`
- Modify: `src/design-system/registry/component-registry.json`
- Test: `tests/unit/react-search/search-route.test.tsx`

- [ ] **Step 1: Add the preview renderer**

Create `src/components/search/SearchAnswerPreview.tsx`:

```tsx
import type { AnswerPreview, MatchCardLite } from '../../../shared/search'
import { Badge, Button } from '../ui'

type SearchAnswerPreviewProps = {
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  canLoadAllMatches: boolean
  loadingAllMatches: boolean
  onLoadMoreAllMatches: () => void
  onOpenAllMatches: () => void
  onOpenInRead: (ref: string) => void
  preview: AnswerPreview | null
}

export function SearchAnswerPreview({
  allMatches,
  allMatchesOpen,
  canLoadAllMatches,
  loadingAllMatches,
  onLoadMoreAllMatches,
  onOpenAllMatches,
  onOpenInRead,
  preview,
}: SearchAnswerPreviewProps) {
  if (!preview) return <p className="qar-search-results-empty">Enter a word, phrase, or ayah reference.</p>

  return (
    <section aria-labelledby="search-answer-preview-title" className="qar-search-answer-preview">
      <div className="qar-search-answer-head">
        <p className="qar-search-overview-eyebrow">Answer preview</p>
        <h2 className="qar-search-overview-title" id="search-answer-preview-title" dir="auto">
          <bdi>{preview.query}</bdi>
        </h2>
        <Badge>{labelForMode(preview.mode)}</Badge>
      </div>

      {preview.claims.length > 0 ? (
        <div className="qar-search-answer-claims">
          {preview.claims.map((claim) => (
            <p key={claim.id}>
              <bdi>{claim.text}</bdi>
              <span className="qar-search-citation-chip">{preview.claimSupports.find((support) => support.id === claim.supportId)?.supportIds.length ?? 0} source</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="qar-search-answer-limits">{preview.recovery?.message ?? 'The available evidence is shown without answer prose.'}</p>
      )}

      <section aria-label="Evidence basis" className="qar-search-evidence-basis">
        <dl className="qar-search-evidence-basis-grid">
          <EvidenceBasisItem label="Quran text" value={preview.evidenceBasis.quranText} />
          <EvidenceBasisItem label="Translation" value={preview.evidenceBasis.translation} />
          <EvidenceBasisItem label="Morphology" value={preview.evidenceBasis.morphology} />
        </dl>
        <p>{preview.evidenceBasis.note}</p>
      </section>

      {preview.evidenceCards.length > 0 ? (
        <section aria-label="Best evidence" className="qar-search-best-evidence">
          <h3>Best Evidence</h3>
          {preview.evidenceCards.map((card) => (
            <article aria-label={`Evidence ${card.refLabel}`} className="qar-search-result-row" key={card.id}>
              <div className="qar-search-result-row-head">
                <p className="qar-search-result-ref">{card.refLabel}</p>
                <Badge>{card.snippetSource}</Badge>
              </div>
              <p className="qar-search-result-snippet" dir="auto"><bdi>{card.snippet}</bdi></p>
              <p className="qar-search-result-why"><span>Matched:</span> <bdi>{card.matchReason}</bdi></p>
              {card.readerAction.type === 'open-in-reader' ? (
                <div className="qar-search-result-actions">
                  <Button onClick={() => onOpenInRead(card.readerAction.ref)} size="sm" variant="primary">Open in Reader</Button>
                  {card.readerAction.mappingWarning ? <span className="qar-search-mapping-warning">{card.readerAction.mappingWarning}</span> : null}
                </div>
              ) : (
                <p className="qar-search-answer-limits">{card.readerAction.reason}</p>
              )}
            </article>
          ))}
        </section>
      ) : null}

      <div className="qar-search-all-matches">
        {!allMatchesOpen ? (
          <Button disabled={loadingAllMatches} onClick={onOpenAllMatches} type="button" variant="secondary">
            {loadingAllMatches ? 'Loading matches' : 'Show all matches'}
          </Button>
        ) : (
          <section aria-label="All matches" className="qar-search-result-list">
            {allMatches.map((card) => (
              <article aria-label={`Match ${card.refLabel}`} className="qar-search-result-row" key={card.id}>
                <div className="qar-search-result-row-head">
                  <p className="qar-search-result-ref">{card.refLabel}</p>
                  <Badge>{card.snippetSource}</Badge>
                </div>
                <p className="qar-search-result-snippet" dir="auto"><bdi>{card.snippet}</bdi></p>
                <p className="qar-search-result-why"><span>Matched:</span> <bdi>{card.matchReason}</bdi></p>
                {card.readerAction.type === 'open-in-reader' ? (
                  <Button onClick={() => onOpenInRead(card.readerAction.ref)} size="sm" variant="secondary">Open in Reader</Button>
                ) : null}
              </article>
            ))}
            {canLoadAllMatches ? (
              <Button disabled={loadingAllMatches} onClick={onLoadMoreAllMatches} type="button" variant="secondary">
                {loadingAllMatches ? 'Loading more matches' : 'Load more matches'}
              </Button>
            ) : null}
          </section>
        )}
      </div>
    </section>
  )
}

function EvidenceBasisItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function labelForMode(mode: AnswerPreview['mode']): string {
  if (mode === 'answer') return 'Answer'
  if (mode === 'partial-answer') return 'Partial answer'
  if (mode === 'evidence-only') return 'Evidence only'
  return 'No answer'
}
```

- [ ] **Step 2: Wire preview into SearchWorkspace**

In `src/components/search/SearchWorkspace.tsx`, import:

```ts
import type { AnswerPreview, MatchCardLite } from '../../../shared/search'
import { SearchAnswerPreview } from './SearchAnswerPreview'
```

Add props:

```ts
  allMatches: MatchCardLite[]
  allMatchesOpen: boolean
  answerPreview: AnswerPreview | null
  canLoadAllMatches: boolean
  loadingAllMatches: boolean
  onLoadMoreAllMatches: () => void
  onOpenAllMatches: () => void
  onOpenPreviewInRead: (ref: string) => void
```

Change the Overview tab content to:

```tsx
              <SearchAnswerPreview
                allMatches={props.allMatches}
                allMatchesOpen={props.allMatchesOpen}
                canLoadAllMatches={props.canLoadAllMatches}
                loadingAllMatches={props.loadingAllMatches}
                onLoadMoreAllMatches={props.onLoadMoreAllMatches}
                onOpenAllMatches={props.onOpenAllMatches}
                onOpenInRead={props.onOpenPreviewInRead}
                preview={props.answerPreview}
              />
```

Keep the `Verses`, `Explore`, and `Sources` tabs available for explicit secondary inspection of existing Search output.

- [ ] **Step 3: Pass route-state props from SearchShell**

In `src/components/search/SearchShell.tsx`, add this helper:

```ts
  function openPreviewRefInRead(ref: string) {
    const [surah, ayah] = ref.split(':').map(Number)
    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return
    window.location.hash = REACT_ROUTES.surah(surah, ayah)
  }
```

Pass new props to `SearchWorkspace`:

```tsx
              allMatches={search.allMatches}
              allMatchesOpen={search.allMatchesOpen}
              answerPreview={search.answerPreview}
              canLoadAllMatches={search.canLoadAllMatches}
              loadingAllMatches={search.loadingAllMatches}
              onLoadMoreAllMatches={search.loadMoreAllMatches}
              onOpenAllMatches={search.openAllMatches}
              onOpenPreviewInRead={openPreviewRefInRead}
```

- [ ] **Step 4: Add CSS for preview layout**

Append near the existing Search CSS in `src/design-system/index.css`:

```css
  .qar-search-answer-preview,
  .qar-search-best-evidence,
  .qar-search-all-matches {
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  .qar-search-answer-preview {
    padding: 12px;
    border: 1px solid var(--qa-react-nav-row-border);
    border-radius: var(--qa-react-radius-surface);
    background: color-mix(in srgb, var(--qa-react-surface) 84%, var(--qa-react-canvas));
    box-shadow: var(--qa-react-nav-shadow-row);
  }

  .qar-search-answer-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: start;
  }

  .qar-search-answer-claims {
    display: grid;
    gap: 8px;
  }

  .qar-search-answer-claims p,
  .qar-search-answer-limits,
  .qar-search-evidence-basis p,
  .qar-search-best-evidence h3 {
    margin: 0;
  }

  .qar-search-answer-claims p {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    color: var(--qa-react-text);
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .qar-search-citation-chip {
    display: inline-flex;
    min-height: 24px;
    align-items: center;
    border: 1px solid var(--qa-react-border);
    border-radius: var(--qa-react-radius-control);
    padding-inline: 8px;
    color: var(--qa-react-text-muted);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .qar-search-answer-limits,
  .qar-search-mapping-warning {
    color: var(--qa-react-text-muted);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .qar-search-evidence-basis {
    display: grid;
    gap: 6px;
  }

  .qar-search-evidence-basis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 6px;
    margin: 0;
  }

  .qar-search-evidence-basis-grid div {
    min-width: 0;
    padding: 8px;
    border: 1px solid var(--qa-react-border);
    border-radius: var(--qa-react-radius-control);
    background: var(--qa-react-canvas);
  }

  .qar-search-evidence-basis-grid dt {
    color: var(--qa-react-text-muted);
    font-size: 0.7rem;
    font-weight: 650;
  }

  .qar-search-evidence-basis-grid dd {
    margin: 3px 0 0;
    color: var(--qa-react-text);
    font-family: var(--qa-react-font-mono);
    font-size: 0.82rem;
    font-weight: 700;
  }

  .qar-search-evidence-basis p {
    margin: 0;
  }
```

- [ ] **Step 5: Add stories and registry metadata**

In `src/components/search/search.stories.tsx`, add an `AnswerPreviewDefault` story that renders `SearchAnswerPreview` with one answerable preview and an `EvidenceOnlyBoundary` story with `claims: []`.

In `src/design-system/registry/component-registry.json`, add these states to the existing `search-page` story state list:

```json
"answer-preview-default",
"evidence-only-boundary",
"all-matches-open"
```

Add these behavior strings to the `tests/unit/react-search/search-route.test.tsx` registry entry:

```json
"AnswerPreview renders supported claims only",
"All Matches loads after explicit user action"
```

- [ ] **Step 6: Add route UI tests**

Extend `tests/unit/react-search/search-route.test.tsx` with:

```tsx
  it('renders AnswerPreview claims, evidence basis, and explicit All Matches action', async () => {
    const state = routeState({
      answerPreview: makeAnswerPreview(),
      query: 'Allah',
      searchStatus: '1 best evidence card',
    })
    mockUseSearchRouteState.mockReturnValue(state)

    render(<SearchShell />)

    expect(screen.getByRole('heading', { name: 'Allah' })).toBeInTheDocument()
    expect(screen.getByText(/Translation evidence renders/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Evidence basis' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show all matches' }))
    expect(state.openAllMatches).toHaveBeenCalled()
  })

  it('renders no-answer recovery without claim prose', () => {
    mockUseSearchRouteState.mockReturnValue(routeState({
      answerPreview: makeAnswerPreview({
        mode: 'evidence-only',
        answerability: {
          status: 'evidence-only',
          reasons: ['absence-claim-unproven'],
          renderPermission: 'no-answer-claims',
        },
        claims: [],
        claimSupports: [],
        evidenceCards: [],
        recovery: {
          message: 'This v1 search can show related evidence, but it cannot answer absence claims as prose.',
          suggestedQueries: [],
          actions: ['refine-query'],
        },
      }),
      query: 'Where is sleep never mentioned?',
    }))

    render(<SearchShell />)

    expect(screen.getByText(/cannot answer absence claims/i)).toBeInTheDocument()
    expect(screen.queryByText(/Translation evidence renders/i)).not.toBeInTheDocument()
  })
```

Use the `makeAnswerPreview()` helper from Task 1 in this test file as a local helper, not an imported test fixture.

- [ ] **Step 7: Run route and static checks**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/search-route.test.tsx tests/unit/react-search/ask-preview.test.ts
pnpm run check
```

Expected: route tests and static checks pass.

### Task 8: Reader Cold-Start And Service-Worker Guards

**Files:**
- Modify: `vite.config.js`
- Create: `tests/e2e/search/react-search-cold-start.spec.ts`
- Modify: `tests/e2e/search/react-search.spec.ts`
- Modify: `tests/e2e/search/react-search-offline.spec.ts`

- [ ] **Step 1: Exclude Search packs from Workbox precache**

In `vite.config.js`, change:

```js
          globIgnores: ['**/dataset/**'],
```

to:

```js
          globIgnores: ['**/dataset/**', '**/search-packs/**'],
```

- [ ] **Step 2: Add Reader cold-start e2e proof**

Create `tests/e2e/search/react-search-cold-start.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

import { seedTargetState, targetUrl } from '../fixtures/react-golden-routes'

test('Reader cold launch performs no Ask/Search work before explicit Search intent', async ({ page }) => {
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  const requests: string[] = []
  const workerUrls: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('worker', (worker) => workerUrls.push(worker.url()))

  await page.goto(targetUrl('react', '/#/s/1'))
  await expect(page.getByRole('main', { name: /reader/i })).toBeVisible()

  const indexedDbProof = await page.evaluate(async () => {
    const databases = indexedDB.databases ? await indexedDB.databases() : []
    return databases.map((db) => db.name).filter(Boolean)
  })

  expect(requests.some((url) => url.includes('/search-packs/'))).toBe(false)
  expect(requests.some((url) => /search.*worker|search\.worker/i.test(url))).toBe(false)
  expect(requests.some((url) => /modulepreload.+search/i.test(url))).toBe(false)
  expect(workerUrls.some((url) => /search\.worker/i.test(url))).toBe(false)
  expect(indexedDbProof).not.toContain('quran-atlas-search')
})
```

- [ ] **Step 3: Extend happy-path Ask/Search e2e**

In `tests/e2e/search/react-search.spec.ts`, after the first Translation search assertion, add:

```ts
  await expect(page.getByText(/Translation evidence renders/i)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Evidence basis' })).toBeVisible()
  await page.getByRole('button', { name: 'Show all matches' }).click()
  await expect(page.getByRole('region', { name: 'All matches' })).toBeVisible()
```

- [ ] **Step 4: Extend source-failure e2e**

In `tests/e2e/search/react-search-offline.spec.ts`, after deleting a graph shard and searching, assert:

```ts
    await expect(page.getByText(/unsupported answer/i)).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Evidence basis' })).toBeVisible()
```

- [ ] **Step 5: Run relevant e2e specs**

Run the dev-server-safe specs:

```bash
pnpm exec playwright test tests/e2e/search/react-search.spec.ts tests/e2e/search/react-search-cold-start.spec.ts --reporter=line
```

For offline service-worker behavior, first build a full artifact:

```bash
pnpm run build
PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_SKIP_BUILD=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --reporter=line
```

Expected: cold Reader launch shows no Search requests/workers, Search path renders preview before matches, and offline source failures do not render unsupported answer claims.

### Task 9: Docs And Verification

**Files:**
- Modify: `docs/context/surfaces/search.md`
- Modify: `docs/context/architecture.md`
- Regenerate: generated docs fences through `pnpm run docs`

- [ ] **Step 1: Update current-state docs**

Update `docs/context/surfaces/search.md` outside generated fences with these current-state points:

```md
Search includes the citation-first Ask/Search v1 preview loop on the lazy Search route. Submitted queries first return an `AnswerPreview` with answerability, typed evidence atoms, compact Evidence Basis, Best Evidence cards, and no generated source text. All Matches, Explore, Method & Sources-style source detail, and graph/morphology panels load only after explicit user action.

Answer claims render only when their `ClaimSupport` resolves to typed v1 evidence and passes the v1 claim authority matrix. No-answer and evidence-only responses carry empty claim arrays. Absence, legal, medical, personal fiqh, crisis, personal pastoral, broad theological, inflammatory, tafsir/asbab/hadith/theme/cross-reference, and unsupported-source queries use fixed recovery copy instead of answer prose.

Reader cold launch remains clean: no Search route chunk, Search worker, Search pack/index request, Search IndexedDB activity, or `/search-packs/**` precache entry occurs before explicit Search intent.
```

Update `docs/context/architecture.md` Search paragraph with:

```md
The lazy Search route owns the Ask/Search v1 preview loop. `AnswerPreview` is built in the Search worker from typed Search evidence and rendered by the Search surface; Reader routes do not import Ask/Search runtime modules, start Search workers, fetch `/search-packs/**`, or touch Search storage on cold launch.
```

- [ ] **Step 2: Regenerate generated context**

Run:

```bash
pnpm run docs
```

Expected: generated inventories include new Search files without manual edits inside auto-generated fences.

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm run test:react -- tests/unit/react-search/ask-preview.test.ts tests/unit/react-search/search-worker.test.ts tests/unit/react-search/search-route.test.tsx
pnpm run test:node -- tests/unit/shared/search-contracts.test.ts
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: all commands complete without warnings.

For release readiness after implementation, run:

```bash
pnpm run validate
```

Expected: the full release gate passes, including build, e2e, offline, visual, Storybook, and docs checks.

## Self-Review

Spec coverage:

- Reader cold-start constraints are covered by Task 8 and service-worker glob exclusion.
- `AnswerPreview`, typed evidence, claim supports, authority matrix, no-answer empty claims, and payload limits are covered by Tasks 1, 4, and 5.
- Query understanding, source-family status, answerability, recovery copy, absence claims, and safety boundaries are covered by Tasks 2 and 4.
- Compact Evidence Basis, Best Evidence, All Matches lazy loading, and Open in Reader are covered by Tasks 6, 7, and 8.
- Runtime source trust verification remains out of scope; the plan only allows existing load/parse/cache failure degradation.
- Trust Platform and Extension Roadmap specs are named as follow-on plan scopes and kept off the v1 hot path.

Placeholder scan:

- Tasks use concrete file paths, code blocks, commands, and expected outcomes.
- Code-creating steps include exact snippets instead of vague instructions.
- Verification commands and expected outcomes are named for each task.

Type consistency:

- Shared types are exported from `shared/search/index.ts` and imported consistently from `../../../shared/search`.
- Worker envelopes use `askPreview` and `askMatchesPage` names to coexist with the current lexical Search `query` envelope.
- UI state uses `AnswerPreview`, `MatchCardLite`, and `SearchLensLite` from the shared contract.
