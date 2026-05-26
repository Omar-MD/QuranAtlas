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
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
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

## Readiness Refinement

- Execute last, after Plans 00 through 08. This plan is a blocker gate, not a place to introduce new product scope or production routing changes.
- Test-first checkpoint: tighten the offline/final matrix first, run it against the current React production-target build, and confirm at least one newly tightened assertion fails before app/config edits. If Plans 00-08 already fixed the original symptom, deliberately add the new isolation/responsive/cache assertion first and capture that failing assertion class before making fixes.
- Svelte-vs-React comparison covers app-shell cache behavior, required dataset and Mushaf asset caching, clear-data/cache isolation, route matrix parity, responsive/touch/chrome measurements, and every accepted intentional non-carry-over item.
- Production-target verification must build Svelte and React, serve strict previews, clear stale workers/caches before and after, and prove React generated service-worker assets stay out of shipped Svelte `dist/`.
- CSS/React styling enforcement: run final React design, registry, UI-pattern, Mushaf-asset, Storybook, visual, and responsive/a11y gates; any late UI fix must still use owned primitives, `qar:` utilities, and no Svelte CSS/classes.
- Final responsive/style proof must include computed-style/CSS-variable assertions that all touched final-gate `qar:` utilities resolve through `--qa-react-*` semantic tokens for canvas, surface, text, muted text, border, focus, accent, selection, warning, danger, and reader-specific states.
- Docs updates must land in `docs/tech-stack.md` for scripts/PWA config, `docs/context/surfaces/infra.md` for service-worker/cache behavior, and `docs/context/style-map.md` for final proof ownership.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Proof-Only Service Worker And Cache Isolation

**Files:**
- Modify: `vite.react.config.js`
- Modify: `src-react/offline/**`
- Modify: `tests/e2e/fixtures/react-offline.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`
- Modify: `package.json` and `docs/tech-stack.md` only if validation scripts change

- [ ] Write failing offline tests that React and Svelte preview builds use distinct service-worker registrations, scopes, cache prefixes, cleanup allowlists, and generated service-worker file identities.
- [ ] Ensure React PWA/offline config is proof-only and cannot alter shipped Svelte deploy routing or `dist/` service-worker output.
- [ ] Assert React generated service-worker assets are absent from shipped Svelte `dist/`.

### Task 2: Required Dataset Offline Proof

**Files:**
- Modify: `src-react/data/reader-corpus.ts` only if required cache behavior still needs correction
- Modify: `src-react/packs/**` only if asset cache verification still needs correction
- Modify: `tests/e2e/fixtures/react-offline.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`

- [ ] Write failing tests that online warm load requests required reader, translation, metadata/index, Mushaf manifest, and page URLs before offline reload.
- [ ] Tighten offline helpers to fail on request failures, failed HTTP responses, console errors, and page errors for required data.
- [ ] Prove offline reload renders cached dataset-backed Surah 1 content and no preview fallback.
- [ ] Prove React clear-data/offline cleanup touches only React proof cache names and does not delete/claim Svelte cache names.

### Task 3: Final Route, Responsive, And A11y Matrix

**Files:**
- Modify: `tests/e2e/fixtures/react-a11y.ts`
- Modify: `tests/e2e/**/react-golden.spec.ts` only for final gate tightening
- Modify: `docs/context/style-map.md` if final proof ownership changes

- [ ] Run the full audit route matrix from the original evidence against fixed React and Svelte.
- [ ] Add measured `RPA-012` assertions at `320x568`, `375x812`, `768x1024`, and `1280x900`: no horizontal overflow, no sticky/control overlap, minimum touch targets, icon accessible names, long-label wrapping, focus visibility, and safe-area-aware mobile chrome.
- [ ] Run final visual and Storybook gates so late UI fixes still satisfy registry, story, and token proof.

### Task 4: Final Blocker Checklist

**Files:**
- Modify: `docs/context/surfaces/infra.md` if service-worker/cache behavior changes
- Modify: `docs/context/style-map.md` if proof ownership changes
- Add a final evidence appendix only if a durable current-state proof artifact is necessary

- [ ] Create the final `RPA-001` through `RPA-012` checklist in the implementing change or appendix; every item must be closed or explicitly intentional non-carry-over.
- [ ] Confirm no production flip, no Wave 17, no Svelte removal, no deploy workflow change, and no Svelte CSS import regression.
- [ ] Run:

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

## Tests To Write First

- Offline e2e: after online warm load and service worker ready, offline reload of `#/s/1` renders real cached Surah 1 dataset content and no preview fallback.
- Offline e2e: test fails on any failed request, console error, or failed HTTP response for required reader data.
- Offline e2e: required dataset URLs are requested online and served offline from cache.
- Offline e2e: React and Svelte preview builds use distinct service-worker registrations, scopes, and Cache Storage names.
- Offline e2e: React clear-data/offline cleanup touches only React proof cache names and does not delete/claim Svelte cache names.
- E2E final: all React golden parity fixtures run against `VITE_QURANATLAS_DEPLOY_TARGET=production` build.
- Responsive/a11y: the bounded `RPA-012` matrix covers drawer opener, reader controls, settings controls, asset rows, navigation rows, Mushaf controls, and known mobile chrome at the relevant audit widths.
- Responsive/a11y e2e must use DOM measurements, not only screenshots. At `320x568`, `375x812`, `768x1024`, and `1280x900`, assert document/client width has no horizontal overflow; sticky header/footer/chrome do not overlap primary content or focused controls; visible controls meet the QuranAtlas minimum touch-target token; icon-only controls have accessible names; long labels wrap without clipping; and mobile sticky chrome accounts for safe-area insets.

Expected before implementation: at least one newly tightened final-gate assertion fails, such as service-worker scope isolation, cache-prefix isolation, required dataset offline provenance, stale preview cleanup, or `RPA-012` measured responsive/touch/chrome proof. Do not skip the red checkpoint just because earlier plans fixed the original offline fallback symptom.

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
