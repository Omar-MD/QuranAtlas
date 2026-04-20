# CLAUDE.md — project instructions

Project rules auto-loaded by Claude Code in this repo.

## Context docs

Read before spelunking code — save first 30min grep:

- **`docs/context/architecture.md`** — stack, boot flow, router, events, IDB, cross-cutting patterns.
- **`docs/context/feature-map.md`** — every user-facing surface: entry, route, files, behavior.
- **`docs/context/module-graph.md`** — per-dir imports-from / imported-by, mermaid graph.
- **`docs/context/events.md`** — mitt event catalog: emitters, listeners, payloads, dead events.
- **`docs/context/data-model.md`** — IDB stores, keys, indexes, record shapes, writers.
- **`docs/context/user-journeys.md`** — cross-surface happy paths user can walk.

Context doc disagree with code → code win. Update doc in PR.

**Surface + data invariants live in relevant context doc**, not rules below. Before change, read context doc for surface touched (Rule 4) — load-bearing decisions + "do-not-regress" callouts there. Look for **Invariant** sections in `user-journeys.md` and `data-model.md`. Examples: mark editor sole per-verse action surface (`user-journeys.md` §C6), one writer per IDB store (`data-model.md` §Cross-cutting rules).

## Mandatory rules

### Rule 1 — Update `user-journeys.md` with every UI change

**Any change altering user-facing behavior must update `docs/context/user-journeys.md` in same commit.** Includes:

- New surfaces, screens, sheets, dialogs.
- Renamed/moved buttons/CTAs, reordered screens, altered flow steps.
- New keyboard shortcuts or gestures.
- Changes to where surface reached from (e.g. "Settings moved out of More sheet").
- Deletions of above — move journey to **Deprecated** section with commit SHA; no silent delete.

Change alter anything user see or do → too small to skip `user-journeys.md`. Too small to doc there → too small to ship user-facing. **Internal refactors, build tooling, type-only changes, doc-only commits skip `user-journeys.md` update**, still fall under Rule 2 for context doc touched. Journeys drift fastest; honesty = only reason stay useful.

Keep steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, hover states. Those belong in specs.

### Rule 2 — Update the relevant context doc when its subject changes

- Changed IDB store, key, index, record shape → update `data-model.md`.
- Added/removed/rewired event → update `events.md`.
- Added/moved/deleted module or crossed new dep boundary → update `module-graph.md`.
- Added new route or surface → update `feature-map.md` (and `user-journeys.md` if surface reachable end-to-end).
- Changed boot flow, router behavior, cross-cutting pattern → update `architecture.md`.
- Changed `package.json` script, added/removed/upgraded dev tool, bumped pinned version, changed CI gate → update `docs/tech-stack.md`.
- Added, removed, redesigned user-facing feature; changed "What's NOT included" scope; changed attribution strings — update `docs/product-info.md` (and About page text if attribution changed).
- **Renamed/moved/deleted file or dir cited by name in `CLAUDE.md`, `docs/workflow/*.md`, `docs/tech-stack.md`, any `docs/context/*.md`** → update every cite same commit. File-path cites rot fastest; PR moving file owns doc churn.

### Rule 3 — Local-first for context retrieval

**Why:** single-dev project. Feature branches, worktrees, uncommitted changes, unpushed commits all live this machine. Remote hold `main` + run CI — never ahead of local for active work, no feature branches to consult.

**Consequence:** "why", "what changed recently", "what's this branch for", "what's in progress" — remote have nothing local don't, often behind. Use local only:

- `git log`, `git show`, `git diff`, `git blame`, `git status`, working tree, untracked files.
- Everything under `docs/` (especially `docs/context/`).

**No use for context:** `gh issue …`, `gh pr …`, `gh api`, `git fetch`, `git log origin/*`. Slower than local, mislead (local authoritative).

**Carve-outs:** explicit user ask ("look at PR #42", "check CI on main") override. Write ops (`git push`, `gh pr create`) neither context-gathering nor blocked.

### Rule 4 — Cluster work by surface

Before plan, dispatch subagents, add Playwright specs, read **`docs/workflow/cluster-by-surface.md`**. Defines surface model, planning/subagent/testing/verification rules, red-flag checklist, cross-cutting-exceptions table, "one unit or two?" decision tree.

**TL;DR:** unit of work = surface or contiguous cluster of surfaces — never bug, never file. Parallel subagents = distinct surfaces only. Extend owning `tests/e2e/journey-X-*.spec.js` rather than create new specs. **Playbook canonical** — summary disagree with it → playbook win.

### Rule 5 — Default PR target is `dev`

**All feature work, bug fixes, refactors, code-level PRs → `dev` unless I say otherwise.** Remote branches:

- `dev` → deploys `dev.quranatlas.org` on push/merge.
- `staging` → deploys `staging.quranatlas.org`; receives merge commits from `dev` via PR only.
- `main` → deploys `quranatlas.org`; receives merge commits from `staging` via PR only.

Flow: feature branch → PR → `dev` → (promote) → PR `dev → staging` → (promote) → PR `staging → main`. Merge commits only (no squash, no rebase). Three env branches protected from deletion + force-push; feature branches auto-delete on merge.

**Target `staging` or `main` direct only if I ask hotfix, promotion PR, or name branch.** Default elsewhere: `dev`. Using `gh pr create`, pass `--base dev` unless instruction contradicts.

## Workflow

Scripts, tooling, stack refs: see `docs/tech-stack.md`.