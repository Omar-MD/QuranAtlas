# Powerful Search Phase 1 Worker Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deferred Search prototype with a deterministic lazy worker runtime for reference, Arabic text, translation/context, exact word form, and exact phrase search.

**Architecture:** The UI talks to a restartable Search worker through typed request/response envelopes. The worker owns pack loading, shard decoding, query normalization, cancellation, ranking, cursor windows, resident shard budgets, and typed errors; UI receives DTO windows only.

**Tech Stack:** TypeScript, Web Worker module, shared Search contracts, generated Search packs, Vitest worker/query tests.

---

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Required Reads

- `docs/superpowers/plans/2026-05-31-powerful-search-phase-0-contracts.md`
- `docs/superpowers/plans/2026-05-31-powerful-search-phase-1-data-pack-lifecycle.md`
- `docs/context/surfaces/search.md`
- `docs/context/surfaces/read.md`
- `docs/context/data-model.md`
- `tests/unit/AGENTS.md`

## Dependency Gate

- [ ] Confirm Phase 0 and Phase 1 data/lifecycle handoff entries are `complete` before editing worker runtime code. If either predecessor is `partial`, `blocked`, or missing, stop and update the shared handoff log with the dependency blocker.

## Files

- Create: `src/search/normalizer.ts`
- Create: `src/search/query-parser.ts`
- Create: `src/search/reference-parser.ts`
- Create: `src/search/pack-reader.ts`
- Create: `src/search/ranking.ts`
- Create: `src/search/cursors.ts`
- Create: `src/search/result-mapping.ts`
- Create: `src/search/client.ts`
- Create: `src/search-worker/search.worker.ts`
- Create: `src/search-worker/session.ts`
- Create: `src/search-worker/shard-cache.ts`
- Create: `src/search-worker/query-executor.ts`
- Create: `src/search-worker/cancellation.ts`
- Create: `tests/unit/react-search/query-parser.test.ts`
- Create: `tests/unit/react-search/pack-reader.test.ts`
- Create: `tests/unit/react-search/search-worker.test.ts`
- Create: `tests/unit/react-search/result-mapping.test.ts`
- Modify: `src/search/schema.ts`
- Modify: `src/search/search-engine.ts`
- Modify: `src/search/index-client.ts`
- Modify: `src/search/result-aliases.ts`
- Modify: `docs/context/surfaces/search.md`

## Tasks

### Task 1: Replace Prototype Query Schema

- [ ] Modify `src/search/schema.ts` so it re-exports or narrows Phase 0 shared contracts for `SearchQueryMode`, `SearchQueryAstV1`, `SearchResultDto`, `SearchResultWindow`, `SearchMappingState`, and `SearchWorkerErrorCode`.
- [ ] Remove prototype lane names that conflict with product language; use `arabic-text`, `translation`, `context`, `phrase`, and later `same-root` rather than `metadata`.
- [ ] Keep public DTOs serializable and free of `ArrayBuffer` shard data.

### Task 2: Implement Normalization, Reference Parsing, And Query Parsing

- [ ] Create `src/search/normalizer.ts` matching `scripts/data/search/normalizer.mjs` and Phase 0 fixtures.
- [ ] Create `src/search/reference-parser.ts` to parse ayah references such as `2:255`, `Surah 2 255`, and valid single-surah/ayah forms into Hafs graph refs.
- [ ] Create `src/search/query-parser.ts` to produce `SearchQueryAstV1` with query hash, mode, normalized tokens, phrase tokens, filters, and unsupported-query errors for empty, too-long, or Phase 2/3-only modes.
- [ ] Create `tests/unit/react-search/query-parser.test.ts` covering diacritized Arabic, undiacritized Arabic, hamza/alif variants, Quran marks, mixed Arabic/English, references, phrase boundaries, and unsupported root mode before Phase 2.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/query-parser.test.ts`.

### Task 3: Decode Pack Manifests And Shards

- [ ] Create `src/search/pack-reader.ts` to load an active `SearchPackManifestV1`, verify ABI major/minor, reject incompatible versions, fetch required core shards from the active Search cache, parse shard headers with `DataView`, validate table directories, checksums, and fixture ids, then expose read-only table accessors.
- [ ] Thread `AbortSignal` through active pack manifest load, shard fetch, shard decode, preload, `loadFeature`, and table scan helpers so worker restart or cancellation can stop large IO/decode work.
- [ ] Create `tests/unit/react-search/pack-reader.test.ts` covering good fixture decode, corrupt shard, wrong endian marker, unknown ABI major, over-budget shard, missing feature, and offline miss.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/pack-reader.test.ts`.

### Task 4: Implement Ranking And Cursor Windows

- [ ] Create `src/search/ranking.ts` with `rankVersion`, deterministic tie-breakers by match type, source ref order, token position, and result id.
- [ ] Create `src/search/cursors.ts` to encode and decode result cursors containing pack id, pack version, query hash, query AST version, rank version, sort, and last stable result key.
- [ ] Add cursor invalidation checks for pack/query/rank/sort changes.
- [ ] Extend `tests/unit/react-search/search-worker.test.ts` to cover stable ranking, deterministic tie-breakers, cursor pagination, and cursor invalidation.

### Task 5: Implement Explicit Reader Mapping

- [ ] Create `src/search/result-mapping.ts` using `src/data/verse-aliases.ts` only through explicit mapping states.
- [ ] Replace prototype fallback in `src/search/result-aliases.ts`; unmapped Hafs refs must return `no-reader-ayah-alignment` or `hafs-source-only`, not identity.
- [ ] Return `canOpenInRead` only for mapping states that validate reader refs.
- [ ] Always return `canHighlightWordsInRead: false` in Phase 1 because Qalun/Qaloon token alignment is not validated.
- [ ] Create `tests/unit/react-search/result-mapping.test.ts` for `same-wording-in-reader`, `corresponding-ayah-in-reader`, merged, split/different-boundary, missing alias, zero/one/multiple reader refs, `no-reader-ayah-alignment`, `hafs-source-only`, no token alignment, `canOpenInRead: false` for unmapped refs, and `Open in Read` URL generation only for validated single reader targets.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/result-mapping.test.ts`.

### Task 6: Implement Restartable Worker Session

- [ ] Create `src/search-worker/cancellation.ts` with request-scoped cancellation tokens, cooperative chunk helpers, and explicit cancelled acknowledgements.
- [ ] Create `src/search-worker/shard-cache.ts` with resident-shard memory budget, LRU/refcount unload behavior, feature unload, and `dispose()` cleanup.
- [ ] Create `src/search-worker/query-executor.ts` for reference search, Arabic exact/normalized search, translation/context search, exact word form search, and positional exact phrase search.
- [ ] Create `src/search-worker/session.ts` to maintain worker epoch, active pack identity, request ids, stale response suppression, activation generation invalidation, and typed worker errors.
- [ ] Create `src/search-worker/search.worker.ts` as the module worker entry that handles `init`, `preloadCore`, `query`, `loadFeature`, `cancel`, and `dispose`.
- [ ] Extend `tests/unit/react-search/search-worker.test.ts` for request ids, stale responses, cancellation during `preloadCore`, `loadFeature`, shard fetch, decode loops, posting scans, phrase checks, ranking loops, post-cancel cleanup/refcount release, restart mid-query, activation change mid-query, worker-owned buffers not transferred to UI, resident budget, corrupt/incompatible pack errors, and missing advanced pack degradation.
- [ ] Add a protocol matrix for every request type (`init`, `preloadCore`, `query`, `loadFeature`, `cancel`, `dispose`) covering success, typed error, stale epoch, activation change, cancelled acknowledgement, request id, worker epoch, pack id, pack version, and payload-or-error response shape.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/search-worker.test.ts`.

### Task 7: Implement UI-Facing Client

- [ ] Create `src/search/client.ts` to lazy-create the worker on first Search usage, restart stuck epochs, ignore stale responses, expose typed methods, and dispose on route teardown.
- [ ] Modify `src/search/index-client.ts` to delegate to the new client and remove prototype large JSON fetch assumptions.
- [ ] Modify `src/search/search-engine.ts` to either become a thin test-only pure executor or delete it after callers move to `query-executor.ts`.
- [ ] Add a static/unit guard that fails on generated Search pack imports, stable `/dataset/search/**/index.json` fetch contracts, and surviving prototype `SearchShard.entries` large-object APIs.
- [ ] Run `pnpm exec vitest run tests/unit/react-search`.

### Task 8: Verify Worker Runtime

- [ ] Run `pnpm run data -- check`.
- [ ] Run the Search builder/lifecycle tests from the data-pack plan.
- [ ] Run a targeted smoke that installs/activates the generated core pack through the lifecycle API, decodes it through `pack-reader.ts`, and executes one reference query and one Arabic token query through the worker.
- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run test -- tests/unit/react-search`.
- [ ] Run `pnpm run build`.
- [ ] Run `node scripts/check-chunks.js`.
- [ ] Update `docs/context/surfaces/search.md` with worker runtime behavior, mapping invariants, query modes, and error states.
- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `git diff --check`.
- [ ] Update the shared handoff log with worker protocol details, test commands, and any API names consumed by the UI plan.

## Self-Review

- Spec coverage: covers worker protocol, cancellation, result windows, typed errors, ranking/cursors, reference/query parsing, no large index imports, mapping, and no Qalun word highlighting.
- Placeholder scan: tasks name exact files, modes, errors, and validation commands.
- Type consistency: `SearchWorkerRequest`, `SearchWorkerResponse`, `SearchResultDto`, `SearchResultCursor`, and `SearchMappingState` remain the public runtime language.
