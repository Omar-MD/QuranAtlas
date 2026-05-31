# Powerful Search Phase 0 Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the source, license, ABI, mapping, normalization, cache ownership, storage, and documentation contracts that must exist before Search route promotion.

**Architecture:** Phase 0 adds shared TypeScript contracts and script-side JSON schemas without shipping the route. It documents the Search surface and source-data boundaries, blocks unstable pack URL shapes, and provides fixtures that later builder, worker, storage, and UI plans consume.

**Tech Stack:** TypeScript shared contracts, Node data scripts, JSON catalog records, Vitest contract tests, generated docs via `pnpm run docs`.

---

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/infra.md`
- `docs/context/style-map.md`
- `tests/unit/AGENTS.md`
- `docs/superpowers/specs/2026-05-30-powerful-search-design.md`

## Files

- Create: `shared/search/abi.ts`
- Create: `shared/search/manifest.ts`
- Create: `shared/search/mapping.ts`
- Create: `shared/search/normalization.ts`
- Create: `shared/search/query.ts`
- Create: `shared/search/worker-protocol.ts`
- Create: `shared/search/fixtures.ts`
- Create: `data/catalog/search-sources.json`
- Create: `data/catalog/search-licenses.json`
- Create: `data/catalog/search-verification.json`
- Modify: `docs/context/surfaces/search.md`
- Create: `tests/unit/shared/search-contracts.test.ts`
- Modify: `tests/unit/scripts/source-catalog.test.js`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/style-map.md`
- Modify: `docs/context/roadmap.md`
- Modify: `scripts/data/source-catalog.mjs`

## Tasks

### Task 0: Verify Master And Handoff Intake

- [ ] Read the shared handoff log and confirm no earlier Search plan is already `complete`, `partial`, or `blocked` in a way that changes Phase 0 scope.
- [ ] Record dependency intake in the handoff log before editing contracts.

### Task 1: Define Shared Search Contracts

- [ ] Create `shared/search/abi.ts` with `SEARCH_PACK_ABI_MAJOR = 1`, `SEARCH_PACK_ABI_MINOR = 0`, `SEARCH_SHARD_MAGIC = 'QAS1'`, endian marker constants, table-role ids, value-width ids, alignment rules, `SearchShardHeader`, `SearchShardTableDirectoryEntry`, `SearchFeatureId`, `SearchShardSchemaId`, checksum scope types, byte-budget fields, `readSearchShardHeaderWithDataView`, and `assertSupportedSearchPackAbi`.
- [ ] Create `shared/search/manifest.ts` with `SearchPackManifestV1`, `SearchPackShardManifest`, `SearchPackNotice`, `SearchPackRegistry`, `SearchPackRegistryEntry`, immutable URL validation helpers, and guards that require runtime registry URL `/search-packs/registry.json`, immutable pack URLs under `/search-packs/packs/<contentHash>/**`, SHA-256 checksums over fetched encoded bytes, and no active stable mutable `/dataset/search/**` manifest.
- [ ] Create `shared/search/mapping.ts` with `SearchMappingState` values: `same-wording-in-reader`, `corresponding-ayah-in-reader`, `different-ayah-boundary`, `no-reader-ayah-alignment`, `no-reader-token-alignment`, and `hafs-source-only`; add `SearchMappingAsset` with `mappingId`, `sourceCorpusId`, `readerCorpusId`, `sourceRef`, `readerRefs`, `mappingState`, `aliasRole`, `boundaryRole`, `canOpenInRead`, `canHighlightWordsInRead`, `reason`, `sourceChecksum`, `readerChecksum`, and `mappingVersion`.
- [ ] Create `shared/search/normalization.ts` with `SEARCH_NORMALIZER_VERSION = 1`, `SearchNormalizationPolicy`, `SearchTokenizationPolicy`, `SearchPhraseWindowPolicy`, exact-word preservation rules, maximum Phase 1 phrase length, ayah/surah/Bismillah boundary policy, byte-budget gates, and canonical Phase 1 policy values for Unicode normalization, Quran mark handling, tatweel, hamza/alif folding, ya/alif-maqsura, taa-marbuta, punctuation, digits, whitespace, and boundaries.
- [ ] Create `shared/search/query.ts` with `SearchQueryMode` values: `all`, `arabic-text`, `translation`, `context`, `exact-word-form`, and `phrase`; create `SearchQueryAstV1`, `SearchSort`, `SearchResultCursor`, and `SavedSearchIntentV1`. Reserve `same-root` for Phase 2 after the morphology gate passes.
- [ ] Create `shared/search/worker-protocol.ts` with `SearchWorkerRequest`, `SearchWorkerResponse`, `SearchWorkerErrorCode`, `SearchWorkerEpoch`, `SearchResultDto`, `SearchResultWindow`, and request types: `init`, `preloadCore`, `query`, `loadFeature`, `cancel`, and `dispose`.
- [ ] Create `shared/search/fixtures.ts` with stable fixture ids for ABI decode, malformed ABI/table decode, diacritized Arabic, undiacritized Arabic, hamza/alif variants, Quran marks, mixed Arabic/English, references, exact-word preservation, phrase-boundary, max phrase length, ayah/surah/Bismillah boundary, mapping, byte-budget, and worker-protocol tests.
- [ ] Export the new contracts from `shared/search/index.ts` if the shared package already uses barrel exports; if no shared barrel exists, import files directly in tests and later plans.

### Task 2: Add Contract Tests

- [ ] Create `tests/unit/shared/search-contracts.test.ts` covering ABI version rejection, shard magic validation, endian marker validation, table role/value width/alignment checks, DataView-first header decode, SHA-256 checksum scope, malformed header/table fixtures, manifest immutable URL acceptance, runtime registry URL acceptance, stable mutable `/dataset/search/**` active URL rejection, normalizer/tokenizer fixture output, exact-word preservation rules, phrase-window boundaries, byte-budget gates, mapping state and `SearchMappingAsset` exhaustiveness, zero/one/multiple reader refs, no silent identity fallback, query mode exhaustiveness, and worker response request-id preservation.
- [ ] Run `pnpm exec vitest run tests/unit/shared/search-contracts.test.ts`.
- [ ] Expected result: all new shared contract tests pass.

### Task 3: Add Search Catalog Records And Validation

- [ ] Create `data/catalog/search-sources.json` with records for Phase 1 Hafs Search text, Phase 1 translation/context source, and Phase 2 morphology source-drop records with resolved license decision fields, bundled/source notice requirements, exact local source-drop path, approved filename, accepted checksum values, expected version, row/token/ayah coverage, source availability metadata, and transformed-data notes.
- [ ] Create `data/catalog/search-licenses.json` with license ids used by Search text, translation/context, Search pack metadata, and morphology source records.
- [ ] Create `data/catalog/search-verification.json` with expected source version, accepted checksum, ayah coverage, token/row counts, and manual source-drop path for morphology.
- [ ] Modify `scripts/data/source-catalog.mjs` so `pnpm run data -- check` loads and validates the new Search catalog files for required ids, checksums, source URLs, license ids, source availability notes, and coverage fields.
- [ ] Extend `tests/unit/scripts/source-catalog.test.js` to assert missing checksum, missing license, wrong ayah coverage, unresolved morphology license decision, missing source availability notes, and unapproved morphology source filename fail.
- [ ] Run `pnpm exec vitest run tests/unit/scripts/source-catalog.test.js`.
- [ ] Expected result: malformed Search catalog fixtures fail validation and valid records pass.

### Task 4: Decide Search Pack Cache Ownership

- [ ] Record the canonical Search pack layout in `shared/search/manifest.ts` and docs: filesystem registry at `public/search-packs/registry.json`, runtime registry URL `/search-packs/registry.json`, immutable pack manifests/shards under `public/search-packs/packs/<contentHash>/**`, and runtime pack URLs under `/search-packs/packs/<contentHash>/**`.
- [ ] Define the dedicated Search cache namespace, staged cache namespace keyed by content hash, active/previous-active protection rules, clear-data authority, and Workbox exclusion rule that prevents generic `/dataset/**` CacheFirst ownership from handling Search packs.
- [ ] Add tests in `tests/unit/shared/search-contracts.test.ts` proving registry and pack URLs are under the dedicated Search pack owner and no active pack URL can be both a generic dataset CacheFirst asset and a manual Search installer asset.

### Task 5: Define Search Dossier And Current-State Docs

- [ ] Modify `docs/context/surfaces/search.md` frontmatter for `surface: search`, `src_paths` covering `src/app/routes/search/**`, `src/components/search/**`, `src/search/**`, `src/search-worker/**`, and `src/offline/search/**`, `test_paths` covering `tests/unit/react-search/**`, `tests/unit/scripts/source-catalog.test.js`, Search script tests added in later phases, and `tests/e2e/search/*.spec.ts`, plus `style_paths` for `src/design-system/**`.
- [ ] In `docs/context/surfaces/search.md`, describe Search as planned until route promotion, name Hafs analysis and Qalun Reader mapping boundaries, and list invariants that forbid AI/chat/generated Quran text, silent alias identity fallback, Qalun word highlighting from Hafs morphology, and double caching.
- [ ] Update `docs/context/architecture.md` route table to mention `#/search` as unsupported until Phase 1 route promotion and to point Search architecture to generated static packs plus lazy worker.
- [ ] Keep `docs/context/data-model.md` current-state only: state that no Search IndexedDB stores exist in Phase 0, and that the planned store contracts live in shared Search plan docs until the Phase 1 Dexie migration lands.
- [ ] Update `docs/context/source-data-flow.md` with Search source catalog lanes, manual morphology source-drop rules, and runtime pack ownership.
- [ ] Update `docs/context/style-map.md` so Search is no longer described only as a deferred prototype; identify the planned route/component ownership and proof surface.
- [ ] Update `docs/context/roadmap.md` so full-text Search is moved from vague planned retrieval into the active Search plan while future AI/retrieval boundaries remain deferred.

### Task 6: Generate Docs And Verify Phase 0

- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run check`.
- [ ] Run `git diff --check`.
- [ ] Update `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md` with files changed, validation results, and any contract names that changed.

## Self-Review

- Spec coverage: covers Phase 0 source/license, ABI, source-drop path, checksums, Qalun label decision, normalizer/tokenizer, cache ownership guard, multi-tab/version handshake contract, mapping states, route-promotion docs, and fixtures.
- Placeholder scan: no task relies on unnamed error handling or unspecified files.
- Type consistency: later plans should import `SearchPackManifestV1`, `SearchMappingState`, `SearchQueryAstV1`, `SavedSearchIntentV1`, `SearchWorkerRequest`, and `SearchWorkerResponse` from `shared/search/**`.
