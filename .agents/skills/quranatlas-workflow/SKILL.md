---
name: quranatlas-workflow
description: Use when working in QuranAtlas on implementation, refactoring, tests, docs, data contracts, context docs, product-scope cleanup, repo-local skills, or verification planning.
---

# QuranAtlas Workflow

Use this as the default QuranAtlas repo workflow. It routes specialized work, then keeps normal work aligned to surfaces, docs, tests, and product scope.

## Route First

- UI styling, layout, responsive behavior, visual polish, screenshots, or frontend state work: also use `quranatlas-ui-workflow`.
- Explicit audit, health check, readiness review, or structured assessment: use `quranatlas-audit`.
- Library/framework/API/CLI/cloud-service docs: follow root `AGENTS.md` Context7 rules first; return here if repo behavior changes.
- Pure product/workflow docs, context docs, tests, refactors, app behavior, data contracts, or skill maintenance: continue here.

## Required Reads

- Start with `AGENTS.md` and `docs/context/repo-structure.md`.
- For behavior changes, read the owning `docs/context/surfaces/<surface>.md`.
- For cross-cutting changes, read the canonical context doc: `architecture.md`, `data-model.md`, `source-data-flow.md`, or `docs/tech-stack.md`.
- For tests, read `tests/unit/AGENTS.md` or `tests/e2e/AGENTS.md` before placing new coverage.

## Surface Clustering

- Work by surface cluster, not by file or bug. One unit is one surface or a contiguous cluster of surfaces that share source files or invariants.
- Collapse units that share a surface, `src/<feature>/`, event, store, state slice, or invariant.
- A journey spanning surfaces is one unit. Docs and tests land with that unit, not as follow-up work.
- Default to main-session work. Delegate only when surfaces are truly independent and do not share files, selectors, events, stores, or state.
- Active Reader First surfaces are read, navigate, configure, onboard, and infra.
- Mark, review, and listen are removed-scope implementation surfaces. Touch them only for cleanup, regression containment, or source removal; bookmarks remain active navigation/read continuity.
- Use the owning dossier's inventory for the surface to source-file map; regenerate with `pnpm run docs` if stale.

## Core Rules

- Update the owning dossier in the same change when behavior, reach, data ownership, or invariants change.
- Update cross-cutting context docs when their subject changes. Never hand-edit auto-generated fence blocks; run `pnpm run docs`.
- Extend existing unit/e2e files before creating new ones. Default to unit tests; use e2e only for browser-only proof.
- Keep e2e specs under `tests/e2e/<surface>/`; a new top-level e2e folder requires a new surface dossier.
- Do not add scripts for one-off work. Check `package.json`, `docs/tech-stack.md`, and scoped `AGENTS.md` files before choosing commands.

## Verification

- Docs, skills, AGENTS, or generated-context-only changes: `pnpm run docs`, `pnpm run docs:check`, and `git diff --check`.
- Code, shared behavior, config, build, or cross-surface changes: `pnpm run validate`.
- E2E-only changes: run the owning journey spec per `tests/e2e/AGENTS.md`, then broader gates only when shared behavior changed.
- Treat warnings from build, lint, check, or docs checks as failures to resolve.

## Skill Maintenance

When editing repo-local skills, keep `SKILL.md` concise, make frontmatter descriptions trigger-focused, and avoid duplicating canonical docs. Use `references/pressure-prompts.md` to check whether future agents would select the intended workflow.
