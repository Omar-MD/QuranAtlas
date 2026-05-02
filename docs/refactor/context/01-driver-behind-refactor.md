# Driver Behind The Data Refactor

## Why The Refactor Exists

The current QuranAtlas pipeline is strong for a reader app. It can reliably ingest, normalize, build, and serve Arabic text, translations, and tafsir.

But a tadabbur-oriented product requires more than text delivery.

It requires structured knowledge.

The current pipeline answers:

> “What text should be shown for this ayah?”

The future product must also answer:

> “What is this ayah about?”
> “What passage does it belong to?”
> “What themes does it carry?”
> “What should the user notice?”
> “What reflection prompt is appropriate here?”
> “What is tafsir-backed versus personal reflection?”
> “What related ayat deepen this theme?”
> “What can safely power AI guidance?”

The refactor exists because these questions cannot be answered well from raw tafsir blobs alone.

## Current Limitation

The existing pipeline is optimized for:

- source governance
- text normalization
- runtime delivery
- offline reader consumption
- riwayah/translation alignment

It is not yet optimized for:

- structured tadabbur
- theme-based journeys
- passage-aware UX
- reflection prompt selection
- AI retrieval and grounding
- scholarly claim traceability
- personalized revisiting of insights

## Required Shift

The product must evolve from:

```text
Qur'an text dataset
```

to:

```text
Qur'an text + knowledge graph + reflection scaffolding
```

This does not mean the reader becomes complex.

It means the data layer becomes richer so the UX can stay simple.

## Why Phase 01 Matters

Phase 01 introduces the Knowledge Lane.

This is the first step because reflection prompts, related ayat, AI support, and user journeys all need a structured base.

Without the Knowledge Lane, the app would have to rely on:

- brittle hardcoded UI logic
- raw tafsir search
- generic AI prompts
- manual one-off feature data

That would not scale.

## Strategic Outcome

After the refactor, QuranAtlas can support:

- passage headers
- theme chips
- related ayat
- guided tadabbur prompts
- reflection journeys
- tafsir-backed insights
- AI answers with citations
- offline reflection packs
- future personalization

without corrupting the reader pipeline.
