# Powerful Search Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `docs/superpowers/specs/2026-05-30-powerful-search-design.md` into ordered, testable child plans that promote Search from deferred prototype to shipped deterministic Quran Search.

**Architecture:** Search lands as generated static packs, a lazy restartable Web Worker, explicit Hafs-to-Qalun reader mapping, IndexedDB-backed saved searches and activation state, and a shipped `#/search` route. Reader launch stays Reader First; Search assets are not imported into app JS chunks and Search does not overwrite reader continuity in Phase 1.

**Tech Stack:** Vite, React, TypeScript, Dexie, Web Worker, Cache Storage, Workbox via `vite-plugin-pwa`, Vitest, Playwright, existing `pnpm run data` scripts.

---

## Source

Master plan: `docs/superpowers/specs/2026-05-30-powerful-search-design.md`

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Child Plan Order

1. `docs/superpowers/plans/2026-05-31-powerful-search-phase-0-contracts.md`
2. `docs/superpowers/plans/2026-05-31-powerful-search-phase-1-data-pack-lifecycle.md`
3. `docs/superpowers/plans/2026-05-31-powerful-search-phase-1-worker-runtime.md`
4. `docs/superpowers/plans/2026-05-31-powerful-search-phase-1-ui-route-saved-searches.md`
5. `docs/superpowers/plans/2026-05-31-powerful-search-phase-2-morphology.md`
6. `docs/superpowers/plans/2026-05-31-powerful-search-phase-3-memory-graph.md`

## Coordination Rules

- [ ] Before executing any child plan, read the master spec, this implementation index, the target child plan, and the shared handoff log.
- [ ] Before executing any dependent child plan, verify every predecessor named by that plan has a `complete` handoff entry. If any predecessor is `partial`, `blocked`, or missing, stop and update the handoff log with the dependency blocker.
- [ ] Keep each child plan within its named scope unless the handoff log shows a completed dependency changed file ownership or API shape.
- [ ] Update the shared handoff log at the end of every child plan with status, validation, changed files, divergences, and next-agent notes.
- [ ] Do not promote `#/search` from unsupported until Phase 0 and the Phase 1 data, lifecycle, worker, storage, and UI gates are complete.
- [ ] Phase 0 must explicitly resolve the morphology source/license decision before it is marked complete. Do not ship morphology or same-root UI until that gate is resolved and Phase 2 validation passes.
- [ ] Preserve Reader First launch behavior: no Search pack fetch, graph decode, or worker startup on cold Reader launch.
- [ ] Keep Search pack files out of app JS bundles and under one cache owner only. Canonical layout: filesystem registry at `public/search-packs/registry.json`, runtime registry URL `/search-packs/registry.json`, immutable pack manifests/shards under `public/search-packs/packs/<contentHash>/**`, and dedicated Search cache ownership for those immutable pack URLs.
- [ ] Use product language from the master spec and include required source, trust, wording, same-root, shared-wording, following-wording, and occurs-once notes where applicable.

## Cross-Plan File Ownership

- Phase 0 owns shared contracts under `shared/search/**`, source catalog records under `data/catalog/**`, current-state schema docs, Search dossier updates, and fixtures.
- Phase 1 data/lifecycle owns `scripts/data/search/**`, `public/search-packs/**`, `src/offline/search/**`, `src/storage/**`, `tests/e2e/fixtures/**`, `vite.config.js`, affected CI gates, `docs/tech-stack.md`, and clear-data integration.
- Phase 1 worker/runtime owns `src/search/**`, `src/search-worker/**`, result DTOs, ranking/cursor logic, cancellation, and runtime pack readers.
- Phase 1 UI owns `src/app/router/routes.ts`, `src/app/App.tsx`, `src/app/routes/search/**`, `src/components/search/**`, approved UI composition, and saved-search interactions.
- Phase 2 owns morphology source import, root/lemma shards, same-root worker operations, morphology UI/source notes, and license-gated release checks.
- Phase 3 owns following wording, shared wording, repeated phrases, occurs-once, ayah endings, counts/patterns, and Explore lazy loading.

## Final Release Gate

- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build`.
- [ ] Run `pnpm run data -- build --profile=full` after Search joins full dataset profiles.
- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run test`.
- [ ] Run `pnpm run build`.
- [ ] Run `node scripts/check-chunks.js`.
- [ ] Run targeted Search Playwright specs under `tests/e2e/search/`.
- [ ] Run targeted offline coverage with `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search --grep @offline`.
- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `pnpm run validate` before PR readiness for route-promotion work.

## Self-Review Notes

- Spec coverage: Phase 0 covers source/license, ABI, registry/cache ownership, mapping schema, and docs gates. Phase 1 covers lexical Search, pack activation, worker protocol, saved searches, route UI, offline repair, and Open in Read. Phase 2 covers morphology and same-root. Phase 3 covers memory graph Explore sections and counts/patterns.
- Placeholder scan: This plan set avoids deferred placeholder language and names concrete child plan files and validation commands.
- Type consistency: Child plans use `SearchPackManifestV1`, `SearchWorkerRequest`, `SearchWorkerResponse`, `SearchMappingState`, `SavedSearchRecord`, `SearchResultDto`, and `SearchPackActivationRecord` consistently.
