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

**Surface-level and data-level invariants live in the relevant context doc**, not in the rules below. Before making any change, read the context doc for the surface you're touching (per Rule 4) — that's where load-bearing design decisions and "do-not-regress" callouts live. Look for sections labelled **Invariant** in `user-journeys.md` and `data-model.md`. Examples: mark editor as sole per-verse action surface (`user-journeys.md` §C6), one writer per IDB store (`data-model.md` §Cross-cutting rules).

## Mandatory rules

### Rule 1 — Update `user-journeys.md` with every UI change

**Any change that alters user-facing behavior must update `docs/context/user-journeys.md` in the same commit.** This includes:

- New surfaces, screens, sheets, or dialogs.
- Renamed or moved buttons/CTAs, reordered screens, altered flow steps.
- New keyboard shortcuts or gestures.
- Changes to where a surface is reached from (e.g. "Settings moved out of More sheet").
- Deletions of any of the above — move the journey to the **Deprecated** section with the commit SHA; don't silently delete.

If a change alters anything a user can see or do, it's too small to skip `user-journeys.md` — and if it's too small to document there, it's too small to ship as user-facing behavior. **Internal refactors, build tooling, type-only changes, and doc-only commits do not require a `user-journeys.md` update**, but they still fall under Rule 2 for whichever context doc they touch. Journeys drift faster than any other doc; keeping them honest is the only reason they stay useful.

Keep steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, and hover states. Those belong in specs, not context docs.

### Rule 2 — Update the relevant context doc when its subject changes

- Changed an IDB store, key, index, or record shape → update `data-model.md`.
- Added/removed/rewired an event → update `events.md`.
- Added/moved/deleted a module or crossed a new dependency boundary → update `module-graph.md`.
- Added a new route or surface → update `feature-map.md` (and `user-journeys.md` if the surface is reachable end-to-end).
- Changed boot flow, router behavior, or a cross-cutting pattern → update `architecture.md`.
- Changed a `package.json` script, added/removed/upgraded a dev tool, bumped a pinned version, or changed a CI gate → update `docs/tech-stack.md`.
- Added, removed, or meaningfully redesigned a user-facing feature; changed the "What's NOT included" scope; changed attribution strings — update `docs/product-info.md` (and the About page text if attribution changed).
- **Renamed/moved/deleted a file or directory referenced by name in `CLAUDE.md`, `docs/workflow/*.md`, `docs/tech-stack.md`, or any `docs/context/*.md`** → update every cite in the same commit. File-path citations rot the fastest; the PR that moves the file owns the doc churn.

### Rule 3 — Local-first for context retrieval

**Why:** this is a single-developer project. Feature branches, worktrees, uncommitted changes, and unpushed commits all live on this machine. The remote holds `main` and runs CI — it is never ahead of local for any active work, and it has no feature branches to consult.

**Consequence:** for any "why", "what changed recently", "what's this branch for", "what's in progress" question, the remote has nothing local doesn't — and is often behind. Use only local sources:

- `git log`, `git show`, `git diff`, `git blame`, `git status`, the working tree, untracked files.
- Everything under `docs/` (especially `docs/context/`).

**Do not use for context:** `gh issue …`, `gh pr …`, `gh api`, `git fetch`, `git log origin/*`. These are slower than local here and can mislead (local is authoritative).

**Carve-outs:** explicit user asks ("look at PR #42", "check CI on main") override. Write operations (`git push`, `gh pr create`) are neither context-gathering nor blocked.

### Rule 4 — Cluster work by surface

Before writing a plan, dispatching subagents, or adding Playwright specs, read **`docs/workflow/cluster-by-surface.md`**. It defines the surface model, planning / subagent / testing / verification rules, the red-flag checklist, the cross-cutting-exceptions table, and the "one unit or two?" decision tree.

**TL;DR:** the unit of work is a surface or a contiguous cluster of surfaces — never a bug, never a file. Parallel subagents = distinct surfaces only. Extend the owning `tests/e2e/journey-X-*.spec.js` rather than creating new specs. **The playbook is canonical** — if this summary ever disagrees with it, the playbook wins.

### Rule 5 — Default PR target is `dev`

**All feature work, bug fixes, refactors, and any code-level change PRs into `dev` unless I explicitly say otherwise.** Branches on the remote:

- `dev` → deploys to `dev.quranatlas.org` on push/merge.
- `staging` → deploys to `staging.quranatlas.org`; receives merge commits from `dev` via PR only.
- `main` → deploys to `quranatlas.org`; receives merge commits from `staging` via PR only.

Flow: feature branch → PR → `dev` → (promote) → PR `dev → staging` → (promote) → PR `staging → main`. Merge commits only (no squash, no rebase). The three env branches are protected from deletion and force-push; feature branches auto-delete on merge.

**Only target `staging` or `main` directly if I ask for a hotfix, a promotion PR, or explicitly name the branch.** Default everywhere else: `dev`. When using `gh pr create`, pass `--base dev` unless the instruction contradicts it.

## Workflow

Scripts, tooling, and stack references: see `docs/tech-stack.md`.
