# React Tech Stack Refactor 18 - Svelte Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Svelte-only source, dependencies, scripts, generated context entries, and workflow language after the React production flip has soaked successfully and rollback no longer depends on retained Svelte source.

**Architecture:** Inventory Svelte-only code and tooling, prove React coverage owns all retained product behavior, then delete only Svelte-specific paths while preserving framework-neutral runtime, data, public assets, source catalogs, compatibility dataset paths, and runtime dataset contracts. Rollback policy moves from retained source to git history or a tagged release.

**Tech Stack:** React production app, TypeScript, Vite, pnpm, ESLint/Stylelint/Vitest/Playwright, QuranAtlas data builders, docs derivation scripts.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/module-graph.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/feature-map.md`
- `docs/context/implemented.md`
- `docs/context/roadmap.md`
- `docs/context/open-issues.md`
- `docs/product-info.md`
- `docs/tech-stack.md`
- `package.json`
- `eslint.config.js`
- `vite.config.js`
- `vitest.config.js`
- `playwright.config.js`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Master spec `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Child spec/plan `17` and its production flip commit/evidence

## Dependency Gates

Do not begin until:

- Wave `17` production flip is merged and soaked on the approved branches.
- React production gates pass on the soaked branch.
- Rollback criteria from Wave `16` and Wave `17` pass.
- The user/stakeholder explicitly approves moving rollback from retained Svelte source to git history or a tagged release.
- No active incident requires immediate Svelte rollback.

## File Structure

Modify or delete only after inventory proves they are Svelte-only:

- `src/**/*.svelte` and Svelte-only `src/**` modules.
- Svelte-only tests under `tests/unit/**` and `tests/e2e/**` after React tests own the behavior.
- Svelte-only package dependencies, scripts, Vite/Svelte config, ESLint Svelte config, and `svelte-check`.
- Svelte-only style checks such as no-Svelte-style gates if React has equivalent checks and no `.svelte` files remain.
- Context docs, generated inventories, style-map entries, AGENTS files, and repo-local skills that refer to Svelte as active or rollback-retained source.

Preserve:

- `src-react/**` production React app.
- Framework-neutral runtime modules used by React.
- `data/**`, `public/dataset/**`, `public/fonts/**`, `public/icons/**`, `scripts/data/**`, source catalogs, normalized sources, taxonomy, and runtime dataset contracts.
- Compatibility dataset paths needed by React runtime or a separate data migration spec.
- Git history and release tags.

Do not modify:

- Product scope.
- Source-data contracts or compatibility data paths unless a separate data migration spec owns the change.
- Asset-pack contents just because Svelte previously consumed them.

## Task 1: Soak Approval And Current Docs Gate

**Files:**
- Read: Wave 17 commit/evidence
- Read: files listed in Required Context

- [ ] **Step 1: Confirm React is production**

Run:

```bash
pnpm run build
node -e "const fs=require('fs'); const pkg=require('./package.json'); if (!pkg.scripts.build.includes('react') || !fs.existsSync('src-react')) { console.error('React production build not established'); process.exit(1); }"
```

Expected: production build is React after Wave `17`.

- [ ] **Step 2: Confirm Svelte removal approval**

Run:

```bash
rg -n "Svelte removal approved|Wave 18 approved|rollback.*tagged release|rollback.*git history" docs/superpowers/specs docs/tech-stack.md docs/context/architecture.md
```

Expected: explicit approval or documented policy exists. If not, stop and ask the user before deleting retained rollback source.

- [ ] **Step 3: Run pre-removal full gates**

Run:

```bash
pnpm run validate
pnpm run validate:react
pnpm run docs:check
git diff --check
```

Expected: React production and retained Svelte rollback state are healthy before removal begins.

- [ ] **Step 4: Fetch current docs only if tooling details changed beyond verified patterns**

If removal changes Vite, TypeScript, ESLint, Stylelint, Vitest, Playwright, CI, or package-manager configuration beyond previously verified patterns, run the relevant Context7 pair outside Codex's default sandbox before editing. Example:

```bash
npx ctx7@latest library ESLint "How should ESLint flat config remove Svelte plugin configuration and keep React TypeScript linting in a Vite project?"
npx ctx7@latest docs /eslint/eslint "How should ESLint flat config remove Svelte plugin configuration and keep React TypeScript linting in a Vite project?"
```

Expected: do not make unverified tooling syntax changes. If Context7 quota-blocks, stop those tooling edits.

## Task 2: Inventory Svelte-Only Paths

**Files:**
- Create: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-18-svelte-removal-inventory.md`

- [ ] **Step 1: Generate Svelte file inventory**

Run:

```bash
rg --files | rg '(^src/|svelte|Svelte|\\.svelte$|@sveltejs|svelte-check)'
```

Expected: list candidate Svelte-only files, config entries, tests, and docs references.

- [ ] **Step 2: Generate package/tooling inventory**

Run:

```bash
node -e "const p=require('./package.json'); const all={...p.dependencies,...p.devDependencies}; for (const [name, version] of Object.entries(all)) { if (/svelte/i.test(name)) console.log(name+' '+version); } for (const [name, cmd] of Object.entries(p.scripts)) { if (/svelte/i.test(name+' '+cmd)) console.log('script '+name+': '+cmd); }"
```

Expected: prints only Svelte packages/scripts to remove or rename in this wave.

- [ ] **Step 3: Create inventory document**

Create `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-18-svelte-removal-inventory.md`:

```markdown
# React Tech Stack Refactor 18 - Svelte Removal Inventory

## Status

React is the production implementation. This inventory lists Svelte-only paths approved for deletion and retained framework-neutral/data paths that must not be removed.

## Delete Candidates

| Path or package | Reason it is Svelte-only | React owner or replacement proof | Delete in task |
| --- | --- | --- | --- |

## Retained Paths

| Path | Reason retained |
| --- | --- |
| `data/**` | Build-only source data and catalogs; not Svelte-specific |
| `public/dataset/**` | Runtime dataset and compatibility paths; preserved unless a separate data migration spec owns changes |
| `public/fonts/**` | Runtime font assets used by reader |
| `public/icons/**` | App/static icons unless React separately owns replacement |
| `scripts/data/**` | Dataset builders and source catalog validation |
| `src-react/**` | Production React source |

## Rollback Policy After Removal

Rollback no longer depends on retained Svelte source. Use git history or the approved tagged release recorded by the Wave `17`/Wave `18` approval notes.
```

Expected: inventory exists before any deletion.

- [ ] **Step 4: Fill inventory with concrete paths**

Edit the inventory so each delete candidate has a React owner or replacement proof command, for example:

```markdown
| `src/App.svelte` | Svelte root component | React production root under `src-react/app/**`; proof: `pnpm run validate` | Task 3 |
| `@sveltejs/vite-plugin-svelte` | Svelte Vite plugin | React Vite config is production; proof: `pnpm run build` | Task 4 |
| `svelte-check` | Svelte type checker | React TypeScript check is in `pnpm run validate`; proof: `pnpm run check` | Task 4 |
```

Expected: no path is deleted without a replacement proof or explicit reason it was rollback-only.

## Task 3: Remove Svelte Runtime Source And Tests

**Files:**
- Delete: Svelte-only source files identified in inventory
- Delete or modify: Svelte-only unit/e2e tests after React tests own behavior
- Preserve: framework-neutral modules and data paths

- [ ] **Step 1: Delete approved Svelte-only source files**

Run non-interactively after inventory is complete. Do not use command substitution or broad glob deletion for this step; copy the exact approved paths from `Delete Candidates` and remove them explicitly in small batches:

```bash
git rm -- src/App.svelte
git rm -- src/read/Reader.svelte src/read/Verse.svelte
```

Expected: removes only inventory-approved Svelte files. Replace the example paths with the concrete inventory paths before running. If a path is not listed in the inventory with React owner or rollback-only reason, do not delete it.

- [ ] **Step 2: Remove Svelte-only source directory remnants**

Run:

```bash
rg --files src
```

Expected: remaining `src/**` files are framework-neutral and used by React, or they are listed in the inventory for explicit deletion. Delete only inventory-approved Svelte-only remnants with `git rm`.

- [ ] **Step 3: Remove Svelte-only tests after React coverage proof**

Run:

```bash
rg -n "svelte|Svelte|@testing-library/svelte|\\.svelte" tests/unit tests/e2e
```

Expected: every result is either deleted because it tests Svelte-only code, or updated to point at React production behavior. Before deleting a test file, record the React proof owner in the inventory.

- [ ] **Step 4: Run React behavior proof after source deletion**

Run:

```bash
pnpm run validate
pnpm run test:e2e
```

Expected: React production validation and e2e still pass after Svelte source/test deletion.

## Task 4: Remove Svelte Dependencies, Scripts, And Tooling

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `vite.config.js` or remove Svelte config only if not used by React
- Modify: `eslint.config.js`
- Modify: `vitest.config.js`
- Modify: `scripts/check-no-svelte-style.mjs` or remove script/check if obsolete
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Remove Svelte packages**

Patch `package.json` to remove these dependencies when present:

```json
{
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": null,
    "@testing-library/svelte": null,
    "@tsconfig/svelte": null,
    "eslint-plugin-svelte": null,
    "svelte": null,
    "svelte-check": null
  }
}
```

Expected: actual JSON removes the keys; do not leave `null` values.

- [ ] **Step 2: Remove rollback Svelte scripts**

Patch `package.json` to delete Svelte rollback scripts such as:

```json
{
  "scripts": {
    "build:svelte": null,
    "preview:svelte": null
  }
}
```

Expected: actual JSON removes the keys; `pnpm run build`, `pnpm run preview`, `pnpm run validate`, and React gates remain.

- [ ] **Step 3: Remove Svelte from lint/check commands**

Patch `package.json` so no script references `svelte-check`, `eslint-plugin-svelte`, or Svelte-specific checks:

```json
{
  "scripts": {
    "check": "pnpm run lint && node scripts/check-theme-parity.mjs && node scripts/check-token-usage.mjs && node scripts/check-at-layer.mjs && node scripts/check-style-entry.mjs && node scripts/check-ui-references.mjs && node scripts/check-selector-liveness.mjs && node scripts/check-primitive-token-consumption.mjs && node scripts/check-design-literals.mjs && node scripts/check-no-feature-state.js && pnpm run typecheck:react"
  }
}
```

Expected: final command reflects actual React script names from Wave 17. Remove obsolete Svelte-specific checks only after React equivalents exist.

- [ ] **Step 4: Install lockfile changes without adding dependencies**

Run:

```bash
pnpm install --lockfile-only
```

Expected: `pnpm-lock.yaml` removes unused Svelte packages and does not add unrelated dependencies.

- [ ] **Step 5: Update tooling configs**

Remove Svelte-specific imports/config blocks from `eslint.config.js`, `vite.config.js`, and `vitest.config.js`. Keep React, TypeScript, style, test, and data configs intact.

Expected: `rg -n "svelte|Svelte|@sveltejs|svelte-check|eslint-plugin-svelte" package.json eslint.config.js vite.config.js vitest.config.js` prints no active tooling references.

## Task 5: Preserve Data And Compatibility Contracts

**Files:**
- Preserve: `data/**`
- Preserve: `public/dataset/**`
- Preserve: `public/fonts/**`
- Preserve: `public/icons/**`
- Preserve: `scripts/data/**`
- Modify: docs only if they still describe Svelte ownership

- [ ] **Step 1: Confirm no data/public deletion is staged**

Run:

```bash
git diff --name-status -- data public/dataset public/fonts public/icons scripts/data
```

Expected: no deletions. If any deletion appears, restore it unless a separate data migration spec explicitly owns it.

- [ ] **Step 2: Confirm compatibility dataset paths remain**

Run:

```bash
test -d public/dataset/riwayat
test -d public/dataset/indexes
test -f public/dataset/manifest.json
test -f public/dataset/provenance.json
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run data gate only if data/source files changed**

Run when data/source paths changed:

```bash
pnpm run data -- check
```

Expected: passes. If no data/source paths changed, record `not run - data/source paths preserved` in the inventory.

## Task 6: Docs, Generated Context, Skills, And AGENTS Cleanup

**Files:**
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/style-map.md`
- Modify: `docs/context/module-graph.md` only through docs generation if generated
- Modify: `AGENTS.md`
- Modify: `.agents/skills/quranatlas-workflow/SKILL.md`
- Modify: `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- Modify: `tests/unit/AGENTS.md`
- Modify: `tests/e2e/AGENTS.md`

- [ ] **Step 1: Update tech stack to React-only current stack**

Change `docs/tech-stack.md` so the UI framework and tooling table no longer lists Svelte, Svelte plugin, `svelte-check`, or `@testing-library/svelte` as active tooling. Add:

```markdown
Svelte was removed by Wave `18` after the React production flip soaked successfully. Rollback now relies on git history or the approved tagged release, not retained Svelte source in the working tree.
```

Expected: tech-stack reflects React-only current reality.

- [ ] **Step 2: Update architecture and repo structure**

Replace Svelte boot-flow language with React production boot-flow language. Include:

```markdown
`src-react/` is the production app tree. `src/` is no longer the active app source after Wave `18`; any remaining files under `src/` are framework-neutral runtime only and must be documented as such.
```

Expected: no current-state doc routes ordinary product work to Svelte.

- [ ] **Step 3: Update skills and AGENTS**

Remove rollback-retained Svelte language and route product implementation to React:

```markdown
- React under `src-react/**` is the active app implementation.
- Do not add Svelte source or Svelte-specific tooling.
- Preserve source-data, public dataset, fonts, icons, and compatibility runtime data paths unless a separate data migration spec owns the change.
```

Expected: future agents have React-only routing and data preservation warnings.

- [ ] **Step 4: Regenerate context docs**

Run:

```bash
pnpm run docs
```

Expected: generated module/feature/style inventories remove stale Svelte entries and do not hand-edit auto-generated fences.

## Task 7: Verification, Commit, And Handoff

**Files:**
- All files touched in Tasks 1-6

- [ ] **Step 1: Scan for stale Svelte references**

Run:

```bash
rg -n "Svelte|svelte|@sveltejs|svelte-check|\\.svelte|@testing-library/svelte" package.json pnpm-lock.yaml src src-react tests docs AGENTS.md .agents eslint.config.js vite.config.js vitest.config.js --glob '!docs/superpowers/**'
```

Expected: no active current-state references remain. Historical references are allowed only in `docs/superpowers/specs/**`, `docs/superpowers/plans/**`, release notes, or explicit rollback-history text.

- [ ] **Step 2: Run full validation**

Run:

```bash
pnpm run docs
pnpm run validate
pnpm run validate:react
pnpm run docs:check
git diff --check
```

Expected: full validation passes, generated docs are clean, no whitespace errors.

- [ ] **Step 3: Run data gate if data paths changed**

Run only if `git diff --name-only -- data public/dataset scripts/data` has output:

```bash
pnpm run data -- check
```

Expected: passes. If no data paths changed, do not run.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml src tests eslint.config.js vite.config.js vitest.config.js scripts docs AGENTS.md .agents tests/unit/AGENTS.md tests/e2e/AGENTS.md
git commit -m "chore: remove retained svelte implementation"
```

Expected: commit removes only Svelte-only implementation/tooling/docs and preserves data/public/source contracts. Omit unchanged paths from `git add`.

## Reviewer Checklist

- Wave 17 soak and explicit Wave 18 approval exist.
- Deleted files are listed in the Wave 18 inventory with React owner or rollback-only reason.
- No Svelte source, dependencies, scripts, or active docs remain.
- React validation owns all retained product behavior.
- Data/source catalogs, public dataset assets, fonts, icons, and compatibility runtime paths are preserved.
- Rollback policy no longer depends on retained Svelte source and points to git history or an approved tag.
