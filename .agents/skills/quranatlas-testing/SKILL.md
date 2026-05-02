---
name: quranatlas-testing
description: Choose the right test level and verification commands for QuranAtlas. Use whenever a task adds tests, changes behavior, touches Playwright, or needs a verification plan.
---

# QuranAtlas Testing

Use the repo's scoped instructions first:

- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Workflow

1. Default to unit tests.
2. Upgrade to e2e only for browser-only proof.
3. Extend an existing surface-owned test file before creating a new one.
4. Reuse `tests/e2e/.auth/onboarded.json` for onboarding-skipping e2e flows.
5. Prefer targeted verification first, then run the broader gate that matches the change.

## Verification

- Docs / generated context only: `pnpm docs:derive && pnpm docs:check`
- Code, shared behavior, config, build, or cross-surface changes: `pnpm validate`
- Material e2e additions: time the owning journey spec locally

## Repo-specific notes

- Avoid `clearAllData()` when a single-store reset proves the behavior.
- Prefer the dev server unless the assertion requires the production service worker.
