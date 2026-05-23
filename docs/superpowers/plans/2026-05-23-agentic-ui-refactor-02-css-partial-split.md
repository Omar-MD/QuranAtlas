# Agentic UI Refactor 02 - CSS Partial Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split large QuranAtlas surface CSS files into imported component-cluster partials while preserving selectors, declarations, cascade order, and current visual behavior.

**Architecture:** Use the new style-entry check as the safety rail, create a local split ledger, then move CSS in small ownership groups. `src/styles/index.css` remains the only entry point and import order remains the reviewable source of cascade order.

**Tech Stack:** CSS cascade layers, Stylelint, Node.js style-entry report, Vitest style checks, Playwright/browser proof, pnpm.

---

## Required Context

Read these before editing:

- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-02-css-partial-split-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-01-check-infrastructure.md`
- `src/styles/index.css`
- `src/styles/surfaces/nav.css`
- `src/styles/surfaces/settings.css`
- `src/styles/surfaces/reader.css`
- `src/styles/surfaces/reader-virtualiser.css`
- `src/styles/surfaces/reading-typography.css`
- `src/styles/surfaces/assets.css`
- `src/styles/surfaces/about.css`
- `src/styles/surfaces/onboarding.css`
- `src/styles/surfaces/sheet.css`
- `src/styles/surfaces/modal.css`
- `src/styles/surfaces/toast.css`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `DESIGN.md`
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`

## File Structure

Create CSS partials only when rules move into them:

- `src/styles/patterns/sheet.css`
- `src/styles/patterns/modal.css`
- `src/styles/patterns/toast.css`
- `src/styles/patterns/form-controls.css`
- `src/styles/surfaces/read/*.css`
- `src/styles/surfaces/navigate/*.css`
- `src/styles/surfaces/configure/*.css`
- `src/styles/surfaces/onboard/*.css`
- `src/styles/surfaces/pages/*.css`
- `src/styles/surfaces/overlays/*.css`

Modify:

- `src/styles/index.css`
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`
- source flat CSS files while shrinking or deleting them after moves.

Create local only:

- `.scratch/agentic-ui-refactor/02-style-entry-before.txt`
- `.scratch/agentic-ui-refactor/02-style-entry-after.txt`
- `.scratch/agentic-ui-refactor/02-css-split-ledger.tsv`

## Mechanical Rules

Use these exact rules for every move:

```text
selector text: unchanged
declaration text: unchanged
custom property values: unchanged
layer: @layer surfaces
entry point: src/styles/index.css only
comments: keep only when current and not misleading after move
```

Before every commit in this plan, run `git status --short` and stage only files changed by that task. The commands below name the expected task-owned paths; remove unchanged paths and do not stage unrelated dirty files.

Move complete CSS rules with enclosing `@media`, `@supports`, and other at-rule context intact. Do not extract a selector out of its current at-rule wrapper. For each moved rule group, append a ledger row:

```text
original_file    source_span    original_order    destination_file    selector_or_block_label    at_rule_context    moved_rule_hash
```

Generate the hash from the actual moved rule text:

```bash
printf '%s' "$MOVED_RULE_TEXT" | shasum -a 256 | cut -d' ' -f1
```

## Task 1: Preflight And Ledger Setup

**Files:**
- Create local only: `.scratch/agentic-ui-refactor/02-*.txt`

- [ ] **Step 1: Confirm starting checks pass**

Run:

```bash
test -f scripts/check-style-entry.mjs
test -f tests/unit/styles/style-entry.test.js
node -e "const pkg=require('./package.json'); if (!pkg.scripts.check.includes('check-style-entry.mjs')) process.exit(1)"
pnpm run check
git status --short --branch
```

Expected: Spec 01 artifacts exist, `pnpm run check` passes, and no unrelated dirty files are present. Stop if any prerequisite is missing; do not recreate check infrastructure in this plan.

- [ ] **Step 2: Save import report**

Run:

```bash
mkdir -p .scratch/agentic-ui-refactor
node scripts/check-style-entry.mjs --report > .scratch/agentic-ui-refactor/02-style-entry-before.txt
printf 'original_file\tsource_span\toriginal_order\tdestination_file\tselector_or_block_label\tat_rule_context\tmoved_rule_hash\n' > .scratch/agentic-ui-refactor/02-css-split-ledger.tsv
```

Expected: report and ledger exist locally and are untracked.

## Task 2: Move Shared Pattern CSS

**Files:**
- Create: `src/styles/patterns/sheet.css`
- Create: `src/styles/patterns/modal.css`
- Create: `src/styles/patterns/toast.css`
- Create: `src/styles/patterns/form-controls.css` when shared controls exist.
- Create: `src/styles/surfaces/overlays/save-failure-toast.css` when `.qa-save-failure-toast*` rules exist.
- Modify: `src/styles/surfaces/sheet.css`
- Modify: `src/styles/surfaces/modal.css`
- Modify: `src/styles/surfaces/toast.css`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Move sheet rules**

Move every selector block from `src/styles/surfaces/sheet.css` into `src/styles/patterns/sheet.css` with the same `@layer surfaces` wrapper. Add ledger rows for each moved selector group.

Expected destination header:

```css
@layer surfaces {
```

- [ ] **Step 2: Move modal and shared form-control rules**

Move modal-shell selector blocks from `src/styles/surfaces/modal.css` into `src/styles/patterns/modal.css` with unchanged declarations and ledger rows. If shared controls such as `.qa-input` or `.qa-warning-text` are present, move those complete rule groups into `src/styles/patterns/form-controls.css` and import that file at the same source slot after `modal.css`.

- [ ] **Step 3: Split generic toast and save-failure overlay rules**

Move generic reusable toast rules from `src/styles/surfaces/toast.css` into `src/styles/patterns/toast.css`. Move `.qa-save-failure-toast*` overlay rules into `src/styles/surfaces/overlays/save-failure-toast.css`. Preserve the original toast source slot by importing `patterns/toast.css` before `surfaces/overlays/save-failure-toast.css`.

- [ ] **Step 4: Update imports in place**

In `src/styles/index.css`, replace:

```css
@import url('./surfaces/modal.css');
@import url('./surfaces/sheet.css');
```

with:

```css
@import url('./patterns/modal.css');
@import url('./patterns/sheet.css');
@import url('./patterns/form-controls.css');
```

Replace:

```css
@import url('./surfaces/toast.css');
```

with:

```css
@import url('./patterns/toast.css');
@import url('./surfaces/overlays/save-failure-toast.css');
```

Keep relative order unchanged.

- [ ] **Step 5: Verify pattern move**

Run:

```bash
pnpm run check
```

Expected: PASS.

- [ ] **Step 6: Commit pattern move**

Run:

```bash
git status --short
git add src/styles/index.css src/styles/patterns src/styles/surfaces/sheet.css src/styles/surfaces/modal.css src/styles/surfaces/toast.css
git commit -m "refactor(ui): move shared pattern css"
```

Expected: commit succeeds.

## Task 3: Split Read Chrome And Navigate Drawer From `nav.css`

**Files:**
- Create: `src/styles/surfaces/read/ambient-dock.css`
- Create: `src/styles/surfaces/read/ambient-pill.css`
- Create: `src/styles/surfaces/read/margin-header.css`
- Create: `src/styles/surfaces/read/surah-progress.css`
- Create: `src/styles/surfaces/navigate/drawer-shell.css`
- Create: `src/styles/surfaces/navigate/drawer-read-source.css`
- Create: `src/styles/surfaces/navigate/drawer-lists.css`
- Create: `src/styles/surfaces/navigate/drawer-bookmarks.css`
- Create: `src/styles/surfaces/navigate/drawer-juz.css`
- Create: `src/styles/surfaces/navigate/drawer-mushaf.css`
- Create: `src/styles/surfaces/navigate/shortcuts-sheet.css`
- Modify: `src/styles/surfaces/nav.css`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Move AmbientDock rules**

Move current desktop rail/dock selectors from `nav.css` to `src/styles/surfaces/read/ambient-dock.css`. Current selector families include `.qa-rail-*`; if `.qa-dock-*` already exists by the time this plan runs, move that family too. Preserve declarations exactly and add ledger rows.

- [ ] **Step 2: Move AmbientPill rules**

Move current floating pill selectors from `nav.css` to `src/styles/surfaces/read/ambient-pill.css`. Current selector families include `.qa-pill-ref*`; if `.qa-ambient-pill*` already exists by the time this plan runs, move that family too.

- [ ] **Step 3: Move MarginHeader rules**

Move current mobile/tablet header selectors from `nav.css` to `src/styles/surfaces/read/margin-header.css`. Current selector families include `.qa-mh*`; if `.qa-margin-header*` already exists by the time this plan runs, move that family too.

- [ ] **Step 4: Move SurahProgress rules**

Move current progress chip selectors from `nav.css` to `src/styles/surfaces/read/surah-progress.css`. Current selector families include `.qa-surah-progress*` and `.qa-sp-*`.

- [ ] **Step 5: Move drawer shell rules**

Move drawer frame, scrim, panel, header, close, and shell selectors from `nav.css` to `src/styles/surfaces/navigate/drawer-shell.css`.

- [ ] **Step 6: Move drawer list groups**

Move list groups into the matching navigate partial:

```text
surah/current source controls -> drawer-read-source.css
surah list rows -> drawer-lists.css
bookmark rows -> drawer-bookmarks.css
juz rows -> drawer-juz.css
mushaf rows -> drawer-mushaf.css
shortcuts sheet -> shortcuts-sheet.css
```

- [ ] **Step 7: Move Daily Wird presentation from `nav.css`**

Move `.qa-wird-*` internal card presentation from `nav.css` to `src/styles/surfaces/read/wird.css`. Keep only navigate-owned drawer placement wrappers in navigate CSS, such as a drawer slot that constrains where the card appears.

- [ ] **Step 8: Inventory every remaining `nav.css` selector**

Run:

```bash
rg -n "^\\s*(?:\\.|@media|@supports)" src/styles/surfaces/nav.css
```

Expected: every remaining rule is mapped to one of these outcomes before the `nav.css` import is removed: moved to a read partial, moved to a navigate partial, moved to a clearly named removed-scope quarantine partial, or left in a documented transitional stub with an owner and removal condition.

- [ ] **Step 9: Update `src/styles/index.css` imports**

Replace the single `nav.css` import with the new read and navigate imports in the same original position.

Expected order:

```css
@import url('./surfaces/read/ambient-dock.css');
@import url('./surfaces/read/ambient-pill.css');
@import url('./surfaces/read/margin-header.css');
@import url('./surfaces/read/surah-progress.css');
@import url('./surfaces/read/wird.css');
@import url('./surfaces/navigate/drawer-shell.css');
@import url('./surfaces/navigate/drawer-read-source.css');
@import url('./surfaces/navigate/drawer-lists.css');
@import url('./surfaces/navigate/drawer-bookmarks.css');
@import url('./surfaces/navigate/drawer-juz.css');
@import url('./surfaces/navigate/drawer-mushaf.css');
@import url('./surfaces/navigate/shortcuts-sheet.css');
```

- [ ] **Step 10: Verify read/navigate split**

Run:

```bash
pnpm run check
pnpm playwright test tests/e2e/read/chrome.spec.js --project=chromium --reporter=line
pnpm playwright test tests/e2e/navigate/drawer.spec.js --project=chromium --reporter=line
```

Expected: all pass.

- [ ] **Step 11: Commit read/navigate split**

Run:

```bash
git status --short
git add src/styles/index.css src/styles/surfaces/nav.css src/styles/surfaces/read src/styles/surfaces/navigate
git commit -m "refactor(ui): split read and navigate chrome css"
```

Expected: commit succeeds.

## Task 4: Split Reader Body CSS

**Files:**
- Create: `src/styles/surfaces/read/surah-header.css`
- Create: `src/styles/surfaces/read/verse.css`
- Create: `src/styles/surfaces/read/tafsir.css`
- Create: `src/styles/surfaces/read/continuity.css`
- Create: `src/styles/surfaces/read/mushaf.css`
- Create: `src/styles/surfaces/read/states.css`
- Create: `src/styles/surfaces/read/typography.css`
- Create: `src/styles/surfaces/read/virtualiser.css`
- Create: `src/styles/surfaces/read/wird.css`
- Modify: `src/styles/surfaces/reader.css`
- Modify: `src/styles/surfaces/reader-virtualiser.css`
- Modify: `src/styles/surfaces/reading-typography.css`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Move surah header and progress-adjacent body rules**

Move `SurahHeader`, bismillah header, and reader intro selector blocks into `surah-header.css`.

- [ ] **Step 2: Move verse row rules**

Move verse container, Arabic, translation, metadata, interaction, and active-state blocks into `verse.css`.

- [ ] **Step 3: Move tafsir rules**

Move inline tafsir preview and tafsir sheet component-specific blocks into `tafsir.css`.

- [ ] **Step 4: Move continuity and state rules**

Move restore, edge, loading, empty, error, and unavailable-state blocks into `continuity.css` or `states.css` according to ownership.

- [ ] **Step 5: Move Mushaf rules**

Move Mushaf reader, page, controls, and SVG-page selectors into `mushaf.css`.

- [ ] **Step 6: Move typography and virtualiser rules**

Move `reading-typography.css` content into `typography.css` and `reader-virtualiser.css` content into `virtualiser.css`.

- [ ] **Step 7: Update `src/styles/index.css` imports**

Replace reader imports with:

```css
@import url('./surfaces/read/surah-header.css');
@import url('./surfaces/read/verse.css');
@import url('./surfaces/read/tafsir.css');
@import url('./surfaces/read/continuity.css');
@import url('./surfaces/read/mushaf.css');
@import url('./surfaces/read/states.css');
@import url('./surfaces/read/virtualiser.css');
@import url('./surfaces/read/typography.css');
```

- [ ] **Step 8: Verify reader split**

Run:

```bash
pnpm run check
pnpm vitest run tests/unit/read/Verse.test.ts tests/unit/read/SurahHeader.test.ts tests/unit/read/mushaf/reader.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
pnpm playwright test tests/e2e/read/chrome.spec.js --project=chromium --reporter=line
```

Expected: all pass.

- [ ] **Step 9: Commit reader split**

Run:

```bash
git status --short
git add src/styles/index.css src/styles/surfaces/read src/styles/surfaces/reader.css src/styles/surfaces/reader-virtualiser.css src/styles/surfaces/reading-typography.css
git commit -m "refactor(ui): split reader css partials"
```

Expected: commit succeeds.

## Task 5: Split Configure, Pages, Onboard, And Overlays

**Files:**
- Create: `src/styles/surfaces/configure/*.css`
- Create: `src/styles/surfaces/onboard/*.css`
- Create: `src/styles/surfaces/pages/surahs.css`
- Create: `src/styles/surfaces/pages/bookmarks.css`
- Create: `src/styles/surfaces/overlays/quota-banner.css`
- Create: `src/styles/surfaces/overlays/update-banner.css`
- Create: `src/styles/surfaces/overlays/night-shift.css`
- Modify: `src/styles/surfaces/settings.css`
- Modify: `src/styles/surfaces/assets.css`
- Modify: `src/styles/surfaces/about.css`
- Modify: existing flat page/onboard/overlay CSS files
- Modify: `src/styles/index.css`

- [ ] **Step 1: Split settings and asset CSS**

Move settings blocks to:

```text
settings-shell.css
verse-settings.css
mushaf-settings.css
settings-preview.css
theme-night-controls.css
nested-asset-picker.css
offline-selector.css
asset-management.css
clear-data.css
about.css
```

Preserve current declaration order through import order. Keep `about.css` in the original early `about.css` source slot from `src/styles/index.css`; do not move About after settings just because it is configure-owned.

- [ ] **Step 2: Split onboarding CSS**

Move onboarding blocks to:

```text
shell.css
welcome.css
theme-step.css
riwayah-step.css
translation-step.css
shortcuts-step.css
start-step.css
```

If current selectors cannot be separated by step, keep them in `shell.css` and note the reason in the handoff.

- [ ] **Step 3: Move pages and overlays**

Move:

```text
src/styles/surfaces/surahs.css -> src/styles/surfaces/pages/surahs.css
src/styles/surfaces/bookmarks.css -> src/styles/surfaces/pages/bookmarks.css
src/styles/surfaces/quota-banner.css -> src/styles/surfaces/overlays/quota-banner.css
src/styles/surfaces/update-banner.css -> src/styles/surfaces/overlays/update-banner.css
src/styles/surfaces/night-shift.css -> src/styles/surfaces/overlays/night-shift.css
```

- [ ] **Step 4: Update imports**

Replace the corresponding flat imports in `src/styles/index.css` with nested imports in the same relative positions.

Use this current source-slot map:

```text
quota-banner.css slot -> overlays/quota-banner.css
update-banner.css slot -> overlays/update-banner.css
about.css slot -> configure/about.css
onboarding.css slot -> onboard/* imports
surahs.css slot -> pages/surahs.css
bookmarks.css slot -> pages/bookmarks.css
settings.css slot -> configure/settings-* and configure/control partials
assets.css slot -> configure/asset-management.css and configure/offline-selector.css
night-shift.css slot -> overlays/night-shift.css
toast.css slot -> patterns/toast.css plus overlays/save-failure-toast.css
```

- [ ] **Step 5: Verify configure/onboard split**

Run:

```bash
pnpm run check
pnpm vitest run tests/unit/configure/panel.test.ts tests/unit/configure/night-mode.test.ts tests/unit/configure/about/About.test.ts
pnpm playwright test tests/e2e/configure/settings.spec.js --project=chromium --reporter=line
pnpm playwright test tests/e2e/onboard/first-run.spec.js --project=chromium --reporter=line
```

Expected: all pass.

- [ ] **Step 6: Commit remaining split**

Run:

```bash
git status --short
git add src/styles/index.css src/styles/surfaces/configure src/styles/surfaces/onboard src/styles/surfaces/pages src/styles/surfaces/overlays src/styles/surfaces/settings.css src/styles/surfaces/assets.css src/styles/surfaces/about.css src/styles/surfaces/onboarding.css src/styles/surfaces/surahs.css src/styles/surfaces/bookmarks.css src/styles/surfaces/quota-banner.css src/styles/surfaces/update-banner.css src/styles/surfaces/night-shift.css
git commit -m "refactor(ui): split configure and route css"
```

Expected: commit succeeds.

## Task 6: Final Split Report And Verification

**Files:**
- Modify: `src/styles/index.css`
- Local only: `.scratch/agentic-ui-refactor/02-style-entry-after.txt`

- [ ] **Step 1: Save final style-entry report**

Run:

```bash
node scripts/check-style-entry.mjs --report > .scratch/agentic-ui-refactor/02-style-entry-after.txt
diff -u .scratch/agentic-ui-refactor/02-style-entry-before.txt .scratch/agentic-ui-refactor/02-style-entry-after.txt || true
```

Expected: import changes match the moved partials; no unexpected missing or duplicate imports.

- [ ] **Step 2: Run focused style tests**

Run:

```bash
pnpm vitest run tests/unit/styles/style-entry.test.js tests/unit/styles/token-usage.test.js tests/unit/styles/at-layer.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full checks**

Run:

```bash
pnpm run check
git diff --check
pnpm run docs:check
```

Expected: PASS.

- [ ] **Step 4: Browser-proof representative states**

Use Playwright or the in-app browser to inspect:

```text
read mobile
read tablet
read desktop
configure settings mobile
configure settings tablet
configure settings desktop
navigate drawer mobile
navigate drawer tablet
navigate drawer desktop
onboard mobile
onboard tablet
```

Expected: no visible regression against the named current accepted UI states. Include any known awkward cases: `320x568`, short drawer/settings/onboarding viewports, and focus rings when moved selectors affect controls.

- [ ] **Step 5: Commit final report note if needed**

If no source edits remain, do not create a commit. If a final import-order correction was needed, run:

```bash
git status --short
git add src/styles/index.css src/styles
git commit -m "refactor(ui): finalize css import order"
```

Expected: no dirty source files remain.

## Handoff To Plan 03

Record:

- created CSS partials;
- partials deferred because no rules existed or selectors were inseparable;
- path to `.scratch/agentic-ui-refactor/02-css-split-ledger.tsv`;
- import-order differences from before/after reports;
- advisory warnings introduced or exposed by the split.
