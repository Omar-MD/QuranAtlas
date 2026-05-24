# React Tech Stack Refactor 12 - Curated Metadata Parity Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-09-reader-surface-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-11-search-index-parity-spec.md`

## Purpose

Rebuild curated reader-attached metadata lanes in React using the existing
build/runtime dataset boundaries. Metadata must strengthen reading without
becoming a separate research, AI, note-taking, or review product branch.

## Current Docs Requirement

This spec uses QuranAtlas source-data contracts and does not lock new external
API syntax. If implementation adds a metadata indexing, parsing, compression, or
validation library, fetch current docs through Context7 before writing the
implementation plan.

## Scope

In scope:

- Rebuild reader-attached metadata display for approved v1 lanes.
- Preserve optional metadata adapter behavior across available, empty, missing,
  stale, invalid, and offline states.
- Preserve build/runtime separation for `data/**` and `public/dataset/**`.
- Integrate metadata with reader display, search, and navigation where in scope.
- Add install-before-activate handling for optional metadata packs if pack
  selection is user-visible.

Out of scope:

- AI-generated explanations or synthesis.
- Personal notes, tags, comments, review, edges, or mark branches.
- Arabic roots, concepts, divine names, or cross-references unless separately
  promoted to v1 scope.
- Runtime upstream fetches.
- Treating missing metadata as a reader-blocking error.

## Required Reads

- `AGENTS.md`
- `docs/product-info.md`
- `docs/context/source-data-flow.md`
- `docs/context/data-model.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/infra.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `08`, `09`, and `11`

## Allowed Files And Directories

Allowed create:

- `src-react/metadata/**`
- `src-react/components/reader/metadata/**`
- `src-react/components/search/metadata/**`
- Dataset builder changes under `scripts/data/**` only when source-data
  contracts are intentionally updated
- Unit tests under `tests/unit/**`

Allowed modify:

- Reader components and registry entries.
- Search corpus/index configuration from child spec `11`.
- Source-data docs and product docs when metadata scope changes.

Forbidden modify:

- Hand-editing generated dataset files.
- Runtime fetching of `data/**` or upstream providers.
- Reviving removed personal annotation or review features.

## Metadata Contract

V1 curated metadata may include:

- tafsir source availability and grouped tafsir ranges;
- verse themes;
- short meanings or summaries where approved;
- passage grouping and context;
- Makki/Madani classification;
- source-backed revelation/asbab metadata where approved;
- juz, hizb, rub, ruku, and page metadata where used in navigation/search.

Metadata display must be reader-attached and quiet. It reveals in context, does
not block base Quran text rendering, and degrades to empty/unavailable states
without inventing fallback labels.

## Dataset Boundary

React metadata code consumes only `/dataset/**` outputs. Build-only source
files under `data/catalog/**`, `data/normalized/**`, and `data/taxonomy/**` stay
outside the browser.

If metadata source catalogs, normalized source formats, builders, manifests, or
runtime dataset contracts change, update `docs/context/source-data-flow.md`,
the owning surface dossier, and run the relevant data checks.

## Deliverables

- React metadata adapters and reader-attached metadata components for approved v1
  lanes.
- Search/navigation metadata hooks where those lanes are in scope.
- Registered metadata components with stories, tests, accessibility proof, and
  visual proof.
- Explicit available, empty, missing, stale, invalid, offline, and unavailable
  state handling.
- Product, source-data, surface dossier, registry, and tech-stack updates for any
  metadata scope, dataset, script, or verification changes.

## Acceptance Criteria

- Reader text renders even when optional metadata is missing or invalid.
- Metadata unavailable states are explicit where user-visible.
- Search and navigation consume only verified metadata indexes.
- Metadata components are registered, tested, storied, and visually proved.
- Product docs match the metadata lanes actually promised for React parity.
- Removed-scope annotation/review branches are absent.

## Verification

Run targeted metadata tests, plus:

```bash
pnpm run docs:check
git diff --check
```

If source-data or dataset output changes, run:

```bash
pnpm run data -- check
```

If app runtime behavior changes, also run:

```bash
pnpm run check
pnpm run build:react
```

Expected result:

- Metadata adapters pass available, empty, missing, stale, invalid, and offline
  cases.
- Data checks pass when source-data contracts change.
- Docs checks are clean.

## Rollback And Failure Handling

- If a metadata pack is incomplete, surface unavailable/empty state and keep
  base reader rendering.
- If a metadata lane requires new product approval, keep it out of React parity
  until product docs promote it.
- If dataset contracts drift, fix the builder/source docs before UI consumes
  them.

## Handoff

Child spec `15 Golden Routes And Accessibility Gates` must include metadata
open/empty/unavailable proof where metadata is reader-visible. Cutover readiness
must confirm product docs match the implemented metadata lanes.
