# React Production Parity Fix 08 - About, Clear Data, PWA Install, And Product Copy

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-009` by aligning React About content/actions with Svelte behavior and removing unsupported product claims.

**Depends on:** Plans 00 and 01. Clear-data launch proof benefits from Plan 01.

## Required Context

Read:

- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `docs/product-info.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/configure/about/About.svelte`
- `src/configure/about/pwa-install.ts`
- `src/configure/ClearDataConfirm.svelte`
- `src/configure/clear-data.ts`
- `src/infra/safety/sync.ts`
- `src/core/UpdateBanner.svelte`
- `src/App.svelte`

React target:

- `src-react/app/routes/settings/AboutRoute.tsx`
- `src-react/design-system/recipes/settings-page.tsx`
- `src-react/storage/**`
- `src-react/offline/service-worker-contract.ts`
- Any React clear-data helper if present

Tests:

- `tests/e2e/configure/react-golden.spec.ts`
- `tests/unit/react-storage/**`

## Files To Modify

- `src-react/app/routes/settings/AboutRoute.tsx`
- React clear-data helper files, creating under `src-react/storage/` or `src-react/app/routes/settings/` only if no owned helper exists
- React PWA install prompt helper, creating a small route-owned helper only if needed
- `tests/e2e/configure/react-golden.spec.ts`
- `tests/unit/react-storage/**`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md` if clear-data or PWA behavior changes
- `docs/context/style-map.md`

## Tests To Write First

- Component/unit: About page contains Svelte mission, attribution, version/footer, and clear-data affordance.
- Component/unit: unsupported claims about verified React search/bookmarks/Daily Wird workflows are absent.
- E2E: Clear all data opens confirmation, requires exact `DELETE`, deletes IDB/cache state, reloads, and lands in onboarding.
- E2E: PWA install button state mirrors Svelte install-prompt availability as far as browser automation can simulate.
- E2E: About route has no removed-scope claims.

Expected before implementation: tests fail because About content is preview-specific and clear-data/PWA behavior is missing.

## Implementation Steps

- [ ] Copy the current Svelte About content contract, not later design prose.
- [ ] Inspect `src-react/design-system/registry/component-registry.json` and use approved `src-react/components/ui` primitives for buttons/dialogs.
- [ ] Use only React semantic-token `qar:` utilities and owned Dialog variants; do not import/copy Svelte CSS or `.qa-*` classes.
- [ ] Update About/clear-data stories and registry for default, install-unavailable, install-available, confirmation, destructive disabled/enabled, focus-visible, mobile/tablet/desktop, and light/sepia/dark states touched by this plan.
- [ ] Remove unsupported React preview claims.
- [ ] Implement clear-data confirmation and deletion semantics compatible with Svelte.
- [ ] Ensure clear-data reload triggers React launch onboarding from Plan 01.
- [ ] Implement install prompt affordance state if browser support is available; otherwise match Svelte unavailable state.
- [ ] Preserve accessibility: dialog focus, Esc/cancel behavior, destructive action naming.

## Commands

```bash
pnpm exec vitest run tests/unit/react-storage --config vitest.react.config.ts
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run build
pnpm run test:e2e:react:golden -- --grep "about-page"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: About/clear-data targeted tests pass.

## Documentation

- Update `docs/context/surfaces/configure.md` if React dual-build behavior is documented.
- Update `docs/context/surfaces/infra.md` for clear-data/PWA behavior if needed.
- Update `docs/context/style-map.md` for proof ownership.

## Acceptance Criteria

- `RPA-009` is closed.
- Unsupported React claims are removed.
- Clear-data resets to onboarding.
- PWA install affordance matches Svelte-supported states.
