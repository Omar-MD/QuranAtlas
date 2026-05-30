# Repo Structure

This document explains how the repository is laid out and which directories are the source of truth for each concern.

## Top level

```text
.
├── .agents/           Repo-local Codex skills
├── .storybook/        React Storybook configuration during dual-build
├── .github/           CI workflows and GitHub automation
├── data/              Build-only source data, taxonomy, and source catalog
├── docs/              Context docs, workflow docs, and generated inventories
├── patches/           Package-manager patches
├── public/            Static assets copied into builds
├── scripts/           Build, dataset, and docs scripts
├── shared/            Framework-neutral contracts shared by Svelte, React, and scripts
├── src/               Application source
├── src-react/         Isolated future React app source during dual-build
├── tests/             Unit, e2e, and fixtures
├── dist/              Built app output
├── dist-react/        Proof-only React build output during dual-build
├── storybook-static-react/ Generated React Storybook output
├── test-output/       Playwright output and traces
└── node_modules/      Installed dependencies
```

## Source of truth by area

### `src/`

Application code lives here.

- `src/core/`: cross-cutting runtime primitives such as router, db, events, constants, and service-worker route definitions
- `src/data/`: runtime dataset access, source-index access, aliases, and offline dataset helpers
- `src/packs/`: install-before-activate pack policy, riwayah package resolution, and source-asset availability contracts
- `src/continuity/`: launch restore, saved-position validation, and reader continuity state such as bookmarks
- `src/metadata/`: optional metadata adapters that preserve reader behavior across available, missing, stale, and offline states
- `src/styles/`: single-entry global design system rooted at `src/styles/index.css`
- `src/styles/tokens/`: primitive and semantic design tokens
- `src/styles/patterns/`: reusable shared patterns such as sheets, modals, toasts, and form controls
- `src/styles/surfaces/`: component-cluster and surface-owned styles
- `src/<surface>/`: user-visible surfaces and feature modules

Surface directories are the primary unit of app behavior. Their deeper behavior and ownership rules are documented in `docs/context/surfaces/*.md`.

### `src-react/`

React production-candidate app code lives here.

- `src-react/`: React app tree. It must not import Svelte app modules under `src/**`.
- `src-react/components/ui/`: owned React UI primitives and Radix-backed behavior wrappers. Feature code imports from this barrel instead of importing Radix directly.
- `src-react/design-system/`: React-only token, Tailwind theme, registry, recipe, and design-system docs.
- `src-react/design-system/registry/`: machine-readable component registry, schema, and registry maintenance notes.
- `src-react/storage/`: Dexie mirror of the existing `quran-atlas` IndexedDB v7 stores plus React-only writer facades.
- `src-react/offline/`: React-only asset-pack status, Cache Storage planning, quota, UI-state, and service-worker message contracts.
- `src-react/data/`: React runtime dataset URL boundary helpers for same-origin `/dataset/**` access.
- `src-react/metadata/`: React reader-attached metadata adapters for optional knowledge and search integration.
- `src-react/search/`: React search shard schema, query, alias, and pack helpers for deferred full-text search work.
- `src-react/continuity/`: React launch restore, current-position, bookmarks, and Daily Wird helpers against the existing v7 stores.
- `src-react/packs/`: React-only pack contracts, including edition-aware Mushaf install-on-demand helpers.
- React tests remain under `tests/unit/**` and `tests/e2e/**`, not under `src-react/test/`.
- React builds write to `dist-react/`, a proof output that is not a deploy artifact until the production cutover changes build routing.

### `shared/`

Framework-neutral TypeScript and JSON contracts live here. Code under
`shared/` may be imported by both `src/**` and `src-react/**`, and build scripts
may read JSON contracts directly when they need runtime/data parity. The
directory is included in both Svelte and React lint/type gates.

### `.storybook/`

React Storybook configuration lives here. Stories are sourced from
`src-react/**` only, and Storybook output is proof evidence, not the visual
source of truth.

### `data/`

Build-only source data. Nothing here is read directly by the shipped app.

- `data/catalog/`: QuranAtlas-owned source catalog, license metadata, authority records, verification rules, and fetch contracts
- `data/normalized/`: committed normalized source files used by dataset builds
- `data/taxonomy/`: curated taxonomies for build-time enrichment lanes (knowledge themes in Phase 01)

For the full data pipeline, source formats, normalization rules, and build/runtime boundaries, see `docs/context/source-data-flow.md`.

### `public/`

Static assets that ship as part of the app artifact.

- `public/dataset/`: runtime dataset emitted by dataset builders (`build-dataset` + `build-knowledge-dataset`)
- `public/fonts/`: Quran and UI fonts
- `public/icons/`: app icons and related assets

Rule: `public/` is runtime-facing. `data/` is build-facing.

### `scripts/`

Repository automation and maintenance scripts.

- `scripts/data/`: dataset builders, source fetch, source catalog validation, verse-alias derivation, translation-mapping checks
- `scripts/docs/`: generated context-doc inventories and checks

If a file under `docs/` is marked as auto-generated, `scripts/docs/` owns it.

### `docs/`

Load-bearing documentation about the current system.

- `docs/context/`: architecture, data model, source-data flow, surface dossiers, generated indexes
- `docs/context/style-map.md`: component-to-source, style, reference, and proof map for UI work
- `docs/ui-references/`: committed component reference images and intent notes for creative UI work
- `.agents/skills/`: repo-local engineering workflows, including surface clustering and verification guidance

Use the docs this way:

- `architecture.md`: cross-cutting app design and boot/runtime boundaries
- `data-model.md`: store ownership and read-only dataset invariants
- `source-data-flow.md`: source formats, transformations, dataset build, and runtime dataset loading
- `surfaces/*.md`: behavior and ownership by user-visible surface

### `tests/`

Verification code and fixtures.

- `tests/unit/`: Vitest and jsdom tests
- `tests/e2e/`: Playwright journey specs
- `tests/fixtures/`: pinned comparison data and external reference fixtures

### Generated and non-authoritative directories

These directories are outputs, not places to hand-maintain system behavior:

- `dist/`: built application output
- `dist-react/`: proof-only React build output during dual-build. It is not a deploy artifact until an approved cutover plan changes production routing.
- `storybook-static-react/`: generated React Storybook output, not committed and not deployed.
- `test-output/`: Playwright reports and traces
- `node_modules/`: installed packages

## Practical navigation

When trying to understand the repo:

1. Start with `docs/context/architecture.md` for runtime shape.
2. Read `docs/context/repo-structure.md` for directory ownership.
3. Read `docs/context/source-data-flow.md` for source-data and dataset build flow.
4. Follow `docs/context/feature-map.md` into the relevant `docs/context/surfaces/*.md`.
5. Use `docs/context/style-map.md` when the task is visual or selector-related.
6. Open the owning `src/<surface>/` directory once you know which surface owns the behavior.

## Quick rules

- `src/` and `docs/context/` are the primary human-maintained source of truth for app behavior; `docs/ui-references/` is the committed visual-intent source of truth for creative UI component work.
- `data/catalog/`, `data/normalized/`, and `data/taxonomy/` are the primary human-maintained source of truth for build inputs.
- `public/dataset/` is generated runtime output, even though it is committed.
- `dist/`, `test-output/`, and `node_modules/` are never the place to understand intended behavior.
