# React Production Parity Fix 03 - Mushaf Real Asset Loading And Controls

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-003` by replacing the React Mushaf placeholder with real edition-aware page asset loading, sizing, controls, and offline asset-state behavior.

**Depends on:** Plans 00, 01, and asset contracts from existing React Wave 08/08A work.

**Unblocks:** Plans 05 and 09.

## Required Context

Read:

- `docs/context/surfaces/read.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md`
- `docs/context/source-data-flow.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/read/mushaf/MushafReader.svelte`
- `src/read/mushaf/MushafPage.svelte`
- `src/read/mushaf/MushafControls.svelte`
- `src/read/mushaf/svg-page.ts`
- `src/read/mushaf/sizing.ts`
- `src/read/mushaf/view-mode.ts`
- `src/read/mushaf/navigation.ts`
- `src/packs/**`
- `src/data/offline.ts`

React target:

- `src-react/app/routes/read/MushafRoute.tsx`
- `src-react/components/reader/MushafPageViewer.tsx`
- `src-react/components/reader/MushafModeControl.tsx`
- `src-react/components/reader/ReaderAssetGate.tsx`
- `src-react/packs/mushaf-paths.ts`
- `src-react/packs/mushaf-index.ts`
- `src-react/packs/mushaf-cache.ts`
- `src-react/packs/mushaf-install-plan.ts`
- `src-react/offline/mushaf-service-worker-protocol.ts`

Tests:

- `tests/unit/react-packs/**`
- `tests/unit/react-read/reader-wave3.test.tsx`
- `tests/e2e/read/react-golden.spec.ts`

## Files To Modify

- `src-react/app/routes/read/MushafRoute.tsx`
- `src-react/components/reader/MushafPageViewer.tsx`
- `src-react/components/reader/MushafModeControl.tsx`
- `src-react/components/reader/ReaderAssetGate.tsx`
- `src-react/packs/**` if path/index/cache helpers are incomplete
- `tests/unit/react-packs/**`
- `tests/unit/react-read/**`
- `tests/e2e/read/react-golden.spec.ts`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/infra.md` if offline/cache behavior changes
- `docs/context/style-map.md`

## Readiness Refinement

- Execute only after Plan 00 and the launch/onboarding baseline from Plan 01; use the existing Wave 08/08A React asset contracts as inputs, not as proof of rendered parity.
- Test-first checkpoint: write path, manifest, sanitizer, viewer, and production-target e2e assertions, run them against the current React build, and confirm they fail on the placeholder/no-request behavior before app edits.
- Svelte-vs-React comparison covers edition-aware manifest/SVG requests, sanitized inline SVG rendering, viewBox/aspect-ratio containment, page controls, canonical page clamping, missing-pack states, and responsive page/control geometry.
- Production-target verification must build Svelte and React and serve both through strict previews; `MushafPageViewer` stories can prove component states but cannot replace production route parity.
- CSS/React styling enforcement: keep sizing/control variants in owned component APIs, use `qar:` semantic-token utilities only, update registry/stories/tests for Mushaf states, and do not depend on raw SVG internals except approved token recoloring.
- Responsive/style proof must use `320x568`, `375x812`, `768x1024`, and `1280x900`, plus computed-style/CSS-variable assertions that touched Mushaf `qar:` utilities resolve through `--qa-react-*` semantic tokens for page canvas, controls, borders, focus, accent, unavailable, and error states.
- Docs updates must land in `docs/context/surfaces/read.md`, `docs/context/surfaces/infra.md` when cache behavior changes, and `docs/context/style-map.md` when proof ownership changes.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Path, Index, Manifest, And Sanitizer Contracts

**Files:**
- Modify: `src-react/packs/mushaf-paths.ts`
- Modify: `src-react/packs/mushaf-index.ts`
- Modify: `src-react/packs/mushaf-cache.ts`
- Modify: `src-react/packs/mushaf-install-plan.ts`
- Test: `tests/unit/react-packs/**`

- [x] Write failing unit tests for baseline Qalun edition-aware paths, riwayah/edition manifest mismatch rejection, unsafe SVG rejection, stale index rejection, and path traversal/external URL rejection.
- [x] Implement or complete React path/index/cache helpers using only `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/...` paths.
- [ ] Run:

```bash
pnpm exec vitest run tests/unit/react-packs --config vitest.react.config.ts
pnpm run check:react-mushaf-assets
```

### Task 2: Mushaf Asset Hook, Viewer, And Controls

**Files:**
- Modify: `src-react/app/routes/read/MushafRoute.tsx`
- Modify: `src-react/components/reader/MushafPageViewer.tsx`
- Modify: `src-react/components/reader/MushafModeControl.tsx`
- Modify: `src-react/components/reader/ReaderAssetGate.tsx`
- Test: `tests/unit/react-read/**`
- Modify: reader/Mushaf story and registry entries

- [x] Write failing component tests that the viewer renders sanitized real SVG markup passed by props and never renders `aria-label="Mushaf page placeholder"` in production-target states.
- [x] Implement `useMushafPageAsset` with abort, request-id stale guards, manifest validation, sanitizer state, and explicit unavailable/error states.
- [x] Keep `MushafPageViewer` pure and pass sanitized markup, viewBox, aspect ratio, label, status, and view mode through typed props.
- [x] Port Auto/Fit page/Fit width, RTL page progression, Home/End, jump input focus/canonicalization, edge/swap behavior where Svelte parity requires it.
- [x] Update stories/registry for loading, unavailable, error, unsafe-SVG, fit-width, fit-page, jump-input, focus-visible, mobile/tablet/desktop, light/sepia/dark, and night mode where relevant.

### Task 3: Production Route And Missing-Pack Proof

**Files:**
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `docs/context/surfaces/read.md` if proof ownership changes
- Modify: `docs/context/surfaces/infra.md` if cache behavior changes
- Modify: `docs/context/style-map.md` if proof ownership changes

- [x] Add production Svelte-vs-React assertions that `#/m/1` requests the real manifest/SVG, renders inline SVG with viewBox/body, omits placeholder UI, and preserves page/control geometry at mobile, tablet portrait, tablet landscape, and desktop.
- [x] Add missing active page-pack proof that React shows install/unavailable state instead of loading Qalun under another active label.
- [ ] Run:

```bash
pnpm exec vitest run tests/unit/react-packs tests/unit/react-read --config vitest.react.config.ts
pnpm run check:react-mushaf-assets
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "mushaf-ready"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Tests To Write First

- Unit: Mushaf path helper returns `/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/...` for baseline Qalun.
- Unit: manifest validation rejects riwayah or edition mismatches.
- Unit: `useMushafPageAsset` accepts `AbortSignal`, guards stale page swaps by request id, and treats abort separately from real failure.
- Unit/component: pure `MushafPageViewer` renders sanitized real SVG markup passed by props and never renders placeholder label in production-target states.
- Unit/component: sanitizer rejects unsafe SVG and reports an unavailable/error state without injecting markup.
- Component/story: `MushafPageViewer`, `MushafModeControl`, and `ReaderAssetGate` define variant props, state props, density props, slot ownership, and stable dimensions before styling work.
- E2E: the same seeded Svelte and React `#/m/1` workflow requests the real manifest/SVG page, renders inline SVG with viewBox/body, and omits placeholder UI.
- E2E: page mode controls and jump input follow Svelte focus/canonicalization behavior using roles and accessible names.
- E2E: missing active page pack shows install/unavailable state instead of loading Qalun under another label.
- Responsive proof: SVG viewBox aspect ratio is preserved, page edges are not clipped, controls do not cover the page, and fit-width/fit-page modes keep stable dimensions across mobile, tablet portrait, tablet landscape, and desktop.

Expected before implementation: tests fail on placeholder SVG and missing asset requests.

## React Styling Contract

- Use only React semantic-token `qar:` utilities, owned recipes, and component variants. Do not import/copy Svelte CSS partials or `.qa-*` classes.
- Keep Mushaf page sizing and controls behind owned component style APIs: status variants, view-mode variants, density, page aspect-ratio containment, and stable toolbar/control dimensions.
- `MushafPageViewer` remains pure and receives sanitized SVG/viewBox/aspect ratio/status props; styling must not depend on raw SVG internals beyond approved token recoloring.
- Update `component-registry.json`, reader/Mushaf stories, and tests for default, loading, unavailable, error, unsafe-SVG, fit-width, fit-page, jump-input, focus-visible, mobile/tablet/desktop, light/sepia/dark, and night mode where relevant.

## Implementation Steps

- [x] Discover current `public/dataset/indexes/mushaf-assets.json` and manifest shape before coding.
- [x] Use edition-aware paths only. Do not revive legacy per-riwayah page paths for React.
- [x] Build URLs through approved path helpers, validate same-origin `/dataset/**`, and check index/manifest membership before fetch/cache insertion.
- [x] Keep `MushafRoute` and `ReaderAssetGate` responsible for active edition/page state.
- [x] Implement `useMushafPageAsset` for fetch, abort, stale-response guards, validation, and sanitizer result state.
- [x] Keep `MushafPageViewer` pure: sanitized SVG, viewBox, aspect ratio, labels, and status in; rendered page out.
- [x] Port Svelte view mode semantics: Auto, Fit page, Fit width.
- [x] Port page navigation semantics: RTL physical page progression, Home/End, edge zones, swipe behavior where browser proof exists.
- [x] Implement canonical page clamping against manifest page count.
- [x] Implement active asset gating and explicit missing/stale/offline states.
- [x] Ensure React production-target build contains no committed Mushaf page bodies.
- [x] Add responsive and token-resolved checks for `320x568`, `375x812`, `768x1024`, and `1280x900`.

## Commands

```bash
pnpm exec vitest run tests/unit/react-packs tests/unit/react-read --config vitest.react.config.ts
pnpm run check:react-mushaf-assets
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "mushaf-ready"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: Mushaf targeted tests pass and React no longer renders the placeholder in production-target preview.

## Documentation

- Update `docs/context/surfaces/read.md` if React dual-build Mushaf behavior is documented.
- Update `docs/context/surfaces/infra.md` if cache or service-worker asset behavior changes.
- Update `docs/context/style-map.md` for proof ownership.

## Acceptance Criteria

- `RPA-003` is closed.
- Real SVG page assets load from edition-aware paths.
- Placeholder SVG is absent from production-target builds.
- Missing asset states are explicit and do not silently substitute another riwayah.
