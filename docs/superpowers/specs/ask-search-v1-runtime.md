# Ask/Search V1 Runtime

> Implementation-ready hot-path contract for the first Ask/Search loop.

## Normative Language

`MUST`, `MUST NOT`, `REQUIRED`, `SHOULD`, and `MAY` use RFC-style meanings.

V1 runtime compliance is defined only by this file. Platform and roadmap specs cannot add hot-path requirements unless this runtime spec is updated.

## Goal

Ask/Search v1 gives QuranAtlas a fast, citation-first study search that enhances the Reader without making the product feel heavy, slow, or audit-dashboard-like.

The v1 loop is:

```text
Ask
  -> QueryUnderstandingLite
  -> SearchPlanLite
  -> EvidenceAtom[]
  -> AnswerabilityDecision
  -> AnswerPreview
  -> compact Evidence Basis + Best Evidence + All Matches
  -> Open in Reader
```

## Non-Negotiable Trust Invariants

- V1 MUST NOT generate Qur'an Arabic, translation text, morphology rows, source excerpts, or source metadata.
- Any UI field that displays Qur'an Arabic, translation text, morphology rows, source excerpts, or source metadata MUST be copied from linked typed evidence. Deterministic templates MAY generate surrounding explanatory prose, but MUST NOT synthesize source text, source excerpts, morphology data, or source metadata.
- V1 MAY generate short answer prose and UI explanations only from approved deterministic templates.
- Every rendered answer claim MUST resolve to `ClaimSupport`.
- Every `ClaimSupport.supportIds[]` entry MUST resolve to an `EvidenceAtom` in the same `AnswerPreview`.
- Citation chips MUST NOT render unless they open typed evidence.
- Translation evidence MUST NOT support Arabic morphology, root, lemma, or token claims.
- Morphology claims MUST require Arabic morphology evidence.
- Hafs token-level evidence MUST NOT imply Qalun token-level alignment unless mapping evidence proves it.
- V1 MUST NOT render absence claims such as `The Qur'an does not mention...` as answer prose. Absence-shaped queries MUST return `evidence-only` or `no-answer` with recovery guidance.
- V1 MUST NOT issue legal, medical, fiqh/fatwa, personal-crisis, personal spiritual counselling, emotional crisis guidance, individualized pastoral advice, broad theological, or inflammatory religious attack advice.
- LLM/RAG runtime answering is not approved for v1.
- Source-pack trust validation and verification are build-time concerns only. Runtime MUST NOT perform browser-side trust verification, signature validation, revocation checks, quarantine, or source eligibility decisions based on runtime hashes.
- Runtime MAY compare cached bytes against manifest-declared checksums only to reject corrupt or incomplete cache entries after explicit Ask/Search intent. This check MUST NOT be described as source trust verification, revocation, quarantine, or claim eligibility proof.

## V1 Source Scope

V1 evidence types:

- `quran-text`
- `translation`
- `morphology`
- `reader-mapping`

Deferred evidence types:

- `tafsir`
- `asbab`
- `hadith`
- `theme`
- `cross-reference`
- `computed-cluster`

Deferred types MUST NOT appear in v1 `AnswerPreview` payloads.

Optional post-v1 source families are defined only in the extension roadmap and MUST NOT appear in v1 `AnswerPreview` payloads.

## Architecture

V1 uses a client-side modular monolith:

- React/Vite lazy-loaded Ask/Search route.
- Search/Evidence Web Worker started only after explicit Ask/Search intent.
- Same-origin built Search assets.
- Dedicated Search Cache Storage for immutable source-pack assets when packed assets are cached.
- IndexedDB/Dexie for Search activation metadata, lightweight receipts, saved query definitions, and runtime state only.
- Reader route remains clean.

Reader cold launch MUST include:

- no Ask/Search feature chunk request;
- no Ask/Search modulepreload;
- no Ask/Search worker construction;
- no Search pack or index request;
- no Search IndexedDB open, read, or write;
- no service-worker precache entry for Ask/Search chunks, worker chunks, graph/morphology feature chunks, or `/search-packs/**`, including manifests, indexes, and shards.

All v1 Search indexes and shards MUST be served under `/search-packs/**`. If future Search index assets move elsewhere, their concrete route globs MUST be added to the cold-launch precache exclusion and release-blocking tests before release.

## Lean Types

```ts
type SourceKindV1 =
  | "quran-text"
  | "translation"
  | "morphology"
  | "reader-mapping";

type QueryIntentLite =
  | "open-reference"
  | "find-occurrences"
  | "answer-question"
  | "trace-language"
  | "unknown";

type SearchLensLite =
  | "reference"
  | "quran-text"
  | "translation"
  | "phrase"
  | "morphology"
  | "mixed";

type QueryUnderstandingLite = {
  originalQuery: string;
  normalizedQuery: string;
  intent: QueryIntentLite;
  lens: SearchLensLite;
  confidence: "high" | "medium" | "low";
  selectedCandidateId?: string;
  alternatives: Array<{
    id: string;
    label: string;
    lens: SearchLensLite;
    reason: string;
  }>;
  normalizationWarnings: string[];
};

type SearchPlanLite = {
  primaryLens: SearchLensLite;
  lanes: Array<{
    id: string;
    sourceKinds: SourceKindV1[];
    queryForm: string;
    status: "executed" | "skipped" | "failed";
    skipReason?: string;
  }>;
  excludedSources: Array<{
    sourceKind: SourceKindV1;
    reason: "not-installed" | "not-indexed" | "unsupported-for-query" | "failed";
  }>;
};

type SourceFamilyStatusLite = {
  sourceKind: SourceKindV1;
  availability:
    | "available"
    | "not-installed"
    | "not-indexed"
    | "unsupported-for-query"
    | "failed";
  canSupportClaims: boolean;
  failureReason?: "missing" | "incompatible-schema" | "parse-failed" | "load-failed";
};
```

`QueryUnderstandingLite` can expose interpretation confidence and warnings, but `AnswerabilityDecision` is the only answer-prose authority. `SourceFamilyStatusLite` is a hot-path source-family availability summary, not a source-pack manifest or trust/provenance object. `canSupportClaims` MUST be false unless `availability === "available"`.

## Evidence

```ts
type TextRange = {
  ref: string;
  startOffset?: number;
  endOffset?: number;
};

type EvidenceDisplayTarget =
  | { type: "verse-ref"; refs: string[] }
  | { type: "quote-range"; range: TextRange }
  | { type: "token"; tokenRefs: string[] };

type BaseEvidenceAtom = {
  id: string;
  sourceKind: SourceKindV1;
  sourceId: string;
  sourceVersion: string;
  refs: string[];
  displayTarget: EvidenceDisplayTarget;
  quoteHash?: string;
};

type QuranTextEvidence = BaseEvidenceAtom & {
  evidenceType: "quran-text";
  sourceKind: "quran-text";
  displayTarget: Extract<EvidenceDisplayTarget, { type: "verse-ref" | "quote-range" }>;
};

type TranslationEvidence = BaseEvidenceAtom & {
  evidenceType: "translation";
  sourceKind: "translation";
  translationId: string;
  displayTarget: Extract<EvidenceDisplayTarget, { type: "verse-ref" | "quote-range" }>;
};

type MorphologyEvidence = BaseEvidenceAtom & {
  evidenceType: "morphology";
  sourceKind: "morphology";
  displayTarget: Extract<EvidenceDisplayTarget, { type: "token" }>;
  rowId: string;
  sourceToken: string;
  normalizedSourceToken: string;
  analysisScope: "token" | "segment";
  root?: string;
  lemma?: string;
};

type ReaderMappingEvidence = BaseEvidenceAtom & {
  evidenceType: "reader-mapping";
  sourceKind: "reader-mapping";
  fromRiwayah: "hafs" | "qalun" | string;
  toRiwayah: "hafs" | "qalun" | string;
  mappingStatus:
    | "same-riwayah"
    | "verse-level-only"
    | "token-level-mapped"
    | "token-level-different"
    | "unmapped";
};

type EvidenceAtom =
  | QuranTextEvidence
  | TranslationEvidence
  | MorphologyEvidence
  | ReaderMappingEvidence;
```

`AnswerPreview.evidenceAtoms` is the only canonical evidence store for the initial preview. Initial cards, chips, and answer claims MUST project from it. Lazy All Matches pages carry their own bounded `EvidenceAtom[]` and cards for that page.

`quote-range` offsets, when present, are zero-based Unicode code point offsets in the exact source string identified by `sourceId` and `sourceVersion`.

Any UI field that displays Qur'an Arabic, translation text, morphology rows, source excerpts, or source metadata MUST be copied from linked typed evidence. Deterministic templates MAY generate surrounding explanatory prose, but MUST NOT synthesize source text, source excerpts, morphology data, or source metadata.

## Claims And Answerability

```ts
type ClaimAttributionLite =
  | "quran-mentions"
  | "quran-states"
  | "translation-renders"
  | "morphology-analyzes";

type ClaimPredicateLite =
  | "mentions"
  | "states"
  | "renders"
  | "analyzes";

type ClaimSupport = {
  id: string;
  claimId: string;
  supportIds: [string, ...string[]];
  verdict: "supported" | "insufficient";
};

type ClaimTemplateIdLite =
  | "quran-mentions"
  | "quran-states"
  | "translation-renders"
  | "morphology-analyzes";

type AnswerClaim = {
  id: string;
  text: string;
  templateId: ClaimTemplateIdLite;
  slots: Record<string, string>;
  attribution: ClaimAttributionLite;
  predicate: ClaimPredicateLite;
  supportId: string;
};

type AnswerabilityDecision =
  | {
      status: "answerable";
      reasons: [];
      renderPermission: "answer-preview";
    }
  | {
      status: "partially-answerable";
      reasons: AnswerBlockerLite[];
      renderPermission: "answer-preview";
    }
  | {
      status: "evidence-only" | "needs-clarification" | "not-answerable";
      reasons: AnswerBlockerLite[];
      renderPermission: "no-answer-claims";
    };

type DeferredSourceRequirement =
  | "tafsir"
  | "asbab"
  | "hadith"
  | "theme"
  | "cross-reference";

type AnswerBlockerLite =
  | "insufficient-evidence"
  | "ambiguous-query"
  | "requires-tafsir"
  | "requires-deferred-source"
  | "source-unavailable"
  | "absence-claim-unproven"
  | "legal-boundary"
  | "medical-boundary"
  | "fiqh-boundary"
  | "personal-crisis-boundary"
  | "personal-pastoral-boundary"
  | "broad-theological-boundary"
  | "inflammatory-religious-attack-boundary"
  | "outside-current-scope";

const V1_CLAIM_AUTHORITY = {
  "quran-mentions:mentions": ["quran-text"],
  "quran-states:states": ["quran-text"],
  "translation-renders:renders": ["translation"],
  "morphology-analyzes:analyzes": ["morphology"],
} as const;
```

`AnswerClaim.text` MUST be rendered from `templateId` and `slots`; the serialized text is included only as the deterministic rendered projection. A rendered `AnswerClaim` is valid only when its `ClaimSupport` has `verdict: "supported"`, `supportIds` is non-empty, `ClaimSupport.claimId` matches the claim, and every referenced `EvidenceAtom.evidenceType` is allowed by `V1_CLAIM_AUTHORITY` for the claim's `${attribution}:${predicate}` key.

When `answerability.renderPermission` is `no-answer-claims`, `claims` MUST be empty.

When `answerability.reasons` includes `requires-deferred-source`, `recovery.requiredDeferredSources` MUST name the deferred source families required to answer the query.

`AnswerabilityDecision` is canonical. `AnswerPreview.mode` MUST derive from it:

| `AnswerabilityDecision.status` | `AnswerPreview.mode` |
| --- | --- |
| `answerable` | `answer` |
| `partially-answerable` | `partial-answer` |
| `evidence-only` | `evidence-only` |
| `needs-clarification` | `no-answer` |
| `not-answerable` | `no-answer` |

## Answer Preview

```ts
type EvidenceBasisLite = {
  quranText: "used" | "available-not-used" | "not-available";
  translation: "used" | "available-not-used" | "not-available";
  morphology: "used" | "available-not-used" | "not-available";
  note: string;
};

type EvidenceCardLite = {
  id: string;
  refLabel: string;
  evidenceAtomIds: [string, ...string[]];
  claimSupportIds: [string, ...string[]];
  title: string;
  snippet: string;
  snippetSource: "quran-text" | "translation" | "deterministic-template";
  matchReason: string;
  readerAction:
    | { type: "open-in-reader"; ref: string; mappingWarning?: string }
    | { type: "unavailable"; reason: string };
};

type MatchCardLite = {
  id: string;
  refLabel: string;
  evidenceAtomIds: [string, ...string[]];
  title: string;
  snippet: string;
  snippetSource: "quran-text" | "translation" | "deterministic-template";
  matchReason: string;
  readerAction:
    | { type: "open-in-reader"; ref: string; mappingWarning?: string }
    | { type: "unavailable"; reason: string };
};

type NoAnswerRecoveryLite = {
  message: string;
  suggestedQueries: Array<{
    label: string;
    query: string;
    lens?: SearchLensLite;
  }>;
  actions: Array<"refine-query" | "show-related-evidence" | "open-reader">;
  requiredDeferredSources?: DeferredSourceRequirement[];
};

type AnswerPreview = {
  id: string;
  query: string;
  queryUnderstanding: QueryUnderstandingLite;
  searchPlan: SearchPlanLite;
  mode: "answer" | "partial-answer" | "evidence-only" | "no-answer";
  answerability: AnswerabilityDecision;
  claims: AnswerClaim[];
  claimSupports: ClaimSupport[];
  evidenceAtoms: EvidenceAtom[];
  evidenceBasis: EvidenceBasisLite;
  evidenceCards: EvidenceCardLite[];
  recovery?: NoAnswerRecoveryLite;
  sourceFamilyStatuses: SourceFamilyStatusLite[];
};
```

Hot-path limits:

- `claims.length <= 3`
- `evidenceCards.length <= 5`
- `evidenceAtoms.length <= 20`
- no full audit object;
- no full retrieval snapshot;
- no full Method & Sources object;
- no tafsir/asbab/theme/cross-reference evidence.

## Citation Invariants

A citation chip MAY render only when:

1. It references an `AnswerClaim`.
2. The claim references a `ClaimSupport`.
3. The support has `verdict: "supported"`.
4. The support has at least one support ID and `claimId` matches the claim.
5. Every support ID resolves to an `EvidenceAtom`.
6. Every support evidence type is allowed by the v1 claim authority matrix.
7. The evidence card or Reader action can open the target.

If any condition fails, the claim MUST NOT render as answer prose.

`EvidenceCardLite` is for preview evidence tied to rendered claims. Its `claimSupportIds` MUST resolve to supported `claimSupports`. `MatchCardLite` is for paginated All Matches and MUST NOT imply claim support unless explicitly linked to a supported claim.

## UX Hierarchy

Default v1 page:

1. Answer or evidence-only explanation.
2. Compact Evidence Basis.
3. Best Evidence.
4. Show all matches affordance.

The first All Matches page MUST load only after the initial preview has rendered and the user explicitly opens the Show all matches affordance. Scroll-triggered loading MAY occur only after the user has expanded All Matches.

Lazy / secondary:

- Why this answer?
- Method & Sources.

Deferred:

- Full Audit.
- Study Paths.
- Reflection Prompts.
- Tafsir/asbab deepening.
- Theme paths.
- Cross-reference graph.

`Open in Reader` MUST be the primary evidence action. If Search evidence is Hafs and the active Reader is Qalun, the UI MUST show whether only verse-level mapping is available.

## Worker Protocol

The v1 worker protocol is small:

```ts
type AskSearchWorkerRequest =
  | { type: "init"; requestId: string }
  | { type: "query"; requestId: string; query: string; lens?: SearchLensLite }
  | { type: "get-matches-page"; requestId: string; previewId: string; cursor?: string; limit: number }
  | { type: "cancel"; requestId: string; targetRequestId: string }
  | { type: "dispose"; requestId: string };

type EvidenceMatchesPageLite = {
  previewId: string;
  evidenceAtoms: EvidenceAtom[];
  matchCards: MatchCardLite[];
  nextCursor?: string;
};

type AskSearchWorkerResponse =
  | { type: "result"; requestId: string; answerPreview: AnswerPreview }
  | { type: "matches-page"; requestId: string; page: EvidenceMatchesPageLite }
  | { type: "error"; requestId: string; recoverable: boolean; message: string };
```

`get-matches-page` is lazy and MUST NOT be required for first `AnswerPreview` paint.

`get-matches-page.limit` MUST be clamped by the worker to a maximum of 10. Requests above the maximum MUST NOT increase work performed.

The worker MUST NOT expose messages for runtime trust verification, revocation checks, quarantine, content-hash verification, or index rebuild as an integrity proof. Load-safety failures from unreadable, schema-incompatible, or byte-corrupt cached assets MUST degrade by disabling the affected source family.

Stale responses MUST be ignored when their `requestId` is not the active request.

## Complexity Budget

- Initial `AnswerPreview` payload target: under 50 KB JSON.
- Max 3 answer claims.
- Max 5 evidence cards.
- Max 20 `EvidenceAtom` records.
- Lazy `EvidenceMatchesPageLite.matchCards.length <= 10`.
- Lazy `EvidenceMatchesPageLite.evidenceAtoms.length <= 30`.
- Full audit generation is lazy.
- `RetrievalSnapshot` generation is lazy.
- Method & Sources is lazy.
- All Matches is paginated.
- No tafsir/asbab/theme/cross-reference pack is loaded unless explicitly requested in a future extension.
- Ask/Search worker starts only after explicit Ask/Search intent.
- Reader cold route MUST NOT include Ask/Search feature chunk.

## Performance Budget

- Reader cold launch: 0 KB Ask/Search executable target, 2 KB gzip hard cap for unavoidable route glue.
- Reader cold launch: no Ask/Search worker construction.
- Reader cold launch: no Search pack or index fetch.
- First worker startup after explicit intent: p95 under 300 ms on target mobile profile.
- Initial AnswerPreview for installed core packs: p95 under 600 ms after worker is ready.
- Main-thread long tasks above 50 ms during first Ask/Search interaction: zero target.

The implementation MUST name the target mobile profile used for these budgets before release. A throttled browser profile may be used only when its CPU/network settings are recorded with the result.

## Safety Boundaries

V1 MUST render `evidence-only` or `no-answer` when:

- the query asks for personal legal advice;
- the query asks for medical advice, diagnosis, or treatment guidance;
- the query asks for personal fiqh/fatwa application;
- the query suggests personal crisis, self-harm, or immediate danger;
- the query asks for personal spiritual counselling, emotional crisis guidance, or individualized pastoral advice;
- the query asks for inflammatory religious attack content;
- the query asks for broad theological synthesis beyond the v1 evidence contract;
- the query asks for tafsir/asbab/hadith when those sources are unavailable in v1;
- the query is absence-shaped, such as `does not mention`, `never mentions`, or `nowhere says`.

V1 MUST render evidence-only or no-answer when the query asks for personal spiritual counselling, emotional crisis guidance, or individualized pastoral advice.

This boundary MUST NOT block ordinary study queries that ask what the available v1 sources mention or render.

Boundary copy MUST be fixed-template and MUST NOT introduce new Qur'anic/source claims.

## Mandatory Trust Tests

V1 is not ready unless these pass:

1. No answer claim renders without `ClaimSupport`.
2. Every support ID resolves to an `EvidenceAtom`.
3. Supported `ClaimSupport.supportIds` is non-empty and its `claimId` matches the claim.
4. The v1 claim authority matrix rejects mismatched evidence, including translation evidence for Arabic morphology claims.
5. Morphology claims require morphology evidence.
6. Citation chips open exact evidence targets.
7. Hafs token evidence cannot create Qalun token highlighting without mapping evidence.
8. Low-confidence query understanding blocks answer prose through `AnswerabilityDecision`.
9. `AnswerPreview.mode` is derived exactly from `AnswerabilityDecision.status`.
10. Absence wording is blocked as v1 answer prose.
11. Legal/medical/fiqh/crisis/personal spiritual counselling/emotional crisis/individualized pastoral advice/broad-theological/inflammatory-attack boundaries force evidence-only or no-answer.
12. `answer-preview-contract-validator`: the initial preview passes the runtime contract.
13. `source-text-is-copied-from-linked-evidence`: source text fields are copied from linked typed evidence and no generated source text appears in `AnswerPreview`.
14. `claim-authority-matrix-rejects-translation-for-morphology`: translation evidence cannot support morphology claims.
15. `no-answer-render-permission-has-empty-claims`: no-answer permissions carry an empty `claims` array.
16. Payload limits are enforced for initial preview and lazy matches pages.
17. `reader-cold-start-has-no-search-work`: Reader cold launch has no Ask/Search chunk request, worker, pack/index request, or Search IndexedDB read.
18. `service-worker-precache-excludes-search`: the production service-worker precache manifest excludes Ask/Search chunks, worker chunks, graph/morphology feature chunks, and `/search-packs/**`, including manifests, indexes, and shards.
19. `no-search-modulepreload-on-reader-route`: Reader route has no Ask/Search modulepreload.
20. `no-search-worker-before-explicit-intent`: no Ask/Search worker starts before explicit intent.
21. `no-search-indexeddb-read-before-explicit-intent`: no Search IndexedDB read happens before explicit intent.
22. `runtime-source-failure-disables-claims`: runtime pack load/parse/corruption failure disables the affected source family without unsupported answers.
23. `worker-stale-response-ignored`: worker stale responses do not replace newer answers.
24. `matches-page-limit-clamped`: `get-matches-page.limit` requests above 10 do not increase worker work.
25. `source-family-status-can-support-claims-requires-availability`: `SourceFamilyStatusLite.canSupportClaims` is false unless `availability === "available"`.
26. `deferred-source-blocker-names-required-sources`: `requires-deferred-source` responses name `requiredDeferredSources`.
27. `evidence-card-and-match-card-contract`: preview `EvidenceCardLite` claim support does not leak into paginated `MatchCardLite`.
28. `no-runtime-trust-verification-path`: no runtime trust verification/quarantine/rebuild pathway is required or exposed.
29. Lazy All Matches pagination does not expand the first `AnswerPreview` payload.

## Golden Scenarios

1. Direct reference: `2:255` opens concise evidence with `Open in Reader`.
2. English theme-like query: uses translation/Qur'an evidence when eligible, avoids broad theological claims.
3. Arabic phrase query: prefers Qur'an text phrase evidence.
4. Morphology query: uses morphology rows only for Arabic analysis.
5. Transliteration query: searches cautiously and blocks Arabic claims unless resolved to Arabic evidence.
6. Tafsir-shaped query: v1 returns evidence-only with `requires-tafsir` or `requires-deferred-source` and `requiredDeferredSources: ["tafsir"]`.
7. Missing translation pack: source unavailable; no fabricated translation support.
8. Hafs evidence with Qalun Reader: verse mapping warning appears; no token highlight unless proven.
9. Absence query: no absence claim renders as v1 answer prose.
10. Personal ruling query: fixed boundary copy and evidence-only/no-answer.
11. Reader cold launch then Ask/Search: no Search work before explicit intent; worker starts after intent.
12. Malformed, corrupt, or unreadable cached source asset: affected source disabled through load-safety handling; no browser-side trust verification language.

## Implementation Boundary

V1 MUST ship the small safe loop before platform or roadmap capabilities.

Platform features MAY be implemented behind lazy user actions only after they cannot affect first answer paint.

Roadmap source families and future producers MUST satisfy this v1 trust kernel before they can render claims.
