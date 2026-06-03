# AGENTS.md — project instructions

Project instructions auto-loaded by Codex in this repo.

## Route

- Use `.agents/skills/quranatlas-workflow/SKILL.md` for QuranAtlas implementation, refactors, tests, docs, data contracts, context docs, product-scope cleanup, repo-local skills, and verification planning.
- Use `.agents/skills/quranatlas-ui-workflow/SKILL.md` for UI, layout, styling, responsive behavior, screenshots, or visual polish when visual judgment or browser proof matters.
- Use `.agents/skills/quranatlas-audit/SKILL.md` only for explicit audits, health checks, readiness reviews, or product/codebase quality reviews.
- Add, move, or materially change tests whenever changed behavior, fixed regressions, or verification needs durable coverage. Use `tests/unit/AGENTS.md` and `tests/e2e/AGENTS.md` before changing tests.
- For library, framework, SDK, API, CLI, or cloud-service questions, use the inherited Context7/`ctx7` docs workflow first (`library` then `docs`); do not answer from memory when docs can be fetched. Resume QuranAtlas workflow only if the answer leads to repo behavior, code, tests, or docs changes.

## Source Of Truth

- Prefer local repo state and history: `git status`, `git diff`, `git show`, `git log`, `git blame`, the working tree, untracked files, and `docs/`.
- Do not treat GitHub or other remote state as authoritative for active local work unless the task asks about PRs, CI, remote branches, or hosted metadata.
- Read only the context docs selected by the workflow: the owning surface dossier for behavior changes, and the relevant canonical doc for cross-cutting architecture, data, source-data, product, or tooling changes.
- If docs and code disagree, code wins; update docs in the same change.

## Hard Rules

- Never hand-edit auto-generated context fences (`<!-- AUTO-GENERATED:* START --> ... END`); rerun `pnpm run docs`.
- Keep docs and source comments current-state only. Do not leave progress logs, codenames, dates, commit SHAs, or revision notes unless they are data or load-bearing invariants.
- Do not invent project commands or committed one-off scripts. Check `package.json`, `docs/tech-stack.md`, and scoped AGENTS files first.
- When `package.json` scripts, dev tools, pinned versions, or CI gates change, update `docs/tech-stack.md` in the same change.
- For React UI work, check `src/design-system/registry/component-registry.json` first and compose approved components from `src/components/ui`; direct Radix imports outside that owned layer are forbidden.
- Do not follow TDD by default unless the user asks for it. Add or update automated tests when behavior changes, regressions are fixed, or verification needs durable coverage.
- Test quality gate: reject or remove tests that assert implementation trivia instead of durable behavior. Unit tests must not lock in CSS class names, icon internals, DOM placement, exact visual layout, CSS source text, snapshots of markup, physical pointer geometry, jsdom-simulated layout/scroll, presentational overlays, or `data-*` state used only for styling/selection. Prefer accessible roles/names, user-visible content, callbacks, persisted state, route changes, and data contracts. Browser-only layout, paint, real gesture timing, service-worker, reload/hydration, and multi-screen keyboard traversal belong in `tests/e2e/**`, not Vitest. E2E tests should still prove behavior through visible/browser outcomes before reaching for implementation selectors.

## Command Guidance

- Use `pnpm run check` as the primary static gate; it already runs typecheck, lint, and custom repo checks in parallel.
- Use `pnpm run test:fast` for local unit feedback when generated Search pack and morphology integration proofs are not relevant. Use `pnpm run test`, `pnpm run test:node`, `pnpm run test:react`, or `pnpm run test:unit:full` when the change needs that broader lane.
- Use raw `pnpm exec vite build` or `./node_modules/.bin/vite build` only for app-shell bundle checks. Raw Vite builds intentionally omit `dist/dataset` and `dist/search-packs`; use `pnpm run build` or `pnpm run ci:build` when preview, deploy, or runtime assets must be present in `dist/`.
- Use `pnpm run data -- check` for dataset integrity. Use `pnpm run data -- build --skip=mushaf-pages` for non-Mushaf dataset rebuilds, and run the Mushaf pages command directly only when page artifacts are the target.
- Use `PLAYWRIGHT_SKIP_BUILD=1` only when an existing `dist/` was produced by `pnpm run build` or `pnpm run ci:build`.

## Git Defaults

- Do not push, merge, or open a PR unless explicitly asked.
- If asked for a PR and no base branch is named, use `dev`.
- `dev` is the default integration branch for ordinary code changes. Use `staging` or `main` only when explicitly requested.
- After an agent push, monitor the resulting CI run to completion and keep fixing and pushing until CI passes unless the user explicitly tells you to stop.
- Put temporary working notes or scratch scripts in `.scratch/`; do not commit them.

## Verification

Verify at the smallest level that proves the change.

- Read-only analysis: no project verification required.
- Docs, AGENTS, or skills only: run `pnpm run docs:check` and `git diff --check`; run `pnpm run docs` first when generated context may need regeneration.
- Narrow code changes: add or update focused tests when they are the smallest durable proof, then run the targeted test lane plus the smallest non-test verification that proves the change. Also run `pnpm run check` when types, lint, React, or styles can be affected.
- Data, source-catalog, source-data-flow, or dataset-script changes: run the relevant `pnpm run data -- check` or `pnpm run data -- build` profile; also run `pnpm run validate` when app/runtime/build output or release behavior can be affected.
- Shared behavior, config, build, service-worker, or release-sensitive changes: run `pnpm run validate`.
- E2E-only changes: follow `tests/e2e/AGENTS.md` and run the owning spec first, then broader gates only when shared behavior changed.
