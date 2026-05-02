# Repo Structure

This document explains how the repository is laid out and which directories are the source of truth for each concern.

## Top level

```text
.
├── .agents/           Repo-local Codex skills
├── .github/           CI workflows and GitHub automation
├── data/              Build-only source data and source catalog
├── docs/              Context docs, workflow docs, and generated inventories
├── patches/           Package-manager patches
├── public/            Static assets copied into builds
├── scripts/           Build, dataset, and docs scripts
├── src/               Application source
├── tests/             Unit, e2e, and fixtures
├── dist/              Built app output
├── test-output/       Playwright output and traces
└── node_modules/      Installed dependencies
```

## Source of truth by area

### `src/`

Application code lives here.

- `src/core/`: cross-cutting runtime primitives such as router, db, events, constants, and service-worker route definitions
- `src/data/`: runtime dataset access, source-index access, aliases, and offline dataset helpers
- `src/styles/`: global design system, tokens, and per-surface CSS
- `src/<surface>/`: user-visible surfaces and feature modules

Surface directories are the primary unit of app behavior. Their deeper behavior and ownership rules are documented in `docs/context/surfaces/*.md`.

### `data/`

Build-only source data. Nothing here is read directly by the shipped app.

- `data/catalog/`: QuranAtlas-owned source catalog, license metadata, authority records, verification rules, and fetch contracts
- `data/normalized/`: committed normalized source files used by dataset builds

For the full data pipeline, source formats, normalization rules, and build/runtime boundaries, see `docs/context/source-data-flow.md`.

### `public/`

Static assets that ship as part of the app artifact.

- `public/dataset/`: runtime dataset emitted by the dataset build
- `public/fonts/`: Quran and UI fonts
- `public/icons/`: app icons and related assets

Rule: `public/` is runtime-facing. `data/` is build-facing.

### `scripts/`

Repository automation and maintenance scripts.

- `scripts/data/`: dataset build, source fetch, source catalog validation, verse-alias derivation, and translation-mapping checks
- `scripts/docs/`: generated context-doc inventories and checks

If a file under `docs/` is marked as auto-generated, `scripts/docs/` owns it.

### `docs/`

Load-bearing documentation about the current system.

- `docs/context/`: architecture, data model, source-data flow, surface dossiers, generated indexes
- `docs/workflow/`: engineering workflow guidance for this repo

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
- `test-output/`: Playwright reports and traces
- `node_modules/`: installed packages

## Practical navigation

When trying to understand the repo:

1. Start with `docs/context/architecture.md` for runtime shape.
2. Read `docs/context/repo-structure.md` for directory ownership.
3. Read `docs/context/source-data-flow.md` for source-data and dataset build flow.
4. Follow `docs/context/feature-map.md` into the relevant `docs/context/surfaces/*.md`.
5. Open the owning `src/<surface>/` directory once you know which surface owns the behavior.

## Quick rules

- `src/` and `docs/context/` are the primary human-maintained source of truth for app behavior.
- `data/catalog/` and `data/normalized/` are the primary human-maintained source of truth for dataset inputs.
- `public/dataset/` is generated runtime output, even though it is committed.
- `dist/`, `test-output/`, and `node_modules/` are never the place to understand intended behavior.
