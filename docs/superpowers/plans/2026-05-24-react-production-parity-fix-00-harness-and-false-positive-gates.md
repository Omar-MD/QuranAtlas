# React Production Parity Fix 00 - Harness And False-Positive Gates

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Steps use checkbox syntax for tracking.

**Goal:** Replace false-passing React route checks with a production-target Svelte-vs-React parity harness that fails on the current audited React defects.

**Depends on:** master spec only.

**Unblocks:** every later plan.

## Required Context

Read:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/style-map.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-audit.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `docs/tech-stack.md`
- `tests/e2e/AGENTS.md`
- `tests/unit/AGENTS.md`
- `package.json`

## Files To Inspect

- `.scratch/react-production-parity-audit.mjs`
- `.scratch/react-production-parity-audit/evidence.json`
- `.scratch/react-production-parity-audit/console-network.json`
- `tests/e2e/fixtures/react-golden-routes.ts`
- `tests/e2e/fixtures/react-a11y.ts`
- `tests/e2e/fixtures/react-offline.ts`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/navigate/react-golden.spec.ts`
- `tests/e2e/configure/react-golden.spec.ts`
- `tests/e2e/onboard/react-golden.spec.ts`
- `tests/e2e/infra/react-offline.spec.ts`
- `playwright.react.config.js`
- `vite.react.config.js`

## Files To Modify

- `tests/e2e/fixtures/react-golden-routes.ts`
- `tests/e2e/fixtures/react-a11y.ts`
- `tests/e2e/fixtures/react-offline.ts`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/navigate/react-golden.spec.ts`
- `tests/e2e/configure/react-golden.spec.ts`
- `tests/e2e/onboard/react-golden.spec.ts`
- `tests/e2e/infra/react-offline.spec.ts`
- `playwright.react.config.js`
- `package.json` only if stable script names are added or changed
- `docs/tech-stack.md` only if `package.json` scripts or tooling change
- `docs/context/style-map.md` only if proof ownership changes

Do not modify application source in this plan except for minimal test-only IDs if a later implementation plan explicitly approves them.

## Readiness Refinement

- This plan is ready to execute first and must remain harness-only: no React product behavior fixes belong here.
- Treat Svelte `src/**`, `src/styles/**`, and the built Svelte preview as the oracle. `DESIGN.md` is not expected behavior for any parity assertion.
- Add the test-first checkpoint to each new parity fixture: write or tighten the assertion, run it against the current audited production-target React build, confirm it fails for the named `RPA-*` reason, then continue with harness code.
- Production-target proof must build and serve both artifacts on strict, separate ports before Playwright runs; dev-server React, Storybook, or screenshots alone cannot satisfy this plan.
- Svelte-vs-React comparison must be explicit in fixture naming, seed setup, route selection, request manifests, and failure messages.
- CSS/React styling enforcement starts here by hardening import-boundary and registry checks before UI plans proceed: React and Storybook must not import `src/styles/**`, Svelte `.qa-*` classes, or Svelte CSS partials.
- Docs updates are limited to `docs/tech-stack.md` for script/tooling changes and `docs/context/style-map.md` for proof ownership changes; generated fences require `pnpm run docs`.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Production Parity Harness Preflight

**Files:**
- Modify: `playwright.react.config.js`
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `tests/e2e/fixtures/react-a11y.ts`
- Modify: `tests/e2e/fixtures/react-offline.ts`

- [x] Add test-side target metadata for strict Svelte and React preview URLs, expected build directories, and a React production deploy-target marker.
- [x] Add a failing preflight assertion that rejects React dev-server output or stale `dist-react/` output before route assertions run.
- [x] Run:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden
```

Expected before later plans: route parity tests fail for audited React behavior, not for missing harness setup.

### Task 2: Storage, Cache, And Network Guard Fixtures

**Files:**
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `tests/e2e/fixtures/react-offline.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`

- [x] Add per-target cleanup helpers for service workers, Cache Storage, IndexedDB, local storage, and session storage.
- [x] Add seeded-state helpers for onboarded settings, bookmarks, Daily Wird, and real cache entries; each seed must prove rendered output differs from the no-seed baseline.
- [x] Add request/console/page-error guards with per-route expected request manifests for required URLs, optional URLs, allowed aborts, and expected rendered provenance.
- [x] Run:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:offline
```

Expected before later plans: offline proof fails on required dataset failures instead of passing on app-shell landmarks.

### Task 3: Replace False-Positive Route Assertions

**Files:**
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `tests/e2e/navigate/react-golden.spec.ts`
- Modify: `tests/e2e/configure/react-golden.spec.ts`
- Modify: `tests/e2e/onboard/react-golden.spec.ts`

- [x] Convert generic landmark checks into audit-tied Svelte-vs-React assertions for launch, reader corpus, Mushaf asset, bookmarks, settings route restore, and offline fallback masking.
- [x] Keep intentional non-carry-over assertions explicit: no React Tafsir UI, no settings preview panes, shortened onboarding.
- [x] Verify the new assertions fail against the audited React state with named `RPA-*` failure messages.

### Task 4: Boundary And Registry Gates

**Files:**
- Modify: `scripts/check-react-boundaries.mjs`
- Modify: `scripts/check-react-component-registry.mjs`
- Test: existing or new focused unit tests under `tests/unit/react-registry/**`
- Modify: `package.json` and `docs/tech-stack.md` only if script names change

- [x] Harden React/Svelte CSS import detection for `src-react/**/*.css`, `.storybook/**/*`, deep relative imports, and direct `src/styles/**` references.
- [x] Harden registry validation for existing exports, stories, tests, accessibility, and visual proof references; product entries must not mark visual proof as covered unless stories or referenced proof cover the required default/loading/error/empty/long-text/focus-visible/reduced-motion/mobile/tablet/desktop/light/sepia/dark states for that component's reachable states.
- [x] If `check:react` continues to invoke `scripts/check-react-boundaries.mjs`, update `docs/tech-stack.md` so the checker is documented with the other React-only gates; if the checker is replaced by an existing documented gate, remove the stale file reference from this plan and the package script in the same change.
- [x] Update `docs/tech-stack.md` when Plan 00 changes `test:e2e:react:golden`, `test:e2e:react:offline`, or `validate:react` from React-only route proof into production-target Svelte-vs-React parity proof.
- [x] Run:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden
pnpm run test:e2e:react:offline
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run docs:check
git diff --check
```

## Tests To Write First

1. Add or rewrite a launch parity test that clears both targets and expects React `/` to behave like Svelte clean launch. Expected before Plan 01: fail because React normalizes to `#/s/1`.
2. Add reader corpus assertions for Surah 1 verse count and absence of preview fallback. Expected before Plan 02: fail because React renders hardcoded preview verses.
3. Add Mushaf real-asset assertion for absence of `aria-label="Mushaf page placeholder"` and presence of a real SVG loaded from the edition-aware dataset path. Expected before Plan 03: fail.
4. Add bookmark seeded-output assertion. Expected before Plan 04: fail because seeded bookmarks do not render.
5. Add settings route restoration/persistence assertion. Expected before Plan 05: fail because `#/settings` is standalone and local-only.
6. Add offline request failure guard. Expected before Plan 09: fail because failed dataset requests are masked.

## Harness Contract

- Build order is mandatory: `pnpm run build`, then `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react`, then Playwright.
- Playwright must serve the built `dist/` and `dist-react/` artifacts on distinct strict ports with distinct `baseURL`s.
- CI must use `reuseExistingServer: false`; local reuse is allowed only when the test preflight verifies the expected build artifact and production deploy-target marker.
- Add a test-side preflight that fails if React is not served from a production-target build.
- Use per-target browser contexts and clear service workers, Cache Storage, IndexedDB, local storage, and session storage before and after each target run.
- Seed helpers must assert storage schema version, apply equivalent Svelte/React state, and prove seeded output differs from a no-seed baseline.
- Cache seeds must create real request/response entries with URL, body, status, and cache name, then prove offline reload uses those entries.
- Add per-route expected request manifests for required URLs, optional URLs, allowed aborts, expected statuses, and rendered provenance from fetched JSON/SVG.
- Selector policy: prefer roles, accessible names, route URLs, and dataset-derived content. Use `data-testid` only for cross-framework semantic anchors that cannot be expressed accessibly; do not use CSS classes or DOM-shape selectors as parity proof.
- Harden `scripts/check-react-boundaries.mjs` before UI plans proceed: reject React or Storybook imports matching `(?:^|/)src/styles/` or `(?:\\.\\./)+src/styles/`, scan `src-react/**/*.css` and `.storybook/**/*.{ts,tsx,css}` for CSS `@import` into `src/**` or `src/styles/**`, and add fixture tests proving deep relative Svelte CSS imports fail.
- Add artifact hygiene before later plans run builds: ignore or explicitly clean `dist-react/` and `storybook-static-react/`, and after any `build:react`, `visual:react`, or `build:storybook:react`, verify `git status --short dist-react storybook-static-react test-output` is empty unless an approved baseline file is intentionally committed.
- Strengthen `scripts/check-react-component-registry.mjs` before or during the first registry-touching plan: validate JSON schema, actual `namedExport` presence, non-empty stories/tests/accessibility/visualProof, and referenced docs or visual proof files where required.

## Implementation Steps

- [x] Add a parity fixture layer that can serve both Svelte and React production previews. Prefer extending existing Playwright config over inventing one-off scripts.
- [x] Add helpers to clear IndexedDB, Cache Storage, service workers, local storage, and session storage per target.
- [x] Add helpers to seed onboarded state, bookmarks, Daily Wird, and asset-cache state through existing test fixture patterns.
- [x] Add a console/network guard that fails on page errors, console errors, failed HTTP responses, and failed requests unless the test explicitly lists an expected failure.
- [x] Add a negative required-dataset test that forces a required 404 and proves React renders unavailable/error state instead of fallback content.
- [x] Replace React-only landmark assertions with route-specific parity assertions tied to the audit issues.
- [x] Keep intentional non-carry-over differences explicit: no React Tafsir mode/sheet, no settings preview panes, shortened onboarding.
- [x] If new scripts are required, add stable names to `package.json` and document them in `docs/tech-stack.md`.

## Commands

Run before implementation to capture expected failures:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden
pnpm run test:e2e:react:offline
```

Expected before later fix plans: the new parity assertions fail on `RPA-001`, `RPA-002`, `RPA-003`, `RPA-004`, `RPA-005`, `RPA-010`, and `RPA-011`.

Run after harness changes:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden
pnpm run test:e2e:react:offline
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run docs:check
git diff --check
```

Expected after this plan: checks pass, but parity e2e suites may still fail because later plans have not fixed React behavior.

## Documentation

- Update `docs/tech-stack.md` if scripts or Playwright projects change.
- Update `docs/context/style-map.md` if proof ownership changes.
- Do not update surface behavior docs unless this plan changes durable behavior, which it should not.

## Acceptance Criteria

- Current false-passing React tests no longer pass for the audited broken state.
- Parity tests prove Svelte-vs-React workflows or fail with specific parity mismatch messages.
- Offline tests fail on failed dataset requests.
- Seed fixtures must affect rendered output.
- React remains proof-only.
