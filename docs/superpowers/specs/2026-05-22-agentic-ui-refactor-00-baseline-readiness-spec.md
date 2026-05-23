# Agentic UI Refactor 00 - Baseline Readiness Implementation Spec

> **For sequential agents:** Complete this spec first. Commit it before any
> check-infrastructure, CSS split, selector cleanup, or visual-reference
> migration work starts.

## Goal

Prepare the repo for the agentic UI refactor by cleaning drift, repairing
reference preconditions, capturing baseline reports, and making existing style
tools aware of nested future CSS paths.

## Depends On

- Current local branch state only.
- Root `AGENTS.md`.
- `.agents/skills/quranatlas-workflow/SKILL.md`.
- `.agents/skills/quranatlas-ui-workflow/SKILL.md` when touching visual
  reference rules or UI workflow text.
- `docs/context/repo-structure.md`.
- `docs/context/architecture.md`.
- `docs/tech-stack.md`.
- Active surface dossiers:
  - `docs/context/surfaces/read.md`
  - `docs/context/surfaces/navigate.md`
  - `docs/context/surfaces/configure.md`
  - `docs/context/surfaces/onboard.md`
  - `docs/context/surfaces/infra.md`
- `DESIGN.md`, if present.
- `tests/unit/AGENTS.md` before changing unit coverage.

## Produces

- A clean pre-refactor commit that does not move CSS blocks.
- Baseline report files under `.scratch/agentic-ui-refactor/`.
- Repaired or explicitly removed current `docs/ui-references` image/note pairs.
- Existing CSS checks and lint config prepared for nested `src/styles/**`
  structure.
- Product style guide and UI workflow text verified for later specs.

## Non-Goals

- Do not split `nav.css`, `settings.css`, `reader.css`, or any other CSS file.
- Do not add new check scripts except minimal helper code needed by existing
  checks.
- Do not add blocking checks to `pnpm run check`.
- Do not rename selectors or classes.
- Do not make visual redesign changes.

## Required File Map

Read:

- `package.json`
- `.stylelintrc.json`
- `scripts/check-token-usage.mjs`
- `scripts/check-at-layer.mjs`
- `tests/unit/styles/token-usage.test.js`
- `tests/unit/styles/at-layer.test.js`
- `src/styles/index.css`
- `src/styles/surfaces/*.css`
- `docs/ui-references/**`
- `docs/ui-references/README.md`, if present
- `DESIGN.md`, if present
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`

Modify only as needed:

- `.stylelintrc.json`
- `scripts/check-token-usage.mjs`
- `scripts/check-at-layer.mjs`
- `tests/unit/styles/token-usage.test.js`
- `tests/unit/styles/at-layer.test.js`
- `docs/ui-references/**`
- `docs/ui-references/README.md`
- `DESIGN.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`

Create uncommitted report files:

- `.scratch/agentic-ui-refactor/00-git-status.txt`
- `.scratch/agentic-ui-refactor/00-style-files.txt`
- `.scratch/agentic-ui-refactor/00-style-imports.txt`
- `.scratch/agentic-ui-refactor/00-ui-reference-pairs.txt`
- `.scratch/agentic-ui-refactor/00-selector-scan.txt`
- `.scratch/agentic-ui-refactor/00-token-literal-scan.txt`
- `.scratch/agentic-ui-refactor/00-stale-comment-scan.txt`

## Work Requirements

### 1. Preflight

Run and save:

```bash
mkdir -p .scratch/agentic-ui-refactor
git status --short > .scratch/agentic-ui-refactor/00-git-status.txt
find src/styles -type f -name '*.css' | sort > .scratch/agentic-ui-refactor/00-style-files.txt
```

If `git status --short` is dirty before the agent starts, stop and resolve with
the user unless the dirty files are explicitly part of this spec. Do not mix
unrelated local work into the baseline-readiness commit.

### 2. Repair Existing UI Reference Pairing

Inspect `docs/ui-references/**`.

Every committed `.png` reference must have a same-basename `.md` intent note.
Every committed `.md` intent note must have a same-basename `.png`, except
explicit index or matrix notes documented in `docs/ui-references/README.md`.
Remove stray system files such as `.DS_Store`.

For flat configure references that still exist, choose exactly one outcome per
pair:

- preserve in place for now, with valid image/note pairing;
- migrate later in Spec 05, with the current pair valid until then;
- intentionally delete both image and note when the reference no longer matches
  current UI scope.

Do not leave an orphaned image or orphaned note for a later spec.

### 3. Capture Baseline Reports

Use simple repo-local commands. These reports are review aids, not committed
source of truth.

```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('src/styles/index.css','utf8'); const imports=[...text.matchAll(/@import\\s+url\\(['\"](.+?)['\"]\\)/g)].map((m,i)=>`${i+1}\\t${m[1]}`); console.log(imports.join('\\n'));" > .scratch/agentic-ui-refactor/00-style-imports.txt
find docs/ui-references -type f | sort > .scratch/agentic-ui-refactor/00-ui-reference-pairs.txt
rg -n "\\.qa-[A-Za-z0-9_-]+" src/styles > .scratch/agentic-ui-refactor/00-selector-scan.txt || true
rg -n "var\\(--(?:c|s|r|ff|fs|lh|dur|ease)-|#[0-9A-Fa-f]{3,8}|[0-9]+ms\\s+ease|border-radius:\\s*[0-9]" src/styles > .scratch/agentic-ui-refactor/00-token-literal-scan.txt || true
rg -n "2026-|PR [0-9]|redesign|old path|missing spec|src/nav/|src/onboarding/" src docs .agents > .scratch/agentic-ui-refactor/00-stale-comment-scan.txt || true
```

The scans are intentionally broad. Review them manually; do not treat every
hit as a required deletion.

### 4. Clean Stale Routing Comments

Remove or update comments that misroute future agents. Known examples include:

- comments saying read-owned chrome lives under `src/navigate`;
- comments saying onboarding CSS is owned by `src/onboarding`;
- progress-note comments with dates, audit labels, old PR labels, or missing
  historical specs;
- stale redesign-version notes in tests or fixtures.

Keep comments only when they describe current invariants or load-bearing test
intent. Do not reword unrelated comments for style.

### 5. Prepare Existing Style Checks For Nested Paths

Update `.stylelintrc.json`, `scripts/check-token-usage.mjs`, and
`scripts/check-at-layer.mjs` so these paths are handled before files move:

- `src/styles/patterns/**/*.css`
- `src/styles/surfaces/**/*.css`
- existing flat `src/styles/surfaces/*.css`
- `src/styles/tokens/**/*.css`

Unit tests must prove the new glob behavior with nested surface and pattern
fixtures. Extend existing tests under `tests/unit/styles/` instead of adding a
new top-level test area.

Do not change the semantic behavior of token resolution or `@layer` validation
except for nested path coverage.

### 6. Verify Product Style Guide And UI Workflow Readiness

`DESIGN.md` must exist and state:

- QuranAtlas is Reader First.
- Product style is calm, dense, precise, and reverent without decorative
  ceremonial UI.
- UI work uses exactly one active component reference or one accepted current
  UI state.
- Svelte `<style>`, CSS-in-JS, Tailwind, route-local CSS, hardcoded design
  decisions, and primitive token consumption are forbidden unless a future spec
  changes the design-system rules.
- `DESIGN.md` is supporting product style context, not the active component
  reference for an implementation pass.

`.agents/skills/quranatlas-ui-workflow/SKILL.md` must require agents to read
`DESIGN.md` for UI redesign, refactor, iteration, visual review,
component-reference work, and image generation. It must keep the one-active
reference rule.

## Verification

Run:

```bash
pnpm run docs:check
pnpm run check
git diff --check
```

If generated docs are stale, run `pnpm run docs`, review the generated output,
then rerun `pnpm run docs:check`.

## Acceptance Criteria

- `git status --short` contains only files intentionally modified for this
  spec before commit.
- `.scratch/agentic-ui-refactor/00-*.txt` reports exist locally and are not
  staged.
- Existing UI references have no orphaned image/note pairs.
- Existing style checks and stylelint config cover nested future paths.
- Stale comments that would misroute later agents are removed or corrected.
- `DESIGN.md` and the UI workflow skill agree on reference discipline.
- Verification commands pass.

## Commit

Commit only this spec's source changes. Suggested message:

```bash
git commit -m "chore(ui): prepare agentic refactor baseline"
```

## Handoff To Spec 01

Tell the next agent:

- which UI references were preserved, migrated later, or deleted;
- where baseline reports live;
- whether any stale-comment hits remain intentionally untouched;
- that CSS files have not been split yet;
- that nested CSS path coverage is ready for new check scripts.
