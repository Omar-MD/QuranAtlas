# React Cutover And Svelte Removal Plan

## Status

React parity is complete for the current MVP scope. The remaining work is no
longer feature parity; it is production-entry routing, soak, and removal of the
retained Svelte app.

Verified in the current working tree:

- `pnpm run check:react`
- `pnpm run check:react-registry`
- `pnpm run check:react-ui-patterns`
- `pnpm run check:react-mushaf-assets`
- `pnpm run build:react`
- `pnpm exec vitest run --config vitest.react.config.ts --reporter=verbose`
- `pnpm run test:e2e:react`
- `pnpm run test:e2e:react:offline`
- `pnpm run visual:react`
- `pnpm run build:storybook:react`
- `pnpm run test:storybook:react`
- `pnpm run check`
- `pnpm run docs:check`
- `git diff --check`

## Remaining Plan 1: Production Entry Flip

Goal: make React the app emitted by the production build while keeping Svelte as
a rollback path.

- [ ] Add `build:svelte` and `preview:svelte` rollback scripts.
- [ ] Change `pnpm run build` so it builds the React production app into
  `dist/`.
- [ ] Keep `build:react` and `preview:react` available for explicit React proof
  while the cutover is landing.
- [ ] Add or update a guarded production artifact step that copies only approved
  public runtime assets into `dist/`: `/dataset/**`, fonts, icons, manifest,
  favicon, and headers.
- [ ] Promote React PWA/service-worker cache names out of proof-only naming and
  add rollback-safe cleanup for the old app shell caches.
- [ ] Update CI and deploy workflow routing if the build command or artifact
  layout changes.
- [ ] Update `docs/tech-stack.md`, `docs/context/architecture.md`,
  `docs/context/repo-structure.md`, `docs/context/source-data-flow.md`,
  `docs/context/implemented.md`, AGENTS, and repo-local skills.
- [ ] Run `pnpm run validate:react`, production `pnpm run build`,
  `pnpm run docs:check`, and `git diff --check`.

## Remaining Plan 2: React Soak

Goal: prove the React production entry under real branch deployments before
deleting rollback source.

- [ ] Deploy the React production artifact to `dev`.
- [ ] Smoke Verse reader, Mushaf reader, Settings, About, launch restore,
  bookmarks, Daily Wird, Surah/Juz/Hizb navigation, default asset inventory, and
  offline reload.
- [ ] Verify service-worker upgrade from the retained Svelte app shell to React
  without losing compatible `/dataset/**` caches.
- [ ] Deploy to `staging` after the dev smoke passes.
- [ ] Repeat the same smoke checklist on `staging`.
- [ ] Record rollback policy: revert the production-entry commit while Svelte is
  retained.

## Remaining Plan 3: Svelte Removal

Goal: delete Svelte once React is soaked and rollback can rely on git history or
a tagged release.

- [ ] Create a Svelte-only inventory before deleting files.
- [ ] Delete inventory-approved Svelte runtime source and Svelte-only tests.
- [ ] Remove Svelte dependencies, scripts, Vite config, lint/typecheck config,
  and Svelte-specific style checks.
- [ ] Regenerate context docs and remove current-state Svelte workflow language.
- [ ] Preserve `data/**`, `public/dataset/**`, `public/fonts/**`,
  `public/icons/**`, `scripts/data/**`, and compatibility dataset paths.
- [ ] Run full React production validation and docs checks after removal.

## Deferred Product Work

Full-text search remains planned work outside the current React parity cutoff.
The production candidate preserves the current unsupported/search-route contract
instead of claiming search is shipped.
