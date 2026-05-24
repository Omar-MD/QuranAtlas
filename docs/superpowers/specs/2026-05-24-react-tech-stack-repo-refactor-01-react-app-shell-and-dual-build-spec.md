# React Tech Stack Refactor 01 - React App Shell And Dual Build Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`

## Purpose

Create the isolated React app shell and dual-build scaffolding without changing
the shipped Svelte app, deploy artifact, service-worker scope, or current
validation behavior. This spec establishes the safe coexistence boundary that
later React feature specs must use.

## Current Docs Used

Context7 was used for the React and Vite implementation-sensitive parts of this
spec.

- Command:
  `npx ctx7@latest library Vite "How to configure Vite build outDir, root, publicDir, preview server, and multiple app entries for a React TypeScript app in a dual-build repository?"`
- Selected library id: `/vitejs/vite/v8.0.10`
- Command:
  `npx ctx7@latest docs /vitejs/vite/v8.0.10 "How to configure Vite build outDir, root, publicDir, preview server, and multiple app entries for a React TypeScript app in a dual-build repository?"`
- Current-doc facts used:
  - Vite build output can be isolated with `vite build --outDir <dir>`.
  - Vite config can set a custom project `root`.
  - Vite supports multiple HTML entries through `build.rolldownOptions.input`.
  - Vite preview can be given an explicit port with `vite preview --port <port>`.
- Command:
  `npx ctx7@latest library React "How should a React TypeScript browser app bootstrap, create a root, render providers, and cleanly mount in a Vite app?"`
- Selected library id: `/reactjs/react.dev`
- Command:
  `npx ctx7@latest docs /reactjs/react.dev "How should a React TypeScript browser app bootstrap, create a root, render providers, and cleanly mount in a Vite app?"`
- Current-doc facts used:
  - React browser apps mount by creating a root with `createRoot(...)` from
    `react-dom/client`.
  - The root renders the app tree with `root.render(...)`.
  - The mounted root can be torn down with `root.unmount()`.
  - React docs show Vite's `react-ts` template as a supported React TypeScript
    starting point.

Implementation plans may use these React bootstrap facts, but must re-check the
React docs if the selected React package version differs from the current docs
recorded here.

## Scope

In scope:

- Create `src-react/` as an isolated future app tree.
- Create a minimal React app shell directory structure.
- Add a React-specific Vite config path or config mode that builds to
  `dist-react/`.
- Add non-deploy React scripts such as `dev:react`, `build:react`, and
  `preview:react`.
- Reserve an isolated preview port for React.
- Establish a framework-neutral runtime-sharing rule, even if no shared runtime
  extraction happens in this child spec.
- Add docs explaining that current `pnpm run build -> dist/` remains the only
  deployable artifact.

Out of scope:

- Replacing the production entry.
- Changing `pnpm run dev`, `pnpm run build`, `pnpm run preview`, or
  `pnpm run validate` behavior.
- Feeding `dist-react/` to CI deploy jobs.
- Adding React feature surfaces beyond a minimal shell.
- Adding service-worker runtime behavior for React.
- Sharing Svelte modules with React or React modules with Svelte.
- Moving tests into `src-react/test/`.

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/tech-stack.md`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- Parent master spec
- Child spec `00` decision appendix entries for React and Vite

## Allowed Files And Directories

Allowed create:

- `src-react/**`
- React-specific config files if they do not replace shipped Svelte config
- React-specific test setup files only if they route coverage under `tests/`
- Docs under `docs/superpowers/specs/` or relevant context docs

Allowed modify:

- `package.json` for non-deploy React scripts and dev dependencies only after
  Context7 verification and child-spec rationale.
- `docs/tech-stack.md` when scripts, dev tools, pinned versions, or CI gates
  change.
- `docs/context/repo-structure.md` when `src-react/` is added.
- `docs/context/architecture.md` when the dual-app architecture is introduced.
- Root `AGENTS.md` only to route future React work after the new tree exists.

Forbidden modify:

- Existing Svelte source behavior.
- Existing Svelte build output path `dist/`.
- Existing deploy workflow artifact routing.
- Existing service-worker scope or cache names for the shipped app.
- `public/dataset/**` unless a later data/offline child spec explicitly owns it.

## Architecture Contract

The dual-build period has two app trees:

- Shipped Svelte app: `src/**`, `pnpm run build`, output `dist/`.
- Future React app: `src-react/**`, non-deploy scripts, output `dist-react/`.

React must have a separate Vite build path. The config may use either a dedicated
config file or a mode/env branch, but it must be obvious from scripts and docs
which path is non-deploy. The React preview server must use a port that does not
collide with the Svelte preview server.

React and Svelte must not import each other. Any shared runtime code must first
move into a framework-neutral location with typed interfaces, docs updates, and
tests proving both app trees can consume it without importing user-facing
surfaces.

## Deliverables

- `src-react/` exists with a minimal app shell and clearly named subdirectories.
- Non-deploy React scripts exist and build into `dist-react/`.
- Current Svelte scripts remain behaviorally unchanged.
- Docs identify `dist/` as the only deployable artifact until cutover.
- Docs identify `dist-react/` as local/CI proof only until cutover.
- React test placement follows `tests/unit/**` and `tests/e2e/<surface>/**`.
- No React service worker, cache, or deploy path collides with Svelte.

## Acceptance Criteria

- Running the existing Svelte build path still produces `dist/`.
- Running the React build path produces `dist-react/`.
- Existing deploy workflow still consumes only `dist/`.
- `git diff` shows no React import from `src/**` Svelte modules and no Svelte
  import from `src-react/**`.
- Any new package, script, or CI gate is reflected in `docs/tech-stack.md`.
- Any new repo shape is reflected in `docs/context/repo-structure.md`.
- Generated context docs are up to date if doc generation touches inventories.

## Verification

Run the smallest proof commands that match the implementation:

```bash
pnpm run build
pnpm run build:react
pnpm run docs:check
git diff --check
```

If package scripts, Vite config, TypeScript config, lint config, or build
tooling changed, also run:

```bash
pnpm run check
```

Expected result:

- Existing `pnpm run build` still succeeds and writes `dist/`.
- React build succeeds and writes `dist-react/`.
- `pnpm run docs:check` reports `derive: all clean`.
- `git diff --check` exits with no whitespace errors.

## Rollback And Failure Handling

- If React config breaks the Svelte build, revert the React config and scripts
  before proceeding.
- If React output writes into `dist/`, treat it as a blocker and correct the
  output path before any other work.
- If a package install changes lockfile or scripts, verify `docs/tech-stack.md`
  in the same change.
- If a shared runtime extraction is needed, stop this spec and create a narrower
  extraction spec with explicit imports and tests.

## Handoff

Child spec `02 Svelte Reference Baseline` can run after this spec if existing
Svelte routes and scripts remain stable. Child spec `03 Tokens And Tailwind v4
Design System` may use the React app shell but must fetch Tailwind CSS v4 docs
through Context7 before locking implementation details.
