# React Production Parity Fix 05 - Settings And Asset Management

> Superseded current-state note: `docs/superpowers/specs/2026-05-28-mvp-default-assets-reset-design.md` narrows Settings and Asset Management parity to the default Qaloon + Bridges profile. Source pickers, tafsir choices, optional Hafs/Warsh packs, and install/verify/activate/remove controls are not current MVP guidance.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-005` by making React settings and asset management operational, persistent, route-compatible, and real-index/cache backed.

**Depends on:** Plans 00, 01, 02, and 03.

**Unblocks:** Plan 09.

## Required Context

Read:

- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/infra.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/configure/settings/SettingsShell.svelte`
- `src/configure/settings/VerseSettings.svelte`
- `src/configure/settings/MushafSettings.svelte`
- `src/configure/settings/NestedAssetPicker.svelte`
- `src/configure/assets/AssetManagement.svelte`
- `src/configure/assets/asset-view-model.ts`
- `src/configure/panel-bridge.ts`
- `src/configure/variant-bundle.ts`
- `src/configure/theme.ts`
- `src/configure/night-mode.ts`
- `src/configure/reading-typography.ts`
- `src/configure/font-size.ts`
- `src/data/offline.ts`

React target:

- `src-react/app/routes/settings/SettingsRoute.tsx`
- `src-react/app/routes/settings/AssetsRoute.tsx`
- `src-react/components/settings/SettingsShell.tsx`
- `src-react/components/settings/VerseSettings.tsx`
- `src-react/components/settings/MushafSettings.tsx`
- `src-react/components/settings/SourcePicker.tsx`
- `src-react/components/offline/AssetManagementPage.tsx`
- `src-react/components/sources/AssetRow.tsx`
- `src-react/storage/settings-writer.ts`
- `src-react/offline/**`
- `src-react/packs/**`

Tests:

- `tests/unit/react-navigate/navigation-wave3.test.tsx`
- `tests/unit/react-offline/**`
- `tests/unit/react-storage/**`
- `tests/e2e/configure/react-golden.spec.ts`

## Files To Modify

- `src-react/app/routes/settings/SettingsRoute.tsx`
- `src-react/app/routes/settings/AssetsRoute.tsx`
- `src-react/components/settings/**`
- `src-react/components/offline/**`
- `src-react/components/sources/**`
- `src-react/storage/**`
- `src-react/offline/**`
- `tests/unit/react-offline/**`
- `tests/unit/react-storage/**`
- `tests/e2e/configure/react-golden.spec.ts`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md` only if scripts/tooling change

## Readiness Refinement

- Execute only after Plans 00, 01, 02, and 03 so launch, reader, and asset path contracts exist.
- Test-first checkpoint: write persistence, transient route, asset-index/cache, no-preview, and responsive assertions, run them against the current React production-target build, and confirm failures on standalone/local/static behavior before app edits.
- Svelte-vs-React comparison covers `#/settings` route restore, mode-aware shell behavior, persisted settings effects on reader, asset row derivation, install/verify/delete/set-active state, and the intentional absence of live verse/Mushaf previews in React.
- Production-target verification must build and serve both artifacts through the Plan 00 harness; Storybook and component tests support state coverage but do not replace route parity.
- CSS/React styling enforcement: inspect registry first, extend owned Sheet/Dialog/settings/asset-row variants before feature styling, use `qar:` semantic-token utilities only, update stories/registry/tests, and never import/copy Svelte CSS or `.qa-*` classes.
- Responsive/style proof must use `320x568`, `375x812`, `768x1024`, and `1280x900`, plus computed-style/CSS-variable assertions that settings and asset-row `qar:` utilities resolve through `--qa-react-*` semantic tokens for canvas, surface, text, muted text, border, focus, accent, selected, disabled, warning, and danger states.
- Docs updates must land in `docs/context/surfaces/configure.md`, `docs/context/surfaces/infra.md` for cache behavior, `docs/context/style-map.md` for proof ownership, and `docs/tech-stack.md` for script/tooling changes.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Settings Route Restore And Persistent Form State

**Files:**
- Modify: `src-react/app/routes/settings/SettingsRoute.tsx`
- Modify: `src-react/components/settings/SettingsShell.tsx`
- Modify: `src-react/components/settings/VerseSettings.tsx`
- Modify: `src-react/components/settings/MushafSettings.tsx`
- Modify: `src-react/components/settings/SourcePicker.tsx`
- Modify: `src-react/storage/**`
- Test: `tests/unit/react-storage/**`
- Test: `tests/e2e/configure/react-golden.spec.ts`

- [ ] Write failing tests for `#/settings` transient restore, settings not becoming `lastSurface`, persisted toggles/sliders/source choices, and absence of live verse/Mushaf preview panes.
- [ ] Implement `useSettingsForm` or equivalent provider/reducer initialized from storage with dirty, loading, error, compatibility failure, commit, reset, close, focus trap, Escape/outside close, body scroll lock, and focus return states.
- [ ] Use only storage facades and active bundle writer for persisted settings; route files stay containers.

### Task 2: Asset Index And Cache-Backed Management

**Files:**
- Modify: `src-react/app/routes/settings/AssetsRoute.tsx`
- Modify: `src-react/components/offline/AssetManagementPage.tsx`
- Modify: `src-react/components/sources/AssetRow.tsx`
- Modify: `src-react/offline/**`
- Modify: `src-react/packs/**`
- Test: `tests/unit/react-offline/**`

- [ ] Write failing tests that rows derive from `text-assets.json`, `mushaf-assets.json`, `source-assets.json`, and Cache Storage membership instead of static labels.
- [ ] Implement `useAssetIndexes` and `useOfflineAssetState` or equivalents; components must not call `caches` directly.
- [ ] Enforce install/verify-before-activate, block active optional deletes before cache mutation, block overlapping contradictory actions per asset, and validate same-origin `/dataset/**` URLs.
- [ ] Implement Back to Reader and Manage Assets transitions to match Svelte.

### Task 3: Settings And Asset UI Proof

**Files:**
- Modify: settings/offline/source stories and registry entries
- Modify: `tests/e2e/configure/react-golden.spec.ts`
- Modify: `docs/context/surfaces/configure.md` if behavior/proof ownership changes
- Modify: `docs/context/surfaces/infra.md` if cache behavior changes
- Modify: `docs/context/style-map.md` if proof ownership changes

- [ ] Extend owned Sheet/Dialog/settings-row/asset-row variants before feature styling and update stories for settings shell, source picker, asset rows, and asset management states.
- [ ] Add responsive and token-resolved e2e checks for `320x568`, `375x812`, `768x1024`, and `1280x900`: footer reachability, sticky header/footer overlap, body scroll lock, row label wrapping, action button touch targets, semantic state colors, and no horizontal overflow.
- [ ] Run:

```bash
pnpm exec vitest run tests/unit/react-storage tests/unit/react-offline tests/unit/react-navigate --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "settings-over-reader|assets-state-matrix"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Intentional Difference

React Settings must not carry Svelte live verse preview or Mushaf page preview. Tests should assert that settings remain operational without those preview panes.

## React Component Contract

- Inspect `src-react/design-system/registry/component-registry.json` before editing and compose approved primitives from `src-react/components/ui`.
- Use only React semantic-token `qar:` utilities, owned recipes, and component variants. Do not import/copy Svelte CSS partials or `.qa-*` classes.
- Settings route files are containers; persistent settings reads/writes live in hooks/providers/storage facades.
- Use a `useSettingsForm` reducer/provider initialized from storage. It owns field state, dirty state, loading/error state, compatibility failures, commit, reset, and close behavior.
- Toggles, sliders, and pickers are controlled components.
- Active bundle changes use install/verify-before-activate and commit atomically through the active bundle writer.
- Asset management uses `useAssetIndexes` and `useOfflineAssetState` or equivalents; components do not call `caches` directly.
- Async install/delete/verify actions accept `AbortSignal`, block overlapping contradictory actions for the same asset, and guard state commits by request id.
- Settings sheets/dialogs own focus trap, Escape, outside-close, body scroll lock, route restore, and focus return.
- Extend owned `Sheet`/Dialog and settings/asset row variants first if Svelte parity requires side shell, full-height mobile sheet, destructive state, compact rows, or route-surface sizing.
- Record the no-preview settings shell as an intentional non-carry-over visual difference and name one active reference source before implementation.
- Update registry entries and stories for settings, source picker, asset rows, and asset management states touched by this plan.

## Tests To Write First

- Unit: settings writer persists `translationVisible`, typography settings, theme, night mode, active bundle, translation, and Mushaf view mode through React storage.
- Unit: `#/settings` route resolves previous reader hash and does not persist itself as last surface.
- Unit: asset rows derive from `text-assets.json`, `mushaf-assets.json`, `source-assets.json`, and Cache Storage membership.
- Unit: active optional asset delete is blocked before cache mutation, and active asset changes are blocked until exact indexed assets are installed or verified usable.
- Unit: concurrent install/delete/verify operations cannot corrupt row state.
- E2E: the same seeded Svelte and React `#/settings` workflow opens over/restores reader route, traps focus, restores focus, and omits preview panes.
- E2E: toggling Show Translation persists and updates reader after closing settings.
- E2E: the same seeded Svelte and React `#/assets` workflow shows grouped operational rows and Back to Reader.
- E2E: install/verify/delete/set-active states are real-index/cache derived, not static labels.
- E2E responsive: settings shell without preview panes fits at `320x568`, `375x812`, `768x1024`, and `1280x900`; footer actions remain reachable; body scroll lock holds; focused controls are not hidden under sticky header/footer; rows and picker labels do not clip.
- E2E responsive: asset management at mobile/tablet/desktop has no horizontal page overflow; desktop table columns do not collapse action labels; mobile rows keep action buttons at minimum touch target size.

Expected before implementation: tests fail because settings are standalone/local and assets are static.

## Implementation Steps

- [ ] Discover exact Svelte route restoration for `#/settings` from current app behavior.
- [ ] Replace local-only React state controls with the controlled `useSettingsForm` model and persisted storage writers.
- [ ] Remove settings live verse and Mushaf preview UI from React.
- [ ] Implement source pickers for Riwayah, Quran text style, Mushaf edition, and Translation using real compatibility data.
- [ ] Keep Tafsir out of React settings UI unless a hidden data contract is needed for migration; no user-facing Tafsir control.
- [ ] Build asset management view-model from real indexes and cache status through reusable hooks/loaders, with same-origin `/dataset/**` validation.
- [ ] Implement Back to Reader and Manage Assets route transitions.
- [ ] Fail visibly on unavailable/stale assets instead of claiming operational status.

## Commands

```bash
pnpm exec vitest run tests/unit/react-storage tests/unit/react-offline tests/unit/react-navigate --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "settings-over-reader|assets-state-matrix"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: settings/assets targeted tests pass.

## Documentation

- Update `docs/context/surfaces/configure.md` if React dual-build behavior or proof ownership is tracked.
- Update `docs/context/surfaces/infra.md` for asset-cache behavior changes.
- Update `docs/context/style-map.md` for proof ownership.

## Acceptance Criteria

- `RPA-005` is closed.
- Settings route is transient/restorative like Svelte.
- Settings persist through shared storage.
- React settings intentionally omit live verse/Mushaf previews.
- Asset management is operational and real-state backed.
