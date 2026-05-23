# Agentic UI Refactor 04 - Stale Selector And Token Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve or intentionally allowlist selector-liveness, primitive-token, and hardcoded-design-value warnings, then promote those checks from advisory to blocking.

**Architecture:** Treat each warning as owned debt: remove verified-dead CSS, replace primitive design values with semantic tokens, or add explicit allowlist entries with owner and removal condition. Only after reports are clean should `pnpm run check` become blocking for all three checks.

**Tech Stack:** Node.js static checks, centralized CSS tokens, Vitest, Playwright for browser-only visual proof, pnpm.

---

## Required Context

Read these before editing:

- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-04-stale-selector-token-cleanup-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-03-ownership-normalization.md`
- `scripts/check-selector-liveness.mjs`
- `scripts/check-primitive-token-consumption.mjs`
- `scripts/check-design-literals.mjs`
- `src/styles/tokens/semantic.css`
- All CSS files under `src/styles/patterns/**` and `src/styles/surfaces/**`
- Relevant surface dossiers for every warning.

## File Structure

Modify as indicated by reports:

- CSS partials under `src/styles/**`
- Svelte/TS/JS files that reference or should reference classes.
- `src/styles/tokens/semantic.css` when a real semantic token is needed.
- Static check allowlists inside the relevant check script, unless the implementation already externalized allowlists.
- `package.json`
- `docs/tech-stack.md`
- Relevant unit/e2e tests and surface dossiers.

Create local only:

- `.scratch/agentic-ui-refactor/04-selector-liveness-before.txt`
- `.scratch/agentic-ui-refactor/04-primitive-token-before.txt`
- `.scratch/agentic-ui-refactor/04-design-literals-before.txt`
- `.scratch/agentic-ui-refactor/04-selector-liveness-after.txt`
- `.scratch/agentic-ui-refactor/04-primitive-token-after.txt`
- `.scratch/agentic-ui-refactor/04-design-literals-after.txt`

## Task 1: Capture Advisory Reports

**Files:**
- Create local only: `.scratch/agentic-ui-refactor/04-*.txt`

- [ ] **Step 1: Save before reports**

Run:

```bash
mkdir -p .scratch/agentic-ui-refactor
node scripts/check-selector-liveness.mjs --advisory > .scratch/agentic-ui-refactor/04-selector-liveness-before.txt
node scripts/check-primitive-token-consumption.mjs --advisory > .scratch/agentic-ui-refactor/04-primitive-token-before.txt
node scripts/check-design-literals.mjs --advisory > .scratch/agentic-ui-refactor/04-design-literals-before.txt
```

Expected: all report files exist and scripts exit 0.

- [ ] **Step 2: Classify warnings**

For each warning, assign one of these outcomes in your working notes:

```text
remove
add missing code reference
rename component family
semantic-token replacement
local allowlist comment
script allowlist entry
legacy quarantine
```

Expected: every warning has an owner and an outcome before source edits start.

## Task 2: Resolve Selector Liveness Warnings

**Files:**
- Modify: CSS partials named by selector report.
- Modify: Svelte/TS/JS files named by selector report.
- Modify: `scripts/check-selector-liveness.mjs` allowlist only for legitimate dynamic/external cases.
- Modify: tests/docs for renamed or removed selectors.

- [ ] **Step 1: Remove verified-dead CSS**

For a selector with no code reference and no runtime generation path, remove the selector block from its CSS partial. Then run:

```bash
rg -n "qa-removed-class-name" src tests docs
```

Expected: no references remain except release notes or historical specs, which are not implementation sources.

- [ ] **Step 2: Add missing references when scanner is correct but code is incomplete**

If a styled class should be present in markup, add it to the owning Svelte component using static class syntax or Svelte class directive:

```svelte
<div class="qa-settings-row" class:qa-settings-row--active={active}>
```

Expected: code and CSS agree.

- [ ] **Step 3: Add allowlist entries only for real dynamic cases**

Use this object shape:

```js
{
  pattern: 'qa-onb-sw--*',
  owner: 'onboard',
  category: 'dynamic-class',
  reason: 'Generated from the onboarding theme option id and covered by first-run onboarding tests.',
  removeWhen: 'Theme swatches move to explicit Svelte class directives.'
}
```

Expected: no allowlist entry lacks owner, category, reason, or removal condition.

- [ ] **Step 4: Run selector check blocking**

Run:

```bash
node scripts/check-selector-liveness.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit selector cleanup**

Run:

```bash
git add src tests docs scripts/check-selector-liveness.mjs
git commit -m "chore(ui): resolve selector liveness warnings"
```

Expected: commit succeeds.

## Task 3: Resolve Primitive Token Warnings

**Files:**
- Modify: CSS partials named by primitive-token report.
- Modify: `src/styles/tokens/semantic.css`
- Modify: `scripts/check-primitive-token-consumption.mjs` allowlist only when needed.

- [ ] **Step 1: Replace primitive token consumption with semantic tokens**

For each outside-token use such as:

```css
color: var(--c-bronze-600);
```

replace with an existing semantic role:

```css
color: var(--qa-color-accent);
```

Use an existing semantic token unless no current semantic role matches.

- [ ] **Step 2: Add semantic tokens only for real reusable roles**

When needed, add a semantic token to `src/styles/tokens/semantic.css`:

```css
--qa-color-reader-progress: var(--c-bronze-600);
```

Then consume:

```css
color: var(--qa-color-reader-progress);
```

- [ ] **Step 3: Allowlist compatibility aliases only with removal condition**

Use this shape:

```js
{
  pattern: '--c-legacy-*',
  owner: 'tokens',
  reason: 'Compatibility alias consumed by a retained browser quirk rule.',
  removeWhen: 'The browser quirk rule is replaced with a semantic token after visual parity proof.'
}
```

- [ ] **Step 4: Run primitive-token check blocking**

Run:

```bash
node scripts/check-primitive-token-consumption.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit primitive-token cleanup**

Run:

```bash
git add src/styles scripts/check-primitive-token-consumption.mjs
git commit -m "chore(ui): resolve primitive token consumption"
```

Expected: commit succeeds.

## Task 4: Resolve Design Literal Warnings

**Files:**
- Modify: CSS partials named by design-literal report.
- Modify: `scripts/check-design-literals.mjs` allowlist only when needed.

- [ ] **Step 1: Replace hardcoded colors with semantic tokens**

Replace:

```css
background: #f8f0de;
```

with an existing semantic token such as:

```css
background: var(--qa-color-surface);
```

If a new role is needed, add it to `src/styles/tokens/semantic.css` first.

- [ ] **Step 2: Replace raw motion with motion tokens**

Replace:

```css
transition: opacity 120ms ease;
```

with:

```css
transition: opacity var(--qa-motion-duration-fast) var(--qa-motion-ease-standard);
```

Use actual token names present in `semantic.css` or add semantic aliases there.

- [ ] **Step 3: Replace raw radius with semantic radius tokens**

Replace:

```css
border-radius: 12px;
```

with a semantic token such as:

```css
border-radius: var(--qa-radius-control);
```

- [ ] **Step 4: Locally justify intentional literal exceptions**

For one-off geometry or browser quirks, add a same-line comment:

```css
outline-offset: 2px; /* qa-design-literal-ok: focus ring geometry aligns with browser outline rendering */
```

Expected: comment explains current reason only.

- [ ] **Step 5: Run design-literal check blocking**

Run:

```bash
node scripts/check-design-literals.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit design-literal cleanup**

Run:

```bash
git add src/styles scripts/check-design-literals.mjs
git commit -m "chore(ui): resolve design literal warnings"
```

Expected: commit succeeds.

## Task 5: Promote Checks To Blocking

**Files:**
- Modify: `package.json`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Remove advisory flags from `pnpm run check`**

In `package.json`, replace:

```json
"node scripts/check-selector-liveness.mjs --advisory && node scripts/check-primitive-token-consumption.mjs --advisory && node scripts/check-design-literals.mjs --advisory"
```

with:

```json
"node scripts/check-selector-liveness.mjs && node scripts/check-primitive-token-consumption.mjs && node scripts/check-design-literals.mjs"
```

- [ ] **Step 2: Update tech-stack check descriptions**

In `docs/tech-stack.md`, change the three check descriptions from advisory to blocking:

```markdown
- `check-selector-liveness.mjs` — blocks unreviewed `.qa-*` class liveness drift.
- `check-primitive-token-consumption.mjs` — blocks primitive token use outside token files unless explicitly allowlisted.
- `check-design-literals.mjs` — blocks unreviewed hardcoded color, motion, and radius decisions.
```

- [ ] **Step 3: Save after reports**

Run:

```bash
node scripts/check-selector-liveness.mjs > .scratch/agentic-ui-refactor/04-selector-liveness-after.txt
node scripts/check-primitive-token-consumption.mjs > .scratch/agentic-ui-refactor/04-primitive-token-after.txt
node scripts/check-design-literals.mjs > .scratch/agentic-ui-refactor/04-design-literals-after.txt
```

Expected: all pass and write reports.

- [ ] **Step 4: Run final gates**

Run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: all pass.

- [ ] **Step 5: Commit promotion**

Run:

```bash
git add package.json docs/tech-stack.md
git commit -m "chore(ui): promote style health checks"
```

Expected: commit succeeds.

## Handoff To Plan 05

Record:

- selectors removed;
- allowlist entries retained and reasons;
- semantic tokens added or reused;
- confirmation that style-health checks are blocking;
- any component states that need special attention during visual reference capture.
