# Powerful Search Phase 1 Data Pack Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, install, activate, repair, and clear the Phase 1 core Search pack without affecting Reader launch.

**Architecture:** The data builder emits immutable Search pack manifests and shards from approved build-time sources. Runtime lifecycle code stages Search pack bytes into one dedicated Search cache, verifies checksums, writes a Dexie active-pack pointer transactionally, coordinates activation across tabs, and keeps Search pack files out of the generic dataset CacheFirst ownership path.

**Tech Stack:** Node data scripts, shared Search contracts, Dexie v8 migration, Cache Storage, BroadcastChannel or storage events, Workbox route configuration, Vitest script/storage/offline tests.

---

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Required Reads

- `docs/superpowers/plans/2026-05-31-powerful-search-phase-0-contracts.md`
- `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`
- `docs/context/source-data-flow.md`
- `docs/context/data-model.md`
- `docs/context/surfaces/infra.md`
- `docs/context/surfaces/search.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files

- Create: `scripts/data/search/build.mjs`
- Create: `scripts/data/search/abi-writer.mjs`
- Create: `scripts/data/search/normalizer.mjs`
- Create: `scripts/data/search/postings.mjs`
- Create: `scripts/data/search/registry.mjs`
- Create: `scripts/data/search/validate.mjs`
- Create: `public/search-packs/registry.json`
- Create: `public/search-packs/packs/<contentHash>/manifest.json`
- Create: `public/search-packs/packs/<contentHash>/shards/*`
- Create: `src/offline/search/cache.ts`
- Create: `src/offline/search/activation.ts`
- Create: `src/offline/search/registry.ts`
- Create: `src/offline/search/repair.ts`
- Create: `src/offline/search/quota.ts`
- Create: `tests/unit/scripts/search-builder.test.mjs`
- Create: `tests/unit/react-storage/search-schema.test.ts`
- Create: `tests/unit/react-offline/search-pack-lifecycle.test.ts`
- Create/Modify: `tests/e2e/fixtures/**`
- Create: `tests/e2e/search/react-search-offline.spec.ts`
- Modify: `scripts/data/cli.mjs`
- Modify: `scripts/ci/affected.mjs`
- Modify: `src/storage/schema.ts`
- Modify: `src/storage/db.ts`
- Modify: `src/storage/types.ts`
- Modify: `src/storage/clear-data.ts`
- Modify: `src/offline/cache-names.ts`
- Modify: `vite.config.js`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `docs/context/surfaces/search.md`
- Modify: `docs/tech-stack.md`

## Dependency Gate

- [ ] Confirm Phase 0 handoff status is `complete` before editing lifecycle code. If Phase 0 is `partial`, `blocked`, or missing, stop and update the shared handoff log with the dependency blocker.

## Tasks

### Task 1: Add Search Builder Entry Points

- [ ] Create `scripts/data/search/normalizer.mjs` implementing the exact Phase 0 normalizer policy and exporting `normalizeSearchToken`, `tokenizeSearchText`, and `normalizeQueryText`.
- [ ] Create `scripts/data/search/postings.mjs` to build reference tables, token dictionaries, Arabic positional postings, translation/context postings, exact word indexes, phrase postings up to the Phase 1 max phrase length, and provenance rows.
- [ ] Create `scripts/data/search/abi-writer.mjs` that writes little-endian ABI v1 shard headers, table directories, offset tables, string tables, postings tables, and SHA-256 checksums.
- [ ] Create `scripts/data/search/registry.mjs` that writes filesystem file `public/search-packs/registry.json`; runtime code must fetch it as `/search-packs/registry.json`. Registry entries point only to immutable content-addressed manifest URLs under `/search-packs/packs/<contentHash>/manifest.json`.
- [ ] Create `scripts/data/search/build.mjs` with `--profile=baseline`, `--profile=full`, and `--check` support. The script must reject active manifests and registries under stable mutable `/dataset/search/**` paths.
- [ ] Emit immutable pack files under `public/search-packs/packs/<contentHash>/manifest.json` and `public/search-packs/packs/<contentHash>/shards/*`; manifests and shards must be content-addressed and never active via stable mutable `/dataset/search/${packId}/index.json`.
- [ ] Modify `scripts/data/cli.mjs` so `pnpm run data -- check` runs Search validation and `pnpm run data -- build` runs Search core pack build after text and translation sources are available.
- [ ] Modify `scripts/ci/affected.mjs` so Search source/catalog/script/shared-contract/runtime dataset changes select data build and Search tests.
- [ ] Add tasks to remove or replace prototype stable `/dataset/search/**` clients in `src/offline/search/search-pack.ts` and `src/search/index-client.ts` if they still fetch `/dataset/search/${packId}/index.json`.

### Task 2: Test Builder And Registry Contracts

- [ ] Create `tests/unit/scripts/search-builder.test.mjs` with fixtures for deterministic ABI decode, malformed header rejection, manifest feature dependencies, byte sizes, checksums, source ids, schema versions, phrase boundary policy, and stable mutable URL rejection.
- [ ] Run `pnpm exec vitest run tests/unit/scripts/search-builder.test.mjs`.
- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --skip=mushaf-pages`.
- [ ] Expected result: Search core pack and registry are generated deterministically and validation rejects mutable active Search URLs.

### Task 3: Add Dexie v8 Stores For Search

- [ ] Modify `src/storage/schema.ts` to bump `QURAN_ATLAS_DB_VERSION` from `7` to `8` and add `QURAN_ATLAS_V8_STORES` with existing stores plus exact Search store strings: `savedSearches: 'id, updatedAt, lastOpenedAt, schemaVersion, packCompatibilityKey'`, `searchPackActivations: 'id, packId, contentHash, generation, status, updatedAt'`, and `searchPackStaging: 'id, contentHash, status, createdAt, updatedAt'`.
- [ ] Modify `src/storage/types.ts` to add `SavedSearchRecord`, `SearchPackActivationRecord`, and `SearchPackStagingRecord` with schema version, pack identity, compatibility, generation, status, timestamps, cache name, byte counts, and error fields.
- [ ] Modify `src/storage/db.ts` to expose typed Dexie tables for the new stores and register version 7 plus version 8 stores so migration preserves existing reader data.
- [ ] Create `tests/unit/react-storage/search-schema.test.ts` proving migration adds Search stores, existing settings/bookmarks remain readable, saved searches store query definitions rather than results, and versionchange failure states are surfaced.
- [ ] Run `pnpm exec vitest run tests/unit/react-storage/search-schema.test.ts`.

### Task 4: Implement Dedicated Search Pack Cache Lifecycle

- [ ] Modify `src/offline/cache-names.ts` to add `SEARCH_PACK_CACHE_PREFIX = 'quran-atlas-search-pack'` and a deterministic `searchPackCacheName(contentHash: string)` helper.
- [ ] Create `src/offline/search/cache.ts` for cache open, immutable request validation, staged put, checksum verification over fetched encoded bytes, protected active/previous-active listing, and orphan cleanup.
- [ ] Create `src/offline/search/quota.ts` for manifest `totalBytes`, retained-pack overhead, `navigator.storage.estimate()`, and low-quota preflight.
- [ ] Create `src/offline/search/activation.ts` with `installSearchPack`, `verifyStagedSearchPack`, `activateSearchPack`, `rollbackSearchPack`, and single-writer generation compare-and-swap.
- [ ] Create `src/offline/search/repair.ts` to reconcile IndexedDB active-pack state with Cache Storage and produce states: `not available`, `available online`, `installing`, `staged`, `verifying`, `active`, `update available`, `incompatible`, `failed`, and `offline unavailable`.
- [ ] Create `src/offline/search/registry.ts` to fetch runtime URL `/search-packs/registry.json`, reject incompatible app/worker versions, and never fetch registry data from `/dataset/search/**`.
- [ ] Use BroadcastChannel when available and a storage event fallback to announce activation generation changes across tabs.
- [ ] Add a live-tab/worker lease contract tied to activation generation, worker epoch, document visibility, heartbeat timestamp, and cleanup grace period. Cleanup must protect active, previous-active, visible-tab, and live-worker pack leases; stale lease expiry must be tested separately from visible-tab protection.

### Task 5: Exclude Search Packs From Generic Dataset Cache Ownership

- [ ] Modify `vite.config.js` Workbox runtime caching so generic `/dataset/**` CacheFirst handling excludes Search pack paths if any Search artifact remains under `/dataset/search/**`; the Phase 1 registry filesystem path is `public/search-packs/registry.json`, runtime registry URL is `/search-packs/registry.json`, and immutable pack URLs are owned by the dedicated Search cache.
- [ ] Add a unit check or config assertion in `tests/unit/react-offline/search-pack-lifecycle.test.ts` that Search registry and active pack URLs are not owned by both the Workbox dataset cache and manual Search installer.
- [ ] Run `pnpm exec vitest run tests/unit/react-offline/search-pack-lifecycle.test.ts`.
- [ ] Add e2e coverage under `tests/e2e/search/react-search-offline.spec.ts` and typed helpers under `tests/e2e/fixtures/**` for active pack offline behavior, cache present/IDB missing repair, IDB present/cache missing repair, and multi-tab activation not deleting a pack used by another visible tab or live worker.

### Task 6: Integrate Clear Data

- [ ] Modify `src/storage/clear-data.ts` so clear data removes saved searches, search activation state, staged pack metadata, and Search pack cache assets as part of the existing app clear-data contract.
- [ ] Extend the existing clear-data unit test under `tests/unit/react-storage/clear-data.test.ts` to seed Search stores and Search caches, run clear data, and assert Search state is gone.
- [ ] Run `pnpm exec vitest run tests/unit/react-storage/clear-data.test.ts tests/unit/react-storage/search-schema.test.ts tests/unit/react-offline/search-pack-lifecycle.test.ts`.

### Task 7: Update Docs And Verify Phase 1 Lifecycle

- [ ] Update `docs/context/data-model.md` with v8 stores and Search saved-search/pack records.
- [ ] Update `docs/context/source-data-flow.md` with Search builder placement, registry path, immutable pack outputs, and affected CI selection.
- [ ] Update `docs/context/surfaces/infra.md` with Search pack cache lifecycle and clear-data behavior.
- [ ] Update `docs/context/surfaces/search.md` with pack availability states, Phase 1 lifecycle boundaries, and `owns_stores` for `savedSearches`; update `docs/context/surfaces/infra.md` frontmatter to own Search pack activation/staging stores before running docs generation.
- [ ] Update `docs/tech-stack.md` for data script, affected CI, Workbox/cache, and validation gate changes.
- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --profile=full` once Search joins full dataset profiles.
- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run build`.
- [ ] Run `node scripts/check-chunks.js`.
- [ ] Run `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --grep @offline --reporter=line`.
- [ ] Run `pnpm run validate` before marking lifecycle work release-ready.
- [ ] Run `git diff --check`.
- [ ] Update the shared handoff log with generated file paths, cache ownership decisions, schema version, and validation results.

## Self-Review

- Spec coverage: covers core static pack generation, immutable registry, Cache Storage ownership, activation, rollback, startup reconciliation, clear data, low quota, cross-tab generation, app/service-worker/Search-worker version checks, and affected CI.
- Placeholder scan: every task names files and commands.
- Type consistency: uses `SearchPackManifestV1`, `SearchPackActivationRecord`, `SearchPackStagingRecord`, and `SavedSearchRecord` from Phase 0 contracts and storage types.
