# React Production Parity Fix 02 - Reader Corpus, Translation, Metadata, And Verse Interaction Parity

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation.

**Goal:** Fix `RPA-002` for the Verse reader while preserving the React non-carry-over rule that Tafsir UI is not implemented.

**Depends on:** Plans 00 and 01.

**Unblocks:** Plans 04, 05, 06, and 09.

## Required Context

Read:

- `docs/context/surfaces/read.md`
- `docs/context/surfaces/configure.md`
- `docs/context/source-data-flow.md`
- `docs/context/data-model.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-audit.md`
- `docs/superpowers/specs/2026-05-24-react-production-parity-fix-master-spec.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`

## Files To Inspect

Svelte oracle:

- `src/read/Reader.svelte`
- `src/read/Verse.svelte`
- `src/read/SurahHeader.svelte`
- `src/read/SurahProgress.svelte`
- `src/read/translation-tokens.ts`
- `src/read/verse-tap-gestures.ts`
- `src/read/position.ts`
- `src/read/scroll-tracker.ts`
- `src/read/tafsir-state.svelte.ts` only to remove or avoid React Tafsir UI assumptions
- `src/data/**`
- `src/metadata/knowledge.ts`
- `src/configure/panel-bridge.ts`

React target:

- `src-react/app/routes/read/ReaderRoute.tsx`
- `src-react/components/reader/ReaderPageShell.tsx`
- `src-react/components/reader/VirtualVerseList.tsx`
- `src-react/components/reader/VerseBlock.tsx`
- `src-react/components/reader/VerseNumber.tsx`
- `src-react/components/reader/TranslationFootnote.tsx`
- `src-react/components/reader/TafsirPreview.tsx`
- `src-react/components/reader/TafsirSheet.tsx`
- `src-react/components/reader/metadata/**`
- `src-react/data/reader-corpus.ts`
- `src-react/data/verse-aliases.ts`
- `src-react/metadata/**`
- Any new reader hooks under `src-react/components/reader/**` or `src-react/data/**` named by implementation, such as `useReaderCorpus`, `useReaderSettings`, `useVerseInteractionReducer`, and `useReaderPositionSync`

Tests:

- `tests/unit/react-read/reader-wave3.test.tsx`
- `tests/unit/react-metadata/metadata-wave3.test.tsx`
- `tests/e2e/read/react-golden.spec.ts`
- `tests/e2e/fixtures/react-golden-routes.ts`

## Files To Modify

- `src-react/data/reader-corpus.ts`
- `src-react/data/verse-aliases.ts`
- `src-react/metadata/**`
- `src-react/app/routes/read/ReaderRoute.tsx`
- `src-react/components/reader/ReaderPageShell.tsx`
- `src-react/components/reader/VirtualVerseList.tsx`
- `src-react/components/reader/VerseBlock.tsx`
- `src-react/components/reader/VerseNumber.tsx`
- `src-react/components/reader/TranslationFootnote.tsx`
- Remove React reader route/component graph usage of `TafsirPreview.tsx` and `TafsirSheet.tsx`; do not production-disable behind a flag
- `tests/unit/react-read/**`
- `tests/unit/react-metadata/**`
- `tests/e2e/read/react-golden.spec.ts`
- `docs/context/surfaces/read.md`
- `docs/context/style-map.md`

## Readiness Refinement

- Execute only after Plans 00 and 01, so reader tests run from an onboarded, production-target React context.
- Test-first checkpoint: write loader/component/e2e assertions for real Surah data, no fallback preview verses, and no Tafsir UI, run them against the current React build, and confirm the expected `RPA-002` failures before app edits.
- Svelte-vs-React comparison covers dataset URLs, verse count, Arabic snippets, translation snippets, footnote behavior, metadata non-blocking behavior, position updates, responsive reader chrome, and explicit absence of React Tafsir controls.
- Production-target verification must build Svelte and React, serve both through the Plan 00 harness, and fail on required dataset request failures or hardcoded fallback provenance.
- CSS/React styling enforcement: define component style APIs before visible styling, use only React semantic-token utilities, owned recipes, or owned `src-react/design-system/**` component classes, update registry/stories/tests for changed reader states, and never import/copy Svelte CSS or `.qa-*` classes.
- Responsive/style proof must use `320x568`, `375x812`, `768x1024`, and `1280x900`, plus computed-style/CSS-variable assertions that touched reader `qar:` utilities resolve through `--qa-react-*` semantic tokens for canvas, surface, text, muted text, border, focus, accent, selection, danger, and reader-specific states.
- Docs updates must keep `docs/context/surfaces/read.md` and `docs/context/style-map.md` current when behavior, proof ownership, or visual proof ownership changes; do not document Tafsir as a React reader feature.
- Before implementation, use `.agents/skills/child-plan-handover/SKILL.md` to reconcile this plan against `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`, current `git status`, and any newer sibling-plan entries.

## Implementation Task Plan

### Task 1: Dataset Loader And Fallback Removal

**Files:**
- Modify: `src-react/data/reader-corpus.ts`
- Modify: `src-react/data/verse-aliases.ts`
- Modify: `src-react/metadata/**`
- Test: `tests/unit/react-read/**`
- Test: `tests/unit/react-metadata/**`

- [x] Write failing unit tests for the current wrong Quran text path, fallback-verse return, alias loading, abort handling, stale request guarding, and missing required data state.
- [x] Implement typed loader states: `idle`, `loading`, `ready`, `unavailable`, `error`, and `aborted` where useful.
- [x] Build URLs only through approved same-origin `/dataset/**` helpers and validate generated text/translation/metadata shapes against the discovered `public/dataset/**` contract.
- [x] Run:

```bash
pnpm exec vitest run tests/unit/react-read tests/unit/react-metadata --config vitest.react.config.ts
```

### Task 2: Reader Component State And Tafsir Exclusion

**Files:**
- Modify: `src-react/app/routes/read/ReaderRoute.tsx`
- Modify: `src-react/components/reader/ReaderPageShell.tsx`
- Modify: `src-react/components/reader/VirtualVerseList.tsx`
- Modify: `src-react/components/reader/VerseBlock.tsx`
- Modify: `src-react/components/reader/VerseNumber.tsx`
- Modify: `src-react/components/reader/TranslationFootnote.tsx`
- Remove route/component graph usage of `src-react/components/reader/TafsirPreview.tsx` and `src-react/components/reader/TafsirSheet.tsx`
- Modify: reader story and registry entries

- [x] Write failing component tests for 7 rendered Al-Fatihah verses, standalone Bismillah, translation visibility, footnotes, verse selection, and absent Tafsir controls.
- [x] Define or update style APIs for `VerseBlock`, `VirtualVerseList`, `ReaderAssetGate`, and touched reader chrome before visible styling work.
- [x] Keep route files as containers and move durable interaction state into hooks/reducers such as `useReaderCorpus`, `useReaderSettings`, `useVerseInteractionReducer`, and `useReaderPositionSync`.
- [x] Update Storybook states for loading, unavailable, error, selected, footnote-open, long text, dense ayah, focus-visible, responsive tiers, light/sepia/dark, and night mode where relevant.

### Task 3: Production Parity And Responsive Proof

**Files:**
- Modify: `tests/e2e/read/react-golden.spec.ts`
- Modify: `tests/e2e/fixtures/react-golden-routes.ts`
- Modify: `docs/context/surfaces/read.md` if proof ownership changes
- Modify: `docs/context/style-map.md` if proof ownership changes

- [x] Add Svelte-vs-React production assertions for Surah 1 verse count, Arabic snippets, translation snippets, footnotes, no preview copy, no required request failures, and no React Tafsir UI.
- [x] Add measured responsive and token-resolved checks for dense ayah content and long translation/footnotes at `320x568`, `375x812`, `768x1024`, and `1280x900`.
- [x] Run:

```bash
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "reader-surah-start|reader-ayah-deeplink"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

## Tests To Write First

- Unit: `loadReaderSurah` requests `/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json` or the active Svelte-equivalent text style, not `/uthmani/001.json`.
- Unit: production reader loader throws or returns an explicit unavailable state on missing text; it must not return `FALLBACK_VERSES`.
- Unit: translation alias resolution uses `_verse-aliases.json` for `qaloon` and `warsh`.
- Unit: reader hooks/loaders accept `AbortSignal`, guard state commits by request id, and treat abort separately from real failure.
- Unit: rapid Surah, riwayah, text-style, translation-visibility, font, and container-width changes keep externally owned verse interaction state stable while the single-surah React list remains in normal document scroll.
- Component: Surah 1 renders 7 verses, standalone Bismillah behavior, translation visibility, footnote buttons, and verse interaction state.
- Component: Tafsir UI controls are absent in React production target.
- Component/story: `VerseBlock`, `VirtualVerseList`, `ReaderAssetGate`, and reader chrome states define variants/state props/density props/slots before styling work.
- Responsive e2e/component proof: dense ayah content, long translation/footnote text, selected verse controls, and font-size changes at `320x568`, `375x812`, `768x1024`, and `1280x900` have no overflow, clipping, overlap, layout shift, or non-semantic token drift.
- E2E: the same seeded Svelte and React Surah 1 workflow agree on verse count, visible Arabic snippets, translation snippets, and no preview fallback copy.
- E2E: failed required dataset requests fail the test and rendered content must be derived from fetched JSON, not hardcoded fallback.

Expected before implementation: tests fail due to preview verses, wrong dataset path, silent fallback, and Tafsir UI mismatch.

## React Styling Contract

- Use only React semantic-token utilities, owned recipes/design-system component classes, and component variants. Do not import/copy Svelte CSS partials or `.qa-*` classes.
- Define style APIs before implementation for `VerseBlock`, `VirtualVerseList`, `ReaderAssetGate`, and any reader chrome touched by this plan: variant props, state props, density props, slot ownership, and stable action/control slots.
- Use `class-variance-authority` for new style variants where it matches existing React UI conventions.
- Route files pass typed state into product components/recipes; they must not compose raw Tailwind layouts for loading/error/ready/selected states.
- Update `component-registry.json`, reader stories, and component tests for changed states: default, loading, unavailable, error, selected, footnote-open, long-text, dense ayah, focus-visible, mobile/tablet/desktop, light/sepia/dark, and night mode where relevant.
- Use measured checks for stable reader chrome heights, tokenized touch targets, no row width shift across loading/error/ready states, and long-label wrapping.

## Implementation Steps

- [x] Discover the exact runtime shape of the generated Quran text and translation JSON files under `public/dataset/**`; do not invent schema.
- [x] Implement reusable typed reader loaders/hooks rather than ad hoc route-component fetches.
- [x] Replace hardcoded preview fallback with a typed data state: idle, loading, ready, unavailable, error, and aborted where useful.
- [x] Ensure every loader accepts `AbortSignal`, uses stable cache keys, and guards stale responses.
- [x] Use active settings for `riwayah`, `quranTextStyleId`, `translationId`, and `translationVisible`.
- [x] Load real Quran text and translation data from same-origin `/dataset/**` paths validated by `assertRuntimeDatasetUrl`.
- [x] Implement translation alias handling for Qalun and Warsh.
- [x] Keep `VirtualVerseList` responsible only for verse-list rendering. Verse interaction state must live outside rows.
- [x] Use stable verse keys and normal document scroll while React reader parity is active; reintroduce measured virtualization only with browser proof that scrolling cannot lock or jump.
- [x] Sync current position through a throttled or `requestAnimationFrame` hook such as `useReaderPositionSync`.
- [x] Preserve Svelte reader interactions that remain in React scope: translation visibility, footnotes, verse selection/knowledge lane, semantic bookmark callback seams, position updates, and accessible verse controls.
- [x] Keep bookmark persistence, drawer/list rendering, and bookmark-specific tests owned by Plan 04.
- [x] Remove React Tafsir preview/sheet affordances from route/action contracts and reader component graph. Tests must assert no visible controls and no production imports from reader routes.
- [x] Keep metadata optional and non-blocking like Svelte; missing metadata must not replace base verse rendering.
- [x] Update React golden fixture assertions so daily-wird tests no longer pass on a generic reader main landmark.

## Commands

```bash
pnpm exec vitest run tests/unit/react-read tests/unit/react-metadata --config vitest.react.config.ts
pnpm run build
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run test:e2e:react:golden -- --grep "reader-surah-start|reader-ayah-deeplink"
pnpm run check:react
pnpm run check:react-registry
pnpm run check:react-ui-patterns
pnpm run build:storybook:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

Expected final result: reader targeted tests pass; Mushaf, navigation, settings, Daily Wird, search, and offline parity may still fail.

## Documentation

- Update `docs/context/surfaces/read.md` with React dual-build proof ownership only if current docs track React behavior.
- Update `docs/context/style-map.md` for proof/test ownership changes.
- Do not document Tafsir as a React reader feature.

## Acceptance Criteria

- `RPA-002` is closed.
- Production-target React reader does not render preview fallback verses.
- Wrong dataset paths are fixed.
- React intentionally omits Tafsir reader/fullscreen modes.
