# Powerful Search Phase 3 Memory Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Quran memory graph MVP with attested following wording, shared wording, repeated phrases, occurs-once phrases, ayah endings, and Counts & patterns workflows.

**Architecture:** Phase 3 adds bounded optional graph shards generated from the Search corpus using the Phase 0 phrase/window policy. Explore panels request graph sections lazily, order sections by query relevance and source confidence, and expose source/boundary policy for every count and pattern.

**Tech Stack:** Node Search graph builder, optional binary shards, Web Worker feature executors, React lazy Explore panels, Vitest builder/worker/UI tests, Playwright Search journeys.

---

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Required Reads

- Phase 0, Phase 1, and Phase 2 handoff entries.
- `docs/superpowers/specs/2026-05-30-powerful-search-design.md`
- `docs/context/surfaces/search.md`
- `docs/context/source-data-flow.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files

- Create: `scripts/data/search/graph/build.mjs`
- Create: `scripts/data/search/graph/phrase-windows.mjs`
- Create: `scripts/data/search/graph/counts.mjs`
- Create: `src/search/graph.ts`
- Create: `src/search-worker/graph-executor.ts`
- Create: `src/components/search/SearchGraphExplore.tsx`
- Create: `src/components/search/SearchCountsPatterns.tsx`
- Create: `tests/unit/scripts/search-graph.test.mjs`
- Create: `tests/unit/react-search/graph-worker.test.ts`
- Modify: `tests/unit/react-search/search-route.test.tsx`
- Modify: `shared/search/manifest.ts`
- Modify: `shared/search/query.ts`
- Modify: `scripts/data/search/build.mjs`
- Modify: `src/search-worker/query-executor.ts`
- Modify: `src/components/search/SearchExplorePanel.tsx`
- Modify: `src/components/search/SearchSourcePanel.tsx`
- Modify: `tests/e2e/search/react-search.spec.ts`
- Modify: `tests/e2e/search/react-search-offline.spec.ts`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/surfaces/search.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/future.md`

## Tasks

### Task 0: Verify Dependency Gate

- [ ] Confirm Phase 0, Phase 1, and Phase 2 handoff entries are `complete` before editing memory-graph code. If any predecessor is `partial`, `blocked`, or missing, stop and update the shared handoff log with the dependency blocker.

### Task 1: Lock Phrase And Graph Budgets

- [ ] Read the Phase 0 phrase/window policy and Phase 1 pack byte budgets.
- [ ] Modify shared contracts to add feature ids for `following-wording`, `shared-wording`, `repeated-phrases`, `occurs-once`, `ayah-endings`, and `counts-patterns`.
- [ ] Define graph materialization limits for max n-gram length, max phrase window count per source unit, ayah boundary behavior, surah boundary behavior, Bismillah handling, max shard bytes, max decoded shard bytes, and worker resident memory estimate.
- [ ] Add contract tests that reject graph builds exceeding max n-gram length, max phrase-window count per source unit, max shard bytes, max decoded shard bytes, and worker resident memory estimates before byte-budget checks can be bypassed.

### Task 2: Build Graph Shards

- [ ] Create `scripts/data/search/graph/phrase-windows.mjs` to enumerate token windows according to boundary policy and max n-gram rules.
- [ ] Create `scripts/data/search/graph/counts.mjs` to compute phrase counts, root counts where Phase 2 roots exist, Surah distribution, ayah endings, and adjacency counts.
- [ ] Create `scripts/data/search/graph/build.mjs` to emit attested following wording indexes, shared wording adjacency, repeated phrase counts, occurs-once phrase indexes, ayah endings, counts/patterns aggregates, feature dependency graph, checksums, and byte plan.
- [ ] Modify `scripts/data/search/build.mjs` to include graph shards when Phase 3 features are enabled and fail when budgets are exceeded.
- [ ] Create `tests/unit/scripts/search-graph.test.mjs` for following wording counts, repeated phrase counts, occurs-once counts, shared wording adjacency, ayah endings, boundary policy, Bismillah handling, max n-gram limit, per-unit phrase-window cap, deterministic skip/reject behavior for over-limit windows, byte-budget gates, and deterministic output.
- [ ] Run `pnpm exec vitest run tests/unit/scripts/search-graph.test.mjs`.
- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --profile=full`.

### Task 3: Add Worker Graph Execution

- [ ] Create `src/search/graph.ts` with DTOs for following wording, shared wording, repeated phrases, occurs-once phrases, ayah endings, Counts & patterns summaries, source policy rows, and unavailable feature states.
- [ ] Create `src/search-worker/graph-executor.ts` to load graph shards on demand, compute relevant Explore sections, and return bounded windows with cursors.
- [ ] Modify `src/search-worker/query-executor.ts` so graph sections are loaded by explicit `loadFeature` or Explore requests, not by core query execution.
- [ ] Ensure missing graph packs return panel-level unavailable states while core search remains usable.
- [ ] Create `tests/unit/react-search/graph-worker.test.ts` for following wording, shared wording, repeated phrases, occurs-once, ayah endings, counts/patterns, lazy feature loading, missing feature states, and cursor pagination.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/graph-worker.test.ts`.

### Task 4: Add Memory Graph Explore UI

- [ ] Create `src/components/search/SearchGraphExplore.tsx` with lazy sections: Attested following wording, Shared wording, Repeated phrases, Occurs once in this index, and Ayah endings.
- [ ] Create `src/components/search/SearchCountsPatterns.tsx` for token counts, phrase counts, root counts, Surah distribution, ayah endings, and adjacency counts with text equivalents for any chart-like summary.
- [ ] Modify `SearchExplorePanel` to order sections by query type and source confidence, collapse expensive sections by default on phone, and load sections on demand.
- [ ] Modify `SearchSourcePanel` to show boundary policy and source policy for counts, patterns, ayah endings, repeated phrases, and occurs-once phrases.
- [ ] Use and test required notes exactly:
  - `Results show attested wording in the indexed Quran text. They are not generated suggestions, paraphrases, or tafsir.`
  - `Shared wording shows lexical overlap in the indexed text. It does not mean the verses have the same interpretation, ruling, theme, or sabab.`
  - `Attested following wording shows wording observed after this phrase in the indexed text.`
  - `"Occurs once" means once in the current Search index, according to its text and tokenization.`
- [ ] Do not introduce prediction, probability, autocomplete, suggested verse, semantic answer, tafsir, or generated Quran text language.
- [ ] Extend `tests/unit/react-search/search-route.test.tsx` for relevance ordering, phone collapsed sections, keyboard-accessible disclosures, source/boundary policy visibility, exact required notes, and panel-level missing-pack degradation.
- [ ] Run `pnpm exec vitest run tests/unit/react-search`.

### Task 5: Add Browser Journey Coverage

- [ ] Extend `tests/e2e/search/react-search.spec.ts` for a phrase query that opens Attested following wording, Shared wording, Repeated phrases, Occurs once in this index, Ayah endings, and Counts & patterns.
- [ ] Add assertions that source/boundary policy is visible and that following wording is not presented as prediction or autocomplete.
- [ ] Add assertions for the exact wording, shared-wording, attested-following-wording, and occurs-once notes.
- [ ] Add mobile assertions that expensive Explore sections default collapsed and remain keyboard accessible.
- [ ] Run `pnpm exec playwright test tests/e2e/search/react-search.spec.ts --reporter=line`.
- [ ] Run `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --grep @offline --reporter=line` for missing graph-pack degradation when offline.

### Task 6: Verify Phase 3

- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --profile=full`.
- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run test`.
- [ ] Run `pnpm run build`.
- [ ] Run `node scripts/check-chunks.js`.
- [ ] Run targeted Search Playwright specs under `tests/e2e/search/`.
- [ ] Run `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --grep @offline --reporter=line`.
- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `pnpm run validate`.
- [ ] Run `git diff --check`.
- [ ] Update the shared handoff log with final MVP status, validation results, remaining deferred scope, and release-readiness note.

## Self-Review

- Spec coverage: covers attested following wording, shared wording, repeated phrases, occurs-once, ayah endings, Counts & patterns, relevance ordering, lazy loading, missing-pack degradation, source/boundary policy, and no generated/interpretive language.
- Placeholder scan: graph tasks name exact features, files, budget checks, and validation commands.
- Type consistency: graph features extend `SearchPackManifestV1` and worker DTOs while keeping Phase 1 core Search independent.
