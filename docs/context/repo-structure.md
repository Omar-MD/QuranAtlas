# Repo Structure

Current QuranAtlas is a React-only Vite PWA. This document names the source-of-truth directories for agentic development.

## Top Level

```text
.
├── .agents/        Repo-local Codex workflows and specialist skills
├── .github/        CI, setup action, and deploy workflows
├── .storybook/     React Storybook configuration
├── data/           Build-only source data and catalogs
├── docs/           Current-state architecture, surface, data, and workflow docs
├── public/         Static runtime assets copied into the app artifact
├── scripts/        Dataset, docs, checks, and build-support scripts
├── shared/         Framework-neutral contracts shared by app and scripts
├── src/            React application source
├── tests/          Vitest, Playwright, fixtures, and scoped AGENTS files
├── dist/           Generated production app output
├── storybook-static/ Generated Storybook output
└── test-output/    Generated Playwright output and traces
```

Generated directories are not authoritative for behavior: `dist/`, `storybook-static/`, `test-output/`, and `node_modules/`.

## `src/`

React app source lives here.

- `src/app/`: app entry, top-level router, route containers, and providers.
- `src/components/ui/`: owned UI primitive layer. Direct Radix imports are allowed only here.
- `src/components/reader/`: Verse and Mushaf reader presentation, reader chrome, interactions, and stories.
- `src/components/navigation/`: nav drawer, Surah/Juz/Hizb lists, bookmarks UI, and shortcuts.
- `src/components/settings/`: settings shell, Verse/Mushaf settings, asset inventory, and settings stories.
- `src/components/launch/`: launch splash presentation.
- `src/components/search/`: deferred search UI prototypes; not mounted by the shipped route contract.
- `src/design-system/`: semantic tokens, Tailwind theme, component registry, recipes, design-system docs, and global CSS entry.
- `src/storage/`: Dexie database, schema, settings writes, clear-data behavior, and storage error contracts.
- `src/continuity/`: last surface, current position, bookmarks, recent Surahs, Daily Wird, and launch restore helpers.
- `src/data/`: runtime dataset boundaries and reader corpus loaders for `/dataset/**`.
- `src/packs/`: Mushaf page indexes, asset paths, cache planning, and install-on-demand helpers.
- `src/offline/`: Cache Storage plans, PWA/service-worker message contracts, quota, and offline UI state.
- `src/metadata/`: optional knowledge/search metadata adapters.
- `src/search/`: deferred search schema, index client, aliases, and query helpers.
- `src/launch/`: asset-contract reset logic.

## `docs/`

Docs are current-state context, not progress logs.

- `docs/context/architecture.md`: React app architecture and runtime boundaries.
- `docs/context/repo-structure.md`: this directory ownership guide.
- `docs/context/data-model.md`: IndexedDB stores, runtime dataset shapes, and source-of-truth ownership.
- `docs/context/source-data-flow.md`: build-only source data to runtime dataset flow.
- `docs/context/style-map.md`: UI component ownership, style source, and proof surface.
- `docs/context/surfaces/*.md`: surface dossiers for read, navigate, configure, onboard, and infra.
- `docs/ui-references/`: committed component reference images and intent notes for creative UI work.

Never hand-edit auto-generated fence blocks. Run `pnpm run docs` to regenerate them.

## `data/` And `public/`

- `data/catalog/`: QuranAtlas-owned source catalog, providers, licenses, and verification rules.
- `data/normalized/`: committed normalized build inputs.
- `data/taxonomy/`: curated taxonomy inputs for generated knowledge lanes.
- `public/dataset/`: generated runtime dataset served same-origin.
- `public/fonts/`: UI and Quran fonts.
- `public/icons/`: app icons, maskable icons, and PWA assets.
- `public/wird-notification-sw.js`: small helper imported by the generated service worker for Daily Wird notification clicks.
- `public/_headers`: Cloudflare Pages headers and CSP.

Rule: `data/` is build-facing; `public/` is runtime-facing.

## `scripts/`

- `scripts/data/`: catalog validation, source fetching, normalization, dataset build, Mushaf page import/build, aliases, and inventory.
- `scripts/ci/`: reusable affected-change detection, affected production build, and local affected validation runners.
- `scripts/docs/`: generated inventories, module graph, feature map, and cite checks.
- `scripts/check-*.mjs`: deterministic static gates used by `pnpm run check` and CI.

Do not add one-off committed scripts. Use `.scratch/` for throwaway investigation.

## `tests/`

- `tests/unit/`: Vitest suites. React component/unit tests use `tests/unit/react-*`.
- `tests/e2e/`: React Playwright specs grouped by surface.
- `tests/e2e/fixtures/`: typed browser-state, storage, route, and offline helpers.
- `tests/fixtures/`: shared non-browser fixtures.

Follow `tests/unit/AGENTS.md` or `tests/e2e/AGENTS.md` before changing tests.

## Navigation Rules

1. Start with `docs/context/architecture.md`.
2. Use this file for directory ownership.
3. Open the owning surface dossier in `docs/context/surfaces/`.
4. Use `docs/context/style-map.md` for UI or visual work.
5. Use `docs/context/data-model.md` and `docs/context/source-data-flow.md` for storage or dataset changes.
6. Then edit the owning `src/**` files.
