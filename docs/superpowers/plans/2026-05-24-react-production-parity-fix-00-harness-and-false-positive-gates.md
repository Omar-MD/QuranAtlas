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

- [ ] Add a parity fixture layer that can serve both Svelte and React production previews. Prefer extending existing Playwright config over inventing one-off scripts.
- [ ] Add helpers to clear IndexedDB, Cache Storage, service workers, local storage, and session storage per target.
- [ ] Add helpers to seed onboarded state, bookmarks, Daily Wird, and asset-cache state through existing test fixture patterns.
- [ ] Add a console/network guard that fails on page errors, console errors, failed HTTP responses, and failed requests unless the test explicitly lists an expected failure.
- [ ] Add a negative required-dataset test that forces a required 404 and proves React renders unavailable/error state instead of fallback content.
- [ ] Replace React-only landmark assertions with route-specific parity assertions tied to the audit issues.
- [ ] Keep intentional non-carry-over differences explicit: no React Tafsir mode/sheet, no settings preview panes, shortened onboarding.
- [ ] If new scripts are required, add stable names to `package.json` and document them in `docs/tech-stack.md`.

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
