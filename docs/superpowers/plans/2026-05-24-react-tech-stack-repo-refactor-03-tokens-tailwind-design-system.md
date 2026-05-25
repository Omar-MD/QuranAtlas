# React Tech Stack Refactor 03 - Tokens And Tailwind v4 Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a React-only semantic token foundation and Tailwind v4 authoring layer without weakening QuranAtlas token discipline or changing shipped Svelte styling.

**Architecture:** Scope Tailwind to the React Vite build path, expose QuranAtlas semantic tokens as the component-facing API, and add durable static checks for React design-literal and Tailwind drift. Existing `src/styles/**` and Svelte checks remain unchanged.

**Tech Stack:** Tailwind CSS v4, `@tailwindcss/vite`, React Vite config, CSS `@theme`, Node.js ESM static checks, pnpm scripts.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `DESIGN.md`
- `package.json`
- `vite.react.config.js`
- `src-react/**` from plan 01
- `scripts/check-design-literals.mjs`
- `scripts/check-primitive-token-consumption.mjs`
- `scripts/check-token-usage.mjs`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`

## File Structure

Create:

- `src-react/design-system/tokens/primitives.css` - React primitive token implementation.
- `src-react/design-system/tokens/semantic.css` - React semantic QuranAtlas design API.
- `src-react/design-system/tokens/tailwind-theme.css` - Tailwind v4 `@theme` mapping to semantic tokens.
- `src-react/design-system/index.css` - React design-system stylesheet entry.
- `src-react/design-system/docs/token-usage.md` - rules for future React components.
- `src-react/design-system/docs/measured-layout-allowlist.json` - approved arbitrary/measured layout values.
- `scripts/check-react-design-literals.mjs` - React-only static design drift check.
- `tests/unit/react-design-system/check-react-design-literals.test.mjs` - positive/negative scanner coverage if script exposes testable functions.

Modify:

- `vite.react.config.js` - add Tailwind v4 Vite plugin for React only.
- `src-react/app/main.tsx` - import `src-react/design-system/index.css` instead of temporary shell CSS.
- `src-react/app/App.tsx` - use approved token/Tailwind utility fixture classes.
- `package.json` - add Tailwind dependency and check script.
- `docs/tech-stack.md` - document Tailwind v4, React token checks, scripts.
- `docs/context/repo-structure.md` - document `src-react/design-system/**`.

Do not modify:

- `src/styles/**`
- Svelte components
- Svelte build/deploy scripts
- `public/dataset/**`

## Task 1: Verify Tailwind Docs And Install Dependency

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Confirm Tailwind Context7 entry exists**

Run:

```bash
rg -n "### Tailwind CSS v4|Tailwind CSS" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md
```

Expected: Tailwind docs are recorded and not quota-blocked. If missing, run the exact commands from the spec before implementation.

- [ ] **Step 2: Add React-scoped Tailwind scripts**

Patch `package.json`:

```json
{
  "scripts": {
    "check:react:design": "node scripts/check-react-design-literals.mjs",
    "check:react": "pnpm run typecheck:react && pnpm run lint:react && node scripts/check-react-boundaries.mjs && pnpm run check:react:design"
  }
}
```

Expected: existing default `check` remains unchanged.

- [ ] **Step 3: Install dependencies during implementation**

Run:

```bash
pnpm add -D tailwindcss@latest @tailwindcss/vite@latest
```

Expected: lockfile updates only for Tailwind packages and their transitive dependencies.

- [ ] **Step 4: Document package/script changes in tech stack**

Add Tailwind v4 and check rows to `docs/tech-stack.md` in the same package-change task:

```markdown
| React styling authoring | **Tailwind CSS v4** + `@tailwindcss/vite` | versions pinned in `package.json` after `pnpm add -D tailwindcss@latest @tailwindcss/vite@latest` | React-only utility authoring mapped to QuranAtlas semantic tokens; scoped to `vite.react.config.js` during dual-build |
| React design checks | custom Node scripts | n/a | `pnpm run check:react:design` rejects raw palettes, unapproved arbitrary values, primitive-token consumption, and inline color drift in `src-react/**` |
```

Expected: package/script changes are documented before this task is considered complete.

## Task 2: Token Files And Tailwind Theme

**Files:**
- Create: `src-react/design-system/tokens/primitives.css`
- Create: `src-react/design-system/tokens/semantic.css`
- Create: `src-react/design-system/tokens/tailwind-theme.css`
- Create: `src-react/design-system/index.css`

- [ ] **Step 1: Add primitive tokens**

Create `src-react/design-system/tokens/primitives.css`:

```css
@layer qa-react-tokens {
  :root {
    --qar-color-parchment-50: #fbf7ef;
    --qar-color-parchment-100: #f4ead8;
    --qar-color-ink-900: #1f1b16;
    --qar-color-ink-700: #4f473d;
    --qar-color-bronze-600: #8a5a21;
    --qar-color-bronze-500: #a66a24;
    --qar-color-danger-600: #a63a2f;
    --qar-space-1: 0.25rem;
    --qar-space-2: 0.5rem;
    --qar-space-3: 0.75rem;
    --qar-space-4: 1rem;
    --qar-space-6: 1.5rem;
    --qar-radius-2: 0.5rem;
    --qar-radius-3: 0.75rem;
    --qar-font-ui: Inter, ui-sans-serif, system-ui, sans-serif;
    --qar-font-arabic: var(--qa-font-arabic, serif);
    --qar-motion-fast: 120ms;
    --qar-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  }
}
```

Expected: primitives use `--qar-*` and are consumed only by semantic token files.

- [ ] **Step 2: Add semantic tokens**

Create `src-react/design-system/tokens/semantic.css`:

```css
@layer qa-react-tokens {
  :root {
    --qa-react-canvas: var(--qar-color-parchment-50);
    --qa-react-surface: var(--qar-color-parchment-100);
    --qa-react-border: color-mix(in srgb, var(--qar-color-ink-700) 22%, transparent);
    --qa-react-text: var(--qar-color-ink-900);
    --qa-react-text-muted: var(--qar-color-ink-700);
    --qa-react-accent: var(--qar-color-bronze-600);
    --qa-react-accent-strong: var(--qar-color-bronze-500);
    --qa-react-focus: var(--qar-color-bronze-500);
    --qa-react-danger: var(--qar-color-danger-600);
    --qa-react-reader-page: var(--qa-react-canvas);
    --qa-react-reader-text: var(--qa-react-text);
    --qa-react-reader-muted: var(--qa-react-text-muted);
    --qa-react-reader-selection: color-mix(in srgb, var(--qa-react-accent) 22%, transparent);
    --qa-react-offline-warning: #806100;
    --qa-react-storage-danger: var(--qa-react-danger);
    --qa-react-radius-control: var(--qar-radius-2);
    --qa-react-radius-surface: var(--qar-radius-3);
    --qa-react-space-control-x: var(--qar-space-3);
    --qa-react-space-control-y: var(--qar-space-2);
    --qa-react-font-ui: var(--qar-font-ui);
    --qa-react-font-arabic: var(--qar-font-arabic);
    --qa-react-transition-fast: var(--qar-motion-fast) var(--qar-ease-standard);
  }

  html[data-theme='sepia'] {
    --qa-react-canvas: #f3e6ce;
    --qa-react-surface: #ead8b9;
  }

  html[data-theme='dark'] {
    --qa-react-canvas: #181511;
    --qa-react-surface: #24201a;
    --qa-react-text: #f8f2e7;
    --qa-react-text-muted: #c9bba8;
    --qa-react-border: color-mix(in srgb, #f8f2e7 18%, transparent);
  }
}
```

Expected: component-facing tokens are `--qa-react-*`; future checks block direct primitive use outside token files.

- [ ] **Step 3: Add Tailwind theme mapping**

Create `src-react/design-system/tokens/tailwind-theme.css`:

```css
@import 'tailwindcss' prefix(qar);

@theme {
  --color-canvas: var(--qa-react-canvas);
  --color-surface: var(--qa-react-surface);
  --color-border: var(--qa-react-border);
  --color-text: var(--qa-react-text);
  --color-muted: var(--qa-react-text-muted);
  --color-accent: var(--qa-react-accent);
  --color-accent-strong: var(--qa-react-accent-strong);
  --color-focus: var(--qa-react-focus);
  --color-danger: var(--qa-react-danger);
  --radius-control: var(--qa-react-radius-control);
  --radius-surface: var(--qa-react-radius-surface);
  --font-ui: var(--qa-react-font-ui);
  --font-arabic: var(--qa-react-font-arabic);
}
```

Expected: Tailwind utilities use the `qar:` prefix and map to semantic tokens.

- [ ] **Step 4: Add React design-system CSS entry**

Create `src-react/design-system/index.css`:

```css
@layer qa-react-reset, qa-react-tokens, qa-react-base, qa-react-components;

@import './tokens/primitives.css';
@import './tokens/semantic.css';
@import './tokens/tailwind-theme.css';

@layer qa-react-base {
  :root {
    font-family: var(--qa-react-font-ui);
    color: var(--qa-react-text);
    background: var(--qa-react-canvas);
  }

  body {
    margin: 0;
    min-width: 320px;
  }

  * {
    box-sizing: border-box;
  }
}
```

Expected: CSS remains under `src-react/**` and does not enter Svelte style entry.

## Task 3: Wire Tailwind Into React Build

**Files:**
- Modify: `vite.react.config.js`
- Modify: `src-react/app/main.tsx`
- Modify: `src-react/app/App.tsx`

- [ ] **Step 1: Add Tailwind Vite plugin to React config**

Patch `vite.react.config.js`:

```js
import tailwindcss from '@tailwindcss/vite'

// ...
plugins: [react(), tailwindcss()],
```

Expected: Tailwind plugin is in `vite.react.config.js` only, not `vite.config.js`.

- [ ] **Step 2: Swap CSS import**

Patch `src-react/app/main.tsx`:

```ts
import '../../design-system/index.css'
```

Remove the old `../styles/index.css` import. Keep the React bootstrap unchanged.

Expected: React shell uses design-system entry.

- [ ] **Step 3: Update shell classes to prove prefixed utilities**

Patch `src-react/app/App.tsx`:

```tsx
return (
  <main
    className="qar:min-h-screen qar:bg-canvas qar:px-6 qar:py-10 qar:text-text qar:flex qar:flex-col qar:justify-center qar:gap-3"
    data-react-route={initialRoute}
  >
    <p className="qar:m-0 qar:text-sm qar:text-muted">React preview</p>
    <h1 className="qar:m-0 qar:font-ui qar:text-3xl qar:leading-tight">QuranAtlas</h1>
    <p className="qar:m-0 qar:max-w-xl qar:text-base qar:text-muted">
      Isolated React shell. The Svelte app remains the shipped default until cutover.
    </p>
  </main>
)
```

Expected: only `qar:` utilities are used; no built-in palette class appears.

## Task 4: Static React Design Checks

**Files:**
- Create: `src-react/design-system/docs/measured-layout-allowlist.json`
- Create: `scripts/check-react-design-literals.mjs`
- Create: `tests/unit/react-design-system/check-react-design-literals.test.mjs`

- [ ] **Step 1: Add measured layout allowlist**

Create `src-react/design-system/docs/measured-layout-allowlist.json`:

```json
{
  "allowedArbitraryUtilities": [
    {
      "className": "qar:aspect-[2/3]",
      "reason": "Future Mushaf page proof may need a fixed page aspect ratio before page assets load."
    }
  ],
  "allowedLiteralCssFiles": [
    "src-react/design-system/tokens/primitives.css",
    "src-react/design-system/tokens/semantic.css"
  ]
}
```

Expected: arbitrary utility allowance is explicit and narrow.

- [ ] **Step 2: Add scanner**

Create `scripts/check-react-design-literals.mjs`:

```js
import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const allowlist = JSON.parse(readFileSync(join(repoRoot, 'src-react/design-system/docs/measured-layout-allowlist.json'), 'utf8'))
const allowedLiteralCssFiles = new Set(allowlist.allowedLiteralCssFiles)
const allowedArbitraryUtilities = new Set(allowlist.allowedArbitraryUtilities.map((entry) => entry.className))
const checkedExtensions = new Set(['.ts', '.tsx', '.css'])
const forbiddenPalette = /\bqar:(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
const arbitraryUtility = /\bqar:[\w:-]+-\[[^\]]+\]/g
const hexColor = /#[0-9a-fA-F]{3,8}\b/g
const primitiveToken = /var\(--qar-/g
const inlineColorStyle = /style=\{\{[^}]*color\s*:/g

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(path))
    } else if (checkedExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

export function checkReactDesignText(repoRelativePath, text) {
  const failures = []
  for (const match of text.matchAll(forbiddenPalette)) {
    failures.push(`${repoRelativePath}: forbidden Tailwind palette utility ${match[0]}`)
  }
  for (const match of text.matchAll(arbitraryUtility)) {
    if (!allowedArbitraryUtilities.has(match[0])) {
      failures.push(`${repoRelativePath}: unapproved arbitrary utility ${match[0]}`)
    }
  }
  if (!allowedLiteralCssFiles.has(repoRelativePath)) {
    for (const match of text.matchAll(hexColor)) {
      failures.push(`${repoRelativePath}: raw color literal ${match[0]}`)
    }
    if (primitiveToken.test(text)) {
      failures.push(`${repoRelativePath}: primitive token consumed outside token files`)
    }
  }
  if (inlineColorStyle.test(text)) {
    failures.push(`${repoRelativePath}: inline color style is forbidden`)
  }
  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = []
  for (const file of await walk(join(repoRoot, 'src-react'))) {
    const repoRelativePath = relative(repoRoot, file)
    failures.push(...checkReactDesignText(repoRelativePath, readFileSync(file, 'utf8')))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-design-literals: ok')
}
```

Expected: scanner fails on palette classes, raw hex outside token files, unapproved arbitrary values, primitive token consumption outside token files, and inline color styles.

- [ ] **Step 3: Add scanner unit coverage**

Create `tests/unit/react-design-system/check-react-design-literals.test.mjs`:

```js
import { describe, expect, it } from 'vitest'
import { checkReactDesignText } from '../../../scripts/check-react-design-literals.mjs'

describe('checkReactDesignText', () => {
  it('rejects built-in palette utilities and raw literals', () => {
    const failures = checkReactDesignText('src-react/components/Button.tsx', 'className="qar:bg-blue-500 qar:text-[#fff]" style={{ color: "red" }}')
    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining('forbidden Tailwind palette utility'),
      expect.stringContaining('unapproved arbitrary utility'),
      expect.stringContaining('inline color style'),
    ]))
  })

  it('allows semantic token utilities', () => {
    const failures = checkReactDesignText('src-react/components/Button.tsx', 'className="qar:bg-accent qar:text-text qar:rounded-control"')
    expect(failures).toEqual([])
  })
})
```

Expected: test covers a failing fixture and an approved fixture.

## Task 5: Docs Updates

**Files:**
- Create: `src-react/design-system/docs/token-usage.md`
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/repo-structure.md`

- [ ] **Step 1: Add token usage docs**

Create `src-react/design-system/docs/token-usage.md`:

```markdown
# React Token Usage

React components consume semantic `--qa-react-*` tokens through prefixed Tailwind
utilities or design-system recipes. Primitive `--qar-*` tokens are private to
`src-react/design-system/tokens/**`.

Rules:

- Use `qar:` prefixed utilities only.
- Use semantic names such as `qar:bg-surface`, `qar:text-text`, `qar:border-border`, and `qar:rounded-control`.
- Do not use built-in Tailwind palette classes.
- Do not use arbitrary values unless listed in `measured-layout-allowlist.json`.
- Do not add inline color styles.
- Keep Tailwind in owned React design-system and product components, not shared Svelte files.
```

Expected: future specs have local rules.

- [ ] **Step 2: Confirm tech stack**

Confirm the rows added in Task 1 still match the final script names and dependency versions:

```markdown
| React styling authoring | **Tailwind CSS v4** + `@tailwindcss/vite` | versions pinned in `package.json` after `pnpm add -D tailwindcss@latest @tailwindcss/vite@latest` | React-only utility authoring mapped to QuranAtlas semantic tokens; scoped to `vite.react.config.js` during dual-build |
| React design checks | custom Node scripts | n/a | `pnpm run check:react:design` rejects raw palettes, unapproved arbitrary values, primitive-token consumption, and inline color drift in `src-react/**` |
```

Expected: docs reflect any new package/script in the same change as `package.json`.

- [ ] **Step 3: Update repo structure**

Add:

```markdown
- `src-react/design-system/`: React-only token, Tailwind theme, registry, recipe, and design-system docs. It does not replace `src/styles/**` until cutover.
```

Expected: `src/styles/**` remains documented as current shipped Svelte design system.

## Task 6: Verification, Commit, And Handoff

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run targeted scanner and unit test**

Run:

```bash
pnpm run check:react:design
pnpm exec vitest run tests/unit/react-design-system/check-react-design-literals.test.mjs
```

Expected: scanner prints `react-design-literals: ok`; unit tests pass.

- [ ] **Step 2: Run React and Svelte checks**

Run:

```bash
pnpm run check:react
pnpm run build:react
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: React build still writes `dist-react/`; Svelte checks remain green; docs and whitespace are clean.

- [ ] **Step 3: Confirm Tailwind is not wired into shipped Svelte config**

Run:

```bash
rg -n "@tailwindcss/vite|tailwindcss" vite.config.js src/styles
```

Expected: no output.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml vite.react.config.js src-react scripts/check-react-design-literals.mjs tests/unit/react-design-system docs/tech-stack.md docs/context/repo-structure.md
git commit -m "feat: add react design tokens and tailwind checks"
```

Expected: commit succeeds. Do not push.

- [ ] **Step 5: Handoff notes**

Record:

```text
React token entry:
- src-react/design-system/index.css
React Tailwind prefix:
- qar:
Design check:
- pnpm run check:react:design
Verification:
- pnpm run check:react:design
- pnpm exec vitest run tests/unit/react-design-system/check-react-design-literals.test.mjs
- pnpm run check:react
- pnpm run build:react
- pnpm run check
- pnpm run docs:check
- git diff --check
```

Expected: Storybook and component-layer plans can use the semantic token API.
