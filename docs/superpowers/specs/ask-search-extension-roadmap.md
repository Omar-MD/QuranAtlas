# Ask/Search Extension Roadmap

> Deferred capabilities for Ask/Search. Extensions MAY be implemented only after the v1 runtime trust kernel is stable.

## Gate For Every Extension

Every extension MUST satisfy [ask-search-v1-runtime.md](ask-search-v1-runtime.md):

- no generated source text;
- typed evidence;
- claim support for every rendered claim;
- source-family-specific authority rules;
- answerability before prose;
- citation chips that open exact evidence;
- Reader First cold-start constraints;
- no LLM/RAG runtime answering unless separately approved;
- no runtime Search pack trust verification, revocation, quarantine, or rebuild path.

Extensions MUST NOT add work to Reader cold launch or v1 first answer paint unless explicitly promoted into the v1 runtime spec.

## Deferred Source Families

| Extension | Status | Gate |
| --- | --- | --- |
| Root lexicon | Optional v1.5 | Must distinguish lexicon definition from Qur'an occurrence. |
| Lemma index | Optional v1.5 | Must be source-backed and cannot overclaim meaning. |
| Tafsir | Deferred | Source-attributed only; no app-voice `this verse means...` claims. |
| Asbab | Deferred | Evidence-only until report status and disagreement handling are robust. |
| Hadith-linked evidence | Deferred | Requires curated licensed corpus and report-status policy. |
| Theme taxonomy | Deferred | Cannot support broad `The Qur'an teaches...` claims. |
| Cross-reference graph | Deferred | Must distinguish editorial/computed links from source claims. |
| Computed clusters | Deferred | Display/search aid only unless a future authority rule permits a narrow claim. |

Optional v1.5 source families are roadmap items. They MUST NOT appear in v1 `AnswerPreview` payloads unless the v1 runtime spec is explicitly updated.

## Tafsir

Tafsir may later support source-attributed summaries:

```text
[Source] explains...
```

It MUST NOT let QuranAtlas speak from app voice as:

```text
The Qur'an means...
Islam says...
The ruling is...
```

Material disagreement between tafsir sources MUST render separated source cards and a disagreement notice, not merged confident prose.

## Asbab

Asbab may later support source-attributed report language:

```text
[Source] reports...
```

Asbab MUST remain evidence-only until QuranAtlas has report-status handling, disagreement handling, and clear source limitations.

## Hadith-Linked Evidence

Hadith-linked evidence is future-only. It requires:

- curated and licensed corpus;
- report identity and source status;
- source-attributed wording;
- no personal fiqh/fatwa output;
- boundary notices where legal application is implied.

## Themes And Computed Evidence

Computed themes and semantic clusters MAY help browsing and discovery.

They MUST NOT support broad theological answer claims such as:

```text
The Qur'an teaches...
Islam says...
```

V1-compatible wording remains narrow:

```text
The system found related verses...
This source classifies...
```

## Cross-Reference Graph

Cross-reference graph edges MAY include:

- shared root;
- shared lemma;
- same phrase;
- editorial cross-reference;
- computed similarity.

Every edge MUST expose whether it is source-attested, editorial, or computed. Computed links are navigation aids, not theological claims.

## Study Paths And Reflection Prompts

Study paths and reflection prompts are deferred product features.

If added later, they MUST be:

- procedural by default;
- non-claim-bearing unless support is provided;
- limited on the first screen;
- disabled for crisis, legal, medical, abusive, and personal fiqh flows.

## Future LLM/RAG Producer Interface

LLM/RAG is not approved for runtime answering.

A future producer MAY be considered only if:

- it cannot generate source text;
- every claim resolves to typed evidence;
- unsupported output degrades to evidence-only;
- deterministic trust tests still pass or are strengthened;
- model output cannot create source facts, verse text, translation text, morphology, tafsir, asbab, or source metadata.

## Server-Assisted Retrieval Escalation

Server-assisted retrieval MAY be considered only if one or more conditions become true:

- installed source packs exceed realistic device storage budgets;
- licensing prevents local source packs;
- target mobile query latency is unacceptable;
- shared ranking becomes product-critical;
- freshness requirements exceed local build/update cadence.

Server-assisted retrieval MUST NOT become a Reader hot-path dependency.

## Extension Acceptance Checklist

- [ ] Extension has explicit source authority rules.
- [ ] Extension cannot render claims without typed evidence.
- [ ] Extension cannot generate source text.
- [ ] Extension does not load on Reader cold launch.
- [ ] Extension does not bloat v1 `AnswerPreview`.
- [ ] Extension has evidence-only/no-answer behavior for unsupported claims.
- [ ] Extension preserves legal/medical/fiqh/crisis boundaries.
- [ ] Extension avoids runtime Search pack trust verification, revocation, quarantine, or rebuild paths.
