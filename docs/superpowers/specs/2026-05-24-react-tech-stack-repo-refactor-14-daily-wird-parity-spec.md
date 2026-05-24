# React Tech Stack Refactor 14 - Daily Wird Parity Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-09-reader-surface-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-10-navigation-settings-onboarding-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-13-continuity-bookmarks-parity-spec.md`

## Purpose

Rebuild Daily Wird in React as reader-adjacent continuity: one active reading
plan, progress persistence, drawer entry, reader integration, reminder state,
and focused tests without turning it into accounts, sync, streaks, social, or
generic habit tracking.

## Current Docs Requirement

This spec is internal product behavior. If implementation adds browser
notification helper libraries, date libraries, scheduler libraries, or service
worker notification APIs beyond existing platform usage, fetch current docs
through Context7 before writing the implementation plan.

## Scope

In scope:

- React Daily Wird plan store and progress helpers.
- `settings.wirdPlan` persistence through the existing settings key.
- Daily Wird card in navigation drawer.
- In-drawer create, edit, reset, and continue flows.
- Reader progress updates when saved position enters the active plan range.
- Reminder permission and reminder display state.
- Unit and e2e coverage for plan creation, progress, continue, edit, reset, and
  reminder states.

Out of scope:

- Accounts, cloud sync, social streaks, analytics, import/export.
- Notifications that fire without explicit permission flow.
- Multiple concurrent plans.
- Changing settings store schema.
- Search or metadata implementation except where displayed in plan references.

## Required Reads

- `AGENTS.md`
- `docs/product-info.md`
- `docs/context/data-model.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `09`, `10`, and `13`

## Allowed Files And Directories

Allowed create:

- `src-react/continuity/wird/**`
- `src-react/components/reader/wird/**`
- `src-react/components/navigation/wird/**`
- Unit tests under `tests/unit/read/**` or React-specific placement under
  `tests/unit/**`
- E2E tests under `tests/e2e/read/**` or `tests/e2e/navigate/**`

Allowed modify:

- Navigation drawer composition.
- Reader position/progress hooks.
- Component registry entries and stories.
- Context docs when current behavior changes.

Forbidden modify:

- Settings store schema.
- Bookmark scope or launch restore behavior.
- Removed review/mark/personal-note product branches.
- Browser notification prompts outside user gestures.

## Wird Contract

React must preserve:

- one active plan at `settings.wirdPlan`;
- sole writer owned by the read/continuity Daily Wird module;
- plan creation with target duration/date, display unit, start point, and
  reminder preference;
- progress monotonicity: backward scrolling does not reduce completed progress;
- missed-day recomputation from remaining verses and remaining calendar days;
- Continue routes to the active plan's next unread reference;
- ordinary `settings.currentPosition` remains normal resume source;
- reminder permission requested only from a user gesture;
- denied/default/granted/unsupported reminder states visible to the user;
- reset requires explicit confirmation.

Daily Wird UI belongs near reading continuity. It should appear in the reader
drawer and reader-adjacent surfaces, not as a separate productivity app.

## Component Requirements

Register and prove:

- `DailyWirdCard`;
- `WirdDetail`;
- `WirdPlanEditor`;
- `WirdProgressMeter`;
- `WirdReminderControl`;
- `WirdResetConfirm`.

Stories must cover no-plan, today-complete, plan-complete, in-progress,
overdue/missed-day recompute, reminder default, granted, denied, unsupported,
mobile drawer, desktop drawer, and reduced-motion states.

## Deliverables

- React Daily Wird store, reducer, progress, reminder, and route-continuity
  helpers.
- Drawer card, detail, plan editor, progress meter, reminder control, and reset
  confirmation components.
- Registry entries, stories, unit/component tests, visual proof, and accessibility
  proof for required Daily Wird states.
- E2E proof for create, edit, reset, continue, reminder, reload, and reader
  progress flows.
- Updated context docs, data-model/settings-key notes, registry records, and
  tech-stack entries for any current behavior, script, or verification changes.

## Acceptance Criteria

- Plan data persists in `settings.wirdPlan`.
- Reader progress updates are monotonic and scoped to the active plan range.
- Continue routes to the next unread reference.
- Drawer card reflects no-plan, in-progress, today-complete, and plan-complete
  states.
- Reminder permission flow is user-gesture initiated and accessible.
- Daily Wird does not introduce accounts, sync, social, or review concepts.

## Verification

Run targeted Daily Wird tests, plus:

```bash
pnpm run docs:check
git diff --check
```

Run owning e2e specs where browser behavior is touched:

```bash
pnpm exec playwright test tests/e2e/read tests/e2e/navigate --reporter=line
```

If app runtime or storage behavior changes, also run:

```bash
pnpm run check
pnpm run build:react
```

Expected result:

- Daily Wird unit and e2e coverage passes.
- Registry, Storybook, visual, and accessibility proof exist for Daily Wird
  components.
- Docs checks are clean.

## Rollback And Failure Handling

- If progress can move backward, block reader progress writes until the monotonic
  reducer is fixed.
- If notification permission is denied or unsupported, keep in-app reminder
  state usable and avoid repeated automatic prompts.
- If plan state corrupts, expose reset and fallback to no-plan rather than
  breaking reader launch.

## Handoff

Child spec `15 Golden Routes And Accessibility Gates` must include Daily Wird
proof for no-plan, active-plan, and continue flows. Cutover readiness must verify
Daily Wird continuity survives reload and reader route changes.
