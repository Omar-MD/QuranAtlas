# React Production Parity Fix 04 - Navigation, Surah, Juz, And Bookmarks

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-004` by wiring React navigation, drawer, Surah/Juz lists, and bookmarks to real data and shared continuity storage.

**Depends on:** Plans 00, 01, and 02.

**Unblocks:** Plans 06 and 09.

## Required Context

Read:

- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/read.md`
- `docs/context/data-model.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/navigate/NavDrawer.svelte`
- `src/navigate/surahs/SurahList.svelte`
- `src/navigate/surahs/state.svelte.ts`
- `src/navigate/JuzList.svelte`
- `src/navigate/bookmarks/BookmarksList.svelte`
- `src/navigate/bookmarks/BookmarksPage.svelte`
- `src/navigate/bookmarks/store.ts`
- `src/navigate/bookmarks/click-handler.ts`
- `src/navigate/bookmarks/indicator.ts`
- `src/navigate/global-shortcuts.ts`

React target:

- `src-react/components/navigation/NavDrawer.tsx`
- `src-react/components/navigation/SurahList.tsx`
- `src-react/components/navigation/JuzList.tsx`
- `src-react/components/navigation/BookmarksList.tsx`
- `src-react/app/routes/navigation/SurahsRoute.tsx`
- `src-react/app/routes/navigation/BookmarksRoute.tsx`
- `src-react/components/reader/ReaderChrome.tsx`
- `src-react/continuity/bookmarks/**`
- `src-react/continuity/current-position.ts`

Tests:

- `tests/unit/react-navigate/navigation-wave3.test.tsx`
- `tests/unit/react-continuity/continuity-wave3.test.ts`
- `tests/e2e/navigate/react-golden.spec.ts`
- `tests/e2e/read/react-golden.spec.ts`

## Files To Modify

- `src-react/components/navigation/**`
- `src-react/app/routes/navigation/**`
- `src-react/components/reader/ReaderChrome.tsx`
- `src-react/continuity/bookmarks/**`
- `src-react/continuity/current-position.ts`
- `tests/unit/react-navigate/**`
- `tests/unit/react-continuity/**`
- `tests/e2e/navigate/react-golden.spec.ts`
- `tests/e2e/read/react-golden.spec.ts`
- `docs/context/surfaces/navigate.md`
- `docs/context/style-map.md`

## Tests To Write First

- Unit: Surah list data source returns all 114 rows from real metadata, not hardcoded rows.
- Unit: Juz list renders 30 rows and routes to Svelte-equivalent start references.
- Unit: bookmarks store reads/writes riwayah-scoped shared v7 records.
- Unit: `NavDrawerController` or equivalent reducer owns open/close, focus return target, close-on-navigation, Escape/outside-close, and route-transition state.
- Component: populated bookmark seed renders grouped bookmark rows and delete controls.
- E2E: the same seeded Svelte and React mobile reader workflow opens the drawer, traps focus, closes on Escape/outside action, locks body scroll, and restores focus.
- E2E: the same seeded Svelte and React Surah directory filter finds Al-Mulk and routes row tap to `#/s/67`.
- E2E: seeded bookmark appears in both Svelte and React, jumps to verse, and delete removes it.
- E2E: mobile `#/surahs` follows Svelte mobile behavior; desktop renders standalone directory.
- Responsive/style proof: drawer opener, drawer shell, source rail, Surah/Juz/bookmark rows, and row actions keep stable dimensions, tokenized touch targets, no horizontal overflow, and no label clipping at mobile, tablet, and desktop widths.

Expected before implementation: tests fail on static rows, inert drawer opener, and no seeded bookmarks.

## Implementation Steps

- [ ] Discover current Svelte mobile-vs-desktop route behavior for `#/surahs` and `#/bookmarks`.
- [ ] Inspect `src-react/design-system/registry/component-registry.json` and use approved `src-react/components/ui` primitives for drawer/sheet, buttons, segmented controls, and menus.
- [ ] Use only React semantic-token `qar:` utilities and owned variants; do not import/copy Svelte CSS or `.qa-*` classes.
- [ ] Extend owned `Sheet`/overlay variants first if Svelte parity requires side drawer, bottom sheet, route-surface sizing, or drawer density states.
- [ ] Update navigation stories/registry for default, loading, empty, populated, long-label, focus-visible, mobile/tablet/desktop, light/sepia/dark, and unavailable states touched by this plan.
- [ ] Implement a drawer controller hook/reducer for open state, focus return, Escape/outside close, body scroll lock, close-on-navigation, and route transition behavior.
- [ ] Wire React reader chrome navigation opener to `NavDrawer`.
- [ ] Replace hardcoded Surah rows with real metadata.
- [ ] Replace static bookmarks empty state with riwayah-scoped store reads.
- [ ] Add bookmark jump/delete behavior and landing pulse only as far as Svelte parity requires.
- [ ] Implement Juz rows from Quran boundary metadata; if React lacks a boundary loader, add a discovery step and use the Svelte/source-data contract.
- [ ] Ensure Daily Wird drawer slots are present but do not fake active plan state before Plan 06.
- [ ] Expand touch-target checks across all visible navigation controls, not only the first button.

## Commands

```bash
pnpm exec vitest run tests/unit/react-navigate tests/unit/react-continuity --config vitest.react.config.ts
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run build
pnpm run test:e2e:react:golden -- --grep "surah-directory|bookmarks-populated"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: navigation/bookmark targeted tests pass.

## Documentation

- Update `docs/context/surfaces/navigate.md` if current behavior or proof ownership changes.
- Update `docs/context/style-map.md` for React proof ownership.

## Acceptance Criteria

- `RPA-004` is closed.
- Surah/Juz/bookmark UI is real-data backed.
- Seeded bookmark state changes rendered output.
- Drawer opener works in production-target React preview.
