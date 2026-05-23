# Agentic UI Refactor 06 - Docs Workflow Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize discoverability for the new UI structure through generated style ownership docs, a style map, workflow docs, repo-local skill alignment, and full validation.

**Architecture:** Extend docs generation instead of hand-editing generated fences, then add maintained workflow documentation that points future agents to the generated ownership map. Finish with the full validation gate because this plan touches shared docs, scripts, and workflow instructions.

**Tech Stack:** Node.js docs derivation scripts, Markdown context docs, QuranAtlas repo-local skills, pnpm validation pipeline.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-06-docs-workflow-finalization-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-05-visual-reference-migration.md`
- `scripts/docs/derive.mjs`
- `scripts/docs/derive-inventory.mjs`
- `scripts/docs/lib/scan.mjs`
- `scripts/docs/lib/blocks.mjs`
- `docs/context/surfaces/*.md`
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`
- `docs/tech-stack.md`
- `docs/ui-references/README.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `package.json`

Before edits, run `git status --short --branch` and stop unless Specs/Plans 00 through 05 are complete, committed, and the worktree has no unrelated dirty files.

## File Structure

Create:

- `docs/context/style-map.md`
- `docs/ui-refactor-workflow.md`

Modify:

- `scripts/docs/derive-inventory.mjs` or create a focused deriver under `scripts/docs/`.
- `scripts/docs/derive.mjs` if a new deriver is added.
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- Removed-scope dossiers only when retained styles exist.
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`
- `docs/tech-stack.md`
- `docs/ui-references/README.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`

## Task 1: Add Surface Style Ownership To Dossiers

**Files:**
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/surfaces/navigate.md`
- Modify: `docs/context/surfaces/configure.md`
- Modify: `docs/context/surfaces/onboard.md`
- Modify: `docs/context/surfaces/infra.md`
- Modify: `scripts/docs/derive-inventory.mjs` or create a new `scripts/docs/derive-style-inventory.mjs`
- Modify: `scripts/docs/derive.mjs` if a new deriver is created.

- [ ] **Step 1: Add `style_paths` frontmatter**

Add current style path globs to active dossiers. Example for read:

```yaml
style_paths:
  - 'src/styles/surfaces/read/**'
```

Configure example:

```yaml
style_paths:
  - 'src/styles/surfaces/configure/**'
```

Infra example:

```yaml
style_paths:
  - 'src/styles/surfaces/overlays/**'
```

- [ ] **Step 2: Extend docs derivation**

Preferred implementation: extend `scripts/docs/derive-inventory.mjs` so it emits a second generated block named `style-inventory` when frontmatter has `style_paths`.

Add CSS-specific discovery instead of reusing source-file inventory. The deriver must walk `src/styles/**/*.css`, normalize repo-relative paths, and match `style_paths` against that CSS list. If adding a helper, name it clearly, for example:

```js
export async function listStyleFiles() {
  return (await walk(join(REPO_ROOT, 'src/styles'))).filter((file) => file.endsWith('.css'))
}
```

Generated table shape:

```markdown
| Path | Role |
| --- | --- |
| `src/styles/surfaces/read/verse.css` | Verse row presentation styles. |
```

- [ ] **Step 3: Add generated block markers to dossiers**

Add this section outside existing generated fences:

```markdown
## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
<!-- AUTO-GENERATED:style-inventory END -->
```

- [ ] **Step 4: Run docs generation**

Run:

```bash
pnpm run docs
pnpm run docs:check
```

Expected: generated style inventories populate and docs check passes.

- [ ] **Step 5: Commit style inventories**

Run:

```bash
git add scripts/docs/derive-inventory.mjs scripts/docs/derive.mjs docs/context/surfaces/read.md docs/context/surfaces/navigate.md docs/context/surfaces/configure.md docs/context/surfaces/onboard.md docs/context/surfaces/infra.md .docs-derive-manifest.json
git commit -m "docs(ui): expose surface style ownership"
```

Expected: commit succeeds.

## Task 2: Create Style Map

**Files:**
- Create: `docs/context/style-map.md`

- [ ] **Step 1: Create style-map structure**

Create `docs/context/style-map.md` with sections:

```markdown
# UI Style Map

## Purpose

## How To Use This Map

## Component Ownership

| Surface | Component | Source | Style partial | Visual reference | Unit tests | E2E tests |
| --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 2: Add required component rows**

Include rows for:

```text
AmbientDock
AmbientPill
MarginHeader
SurahProgress
Verse row
Mushaf page
Nav drawer shell/header
SettingsShell
VerseSettings
MushafSettings
ThemeNightControls
NestedAssetPicker
AssetManagement
Onboarding riwayah selector
QuotaBanner
UpdateBanner
NightShift
```

Use concrete non-applicability text such as `Not applicable: overlay has no committed component reference yet` only where a reference or test genuinely does not exist.

- [ ] **Step 3: Verify cited current paths**

Run:

```bash
missing=0
while IFS= read -r path; do
  if [ ! -e "$path" ]; then
    printf 'missing %s\n' "$path"
    missing=1
  fi
done < <(rg -o '`[^`]+`' docs/context/style-map.md | tr -d '`' | rg '^(src|tests|docs)/')
test "$missing" -eq 0
pnpm run docs:check
git diff --check
```

Expected: no missing paths except deliberately non-applicable text that is not inside backticks.

- [ ] **Step 4: Commit style map**

Run:

```bash
git add docs/context/style-map.md
git commit -m "docs(ui): add style ownership map"
```

Expected: commit succeeds.

## Task 3: Update Architecture, Repo Structure, And Tech Stack Docs

**Files:**
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Update architecture style section**

Add current-state wording:

```markdown
`src/styles/index.css` is the single global style entry. It imports tokens, base layers, shared pattern styles under `src/styles/patterns/**`, and component-cluster surface styles under `src/styles/surfaces/**`.
```

Also state that moved shared pattern and surface rules remain in `@layer surfaces` for this refactor, and that surface dossiers plus `docs/context/style-map.md` are the discovery path for style ownership.

- [ ] **Step 2: Update repo structure**

Ensure `docs/context/repo-structure.md` describes:

```text
src/styles/tokens/**
src/styles/patterns/**
src/styles/surfaces/**
docs/context/style-map.md
```

- [ ] **Step 3: Update tech stack static checks**

Ensure `docs/tech-stack.md` matches final `package.json` and lists all static checks:

```text
check-theme-parity
check-token-usage
check-at-layer
check-style-entry
check-ui-references
check-selector-liveness
check-primitive-token-consumption
check-design-literals
check-no-svelte-style
```

It must state which checks run inside `pnpm run check` and that selector-liveness, primitive-token consumption, and design-literal checks are blocking after Spec 04.

- [ ] **Step 4: Verify docs**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: both pass.

- [ ] **Step 5: Commit context docs**

Run:

```bash
git add docs/context/architecture.md docs/context/repo-structure.md docs/tech-stack.md
git commit -m "docs(ui): document nested style architecture"
```

Expected: commit succeeds.

## Task 4: Add UI Refactor Workflow Doc

**Files:**
- Create: `docs/ui-refactor-workflow.md`

- [ ] **Step 1: Write workflow doc**

Create `docs/ui-refactor-workflow.md` with these sections:

```markdown
# UI Refactor Workflow

## Preflight

## Find Ownership

## Select One Reference

## Edit Loop

## Verification

## Browser Proof

## Docs Update

## Final Summary
```

The body must explicitly cover:

```text
run git status --short
read DESIGN.md, docs/context/style-map.md, and the owning surface dossier
find ownership through style-map plus dossier style inventory
name one surface, one component, one visual concern, one state matrix, and one active reference
edit Svelte source and owning CSS partial together
keep CSS in src/styles and preserve cascade layers
use semantic --qa-* tokens for design decisions
run targeted unit proof
run pnpm run check
browser-proof mobile, tablet, and desktop when visual behavior can differ
run pnpm run docs when ownership, imports, tests, or surface contracts change
final summary includes commands, states, viewports, references, and durable e2e decision
```

- [ ] **Step 2: Include required workflow commands**

Add command blocks:

```bash
git status --short
pnpm run check
pnpm run docs
pnpm run docs:check
git diff --check
```

- [ ] **Step 3: Include one-component rule**

Add wording:

```markdown
One implementation loop owns one surface, one component, one visual concern, one state matrix, and one active reference source.
```

- [ ] **Step 4: Verify and commit workflow doc**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: both pass.

Run:

```bash
git add docs/ui-refactor-workflow.md
git commit -m "docs(ui): add ui refactor workflow"
```

Expected: commit succeeds.

## Task 5: Align Repo-Local Skills

**Files:**
- Modify: `.agents/skills/quranatlas-workflow/SKILL.md`
- Modify: `.agents/skills/quranatlas-ui-workflow/SKILL.md`

- [ ] **Step 1: Update QuranAtlas workflow discovery guidance**

Add concise wording pointing UI style discovery to:

```text
docs/context/style-map.md
```

and the owning surface dossier.

- [ ] **Step 2: Update UI workflow docs references**

Ensure the UI workflow skill references:

```text
DESIGN.md
docs/context/style-map.md
docs/ui-refactor-workflow.md
one selected docs/ui-references image plus adjacent intent note, or one accepted current UI state for narrow fixes
```

Do not hard-code a single reference path into the skill unless that file exists and the sentence is clearly an example, not a default.

- [ ] **Step 3: Keep skills concise**

Remove duplicated long tables if the same content is now in `docs/ui-refactor-workflow.md` or `docs/ui-references/README.md`.

- [ ] **Step 4: Verify UI reference README agreement**

Compare `docs/ui-references/README.md` to `docs/ui-refactor-workflow.md`. Update the README if path taxonomy, reference types, required note fields, or one-active-reference language diverge; otherwise record in the commit message or handoff that no README change was needed.

- [ ] **Step 5: Verify docs-only gate**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: both pass.

- [ ] **Step 6: Commit skill alignment**

Run:

```bash
git add .agents/skills/quranatlas-workflow/SKILL.md .agents/skills/quranatlas-ui-workflow/SKILL.md docs/ui-references/README.md
git commit -m "docs(ui): align agent ui workflow skills"
```

Expected: commit succeeds.

## Task 6: Final Integration Verification

**Files:**
- All touched files.

- [ ] **Step 1: Regenerate docs**

Run:

```bash
pnpm run docs
```

Expected: docs generation completes.

- [ ] **Step 2: Run full final gates**

Run:

```bash
pnpm run docs:check
pnpm run check
pnpm run test
pnpm run build
git diff --check
pnpm run validate
```

Expected: every command passes. If `pnpm run validate` repeats earlier commands, still run it as the final integration gate.

- [ ] **Step 3: Commit any generated correction**

If `pnpm run docs` changed generated docs after the prior commits, run:

```bash
git status --short
git add .docs-derive-manifest.json
# Add only the exact generated docs changed by `pnpm run docs`.
git commit -m "docs(ui): refresh generated ui ownership docs"
```

Expected: commit succeeds only when generated docs changed.

- [ ] **Step 4: Confirm clean final state**

Run:

```bash
git status --short --branch
```

Expected: clean worktree.

## Final Handoff

Record:

- commits created across Plans 00 through 06;
- final verification commands and pass/fail output;
- retained allowlists or grandfathered references;
- future work that remained outside this refactor by design.
