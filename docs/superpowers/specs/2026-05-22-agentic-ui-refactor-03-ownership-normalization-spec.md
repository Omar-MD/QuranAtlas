# Agentic UI Refactor 03 - Ownership Normalization Implementation Spec

> **For sequential agents:** Start only after Spec 02 is committed. This spec
> may rename classes and adjust Svelte/component boundaries, but only one
> component cluster at a time.

## Goal

Align component source, CSS partials, class names, tests, and surface docs so
ownership is searchable and unambiguous.

## Depends On

- Spec 02 complete and committed.
- Nested CSS partials are imported exactly once.
- Mechanical split ledger exists locally or can be regenerated from the prior
  commit.
- `pnpm run check` passes at the start.

## Produces

- Read-owned chrome selectors and comments no longer imply navigate ownership.
- Daily Wird presentation remains read-owned even when rendered in the drawer.
- Verse Settings and Mushaf Settings share one row/control grammar where the UI
  already behaves as the same control family.
- Optional Svelte extraction only where it improves ownership without changing
  behavior.
- Tests and docs updated with each ownership change.

## Non-Goals

- Do not make broad visual redesign changes.
- Do not clean unrelated dead selectors; Spec 04 owns broad dead-selector and
  token cleanup.
- Do not add new product scope.
- Do not change router, bridge-module, store, or app-bootstrap ownership.
- Do not split a Svelte component unless tests and browser proof cover the
  behavior before and after extraction.

## Required Reads

- `src/read/AmbientDock.svelte`
- `src/read/AmbientPill.svelte`
- `src/read/MarginHeader.svelte`
- `src/read/SurahProgress.svelte`
- `src/read/wird/DailyWirdCard.svelte`
- `src/navigate/NavDrawer.svelte`
- `src/configure/settings/SettingsShell.svelte`
- `src/configure/settings/VerseSettings.svelte`
- `src/configure/settings/MushafSettings.svelte`
- `src/configure/settings/NestedAssetPicker.svelte`
- `src/configure/settings/ThemeNightControls.svelte`
- `src/onboard/Onboarding.svelte`
- `src/onboard/OnboardingScreen.svelte`
- owning CSS partials created by Spec 02
- owning unit tests under `tests/unit/read/**`, `tests/unit/navigate/**`,
  `tests/unit/configure/**`, and `tests/unit/onboard/**` if present
- owning e2e specs under `tests/e2e/read/**`, `tests/e2e/navigate/**`,
  `tests/e2e/configure/**`, and `tests/e2e/onboard/**`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md` before adding or changing e2e coverage

## Work Packages

### 1. Read Chrome Ownership

Review read chrome classes and comments for:

- AmbientDock
- AmbientPill
- MarginHeader
- SurahProgress

Required result:

- CSS lives under `src/styles/surfaces/read/**`.
- Svelte files live under `src/read/**`.
- Tests live under `tests/unit/read/**` unless browser-only behavior requires
  `tests/e2e/read/**`.
- Comments refer to `src/read/**`, not old navigate paths.
- Class names are renamed only when they actively mislead ownership.

If class names are renamed, update Svelte, CSS, unit tests, e2e selectors, and
surface docs in the same commit.

### 2. Daily Wird Cross-Surface Use

`src/navigate/NavDrawer.svelte` may render `DailyWirdCard`, but ownership stays
with `src/read/wird/**`.

Required result:

- Daily Wird CSS lives under `src/styles/surfaces/read/wird.css` or an equally
  clear read-owned partial.
- Navigate drawer CSS may constrain placement, but it must not own the card's
  internal presentation.
- `docs/context/surfaces/read.md` and `docs/context/surfaces/navigate.md`
  describe this cross-surface relationship.

### 3. Settings Row Grammar

Normalize the class and control grammar shared by:

- `SettingsShell.svelte`
- `VerseSettings.svelte`
- `MushafSettings.svelte`
- `NestedAssetPicker.svelte`
- `ThemeNightControls.svelte`

Required result:

- Equivalent rows use equivalent selector grammar.
- Variant-specific rows keep variant-specific modifiers.
- Active, disabled, loading, missing, stale, unavailable, error, and selected
  states remain distinguishable without relying on color alone.
- Existing settings tests continue to pass or are updated for renamed classes.

Do not redesign settings layout. This is naming and ownership normalization.

### 4. Optional Onboarding Extraction

`src/onboard/Onboarding.svelte` may be split only if it improves searchable
ownership.

Allowed extraction shape:

```text
src/onboard/screens/
  WelcomeStep.svelte
  ThemeStep.svelte
  RiwayahStep.svelte
  TranslationStep.svelte
  ShortcutsStep.svelte
  StartStep.svelte
```

Do this only when:

- existing onboarding behavior tests cover the flow;
- extracted components receive explicit props and callbacks;
- state ownership remains in `src/onboard/state.ts` and the parent flow;
- `OnboardingScreen.svelte` remains the shared shell.

If extraction is not worth it, leave the component intact and state that in the
handoff.

## Verification

Run targeted tests for each touched surface. Typical commands:

```bash
pnpm vitest run tests/unit/read/AmbientDock.test.ts tests/unit/read/MarginHeader-toggle.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
pnpm vitest run tests/unit/configure/panel.test.ts tests/unit/configure/theme.test.ts tests/unit/configure/night-mode.test.ts
pnpm playwright test tests/e2e/read/chrome.spec.js --project=chromium --reporter=line
pnpm playwright test tests/e2e/configure/settings.spec.js --project=chromium --reporter=line
```

Only run e2e specs that prove browser-only behavior for touched components.
Then run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

## Acceptance Criteria

- Ownership comments, class grammar, tests, and docs all point to the same
  owner for each touched component.
- Cross-surface rendering does not move presentation ownership away from the
  source component.
- Settings row grammar is consistent where controls are equivalent.
- Optional onboarding extraction is either completed with tests or explicitly
  deferred in the handoff.
- No broad dead-selector cleanup is mixed into this spec.
- Verification commands pass.

## Commit

Suggested message:

```bash
git commit -m "refactor(ui): normalize component style ownership"
```

## Handoff To Spec 04

Tell the next agent:

- which class names were renamed;
- which tests and e2e selectors were updated;
- which old selectors are now likely dead;
- whether onboarding extraction was completed or deferred;
- which advisory selector/token/design warnings remain.
