# Agentic UI Refactor 01 - Check Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add blocking and advisory UI refactor safety checks for style imports, visual references, selector liveness, primitive token consumption, and hardcoded design values.

**Architecture:** Build small Node.js ESM scripts with exported pure helpers so Vitest can exercise scanner behavior without mutating the real repo. Wire style-entry and UI-reference checks as blocking, then wire selector/token/literal checks as advisory so later cleanup can promote them.

**Tech Stack:** Node.js ESM, Vitest, pnpm scripts, Markdown docs, CSS parsing with conservative regex scanners, QuranAtlas static check conventions.

---

## Required Context

Read these before editing:

- `docs/superpowers/specs/2026-05-22-agentic-ui-refactor-01-check-infrastructure-spec.md`
- `docs/superpowers/plans/2026-05-23-agentic-ui-refactor-00-baseline-readiness.md`
- `scripts/check-theme-parity.mjs`
- `scripts/check-token-usage.mjs`
- `scripts/check-at-layer.mjs`
- `scripts/check-no-svelte-style.mjs`
- `tests/unit/styles/theme-parity.test.js`
- `tests/unit/styles/token-usage.test.js`
- `tests/unit/styles/at-layer.test.js`
- `docs/ui-references/**`
- `docs/tech-stack.md`
- `package.json`
- `tests/unit/AGENTS.md`

## File Structure

Create:

- `scripts/check-style-entry.mjs` - import coverage and ordered import report.
- `scripts/check-ui-references.mjs` - image/note pairing and intent-note field validation.
- `scripts/check-selector-liveness.mjs` - advisory/blocking `.qa-*` class liveness.
- `scripts/check-primitive-token-consumption.mjs` - primitive-token leak scanner.
- `scripts/check-design-literals.mjs` - hardcoded color, motion, and radius scanner.
- `tests/unit/styles/style-entry.test.js`
- `tests/unit/styles/ui-references.test.js`
- `tests/unit/styles/selector-liveness.test.js`
- `tests/unit/styles/primitive-token-consumption.test.js`
- `tests/unit/styles/design-literals.test.js`

Modify:

- `package.json`
- `docs/tech-stack.md`

## Shared Script Shape

Every new script should follow this shape:

```js
#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export async function runCheck(options = {}) {
  const findings = []
  return { ok: findings.length === 0, findings }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCheck({ argv: process.argv.slice(2) })
  if (!result.ok) {
    for (const finding of result.findings) console.error(finding.message)
    process.exit(1)
  }
}
```

Tests should import `runCheck` or smaller exported helpers and pass fixture directories through options so they do not need to mutate the repository.

## Task 1: Style Entry Check

**Files:**
- Create: `scripts/check-style-entry.mjs`
- Create: `tests/unit/styles/style-entry.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/styles/style-entry.test.js` with cases for:

```js
import { describe, expect, it } from 'vitest'
import { analyseStyleEntry } from '../../../scripts/check-style-entry.mjs'

describe('check-style-entry', () => {
  it('fails stale imports', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./missing.css');",
      files: ['src/styles/index.css'],
      entryPath: 'src/styles/index.css',
    })
    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'stale-import')).toBe(true)
  })

  it('fails duplicate imports', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./base.css');\n@import url('./base.css');",
      files: ['src/styles/index.css', 'src/styles/base.css'],
      entryPath: 'src/styles/index.css',
    })
    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'duplicate-import')).toBe(true)
  })

  it('fails unimported nested shipping partials', () => {
    const result = analyseStyleEntry({
      entryText: "@import url('./base.css');",
      files: ['src/styles/index.css', 'src/styles/base.css', 'src/styles/surfaces/read/ambient-dock.css'],
      entryPath: 'src/styles/index.css',
    })
    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'missing-import')).toBe(true)
  })
})
```

- [ ] **Step 2: Run failing style-entry test**

Run:

```bash
pnpm vitest run tests/unit/styles/style-entry.test.js
```

Expected: FAIL because `scripts/check-style-entry.mjs` does not exist.

- [ ] **Step 3: Implement style-entry scanner**

Implement exported `analyseStyleEntry({ entryText, files, entryPath, allowlist })` with:

```js
const IMPORT_RE = /@import\s+url\(['"](.+?)['"]\)/g
```

Return findings with codes:

```js
stale-import
duplicate-import
missing-import
```

Resolve imports relative to `entryPath`, normalize to repo-relative POSIX paths, ignore allowlisted files only when the allowlist entry has `path`, `owner`, and `reason`.

- [ ] **Step 4: Confirm style-entry tests pass**

Run:

```bash
pnpm vitest run tests/unit/styles/style-entry.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit style-entry check**

Run:

```bash
git add scripts/check-style-entry.mjs tests/unit/styles/style-entry.test.js
git commit -m "chore(ui): add style entry check"
```

Expected: commit succeeds.

## Task 2: UI Reference Pairing Check

**Files:**
- Create: `scripts/check-ui-references.mjs`
- Create: `tests/unit/styles/ui-references.test.js`

- [ ] **Step 1: Write failing tests**

Create tests for these findings:

```js
orphan-image
orphan-note
missing-field
stray-system-file
```

Use this required field list in the test:

```js
[
  'Component',
  'State and viewport',
  'Accepted visual traits',
  'Forbidden traits',
  'Token expectations',
  'Responsive differences',
  'Non-goals',
]
```

- [ ] **Step 2: Run failing UI reference test**

Run:

```bash
pnpm vitest run tests/unit/styles/ui-references.test.js
```

Expected: FAIL because `scripts/check-ui-references.mjs` does not exist.

- [ ] **Step 3: Implement UI reference scanner**

Implement exported `analyseUiReferences({ files, readText, allowlist })`:

```js
export const REQUIRED_NOTE_FIELDS = [
  'Component',
  'State and viewport',
  'Accepted visual traits',
  'Forbidden traits',
  'Token expectations',
  'Responsive differences',
  'Non-goals',
]
```

Rules:

- ignore `docs/ui-references/README.md`;
- fail `.DS_Store`;
- same basename `.png` and `.md` required;
- allow matrix/index notes only through allowlist entries with `path`, `owner`, `reason`, and `category`.

- [ ] **Step 4: Confirm UI reference tests pass**

Run:

```bash
pnpm vitest run tests/unit/styles/ui-references.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit UI-reference check**

Run:

```bash
git add scripts/check-ui-references.mjs tests/unit/styles/ui-references.test.js
git commit -m "chore(ui): add ui reference check"
```

Expected: commit succeeds.

## Task 3: Selector Liveness Advisory Check

**Files:**
- Create: `scripts/check-selector-liveness.mjs`
- Create: `tests/unit/styles/selector-liveness.test.js`

- [ ] **Step 1: Write failing tests**

Cover:

```js
unused-css-class
missing-css-class
uncertain-dynamic-class
allowlisted-class
custom-property-ignored
```

Use fixtures that include:

```css
.qa-used {}
.qa-unused {}
:root { --qa-used-token: red; }
```

```svelte
<div class="qa-used" class:qa-active={active}></div>
```

- [ ] **Step 2: Run failing selector test**

Run:

```bash
pnpm vitest run tests/unit/styles/selector-liveness.test.js
```

Expected: FAIL because `scripts/check-selector-liveness.mjs` does not exist.

- [ ] **Step 3: Implement selector scanner**

Implement exported helpers:

```js
export function extractCssClasses(cssText) {}
export function extractCodeClasses(sourceText) {}
export function analyseSelectorLiveness({ cssFiles, sourceFiles, allowlist, advisory = false }) {}
```

Recognize static classes, `class:qa-*`, `classList.add/remove/toggle`, `closest`, `querySelector`, `querySelectorAll`, and `className` assignments. Treat `--qa-*` custom properties as non-class values.

- [ ] **Step 4: Confirm selector tests pass**

Run:

```bash
pnpm vitest run tests/unit/styles/selector-liveness.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit selector advisory check**

Run:

```bash
git add scripts/check-selector-liveness.mjs tests/unit/styles/selector-liveness.test.js
git commit -m "chore(ui): add selector liveness check"
```

Expected: commit succeeds.

## Task 4: Primitive Token Advisory Check

**Files:**
- Create: `scripts/check-primitive-token-consumption.mjs`
- Create: `tests/unit/styles/primitive-token-consumption.test.js`

- [ ] **Step 1: Write failing tests**

Cover:

```js
primitive-token-outside-token-file
semantic-token-allowed
token-file-allowed
allowlisted-compatibility-alias
```

Primitive regex:

```js
/var\(--(?:c|s|r|ff|fs|lh|dur|ease)-[A-Za-z0-9-]+\)/
```

- [ ] **Step 2: Run failing primitive-token test**

Run:

```bash
pnpm vitest run tests/unit/styles/primitive-token-consumption.test.js
```

Expected: FAIL because `scripts/check-primitive-token-consumption.mjs` does not exist.

- [ ] **Step 3: Implement primitive-token scanner**

Implement exported `analysePrimitiveTokenConsumption({ files, allowlist, advisory = false })`. Findings must include file, line, token, owner when allowlisted, and removal condition when allowlisted.

- [ ] **Step 4: Confirm primitive-token tests pass**

Run:

```bash
pnpm vitest run tests/unit/styles/primitive-token-consumption.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit primitive-token check**

Run:

```bash
git add scripts/check-primitive-token-consumption.mjs tests/unit/styles/primitive-token-consumption.test.js
git commit -m "chore(ui): add primitive token check"
```

Expected: commit succeeds.

## Task 5: Design Literal Advisory Check

**Files:**
- Create: `scripts/check-design-literals.mjs`
- Create: `tests/unit/styles/design-literals.test.js`

- [ ] **Step 1: Write failing tests**

Cover:

```js
hardcoded-hex-color
hex-inside-color-mix
raw-motion-literal
raw-radius-literal
comment-allowlisted-line
spacing-literal-ignored
```

- [ ] **Step 2: Run failing design-literal test**

Run:

```bash
pnpm vitest run tests/unit/styles/design-literals.test.js
```

Expected: FAIL because `scripts/check-design-literals.mjs` does not exist.

- [ ] **Step 3: Implement design-literal scanner**

Implement exported `analyseDesignLiterals({ files, allowlist, advisory = false })` with regexes for:

```js
const HEX_RE = /#[0-9A-Fa-f]{3,8}\b/
const MOTION_RE = /\b\d+(?:\.\d+)?m?s\s+(?:ease|linear|ease-in|ease-out|ease-in-out)\b/
const RADIUS_RE = /border-radius\s*:\s*\d+(?:\.\d+)?(?:px|rem|em)\b/
```

Allow a local comment containing `qa-design-literal-ok` with a reason on the same line.

- [ ] **Step 4: Confirm design-literal tests pass**

Run:

```bash
pnpm vitest run tests/unit/styles/design-literals.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit design-literal check**

Run:

```bash
git add scripts/check-design-literals.mjs tests/unit/styles/design-literals.test.js
git commit -m "chore(ui): add design literal check"
```

Expected: commit succeeds.

## Task 6: Package Script And Docs Integration

**Files:**
- Modify: `package.json`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Update `pnpm run check`**

Modify the `check` script order to:

```json
"check": "pnpm run lint && node scripts/check-theme-parity.mjs && node scripts/check-token-usage.mjs && node scripts/check-at-layer.mjs && node scripts/check-style-entry.mjs && node scripts/check-ui-references.mjs && node scripts/check-selector-liveness.mjs --advisory && node scripts/check-primitive-token-consumption.mjs --advisory && node scripts/check-design-literals.mjs --advisory && node scripts/check-no-svelte-style.mjs && svelte-check --tsconfig ./tsconfig.json"
```

- [ ] **Step 2: Document static checks**

In `docs/tech-stack.md`, update the static checks section so it lists:

```markdown
- `check-style-entry.mjs` — verifies every shipping CSS partial is imported exactly once by `src/styles/index.css`.
- `check-ui-references.mjs` — verifies committed UI reference image/note pairing and required intent-note fields.
- `check-selector-liveness.mjs` — advisory until cleanup promotes it; reports unreferenced or undefined `.qa-*` classes.
- `check-primitive-token-consumption.mjs` — advisory until cleanup promotes it; reports primitive token use outside token files.
- `check-design-literals.mjs` — advisory until cleanup promotes it; reports hardcoded color, motion, and radius decisions.
```

- [ ] **Step 3: Run all new tests**

Run:

```bash
pnpm vitest run tests/unit/styles/style-entry.test.js tests/unit/styles/ui-references.test.js tests/unit/styles/selector-liveness.test.js tests/unit/styles/primitive-token-consumption.test.js tests/unit/styles/design-literals.test.js
```

Expected: PASS.

- [ ] **Step 4: Run full static gate**

Run:

```bash
pnpm run check
```

Expected: PASS. Advisory scripts may print reviewed warnings but exit 0.

- [ ] **Step 5: Run docs and whitespace checks**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: both pass.

- [ ] **Step 6: Commit integration**

Run:

```bash
git add package.json docs/tech-stack.md
git commit -m "chore(ui): wire refactor checks"
```

Expected: commit succeeds.

## Handoff To Plan 02

Record:

- exact command for `node scripts/check-style-entry.mjs --report`;
- remaining advisory warnings and their owners;
- confirmation that style-entry and UI-reference checks are blocking;
- confirmation that CSS partial splitting may start.
