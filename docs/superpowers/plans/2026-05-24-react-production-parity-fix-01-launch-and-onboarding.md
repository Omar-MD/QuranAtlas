# React Production Parity Fix 01 - Launch Restore And Onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-001` and `RPA-007` by restoring first-run launch gating and a React-shortened onboarding flow.

**Depends on:** Plan 00.

**Unblocks:** all clean-context workflow tests.

## Required Context

Read:

- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
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

- [ ] Discover exact Svelte launch restore semantics from `src/onboard/state.ts`, `src/App.svelte`, and last-surface writer behavior. Record any uncertainty in the test comments or implementation notes, not in product docs.
- [ ] Implement React launch gating around `settings.onboardingComplete`.
- [ ] Ensure `#/onboarding` is reachable only for clean/incomplete setup unless direct route behavior must mirror Svelte. If Svelte behavior is stricter, follow Svelte.
- [ ] Replace the single-card React onboarding with the controlled two-step Riwayah and Translation flow.
- [ ] Use real available Riwayah and Translation metadata. If React lacks the metadata loader, add a discovery step and use the same data boundary as Plan 02/05 rather than hardcoded product lists.
- [ ] Persist completion and selected options through shared React storage facades.
- [ ] Hide React reader chrome/header during onboarding if Svelte hides ambient chrome.
- [ ] Remove tests that encode empty hash as `#/s/1` for a clean browser.

## Commands

```bash
pnpm exec vitest run tests/unit/react-continuity tests/unit/react-shell --config vitest.react.config.ts
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run build
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
