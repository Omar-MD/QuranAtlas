# Source Data Flow

QuranAtlas treats source data as build input and runtime dataset files as generated app assets.

## Boundaries

| Area | Path | Role |
| --- | --- | --- |
| Source catalog | `data/catalog/**` | QuranAtlas-owned metadata, licenses, providers, verification rules |
| Normalized sources | `data/normalized/**` | Committed build inputs normalized from upstream sources |
| Taxonomy | `data/taxonomy/**` | Curated enrichment inputs |
| Builders | `scripts/data/**` | Validation, source fetching, transforms, aliases, inventories |
| Runtime dataset | `public/dataset/**` | Generated same-origin app assets |
| Runtime loaders | `src/data/**`, `src/packs/**` | Browser-side readers for `/dataset/**` |

The app never imports `data/**`. Runtime code fetches `/dataset/**` and validates path boundaries before use.

## Build Pipeline

`pnpm run data -- build` orchestrates the baseline dataset build:

1. Validate source catalog records and required local inputs.
2. Build Quran text packs for the current default profile.
3. Build translation packs and footnote structures.
4. Derive verse aliases for cross-riwayah translation alignment.
5. Build Surah, Juz, source, text-asset, Mushaf-asset, provenance, and inventory indexes.
6. Build knowledge shards when source inputs are present.
7. Build the baseline Qaloon Mushaf page manifest when page SVG inputs are available.
8. Emit runtime files to `public/dataset/**`.

The build preserves the existing provenance `builtAt` value when package version and profile are unchanged, so validation does not dirty tracked dataset files just by running. Set `QURANATLAS_DATASET_BUILT_AT` when an intentional dataset timestamp change is required.

`pnpm run data -- build --skip=mushaf-pages` rebuilds the non-Mushaf dataset lanes while reusing the committed Mushaf page runtime assets. CI and `pnpm run validate:affected` use this only when the affected-file gate shows dataset inputs changed but Mushaf page inputs did not.

`pnpm run data -- check` validates source/catalog structure without necessarily rebuilding every runtime file.

`pnpm run data -- build --profile=full` builds every approved current dataset profile and is used for protected-branch and dataset-relevant CI coverage.

## Fetching Sources

`pnpm run data:fetch -- <type>:<id>` uses catalog-backed provider adapters in `scripts/data/sources/providers/**` and writes normalized files under `data/normalized/**`.

Supported source lanes include:

- Quran text
- translations
- Mushaf pages
- knowledge/taxonomy inputs

Network fetching is an explicit source-maintenance operation. Normal app builds run offline against committed normalized inputs.

## Mushaf Page Artifacts

Release/local Mushaf page imports use:

```bash
pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
```

The import step downloads quran.ws PDFs into `.scratch/` and converts them to normalized SVG inputs using Poppler. The build step validates and emits edition-aware runtime page assets and manifests. CI caches the expensive PDF/SVG inputs and still validates the generated page pack before app build.

CI runs the Mushaf import/page-build lane only when `scripts/ci/affected.mjs` detects changes to Mushaf catalogs, normalized page inputs, riwayah source files, Mushaf page scripts, the default reader asset profile, committed Mushaf runtime assets, or dependency files. Other app-only changes reuse the committed page assets and avoid the Poppler import/build path.

## Runtime Consumption

- Verse reader: `src/data/reader-corpus.ts`
- Runtime URL guard: `src/data/runtime-boundary.ts`
- Source and asset indexes: `src/data/source-index.ts`
- Verse aliases: `src/data/verse-aliases.ts`
- Mushaf manifests/pages: `src/packs/mushaf-index.ts`, `src/packs/mushaf-paths.ts`, `src/packs/mushaf-page-asset.ts`
- Offline/cache planning: `src/offline/**`

Runtime fetches remain same-origin. Failed optional knowledge/search metadata never blocks base reader text.

## Integrity Rules

- Catalog records must name source, license, provider, and verification expectations.
- Build scripts fail on malformed source data before emitting runtime files.
- Runtime path validation rejects absolute URLs, traversal, or non-dataset paths.
- Page SVGs are sanitized before React renders them.
- Generated runtime dataset files are committed so production builds are deterministic.
