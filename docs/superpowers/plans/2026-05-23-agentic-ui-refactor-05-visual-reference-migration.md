# Agentic UI Refactor 05 - Visual Reference Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `docs/ui-references` to component-directory references with paired intent notes and first-priority current-state baseline captures.

**Architecture:** Treat references as source-of-truth design artifacts, not proof screenshots. Capture or migrate one component/state/viewport at a time, write the required intent note beside it, and keep `check-ui-references` passing throughout.

**Tech Stack:** Markdown reference notes, PNG component captures, QuranAtlas UI workflow, Playwright or in-app browser proof, `check-ui-references`, pnpm.

---

## Required Context

Read these before editing:

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

## Task 1: Preflight And Capture Setup

**Files:**
- Modify later: `docs/ui-references/**`

- [ ] **Step 1: Confirm checks pass before reference migration**

Run:

```bash
node scripts/check-ui-references.mjs
pnpm run check
git status --short --branch
```

Expected: checks pass and no unrelated dirty files are present.

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

## Task 2: Capture Read References

**Files:**
- Create: read reference PNG/MD pairs listed above.

- [ ] **Step 1: Capture verse-row default mobile light**

Open a verse route in light theme at a mobile viewport. Capture only the verse row component when practical and save:

```text
docs/ui-references/read/verse-row/default.mobile.light.png
```

Create the adjacent note with concrete current-state traits.

- [ ] **Step 2: Capture verse-row tafsir-open mobile light**

Open the tafsir state for one verse, capture the verse row with tafsir open, and save:

```text
docs/ui-references/read/verse-row/tafsir-open.mobile.light.png
docs/ui-references/read/verse-row/tafsir-open.mobile.light.md
```

- [ ] **Step 3: Capture Mushaf mobile and tablet**

Open a Mushaf route in light theme and save:

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

- [ ] **Step 5: Verify read reference pairs**

Run:

```bash
node scripts/check-ui-references.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit read references**

Run:

```bash
git add docs/ui-references/read
git commit -m "docs(ui): add read component references"
```

Expected: commit succeeds.

## Task 3: Capture Navigate Reference

**Files:**
- Create: `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png`
- Create: `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.md`

- [ ] **Step 1: Capture drawer header**

Open the nav drawer from a read route on mobile light theme. Save the drawer header component:

```text
docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png
```

Create the adjacent note and describe accepted density, current-position clarity, and forbidden marketing-like treatment.

- [ ] **Step 2: Verify and commit navigate reference**

Run:

```bash
node scripts/check-ui-references.mjs
git add docs/ui-references/navigate
git commit -m "docs(ui): add navigate drawer reference"
```

Expected: check passes and commit succeeds.

## Task 4: Capture Configure References

**Files:**
- Create: configure reference PNG/MD pairs listed above.
- Modify/delete/migrate: existing flat `docs/ui-references/configure/*` pairs.

- [ ] **Step 1: Capture settings shell verse mode**

Open Verse Settings on mobile light theme and save:

```text
docs/ui-references/configure/settings-shell/verse.mobile.light.png
docs/ui-references/configure/settings-shell/verse.mobile.light.md
```

- [ ] **Step 2: Capture settings shell Mushaf mode**

Open Mushaf Settings on mobile light theme and save:

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

- [ ] **Step 4: Migrate or remove flat configure pairs**

For every remaining flat file under `docs/ui-references/configure/`, choose:

```text
migrate into component directory
grandfather in README with owner and removal condition
delete image and note together
```

- [ ] **Step 5: Verify and commit configure references**

Run:

```bash
node scripts/check-ui-references.mjs
git add docs/ui-references/configure docs/ui-references/README.md
git commit -m "docs(ui): migrate configure references"
```

Expected: check passes and commit succeeds.

## Task 5: Capture Onboard References

**Files:**
- Create: `docs/ui-references/onboard/riwayah-selector/default.mobile.light.{png,md}`
- Create: `docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.{png,md}`

- [ ] **Step 1: Capture default riwayah selector**

Open onboarding on mobile light theme, navigate to the riwayah selector state, and save:

```text
docs/ui-references/onboard/riwayah-selector/default.mobile.light.png
docs/ui-references/onboard/riwayah-selector/default.mobile.light.md
```

- [ ] **Step 2: Capture unavailable riwayah selector**

Use the current app state or fixture path that shows an unavailable riwayah option. Save:

```text
docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.png
docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.md
```

If the current product has no reachable unavailable state, document non-applicability in `docs/ui-references/README.md` and do not create a fake image.

- [ ] **Step 3: Verify and commit onboard references**

Run:

```bash
node scripts/check-ui-references.mjs
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

If the UI workflow skill still shows flat paths, replace them with component-directory examples:

```text
docs/ui-references/read/verse-row/default.mobile.light.png
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
- confirmation that `check-ui-references` passes.
