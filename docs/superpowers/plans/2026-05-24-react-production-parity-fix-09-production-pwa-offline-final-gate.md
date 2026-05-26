# React Production Parity Fix 09 - Production PWA Offline Parity And Final Blocker Gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-010`, close `RPA-011` end to end, and prove no remaining `RPA-001` through `RPA-012` blockers in React production-target preview.

**Depends on:** Plans 00 through 08.

## Required Context

Read:

- `docs/context/surfaces/infra.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/configure.md`
- `docs/context/source-data-flow.md`
- `docs/tech-stack.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-audit.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/infra/service-worker/sw.js`
- `src/infra/service-worker/sw-handlers.js`
- `src/infra/sw/route-defs.ts`
- `src/infra/sw/strategies.ts`
- `src/infra/offline/**`
- `src/data/offline.ts`

React target:

- `vite.react.config.js`
- `src-react/offline/**`
- `src-react/data/reader-corpus.ts`
- `src-react/packs/**`
- `src-react/app/deploy-target.ts`
- `tests/e2e/fixtures/react-offline.ts`
- `tests/e2e/infra/react-offline.spec.ts`
- `playwright.react.config.js`
- `package.json`

Evidence to compare:

- `.scratch/react-production-parity-audit/evidence.json`
- `.scratch/react-production-parity-audit/console-network.json`

## Files To Modify

- `vite.react.config.js`
- `src-react/offline/**`
- `src-react/data/reader-corpus.ts` only if offline request/cache behavior still needs correction
- `src-react/packs/**` only if asset cache verification still needs correction
- `tests/e2e/fixtures/react-offline.ts`
- `tests/e2e/infra/react-offline.spec.ts`
- `tests/e2e/fixtures/react-a11y.ts`
- `tests/e2e/**/react-golden.spec.ts` only for final gate tightening
- `package.json` if final validation scripts change
- `docs/tech-stack.md` if scripts/tooling change
- `docs/context/surfaces/infra.md`
- `docs/context/style-map.md`

## Tests To Write First

- Offline e2e: after online warm load and service worker ready, offline reload of `#/s/1` renders real cached Surah 1 dataset content and no preview fallback.
- Offline e2e: test fails on any failed request, console error, or failed HTTP response for required reader data.
- Offline e2e: required dataset URLs are requested online and served offline from cache.
- Offline e2e: React and Svelte preview builds use distinct service-worker registrations, scopes, and Cache Storage names.
- Offline e2e: React clear-data/offline cleanup touches only React proof cache names and does not delete/claim Svelte cache names.
- E2E final: all React golden parity fixtures run against `VITE_QURANATLAS_DEPLOY_TARGET=production` build.
- Responsive/a11y: the bounded `RPA-012` matrix covers drawer opener, reader controls, settings controls, asset rows, navigation rows, Mushaf controls, and known mobile chrome at the relevant audit widths.
- Responsive/a11y e2e must use DOM measurements, not only screenshots. At `320x568`, `375x812`, `768x1024`, and `1280x900`, assert document/client width has no horizontal overflow; sticky header/footer/chrome do not overlap primary content or focused controls; visible controls meet the QuranAtlas minimum touch-target token; icon-only controls have accessible names; long labels wrap without clipping; and mobile sticky chrome accounts for safe-area insets.

Expected before implementation: offline tests fail on dataset request failures if prior plans have not already fixed them.

## Implementation Steps

- [ ] Verify React production-target PWA/service-worker config is proof-only and does not change shipped Svelte deploy routing.
- [ ] Require React-only Workbox/cache prefixes, service-worker file identity, cleanup allowlist, and preview scope.
- [ ] Assert React generated service worker is absent from shipped Svelte deploy output.
- [ ] Align app-shell and dataset caching with Svelte route definitions where React uses the same asset classes.
- [ ] Ensure required reader, translation, metadata, Mushaf indexes, and page assets are cache-planned or explicitly unavailable before offline reload.
- [ ] Remove any remaining production fallback that masks failed data loads.
- [ ] Tighten offline helpers to fail on request failures and console/page errors.
- [ ] Verify no stale preview server, cache, or service-worker reuse can satisfy final tests.
- [ ] Run the full audit route matrix from the original evidence against fixed React and Svelte.
- [ ] Create a final blocker checklist for `RPA-001` through `RPA-012`; each item must be closed or intentionally non-carried-over.
- [ ] Confirm no production flip, Wave 17, or Svelte removal occurred.

## Commands

Run final proof:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden
pnpm run test:e2e:react:offline
pnpm run visual:react
pnpm run validate:react
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run check
pnpm run docs:check
git diff --check
```

If data/source-data behavior changes:

```bash
pnpm run data -- check
pnpm run validate
```

Expected final result: all relevant gates pass. If `pnpm run validate` is too broad for the final patch scope, record why and run the smallest stronger command set that proves production-target PWA/offline parity.

## Documentation

- Update `docs/tech-stack.md` for script or PWA config changes.
- Update `docs/context/surfaces/infra.md` for service-worker/cache behavior.
- Update `docs/context/style-map.md` for final proof ownership.
- Add a final evidence appendix only if the implementing agent needs a durable current-state proof artifact; do not add progress logs.

## Acceptance Criteria

- `RPA-010` is closed.
- `RPA-011` is closed by durable failing-then-passing tests.
- `RPA-012` is covered by responsive/touch/chrome parity assertions.
- The final blocker checklist shows `RPA-001` through `RPA-012` closed or intentionally non-carried-over.
- React remains proof-only.
