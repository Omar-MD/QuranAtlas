# React Production Cutover And Svelte Removal Spec

## Purpose

React is the production candidate for QuranAtlas. The current React app now owns
the Reader First MVP parity target: Verse reader, Mushaf reader, bookmarks,
saved position, Daily Wird, Surah/Juz/Hizb navigation, Settings, About, launch
restore, default asset inventory, accessibility basics, and offline proof for
the default Qaloon + Bridges profile.

This spec replaces the old dated React migration waves and parity recovery
plans. Those files were historical execution scaffolding and are no longer
active planning inputs.

## Current State

- `src-react/**` is the active implementation target and production candidate.
- `pnpm run build` still emits the retained Svelte production artifact until the
  explicit cutover task flips build/deploy routing.
- `dist-react/` remains the React production-candidate proof artifact before
  cutover.
- Svelte is no longer the product oracle for new work. It remains in the repo
  only until production cutover and rollback policy are complete.
- Full-text search remains deferred from the current MVP runtime. React parity
  preserves the unsupported/search-route contract rather than claiming shipped
  search.

## Readiness Evidence

Latest React readiness evidence from the current working tree:

| Gate | Result |
| --- | --- |
| React static checks | `pnpm run check:react` passed |
| React registry check | `pnpm run check:react-registry` passed |
| React UI pattern check | `pnpm run check:react-ui-patterns` passed |
| React Mushaf asset checks | `pnpm run check:react-mushaf-assets` passed |
| React production build | `pnpm run build:react` passed |
| React unit/component tests | `pnpm exec vitest run --config vitest.react.config.ts --reporter=verbose` passed: 26 files / 142 tests |
| React route/a11y/offline preview parity | `pnpm run test:e2e:react` passed: 38 tests, 1 skipped |
| React offline production proof | `pnpm run test:e2e:react:offline` passed: 1 test |
| React visual regression | `pnpm run visual:react` passed: 2 tests |
| React Storybook build | `pnpm run build:storybook:react` passed |
| React Storybook tests | `pnpm run test:storybook:react` passed: 8 files / 24 tests |
| Retained Svelte/source checks | `pnpm run check` passed |
| Docs and whitespace | `pnpm run docs:check` and `git diff --check` passed |

`pnpm run validate:react` remains the pre-cutover composite gate because it also
includes visual regression and Storybook proof.

## Cutover Contract

The production cutover is one explicit change:

- make `pnpm run build` emit the React production artifact into `dist/`;
- preserve a `build:svelte` and `preview:svelte` rollback path until soak is
  complete;
- promote React service-worker/cache names from proof-only to production with a
  rollback-safe cache migration;
- keep same-origin `/dataset/**`, fonts, icons, manifest, and headers in the
  deploy artifact through an explicit allowlist;
- update CI and deploy workflow routing only if the artifact path or build
  command changes;
- update `docs/tech-stack.md`, context docs, AGENTS, and repo-local skills in
  the same change.

Cutover is not complete until the React production artifact passes
`pnpm run validate:react`, a production `pnpm run build`, deploy-preview smoke,
and service-worker/offline smoke.

## Svelte Removal Contract

Remove Svelte only after the React production entry has soaked successfully and
rollback no longer depends on retained Svelte source.

Remove:

- Svelte runtime source and Svelte-only tests;
- Svelte-only dependencies, scripts, Vite config, lint/typecheck config, and
  style checks;
- current-state docs and workflow language that route new work to Svelte.

Preserve:

- `src-react/**`;
- shared/framework-neutral data contracts used by React;
- `data/**`, `public/dataset/**`, `public/fonts/**`, `public/icons/**`, and
  `scripts/data/**`;
- compatibility dataset paths unless a separate data migration spec owns them;
- git history or a tagged release for rollback.

## Acceptance Criteria

- React is the only active app entry in `pnpm run build`.
- React validation owns all retained product behavior.
- No active docs describe Svelte as the product oracle or future target.
- Svelte source and tooling are removed only after inventory and soak approval.
- Data/source contracts remain intact.
