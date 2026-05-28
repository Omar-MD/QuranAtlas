# React Production Parity Fix 01 - Launch Restore And Onboarding

> Superseded current-state note: `docs/superpowers/specs/2026-05-28-mvp-default-assets-reset-design.md` retires onboarding source-choice parity for the current MVP. React and Svelte now launch through the default asset reset and open/restore the reader without a setup wizard.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-001` and `RPA-007` by restoring first-run launch gating and a React-shortened onboarding flow.

**Depends on:** Plan 00.

**Unblocks:** all clean-context workflow tests.

## Required Context

Read:

- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/read.md`
- `tests/e2e/AGENTS.md`
- `tests/unit/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/onboard/Onboarding.svelte`
- `src/onboard/OnboardingScreen.svelte`
- `src/onboard/screens.ts`
- `src/onboard/state.ts`
- `src/configure/variant-bundle.ts`
- `src/configure/panel-bridge.ts`
- `src/configure/state-last-surface.svelte.ts`
- `src/App.svelte`

React target:

- `src-react/app/App.tsx`
- `src-react/app/router/routes.ts`
- `src-react/app/routes/onboarding/OnboardingRoute.tsx`
- `src-react/continuity/launch-restore.ts`
- `src-react/continuity/last-surface.ts`
- `src-react/storage/**`

Tests:

- `tests/e2e/onboard/react-golden.spec.ts`
- `tests/e2e/navigate/react-golden.spec.ts`
- `tests/e2e/fixtures/react-golden-routes.ts`
- `tests/unit/react-continuity/continuity-wave3.test.ts`
- `tests/unit/react-shell/routes.test.ts`

## Files To Modify

- `src-react/app/App.tsx`
- `src-react/app/router/routes.ts`
- `src-react/app/routes/onboarding/OnboardingRoute.tsx`
- `src-react/continuity/launch-restore.ts`
- `src-react/continuity/last-surface.ts`
- React settings/storage writers needed for `settings.onboardingComplete`, `settings.riwayah`, and `settings.translationId`
- `tests/unit/react-continuity/continuity-wave3.test.ts`
- `tests/unit/react-shell/routes.test.ts`
- `tests/e2e/onboard/react-golden.spec.ts`
- `tests/e2e/navigate/react-golden.spec.ts`
- `docs/context/surfaces/onboard.md` if React proof ownership or current dual-build behavior is documented
- `docs/context/style-map.md` if proof ownership changes

## Readiness Refinement

- Execute only after Plan 00 has landed enough harness support to compare clean-launch/onboarding behavior against Svelte.
- Test-first checkpoint: write the launch/onboarding unit and production-target e2e assertions, run them against the current React build, and confirm they fail on the launch bypass/static onboarding behavior before editing app code.
- Svelte-vs-React comparison covers launch routing, `settings.onboardingComplete`, ambient chrome absence during onboarding, final route, and reload restore; the only accepted difference is the shortened React onboarding content below.
- Production-target verification must use `pnpm run build`, `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react`, and the Plan 00 strict preview harness, not the React dev server.
- CSS/React styling enforcement: inspect the registry first, use approved `src-react/components/ui` primitives and `qar:` semantic-token utilities, update stories/registry for touched onboarding states, and keep route files as containers.
- Responsive/style proof must use `320x568`, `375x812`, `768x1024`, and `1280x900`, plus computed-style/CSS-variable assertions that touched `qar:` utilities resolve through `--qa-react-*` semantic tokens for canvas, surface, text, muted text, border, focus, accent, selected, disabled, and danger states where present.
- Docs updates must land with behavior/proof ownership changes in `docs/context/surfaces/onboard.md` and `docs/context/style-map.md`; generated fences require `pnpm run docs`.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Launch Restore Contract

**Files:**
- Modify: `src-react/continuity/launch-restore.ts`
- Modify: `src-react/continuity/last-surface.ts`
- Modify: `src-react/app/App.tsx`
- Modify: `src-react/app/router/routes.ts`
- Test: `tests/unit/react-continuity/continuity-wave3.test.ts`
- Test: `tests/unit/react-shell/routes.test.ts`

- [x] Write failing unit coverage for clean storage returning `#/onboarding`, onboarded empty-hash restore returning the last valid reader route, and invalid last-surface fallback.
- [x] Implement `useLaunchRestore` or equivalent route-container hook so storage reads and route normalization stay out of presentational components.
- [x] Remove or update tests that encode clean empty-hash as `#/s/1`.
- [x] Run:

```bash
pnpm exec vitest run tests/unit/react-continuity tests/unit/react-shell --config vitest.react.config.ts
```

### Task 2: Two-Step React Onboarding Flow

**Files:**
- Modify: `src-react/app/routes/onboarding/OnboardingRoute.tsx`
- Modify: React storage writers for `settings.onboardingComplete`, `settings.riwayah`, and `settings.translationId`
- Modify: registry/story files named by the current onboarding registry entry
- Test: `tests/e2e/onboard/react-golden.spec.ts`

- [x] Write failing component/e2e coverage that React onboarding exposes only Riwayah and Translation choices and writes all completion state only on final completion.
- [x] Include measured responsive and token-resolved style checks at `320x568`, `375x812`, `768x1024`, and `1280x900` for source rows, selected/disabled states, focus rings, and primary/secondary actions.
- [x] Implement a controlled `useOnboardingFlow` reducer with `riwayah` and `translation` steps, loading/error/disabled states, and focus movement to the current step heading.
- [x] Use available source metadata through existing React data/storage facades; do not hardcode source lists unless the current metadata boundary already does so and the test names that limitation.
- [x] Update stories and registry states for loading, unavailable, selected, disabled, focus-visible, mobile, tablet, desktop, light, sepia, and dark.

### Task 3: Production Comparison And Docs

**Files:**
- Modify: `tests/e2e/onboard/react-golden.spec.ts`
- Modify: `tests/e2e/navigate/react-golden.spec.ts`
- Modify: `docs/context/surfaces/onboard.md` only if behavior/proof ownership changes
- Modify: `docs/context/style-map.md` only if proof ownership changes

- [x] Add production-target e2e proof for clean launch, onboarding completion, reload restore, ambient chrome absence, keyboard traversal, and touch targets.
- [x] Run:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "launch-fresh-onboarding|launch-restore-reader"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Intentional Difference

React onboarding must carry only:

- Riwayah selection.
- Translation selection.
- Completion state and route transition.

Do not port Svelte theme, shortcuts, reading preference, offline expectation, Daily Wird, or later onboarding screens into React.

## React Component Contract

- Inspect `src-react/design-system/registry/component-registry.json` before editing and compose approved primitives from `src-react/components/ui`.
- Use only `qar:` semantic-token utilities and owned recipes/variants; do not import or copy Svelte CSS or `.qa-*` classes.
- `App` and route files stay as containers; launch storage reads live in `useLaunchRestore` or an equivalent hook.
- Onboarding uses a React-only `useOnboardingFlow` reducer with exactly two steps: Riwayah and Translation.
- Riwayah and Translation controls are controlled choice groups with loading/error states for metadata.
- Persistence happens only through one completion command that writes `settings.onboardingComplete`, `settings.riwayah`, and `settings.translationId` through the storage facade before navigation.
- Step changes move focus to the new step heading; completion moves focus to the reader landmark after route change.
- No partial writes occur while the user is still choosing.
- Define onboarding component style variants/states before implementation: default, loading, unavailable source, selected, disabled, focus-visible, error, mobile, tablet, desktop, light, sepia, and dark.
- Update registry entries and stories for changed onboarding components in the same change.

## Tests To Write First

- Unit: `getInitialReactHash` or launch-restore helper returns onboarding for clean storage and restores valid last reader surface only after onboarding is complete.
- Unit: completing React onboarding writes `settings.onboardingComplete`, selected Riwayah, and selected Translation through React storage writers.
- Unit: reducer prevents completion until required Riwayah and Translation state is ready.
- E2E: clean React production-target launch `/` reaches `#/onboarding`, not `#/s/1`.
- E2E: onboarding flow exposes only Riwayah and Translation choices, then routes to `#/s/1`.
- E2E: keyboard traversal, focus handoff, and touch targets work across both onboarding steps.
- E2E: after completion and reload with empty hash, React restores last valid reader route like Svelte.

Expected before implementation: tests fail on the current React launch bypass and static onboarding card.

## Implementation Steps

- [x] Discover exact Svelte launch restore semantics from `src/onboard/state.ts`, `src/App.svelte`, and last-surface writer behavior. Record any uncertainty in the test comments or implementation notes, not in product docs.
- [x] Implement React launch gating around `settings.onboardingComplete`.
- [x] Ensure `#/onboarding` is reachable only for clean/incomplete setup unless direct route behavior must mirror Svelte. If Svelte behavior is stricter, follow Svelte.
- [x] Replace the single-card React onboarding with the controlled two-step Riwayah and Translation flow.
- [x] Use real available Riwayah and Translation metadata. If React lacks the metadata loader, add a discovery step and use the same data boundary as Plan 02/05 rather than hardcoded product lists.
- [x] Persist completion and selected options through shared React storage facades.
- [x] Hide React reader chrome/header during onboarding if Svelte hides ambient chrome.
- [x] Remove tests that encode empty hash as `#/s/1` for a clean browser.

## Commands

```bash
pnpm exec vitest run tests/unit/react-continuity tests/unit/react-shell --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "launch-fresh-onboarding|launch-restore-reader"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: targeted unit and e2e tests pass; broader parity suites may still fail on other RPA issues.

## Documentation

- Update `docs/context/surfaces/onboard.md` only if the React dual-build proof state is documented there.
- Update `docs/context/style-map.md` if React onboarding proof ownership changes.

## Acceptance Criteria

- `RPA-001` is closed.
- `RPA-007` is closed with the intentional React-shortened onboarding scope.
- Clean launch no longer bypasses onboarding.
- Existing false expectation that empty hash always means `#/s/1` is removed.
