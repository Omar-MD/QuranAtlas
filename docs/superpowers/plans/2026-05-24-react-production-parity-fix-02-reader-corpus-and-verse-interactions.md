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

## Tests To Write First

- Unit: `loadReaderSurah` requests `/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json` or the active Svelte-equivalent text style, not `/uthmani/001.json`.
- Unit: production reader loader throws or returns an explicit unavailable state on missing text; it must not return `FALLBACK_VERSES`.
- Unit: translation alias resolution uses `_verse-aliases.json` for `qaloon` and `warsh`.
- Unit: reader hooks/loaders accept `AbortSignal`, guard state commits by request id, and treat abort separately from real failure.
- Unit: rapid Surah, riwayah, text-style, translation-visibility, font, and container-width changes reset or remeasure virtualization without losing externally owned verse interaction state.
- Component: Surah 1 renders 7 verses, standalone Bismillah behavior, translation visibility, footnote buttons, and verse interaction state.
- Component: Tafsir UI controls are absent in React production target.
- Component/story: `VerseBlock`, `VirtualVerseList`, `ReaderAssetGate`, and reader chrome states define variants/state props/density props/slots before styling work.
- Responsive e2e/component proof: dense ayah content, long translation/footnote text, selected verse controls, and font-size changes at `320x568`, `768x1024`, and `1280x900` have no overflow, clipping, overlap, or layout shift.
- E2E: the same seeded Svelte and React Surah 1 workflow agree on verse count, visible Arabic snippets, translation snippets, and no preview fallback copy.
- E2E: failed required dataset requests fail the test and rendered content must be derived from fetched JSON, not hardcoded fallback.

Expected before implementation: tests fail due to preview verses, wrong dataset path, silent fallback, and Tafsir UI mismatch.

## React Styling Contract

- Use only React semantic-token `qar:` utilities, owned recipes, and component variants. Do not import/copy Svelte CSS partials or `.qa-*` classes.
- Define style APIs before implementation for `VerseBlock`, `VirtualVerseList`, `ReaderAssetGate`, and any reader chrome touched by this plan: variant props, state props, density props, slot ownership, and stable action/control slots.
- Use `class-variance-authority` for new style variants where it matches existing React UI conventions.
- Route files pass typed state into product components/recipes; they must not compose raw Tailwind layouts for loading/error/ready/selected states.
- Update `component-registry.json`, reader stories, and component tests for changed states: default, loading, unavailable, error, selected, footnote-open, long-text, dense ayah, focus-visible, mobile/tablet/desktop, light/sepia/dark, and night mode where relevant.
- Use measured checks for stable reader chrome heights, tokenized touch targets, no row width shift across loading/error/ready states, and long-label wrapping.

## Implementation Steps

- [ ] Discover the exact runtime shape of the generated Quran text and translation JSON files under `public/dataset/**`; do not invent schema.
- [ ] Implement reusable typed reader loaders/hooks rather than ad hoc route-component fetches.
- [ ] Replace hardcoded preview fallback with a typed data state: idle, loading, ready, unavailable, error, and aborted where useful.
- [ ] Ensure every loader accepts `AbortSignal`, uses stable cache keys, and guards stale responses.
- [ ] Use active settings for `riwayah`, `quranTextStyleId`, `translationId`, and `translationVisible`.
- [ ] Load real Quran text and translation data from same-origin `/dataset/**` paths validated by `assertRuntimeDatasetUrl`.
- [ ] Implement translation alias handling for Qalun and Warsh.
- [ ] Keep `VirtualVerseList` responsible only for virtualization and measurement. Verse interaction state must live outside virtual rows.
- [ ] Use stable verse keys and remeasure/reset virtualization when riwayah, text style, translation visibility, font size, or container width changes.
- [ ] Sync current position through a throttled or `requestAnimationFrame` hook such as `useReaderPositionSync`.
- [ ] Preserve Svelte reader interactions that remain in React scope: translation visibility, footnotes, verse selection/knowledge lane, semantic bookmark callback seams, position updates, and accessible verse controls.
- [ ] Keep bookmark persistence, drawer/list rendering, and bookmark-specific tests owned by Plan 04.
- [ ] Remove React Tafsir preview/sheet affordances from route/action contracts and reader component graph. Tests must assert no visible controls and no production imports from reader routes.
- [ ] Keep metadata optional and non-blocking like Svelte; missing metadata must not replace base verse rendering.
- [ ] Update React golden fixture assertions so daily-wird tests no longer pass on a generic reader main landmark.

## Commands

```bash
pnpm exec vitest run tests/unit/react-read tests/unit/react-metadata --config vitest.react.config.ts
VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react
pnpm run build
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
