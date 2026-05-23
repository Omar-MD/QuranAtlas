# Agentic UI Refactor 05 - Visual Reference Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `docs/ui-references` to component-directory references with paired intent notes and first-priority current-state baseline captures.

**Architecture:** Treat references as source-of-truth design artifacts, not proof screenshots. Capture or migrate one component/state/viewport at a time, write the required intent note beside it, and keep `check-ui-references` passing throughout.

**Tech Stack:** Markdown reference notes, PNG component captures, QuranAtlas UI workflow, Playwright or in-app browser proof, `check-ui-references`, pnpm.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-05-visual-reference-migration-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-04-stale-selector-token-cleanup.md`
- `DESIGN.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `docs/ui-references/README.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- owning Svelte components and CSS partials for every captured component.

Required workflow before capture: use `quranatlas-workflow`, `quranatlas-ui-workflow`, and the mandatory `frontend-design` companion. State that this is current-state reference capture, not redesign or image generation.

## File Structure

Create or migrate:

- `docs/ui-references/read/verse-row/default.mobile.light.png`
- `docs/ui-references/read/verse-row/default.mobile.light.md`
- `docs/ui-references/read/verse-row/tafsir-open.mobile.light.png`
- `docs/ui-references/read/verse-row/tafsir-open.mobile.light.md`
- `docs/ui-references/read/mushaf-page/ready.mobile.light.png`
- `docs/ui-references/read/mushaf-page/ready.mobile.light.md`
- `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png`
- `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.md`
- `docs/ui-references/read/margin-header/verse.mobile.light.png`
- `docs/ui-references/read/margin-header/verse.mobile.light.md`
- `docs/ui-references/read/margin-header/mushaf.mobile.light.png`
- `docs/ui-references/read/margin-header/mushaf.mobile.light.md`
- `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png`
- `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.md`
- `docs/ui-references/configure/settings-shell/verse.mobile.light.png`
- `docs/ui-references/configure/settings-shell/verse.mobile.light.md`
- `docs/ui-references/configure/settings-shell/mushaf.mobile.light.png`
- `docs/ui-references/configure/settings-shell/mushaf.mobile.light.md`
- `docs/ui-references/configure/theme-night-controls/default.mobile.light.png`
- `docs/ui-references/configure/theme-night-controls/default.mobile.light.md`
- `docs/ui-references/onboard/riwayah-selector/default.mobile.light.png`
- `docs/ui-references/onboard/riwayah-selector/default.mobile.light.md`
- `docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.png`
- `docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.md`

Modify:

- `docs/ui-references/README.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md` if taxonomy examples are stale.

## Intent Note Template

Use this exact template for every `.md` beside a `.png`:

```markdown
# Verse Row - Default - Mobile Light

## Component

Verse row, owned by the read surface.

## State and viewport

Default verse row on a mobile viewport in the light theme.

## Accepted visual traits

Current text-first hierarchy, quiet separators, readable Arabic and translation rhythm, and restrained metadata treatment.

## Forbidden traits

Decorative cards around Quran text, generated Arabic, purple gradients, or oversized operational chrome.

## Token expectations

Use semantic `--qa-*` color, radius, typography, and motion tokens.

## Responsive differences

Tablet and desktop may widen measure and spacing, but hierarchy and content priority stay the same.

## Non-goals

This reference does not request a new visual direction, new Quran text rendering, or tafsir behavior changes.
```

Use the same headings for every note and replace the example body with concrete content for that component state before committing.

Before every commit in this plan, run `git status --short` and stage only reference files, README changes, and workflow-skill changes created by the current task. Do not stage proof screenshots, `test-output`, or unrelated dirty files.

## Task 1: Preflight And Capture Setup

**Files:**
- Modify later: `docs/ui-references/**`

- [ ] **Step 1: Confirm dependency checks exist and pass before reference migration**

Run:

```bash
test -f scripts/check-ui-references.mjs
test -f scripts/check-selector-liveness.mjs
test -f scripts/check-primitive-token-consumption.mjs
test -f scripts/check-design-literals.mjs
node -e "const pkg=require('./package.json'); const check=pkg.scripts.check; for (const needle of ['check-ui-references.mjs','check-selector-liveness.mjs','check-primitive-token-consumption.mjs','check-design-literals.mjs']) if (!check.includes(needle)) process.exit(1)"
node scripts/check-ui-references.mjs
pnpm run check
git status --short --branch
```

Expected: Spec/Plans 01-04 outputs exist, UI-reference and style-health checks are blocking, checks pass, and no unrelated dirty files are present. Stop if any prerequisite is missing.

- [ ] **Step 2: Start local app or use existing browser-proof path**

Run one of:

```bash
pnpm run dev
```

or use an already-running Vite server. Record the URL in the handoff.

Expected: app can be opened for captures.

- [ ] **Step 3: Create component directories**

Run:

```bash
mkdir -p docs/ui-references/read/verse-row docs/ui-references/read/mushaf-page docs/ui-references/read/margin-header docs/ui-references/navigate/nav-drawer-header docs/ui-references/configure/settings-shell docs/ui-references/configure/theme-night-controls docs/ui-references/onboard/riwayah-selector
```

Expected: directories exist. Use normal file operations for captures; do not commit proof screenshots outside these selected reference files.

- [ ] **Step 4: Use this capture matrix**

Use these routes, states, and viewports unless the current app has changed; if it has, record the current equivalent route in the handoff.

```text
read/verse-row/default.mobile.light: route #/s/1/1, state first visible verse, viewport 375x812, theme light, crop first `.qa-verse*` row.
read/verse-row/tafsir-open.mobile.light: route #/s/1/1, open tafsir for the first verse, viewport 375x812, theme light, crop verse row plus tafsir preview.
read/mushaf-page/ready.mobile.light: route #/m/1, viewport 375x812, theme light, crop Mushaf page component.
read/mushaf-page/ready.tablet-portrait.light: route #/m/1, viewport 768x1024, theme light, crop Mushaf page component.
read/margin-header/verse.mobile.light: route #/s/1/1, viewport 375x812, theme light, crop mobile MarginHeader.
read/margin-header/mushaf.mobile.light: route #/m/1, viewport 375x812, theme light, crop mobile MarginHeader.
navigate/nav-drawer-header/read.mobile.light: route #/s/1/1 with drawer open, viewport 375x812, theme light, crop drawer header.
configure/settings-shell/verse.mobile.light: route #/s/1/1 with Verse Settings open, viewport 375x812, theme light, crop settings shell.
configure/settings-shell/mushaf.mobile.light: route #/m/1 with Mushaf Settings open, viewport 375x812, theme light, crop settings shell.
configure/theme-night-controls/default.mobile.light: route #/s/1/1 with settings open, viewport 375x812, theme light, crop theme/night controls.
onboard/riwayah-selector/default.mobile.light: fresh onboarding state on riwayah step, viewport 375x812, theme light, crop riwayah selector.
onboard/riwayah-selector/unavailable.mobile.light: fresh onboarding state with a reachable unavailable riwayah option, viewport 375x812, theme light, crop riwayah selector.
```

Expected: each capture records route, viewport, theme, state setup, capture tool, and crop boundary in the adjacent intent note or handoff.

- [ ] **Step 5: Browser-proof every capture before saving**

For each capture, verify:

```text
no horizontal overflow
no header/control overlap
no clipped text
correct theme
real app-rendered Arabic/Mushaf regions only
no generated Quran-like text
no transient test-output artifact committed
```

Expected: saved `.png` files are selected references, not raw proof screenshots.

## Task 2: Capture Read References

**Files:**
- Create: read reference PNG/MD pairs listed above.

- [ ] **Step 1: Capture verse-row default mobile light**

Use the capture matrix row `read/verse-row/default.mobile.light`. Capture only the verse row component when practical and save:

```text
docs/ui-references/read/verse-row/default.mobile.light.png
```

Create the adjacent note with concrete current-state traits.

- [ ] **Step 2: Capture verse-row tafsir-open mobile light**

Use the capture matrix row `read/verse-row/tafsir-open.mobile.light`. Open the tafsir state for one verse, capture the verse row with tafsir open, and save:

```text
docs/ui-references/read/verse-row/tafsir-open.mobile.light.png
docs/ui-references/read/verse-row/tafsir-open.mobile.light.md
```

- [ ] **Step 3: Capture Mushaf mobile and tablet**

Use the capture matrix rows for Mushaf mobile and tablet and save:

```text
docs/ui-references/read/mushaf-page/ready.mobile.light.png
docs/ui-references/read/mushaf-page/ready.mobile.light.md
docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png
docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.md
```

The image must show real app rendering. Do not use generated Arabic text.

- [ ] **Step 4: Capture MarginHeader verse and Mushaf states**

Save:

```text
docs/ui-references/read/margin-header/verse.mobile.light.png
docs/ui-references/read/margin-header/verse.mobile.light.md
docs/ui-references/read/margin-header/mushaf.mobile.light.png
docs/ui-references/read/margin-header/mushaf.mobile.light.md
```

- [ ] **Step 5: Confirm read browser-proof notes**

Record for each read reference: route, viewport, theme, crop selector/boundary, capture tool, and checks for overflow/overlap/clipping.

- [ ] **Step 6: Verify read reference pairs**

Run:

```bash
node scripts/check-ui-references.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit read references**

Run:

```bash
git status --short
git add docs/ui-references/read
git commit -m "docs(ui): add read component references"
```

Expected: commit succeeds.

## Task 3: Capture Navigate Reference

**Files:**
- Create: `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png`
- Create: `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.md`

- [ ] **Step 1: Capture drawer header**

Use the capture matrix row `navigate/nav-drawer-header/read.mobile.light`. Open the nav drawer from a read route on mobile light theme and save the drawer header component:

```text
docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png
```

Create the adjacent note and describe accepted density, current-position clarity, and forbidden marketing-like treatment.

- [ ] **Step 2: Verify and commit navigate reference**

Run:

```bash
node scripts/check-ui-references.mjs
git status --short
git add docs/ui-references/navigate
git commit -m "docs(ui): add navigate drawer reference"
```

Expected: check passes and commit succeeds.

## Task 4: Capture Configure References

**Files:**
- Create: configure reference PNG/MD pairs listed above.
- Modify/delete/migrate: existing flat `docs/ui-references/configure/*` pairs.

- [ ] **Step 1: Capture settings shell verse mode**

Use the capture matrix row `configure/settings-shell/verse.mobile.light` and save:

```text
docs/ui-references/configure/settings-shell/verse.mobile.light.png
docs/ui-references/configure/settings-shell/verse.mobile.light.md
```

- [ ] **Step 2: Capture settings shell Mushaf mode**

Use the capture matrix row `configure/settings-shell/mushaf.mobile.light` and save:

```text
docs/ui-references/configure/settings-shell/mushaf.mobile.light.png
docs/ui-references/configure/settings-shell/mushaf.mobile.light.md
```

- [ ] **Step 3: Capture theme/night controls**

Save:

```text
docs/ui-references/configure/theme-night-controls/default.mobile.light.png
docs/ui-references/configure/theme-night-controls/default.mobile.light.md
```

- [ ] **Step 4: Inventory flat configure artifacts**

Run:

```bash
find docs/ui-references/configure -maxdepth 1 -type f | sort
```

Classify every file as a valid pair, orphan note, orphan image, index/matrix note, or stray non-reference file. Remove `.DS_Store`.

- [ ] **Step 5: Migrate or remove flat configure pairs**

For every remaining flat file under `docs/ui-references/configure/`, choose:

```text
migrate into component directory
grandfather in README with owner and removal condition
delete image and note together
```

Only migrate, grandfather, or delete valid reference artifacts in valid pairs. Orphan notes/images must be repaired into pairs or removed unless they are true matrix/index notes allowlisted by `check-ui-references`.

- [ ] **Step 6: Verify and commit configure references**

Run:

```bash
node scripts/check-ui-references.mjs
git status --short
git add docs/ui-references/configure docs/ui-references/README.md
git commit -m "docs(ui): migrate configure references"
```

Expected: check passes and commit succeeds.

## Task 5: Capture Onboard References

**Files:**
- Create: `docs/ui-references/onboard/riwayah-selector/default.mobile.light.{png,md}`
- Create: `docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.{png,md}`

- [ ] **Step 1: Capture default riwayah selector**

Use an isolated browser profile or Playwright context with clean IndexedDB/localStorage. If the app has already completed onboarding, clear app data through the product flow or a fresh browser context, then boot to onboarding and navigate to the riwayah selector. Save:

```text
docs/ui-references/onboard/riwayah-selector/default.mobile.light.png
docs/ui-references/onboard/riwayah-selector/default.mobile.light.md
```

- [ ] **Step 2: Capture unavailable riwayah selector**

Use a reachable current app state or fixture path that shows an unavailable riwayah option. Save:

```text
docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.png
docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.md
```

If the current product has no reachable unavailable state, document non-applicability in `docs/ui-references/README.md` and do not create a fake image. Record the storage reset method in the handoff.

- [ ] **Step 3: Verify and commit onboard references**

Run:

```bash
node scripts/check-ui-references.mjs
git status --short
git add docs/ui-references/onboard docs/ui-references/README.md
git commit -m "docs(ui): add onboarding references"
```

Expected: check passes and commit succeeds.

## Task 6: Update Reference Taxonomy Docs And Workflow

**Files:**
- Modify: `docs/ui-references/README.md`
- Modify: `.agents/skills/quranatlas-ui-workflow/SKILL.md`

- [ ] **Step 1: Update README taxonomy**

Ensure README documents:

```text
component reference
assembly reference
state matrix note
proof screenshot
path taxonomy
allowed viewport labels
allowed theme labels
image/note pairing rule
required intent-note fields
one-active-reference rule
test-output artifacts are not source of truth
```

- [ ] **Step 2: Update workflow examples**

Update all UI workflow path examples and taxonomy language to the component-directory form. Use this concrete example when an example is needed:

```text
docs/ui-references/read/verse-row/default.mobile.light.png
docs/ui-references/read/verse-row/default.mobile.light.md
```

- [ ] **Step 3: Run final checks**

Run:

```bash
node scripts/check-ui-references.mjs
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: all pass.

- [ ] **Step 4: Commit docs/workflow update**

Run:

```bash
git status --short
git add docs/ui-references/README.md .agents/skills/quranatlas-ui-workflow/SKILL.md
git commit -m "docs(ui): document visual reference taxonomy"
```

Expected: commit succeeds.

## Handoff To Plan 06

Record:

- first-priority references created;
- references grandfathered and reasons;
- viewports and themes captured;
- source used for captures;
- storage reset method for onboarding captures;
- exact routes, viewport dimensions, themes, crop boundaries, and capture tool used;
- confirmation that `check-ui-references` passes.
