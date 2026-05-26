# React Production Parity Fix 08 - About, Clear Data, PWA Install, And Product Copy

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-009` by aligning React About content/actions with Svelte behavior and removing unsupported product claims.

**Depends on:** Plans 00 through 07. Clear-data launch proof depends on Plan 01, and product-copy claims depend on the earlier parity decisions.

## Required Context

Read:

- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `docs/product-info.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/configure/about/About.svelte`
- `src/configure/about/pwa-install.ts`
- `src/configure/ClearDataConfirm.svelte`
- `src/configure/clear-data.ts`
- `src/infra/safety/sync.ts`
- `src/core/UpdateBanner.svelte`
- `src/App.svelte`

React target:

- `src-react/app/routes/settings/AboutRoute.tsx`
- `src-react/design-system/recipes/settings-page.tsx`
- `src-react/storage/**`
- `src-react/offline/service-worker-contract.ts`
- Any React clear-data helper if present

Tests:

- `tests/e2e/configure/react-golden.spec.ts`
- `tests/unit/react-storage/**`

## Files To Modify

- `src-react/app/routes/settings/AboutRoute.tsx`
- React clear-data helper files, creating under `src-react/storage/` or `src-react/app/routes/settings/` only if no owned helper exists
- React PWA install prompt helper, creating a small route-owned helper only if needed
- `tests/e2e/configure/react-golden.spec.ts`
- `tests/unit/react-storage/**`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md` if clear-data or PWA behavior changes
- `docs/context/style-map.md`

## Readiness Refinement

- Execute after Plans 00 through 07; clear-data proof depends on React launch returning to onboarding, and unsupported-claim removal depends on the earlier parity decisions.
- Test-first checkpoint: write content, unsupported-claim, clear-data, PWA affordance, and route assertions, run them against the current React production-target build, and confirm failures on preview copy or missing actions before app edits.
- Svelte-vs-React comparison covers mission/attribution/version/footer copy, install affordance state, clear-data dialog/deletion/reload behavior, and absence of removed-scope or unverified React claims.
- Production-target verification must build and serve Svelte and React through Plan 00; browser-install prompt limitations should be documented in the test expectation when automation cannot synthesize the prompt.
- CSS/React styling enforcement: inspect registry first, use approved Button/Dialog primitives and `qar:` semantic-token utilities, update About/clear-data stories/registry for touched states, and avoid Svelte CSS/classes.
- Responsive/style proof must use `320x568`, `375x812`, `768x1024`, and `1280x900`, plus computed-style/CSS-variable assertions that About and clear-data dialog `qar:` utilities resolve through `--qa-react-*` semantic tokens for canvas, surface, text, muted text, border, focus, accent, disabled, and danger states.
- React architecture must keep `AboutRoute` as a container: clear-data confirmation, exact `DELETE` validation, destructive pending/error states, install affordance state, focus return, and reload transition live in a hook/reducer or route-owned helper and are passed into presentational components as props.
- Docs updates must land in `docs/context/surfaces/configure.md`, `docs/context/surfaces/infra.md` when clear-data/PWA behavior changes, and `docs/context/style-map.md` when proof ownership changes.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: About Content And Unsupported Claims

**Files:**
- Modify: `src-react/app/routes/settings/AboutRoute.tsx`
- Modify: `src-react/design-system/recipes/settings-page.tsx` only if route recipe states change
- Test: `tests/unit/react-storage/**` only if route-owned helpers need unit proof
- Test: `tests/e2e/configure/react-golden.spec.ts`

- [ ] Write failing tests that React About contains the Svelte mission, attribution, version/footer, and clear-data affordance, and omits unsupported claims about verified search/bookmarks/Daily Wird workflows.
- [ ] Port the current Svelte About content contract from `src/configure/about/About.svelte`; do not use later design prose as behavior.
- [ ] Use approved React UI primitives and `qar:` token utilities for any touched visible controls.

### Task 2: Clear Data And PWA Affordance

**Files:**
- Modify: React clear-data helper under `src-react/storage/` or route-owned settings helper
- Modify: React PWA install prompt helper only if needed
- Modify: `src-react/app/routes/settings/AboutRoute.tsx`
- Test: `tests/e2e/configure/react-golden.spec.ts`
- Test: `tests/unit/react-storage/**`

- [ ] Write failing tests for confirmation opening, exact `DELETE` requirement, cancel/Escape behavior, destructive action state, IDB/cache deletion, reload, and onboarding landing.
- [ ] Implement clear-data confirmation through a reducer/hook that owns input value, validity, pending, error, cancel, Escape, focus return, deletion, and reload transition; presentational dialog components receive state and callbacks only.
- [ ] Implement clear-data semantics compatible with Svelte without deleting or claiming Svelte production caches outside React proof scope.
- [ ] Implement the install affordance state that browser automation can prove; where `beforeinstallprompt` cannot be synthesized, match the Svelte unavailable state and document the test limitation.

### Task 3: Story, Registry, Docs, And Production Proof

**Files:**
- Modify: About/clear-data story and registry entries
- Modify: `docs/context/surfaces/configure.md` if behavior/proof ownership changes
- Modify: `docs/context/surfaces/infra.md` if clear-data/PWA behavior changes
- Modify: `docs/context/style-map.md` if proof ownership changes

- [ ] Update stories/registry for default, install-unavailable, install-available, confirmation, destructive disabled/enabled, focus-visible, mobile/tablet/desktop, light/sepia/dark states.
- [ ] Add production Svelte-vs-React e2e proof for content/action parity and removed-scope claim absence.
- [ ] Add measured responsive and token-resolved style proof at `320x568`, `375x812`, `768x1024`, and `1280x900` for About content, install affordance, clear-data dialog, destructive states, and focus rings.
- [ ] Run:

```bash
pnpm exec vitest run tests/unit/react-storage --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "about-page"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Tests To Write First

- Component/unit: About page contains Svelte mission, attribution, version/footer, and clear-data affordance.
- Component/unit: unsupported claims about verified React search/bookmarks/Daily Wird workflows are absent.
- E2E: Clear all data opens confirmation, requires exact `DELETE`, deletes IDB/cache state, reloads, and lands in onboarding.
- E2E: PWA install button state mirrors Svelte install-prompt availability as far as browser automation can simulate.
- E2E: About route has no removed-scope claims.

Expected before implementation: tests fail because About content is preview-specific and clear-data/PWA behavior is missing.

## Implementation Steps

- [ ] Copy the current Svelte About content contract, not later design prose.
- [ ] Inspect `src-react/design-system/registry/component-registry.json` and use approved `src-react/components/ui` primitives for buttons/dialogs.
- [ ] Use only React semantic-token `qar:` utilities and owned Dialog variants; do not import/copy Svelte CSS or `.qa-*` classes.
- [ ] Update About/clear-data stories and registry for default, install-unavailable, install-available, confirmation, destructive disabled/enabled, focus-visible, mobile/tablet/desktop, and light/sepia/dark states touched by this plan.
- [ ] Remove unsupported React preview claims.
- [ ] Implement clear-data confirmation and deletion semantics compatible with Svelte.
- [ ] Ensure clear-data reload triggers React launch onboarding from Plan 01.
- [ ] Implement install prompt affordance state if browser support is available; otherwise match Svelte unavailable state.
- [ ] Preserve accessibility: dialog focus, Esc/cancel behavior, destructive action naming.

## Commands

```bash
pnpm exec vitest run tests/unit/react-storage --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "about-page"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: About/clear-data targeted tests pass.

## Documentation

- Update `docs/context/surfaces/configure.md` if React dual-build behavior is documented.
- Update `docs/context/surfaces/infra.md` for clear-data/PWA behavior if needed.
- Update `docs/context/style-map.md` for proof ownership.

## Acceptance Criteria

- `RPA-009` is closed.
- Unsupported React claims are removed.
- Clear-data resets to onboarding.
- PWA install affordance matches Svelte-supported states.
