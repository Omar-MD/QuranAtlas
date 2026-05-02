# AGENTS.md — project instructions

Project instructions auto-loaded by Codex in this repo.

Repo-local Codex skills live in `.agents/skills/`.
Scoped instructions live closer to the work:

- `tests/e2e/AGENTS.md` — Playwright placement and performance rules
- `tests/unit/AGENTS.md` — unit-test defaults and component-test guidance

## Context docs

Read these before changing behavior:

- `docs/context/surfaces/<surface>.md` — owning dossier for a user-visible surface
- `docs/context/architecture.md` — boot flow, router, init graph, cross-cutting patterns
- `docs/context/data-model.md` — store ownership, sole-writer rules, data invariants
- `docs/context/events.md` — generated emit/listen catalog
- `docs/context/module-graph.md` — generated dependency graph
- `docs/context/feature-map.md` — generated dossier index
- `docs/context/glossary.md` — shared vocabulary
- `docs/context/riwayat-dataset.md` — dataset and font constraints
- `docs/context/csp-allowlist.md` — outbound-origin policy
- `docs/context/implemented.md` — shipped surface inventory
- `docs/context/roadmap.md` — deferred scope
- `docs/context/open-issues.md` — known bugs and blocking debt

If docs and code disagree, code wins. Update the docs in the same change.

Auto-generated fence blocks (`<!-- AUTO-GENERATED:* START --> ... END`) are owned by `scripts/docs/derive-*.mjs`. Do not hand-edit them; rerun `pnpm docs:derive`.

Surface and data invariants live in the owning dossier, not in this root file.

## Rules

### 1. Update the owning surface dossier with every UI change

Any change that alters user-visible behavior must update the matching `docs/context/surfaces/<surface>.md` in the same change.

Update:

- `Behavior` for changed flows, controls, shortcuts, and gestures
- `Reach` for changed entry points or navigation paths
- `Invariants` for new load-bearing guardrails

Keep behavior steps surface-level. Do not document pixel trivia, hover states, or animation timing there.

Internal refactors, tooling changes, type-only edits, and docs-only edits can skip behavior updates, but still fall under rule 2 if they change a context doc's subject.

### 2. Update the relevant context doc when its subject changes

- Data-store ownership, shape, keyPath, indexes, or sole-writer rules: update the owning dossier `Data` section and `docs/context/data-model.md` when cross-cutting.
- Event wiring or module-graph changes: rerun `pnpm docs:derive`; no manual edit to generated inventories.
- Route, surface, boot-flow, router, DAG, or cross-cutting behavior changes: update the owning dossier and/or `docs/context/architecture.md`.
- Script, toolchain, pinned-version, or CI-gate changes: update `docs/tech-stack.md`.
- User-facing feature scope or attribution changes: update `docs/product-info.md`.
- Future agreed scope goes in `docs/context/roadmap.md`.
- Known bugs or blocking debt go in `docs/context/open-issues.md` and are removed when fixed.

### 3. Use local sources first for repo state and history

For questions about this repo's current state, history, or in-progress work, prefer local sources:

- `git status`, `git diff`, `git show`, `git log`, `git blame`
- the working tree, untracked files, and everything under `docs/`

Do not treat GitHub remote state as authoritative for active local work unless the task explicitly asks for PRs, CI, remote branches, or hosted metadata.

### 4. Cluster work by surface

Use the user-visible surface as the default unit of work. Before splitting work, adding Playwright specs, or delegating by area, read `docs/workflow/cluster-by-surface.md`.

Default shape:

- one unit of work = one surface or contiguous surface cluster
- extend the owning journey spec instead of spawning a new e2e spec file when the surface already has one
- fold dossier updates into the same unit, not a follow-up task

### 5. Safe git defaults

Unless the user explicitly asks otherwise:

- do not push
- do not open a PR
- do not merge

If the user asks for a PR and does not name a base branch, use `dev`.

`dev` is the default integration branch for ordinary code changes. `staging` and `main` are promotion or hotfix targets only when explicitly requested.

### 6. Verify at the right level

Before finishing, run the smallest verification set that matches the change:

- Docs / AGENTS / generated-context changes: `pnpm docs:derive` and `pnpm docs:check`
- Code, shared behavior, build, or config changes: `pnpm validate`
- E2E-only work: follow `tests/e2e/AGENTS.md` for targeted timing and placement rules, then run broader verification when shared behavior changed

Any warning from `pnpm build`, `pnpm lint`, or `pnpm check` is treated as a failure to fix, not noise to ignore.

### 7. Docs and source comments describe current state only

Do not leave revision logs, dates, commit SHAs, codenames, or progress notes in `docs/` or source comments.

Put change narrative in the commit message. Put temporary working notes in `.scratch/` and do not commit them.

Carve-outs:

- historical wording inside an invariant is allowed when the past shape is itself load-bearing
- auto-generated fence blocks are exempt
- machine-emitted data files can contain dates as data

## Workflow

Scripts, tooling, and stack details live in `docs/tech-stack.md`.
