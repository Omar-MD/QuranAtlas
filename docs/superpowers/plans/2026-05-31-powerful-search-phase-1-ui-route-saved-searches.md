# Powerful Search Phase 1 UI Route And Saved Searches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `#/search` route with core lexical Search UI, result detail, Open in Read, saved searches, accessibility states, and scoped offline pack lifecycle states.

**Architecture:** Search is a lazy route using approved UI primitives and the Phase 1 worker client. It preserves Reader First cold launch, stages/activates the core pack on first Search entry, stores saved query definitions in Dexie, and renders result-first phone/tablet/desktop layouts.

**Tech Stack:** React, TypeScript, app hash router, Dexie, Search worker client, `src/components/ui` primitives, Vitest React tests, Playwright Search/offline specs.

---

Shared handoff log: `docs/superpowers/plans/2026-05-31-powerful-search-handoff-log.md`

## Required Reads

- `docs/superpowers/plans/2026-05-31-powerful-search-phase-1-data-pack-lifecycle.md`
- `docs/superpowers/plans/2026-05-31-powerful-search-phase-1-worker-runtime.md`
- `docs/context/surfaces/search.md`
- `docs/context/surfaces/read.md`
- `docs/context/data-model.md`
- `docs/context/style-map.md`
- `src/design-system/registry/component-registry.json`
- `src/storage/schema.ts`
- `src/storage/types.ts`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files

- Modify/replace existing prototype: `src/app/routes/search/SearchRoute.tsx`
- Create: `src/components/search/SearchShell.tsx`
- Create: `src/components/search/SearchHeader.tsx`
- Create: `src/components/search/SearchModeControl.tsx`
- Create: `src/components/search/SearchResultList.tsx`
- Create: `src/components/search/SearchResultCard.tsx`
- Create: `src/components/search/SearchResultDetail.tsx`
- Modify/replace existing prototype or create: `src/components/search/SearchExplorePanel.tsx`
- Modify/replace existing prototype or create: `src/components/search/SearchSourcePanel.tsx`
- Create: `src/components/search/SavedSearchesRail.tsx`
- Create: `src/components/search/SavedSearchesSheet.tsx`
- Create: `src/components/search/useSearchRouteState.ts`
- Create: `src/components/search/useSavedSearches.ts`
- Create: `tests/unit/react-search/search-route.test.tsx`
- Create: `tests/unit/react-search/saved-searches.test.tsx`
- Create: `tests/e2e/search/react-search.spec.ts`
- Create: `tests/e2e/search/react-search-offline.spec.ts`
- Modify: `src/app/router/routes.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/components/search/SearchPage.tsx`
- Modify: `src/components/search/SearchBox.tsx`
- Modify: `src/components/search/SearchIndexGate.tsx`
- Modify: `src/components/search/SearchResults.tsx`
- Modify: `src/components/search/search.stories.tsx`
- Modify: `src/design-system/registry/component-registry.json`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/surfaces/search.md`
- Modify: `docs/context/style-map.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/future.md`
- Modify: `docs/product-info.md`

## Tasks

### Task 0: Verify Route-Promotion Gate

- [ ] Confirm Phase 0, Phase 1 data/lifecycle, and Phase 1 worker handoff entries are `complete`, including core pack activation, worker runtime, mapping, saved-search storage, offline repair states, and the required verification commands.
- [ ] If any predecessor is `partial`, `blocked`, missing, or lacks required validation output, stop before changing route parsing and update the shared handoff log with the exact route-promotion blocker.

### Task 1: Promote Route Parsing Without Mounting Heavy Search Work On Reader Launch

- [ ] Modify `src/app/router/routes.ts` so `#/search` returns `{ type: 'search' }` and `ReactRouteMatch` includes `search`.
- [ ] Modify `src/app/App.tsx` to lazy-load `src/app/routes/search/SearchRoute.tsx` only when route type is `search`.
- [ ] Ensure Reader launch routes do not import `src/search-worker/**`, Search pack readers, or generated Search pack assets.
- [ ] Preserve Reader First continuity: visiting Search must not overwrite `lastSurface`; cold `#/` launch must continue restoring the Reader route unless a later phase explicitly enables Search resumability.
- [ ] Audit or hard-replace existing Search prototype files so no stable `/dataset/search/**` fetch, prototype `SearchShard.entries`, or unsupported route assumptions survive route promotion.
- [ ] Extend `tests/unit/react-shell/routes.test.ts` or create `tests/unit/react-search/search-route.test.tsx` to assert `#/search` is supported and Reader routes still match unchanged.
- [ ] Add App/continuity coverage proving Reader -> Search leaves `lastSurface` as the Reader route and cold `#/` launch restores Read, including Search URLs with query state if supported.
- [ ] Run `pnpm exec vitest run tests/unit/react-shell/routes.test.ts tests/unit/react-search/search-route.test.tsx`.

### Task 2: Build Result-First Search Shell

- [ ] Create `SearchShell` with heading `Search`, input label `Search Quran text, translation, or context`, placeholder `Search...`, mode controls for All, Arabic text, Translation, Context, Exact word form, and Phrase, a `Saved searches` action, polite status region, and pack-state messaging.
- [ ] Do not expose `Same root` in Phase 1 except as a clearly disabled/unavailable Phase 2 feature with source-gate copy; never label the mode `Root` in user-facing Phase 1 UI.
- [ ] Use approved `src/components/ui` primitives for buttons, tabs/disclosures/sheets, and form controls; do not import Radix directly outside `src/components/ui`.
- [ ] Implement phone single-column layout with sticky compact search header, tablet portrait as phone, tablet landscape results plus detail, desktop optional detail pane and collapsible 280-320px saved-search rail.
- [ ] Keep copy within product language: `Read`, `Search`, `Saved searches`, `Save search`, `Open in Read`, `Match`, `Explore`, `Source`, `Search source text`, and `Reader text`.
- [ ] Avoid banned labels from the master plan, including `Discover`, `Collections`, `Journey`, `Autocomplete`, `Insights`, `Ask`, and `AI Search`.

### Task 3: Wire Pack Lifecycle States To UI

- [ ] Use Phase 1 lifecycle APIs to show `Search data is not available on this device.`, `Loading search index`, and `Search data is ready on this device.` exactly where required.
- [ ] On first Search entry, stage and activate the core pack lazily. Do not block Reader launch.
- [ ] Render scoped unavailable, install/verify, failed, incompatible, offline unavailable, update available, and repair states without breaking navigation back to Read.
- [ ] Ensure missing advanced packs show panel-level unavailable states and never block core Phase 1 results.

### Task 4: Query, Results, Details, And Open In Read

- [ ] `useSearchRouteState` should debounce or submit query intent, call the worker client, cancel stale requests, and ignore stale epochs.
- [ ] `SearchResultCard` should render reference line such as `Surah 2 · 2:255`, lane chips, bidi-safe snippets with `dir="auto"` and isolation, provenance chip, and primary action `Open in Read` only when `canOpenInRead` is true.
- [ ] Apply `dir="auto"` and bidi isolation to mixed Arabic/English snippets, saved-search names, input echoes, chips, references, tab labels, source rows, and user-visible query echoes.
- [ ] `SearchResultDetail` should expose tabs `Match`, `Explore`, and `Source`.
- [ ] `Match` tab should show matched passage, Search source text, Reader text where mapped, translation/context where available, and match reason.
- [ ] `Source` tab should show source ids, license/provenance, mapping state, pack version, checksums where useful, and required source/trust/wording notes.
- [ ] `Open in Read` should use unique accessible names such as `Open 2:255 in Read` and route only through one validated reader ref. For multiple mapped reader refs, show a labelled disambiguation sheet or make `Details` primary.
- [ ] Results without Reader mapping should make `Details` primary and should not render `Open in Read` as the primary action.
- [ ] Do not render Reader word highlighting for Search results in Phase 1.

### Task 5: Implement Saved Searches

- [ ] `useSavedSearches` should create, load, rename, and delete `SavedSearchRecord` entries in the new Dexie store.
- [ ] `Save search` creates records only from explicit user action and stores Phase 1 user intent fields only: id, name, schema version, query text, query mode, filters, source lanes, sort, created/updated timestamps, last opened timestamp, and derived compatibility metadata. Do not store result windows, Explore section ids, required features, source corpus snapshots, or result DTOs.
- [ ] Saved-search list title is `Saved searches`.
- [ ] Empty state is `No saved searches yet. Save a search to return to its query and filters.`
- [ ] Selecting a saved search loads query and filters, announces the loaded state, and recomputes results against the active compatible pack.
- [ ] If a saved search is recomputed after an active pack change, announce that results were recomputed against the active Search index and may differ because the index changed.
- [ ] Incompatible saved searches remain readable and editable, but cannot run until a compatible pack is active.
- [ ] Phase 1 management actions are Rename and Delete only.

### Task 6: Accessibility And Responsive Tests

- [ ] Create `tests/unit/react-search/search-route.test.tsx` covering empty state copy, basic query results, Match/Explore/Source detail tabs, unique `Open in Read` accessible names, zero/one/multiple/different-boundary mapping states, no Reader word highlighting, result without mapping using Details primary, source notes, result count announcements, active tab state, focus return from detail/saved-search sheets, non-color-only provenance, non-repeated source notes, and polite status messages.
- [ ] Create `tests/unit/react-search/saved-searches.test.tsx` covering save, load, rename, delete, recompute, incompatible pack state, pack-change recompute announcement, persisted-field allowlist, and no result snapshots or Explore/source corpus snapshots in storage.
- [ ] Create `tests/e2e/search/react-search.spec.ts` for route support, keyboard flow, mobile saved-search sheet/subview, result detail pushed view on phone, desktop saved-search rail, and Open in Read route navigation.
- [ ] Create `tests/e2e/search/react-search-offline.spec.ts` tagged `@offline` for active core pack offline use, missing advanced pack degradation, service-worker update not leaving stable Search URLs active, and Reader continuity remaining dominant.
- [ ] Run `pnpm exec vitest run tests/unit/react-search/search-route.test.tsx tests/unit/react-search/saved-searches.test.tsx`.
- [ ] Run `pnpm exec playwright test tests/e2e/search/react-search.spec.ts --reporter=line`.
- [ ] Run `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --grep @offline --reporter=line`.

### Task 7: Registry, Stories, Docs, And Final Verification

- [ ] Update `src/components/search/search.stories.tsx` with empty, loading, results, detail, saved searches, no mapping, offline unavailable, and source panel states.
- [ ] Update `src/design-system/registry/component-registry.json` for shipped Search components, stories, and proof state.
- [ ] Update `docs/context/architecture.md` route table to mark `#/search` as shipped.
- [ ] Update `docs/context/surfaces/search.md` with shipped Phase 1 behavior, test paths, invariants, and source notes.
- [ ] Update `docs/context/style-map.md` Search row from deferred prototype to shipped route.
- [ ] Update product docs so Search is current-state shipped only for Phase 1 lexical capabilities and future docs retain Phase 2/3 scope.
- [ ] Run `pnpm run docs`.
- [ ] Run `pnpm run docs:check`.
- [ ] Run `pnpm run data -- check`.
- [ ] Run `pnpm run data -- build --profile=full` once Search joins full dataset profiles.
- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run test`.
- [ ] Run `pnpm run build`.
- [ ] Run `node scripts/check-chunks.js`.
- [ ] Run targeted offline route-promotion coverage with `PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test tests/e2e/search/react-search-offline.spec.ts --grep @offline --reporter=line`.
- [ ] Run `pnpm run validate` before marking route promotion complete.
- [ ] Run `git diff --check`.
- [ ] Update the shared handoff log with route-promotion status, UI test results, chunk result, and Phase 2 starting notes.

## Self-Review

- Spec coverage: covers top-level Read/Search model, shipped route, result list/detail, saved searches, Open in Read, UI copy, accessibility, offline states, Reader First launch, and chunk budget.
- Placeholder scan: UI tasks name exact components, copy, states, tests, and commands.
- Type consistency: UI consumes `SearchResultDto`, `SavedSearchRecord`, mapping states, worker errors, and pack lifecycle states from earlier plans.
