# Ask/Search Trust Platform

> Lazy audit, replay, provenance, source-pack, and debug machinery for Ask/Search. This document is platform-level; it MUST NOT add work to the v1 first answer paint path.

## Runtime Boundary

The v1 hot path is [ask-search-v1-runtime.md](ask-search-v1-runtime.md). Platform features in this document are generated only when the user opens a secondary surface or requests persistence/debuggability.

Platform capabilities MAY run for:

- Why this answer?
- Method & Sources.
- debug bundle export.
- debug replay export.
- developer diagnostics.
- post-answer instrumentation.

They MUST NOT block initial `AnswerPreview` render.

## Build-Time Pack Trust

Search pack trust validation and verification are build-time concerns only.

The build pipeline SHOULD validate:

- source catalog entries;
- license decisions;
- normalized source digests;
- transform versions;
- coverage proofs;
- generated manifest shape;
- shard checksums;
- schema versions;
- byte budgets.

Runtime readers MUST NOT perform manifest signature checks, runtime revocation checks, runtime content-hash verification, quarantine, rebuild, or source eligibility decisions as integrity proof. Runtime readers accept only schema-compatible parseable assets and disable unreadable source families.

Runtime MAY compare cached bytes against manifest-declared checksums only to reject corrupt or incomplete cache entries after explicit Ask/Search intent. This check MUST NOT be described as source trust verification, revocation, quarantine, or claim eligibility proof.

Platform status fields MUST NOT use `verified` for browser-visible or UI-facing copy. If build validation must be exposed in diagnostics, use `buildValidationDeclared`.

## Platform Source Pack Status

```ts
type PlatformSourcePackStatus = {
  packId: string;
  version: string;
  sourceIds: string[];
  buildValidationDeclared: boolean;
  runtimeCompatible: boolean;
  claimEligibilityDeclared: boolean;
  contentHash?: string;
  manifestHash?: string;
  failureReason?: string;
};
```

`claimEligibilityDeclared` is a build/platform projection for diagnostics. It MUST NOT be computed from browser-side trust, hash, or revocation checks, and it MUST NOT override `AnswerPreview.sourceFamilyStatuses`.

Detailed signing, provenance, revocation policy, source fetching, and migration behavior belongs in the source-pack build pipeline or data/source-flow docs, not the v1 runtime spec.

## Lazy Audit

`AnswerAudit` is generated only after `AnswerPreview` exists.

```ts
type AnswerAudit = {
  answerPreviewId: string;
  claims: Array<{
    claimId: string;
    supportId: string;
    evidenceAtomIds: string[];
    sourceIds: string[];
    opensEvidenceCardId: string;
  }>;
  sourceEligibility: Array<{
    sourceId: string;
    sourceKind: string;
    claimEligible: boolean;
    reason?: string;
  }>;
  boundaryNotices: string[];
};
```

Audit is explanatory and navigational. It MUST project from `AnswerPreview.claimSupports` and `AnswerPreview.evidenceAtoms`; it MUST NOT create independent support state or new claim text.

## Method & Sources

Method & Sources is lazy and SHOULD include:

- source IDs and versions;
- source-pack statuses;
- query lens and intent;
- searched lanes;
- excluded source families;
- normalizer/ranker versions when available;
- Reader mapping notes.

It MUST NOT be required for first answer paint.

## Retrieval Snapshots And Replay

Retrieval snapshots are lazy. They are required for:

- audit export;
- debug replay export;
- bug report;
- deterministic regression fixture generation.

```ts
type RetrievalSnapshot = {
  query: string;
  selectedLens: string;
  selectedCandidateId?: string;
  sourcePackStatuses: PlatformSourcePackStatus[];
  normalizerVersion: string;
  rankerVersion: string;
  recipeVersion: string;
  evidenceAtomIds: string[];
  claimSupportIds: string[];
};

type ReplayBundle = {
  answerPreviewId: string;
  retrievalSnapshot: RetrievalSnapshot;
  evidenceBundleHash: string;
  supportGraphHash: string;
  answerPreviewHash: string;
};
```

Replay recomputes from canonical source packs and metadata. Saved replay data MUST NOT be used as claim support.

## Canonical Hashing

Canonical hashing is lazy and SHOULD use stable JSON canonicalization.

Hashes SHOULD exclude:

- `generatedAt`;
- UI focus IDs;
- cache timing state;
- transient load failures that do not affect answerability;
- precomputed hash fields.

Hashes SHOULD include:

- query understanding stable projection;
- search plan stable projection;
- evidence atom stable identities;
- claim support graph;
- source IDs and versions;
- ranker/normalizer/recipe versions.

## Observability

Platform observability SHOULD be privacy-preserving and coarse by default.

Allowed default metrics:

- query understanding timing bucket;
- worker startup timing bucket;
- initial preview timing bucket;
- answerability status;
- evidence-only/no-answer rate;
- source-family unavailable count;
- parser/load failure code;
- citation open failure count.

Default telemetry MUST NOT include:

- raw query text;
- normalized query text;
- selected verse text;
- source excerpts;
- saved-search text;
- user notes.

## Correctness SLOs

Platform correctness goals:

- Unsupported answer prevention: 100% target.
- Citation integrity: 99.99% of rendered citation chips open a valid evidence item.
- Reader cold-start protection: 99.9% of Reader cold launches do not initialize Ask/Search work.
- Runtime source failure safety: malformed, incompatible, missing, or unreadable Search assets fail closed.

These SLOs are not permission to add runtime trust verification. They measure runtime safety and product behavior.

## Debug Bundle

A debug bundle MAY include:

- `AnswerPreview`;
- `AnswerAudit`;
- `RetrievalSnapshot`;
- source-pack statuses;
- error codes;
- timing buckets;
- app version.

It MUST redact source excerpts and user query text unless an explicit future privacy policy and user opt-in allow inclusion.

## Platform Acceptance Checklist

- [ ] Full audit is lazy.
- [ ] Method & Sources is lazy.
- [ ] Retrieval snapshots are lazy.
- [ ] Canonical hashing is lazy.
- [ ] Replay export never uses saved snapshots as claim support.
- [ ] Platform status fields do not imply browser-side pack verification.
- [ ] Telemetry excludes raw user/source text by default.
- [ ] Parser/load failures degrade safely without unsupported answers.
- [ ] Platform code does not load on Reader cold launch.
