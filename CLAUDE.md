# CLAUDE.md — project instructions

Project-level rules loaded automatically by Claude Code when working in this repo.

## Context docs

Read these before spelunking the codebase — they're designed to save you the first 30 minutes of grepping:

- **`docs/context/architecture.md`** — stack, boot flow, router, events, IDB, cross-cutting patterns.
- **`docs/context/feature-map.md`** — every user-facing surface with entry, route, files, behavior.
- **`docs/context/module-graph.md`** — per-directory imports-from / imported-by, mermaid graph.
- **`docs/context/events.md`** — mitt event catalog: emitters, listeners, payloads, dead events.
- **`docs/context/data-model.md`** — IDB stores, keys, indexes, record shapes, writers.
- **`docs/context/user-journeys.md`** — cross-surface happy paths a user can actually walk.

When a context doc disagrees with the code, the code wins — and you should update the doc in your PR.

## Mandatory rules

### Rule 1 — Update `user-journeys.md` with every UI change

**Any change that alters user-facing behavior must update `docs/context/user-journeys.md` in the same commit.** This includes:

- New surfaces, screens, sheets, or dialogs.
- Renamed or moved buttons/CTAs, reordered screens, altered flow steps.
- New keyboard shortcuts or gestures.
- Changes to where a surface is reached from (e.g. "Settings moved out of More sheet").
- Deletions of any of the above — move the journey to the **Deprecated** section with the commit SHA; don't silently delete.

If the change is too small to document, it's also too small to make. Journeys drift faster than any other doc; keeping them honest is the only reason they stay useful.

Keep steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, and hover states. Those belong in specs, not context docs.

### Rule 2 — Update the relevant context doc when its subject changes

- Changed an IDB store, key, index, or record shape → update `data-model.md`.
- Added/removed/rewired an event → update `events.md`.
- Added/moved/deleted a module or crossed a new dependency boundary → update `module-graph.md`.
- Added a new route or surface → update `feature-map.md` (and `user-journeys.md` if the surface is reachable end-to-end).
- Changed boot flow, router behavior, or a cross-cutting pattern → update `architecture.md`.

### Rule 3 — Local-only for context, history, and decisions

When looking up project context — recent work, commit history, prior decisions, "why was X built this way," "what changed recently," issue background — use **only local sources**:

- `git log`, `git show`, `git diff`, `git blame`, `git status`, the working tree, untracked files.
- Everything under `docs/` (especially `docs/context/`).

**Do NOT use for context:** `gh issue …`, `gh pr …`, `gh api`, `git fetch`, `git log origin/*`, or any other command that reaches GitHub or a remote. The remote's only jobs are hosting code (pushes) and running CI — it is not a source of truth for product context, history, or decisions.

This rule governs **context gathering**, not all remote access. Explicit requests like "create a PR" or "push this commit" still go through — they write, they don't fetch context.

If a user explicitly asks you to check a remote issue or PR (e.g. "look at PR #42"), that user request overrides this rule. Default behavior is local-only.

### Rule 4 — Long-press = mark editor only

The single verse gesture is long-press → open mark editor. No contextual menu, no multi-action sheet, no preview popover. This is cross-cutting; don't reintroduce alternatives.

### Rule 5 — One writer per IDB store (except `settings`)

- `marks` — written only via `marks/store.js`. Never `put('marks', …)` directly.
- `positions` — written by `reader/index.js` and `review/state.js`.
- `activationState` / `datasetMeta` — written by `data/offline.js` (client) or `offline/dataset-updater.js` (SW).
- `settings` is the shared scratchpad; convention is each feature owns its own keys, namespaced.

Bypassing `marks/store.js` breaks cross-tab broadcast and the `MARKS_SAVED` / `MARKS_DELETED` event contracts.

## Workflow

- Package manager: **pnpm** (pinned via `packageManager` in `package.json`).
- Tests: `pnpm run test:run` (Vitest + jsdom + `fake-indexeddb/auto`). `npx vitest run` also works.
- Build: `pnpm run build`.
- Lint: `pnpm run lint`.
- Chunk budget: `pnpm run check-chunks`.
- See `docs/tech-stack.md` for the full script list.
- Do not commit unless the user asks.
