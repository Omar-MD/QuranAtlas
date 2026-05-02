# Implementation Checklist

## Phase 1 Checklist — Knowledge Lane

### Data Files

- [ ] Create `data/taxonomy/themes.json`
- [ ] Create `data/normalized/knowledge/passages.json`
- [ ] Create `data/normalized/knowledge/ayah-themes.json`

### Scripts

- [ ] Add `scripts/data/build-knowledge-dataset.mjs`
- [ ] Validate ayah keys
- [ ] Validate passage ranges
- [ ] Validate theme ids
- [ ] Emit per-surah ayah knowledge files
- [ ] Emit per-surah passage files
- [ ] Emit `theme-to-ayah.json`

### Runtime

- [ ] Add `src/data/knowledge-dataset.ts`
- [ ] Add loader for surah knowledge
- [ ] Add loader for surah passages
- [ ] Add helper: `getPassageForAyah`
- [ ] Add helper: `getThemesForAyah`

### Manifest

- [ ] Add knowledge files to manifest
- [ ] Add knowledge lane metadata
- [ ] Add offline category for knowledge-core if needed

### Tests

- [ ] Unit test invalid ayah key fails build
- [ ] Unit test missing theme id fails build
- [ ] Unit test valid passage emits expected file
- [ ] Runtime test missing knowledge file does not break reader

## Phase 2 Checklist — Reflection Lane

### Data Files

- [ ] Create `data/taxonomy/prompt-lenses.json`
- [ ] Create `data/normalized/reflection/prompts.json`

### Scripts

- [ ] Add `scripts/data/build-reflection-dataset.mjs`
- [ ] Validate prompt ids are unique
- [ ] Validate prompt ayah ranges
- [ ] Validate lens ids
- [ ] Validate difficulty values
- [ ] Emit per-surah prompt files

### Runtime

- [ ] Add `src/data/reflection-dataset.ts`
- [ ] Add loader for surah prompts
- [ ] Add helper: `getPromptsForAyah`
- [ ] Add helper: `getReflectionEntryPoint`

### UX

- [ ] Add reflection action to ayah interaction UI
- [ ] Show one prompt by default
- [ ] Add “More lenses” expansion
- [ ] Add fallback prompt for ayat without curated prompts

### Tests

- [ ] Unit test prompt selection
- [ ] Unit test fallback prompt
- [ ] E2E: reader still opens without reflection dataset
- [ ] E2E: ayah reflection bottom sheet opens with prompt

## Later Checklist — Claims

- [ ] Add `data/taxonomy/claim-types.json`
- [ ] Add `data/taxonomy/certainty-levels.json`
- [ ] Define claim schema
- [ ] Build claim extraction prototype
- [ ] Add scholarly review status
- [ ] Link claims to ayat
- [ ] Link claims to source ids
- [ ] Add claim validation

## Later Checklist — Search/RAG

- [ ] Define chunk schema
- [ ] Build chunks from tafsir and claims
- [ ] Build ayah-to-chunks index
- [ ] Build source-to-chunks index
- [ ] Add citation metadata
- [ ] Add retrieval tests
- [ ] Add AI guardrail tests
