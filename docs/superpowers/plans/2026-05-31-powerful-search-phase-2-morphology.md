# Powerful Search Phase 2 Morphology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add source-backed morphology, root, lemma, same written form, same-root, and Surah context depth after the morphology source/license gate passes.

**Architecture:** Phase 2 extends the Search builder with a verified manual morphology source-drop lane and optional morphology feature shards. The worker loads morphology features on demand, and UI panels label the data as Hafs source analysis without projecting Hafs word-level matches onto Qalun Reader text.

**Tech Stack:** Node import/build scripts, Search pack optional feature shards, shared contracts, Web Worker feature loading, React detail panels, Vitest builder/worker/UI tests.

---

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Required Reads

- Phase 0 and Phase 1 handoff entries.
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/search.md`
- `docs/context/data-model.md`
- `docs/superpowers/specs/2026-05-30-powerful-search-design.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files

- Create: `scripts/data/search/morphology/import.mjs`
- Create: `scripts/data/search/morphology/build.mjs`
- Create: `scripts/data/search/morphology/validate.mjs`
- Create: `src/search/morphology.ts`
- Create: `src/search-worker/morphology-executor.ts`
- Create: `src/components/search/SearchMorphologyPanel.tsx`
- Create: `tests/unit/scripts/search-morphology.test.mjs`
- Create: `tests/unit/react-search/morphology-worker.test.ts`
- Modify: `shared/search/manifest.ts`
- Modify: `shared/search/query.ts`
- Modify: `scripts/data/search/build.mjs`
- Modify: `scripts/data/cli.mjs`
- Modify: `scripts/ci/affected.mjs`
- Modify: `src/search-worker/query-executor.ts`
- Modify: `src/components/search/SearchExplorePanel.tsx`
- Modify: `src/components/search/SearchSourcePanel.tsx`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/surfaces/search.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/future.md`

## Dependency Gate

- [ ] Confirm Phase 0, Phase 1 data/lifecycle, Phase 1 worker, and Phase 1 UI handoff entries are `complete` before editing morphology code. If any predecessor is `partial`, `blocked`, or missing, stop and update the shared handoff log with the dependency blocker.

## Tasks

### Task 1: Confirm License Gate Before Code Promotion

- [ ] Read Phase 0 catalog records and handoff notes for morphology source/license status.
- [ ] Confirm catalog entries include source URL, license id, allowed local source filename, accepted checksum, expected source version, ayah coverage, token/row counts, and source availability notes.
- [ ] If the license gate is unresolved, update the shared handoff log as blocked with the exact missing license/source decision and stop this child plan.

### Task 2: Import And Validate Manual Morphology Source

- [ ] Create `scripts/data/search/morphology/import.mjs` to read the documented local source-drop path, verify filename, checksum, version, row counts, token counts, ayah coverage, and license metadata, then emit normalized build inputs with source checksums, transform version, `normalizerVersion`, `licenseIds`, source availability notes, morphology source id/version, accepted checksum, and transformed-data notes.
- [ ] Create `scripts/data/search/morphology/validate.mjs` for `--check` mode that rejects unknown source bytes, missing rows, duplicate token positions, invalid roots, invalid lemmas, and ayah coverage drift.
- [ ] Create `tests/unit/scripts/search-morphology.test.mjs` covering accepted source checksum, unknown checksum failure, coverage failure, duplicate token failure, and license metadata failure.
- [ ] Run `pnpm exec vitest run tests/unit/scripts/search-morphology.test.mjs`.

### Task 3: Build Optional Morphology Shards

- [ ] Modify `shared/search/manifest.ts` and `shared/search/query.ts` to include optional feature ids and query modes for `same-written-form`, `same-root`, `lemma`, and `surah-context`.
- [ ] Define explicit morphology feature dependencies in `SearchPackManifestV1.requires`: root dictionary, lemma dictionary, morphology rows, same written form postings, same-root postings, lemma postings, Surah context aggregates, and provenance shards.
- [ ] Create `scripts/data/search/morphology/build.mjs` to emit root dictionary, lemma dictionary, morphology rows, same written form postings, same-root postings, lemma postings, and Surah context aggregates.
- [ ] Modify `scripts/data/search/build.mjs` so Phase 2 morphology shards are included only when source/license validation passes and omitted with a clear check failure when requested without valid source.
- [ ] Modify `scripts/data/cli.mjs` so morphology validation/build is exercised by `pnpm run data -- check`, `pnpm run data -- build`, and full profiles when morphology is enabled.
- [ ] Modify `scripts/ci/affected.mjs` so morphology source-drop/catalog/script/shared-contract changes select data build and Search tests.
- [ ] Extend `tests/unit/scripts/search-morphology.test.mjs` for reproducible root/lemma counts, required dependency graph rejection, checksums, byte sizes, source ids, normalizer version, license ids, source availability notes, and transformed-data notes.
- [ ] Run `pnpm exec vitest run tests/unit/scripts/search-morphology.test.mjs`.
- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --skip=mushaf-pages`.

### Task 4: Add Worker Feature Loading

- [ ] Create `src/search/morphology.ts` with DTOs for same written form, same-root, lemma detail, morphology fields, root counts, and Surah context.
- [ ] Create `src/search-worker/morphology-executor.ts` to load morphology shards on demand, run same written form and same-root lookups, and return source-backed DTOs.
- [ ] Modify `src/search-worker/query-executor.ts` to route root/morphology modes to the morphology executor only when the active pack has the required feature and the worker has loaded and validated the full dependency closure.
- [ ] Ensure missing morphology feature returns `missing feature` panel-level errors rather than failing core search.
- [ ] Create `tests/unit/react-search/morphology-worker.test.ts` for same written form, same root, lemma detail, missing feature, source note presence, and no Reader word highlighting.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/morphology-worker.test.ts`.

### Task 5: Add Morphology UI Panels

- [ ] Create `src/components/search/SearchMorphologyPanel.tsx` for Same written form, Same root, lemma detail, and Surah context rows.
- [ ] Modify `SearchExplorePanel` to show relevant morphology sections for root/morphology queries and load them on demand.
- [ ] Modify `SearchSourcePanel` to include the required same-root note: `Same-root matches are morphological aids. They do not mean the verses have the same interpretation.`
- [ ] Include the exact Search source note in morphology detail states: `Search analysis currently uses a Hafs text source for word forms, roots, morphology, and wording patterns. The Reader opens verses in the Qalun text.`
- [ ] Use `Hafs source only`, `Word-level match not available in Reader text`, `Search source text`, and `Reader text` labels exactly where mapping requires them.
- [ ] Extend `tests/unit/react-search/search-route.test.tsx` for same-root warning, no Qalun word highlighting, source labels, and missing morphology feature states.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/search-route.test.tsx tests/unit/react-search/morphology-worker.test.ts`.

### Task 6: Verify Phase 2

- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --profile=full`.
- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run test`.
- [ ] Run `pnpm run build`.
- [ ] Run `node scripts/check-chunks.js`.
- [ ] Extend `tests/e2e/search/react-search.spec.ts` or `tests/e2e/search/react-search-offline.spec.ts` for morphology Source detail, missing morphology feature degradation, and no Reader word highlighting.
- [ ] Run `pnpm exec playwright test tests/e2e/search/react-search.spec.ts --grep \"morphology|same root\" --reporter=line` when the owning spec uses grep tags; otherwise run the full Search spec.
- [ ] Run `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --grep @offline --reporter=line`.
- [ ] Update docs for shipped Phase 2 morphology and move unimplemented memory graph scope to future docs.
- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `pnpm run validate` before marking Phase 2 release-ready.
- [ ] Run `git diff --check`.
- [ ] Update the shared handoff log with license status, source checksum, validation results, and Phase 3 dependencies.

## Self-Review

- Spec coverage: covers morphology license/source gate, manual source-drop verification, same written form, same root, lemma detail, Surah context, source notes, and no Qalun word-level projection.
- Placeholder scan: the plan stops explicitly if the license gate is unresolved and names the required blocker output.
- Type consistency: morphology feature ids extend `SearchPackManifestV1` and worker DTOs without changing Phase 1 core query behavior.
