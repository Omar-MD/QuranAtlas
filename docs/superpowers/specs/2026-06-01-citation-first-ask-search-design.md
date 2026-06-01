# Citation-First Ask/Search Design

> Complete feature spec for QuranAtlas Ask/Search. This is a product and architecture design, not an implementation plan.

**Goal:** Transform Search into a deterministic-first Qur'an evidence engine that answers, cites, explains, and guides while preserving source provenance, auditability, offline boundaries, and Reader First behavior.

**Architecture:** Ask/Search interprets the user's query, builds a transparent search plan, retrieves typed evidence from eligible source families, produces an `AnswerBrief` through approved deterministic recipes, and renders answer, evidence, deepen, sources, and audit UI. The architecture has three layers: a small exhaustively testable trust kernel, source-family extensions, and UX surfaces. It reserves a future producer interface, but LLM/RAG is deferred and is not an approved runtime path.

**Tech Stack:** React, Vite, Search Web Worker, immutable Search packs, IndexedDB/Dexie, QuranAtlas design system, existing Search DTOs and Reader mapping helpers.

---

## Approved Product Decisions

| Area | Decision |
| --- | --- |
| Feature scope | Complete Ask/Search feature, not one implementation slice. |
| Runtime posture | Deterministic-first. |
| Future producers | Producer-agnostic interface reserved; LLM/RAG deferred until it satisfies the same evidence contract. |
| Core pipeline | `Query -> QueryUnderstanding -> SearchPlan -> EvidenceBundle -> AnswerBrief -> UI`. |
| Trust kernel | Keep `EvidenceAtom`, `ClaimSupport`, `AnswerabilityDecision`, `AnswerBrief`, and `PackManifest` small enough to test exhaustively. |
| Answer style | Short prose answer when responsible; partial, evidence-only, or no-answer recovery when not. |
| Trust rule | Every answer claim must be traceable to typed evidence, with visible source provenance, inference level, and scope boundary. |
| User experience | Answer-first, with compact evidence basis, best evidence, deepen paths, all matches, method/sources, and audit. |
| Tests | Trust-contract tests are mandatory for this feature. Unsupported answer rendering is a severity-1 product bug. |

## Non-Negotiable Invariants

- No source text is generated. Qur'an Arabic, translations, tafsir excerpts, asbab reports, morphology, lexicon excerpts, and source notes must come from source packs or curated source records.
- Only summaries and UI explanations may be generated, and only through approved deterministic recipes.
- No unsupported theological, legal, medical, political, or pastoral claim may render as an answer.
- Citation chips may render only when they resolve to typed, claim-eligible evidence.
- Claim-bearing headings, labels, study path titles, and generated-study labels require support. Structural headings such as `Best Evidence`, `Explore Deeper`, and `Method & Sources` do not.
- Reader cold launch must not fetch Ask/Search packs, initialize heavy retrieval features, decode graph shards, or start Ask/Search workers.
- Hafs Search source to Qalun Reader navigation remains explicit and validated. Token-level claims must not imply token-level Reader alignment unless that mapping is proven.
- Absence claims such as `The Qur'an does not mention...` require complete source coverage, a visible normalization trace, and a source-boundary notice.

## Spec Layers

The design is split into three layers:

1. **Trust Kernel:** `EvidenceAtom`, `ClaimSupport`, `AnswerabilityDecision`, `AnswerBrief`, and `PackManifest`. This layer is the enforceable contract for citations, support, answerability, replay, and pack integrity.
2. **Source Family Extensions:** Qur'an text, translation, morphology, tafsir, asbab, themes, cross-reference, reader mapping, and future hadith-linked evidence. These plug into the trust kernel instead of expanding it.
3. **UX Surfaces:** Answer, Evidence Basis, Best Evidence, Explore Deeper, Why This Answer, Method & Sources, and Audit.

## Core Pipeline

```text
User query
  -> QueryUnderstanding
  -> SearchPlan
  -> EvidenceBundle
  -> AnswerBrief
  -> Ask/Search UI
```

`AnswerBrief` must not consume raw worker results directly. The trust boundary is the `EvidenceBundle`, which normalizes raw retrieval output into typed, source-backed, claim-eligible evidence.

## Query Understanding

Query understanding makes the system's interpretation visible before an answer appears. This prevents false precision for ambiguous inputs such as `mercy`, `rahmah`, `شكر`, or `What does this verse mean?`.

```ts
type DetectedInputType =
  | "english-term"
  | "arabic-token"
  | "arabic-root"
  | "lemma"
  | "phrase"
  | "reference"
  | "natural-language-question"
  | "transliteration"
  | "ambiguous";

type QueryIntent =
  | "find-occurrences"
  | "answer-question"
  | "study-theme"
  | "trace-language"
  | "open-reference"
  | "compare"
  | "explain-verse"
  | "browse-related"
  | "unknown";

type SearchLens =
  | "meaning"
  | "translation"
  | "quran-text"
  | "root"
  | "lemma"
  | "phrase"
  | "tafsir"
  | "asbab"
  | "mixed";

type DetectionCandidate = {
  inputType: DetectedInputType;
  normalizedValue: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type QueryAlternative = {
  label: string;
  lens: SearchLens;
  reason: string;
  query?: string;
};

type NormalizationTrace = {
  originalInput: string;
  normalizedForms: string[];
  removedDiacritics: boolean;
  hamzaNormalized: boolean;
  alifMaqsuraNormalized: boolean;
  taMarbutaNormalized: boolean;
  tokenizationVersion: string;
  morphologyVersion?: string;
  warnings: string[];
};

type QueryUnderstanding = {
  detectedInputType: DetectedInputType;
  detectionCandidates: DetectionCandidate[];
  inferredIntent: QueryIntent;
  assumedLens: SearchLens;
  confidence: "high" | "medium" | "low";
  normalizationTrace: NormalizationTrace;
  userVisibleSummary: string;
  alternatives: QueryAlternative[];
};
```

Confidence affects output:

| Confidence | Behavior |
| --- | --- |
| `high` | `answer` may render if evidence and recipe allow it. |
| `medium` | `partial-answer` only; interpretation remains visible. |
| `low` | `evidence-only`, `no-answer`, or refine-query recovery. |

Arabic root and lemma detection must be conservative. The UI should say `Possibly root: ش ك ر` when confidence is not high, and must show surface-form alternatives.

## Search Plan

The search plan shows what the system searched, what it skipped, and why.

```ts
type SourceKind =
  | "quran-text"
  | "translation"
  | "tafsir"
  | "morphology"
  | "root-lexicon"
  | "lemma-index"
  | "asbab"
  | "hadith"
  | "theme-taxonomy"
  | "cross-reference"
  | "recitation"
  | "reader-mapping"
  | "computed-cluster";

type RankProfileId =
  | "reference"
  | "exact-phrase"
  | "lexical"
  | "root-lemma"
  | "theme"
  | "question"
  | "evidence-only";

type SearchLane = {
  id: string;
  lens: SearchLens;
  sourceKinds: SourceKind[];
  queryForm: string;
  normalizedQuery?: string;
  rankProfile: RankProfileId;
  limit: number;
  status: "planned" | "executed" | "skipped" | "failed";
  skipReason?: string;
};

type SearchPlan = {
  primaryLens:
    | "quran-text"
    | "translation"
    | "root"
    | "lemma"
    | "phrase"
    | "theme"
    | "tafsir"
    | "asbab"
    | "mixed";
  lanes: SearchLane[];
  excludedSources: Array<{
    sourceKind: SourceKind;
    reason: "not-installed" | "not-indexed" | "not-relevant" | "unsupported-for-query";
  }>;
  ambiguityNotes: string[];
};
```

User-facing example:

```text
Searched as: theme question about gratitude
Included: Qur'an text, translation, root/lemma evidence
Not included: tafsir, asbab al-nuzul
Other lenses: exact English phrase, Arabic root ش ك ر, translation hits
```

## Source Ontology

Sources are not interchangeable. A translation can support translation claims; it cannot support Arabic morphology claims. A computed cluster can support a computed relationship; it cannot present itself as tafsir.

```ts
type AuthorityModel =
  | "canonical-text"
  | "scholarly-source"
  | "translator-rendering"
  | "computed-analysis"
  | "editorial-curated";

type ClaimAttribution =
  | "quran-states"
  | "quran-mentions"
  | "quran-commands"
  | "quran-prohibits"
  | "translation-renders"
  | "morphology-analyzes"
  | "root-lexicon-defines"
  | "lemma-index-identifies"
  | "tafsir-explains"
  | "asbab-reports"
  | "theme-taxonomy-classifies"
  | "cross-reference-links"
  | "system-computes";

type SourceRuntimeState = {
  sourceId: string;
  installed: boolean;
  indexed: boolean;
  searchable: boolean;
  displayEligible: boolean;
  disabled: boolean;
  failureReason?: string;
};

type ClaimEligibilityDecision = {
  sourceId: string;
  eligible: boolean;
  reasons: string[];
};

type SourceCoverage = {
  refs?: string[];
  languages?: string[];
  coverageNote?: string;
};

type SourceRecord = {
  id: string;
  title: string;
  sourceKind: SourceKind;
  authorityModel: AuthorityModel;
  usableForClaims: ClaimAttribution[];
  language: string;
  version: string;
  licenseId: string;
  contentHash: string;
  coverage: SourceCoverage;
  reliabilityNotes?: string[];
  limitations?: string[];
};
```

`hadith` is modeled as a future evidence family because tafsir and asbab may cite reports. `fiqh`, `fatwa`, and personal rulings are treated as application boundaries unless QuranAtlas later approves a juristic source corpus.

Immutable source metadata must not be mixed with device-local runtime state. `SourceRecord` describes durable source facts; `SourceRuntimeState` describes whether that source is installed, indexed, searchable, display-eligible, or disabled on the current device. Claim eligibility is computed as a `ClaimEligibilityDecision` from source metadata, pack verification, index validity, source-family policy, runtime state, recipe requirements, and the evidence item eligibility; it is not persisted as mutable source truth.

## Pack Integrity

Every source family that can support answer claims must be backed by a manifest with verifiable content identity.

```ts
type PackManifest = {
  id: string;
  schemaVersion: string;
  sourceIds: string[];
  sourceContentHashes: Record<string, string>;
  contentHash: string;
  indexHash: string;
  normalizerVersion: string;
  builtAt: string;
  buildProvenanceHash: string;
  buildProvenanceUri?: string;
  signature: string;
  signatureAlgorithm: "Ed25519";
  signingKeyId: string;
  keyVersion: string;
  revokedBy?: string;
};

type PackRevocationRecord = {
  packId: string;
  revokedAt: string;
  reason: "compromised" | "superseded" | "license-revoked" | "schema-invalid" | "content-error";
  successorPackId?: string;
  signature: string;
  signingKeyId: string;
};
```

Rules:

- The signature is computed over the canonical manifest excluding the `signature` field.
- If manifest signature fails, the source family is disabled for claims and display.
- A pack is disabled if it appears in the signed revocation registry, even if its own manifest signature is valid.
- `revokedBy` is optional manifest metadata, not the authority for revocation decisions.
- If `contentHash` mismatches, the pack is quarantined.
- If `schemaVersion` is unsupported, install is blocked or a migration is required.
- If `indexHash` mismatches, the index must be rebuilt before claim eligibility is restored.

## Evidence Bundle

```ts
type EvidenceUseState =
  | "used"
  | "available-not-used"
  | "not-available"
  | "not-indexed"
  | "disabled"
  | "failed";

type EvidenceCoverageItem = {
  sourceKind: SourceKind;
  runtimeState: SourceRuntimeState;
  searched: boolean;
  resultCount: number;
  claimEligibleCount: number;
  displayOnlyCount: number;
  status:
    | "used"
    | "available-not-used"
    | "not-available"
    | "not-indexed"
    | "disabled"
    | "failed"
    | "not-relevant";
  note?: string;
};

type EvidenceCoverage = EvidenceCoverageItem[];

type TextRange = {
  ref: string;
  startOffset?: number;
  endOffset?: number;
};

type SupportStrength = "explicit" | "strong" | "moderate" | "weak";

const supportStrengthRank = {
  weak: 1,
  moderate: 2,
  strong: 3,
  explicit: 4,
} as const;

type CoverageStatus =
  | "complete-for-source"
  | "partial-source"
  | "source-limited"
  | "not-available";

type EvidenceProvenance =
  | "primary-text"
  | "linguistic-analysis"
  | "translation"
  | "classical-tafsir"
  | "asbab-report"
  | "hadith-report"
  | "computed-derived"
  | "editorial-curated";

type EvidenceDisplayTarget =
  | { type: "quote-range"; range: TextRange }
  | { type: "verse-ref"; refs: string[] }
  | { type: "token"; tokenRefs: string[] }
  | { type: "source-note"; sourceId: string }
  | { type: "computed-explanation"; explanationId: string };

type EvidenceAtom = {
  id: string;
  sourceId: string;
  sourceVersion: string;
  sourceContentHash: string;
  evidenceType:
    | "quran-text"
    | "translation"
    | "morphology"
    | "root-lexicon"
    | "lemma-index"
    | "tafsir"
    | "asbab"
    | "hadith"
    | "theme"
    | "cross-reference"
    | "reader-mapping"
    | "computed-cluster";
  refs: string[];
  quoteRange?: TextRange;
  tokenRefs?: string[];
  displayTarget: EvidenceDisplayTarget;
  provenance: EvidenceProvenance;
  supportStrength: SupportStrength;
  coverageStatus: CoverageStatus;
  eligibility: ClaimAttribution[];
  quoteHash?: string;
};
```

Evidence support eligibility is checked against both the source and the evidence item:

```text
A claim is valid only if:
- claim.attribution is allowed by evidenceAtom.eligibility;
- claim.attribution is allowed by source.usableForClaims;
- claim eligibility decision for the source is eligible;
- evidenceAtom.supportStrength satisfies the recipe;
- the support displayTarget can open in an evidence card or audit view.
```

A support item satisfies `minimumSupportStrength` only when `supportStrengthRank[item.supportStrength] >= supportStrengthRank[rule.minimumSupportStrength]`.

The minimal trust-kernel support records are:

```ts
type ClaimSupport = {
  claimId: string;
  supportIds: string[];
  verdict: "supported" | "contradicted" | "mixed" | "insufficient";
  supportStrength: SupportStrength;
  inferenceLevel:
    | "quotation"
    | "paraphrase"
    | "direct-summary"
    | "cross-verse-synthesis"
    | "source-attributed-interpretation";
};
```

Typed source-family evidence extends this kernel:

```ts
type QuranTextEvidence = EvidenceAtom & { evidenceType: "quran-text" };
type TranslationEvidence = EvidenceAtom & { evidenceType: "translation" };
type MorphologyEvidence = EvidenceAtom & { evidenceType: "morphology" };
type RootLemmaEvidence = EvidenceAtom & { evidenceType: "root-lexicon" | "lemma-index" };
type ReaderMappingEvidence = EvidenceAtom & { evidenceType: "reader-mapping" };

type TafsirEvidence = EvidenceAtom & {
  evidenceType: "tafsir";
  authorId: string;
  verseRef: string;
  passageRef: string;
  excerpt: string;
  explanationType:
    | "lexical"
    | "grammatical"
    | "narrative"
    | "legal"
    | "theological"
    | "rhetorical"
    | "cross-reference";
  attributionMode: "author-explains" | "source-reports" | "editor-summarizes";
};

type AsbabEvidence = EvidenceAtom & {
  evidenceType: "asbab";
  verseRefs: string[];
  reportText: string;
  reportStatus?: "source-stated" | "editorial-assessed" | "unknown";
  chainInfoAvailable: boolean;
  disagreementStatus: DisagreementStatus;
};

type ThemeProvenance =
  | "source-attested"
  | "editorial-curated"
  | "computed-cluster";

type ThemeEvidence = EvidenceAtom & {
  evidenceType: "theme";
  label: string;
  themeProvenance: ThemeProvenance;
  sourceIds: string[];
  explanation?: string;
};

type CrossReferenceEvidence = EvidenceAtom & {
  evidenceType: "cross-reference";
  fromRef: string;
  toRef: string;
  edgeType:
    | "shared-root"
    | "shared-lemma"
    | "same-phrase"
    | "same-theme"
    | "same-story"
    | "tafsir-linked"
    | "asbab-linked"
    | "chronology-linked"
    | "computed-semantic-similarity"
    | "editorial-cross-reference";
};

type EvidenceBundleIndexes = {
  byType: Record<EvidenceAtom["evidenceType"], string[]>;
  bySourceId: Record<string, string[]>;
  byRef: Record<string, string[]>;
};

type EvidenceBundle = {
  id: string;
  query: string;
  queryUnderstanding: QueryUnderstanding;
  searchPlan: SearchPlan;
  evidenceAtoms: EvidenceAtom[];
  indexes: EvidenceBundleIndexes;
  coverage: EvidenceCoverage;
  limitations: AnswerBoundaryNotice[];
};
```

`evidenceAtoms` is the only canonical evidence store in an `EvidenceBundle`. Source-family evidence views are reconstructed by filtering `evidenceAtoms` or using `indexes`; they must not be duplicated as parallel arrays.

## Citation Invariant

A citation chip may render only if:

1. It points to at least one `EvidenceAtom` item.
2. Every linked support item exists in the `EvidenceBundle`.
3. The support source is claim-eligible.
4. Support attribution is compatible with claim attribution.
5. The support display target can open in an evidence card or audit view.

## Answer Brief

```ts
type AnswerMode =
  | "answer"
  | "partial-answer"
  | "evidence-only"
  | "no-answer";

type AnswerBlocker =
  | "requires-tafsir"
  | "requires-asbab"
  | "requires-hadith"
  | "requires-external-fiqh-authority"
  | "requires-qualified-scholar"
  | "medical-boundary"
  | "legal-boundary"
  | "personal-crisis-boundary"
  | "insufficient-evidence"
  | "ambiguous-query"
  | "outside-current-scope";

type AnswerCapability =
  | "can-answer-from-quran-text"
  | "can-answer-from-translation-and-arabic"
  | "can-answer-from-tafsir"
  | "can-answer-from-asbab"
  | "partial-answer-evidence-only"
  | "cannot-answer-with-current-sources";

type InferenceLevel =
  | "quotation"
  | "paraphrase"
  | "direct-summary"
  | "cross-verse-synthesis"
  | "source-attributed-interpretation";

type AnswerClaim = {
  id: string;
  text: string;
  claimCapability: AnswerCapability;
  supportIds: string[];
  attribution: ClaimAttribution;
  predicate: ClaimPredicate;
  inferenceLevel: InferenceLevel;
  supportStrength: SupportStrength;
};

type RenderPermission =
  | "no-prose-answer"
  | "deterministic-summary-only"
  | "source-attributed-summary-only";

type AnswerabilityDecision = {
  status:
    | "answerable"
    | "partially-answerable"
    | "evidence-only"
    | "needs-clarification"
    | "not-answerable";
  reasons: AnswerBlocker[];
  minRequiredEvidence: EvidenceAtom["evidenceType"][];
  satisfiedEvidence: EvidenceAtom["evidenceType"][];
  failedRequirements: Array<{
    requirement: string;
    reason: string;
  }>;
  ambiguityStatus: "none" | "low" | "material" | "blocking";
  renderPermission: RenderPermission;
};

type EvidenceBasis = {
  quranText: EvidenceUseState;
  translation: EvidenceUseState;
  morphology: EvidenceUseState;
  tafsir: EvidenceUseState;
  asbab: EvidenceUseState;
  themes: "not-available" | "not-used" | "source-attested" | "editorial" | "computed";
  highestInferenceLevel: InferenceLevel;
};

type AnswerBoundaryNotice = {
  id: string;
  severity: "info" | "caution" | "blocking";
  text: string;
  blockers?: AnswerBlocker[];
  sourceKinds?: SourceKind[];
};

type DisagreementStatus =
  | "none-detected"
  | "detected"
  | "not-evaluated"
  | "source-family-not-available";

type DisagreementSummary = {
  id: string;
  topic: string;
  status: DisagreementStatus;
  sources: string[];
  summary: string;
  severity: "minor" | "material" | "major";
  displayMode: "inline" | "expandable" | "requires-deep-view";
};

type ReflectionPrompt = {
  id: string;
  text: string;
  anchorRefs: string[];
  generatedBy: "template" | "editorial";
  assertsNewClaim: false;
};

type EvidenceCard = {
  id: string;
  refLabel: string;
  supportIds: string[];
  title: string;
  titleSupportIds?: string[];
  snippet: string;
  snippetSource: "source-text" | "translation-source" | "deterministic-template";
  whyThisAppears: string;
  whyThisAppearsSupportIds: string[];
  evidenceType: EvidenceAtom["evidenceType"];
  supportStrength: SupportStrength;
  readerMappingStatus: ReaderMappingStatus;
};

type AnswerAudit = {
  claims: Array<{
    claimId: string;
    supportIds: string[];
    attribution: ClaimAttribution;
    inferenceLevel: InferenceLevel;
    supportStrength: SupportStrength;
  }>;
  sourceEligibility: Array<{
    sourceId: string;
    usableForClaims: ClaimAttribution[];
    runtimeState: SourceRuntimeState;
  }>;
};

type AnswerBriefMetadata = {
  answerProducerId: string;
  answerProducerVersion: string;
  sourcePackIds: string[];
  generatedAt: string;
  deterministic: true;
  retrievalSnapshotHash: RetrievalSnapshotHash;
};

type RetrievalSnapshot = {
  queryUnderstandingHash: string;
  searchPlanHash: string;
  packManifestHashes: string[];
  sourceContentHashes: string[];
  normalizerVersion: string;
  rankerVersion: string;
  recipeVersion: string;
  sourceRuntimeStateHash: string;
  excludedSources: SearchPlan["excludedSources"];
  createdBy: {
    producerId: string;
    producerVersion: string;
  };
};

type RetrievalSnapshotHash = string;

type NoAnswerRecovery = {
  reason: AnswerBlocker[];
  userMessage: string;
  suggestedQueries: QueryAlternative[];
  availableEvidenceLanes: SearchLane[];
  actions: Array<
    | "try-different-lens"
    | "show-related-verses"
    | "open-reader"
    | "install-source-pack"
    | "refine-query"
  >;
};

type AnswerBrief = {
  id: string;
  query: string;
  queryUnderstanding: QueryUnderstanding;
  searchPlan: SearchPlan;
  evidenceBundleId: string;
  mode: AnswerMode; // derived from answerability.status
  blockers: AnswerBlocker[]; // derived from answerability.reasons
  recipe: AnswerRecipe;
  answerability: AnswerabilityDecision;
  shortAnswerClaims: AnswerClaim[];
  claimSupports: ClaimSupport[];
  evidenceCards: EvidenceCard[];
  evidenceBasis: EvidenceBasis;
  boundaryNotices: AnswerBoundaryNotice[];
  disagreements: DisagreementSummary[];
  reflectionPrompts: ReflectionPrompt[];
  noAnswerRecovery?: NoAnswerRecovery;
  audit: AnswerAudit;
  metadata: AnswerBriefMetadata;
};
```

`retrievalSnapshotHash` is the canonical hash of `RetrievalSnapshot`. Stable replay ignores volatile metadata such as `generatedAt`.

`canonicalHash(value)` means SHA-256 over RFC 8785 canonical JSON unless another canonicalization is explicitly specified. Arrays whose order is not semantically meaningful must be sorted before hashing; arrays whose order is semantically meaningful must declare that ordering in the owning type or validation rule.

```ts
const answerModeByAnswerabilityStatus = {
  answerable: "answer",
  "partially-answerable": "partial-answer",
  "evidence-only": "evidence-only",
  "needs-clarification": "no-answer",
  "not-answerable": "no-answer",
} as const;
```

`AnswerabilityDecision` is canonical. `AnswerBrief.mode` must be derived from `AnswerabilityDecision.status`, and `AnswerBrief.blockers` must equal `AnswerabilityDecision.reasons`. A serialized `AnswerBrief` failing those checks is invalid.

Additional answerability invariants:

- If `renderPermission` is `no-prose-answer`, `AnswerBrief.shortAnswerClaims` must be empty.
- If `answerability.status` is `needs-clarification`, `NoAnswerRecovery.suggestedQueries` must be non-empty.
- If `mode` is `answer`, `shortAnswerClaims.length` must be between 1 and `recipe.maxClaims`.

Every answer page includes either a short answer paragraph when mode is `answer` or `partial-answer`, or an evidence-only/no-answer explanation when prose answering is not responsible. Evidence-only mode blocks synthetic answer claims, but allows boundary and recovery explanation.

## Deterministic Answer Recipes

```ts
type AnswerRecipe =
  | "direct-verse-answer"
  | "theme-cluster-summary"
  | "root-lemma-summary"
  | "phrase-occurrence-summary"
  | "reference-explanation-lite"
  | "tafsir-attributed-summary"
  | "asbab-attributed-summary"
  | "evidence-only";

type ClaimPredicate =
  | "mentions"
  | "states"
  | "commands"
  | "prohibits"
  | "associates"
  | "contrasts"
  | "renders"
  | "analyzes"
  | "classifies"
  | "links"
  | "reports"
  | "explains";

type RecipeRule = {
  recipe: AnswerRecipe;
  requiredEvidenceTypes: EvidenceAtom["evidenceType"][];
  maxClaims: number;
  allowedInferenceLevels: InferenceLevel[];
  minimumSupportStrength: SupportStrength;
  allowedClaimPredicates: ClaimPredicate[];
  forbiddenPhrases: string[];
  requiredBoundaryNotices: AnswerBlocker[];
};
```

Approved deterministic language should prefer:

- `This verse mentions...`
- `These verses associate...`
- `The translation renders...`
- `This tafsir source explains...`
- `The root appears in...`

Recipes should avoid broad unsupported phrasing such as:

- `The Qur'an teaches...`
- `Islam says...`
- `This means...`
- `The ruling is...`

unless the typed evidence, source family, and recipe explicitly permit that level of claim.

Absence claims require a special rule:

```ts
type AbsenceClaimRule = {
  claimType: "absence";
  allowedOnlyWhen: {
    searchedSourcesComplete: true;
    normalizedQueryTraceAvailable: true;
    synonymBoundaryShown: true;
    sourcePackCoverageComplete: true;
  };
  requiredNotice: "absence-claims-are-source-and-normalizer-bounded";
};
```

## Degradation Rules

```ts
type DegradationRule = {
  condition: string;
  fromMode: AnswerMode;
  toMode: AnswerMode;
  blockers: AnswerBlocker[];
  requiredNotice: string;
};
```

Required degradation behavior:

- If no claim has direct or strong evidence, degrade to `evidence-only`.
- If a query is tafsir-shaped and tafsir is unavailable, render `evidence-only` with `requires-tafsir`.
- If a query is asbab-shaped and asbab is unavailable, render `evidence-only` with `requires-asbab`.
- If intent confidence is low, render refine-query recovery or `evidence-only`.
- If the query asks for personal medical, legal, crisis, or fiqh application, render evidence-only plus boundary notices and appropriate recovery.
- If an absence claim lacks complete source coverage or normalization trace, block the absence claim and render evidence-only recovery.

## Ranking And Evidence Selection

Ranking principles:

- Prefer direct Qur'an text evidence over translation-only evidence.
- Prefer exact phrase evidence over loose semantic or thematic evidence.
- Prefer claim-eligible sources over display-only sources.
- Prefer diverse evidence clusters over repeated near-duplicates.
- Prefer evidence that can be opened and audited.
- Penalize evidence with weaker Reader mapping when the user is likely to open it in Reader.

Deterministic tie-breakers:

1. Exact reference match.
2. Exact Arabic phrase.
3. Exact token, root, or lemma.
4. Claim-eligible source.
5. Stronger support.
6. Better Reader mapping.
7. Source priority order.
8. Canonical surah/ayah order.

## Progressive UX

Query understanding stays visible without turning normal use into paperwork:

| Confidence | UX Treatment |
| --- | --- |
| `high` | Show compact `Searched as...` chip; do not block the answer. |
| `medium` | Show answer/evidence with visible alternative lenses. |
| `low` | Ask for clarification or render evidence-only before answer prose. |

Default first-screen hierarchy:

```text
Answer or evidence-only explanation
Compact Evidence Basis
Best Evidence
Explore Deeper
```

Deep views:

```text
Why this answer?
Audit
Method & Sources
```

`Evidence Basis` has compact and expanded modes.

Compact:

```text
Based on Qur'an text and translation. No tafsir source was used. This is a direct summary, not a ruling.
```

Expanded:

```text
Qur'an text: used
Translation: used
Morphology: available, not used
Tafsir: not available
Asbab: not available
Themes: computed
```

## Page Sections

### Answer

Shows either:

- a concise answer paragraph built from `shortAnswerClaims`, with citation chips, or
- an evidence-only/no-answer explanation with `NoAnswerRecovery`.

The paragraph defaults to at most three claims.

### Evidence Basis

Always present. It teaches the user what kind of support the answer used and what it did not use.

### Best Evidence

Evidence cards answer:

- Why this appears.
- What matched.
- Evidence type.
- Support strength.
- Reader mapping status.
- Source limitations.

Evidence card content rules:

- `snippet` must come from source text, source translation, or an approved deterministic template.
- `title` is structural unless it asserts a claim; claim-bearing titles require `titleSupportIds`.
- `whyThisAppears` must be backed by `whyThisAppearsSupportIds`.

Actions:

- `Read in context`
- `Why this result?`
- `Trace Arabic`
- `Deepen`

### Deepen

```ts
type DeepenPanel = {
  selectedRef: string;
  sections: Array<
    | "verse-context"
    | "related-verses"
    | "arabic-analysis"
    | "tafsir-when-available"
    | "asbab-when-available"
    | "theme-paths"
    | "reflection-prompts"
  >;
};
```

Reflection prompts may render only when anchored to verse refs, non-claim-bearing, and labeled as prompts.

Study paths are first-class Deepen objects:

```ts
type StudyPath = {
  id: string;
  title: string;
  titleSupportIds: string[];
  anchorRefs: string[];
  estimatedMinutes?: number;
  mode: "reflect" | "trace-language" | "compare-verses" | "read-context";
  steps: Array<{
    label: string;
    ref: string;
    prompt: string;
    supportIds: string[];
  }>;
  claimBearing: boolean;
};
```

### All Matches

Keeps classic Search behavior: result windows, load more, source-backed lanes, exact mode visibility, and current worker cursor constraints.

### Method & Sources

Contains technical provenance, pack ids, normalizer/rank versions, source ids, license ids, and mapping summaries. Answer-affecting boundaries remain near the answer, not only here.

### Why This Answer / Audit

Mainstream label: `Why this answer?`

Audit content:

- claim support
- source eligibility
- inference level
- support strength
- producer metadata
- source pack ids
- retrieval snapshot hash

## Reader Mapping

```ts
type ReaderMappingStatus =
  | "same-riwayah"
  | "verse-level-only"
  | "token-level-mapped"
  | "token-level-different"
  | "unmapped"
  | "not-applicable";
```

If Search found evidence in Hafs and the active Reader is Qalun, the UI must show when only verse-level mapping is available.

Example:

```text
This result was found in the Hafs search text. The selected Reader uses Qalun. Verse mapping is available, but token-level highlighting may differ.
```

## Safety And Application Boundaries

Sensitive categories:

- `medical`
- `legal`
- `fiqh-fatwa`
- `personal-crisis`
- `self-harm`
- `political-persuasion-or-campaigning`
- `abusive-or-polemical-religious-framing`

The app may show relevant Qur'anic evidence but must not issue personal rulings, clinical advice, legal advice, political persuasion, or inflammatory religious attacks.

Neutral source comparison remains allowed:

```text
What do different tafsir sources say about this verse?
```

Crisis/self-harm flows must include a special recovery message:

```text
If this is immediate danger, contact local emergency services or a crisis hotline now. I can also show Qur'anic passages of comfort.
```

## URL, Storage, And Offline Behavior

Architecture decision:

```text
Client-side modular monolith
- Reader shell remains clean.
- Ask/Search UI is lazy-loaded.
- Search/Evidence worker owns retrieval, evidence bundling, and answerability.
- IndexedDB/Dexie stores installed packs, indexes, cache metadata, manifests, and runtime state.
- Pack publishing and telemetry are optional services, not Reader hot-path dependencies.
```

Do not start with microservices, server-side retrieval by default, network retrieval on the Reader hot path, or LLM answer generation. Server-assisted retrieval becomes appropriate only if installed packs exceed realistic device storage budgets, source freshness must be near-real-time, query latency is unacceptable on target mobile devices, shared ranking becomes product-critical, or licensing prevents offline local source packs.

Ask/Search keeps URL-backed state:

```text
q
lens
intent
answerMode
selectedEvidenceId
selectedClaimId
selectedSection
sourcePackVersion
```

Full answer snapshots are not stored in the URL.

Saved searches continue to store query definitions and compatibility metadata unless a future Collections feature is approved. Recomputed answers must identify when source packs, producer versions, or retrieval snapshots changed.

Offline behavior:

- Ask/Search must degrade gracefully when source families are unavailable locally.
- Missing source packs create coverage/boundary notices, not fabricated answers.
- Reader cold launch must not initialize heavyweight Ask/Search packs.
- Optional source packs may be lazy-loaded only when the user enters Ask/Search or explicitly requests a source family.

Performance budgets:

```text
Reader cold launch:
- Reader cold launch must include no Ask/Search feature chunk, no Ask/Search worker initialization, and no Ask/Search pack/index fetch.
- Ask/Search-specific executable JS on Reader route: target 0 KB, hard cap 2 KB gzip.
- Ask/Search worker: not started before explicit Ask/Search intent.
- Evidence packs: not fetched before Ask/Search entry or explicit pack install.

Ask/Search interaction:
- QueryUnderstanding p95: under 100 ms local.
- Initial evidence cards p95: under 500 ms for installed core packs.
- Worker startup p95: under 300 ms after first Ask/Search intent.
- Ask/Search main-thread long tasks above 50 ms: zero target.
```

Worker protocol:

```ts
type WorkerRequest =
  | {
      type: "ASK_SEARCH_QUERY";
      requestId: string;
      query: string;
      lens?: SearchLens;
      intent?: QueryIntent;
      abortSignalId?: string;
    }
  | {
      type: "VERIFY_PACK";
      requestId: string;
      manifestId: string;
    }
  | {
      type: "REBUILD_INDEX";
      requestId: string;
      sourceId: string;
    }
  | {
      type: "CANCEL_REQUEST";
      requestId: string;
      targetRequestId: string;
    };

type WorkerResponse =
  | {
      type: "ASK_SEARCH_RESULT";
      requestId: string;
      bundle: EvidenceBundle;
      answerBrief: AnswerBrief;
    }
  | {
      type: "ASK_SEARCH_ERROR";
      requestId: string;
      errorCode: string;
      recoverable: boolean;
    };
```

The UI must ignore worker responses whose `requestId` is not the latest active request for that query surface. Cancelled or stale worker responses must not replace newer answers.

A cancelled request may return `ASK_SEARCH_ERROR` with `errorCode: "cancelled"`, but it must never update the active UI surface.

Observability:

```ts
type AskSearchTraceEvent =
  | "query.understand"
  | "query.normalize"
  | "search.plan"
  | "search.retrieve"
  | "evidence.bundle"
  | "answerability.decide"
  | "answer.render"
  | "citation.open"
  | "pack.verify"
  | "index.rebuild";
```

Metrics:

```text
ask_search_query_understanding_ms
ask_search_initial_cards_ms
ask_search_answerability_failures_total
ask_search_citation_open_failures_total
ask_search_pack_verification_failures_total
ask_search_evidence_only_rate
ask_search_abstention_rate
ask_search_main_thread_long_tasks_total
```

Correctness SLOs:

```text
Citation integrity: 99.99% of rendered citation chips open a valid evidence item.
Unsupported answer prevention: 100% target; any unsupported answer is severity-1.
Pack verification: 100% of claim-eligible packs must pass manifest verification.
Reader cold-start protection: 99.9% of Reader cold launches must not initialize Ask/Search worker or fetch Ask/Search packs.
Answer replay: 99.9% of same query plus same packs plus same producer version must produce the same stable answer snapshot.
```

Security and privacy baseline:

- CSP must prevent remote script execution outside approved origins.
- Source packs must be verified before display or claim eligibility.
- Pack parsers must treat all pack content as untrusted input.
- IndexedDB records must be schema-validated before use.
- Telemetry must not include full private user queries unless explicitly allowed by privacy policy.
- Any future sync or account feature must classify saved searches and notes as user data.

## Future Producer Interface

The architecture reserves a future producer interface. LLM/RAG is deferred and not an approved runtime path.

A future producer may be considered only if it satisfies:

- no unsupported claims;
- no generated source text;
- citations resolve to typed evidence;
- audit view exposes support for every claim;
- model output cannot create source facts, verse text, translation text, morphology, tafsir, asbab, or source metadata;
- low-confidence output degrades to evidence-only mode;
- deterministic trust tests remain applicable or are strengthened.

## Deferred From Initial Implementation

These contracts remain in the complete design but should be treated carefully during implementation planning:

| Area | Direction |
| --- | --- |
| Hadith source family | Future-only unless QuranAtlas has a curated, licensed, indexed corpus and grading policy. |
| Asbab claims | Evidence-only until disagreement and report-status handling are robust. |
| Computed semantic similarity | Display-only at first; it must not support answer claims. |
| Future LLM/RAG producer | Interface reserved; runtime deferred until deterministic replay and trust tests are stable. |
| Full audit UI prominence | Audit available, but not dominant on the first screen for normal users. |
| Server-assisted retrieval | Escalate only for storage budgets, freshness, mobile latency, shared ranking needs, or licensing constraints. |

## Golden Scenarios

Each scenario must specify input, query understanding, search plan, answer mode, evidence basis, boundary notices, top evidence behavior, and expected UI.

### 1. Arabic phrase exact match

- Input: `"لا خوف عليهم"`
- Query understanding: phrase, high confidence, phrase lens.
- Search plan: exact phrase lane over Qur'an text.
- Answer mode: `answer` if direct evidence exists.
- Evidence basis: Qur'an text used; translation optional; tafsir not used.
- Boundary notices: phrase matching is source-text bounded.
- Top evidence: exact phrase cards in canonical order.
- Expected UI: concise answer describes occurrence evidence, not theological synthesis.

### 2. Arabic root search

- Input: `ش ك ر`
- Query understanding: possible root, high confidence only if root dictionary validates it.
- Search plan: root/lemma lanes and related surface forms.
- Answer mode: `partial-answer` or `answer` depending on support strength.
- Evidence basis: morphology/root evidence used; translation may be used.
- Boundary notices: root evidence is linguistic, not tafsir.
- Top evidence: cards show matched forms and root.
- Expected UI: `Trace Arabic` prominent.

### 3. English theme query

- Input: `gratitude`
- Query understanding: English term with study-theme intent, medium/high confidence.
- Search plan: translation lane, possible root/lemma alternatives, computed/editorial themes if available.
- Answer mode: `partial-answer` unless strong direct evidence supports an answer.
- Evidence basis: translation used; themes computed or not used; tafsir not used.
- Boundary notices: translation-sensitive and tafsir not included.
- Top evidence: diverse verses rather than duplicates.
- Expected UI: answer uses limited claims such as association with increase and remembrance only if evidence supports them.

### 4. Natural question

- Input: `What does the Qur'an say about patience?`
- Query understanding: natural-language question, study-theme intent.
- Search plan: theme/question rank profile with translation and root/lemma support.
- Answer mode: `answer` or `partial-answer` depending on direct evidence.
- Evidence basis: Qur'an text and translation used; morphology available if roots are detected.
- Boundary notices: no tafsir unless tafsir pack is active.
- Top evidence: verses clustered by directness and diversity.
- Expected UI: concise cited answer with follow-up lenses.

### 5. Tafsir-shaped query without tafsir pack

- Input: `What does 24:35 mean?`
- Query understanding: explain-verse intent, tafsir lens likely.
- Search plan: reference lane executed; tafsir excluded as not available.
- Answer mode: `evidence-only`.
- Blockers: `requires-tafsir`.
- Evidence basis: Qur'an text and translation used; tafsir not available.
- Boundary notices: interpretation requires tafsir not active for this answer.
- Top evidence: verse, translation, Arabic evidence if available.
- Expected UI: no synthetic interpretation paragraph.

### 6. Asbab-shaped query without asbab pack

- Input: `Why was 33:37 revealed?`
- Query understanding: natural-language question, asbab lens.
- Search plan: reference lane executed; asbab excluded as not available.
- Answer mode: `evidence-only`.
- Blockers: `requires-asbab`.
- Evidence basis: Qur'an text and translation used; asbab not available.
- Boundary notices: occasion reports are not active.
- Top evidence: referenced verse and nearby context.
- Expected UI: answer refuses to invent revelation context.

### 7. Fiqh/fatwa query

- Input: `Is this business contract halal?`
- Query understanding: natural-language question, application/legal intent.
- Search plan: may offer related Qur'anic evidence lanes if safe.
- Answer mode: `evidence-only` or `no-answer`.
- Blockers: `requires-external-fiqh-authority`, `requires-qualified-scholar`, possibly `legal-boundary`.
- Evidence basis: whatever related evidence is shown must be labeled as evidence, not ruling.
- Boundary notices: QuranAtlas cannot issue personal rulings.
- Top evidence: optional related verses about trade/justice if query is refined.
- Expected UI: consult qualified scholar; no ruling.

### 8. Cross-riwayah Reader mapping mismatch

- Input: Arabic morphology query with Hafs evidence while Reader is Qalun.
- Query understanding: trace-language intent.
- Search plan: morphology lane over Hafs source.
- Answer mode: `partial-answer`.
- Evidence basis: morphology used; reader mapping evidence used.
- Boundary notices: token-level Reader highlighting unavailable or different.
- Top evidence: cards show Hafs source and Qalun mapping status.
- Expected UI: `Open in Read` only when verse mapping is valid; no token highlight claim.

### 9. Exact reference query

- Input: `2:255`
- Query understanding: reference, high confidence, open-reference intent.
- Search plan: reference lane over Qur'an text and available translation.
- Answer mode: `answer` or `partial-answer` only for direct reference summary; no tafsir meaning unless tafsir source is active.
- Evidence basis: Qur'an text used; translation may be used.
- Boundary notices: any explanation beyond direct text requires eligible explanatory sources.
- Top evidence: one primary evidence card for the referenced ayah.
- Expected UI: fast open-reference behavior and `Read in context`.

### 10. Transliteration query

- Input: `rahman`
- Query understanding: transliteration candidate with Arabic alternatives, medium confidence unless normalized form is unambiguous.
- Search plan: transliteration normalization trace, Arabic token/root alternatives, translation alternatives.
- Answer mode: `partial-answer` or `evidence-only` until user confirms lens if ambiguity is material.
- Evidence basis: normalization trace visible; morphology/root evidence only if validated.
- Boundary notices: transliteration normalization is not Qur'anic evidence.
- Top evidence: Arabic forms and divine-name related evidence when supported.
- Expected UI: compact alternatives such as `الرحمن`, `رحمن`, `ر ح م`.

### 11. Translation-only phrase

- Input: `God is with the patient`
- Query understanding: English translation phrase, medium confidence.
- Search plan: translation lane first; Arabic phrase/root lanes only as alternatives.
- Answer mode: `partial-answer`.
- Evidence basis: translation used; Qur'an text may be displayed as source ref but translation-only hit cannot support Arabic wording claims.
- Boundary notices: translation-sensitive.
- Top evidence: translation cards with source translation excerpt.
- Expected UI: no Arabic morphology or root claim unless separately supported.

### 12. No-result Arabic typo

- Input: mistyped Arabic token.
- Query understanding: Arabic token candidate, low confidence, normalization warnings.
- Search plan: attempted Arabic lane plus recovery alternatives.
- Answer mode: `no-answer` or `evidence-only`.
- Evidence basis: no claim evidence used.
- Boundary notices: no exact source match under current normalizer.
- Top evidence: none unless related validated alternatives exist.
- Expected UI: suggested corrections, alternate lenses, and no dead end.

### 13. Multiple tafsir disagreement

- Input: `What do tafsir sources say about 24:35?`
- Query understanding: explain-verse and compare intent.
- Search plan: reference plus tafsir lanes when tafsir packs are active.
- Answer mode: `partial-answer` or `evidence-only` depending on eligible tafsir evidence.
- Evidence basis: tafsir used only when claim-eligible.
- Boundary notices: disagreement status displayed.
- Top evidence: source-attributed tafsir cards.
- Expected UI: disagreement summary separates source-attributed interpretations from Quran text claims.

### 14. Offline with missing translation pack

- Input: English theme query while translation pack is unavailable.
- Query understanding: English term, answer-question or study-theme intent.
- Search plan: translation source excluded as not available; Arabic/source alternatives only when possible.
- Answer mode: `evidence-only` or `no-answer` if no eligible evidence remains.
- Evidence basis: translation not available.
- Boundary notices: install source pack action shown.
- Top evidence: only locally available evidence.
- Expected UI: graceful degradation and no fabricated translation support.

### 15. Tampered pack during active session

- Input: any query using a pack whose manifest or content hash fails verification.
- Query understanding: normal.
- Search plan: affected source family disabled.
- Answer mode: downgraded according to remaining evidence.
- Evidence basis: tampered source not used.
- Boundary notices: pack verification failed; source disabled.
- Top evidence: excludes quarantined pack.
- Expected UI: recovery/install action; no blank page.

### 16. Same query after pack update

- Input: repeat a saved query after source pack update.
- Query understanding: same as prior run where possible.
- Search plan: new pack manifest and retrieval snapshot.
- Answer mode: recomputed from current eligible sources.
- Evidence basis: shows changed source pack/provenance.
- Boundary notices: answer was recomputed because source packs or producer version changed.
- Top evidence: current pack results.
- Expected UI: no stale answer snapshot silently reused.

### 17. Absence claim under pressure

- Input: `Does the Qur'an never mention X?`
- Query understanding: natural-language question with absence-claim risk.
- Search plan: requires complete relevant source coverage, normalization trace, and synonym boundary.
- Answer mode: `evidence-only` unless absence rule is satisfied.
- Evidence basis: source coverage state prominent.
- Boundary notices: absence claims are source- and normalizer-bounded.
- Top evidence: matching or related evidence if any.
- Expected UI: no broad `never mentions` claim without complete proof.

### 18. Long Reader session then first Ask/Search open

- Input: first Ask/Search interaction after a long Reader session.
- Query understanding: normal after lazy load.
- Search plan: initialized only after explicit Ask/Search intent.
- Answer mode: normal for query.
- Evidence basis: normal for query.
- Boundary notices: none unless source availability requires it.
- Top evidence: first evidence cards within budget for installed core packs.
- Expected UI: Reader cold path had no Ask/Search worker or pack fetch; Ask/Search open respects performance budgets.

## Mandatory Trust Tests

Unsupported answer rendering is a severity-1 product bug.

Required tests:

1. No claim renders without typed support.
2. Ineligible source types cannot support claims.
3. Evidence-only mode blocks synthetic answer claims, but allows boundary/recovery explanation.
4. Weak or partial evidence states display visible boundaries.
5. Citation chips open the exact evidence item.
6. Cross-riwayah mapping warnings render when needed.
7. Same query plus same source packs plus same producer version gives the same claims, evidence cards, boundaries, and audit links; volatile metadata such as `generatedAt` may differ.
8. Source text is never generated from templates.
9. Reflection prompts cannot appear as claims.
10. Disabled sources cannot support claims.
11. Claim-bearing headings, labels, and generated study path titles require support.
12. No-answer mode renders recovery actions and never dead-ends.
13. Absence claims fail unless source coverage and normalization trace are complete.
14. Computed theme evidence cannot support broad claims such as `The Qur'an teaches...`.
15. Translation-only evidence cannot support Arabic morphology or root claims.
16. Tampered pack content with an old manifest disables claim eligibility.
17. Worker crash recovery degrades to classic search or retry state, not a blank page.
18. IndexedDB corruption triggers rebuild or disabled state, not silent bad evidence.
19. RTL/LTR mixed Arabic, English, citation chips, and keyboard navigation remain accessible.
20. Hafs token evidence cannot produce Qalun token-level highlighting unless mapping is proven.

Accessibility proof should explicitly account for WCAG 2.2 risks: mixed Arabic/English directionality, citation chips, accordions, audit panels, keyboard flow, and screen-reader labels.

Accessibility acceptance criteria:

- All citation chips are keyboard focusable and openable.
- Focus order follows visual order across Answer, Evidence Basis, Best Evidence, and Deepen.
- Arabic text uses correct `dir` and `lang` attributes.
- Mixed Arabic/English snippets preserve readable bidi ordering.
- Accordions expose expanded/collapsed state to assistive technology.
- Audit view remains navigable without pointer input.

## Implementation Boundary

This design document authorizes the complete feature direction and data contracts. It does not prescribe task order. Implementation planning should decompose the work into phases after this spec is accepted, likely starting with the deterministic `QueryUnderstanding`, `SearchPlan`, `EvidenceBundle`, `AnswerBrief`, and progressive UI scaffolding over the existing Search worker.
