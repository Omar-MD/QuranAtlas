# Agentic UI Refactor 03 - Ownership Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align component source, CSS partial ownership, class grammar, tests, and docs after the mechanical CSS split.

**Architecture:** Normalize one component family at a time after the CSS move has proven stable. Cross-surface rendering is allowed, but ownership stays with the source component and each rename updates Svelte, CSS, tests, and docs together.

**Tech Stack:** Svelte 5 components, centralized CSS partials, Vitest, Playwright, QuranAtlas surface dossiers, pnpm.

---

## Required Context

Read these before editing:

- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-03-ownership-normalization-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-02-css-partial-split.md`
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
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## File Structure

Modify only component families being normalized:

- `src/read/**`
- `src/navigate/NavDrawer.svelte`
- `src/configure/settings/**`
- `src/onboard/**` only if extracting onboarding steps.
- Owning CSS partials in `src/styles/surfaces/read/**`, `navigate/**`, `configure/**`, and `onboard/**`.
- Owning tests in `tests/unit/**` and browser-only specs in `tests/e2e/**`.
- Owning dossiers in `docs/context/surfaces/*.md`.

Optional create:

- `src/onboard/screens/WelcomeStep.svelte`
- `src/onboard/screens/ThemeStep.svelte`
- `src/onboard/screens/RiwayahStep.svelte`
- `src/onboard/screens/TranslationStep.svelte`
- `src/onboard/screens/ShortcutsStep.svelte`
- `src/onboard/screens/StartStep.svelte`

## Task 1: Normalize Read Chrome Ownership

**Files:**
- Modify: `src/read/AmbientDock.svelte`
- Modify: `src/read/AmbientPill.svelte`
- Modify: `src/read/MarginHeader.svelte`
- Modify: `src/read/SurahProgress.svelte`
- Modify: `src/styles/surfaces/read/ambient-dock.css`
- Modify: `src/styles/surfaces/read/ambient-pill.css`
- Modify: `src/styles/surfaces/read/margin-header.css`
- Modify: `src/styles/surfaces/read/surah-progress.css`
- Modify: `tests/unit/read/AmbientDock.test.ts`
- Modify: `tests/unit/read/MarginHeader-toggle.test.ts`
- Modify: `tests/e2e/read/chrome.spec.js`
- Modify: `docs/context/surfaces/read.md`

- [ ] **Step 1: Inventory current chrome class names**

Run:

```bash
rg -n "qa-(dock|ambient-pill|margin-header|surah-progress)|src/navigate|src/nav/" src/read src/styles/surfaces/read tests docs/context/surfaces/read.md
```

Expected: list of read chrome selectors and any stale ownership comments.

- [ ] **Step 2: Rename only misleading classes**

If a class name implies the wrong surface, rename one family at a time. Example pattern:

```text
qa-nav-dock-* -> qa-dock-*
qa-nav-header-* -> qa-margin-header-*
```

Update Svelte, CSS, unit tests, e2e selectors, and docs in the same edit.

- [ ] **Step 3: Correct comments**

Replace stale comments with current ownership wording:

```text
Read surface owns this component and its CSS; navigate may open or place it through documented bridges.
```

- [ ] **Step 4: Run focused read chrome proof**

Run:

```bash
pnpm vitest run tests/unit/read/AmbientDock.test.ts tests/unit/read/MarginHeader-toggle.test.ts
pnpm playwright test tests/e2e/read/chrome.spec.js --project=chromium --reporter=line
pnpm run check
```

Expected: all pass.

- [ ] **Step 5: Regenerate docs if inventories changed**

Run:

```bash
pnpm run docs
pnpm run docs:check
```

Expected: docs generated cleanly.

- [ ] **Step 6: Commit read chrome normalization**

Run:

```bash
git add src/read src/styles/surfaces/read tests/unit/read tests/e2e/read docs/context/surfaces/read.md docs/context
git commit -m "refactor(read): normalize chrome style ownership"
```

Expected: commit succeeds.

## Task 2: Normalize Daily Wird Cross-Surface Ownership

**Files:**
- Modify: `src/read/wird/DailyWirdCard.svelte`
- Modify: `src/navigate/NavDrawer.svelte`
- Modify: `src/styles/surfaces/read/wird.css`
- Modify: `src/styles/surfaces/navigate/drawer-shell.css`
- Modify: `tests/unit/read/wird/DailyWirdCard.test.ts`
- Modify: `tests/unit/navigate/drawer.test.ts`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/navigate.md`

- [ ] **Step 1: Find Wird selectors and drawer placement**

Run:

```bash
rg -n "qa-wird|DailyWirdCard|wird" src/read src/navigate src/styles/surfaces tests docs/context/surfaces
```

Expected: all Daily Wird presentation selectors live under read CSS or are ready to move there.

- [ ] **Step 2: Move internal presentation to read ownership**

Keep internal card selectors in `src/styles/surfaces/read/wird.css`. Limit navigate CSS to placement wrappers such as:

```css
.qa-drawer-wird-slot {
  display: grid;
}
```

- [ ] **Step 3: Document cross-surface use**

Add current-state wording to both dossiers:

```markdown
`NavDrawer.svelte` renders `DailyWirdCard`, but read owns the card source and presentation styles; navigate owns only drawer placement.
```

- [ ] **Step 4: Verify Wird behavior**

Run:

```bash
pnpm vitest run tests/unit/read/wird/DailyWirdCard.test.ts tests/unit/navigate/drawer.test.ts
pnpm run check
pnpm run docs:check
```

Expected: all pass.

- [ ] **Step 5: Commit Wird ownership**

Run:

```bash
git add src/read/wird src/navigate/NavDrawer.svelte src/styles/surfaces/read/wird.css src/styles/surfaces/navigate tests/unit/read/wird tests/unit/navigate docs/context/surfaces/read.md docs/context/surfaces/navigate.md
git commit -m "refactor(read): keep wird presentation read-owned"
```

Expected: commit succeeds.

## Task 3: Normalize Settings Row Grammar

**Files:**
- Modify: `src/configure/settings/SettingsShell.svelte`
- Modify: `src/configure/settings/VerseSettings.svelte`
- Modify: `src/configure/settings/MushafSettings.svelte`
- Modify: `src/configure/settings/NestedAssetPicker.svelte`
- Modify: `src/configure/settings/ThemeNightControls.svelte`
- Modify: `src/styles/surfaces/configure/settings-shell.css`
- Modify: `src/styles/surfaces/configure/verse-settings.css`
- Modify: `src/styles/surfaces/configure/mushaf-settings.css`
- Modify: `src/styles/surfaces/configure/nested-asset-picker.css`
- Modify: `src/styles/surfaces/configure/theme-night-controls.css`
- Modify: `tests/unit/configure/panel.test.ts`
- Modify: `tests/e2e/configure/settings.spec.js`
- Modify: `docs/context/surfaces/configure.md`

- [ ] **Step 1: Inventory settings row classes**

Run:

```bash
rg -n "qa-settings|qa-verse-settings|qa-mushaf-settings|qa-theme-night|qa-asset-picker" src/configure src/styles/surfaces/configure tests docs/context/surfaces/configure.md
```

Expected: row grammar differences are visible.

- [ ] **Step 2: Define one row grammar**

Use this grammar for equivalent controls:

```text
qa-settings-row
qa-settings-row__label
qa-settings-row__control
qa-settings-row__meta
qa-settings-row--active
qa-settings-row--disabled
qa-settings-row--loading
qa-settings-row--missing
qa-settings-row--stale
qa-settings-row--unavailable
qa-settings-row--error
qa-settings-row--selected
```

Variant-specific controls may keep:

```text
qa-verse-settings-*
qa-mushaf-settings-*
```

when they are not the same control family.

- [ ] **Step 3: Rename one component family at a time**

For each row grammar rename, update Svelte and CSS together. Preserve behavior and declarations unless the selector name changes.

- [ ] **Step 4: Update tests and docs**

Update selectors in:

```text
tests/unit/configure/panel.test.ts
tests/e2e/configure/settings.spec.js
docs/context/surfaces/configure.md
```

- [ ] **Step 5: Verify settings**

Run:

```bash
pnpm vitest run tests/unit/configure/panel.test.ts tests/unit/configure/theme.test.ts tests/unit/configure/night-mode.test.ts
pnpm playwright test tests/e2e/configure/settings.spec.js --project=chromium --reporter=line
pnpm run check
pnpm run docs:check
```

Expected: all pass.

- [ ] **Step 6: Commit settings grammar**

Run:

```bash
git add src/configure/settings src/styles/surfaces/configure tests/unit/configure tests/e2e/configure docs/context/surfaces/configure.md
git commit -m "refactor(configure): normalize settings row grammar"
```

Expected: commit succeeds.

## Task 4: Decide And Execute Onboarding Extraction

**Files:**
- Modify or create under: `src/onboard/**`
- Modify: `src/styles/surfaces/onboard/**`
- Modify: `tests/e2e/onboard/first-run.spec.js`
- Modify: `docs/context/surfaces/onboard.md`

- [ ] **Step 1: Check whether extraction is justified**

Run:

```bash
wc -l src/onboard/Onboarding.svelte
rg -n "<OnboardingScreen|screen\\.id|qa-onb" src/onboard/Onboarding.svelte src/styles/surfaces/onboard
```

Extract only if the screen bodies are large enough that separate files improve searchable ownership.

- [ ] **Step 2: If extracting, create screen components**

Create only the components that correspond to real screens:

```text
src/onboard/screens/WelcomeStep.svelte
src/onboard/screens/ThemeStep.svelte
src/onboard/screens/RiwayahStep.svelte
src/onboard/screens/TranslationStep.svelte
src/onboard/screens/ShortcutsStep.svelte
src/onboard/screens/StartStep.svelte
```

Each component receives props and callbacks from `Onboarding.svelte`; state ownership remains in `src/onboard/state.ts` and the parent flow.

- [ ] **Step 3: If not extracting, document the decision in handoff**

No source change is required when extraction would add ceremony without improving ownership.

- [ ] **Step 4: Verify onboarding**

Run:

```bash
pnpm playwright test tests/e2e/onboard/first-run.spec.js --project=chromium --reporter=line
pnpm run check
pnpm run docs:check
```

Expected: all pass.

- [ ] **Step 5: Commit onboarding extraction if source changed**

Run:

```bash
git add src/onboard src/styles/surfaces/onboard tests/e2e/onboard docs/context/surfaces/onboard.md
git commit -m "refactor(onboard): clarify screen ownership"
```

Expected: commit succeeds if files changed; skip commit if no extraction happened.

## Task 5: Final Ownership Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run broad selector report**

Run:

```bash
node scripts/check-selector-liveness.mjs --advisory > .scratch/agentic-ui-refactor/03-selector-liveness-after.txt
```

Expected: report exists; warnings are understandable and ready for Plan 04.

- [ ] **Step 2: Run final gates**

Run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: all pass.

- [ ] **Step 3: Confirm clean working tree or commit remaining docs**

Run:

```bash
git status --short
```

Expected: no source changes remain uncommitted. If generated docs changed, commit them with the behavior commit that caused them.

## Handoff To Plan 04

Record:

- classes renamed;
- tests and e2e selectors updated;
- likely dead old selectors;
- onboarding extraction completed or deferred;
- remaining advisory selector, token, and design-literal warnings.
