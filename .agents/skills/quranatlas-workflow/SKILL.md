---
name: quranatlas-workflow
description: Use when working in QuranAtlas on implementation, refactoring, tests, docs, data contracts, context docs, product-scope cleanup, repo-local skills, or verification planning.
---

# QuranAtlas Workflow

Use this as the default QuranAtlas repo workflow. It routes specialized work, then keeps normal work aligned to surfaces, docs, tests, and product scope.

## Route First

- UI styling, layout, responsive behavior, visual polish, screenshots, or frontend state work: also use `quranatlas-ui-workflow`.
- Explicit product/codebase audit, health check, readiness review, or deploy-readiness assessment: use `quranatlas-audit`.
- Library/framework/API/CLI/cloud-service docs: follow the inherited Context7/`ctx7` docs workflow first (`library` then `docs`); return here if repo behavior changes.
- Pure product/workflow docs, context docs, tests, refactors, app behavior, data contracts, or skill maintenance: continue here.

## Required Reads

- Start with `AGENTS.md` and `docs/context/repo-structure.md`.
- For behavior changes, read the owning `docs/context/surfaces/<surface>.md`.
- For visual or selector ownership changes, also read `docs/context/style-map.md`.
- For cross-cutting changes, read the canonical context doc: `architecture.md`, `data-model.md`, `source-data-flow.md`, or `docs/tech-stack.md`.
- For product scope, attribution, shipped/future/deferred scope, or known bugs/blocking debt, read and update `docs/product-info.md`, `docs/context/implemented.md`, `docs/context/future.md`, `docs/context/roadmap.md`, or `docs/context/open-issues.md` as applicable.
- Only add, move, or materially change tests when the user explicitly asks for test coverage. When asked, read `tests/unit/AGENTS.md` or `tests/e2e/AGENTS.md` before placing coverage.

## Surface Clustering

- Work by surface cluster, not by file or bug. One unit is one surface or a contiguous cluster of surfaces that share source files or invariants.
- Collapse units that share a surface, `src/<feature>/`, event, store, state slice, or invariant.
- A journey spanning surfaces is one unit. Docs land with that unit, not as follow-up work; tests are added only when explicitly requested by the user.
- Default to main-session work. Delegate only when surfaces are truly independent and do not share files, selectors, events, stores, or state.
- Active Reader First surfaces are read, navigate, configure, onboard, and infra.
- Mark, review, and listen are removed-scope implementation surfaces. Touch them only for cleanup, regression containment, or source removal; bookmarks remain active navigation/read continuity.
- Use the owning dossier's inventory for the surface to source-file map; use `docs/context/style-map.md` for component-to-style ownership; regenerate with `pnpm run docs` if either looks stale.

## Core Rules

- Update the owning dossier in the same change when behavior, reach, data ownership, or invariants change.
- Update cross-cutting context docs when their subject changes. Never hand-edit auto-generated fence blocks; run `pnpm run docs`.
- Do not follow TDD by default. Do not write tests before implementation, and do not add or update automated tests unless the user explicitly asks for tests.
- When tests are explicitly requested, extend existing unit/e2e files before creating new ones. Prefer unit tests unless the requested coverage requires browser-only proof.
- When e2e tests are explicitly requested, keep specs under `tests/e2e/<surface>/`; a new top-level e2e folder requires a new surface dossier.
- Do not add scripts for one-off work. Check `package.json`, `docs/tech-stack.md`, and scoped `AGENTS.md` files before choosing commands.

## Verification

- Read-only analysis: no project verification required.
- Docs, skills, AGENTS, or generated-context-only changes: run `pnpm run docs:check` and `git diff --check`; run `pnpm run docs` first when generated context may need regeneration.
- Narrow code changes: do not add or update tests unless explicitly requested; run the smallest non-test verification that proves the change, plus `pnpm run check` when types, lint, Svelte, or styles can be affected. Existing tests may be run when the user asks or when the change itself is test-only.
- Data, source-catalog, source-data-flow, or dataset-script changes: run the relevant `pnpm run data -- check` or `pnpm run data -- build` profile; also run `pnpm run validate` when app/runtime/build output or release behavior can be affected.
- Shared behavior, config, build, service-worker, or release-sensitive changes: `pnpm run validate`.
- E2E-only changes: only make them when explicitly requested; run the owning journey spec per `tests/e2e/AGENTS.md`, then broader gates only when shared behavior changed.
- Treat warnings from build, lint, check, or docs checks as failures to resolve.

## Skill Maintenance

When editing repo-local skills, keep `SKILL.md` concise, make frontmatter descriptions trigger-focused, and avoid duplicating canonical docs. Use `references/pressure-prompts.md` to check whether future agents would select the intended workflow.
