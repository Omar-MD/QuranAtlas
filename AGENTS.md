# AGENTS.md — project instructions

Project instructions auto-loaded by Codex in this repo.

## Route

- Use `.agents/skills/quranatlas-workflow/SKILL.md` for QuranAtlas implementation, refactors, tests, docs, data contracts, context docs, product-scope cleanup, repo-local skills, and verification planning.
- Use `.agents/skills/quranatlas-ui-workflow/SKILL.md` for UI, layout, styling, responsive behavior, screenshots, or visual polish when visual judgment or browser proof matters.
- Use `.agents/skills/quranatlas-audit/SKILL.md` only for explicit audits, health checks, readiness reviews, or product/codebase quality reviews.
- Use `tests/unit/AGENTS.md` and `tests/e2e/AGENTS.md` before adding, moving, or materially changing tests.
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

## Git Defaults

- Do not push, merge, or open a PR unless explicitly asked.
- If asked for a PR and no base branch is named, use `dev`.
- `dev` is the default integration branch for ordinary code changes. Use `staging` or `main` only when explicitly requested.
- Put temporary working notes or scratch scripts in `.scratch/`; do not commit them.

## Verification

Verify at the smallest level that proves the change.

- Read-only analysis: no project verification required.
- Docs, AGENTS, or skills only: run `pnpm run docs:check` and `git diff --check`; run `pnpm run docs` first when generated context may need regeneration.
- Narrow code changes: run the relevant targeted test, plus `pnpm run check` when types, lint, Svelte, or styles can be affected.
- Data, source-catalog, source-data-flow, or dataset-script changes: run the relevant `pnpm run data -- check` or `pnpm run data -- build` profile; also run `pnpm run validate` when app/runtime/build output or release behavior can be affected.
- Shared behavior, config, build, service-worker, or release-sensitive changes: run `pnpm run validate`.
- E2E-only changes: follow `tests/e2e/AGENTS.md`; run the owning spec first, then broader gates only when shared behavior changed.
