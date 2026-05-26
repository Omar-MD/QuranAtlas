# React Production Parity Fix 07 - Search Route Contract

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-006` by deciding and implementing the search route contract consistently with the Svelte oracle or an explicit product-scope change.

**Depends on:** Plans 00 through 06. The default recovery path is to align React to current Svelte not-found behavior. If search is promoted instead, split promotion into a separate pre-09 plan that depends on Plans 02 and 05 and owns generated search data plus offline proof; Plan 09 validates promoted search but is not a prerequisite.

## Required Context

Read:

- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/source-data-flow.md`
- `docs/context/implemented.md`
- `docs/context/future.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-audit.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- Current route handling in `src/**` for `#/search`
- Any not-found/empty route component under `src/navigate/**` or router files
- `docs/context/surfaces/navigate.md` shortcut/search notes

React target:

- `src-react/app/router/routes.ts`
- `src-react/app/routes/search/SearchRoute.tsx`
- `src-react/components/search/SearchPage.tsx`
- `src-react/components/search/SearchBox.tsx`
- `src-react/components/search/SearchIndexGate.tsx`
- `src-react/components/search/SearchResults.tsx`
- `src-react/search/**`
- `src-react/offline/search/search-pack.ts`

Tests:

- `tests/unit/react-search/search-wave3.test.ts`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/fixtures/react-golden-routes.ts`

## Files To Modify

Minimal alignment option:

- `src-react/app/router/routes.ts`
- `src-react/app/routes/search/SearchRoute.tsx` or delete route if no longer used
- `tests/unit/react-shell/routes.test.ts`
- `tests/unit/react-search/**`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/fixtures/react-golden-routes.ts`
- `src-react/design-system/registry/component-registry.json` if search registry entries imply shipped production parity
- `src-react/components/search/search.stories.tsx` or the current search story file if stories imply shipped production parity
- `docs/context/style-map.md` if React proof ownership changes
- `docs/context/implemented.md` or `docs/context/future.md` if current product scope docs change

Promotion option:

- All minimal files plus `src-react/search/**`, `src-react/offline/search/**`, data/index build files, source-data docs, and offline proof files named by the discovery step.

## Readiness Refinement

- Execute after Plans 00 through 06. The default recovery path is contract alignment with current Svelte not-found behavior; search promotion must stop here and become a separate pre-09 plan.
- Test-first checkpoint: write the route-contract assertions for the selected decision, run them against the current React production-target build, and confirm they fail on fake preview search before app edits.
- Svelte-vs-React comparison covers `#/search`, query-hash variants, visible not-found/unsupported state for alignment, and absence of preview shard result text in production-target React.
- Production-target verification must build and serve both artifacts through Plan 00. If search is promoted in a separate plan, that plan must add Svelte baseline behavior, generated data, offline proof, and source-data validation before React parity is claimed.
- CSS/React styling enforcement for the default alignment path is mostly removal/quarantine: ensure no production-target search UI stories/registry entries imply shipped parity. If promotion is split out, that new plan must inspect the registry, use owned primitives, `qar:` utilities, Storybook/registry proof, and no Svelte CSS/classes.
- Docs updates must make the chosen product contract explicit in `docs/context/implemented.md`, `docs/context/future.md`, and relevant surface/source-data docs when scope changes.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Route Contract Decision And Failing Tests

**Files:**
- Modify: `tests/unit/react-shell/routes.test.ts`
- Modify: `tests/unit/react-search/search-wave3.test.ts`
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`

- [ ] Record the chosen decision in the implementing change. Default: align React `#/search` and `#/search?q=...` with current Svelte not-found behavior.
- [ ] Write failing unit and e2e assertions for the chosen route contract and absence of preview shard result text.
- [ ] Run the targeted tests before app edits and confirm failure on fake preview search behavior.

### Task 2: Default Alignment Implementation

**Files:**
- Modify: `src-react/app/router/routes.ts`
- Modify or remove: `src-react/app/routes/search/SearchRoute.tsx`
- Modify or quarantine: `src-react/components/search/**`
- Modify or quarantine: `src-react/search/**`
- Modify or quarantine: `src-react/offline/search/search-pack.ts`

- [ ] Remove production-target React search preview route behavior or map it to the same unsupported/not-found route behavior as Svelte.
- [ ] Quarantine `PREVIEW_SHARD` so it cannot satisfy production-target parity tests.
- [ ] Remove production-target search story/registry implications of shipped parity unless the route remains as a non-production story only.
- [ ] Update `component-registry.json`, search stories, and `docs/context/style-map.md` when default alignment removes or downgrades search proof ownership; stale registry rows must not claim product visual proof is covered for a non-shipped route.
- [ ] If the decision is promotion instead, stop this plan and create a separate pre-09 promotion plan that includes Svelte baseline behavior, generated data, offline proof, and source-data validation.

### Task 3: Documentation And Verification

**Files:**
- Modify: `docs/context/implemented.md` or `docs/context/future.md` if product scope docs change
- Modify: relevant surface/source-data docs only if scope changes
- Modify: `docs/tech-stack.md` only if scripts/build tooling change

- [ ] Make the chosen search contract explicit in current-state docs when scope changes.
- [ ] Run:

```bash
pnpm exec vitest run tests/unit/react-search tests/unit/react-shell --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "search"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Required Decision

Choose exactly one:

1. **Align to current Svelte:** React `#/search` and `#/search?q=...` behave like current Svelte not-found behavior. This is the default for this recovery program because the audit oracle says Svelte has no shipped search route.
2. **Promote search intentionally:** implement or restore a real shipped search route in the Svelte baseline and React, including generated index data, offline pack state, route behavior, and docs. This is broader than parity recovery.

Do not keep the current React preview search shard as production-target behavior.

## Tests To Write First

For align-to-current-Svelte:

- Unit: React route matcher maps `#/search` to the same not-found/unsupported route behavior used by Svelte.
- E2E: Svelte and React `#/search` and `#/search?q=mercy` match route contract and visible state.
- E2E: preview search text such as `Most Compassionate Most Merciful` is not shown as a fake verified result.

For promotion:

- Unit: generated search shard/index loader reads real dataset/index output, not `PREVIEW_SHARD`.
- Unit: promoted search loaders use approved `/dataset/**` path helpers, `AbortSignal`, stable cache keys, and install/verify-before-activate state.
- E2E: both Svelte and React route to the same real search workflow.
- Offline: installed search index survives offline reload and unavailable index state is explicit.

Expected before implementation: tests fail because React shows fake preview search while Svelte routes not-found.

## Implementation Steps

- [ ] Run the route-contract decision first and record it in the implementing change.
- [ ] If aligning to Svelte, remove production-target React search preview route behavior and update fixture expectations.
- [ ] If promoting search, stop this plan and create the separate pre-09 search implementation plan named above. Do not implement promotion from preview shard assumptions.
- [ ] Remove or quarantine `PREVIEW_SHARD` from production-target behavior.
- [ ] Update tests so query params are handled according to the chosen route contract.

## Commands

```bash
pnpm exec vitest run tests/unit/react-search tests/unit/react-shell --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "search"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

If search is promoted and source-data/build/offline behavior changes, also run the relevant data/build validation selected by `docs/context/source-data-flow.md`, and `pnpm run validate`.

## Documentation

- Update `docs/context/implemented.md`, `docs/context/future.md`, and relevant surface dossiers if product scope changes.
- Update `docs/tech-stack.md` if scripts/build tooling change.

## Acceptance Criteria

- `RPA-006` is closed.
- React no longer exposes fake preview search as production-target parity.
- Chosen search contract is explicit, tested, and documented.
