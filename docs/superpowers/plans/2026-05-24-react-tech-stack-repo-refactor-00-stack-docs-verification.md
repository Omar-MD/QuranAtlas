# React Tech Stack Refactor 00 - Stack And Docs Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify and record current official documentation for the React rebuild stack decisions before implementation specs lock API, CLI, or config details.

**Architecture:** This is a docs-only blocker plan. It updates only the Wave 1 docs/spec decision record, leaves package/source/build behavior untouched, and uses Context7 first for every implementation-sensitive library or service.

**Tech Stack:** Markdown, Context7 CLI (`npx ctx7@latest`), pnpm docs checks, git diff checks.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/tech-stack.md`
- `docs/product-info.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`

## File Structure

Modify only as needed:

- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md` - decision appendix for verified library docs.
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md` - only if current docs invalidate a master decision.
- Wave child specs under `docs/superpowers/specs/` - only to correct direct conflicts discovered by docs verification.

Do not modify:

- `package.json`
- `pnpm-lock.yaml`
- `src/**`
- `src-react/**`
- `public/dataset/**`
- generated context fences by hand

## Task 1: Preflight And Boundaries

**Files:**
- Read: files listed in Required Context

- [ ] **Step 1: Confirm working tree ownership**

Run:

```bash
git status --short --branch
```

Expected: note any dirty files. Do not revert or overwrite unrelated edits. If the spec file is already modified, inspect the relevant sections and append/update only the decision appendix entries this plan owns.

- [ ] **Step 2: Confirm no implementation files are in scope**

Run:

```bash
git diff --name-only -- package.json pnpm-lock.yaml src src-react public/dataset
```

Expected: either no output or pre-existing unrelated paths that are not touched by this plan.

## Task 2: Run Context7 Verification Matrix

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`

- [ ] **Step 1: Verify React**

Run outside the default Codex sandbox:

```bash
npx ctx7@latest library React "How should a React TypeScript browser app bootstrap, create a root, render providers, and cleanly mount in a Vite app?"
npx ctx7@latest docs /reactjs/react.dev "How should a React TypeScript browser app bootstrap, create a root, render providers, and cleanly mount in a Vite app?"
```

Expected: Context7 returns the official React docs result. Record library id, selected version/current docs, query, retrieval date, facts about `createRoot`, `root.render`, provider composition, `StrictMode`, and `root.unmount`.

- [ ] **Step 2: Verify Vite**

Run outside the default Codex sandbox:

```bash
npx ctx7@latest library Vite "How should Vite configure dev, build, preview, root, public assets, output directories, and multiple app entries in a dual-build repository?"
npx ctx7@latest docs /vitejs/vite/v8.0.10 "How should Vite configure dev, build, preview, root, public assets, output directories, and multiple app entries in a dual-build repository?"
```

Expected: record facts for `root`, `publicDir`, `build.outDir`, build input configuration, and explicit preview ports. If Context7 suggests a different Vite id/version, use the best matching version for installed `vite` and record why.

- [ ] **Step 3: Verify PWA and Workbox**

Run outside the default Codex sandbox:

```bash
npx ctx7@latest library "vite-plugin-pwa" "How should vite-plugin-pwa and Workbox configure a Vite PWA app shell precache, runtime caches, update flow, service-worker scope, injectManifest, and avoid precaching all content assets?"
npx ctx7@latest docs /vite-pwa/vite-plugin-pwa "How should vite-plugin-pwa and Workbox configure a Vite PWA app shell precache, runtime caches, update flow, service-worker scope, injectManifest, and avoid precaching all content assets?"
npx ctx7@latest docs /googlechrome/workbox "How should Workbox configure app shell precache, navigation routes, runtime caches, cache expiration, and cleanup without precaching all content assets?"
```

Expected: record `injectManifest`, precache glob, update registration, service-worker scope, runtime route, cache strategy, expiration, and cleanup facts. This task uses the allowed maximum of three commands.

- [ ] **Step 4: Verify styling and component authoring libraries**

Run these as separate library/docs pairs, outside the default sandbox:

```bash
npx ctx7@latest library "Tailwind CSS" "How should Tailwind CSS v4 be configured for a React Vite app with project-owned semantic CSS variables, theme tokens, and static checks that prevent palette and arbitrary value drift?"
npx ctx7@latest docs /tailwindlabs/tailwindcss.com "How should Tailwind CSS v4 be configured for a React Vite app with project-owned semantic CSS variables, theme tokens, and static checks that prevent palette and arbitrary value drift?"
npx ctx7@latest library "Radix UI" "How should Radix UI React primitives such as Dialog, Popover, Dropdown Menu, Tabs, Tooltip, Switch, Slider, and focus-sensitive components be wrapped while preserving accessibility behavior?"
npx ctx7@latest docs /websites/radix-ui_primitives "How should Radix UI React primitives such as Dialog, Popover, Dropdown Menu, Tabs, Tooltip, Switch, Slider, and focus-sensitive components be wrapped while preserving accessibility behavior?"
npx ctx7@latest library "shadcn/ui" "What is the current copied-owned component workflow, registry contract, and customization guidance?"
npx ctx7@latest docs /websites/ui_shadcn "What is the current copied-owned component workflow, registry contract, and customization guidance?"
npx ctx7@latest library "class-variance-authority" "How should typed component variants be modeled and composed with Tailwind class output?"
npx ctx7@latest docs /joe-bell/cva "How should typed component variants be modeled and composed with Tailwind class output?"
```

Expected: record Tailwind v4 Vite integration and `@theme` facts, Radix wrapper/ref/accessibility facts, shadcn copied-owned registry facts, and CVA variant typing facts.

- [ ] **Step 5: Verify data, test, and proof libraries**

Run these as separate library/docs pairs, outside the default sandbox:

```bash
npx ctx7@latest library "TanStack Virtual" "How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?"
npx ctx7@latest docs /tanstack/virtual "How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?"
npx ctx7@latest library Dexie "How should Dexie open and use an existing IndexedDB database without unsafe schema migration during a dual-app period?"
npx ctx7@latest docs /websites/dexie "How should Dexie open and use an existing IndexedDB database without unsafe schema migration during a dual-app period?"
npx ctx7@latest library Storybook "How should Storybook be configured for a React Vite TypeScript app with interaction tests, accessibility checks, viewport/theme coverage, and CI test commands?"
npx ctx7@latest docs /storybookjs/storybook/v10.2.9 "How should Storybook be configured for a React Vite TypeScript app with interaction tests, accessibility checks, viewport/theme coverage, and CI test commands?"
npx ctx7@latest library Playwright "How should Playwright cover app routes, service workers, screenshots, accessibility, storage state, and multiple viewports?"
npx ctx7@latest docs /websites/playwright_dev "How should Playwright cover app routes, service workers, screenshots, accessibility, storage state, and multiple viewports?"
```

Expected: record virtualization measurement facts, Dexie existing-schema cautions, Storybook React/Vite/test/a11y facts, and Playwright route/SW/screenshot/storage-state facts. If any `library` command returns a better current id than the example docs id, use that id and record why.

- [ ] **Step 6: Verify visual regression candidates**

Run Context7 for each shortlisted candidate before scoring:

```bash
npx ctx7@latest library Chromatic "How does Chromatic handle Storybook visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
npx ctx7@latest library Percy "How does Percy handle Storybook or Playwright visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
npx ctx7@latest library Argos "How does Argos visual testing handle Playwright or Storybook screenshots, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
npx ctx7@latest library Loki "How does Loki handle Storybook screenshot visual regression, deterministic assets, baseline updates, CI gating, and local reproduction?"
```

For each library command, pick the best returned `/org/project` id and immediately run the matching docs command with the same query, for example:

```bash
npx ctx7@latest docs /org/project "How does Chromatic handle Storybook visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
```

Expected: record coverage for each candidate that Context7 can resolve. If a provider has no Context7 coverage after the library command, record the failure and the official-doc fallback source used by the later provider-selection plan.

## Task 3: Update Decision Appendix

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`

- [ ] **Step 1: Add one appendix section per technology**

Use this exact field shape for every entry, with real values from the commands:

```markdown
### React

- Context7 library id: `/reactjs/react.dev`
- Version selected: current official docs
- Query: `How should a React TypeScript browser app bootstrap, create a root, render providers, and cleanly mount in a Vite app?`
- Retrieved: `2026-05-24`
- Relevant current-doc facts:
  - React browser apps create a root with `createRoot(container)` and render the provider tree through that root.
- QuranAtlas decision: React bootstrap may use `createRoot`, `StrictMode`, provider composition, and root unmounting inside the isolated React entry.
- Follow-up child specs: `01`, `04`, `10`, `13`, `17`
```

Expected: every technology from the matrix has an entry. Do not paste large external-doc excerpts.

- [ ] **Step 2: Record failures without fallback shortcuts**

For quota failures, add:

```markdown
- Retrieved: blocked by Context7 quota on `2026-05-24`.
- Relevant current-doc facts: not recorded.
- QuranAtlas decision: implementation for this technology remains blocked until `npx ctx7@latest login` or `CONTEXT7_API_KEY` is available.
```

Expected: quota-blocked entries stop implementation-sensitive decisions. DNS or fetch failures are retried outside the sandbox once before fallback.

## Task 4: Reconcile Conflicts

**Files:**
- Modify only if needed: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Modify only if needed: affected Wave child specs under `docs/superpowers/specs/`

- [ ] **Step 1: Search for direct contradictions**

Run:

```bash
rg -n "React|Vite|vite-plugin-pwa|Workbox|Tailwind|Radix|shadcn|class-variance-authority|TanStack Virtual|Dexie|Storybook|Playwright|Chromatic|Percy|Argos|Loki" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-*.md
```

Expected: identify only statements contradicted by current docs, not preferences that are merely stricter QuranAtlas rules.

- [ ] **Step 2: Patch contradicted spec text with current-state rationale**

When a contradiction exists, change the affected sentence and add a concise rationale to the relevant appendix entry:

Document the real technology and constraint in the edited appendix entry, for example: `QuranAtlas decision: updated from the prior spec wording because current Vite docs require public assets to be isolated through an explicit public directory when a custom root is used.`

Expected: master and child specs agree after the edit.

## Task 5: Verification, Commit, And Handoff

**Files:**
- Verify: all modified docs

- [ ] **Step 1: Run docs-only checks**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: `pnpm run docs:check` reports clean generated docs, and `git diff --check` exits with no whitespace errors.

- [ ] **Step 2: Review final diff scope**

Run:

```bash
git diff --name-only
```

Expected: only allowed docs/spec files are modified. No source, package, lockfile, generated dataset, or `src-react/**` changes appear.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md docs/superpowers/specs
git commit -m "docs: verify react rebuild stack decisions"
```

Expected: commit succeeds. If only the 00 spec changed, stage only that file. Do not push.

- [ ] **Step 4: Handoff notes**

Record in the implementation handoff:

```text
Verified docs entries completed: React, Vite, vite-plugin-pwa, Workbox, Tailwind CSS v4, Radix UI, shadcn/ui, class-variance-authority, TanStack Virtual, Dexie, Storybook, Playwright, and visual-regression candidates that resolved through Context7.
Blocked entries: list each technology and exact Context7 failure; write "none" only when every required entry was retrieved.
Spec conflicts patched: list each file and section; write "none" only when no conflicts were found.
Verification:
- pnpm run docs:check
- git diff --check
```

Expected: child spec 01 implementer can rely on the React and Vite entries without re-fetching unless package versions differ.
