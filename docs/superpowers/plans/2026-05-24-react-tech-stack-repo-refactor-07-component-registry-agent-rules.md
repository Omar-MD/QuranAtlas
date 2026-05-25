# React Tech Stack Refactor 07 - Component Registry And Agent Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a versioned machine-readable React component registry, validation checks, and agent-facing rules so future UI work composes approved components deterministically.

**Architecture:** Keep the registry under `src-react/design-system/registry/**`, validate it with durable Node scripts and unit tests, and wire it into the non-deploy React verification path. The registry describes the component layer from plan `06`; it does not introduce new product UI or change shipped Svelte behavior.

**Tech Stack:** JSON Schema-shaped registry data, Node.js ESM validation scripts, React source scanning, Storybook/story path checks, Vitest negative fixtures, pnpm React verification scripts.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `package.json`
- `src-react/components/ui/**`
- `src-react/design-system/docs/components.md`
- `src-react/design-system/docs/story-requirements.md`
- `tests/unit/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-06-owned-shadcn-radix-component-layer-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-07-component-registry-agent-rules-spec.md`
- Wave 1 plans `03` and `04`, plus Wave 2 plan `06`

## Dependency Gates

This plan depends on Wave 1 plans `03`, `04`, and Wave 2 plan `06`.

- Plan `06` must have delivered the owned component layer and `check:react:radix`.
- Do not add new UI components in this plan beyond test fixtures.
- React remains the future app tree; Svelte remains the shipped source of truth.

## File Structure

Create:

- `src-react/design-system/registry/component-registry.schema.json` - versioned registry schema.
- `src-react/design-system/registry/component-registry.json` - initial entries for plan `06` components.
- `src-react/design-system/registry/README.md` - registry maintenance rules.
- `src-react/design-system/docs/agent-component-workflow.md` - concise agent workflow.
- `scripts/check-react-component-registry.mjs` - registry drift validator.
- `scripts/check-react-ui-forbidden-patterns.mjs` - raw primitive bypass scanner.
- `tests/unit/react-registry/check-react-component-registry.test.mjs` - validator fixtures.
- `tests/unit/react-registry/check-react-ui-forbidden-patterns.test.mjs` - forbidden-pattern fixtures.

Modify:

- `package.json` - add `check:react-registry`, `check:react-ui-patterns`, and `validate:react`.
- `docs/tech-stack.md` - document registry checks and `validate:react`.
- `docs/context/repo-structure.md` - document registry paths.
- `AGENTS.md` and `.agents/skills/quranatlas-ui-workflow/SKILL.md` only to point future React UI work to the registry.

Do not modify:

- `src/**`
- current Svelte scripts or deploy workflow
- `public/dataset/**`
- Wave 1 plan files or spec files
- generated context fences by hand

## Task 1: Preflight And Boundary Check

**Files:**
- Read: files listed in Required Context

- [ ] **Step 1: Confirm plan 06 outputs exist**

Run:

```bash
test -f src-react/components/ui/index.ts
test -f src-react/components/ui/ui.stories.tsx
test -f tests/unit/react-components/ui-components.test.tsx
test -f scripts/check-react-radix-boundaries.mjs
```

Expected: all files exist. If any are missing, finish plan `06` before this plan.

- [ ] **Step 2: List exported UI components**

Run:

```bash
rg -n "^export" src-react/components/ui/index.ts src-react/components/ui
```

Expected: exports include all components delivered by plan `06`; use this output to keep registry entries complete.

- [ ] **Step 3: Confirm no forbidden files are in scope**

Run:

```bash
git diff --name-only -- src public/dataset docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-0[0-6]-*.md
```

Expected: no output from this plan. Treat any output as unrelated unless the user explicitly assigns it.

## Task 2: Registry Schema And Initial Entries

**Files:**
- Create: `src-react/design-system/registry/component-registry.schema.json`
- Create: `src-react/design-system/registry/component-registry.json`

- [ ] **Step 1: Create registry schema**

Create `src-react/design-system/registry/component-registry.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://quranatlas.local/schemas/react-component-registry.schema.json",
  "title": "QuranAtlas React Component Registry",
  "type": "object",
  "required": ["schemaVersion", "components"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 1 },
    "components": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/component" }
    }
  },
  "$defs": {
    "component": {
      "type": "object",
      "required": [
        "id",
        "name",
        "maturity",
        "exportPath",
        "namedExport",
        "allowedVariants",
        "allowedSizes",
        "slots",
        "dependencies",
        "tokenNamespaces",
        "stories",
        "tests",
        "accessibility",
        "visualProof",
        "owner",
        "allowedConsumers",
        "forbiddenUses"
      ],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
        "name": { "type": "string", "minLength": 1 },
        "maturity": { "enum": ["primitive", "behavior", "product", "page-recipe"] },
        "exportPath": { "type": "string", "pattern": "^src-react/" },
        "namedExport": { "type": "string", "minLength": 1 },
        "allowedVariants": { "type": "array", "items": { "type": "string" } },
        "allowedSizes": { "type": "array", "items": { "type": "string" } },
        "slots": { "type": "array", "items": { "type": "string" } },
        "dependencies": {
          "type": "object",
          "required": ["radix", "icons"],
          "additionalProperties": false,
          "properties": {
            "radix": { "type": "array", "items": { "type": "string" } },
            "icons": { "type": "array", "items": { "type": "string" } }
          }
        },
        "tokenNamespaces": { "type": "array", "minItems": 1, "items": { "type": "string" } },
        "stories": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["path", "states"],
            "additionalProperties": false,
            "properties": {
              "path": { "type": "string" },
              "states": { "type": "array", "minItems": 1, "items": { "type": "string" } }
            }
          }
        },
        "tests": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["path", "behaviors"],
            "additionalProperties": false,
            "properties": {
              "path": { "type": "string" },
              "behaviors": { "type": "array", "minItems": 1, "items": { "type": "string" } }
            }
          }
        },
        "accessibility": { "type": "array", "minItems": 1, "items": { "type": "string" } },
        "visualProof": {
          "type": "object",
          "required": ["status", "references"],
          "additionalProperties": false,
          "properties": {
            "status": { "enum": ["required", "covered", "deferred-not-visual"] },
            "references": { "type": "array", "items": { "type": "string" } },
            "reason": { "type": "string" },
            "removalCondition": { "type": "string" }
          }
        },
        "owner": {
          "type": "object",
          "required": ["surface", "package"],
          "additionalProperties": false,
          "properties": {
            "surface": { "type": "string" },
            "package": { "type": "string" }
          }
        },
        "allowedConsumers": { "type": "array", "minItems": 1, "items": { "type": "string" } },
        "forbiddenUses": { "type": "array", "minItems": 1, "items": { "type": "string" } },
        "replacement": { "type": "string" }
      }
    }
  }
}
```

Expected: schema uses load-bearing fields, not a freeform notes bucket.

- [ ] **Step 2: Create initial registry**

Create `src-react/design-system/registry/component-registry.json` with sorted entries for every export from `src-react/components/ui/index.ts`. Start with this exact opening and include one object per component:

```json
{
  "schemaVersion": 1,
  "components": [
    {
      "id": "accordion",
      "name": "Accordion",
      "maturity": "behavior",
      "exportPath": "src-react/components/ui/menus.tsx",
      "namedExport": "Accordion",
      "allowedVariants": ["default"],
      "allowedSizes": [],
      "slots": ["trigger", "content"],
      "dependencies": {
        "radix": ["@radix-ui/react-accordion"],
        "icons": []
      },
      "tokenNamespaces": ["--qa-react-*"],
      "stories": [
        {
          "path": "src-react/components/ui/ui.stories.tsx",
          "states": ["default", "open", "keyboard"]
        }
      ],
      "tests": [
        {
          "path": "tests/unit/react-components/ui-components.test.tsx",
          "behaviors": ["keyboard operation", "accessible labels"]
        }
      ],
      "accessibility": ["keyboard reachable", "focus visible", "expanded state announced"],
      "visualProof": {
        "status": "required",
        "references": ["src-react/components/ui/ui.stories.tsx"]
      },
      "owner": {
        "surface": "design-system",
        "package": "react"
      },
      "allowedConsumers": ["src-react/app/**", "src-react/components/**"],
      "forbiddenUses": ["raw Radix import in feature code", "custom accordion state without this wrapper"]
    }
  ]
}
```

Expected: add entries for `badge`, `button`, `checkbox`, `command`, `dialog`, `disclosure`, `dropdown-menu`, `icon-button`, `input`, `popover`, `progress`, `segmented-control`, `select`, `sheet`, `slider`, `spinner`, `switch`, `tabs`, `textarea`, `toast`, and `tooltip`. Keep `components` sorted by `id`.

- [ ] **Step 3: Check registry path references**

Run:

```bash
node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('src-react/design-system/registry/component-registry.json','utf8')); for (const c of r.components) { for (const p of [c.exportPath, ...c.stories.map(s=>s.path), ...c.tests.map(t=>t.path), ...c.visualProof.references.filter(p=>p.includes('/'))]) if (!fs.existsSync(p)) console.log(c.id, p); }"
```

Expected: no output. Correct any missing path before continuing.

## Task 3: Registry Validator

**Files:**
- Create: `scripts/check-react-component-registry.mjs`
- Create: `tests/unit/react-registry/check-react-component-registry.test.mjs`

- [ ] **Step 1: Add validator script**

Create `scripts/check-react-component-registry.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const registryPath = 'src-react/design-system/registry/component-registry.json'

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function sourceExports(root, relativePath, namedExport) {
  const text = fs.readFileSync(path.join(root, relativePath), 'utf8')
  const patterns = [
    `export function ${namedExport}`,
    `export const ${namedExport}`,
    `export class ${namedExport}`,
    `${namedExport},`,
    `${namedExport} as`,
  ]
  return patterns.some((pattern) => text.includes(pattern))
}

export function validateComponentRegistry(root = repoRoot) {
  const errors = []
  const registry = readJson(root, registryPath)

  if (registry.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1')
  }

  const ids = registry.components.map((component) => component.id)
  const sortedIds = [...ids].sort()
  if (ids.join('\n') !== sortedIds.join('\n')) {
    errors.push('component ids must be sorted')
  }

  const seen = new Set()
  for (const id of ids) {
    if (seen.has(id)) errors.push(`duplicate component id: ${id}`)
    seen.add(id)
  }

  for (const component of registry.components) {
    if (!exists(root, component.exportPath)) {
      errors.push(`${component.id}: exportPath missing: ${component.exportPath}`)
      continue
    }
    if (!sourceExports(root, component.exportPath, component.namedExport)) {
      errors.push(`${component.id}: named export missing: ${component.namedExport}`)
    }
    for (const story of component.stories) {
      if (!exists(root, story.path)) errors.push(`${component.id}: story path missing: ${story.path}`)
      if (!Array.isArray(story.states) || story.states.length === 0) errors.push(`${component.id}: story states missing`)
    }
    for (const test of component.tests) {
      if (!exists(root, test.path)) errors.push(`${component.id}: test path missing: ${test.path}`)
      if (!Array.isArray(test.behaviors) || test.behaviors.length === 0) errors.push(`${component.id}: test behaviors missing`)
    }
    if (component.visualProof.status !== 'deferred-not-visual') {
      if (!component.visualProof.references.length) errors.push(`${component.id}: visual proof references missing`)
      for (const reference of component.visualProof.references) {
        if (reference.includes('/') && !exists(root, reference)) errors.push(`${component.id}: visual proof reference missing: ${reference}`)
      }
    }
    if (component.maturity === 'product' || component.maturity === 'page-recipe') {
      if (component.owner.surface === 'design-system') errors.push(`${component.id}: product/page recipe must declare owning surface`)
    }
    for (const radixPackage of component.dependencies.radix) {
      if (!radixPackage.startsWith('@radix-ui/')) errors.push(`${component.id}: invalid Radix package ${radixPackage}`)
    }
  }

  return errors
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateComponentRegistry()
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exit(1)
  }
}
```

Expected: validator fails on sortedness, missing files, missing exports, missing story/test paths, missing visual proof, and invalid ownership.

- [ ] **Step 2: Add validator tests**

Create `tests/unit/react-registry/check-react-component-registry.test.mjs` with temp fixture coverage for:

```js
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateComponentRegistry } from '../../../scripts/check-react-component-registry.mjs'

let tempDir

afterEach(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

function write(file, text) {
  const fullPath = path.join(tempDir, file)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, text)
}

function writeRegistry(components) {
  write('src-react/design-system/registry/component-registry.json', JSON.stringify({ schemaVersion: 1, components }, null, 2))
}

const validComponent = {
  id: 'button',
  name: 'Button',
  maturity: 'primitive',
  exportPath: 'src-react/components/ui/button.tsx',
  namedExport: 'Button',
  allowedVariants: ['primary'],
  allowedSizes: ['md'],
  slots: ['children'],
  dependencies: { radix: [], icons: [] },
  tokenNamespaces: ['--qa-react-*'],
  stories: [{ path: 'src-react/components/ui/ui.stories.tsx', states: ['default'] }],
  tests: [{ path: 'tests/unit/react-components/ui-components.test.tsx', behaviors: ['click'] }],
  accessibility: ['focus visible'],
  visualProof: { status: 'required', references: ['src-react/components/ui/ui.stories.tsx'] },
  owner: { surface: 'design-system', package: 'react' },
  allowedConsumers: ['src-react/app/**'],
  forbiddenUses: ['raw button']
}

describe('check-react-component-registry', () => {
  it('accepts a complete registry entry', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-registry-ok-'))
    write('src-react/components/ui/button.tsx', 'export function Button() { return null }')
    write('src-react/components/ui/ui.stories.tsx', 'export const Default = {}')
    write('tests/unit/react-components/ui-components.test.tsx', 'export {}')
    writeRegistry([validComponent])

    expect(validateComponentRegistry(tempDir)).toEqual([])
  })

  it('fails unsorted duplicate entries and missing exports', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-registry-bad-'))
    write('src-react/components/ui/button.tsx', 'export function NotButton() { return null }')
    write('src-react/components/ui/ui.stories.tsx', 'export const Default = {}')
    write('tests/unit/react-components/ui-components.test.tsx', 'export {}')
    writeRegistry([{ ...validComponent, id: 'zeta' }, { ...validComponent, id: 'button' }, { ...validComponent, id: 'button' }])

    expect(validateComponentRegistry(tempDir)).toEqual(
      expect.arrayContaining([
        'component ids must be sorted',
        'duplicate component id: button',
        'zeta: named export missing: Button',
      ]),
    )
  })
})
```

Expected: tests prove the validator fails on real drift.

## Task 4: Forbidden Pattern Scanner

**Files:**
- Create: `scripts/check-react-ui-forbidden-patterns.mjs`
- Create: `tests/unit/react-registry/check-react-ui-forbidden-patterns.test.mjs`

- [ ] **Step 1: Add forbidden-pattern scanner**

Create `scripts/check-react-ui-forbidden-patterns.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const componentLayer = path.join(repoRoot, 'src-react', 'components', 'ui') + path.sep
const scanRoots = ['src-react/app', 'src-react/components/reader', 'src-react/components/sources', 'src-react/components/navigation', 'src-react/components/settings', 'src-react/components/offline']
const rawElementPattern = /<(button|input|select|textarea|dialog)\b/i

export function findForbiddenUiPatterns(root = repoRoot) {
  const violations = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!/\.(tsx)$/.test(entry.name)) continue
      if (fullPath.startsWith(componentLayer.replace(repoRoot, root))) continue
      const text = fs.readFileSync(fullPath, 'utf8')
      if (rawElementPattern.test(text)) {
        violations.push(path.relative(root, fullPath))
      }
    }
  }
  for (const relativeRoot of scanRoots) {
    walk(path.join(root, relativeRoot))
  }
  return violations.sort()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = findForbiddenUiPatterns()
  if (violations.length > 0) {
    console.error(`Use registered UI components instead of raw controls:\n${violations.join('\n')}`)
    process.exit(1)
  }
}
```

Expected: once product React directories exist, raw controls are blocked outside the owned UI layer.

- [ ] **Step 2: Add scanner tests**

Create `tests/unit/react-registry/check-react-ui-forbidden-patterns.test.mjs` with fixtures that allow raw controls in `src-react/components/ui/button.tsx` and block `<button>` in `src-react/app/routes/settings.tsx`.

Expected: scanner is strict but scoped to React directories.

## Task 5: Agent Docs And Instruction Routing

**Files:**
- Create: `src-react/design-system/registry/README.md`
- Create: `src-react/design-system/docs/agent-component-workflow.md`
- Modify: `AGENTS.md`
- Modify: `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Add registry README**

Create `src-react/design-system/registry/README.md`:

```markdown
# React Component Registry

The registry is the machine-readable source of truth for approved React components during the rebuild.

Before creating UI:

1. Search `component-registry.json` for an existing component or variant.
2. Extend an existing component when the required behavior is a variant or state.
3. Create a new component only when no existing component or page recipe fits.
4. Add source, registry entry, story, test, accessibility expectations, and visual proof in the same change.

Run `pnpm run check:react-registry` after edits.
```

Expected: README gives operational rules without duplicating the full schema.

- [ ] **Step 2: Add agent workflow doc**

Create `src-react/design-system/docs/agent-component-workflow.md`:

```markdown
# Agent Component Workflow

React UI work starts with the registry.

- Search `src-react/design-system/registry/component-registry.json`.
- Compose registered primitives, behavior wrappers, product components, or page recipes.
- Do not import Radix outside `src-react/components/ui/**`.
- Do not use raw Tailwind values, raw HTML controls, or inline design styles when a registered component exists.
- Add registry, stories, tests, docs, and visual proof with every component change.
- Keep React proof on React commands such as `pnpm run check:react`, `pnpm run test:react`, and `pnpm run validate:react`.
- Svelte remains shipped until the cutover specs say otherwise.
```

Expected: future agents get a short checklist and command set.

- [ ] **Step 3: Update root and UI workflow instructions**

Add concise bullets to `AGENTS.md` and `.agents/skills/quranatlas-ui-workflow/SKILL.md`:

```markdown
- React UI work under `src-react/**` must search `src-react/design-system/registry/component-registry.json` before creating components. Update registry, stories, tests, docs, and visual proof in the same change as component edits.
```

Expected: instructions route future React UI work to the registry while still saying Svelte is shipped until cutover.

- [ ] **Step 4: Document scripts and paths**

Update `docs/tech-stack.md` for `check:react-registry`, `check:react-ui-patterns`, and `validate:react`. Update `docs/context/repo-structure.md` to describe `src-react/design-system/registry/**`.

Expected: package scripts and repo shape are current-state accurate.

## Task 6: Scripts And Composite React Gate

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add registry scripts**

Patch `package.json`:

```json
{
  "scripts": {
    "check:react-registry": "node scripts/check-react-component-registry.mjs",
    "check:react-ui-patterns": "node scripts/check-react-ui-forbidden-patterns.mjs",
    "validate:react": "pnpm run check:react && pnpm run check:react-registry && pnpm run check:react-ui-patterns && pnpm run test:react && pnpm run test:storybook:react && pnpm run build:react && pnpm run docs:check"
  }
}
```

Expected: `validate:react` exists but remains non-deploy and does not run current Svelte deploy paths. Child spec `15` later adds React e2e and visual gates.

- [ ] **Step 2: Confirm default validation remains Svelte-compatible**

Run:

```bash
node -e "const p=require('./package.json'); console.log(p.scripts.build); console.log(p.scripts.validate)"
```

Expected: `build` still prints `pnpm run data -- build && vite build`; `validate` still targets the current Svelte composite gate.

## Task 7: Verification, Commit, And Handoff

**Files:**
- Verify: all files created or modified by this plan

- [ ] **Step 1: Run registry checks**

Run:

```bash
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run test:react -- tests/unit/react-registry/check-react-component-registry.test.mjs tests/unit/react-registry/check-react-ui-forbidden-patterns.test.mjs
```

Expected: validators pass on real files and negative fixtures pass in unit tests.

- [ ] **Step 2: Run React composite gate**

Run:

```bash
pnpm run validate:react
```

Expected: React check, registry checks, unit/component tests, Storybook tests, React build, and docs check pass.

- [ ] **Step 3: Run Svelte safety check for instruction/script edits**

Run:

```bash
pnpm run check
git diff --check
```

Expected: shipped Svelte static checks remain clean and whitespace check passes.

- [ ] **Step 4: Review diff scope**

Run:

```bash
git diff --name-only
```

Expected: only registry, React docs, scripts, instructions, package, and context docs changed. No `src/**`, `public/dataset/**`, or Wave 1 plan files changed.

- [ ] **Step 5: Commit**

Run:

```bash
git add AGENTS.md .agents/skills/quranatlas-ui-workflow/SKILL.md package.json docs/tech-stack.md docs/context/repo-structure.md src-react/design-system/registry src-react/design-system/docs/agent-component-workflow.md scripts/check-react-component-registry.mjs scripts/check-react-ui-forbidden-patterns.mjs tests/unit/react-registry
git commit -m "feat: add react component registry checks"
```

Expected: commit succeeds. Do not push.

## Handoff To Plan 08

Plan `08` may use registered offline UI components and must not introduce unregistered offline product components. Any offline component or page recipe added after this point must update `component-registry.json`, stories, tests, docs, and visual proof in the same change.
