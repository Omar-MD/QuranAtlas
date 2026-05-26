# React Production Parity Fix 06 - Daily Wird Continuity

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-008` by wiring React Daily Wird to real continuity state instead of static `plan={null}` rendering.

**Depends on:** Plans 00, 01, 02, 03, and 04.

**Unblocks:** Plan 09.

## Required Context

Read:

- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/data-model.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/read/wird/DailyWirdCard.svelte`
- `src/read/wird/WirdDetail.svelte`
- `src/read/wird/store.ts`
- `src/read/wird/progress.ts`
- `src/read/wird/metadata.ts`
- `src/read/wird/notifications.ts`
- `src/navigate/NavDrawer.svelte`

React target:

- `src-react/app/routes/read/ReaderRoute.tsx`
- `src-react/components/reader/wird/DailyWirdCard.tsx`
- `src-react/components/reader/wird/WirdProgressMeter.tsx`
- `src-react/components/navigation/wird/WirdDetail.tsx`
- `src-react/components/navigation/wird/WirdPlanEditor.tsx`
- `src-react/components/navigation/wird/WirdReminderControl.tsx`
- `src-react/components/navigation/wird/WirdResetConfirm.tsx`
- `src-react/continuity/wird/**`
- `src-react/continuity/current-position.ts`

Tests:

- `tests/unit/react-wird/wird-wave3.test.tsx`
- `tests/unit/react-continuity/continuity-wave3.test.ts`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/navigate/react-golden.spec.ts`

## Files To Modify

- `src-react/app/routes/read/ReaderRoute.tsx`
- `src-react/components/reader/wird/**`
- `src-react/components/navigation/wird/**`
- `src-react/continuity/wird/**`
- `src-react/continuity/current-position.ts`
- `tests/unit/react-wird/**`
- `tests/unit/react-continuity/**`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/navigate/react-golden.spec.ts`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/style-map.md`

## Readiness Refinement

- Execute only after Plans 00, 01, 02, 03, and 04 so reader continuity, Mushaf/read asset contracts, and drawer entry points are real.
- Test-first checkpoint: write no-plan, active-plan, continue, reload, editor/reset, and generic-main false-positive assertions, run them against the current React production-target build, and confirm failures on static `plan={null}` behavior before app edits.
- Svelte-vs-React comparison covers `settings.wirdPlan` shape, monotonic progress, Daily Wird drawer/reader summary state, continue routing, reload persistence, focus handling, and responsive card/detail/editor layout.
- Production-target verification must build Svelte and React and run the same seeded workflows through Plan 00; a static no-plan render is not acceptable proof.
- CSS/React styling enforcement: inspect registry first, use approved UI primitives and `qar:` semantic-token utilities, update Daily Wird stories/registry for touched states, and avoid Svelte CSS/classes.
- Responsive/style proof must use `320x568`, `375x812`, `768x1024`, and `1280x900`, plus computed-style/CSS-variable assertions that Daily Wird `qar:` utilities resolve through `--qa-react-*` semantic tokens for canvas, surface, text, muted text, border, focus, accent, progress, warning, and danger states.
- Docs updates must land in `docs/context/surfaces/read.md`, `docs/context/surfaces/navigate.md`, and `docs/context/style-map.md` when behavior or proof ownership changes.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Wird Store And Progress Model

**Files:**
- Modify: `src-react/continuity/wird/**`
- Modify: `src-react/continuity/current-position.ts`
- Test: `tests/unit/react-wird/**`
- Test: `tests/unit/react-continuity/**`

- [ ] Write failing unit tests for empty `settings.wirdPlan`, active plan progress, monotonic progress, Continue route, validation-error state, reminder state, and reload persistence.
- [ ] Implement `useWirdPlan` or equivalent reducer/provider over the shared v7 settings key; keep storage access in continuity facades, not product components.
- [ ] Derive plan progress from stored plan and current reader position using Svelte-compatible normalization rules.

### Task 2: Reader Summary And Drawer Detail

**Files:**
- Modify: `src-react/app/routes/read/ReaderRoute.tsx`
- Modify: `src-react/components/reader/wird/DailyWirdCard.tsx`
- Modify: `src-react/components/reader/wird/WirdProgressMeter.tsx`
- Modify: `src-react/components/navigation/wird/WirdDetail.tsx`
- Modify: `src-react/components/navigation/wird/WirdPlanEditor.tsx`
- Modify: `src-react/components/navigation/wird/WirdReminderControl.tsx`
- Modify: `src-react/components/navigation/wird/WirdResetConfirm.tsx`
- Modify: Daily Wird story and registry entries

- [ ] Write failing component tests proving route code no longer passes static `plan={null}` and active/no-plan/editor/reset states render from shared state.
- [ ] Implement controlled editor inputs, save/cancel/reset confirmation, focus handling, and Continue routing.
- [ ] Keep browser notification behavior only where current Svelte behavior and existing React reminder support require it; otherwise document the explicit discovery result in test comments.
- [ ] Update stories/registry for no-plan, active, editor, validation-error, reset-confirmation, long-label, focus-visible, mobile/tablet/desktop, light/sepia/dark, unavailable, and reminder states.

### Task 3: Production Parity Proof

**Files:**
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `tests/e2e/navigate/react-golden.spec.ts`
- Modify: `docs/context/surfaces/read.md` if proof ownership changes
- Modify: `docs/context/surfaces/navigate.md` if proof ownership changes
- Modify: `docs/context/style-map.md` if proof ownership changes

- [ ] Add no-plan create, active seed progress, Continue route, reload, editor cancel/save/reset confirmation, focus, and responsive/style assertions.
- [ ] Ensure the existing `daily-wird-active` fixture fails if it only sees the generic reader landmark.
- [ ] Run:

```bash
pnpm exec vitest run tests/unit/react-wird tests/unit/react-continuity --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "daily-wird-no-plan|daily-wird-active"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Tests To Write First

- Unit: no-plan state renders create-plan affordance from empty `settings.wirdPlan`.
- Unit: active plan progress derives from stored plan and current reader position.
- Unit: progress is monotonic and does not move backward on backward scrolling.
- Unit: Continue routes to `progress.nextRef`, not ordinary current position.
- Unit: `useWirdPlan` or equivalent reducer covers no-plan, editing, saving, active, resetting, cancel, validation-error, and reminder states.
- E2E: no-plan create flow writes a plan and survives reload.
- E2E: active plan seed renders progress and Continue routes to the expected verse.
- E2E: editor cancel/save/reset confirmation preserve focus and do not drift between reader summary and drawer detail.
- E2E responsive/style: Daily Wird summary, detail, editor, and reset confirmation keep stable dimensions, tokenized touch targets, no label clipping, and token-resolved light/sepia/dark/night styling at `320x568`, `375x812`, `768x1024`, and `1280x900`.
- E2E: existing `daily-wird-active` fixture must fail if it only sees generic reader main.

Expected before implementation: tests fail because route passes `plan={null}` and tests do not assert active state.

## Implementation Steps

- [ ] Discover Svelte `settings.wirdPlan` shape and normalization rules.
- [ ] Inspect `src-react/design-system/registry/component-registry.json` and use approved `src-react/components/ui` primitives.
- [ ] Use only React semantic-token `qar:` utilities and owned variants; do not import/copy Svelte CSS or `.qa-*` classes.
- [ ] Update Daily Wird stories/registry for no-plan, active, editor, validation-error, reset-confirmation, long-label, focus-visible, mobile/tablet/desktop, light/sepia/dark, and unavailable/reminder states touched by this plan.
- [ ] Implement `useWirdPlan` provider/reducer shared by reader summary and drawer detail.
- [ ] Replace static React Daily Wird route props with real store reads.
- [ ] Implement controlled editor inputs, validation, save/cancel/reset states, and reset confirmation focus handling to the Svelte parity level.
- [ ] Wire drawer detail and reader summary to the same state.
- [ ] Implement Continue route behavior and reload persistence.
- [ ] Keep browser notification behavior only if Svelte current behavior requires it and the existing React reminder files support it; otherwise add an explicit discovery step.

## Commands

```bash
pnpm exec vitest run tests/unit/react-wird tests/unit/react-continuity --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "daily-wird-no-plan|daily-wird-active"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: Daily Wird targeted tests pass.

## Documentation

- Update `docs/context/surfaces/read.md` and `docs/context/surfaces/navigate.md` if React dual-build proof ownership changes.
- Update `docs/context/style-map.md` for React proof ownership.

## Acceptance Criteria

- `RPA-008` is closed.
- Daily Wird state is real, persistent, and reload-safe.
- Static no-plan rendering is removed from route code.
