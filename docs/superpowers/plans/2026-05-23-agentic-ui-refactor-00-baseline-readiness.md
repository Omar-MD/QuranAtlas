# Agentic UI Refactor 00 - Baseline Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the UI refactor branch by repairing current documentation/reference drift, capturing local baseline reports, and making existing CSS checks ready for nested style paths.

**Architecture:** This plan changes only docs, current reference hygiene, comments, and existing check glob coverage. It deliberately leaves CSS blocks, selectors, and UI behavior unchanged so the later check-infrastructure and CSS-split plans start from a stable baseline.

**Tech Stack:** Markdown docs, Node.js ESM scripts, Vitest, Stylelint, QuranAtlas docs derivation scripts, pnpm.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-00-baseline-readiness-spec.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/tech-stack.md`
- `package.json`
- `.stylelintrc.json`
- `scripts/check-token-usage.mjs`
- `scripts/check-at-layer.mjs`
- `tests/unit/styles/token-usage.test.js`
- `tests/unit/styles/at-layer.test.js`
- `src/styles/index.css`
- all current files from `find src/styles/surfaces -maxdepth 1 -type f -name '*.css' | sort`
- all current files from `find docs/ui-references -type f | sort`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `DESIGN.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `tests/unit/AGENTS.md`

## File Structure

Modify only as needed:

- `.stylelintrc.json` - nested CSS glob coverage.
- `scripts/check-token-usage.mjs` - nested surface/pattern CSS discovery.
- `scripts/check-at-layer.mjs` - nested surface/pattern CSS discovery.
- `tests/unit/styles/token-usage.test.js` - nested path coverage.
- `tests/unit/styles/at-layer.test.js` - nested path coverage.
- `docs/ui-references/**` - repair or intentionally remove current orphaned pairs.
- `docs/ui-references/README.md` - document any grandfathered current reference pairs.
- `DESIGN.md` - ensure product style and one-reference discipline are current.
- `.agents/skills/quranatlas-ui-workflow/SKILL.md` - ensure it requires `DESIGN.md`.

Create local, untracked baseline reports:

- `.scratch/agentic-ui-refactor/00-git-status.txt`
- `.scratch/agentic-ui-refactor/00-style-files.txt`
- `.scratch/agentic-ui-refactor/00-style-imports.txt`
- `.scratch/agentic-ui-refactor/00-ui-reference-pairs.txt`
- `.scratch/agentic-ui-refactor/00-selector-scan.txt`
- `.scratch/agentic-ui-refactor/00-token-literal-scan.txt`
- `.scratch/agentic-ui-refactor/00-stale-comment-scan.txt`

## Task 1: Preflight And Initial Reports

**Files:**
- Create local only: `.scratch/agentic-ui-refactor/00-*.txt`

- [ ] **Step 1: Confirm clean starting state**

Run:

```bash
git status --short --branch
```

Expected: only the branch line, or only files explicitly assigned to this plan. If unrelated files are dirty, stop and ask how to separate them.

- [ ] **Step 2: Capture only initial pre-repair reports**

Run:

```bash
mkdir -p .scratch/agentic-ui-refactor
git status --short > .scratch/agentic-ui-refactor/00-git-status.txt
find src/styles -type f -name '*.css' | sort > .scratch/agentic-ui-refactor/00-style-files.txt
```

Expected: commands complete and both files are non-empty.

- [ ] **Step 3: Confirm scratch files are ignored and not staged**

Run:

```bash
test -s .scratch/agentic-ui-refactor/00-git-status.txt
test -s .scratch/agentic-ui-refactor/00-style-files.txt
git check-ignore .scratch/agentic-ui-refactor/00-git-status.txt
git diff --cached --name-only -- .scratch/agentic-ui-refactor
```

Expected: both `test -s` commands pass, `git check-ignore` prints the ignored scratch path, and `git diff --cached` prints nothing.

## Task 2: Repair Current UI Reference Pairing

**Files:**
- Modify: `docs/ui-references/**`
- Modify: `docs/ui-references/README.md`

- [ ] **Step 1: List reference images and notes**

Run:

```bash
find docs/ui-references -type f | sort
```

Expected: every committed `.png` has a matching same-basename `.md`, and every committed `.md` has a matching same-basename `.png` unless it is an index or matrix note.

- [ ] **Step 2: Repair each mismatch as a pair**

For each mismatch, make one of these exact edits:

```text
preserve: keep both .png and .md in place
migrate later: keep both .png and .md in place and note the future target in README
delete: remove both .png and .md because the reference is no longer current scope
```

Expected: no orphaned reference image or note remains.

- [ ] **Step 3: Document any grandfathered current pair**

If any flat configure reference remains, add a concise row to `docs/ui-references/README.md`:

```markdown
| Current path | Owner | Removal condition |
| --- | --- | --- |
| `docs/ui-references/configure/asset-management.mobile.png` + `.md` | configure | Migrate during Agentic UI Refactor Spec 05. |
```

Use only real retained pairs from the `find docs/ui-references -type f | sort` output. Do not cite a pair that does not exist.

Expected: every retained flat pair has an owner and removal condition.

## Task 3: Capture Post-Repair Baseline Reports

**Files:**
- Create local only: `.scratch/agentic-ui-refactor/00-style-imports.txt`
- Create local only: `.scratch/agentic-ui-refactor/00-ui-reference-pairs.txt`
- Create local only: `.scratch/agentic-ui-refactor/00-selector-scan.txt`
- Create local only: `.scratch/agentic-ui-refactor/00-token-literal-scan.txt`
- Create local only: `.scratch/agentic-ui-refactor/00-stale-comment-scan.txt`

- [ ] **Step 1: Capture post-reference-repair reports**

Run:

```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('src/styles/index.css','utf8'); const imports=[...text.matchAll(/@import\\s+url\\(['\"](.+?)['\"]\\)/g)].map((m,i)=>`${i+1}\\t${m[1]}`); console.log(imports.join('\\n'));" > .scratch/agentic-ui-refactor/00-style-imports.txt
find docs/ui-references -type f | sort > .scratch/agentic-ui-refactor/00-ui-reference-pairs.txt
rg -n "\\.qa-[A-Za-z0-9_-]+" src/styles > .scratch/agentic-ui-refactor/00-selector-scan.txt || true
rg -n "var\\(--(?:c|s|r|ff|fs|lh|dur|ease)-|#[0-9A-Fa-f]{3,8}|[0-9]+ms\\s+ease|border-radius:\\s*[0-9]" src/styles > .scratch/agentic-ui-refactor/00-token-literal-scan.txt || true
rg -n "2026-|PR [0-9]|redesign|old path|missing spec|src/nav/|src/onboarding/" src docs .agents > .scratch/agentic-ui-refactor/00-stale-comment-scan.txt || true
```

Expected: all report files exist. Empty scan files are acceptable when no matches exist.

- [ ] **Step 2: Confirm reports are ignored and unstaged**

Run:

```bash
for file in .scratch/agentic-ui-refactor/00-*.txt; do test -e "$file"; git check-ignore "$file"; done
git diff --cached --name-only -- .scratch/agentic-ui-refactor
```

Expected: every scratch report is ignored and nothing under `.scratch/agentic-ui-refactor` is staged.

## Task 4: Clean Misrouting Comments

**Files:**
- Modify: comments in `src/**`, `tests/**`, `docs/**`, `.agents/**` only when they misroute future agents.

- [ ] **Step 1: Review the stale-comment scan**

Run:

```bash
sed -n '1,220p' .scratch/agentic-ui-refactor/00-stale-comment-scan.txt
```

Expected: list of candidate comments; not every line requires an edit.

- [ ] **Step 2: Correct known stale ownership text**

Apply only current-state wording. Use these replacements where they match the file:

```text
src/navigate/AmbientDock.svelte -> src/read/AmbientDock.svelte
src/navigate/MarginHeader.svelte -> src/read/MarginHeader.svelte
src/nav/ -> src/read/ or src/navigate/ according to the actual file
src/onboarding/ -> src/onboard/
```

Expected: comments route agents to existing current paths.

- [ ] **Step 3: Remove non-load-bearing progress labels**

Delete comment fragments such as:

```text
post-2026 redesign
PR migration
audit label
missing historical spec
```

Expected: retained comments explain current behavior or test intent only.

## Task 5: Extend Existing CSS Check Coverage

**Files:**
- Modify: `.stylelintrc.json`
- Modify: `scripts/check-token-usage.mjs`
- Modify: `scripts/check-at-layer.mjs`
- Modify: `tests/unit/styles/token-usage.test.js`
- Modify: `tests/unit/styles/at-layer.test.js`

- [ ] **Step 1: Add or expose a file-discovery API**

Update `scripts/check-token-usage.mjs` and `scripts/check-at-layer.mjs` so each script exports a discovery helper that returns checked repo-relative paths. Use this shape:

```js
export function listStyleCheckFiles(repoRoot) {
  return walk(resolve(repoRoot, 'src/styles'), ['.css'])
    .map((path) => relative(repoRoot, path))
    .sort()
}
```

Expected: the helper includes flat top-level CSS, token CSS, flat surface CSS, future nested surface CSS, and future pattern CSS when those directories exist.

- [ ] **Step 2: Add failing nested-path tests**

In `tests/unit/styles/token-usage.test.js`, add a fixture assertion that a nested file such as `src/styles/surfaces/read/ambient-dock.css` is scanned for unresolved `var(--qa-*)` references.

In `tests/unit/styles/at-layer.test.js`, add a fixture assertion that a nested file such as `src/styles/patterns/sheet.css` is scanned for bare rules outside `@layer`.

Expected pattern after calling the new helper or runner:

```js
expect(result.filesChecked).toContain('src/styles/surfaces/read/ambient-dock.css')
expect(result.filesChecked).toContain('src/styles/patterns/sheet.css')
```

- [ ] **Step 3: Run nested-path tests and confirm failure**

Run:

```bash
pnpm vitest run tests/unit/styles/token-usage.test.js tests/unit/styles/at-layer.test.js
```

Expected: FAIL until the scripts expose the new discovery helper and recurse through `src/styles`.

- [ ] **Step 4: Update glob discovery**

Modify the check scripts so CSS discovery includes:

```js
[
  'src/styles/*.css',
  'src/styles/tokens/**/*.css',
  'src/styles/patterns/**/*.css',
  'src/styles/surfaces/**/*.css',
]
```

If the scripts use manual directory walking instead of globs, update the walker root to recurse under `src/styles` and filter by `.css`.

- [ ] **Step 5: Update stylelint overrides**

Ensure `.stylelintrc.json` applies the same rule set to:

```json
[
  "src/styles/**/*.css"
]
```

Expected: future nested files are covered without needing another override.

- [ ] **Step 6: Run nested-path tests and confirm pass**

Run:

```bash
pnpm vitest run tests/unit/styles/token-usage.test.js tests/unit/styles/at-layer.test.js
```

Expected: PASS.

## Task 6: Verify Product Style Guide And UI Workflow

**Files:**
- Modify: `DESIGN.md`
- Modify: `.agents/skills/quranatlas-ui-workflow/SKILL.md`

- [ ] **Step 1: Confirm `DESIGN.md` contains required discipline**

Run:

```bash
rg -n 'Reader First|calm|dense|precise|reverent|one active reference|Svelte <style>|semantic --qa-|primitive token|active implementation reference|not the active implementation reference' DESIGN.md
```

Expected: every required concept is present: Reader First, calm/dense/precise/reverent posture, one active reference, forbidden styling mechanisms, primitive-token discipline, and `DESIGN.md` as supporting style context rather than the active implementation reference.

- [ ] **Step 2: Confirm UI workflow requires the design guide**

Run:

```bash
rg -n "DESIGN.md|one active reference|Component Reference Source Of Truth" .agents/skills/quranatlas-ui-workflow/SKILL.md
```

Expected: the workflow requires `DESIGN.md`, preserves the one-active-reference rule, and does not treat `DESIGN.md` as the component implementation reference.

- [ ] **Step 3: Patch missing wording if needed**

If either file is missing a concept, add current-state wording only. Use this exact sentence where useful:

```markdown
`DESIGN.md` is product-style context only; it is not the active implementation reference for a component pass.
```

Expected: design guide and workflow skill agree.

## Task 7: Final Verification And Commit

**Files:**
- All files touched by Tasks 2 through 5.

- [ ] **Step 1: Run docs verification**

Run:

```bash
pnpm run docs:check
```

Expected: PASS with `derive: all clean`.

If `pnpm run docs:check` reports stale generated docs, run:

```bash
pnpm run docs
pnpm run docs:check
```

Then review the generated diff before continuing.

- [ ] **Step 2: Run static validation**

Run:

```bash
pnpm run check
```

Expected: PASS.

- [ ] **Step 3: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 4: Confirm only intentional files are dirty and scratch files are not staged**

Run:

```bash
git status --short
git diff --cached --name-only -- .scratch/agentic-ui-refactor
```

Expected: every dirty path is intentional for this plan, and `git diff --cached` prints nothing for `.scratch/agentic-ui-refactor`. Stop before staging if unrelated paths are present.

- [ ] **Step 5: Commit**

Run:

Stage exact files shown by the reviewed `git status --short`, not broad directories. Example:

```bash
git add .stylelintrc.json scripts/check-token-usage.mjs scripts/check-at-layer.mjs tests/unit/styles/token-usage.test.js tests/unit/styles/at-layer.test.js docs/ui-references/README.md DESIGN.md .agents/skills/quranatlas-ui-workflow/SKILL.md
git add docs/ui-references/configure/asset-management.mobile.md docs/ui-references/configure/asset-management.mobile.png
git commit -m "chore(ui): prepare agentic refactor baseline"
```

Expected: commit succeeds. Do not stage unrelated UI reference files just because they are under `docs/ui-references`.

## Handoff To Plan 01

Record in the final response:

- which UI references were preserved, migrated later, or deleted;
- where `.scratch/agentic-ui-refactor/00-*.txt` reports live;
- any stale-comment scan hits intentionally left alone;
- confirmation that no CSS files were split;
- confirmation that nested CSS path coverage is ready.
