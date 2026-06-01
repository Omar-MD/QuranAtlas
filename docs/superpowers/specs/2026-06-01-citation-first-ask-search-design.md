# Citation-First Ask/Search Design

> Lean architecture split for QuranAtlas Ask/Search. This file is the entry point; implementation details live in the three linked specs.

## Executive Summary

Ask/Search is reduced from a complete platform specification to a phased capability centered on the first fast, safe study loop:

```text
Ask
  -> understand the query lightly
  -> retrieve source-backed evidence
  -> decide answerability
  -> render AnswerPreview
  -> show compact Evidence Basis and Best Evidence
  -> open evidence in Reader
  -> lazy-load method/audit details only when requested
```

What was simplified:

- The v1 hot path now returns `AnswerPreview`, not full `AnswerBrief` / audit / replay bundles.
- V1 source scope is limited to Qur'an text, translation, morphology, and reader mapping.
- Tafsir, asbab, hadith, themes, cross-reference graphs, study paths, reflection prompts, LLM/RAG, and server-assisted retrieval are out of v1.
- Full audit, retrieval snapshots, canonical hashing, replay records, detailed source-pack provenance, observability, and debug bundles are lazy platform capabilities.
- Reader First is explicit: no Ask/Search chunk, worker, source-pack request, index request, Search IndexedDB activity, or service-worker precache entry before explicit Ask/Search intent.

Trust guarantees preserved:

- No generated source text.
- Citation chips render only when they resolve to typed evidence.
- Every rendered answer claim requires support.
- `AnswerabilityDecision` is canonical.
- Translation evidence cannot support Arabic morphology/root claims.
- Computed or future theme/cluster evidence cannot support broad theological claims.
- Hafs token-level evidence cannot imply Qalun token-level alignment unless mapping is proven.
- V1 blocks absence claims as answer prose.
- Legal, medical, fiqh, personal-crisis, personal spiritual counselling, emotional crisis guidance, individualized pastoral advice, broad theological, and inflammatory religious attack boundaries remain first-class.
- LLM/RAG runtime answering is not approved.
- Search pack trust validation/verification remains build-time only; runtime only performs schema/parser/cache/load safety and graceful degradation after explicit Ask/Search intent.

## Document Structure

| Document | Purpose |
| --- | --- |
| [ask-search-v1-runtime.md](ask-search-v1-runtime.md) | Implementation-ready v1 runtime contract for the hot path. |
| [ask-search-trust-platform.md](ask-search-trust-platform.md) | Lazy platform/audit/debug/replay/source-pack trust machinery. |
| [ask-search-extension-roadmap.md](ask-search-extension-roadmap.md) | Deferred source families and future capabilities gated by the v1 trust kernel. |

## V1 Runtime

The v1 runtime spec owns only the first answer/evidence loop:

- product goal;
- non-negotiable trust invariants;
- v1 source scope;
- client-side modular monolith architecture;
- `QueryUnderstandingLite`;
- `SearchPlanLite`;
- `EvidenceAtom`;
- `ClaimSupport`;
- `AnswerClaim`;
- `AnswerabilityDecision`;
- `AnswerPreview`;
- `SourceFamilyStatusLite`;
- `EvidenceCardLite`;
- `MatchCardLite`;
- `EvidenceBasisLite`;
- `NoAnswerRecoveryLite`;
- v1 claim authority matrix;
- worker protocol;
- citation invariants;
- Reader cold-start constraints;
- complexity and performance budgets;
- v1 mandatory tests and golden scenarios.

## Moved To Platform

These are still important, but they do not belong on the first answer paint path:

- full `AnswerAudit`;
- `RetrievalSnapshot`;
- canonical hashing;
- replay bundles;
- Method & Sources payload;
- source-pack build validation/provenance details;
- observability and correctness SLOs;
- telemetry privacy;
- bug-report/debug bundles.

See [ask-search-trust-platform.md](ask-search-trust-platform.md).

## Deferred Extensions

These are extension capabilities, not v1 requirements:

- tafsir;
- asbab;
- hadith-linked evidence;
- disagreement summaries;
- computed themes;
- cross-reference graph;
- study paths;
- reflection prompts;
- future LLM/RAG producer interface;
- server-assisted retrieval escalation.

See [ask-search-extension-roadmap.md](ask-search-extension-roadmap.md).

## Removed / Deferred Bloat Table

| Original item | Problem | Decision | New location | Reason |
| --- | --- | --- | --- | --- |
| Full `AnswerAudit` | Too heavy for first paint | Lazy | Trust platform | Audit-capable, not audit-first. |
| `RetrievalSnapshot` on hot path | Forces hashing/provenance before answer | Lazy | Trust platform | Needed for replay/debug, not initial UX. |
| Canonical hashing everywhere | Adds complexity and payload | Lazy | Trust platform | Stable replay can be generated on demand. |
| Detailed `PackManifest` / provenance | Platform/source-pack concern | Move | Trust platform | V1 only needs source availability and claim eligibility. |
| Browser-side trust verification / revocation | Conflicts with build-time-only trust validation | Prohibit | Trust platform clarifies build-time | Runtime load safety is allowed only to fail closed after explicit Ask/Search intent. |
| Tafsir/asbab/hadith | Large source and authority surface | Defer | Extension roadmap | Requires separate trust and UX work. |
| Theme/cross-reference/computed cluster evidence | Easy to overclaim | Defer | Extension roadmap | Cannot support broad theological claims in v1. |
| Study paths / reflection prompts | Adds product scope before core loop is proven | Defer | Extension roadmap | V1 should answer/search first. |
| Future LLM/RAG producer | Not approved runtime path | Defer | Extension roadmap | Must satisfy same evidence contract later. |
| Server-assisted retrieval | Adds infra and hot-path dependency | Defer | Extension roadmap | Client-side modular monolith first. |
| Full Method & Sources by default | Makes UI audit-dashboard-like | Lazy | Trust platform | Available when requested. |
| Broad observability catalog | Not required for v1 rendering | Move | Trust platform | Keep correctness metrics without bloating runtime spec. |

## Architecture Sanity Check

Simpler: v1 has one small pipeline, four source types, one canonical evidence store, and one answer preview object.

Faster: no Ask/Search work appears on Reader cold launch; the worker starts only after explicit intent; audit/replay/hash generation is lazy.

Safer: answerability, citation support, evidence typing, and boundary notices remain mandatory. Heavy future source families are not allowed to leak claims into v1.

Easier to implement: engineers can build `AnswerPreview`, preview evidence cards, and lazy match cards without first implementing full audit, source-pack provenance, tafsir/asbab, or replay export.

Still extensible: platform and extension docs define where heavier source families, replay, LLM/RAG, and server-assisted retrieval can be added if they satisfy the v1 trust kernel.

## Final Acceptance Checklist

- [ ] Reader cold route contains no Ask/Search route chunk request, modulepreload, worker startup, source-pack/index request, Search IndexedDB open/read/write, or service-worker precache entry.
- [ ] V1 response uses `AnswerPreview`, not full audit/replay payloads.
- [ ] V1 payload stays within the complexity budget.
- [ ] V1 evidence types are only Qur'an text, translation, morphology, and reader mapping.
- [ ] Every answer claim resolves to `ClaimSupport` and typed `EvidenceAtom` records.
- [ ] Source text, excerpts, morphology rows, and metadata displayed in UI fields are copied from linked typed evidence.
- [ ] No-answer claim permissions carry an empty `claims` array.
- [ ] Every supported claim passes the v1 claim authority matrix.
- [ ] Citation chips open exact evidence targets.
- [ ] Translation-only evidence cannot support Arabic claims.
- [ ] Hafs/Qalun token boundary is explicit.
- [ ] Absence claims do not render as v1 answer prose.
- [ ] Legal, medical, fiqh, personal-crisis, personal spiritual counselling, emotional crisis guidance, individualized pastoral advice, broad theological, and inflammatory religious attack boundaries block unsupported advice.
- [ ] All Matches first page is lazy and bounded by the worker.
- [ ] Full audit, Method & Sources, replay, and canonical hashes are lazy.
- [ ] Tafsir/asbab/hadith/theme/cross-reference/study-path/LLM features are deferred and gated.
- [ ] No runtime Search pack trust verification, revocation, quarantine, or rebuild path is introduced.
