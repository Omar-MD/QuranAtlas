# Agentic UI Refactor 04 - Stale Selector And Token Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve or intentionally allowlist selector-liveness, primitive-token, and hardcoded-design-value warnings, then promote those checks from advisory to blocking.

**Architecture:** Treat each warning as owned debt: remove verified-dead CSS, replace primitive design values with semantic tokens, or add explicit allowlist entries with owner and removal condition. Only after reports are clean should `pnpm run check` become blocking for all three checks.

**Tech Stack:** Node.js static checks, centralized CSS tokens, Vitest, Playwright for browser-only visual proof, pnpm.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/tech-stack.md`
- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-04-stale-selector-token-cleanup-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-03-ownership-normalization.md`
- `scripts/check-selector-liveness.mjs`
- `scripts/check-primitive-token-consumption.mjs`
- `scripts/check-design-literals.mjs`
- `src/styles/tokens/semantic.css`
- All CSS files under `src/styles/patterns/**` and `src/styles/surfaces/**`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `docs/context/surfaces/mark.md`, `review.md`, and `listen.md` when a warning points to removed-scope implementation.
- `tests/unit/AGENTS.md` before unit test edits.
- `tests/e2e/AGENTS.md` before e2e test edits or browser-only durable coverage.

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

## Task 0: Dependency Gate

**Files:**
- No source files.

- [ ] **Step 1: Verify prior plan outputs exist**

Run:

```bash
test -f scripts/check-selector-liveness.mjs
test -f scripts/check-primitive-token-consumption.mjs
test -f scripts/check-design-literals.mjs
node -e "const pkg=require('./package.json'); const check=pkg.scripts.check; for (const needle of ['check-selector-liveness.mjs --advisory','check-primitive-token-consumption.mjs --advisory','check-design-literals.mjs --advisory']) if (!check.includes(needle)) process.exit(1)"
pnpm run check
git status --short --branch
```

Expected: Specs/Plans 01-03 are landed, advisory scripts exist and are wired into `pnpm run check`, the starting check passes, and no unrelated dirty files are present. Stop if any prerequisite is missing.

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

- [ ] **Step 3: Identify test and browser proof for each touched component**

For every warning whose fix changes Svelte, selectors, tokens, color, motion, radius, or CSS declarations, write down:

```text
component:
owning surface:
unit test command:
e2e/browser proof command or route:
viewports/themes to inspect:
```

Expected: no visual-affecting cleanup proceeds without a targeted verification plan.

## Task 2: Resolve Selector Liveness Warnings

**Files:**
- Modify: CSS partials named by selector report.
- Modify: Svelte/TS/JS files named by selector report.
- Modify: `scripts/check-selector-liveness.mjs` allowlist only for legitimate dynamic/external cases.
- Modify: tests/docs for renamed or removed selectors.

- [ ] **Step 1: Remove verified-dead CSS**

For each selector with no code reference and no runtime generation path, fill this evidence template before deleting:

```text
selector: qa-example-selector
owning file: src/styles/surfaces/read/example.css
rg command: rg -n "qa-example-selector" src tests docs
liveness output: copy the relevant finding into local scratch notes
runtime-generation check: rg -n "classList|className|querySelector|closest|qa-example-selector" src
owner: read
chosen outcome: remove
```

Then run the actual `rg` command from the template and remove the selector block only when the evidence supports removal.

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

- [ ] **Step 4: Quarantine unsafe removed-scope selectors when removal is not safe**

If a warning points to removed-scope `mark`, `review`, or `listen` implementation and deletion is unsafe in this branch, read the owning removed-scope dossier, move the selectors into a clearly named quarantine partial such as:

```text
src/styles/surfaces/overlays/legacy-review-quarantine.css
```

Import it through `src/styles/index.css`, document owner and removal condition in the relevant dossier or handoff, and allowlist the selector pattern with category `legacy-quarantine`.

Expected: no removed-scope selector remains hidden inside an active component partial without owner and removal condition.

- [ ] **Step 5: Run selector check blocking and targeted proof**

Run:

```bash
node scripts/check-selector-liveness.mjs
```

Expected: PASS.

- [ ] **Step 6: Run targeted tests and browser proof for selector changes**

Run the unit/e2e commands identified in Task 1 Step 3. For class renames or visual selector moves, inspect mobile, tablet, and desktop states for the touched component.

Expected: targeted proof passes before commit.

- [ ] **Step 7: Commit selector cleanup**

Run:

```bash
git status --short
git add scripts/check-selector-liveness.mjs
# Add only the exact CSS, source, test, and dossier files changed for this selector cleanup.
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
color: var(--qa-accent);
```

Use an existing semantic token unless no current semantic role matches.

- [ ] **Step 2: Add semantic tokens only for real reusable roles**

When needed, add a semantic token to `src/styles/tokens/semantic.css`:

```css
--qa-reader-progress-accent: var(--c-bronze-600);
```

Then consume:

```css
color: var(--qa-reader-progress-accent);
```

- [ ] **Step 3: Allowlist compatibility aliases only with removal condition**

Use this shape:

```js
{
  pattern: '--c-legacy-*',
  owner: 'tokens',
  category: 'compatibility-alias',
  reason: 'Compatibility alias consumed by a retained browser quirk rule.',
  removeWhen: 'The browser quirk rule is replaced with a semantic token after visual parity proof.'
}
```

- [ ] **Step 4: Run primitive-token check blocking and targeted proof**

Run:

```bash
node scripts/check-primitive-token-consumption.mjs
```

Expected: PASS.

- [ ] **Step 5: Run targeted tests and browser proof for token changes**

Run the component tests identified in Task 1 Step 3. For visual token changes, inspect the touched component in light, sepia, and dark themes at relevant mobile/tablet/desktop viewports.

Expected: no visual hierarchy, contrast, or theme parity regression.

- [ ] **Step 6: Commit primitive-token cleanup**

Run:

```bash
git status --short
git add scripts/check-primitive-token-consumption.mjs
# Add only the exact CSS/token files changed for this primitive-token cleanup.
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
background: var(--qa-surface-raised);
```

If a new role is needed, add it to `src/styles/tokens/semantic.css` first.

- [ ] **Step 2: Replace raw motion with motion tokens**

Replace:

```css
transition: opacity 120ms ease;
```

with:

```css
transition: opacity var(--qa-transition-fast);
```

Use actual token names present in `src/styles/tokens/semantic.css` or `src/styles/tokens/motion.css`. Motion aliases currently live in `motion.css` as composite `--qa-transition-*` values.

- [ ] **Step 3: Replace raw radius with semantic radius tokens**

Replace:

```css
border-radius: 12px;
```

with a semantic token such as:

```css
border-radius: var(--qa-radius-button);
```

- [ ] **Step 4: Locally justify intentional literal exceptions**

For one-off geometry or browser quirks, add a same-line comment:

```css
outline-offset: 2px; /* qa-design-literal-ok: focus ring geometry aligns with browser outline rendering */
```

Expected: comment explains current reason only.

- [ ] **Step 5: Add script allowlist entries only when local comments are not enough**

Use this shape for design-literal allowlist entries:

```js
{
  pattern: 'src/styles/surfaces/configure/settings-preview.css:theme-swatch',
  owner: 'configure',
  category: 'intentional-swatch',
  reason: 'Preview swatches intentionally show fixed theme samples.',
  removeWhen: 'Preview swatches are generated from semantic theme tokens.'
}
```

Expected: no design-literal allowlist entry lacks owner, category, reason, or removal condition.

- [ ] **Step 6: Run design-literal check blocking**

Run:

```bash
node scripts/check-design-literals.mjs
```

Expected: PASS.

- [ ] **Step 7: Run targeted tests and browser proof for design literal changes**

Run the component tests identified in Task 1 Step 3. For color, motion, or radius changes, inspect the touched component in relevant states and themes.

Expected: visual behavior remains current-state equivalent.

- [ ] **Step 8: Commit design-literal cleanup**

Run:

```bash
git status --short
git add scripts/check-design-literals.mjs
# Add only the exact CSS/token files changed for this design-literal cleanup.
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
