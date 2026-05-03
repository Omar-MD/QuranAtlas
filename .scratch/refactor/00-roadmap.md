# QuranAtlas Data Refactor Roadmap

## Purpose

This document defines the phased refactor plan for evolving QuranAtlas from a reader-first Quran app into a reader-first Quran app with scalable tadabbur, knowledge, reflection, and AI-assist capabilities.

## Guiding Principle

Do not disturb the reader pipeline unless necessary.

The current reader dataset is already a strong foundation:

- `data/catalog/**` declares source policy.
- `data/normalized/**` stores committed normalized inputs.
- `public/dataset/**` is the runtime-facing output.
- `src/data/dataset.ts` is the runtime access boundary.

The refactor should extend the system with new lanes rather than rewrite the existing one.

## Target Architecture

QuranAtlas should support four data lanes:

1. **Text Lane**
   - Arabic riwayat
   - translations
   - tafsir
   - surah/juz metadata
   - verse aliases

2. **Knowledge Lane**
   - ayah themes
   - passage structure
   - concepts
   - divine names
   - cross-references
   - scholarly claims later

3. **Reflection Lane**
   - prompts
   - lenses
   - suggested actions
   - guided tadabbur scaffolds

4. **Search / AI Lane**
   - lexical indexes
   - RAG chunks
   - embeddings if needed
   - citation maps

## Phased Plan

### Phase 1 — Add Knowledge Lane Skeleton

Goal: Add minimal ayah and passage knowledge without changing reader behavior.

Add:

```text
data/taxonomy/themes.json
data/normalized/knowledge/passages.json
data/normalized/knowledge/ayah-themes.json
scripts/data/build-knowledge-dataset.mjs
src/data/knowledge-dataset.ts
public/dataset/knowledge/**
```

Runtime capabilities:

- Load passage context for a surah.
- Load ayah theme tags.
- Show basic “this passage is about…” UI.
- Power related ayat by theme.

Do not add AI yet.

### Phase 2 — Add Reflection Lane

Goal: Add curated reflection prompts that can appear naturally inside the reader UX.

Add:

```text
data/taxonomy/prompt-lenses.json
data/normalized/reflection/prompts.json
scripts/data/build-reflection-dataset.mjs
src/data/reflection-dataset.ts
public/dataset/reflection/**
```

Runtime capabilities:

- Load reflection prompts per surah.
- Select one appropriate prompt per ayah.
- Support beginner/intermediate/advanced prompts.
- Support bottom-sheet reflection UX.

### Phase 3 — Add Claim Extraction

Goal: Convert tafsir and scholarly sources into small, citable knowledge atoms.

Add:

```text
data/taxonomy/claim-types.json
data/taxonomy/certainty-levels.json
data/normalized/knowledge/claims/{sourceId}.json
scripts/data/extract-tafsir-claims.mjs
scripts/data/build-claims-dataset.mjs
```

Runtime capabilities:

- Distinguish tafsir-backed meaning from personal reflection.
- Power AI guardrails.
- Show “supported by source” citations.

### Phase 4 — Add Search / RAG Lane

Goal: Enable AI-assisted tadabbur using structured retrieval instead of raw source dumping.

Add:

```text
scripts/data/build-search-dataset.mjs
public/dataset/search/rag/**
public/dataset/search/lexical/**
src/data/search-dataset.ts
```

Runtime capabilities:

- Retrieve relevant tafsir chunks.
- Retrieve related claims.
- Build AI responses with provenance.
- Support offline or online search depending on product decision.

## Non-Goals For Early Phases

Do not start with:

- embeddings
- full AI synthesis
- massive claim extraction
- social reflections
- complex personalization
- neutral cross-riwayah semantic verse units

These are valuable later but will slow down the first practical refactor.

## Immediate Recommendation

Start with Phase 1 and Phase 2 only.

This creates real user-visible value while keeping the codebase understandable.
