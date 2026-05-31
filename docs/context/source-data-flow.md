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
8. Build the source-backed Search pack registry and immutable pack shards under `public/search-packs/**`.
9. Emit runtime files to `public/dataset/**` and Search pack files to `public/search-packs/**`.

The build preserves the existing provenance `builtAt` value when package version and profile are unchanged, so validation does not dirty tracked dataset files just by running. Set `QURANATLAS_DATASET_BUILT_AT` when an intentional dataset timestamp change is required.

`pnpm run data -- build --skip=mushaf-pages` rebuilds the non-Mushaf dataset lanes while reusing existing local/generated Mushaf page runtime assets. CI and local preview validation use this after the release Qaloon page pack has already been generated, or when the affected-file gate shows dataset inputs changed but Mushaf page inputs did not.

`pnpm run data -- check` validates source/catalog structure without necessarily rebuilding every runtime file.

`pnpm run data -- build --profile=full` builds every approved current dataset profile and is used for protected-branch and dataset-relevant CI coverage.

## Fetching Sources

`pnpm run data:fetch -- <type>:<id>` uses catalog-backed provider adapters in `scripts/data/sources/providers/**` and writes normalized files under `data/normalized/**`.

Supported source lanes include:

- Quran text
- translations
- Mushaf pages
- knowledge/taxonomy inputs
- Search text, translation/context, and morphology source catalogs

Network fetching is an explicit source-maintenance operation. Normal app builds run offline against committed normalized inputs.

## Search Source Lanes

Search source records live in `data/catalog/search-sources.json`, with Search-specific license and verification contracts in `data/catalog/search-licenses.json` and `data/catalog/search-verification.json`. `pnpm run data -- check` validates required source ids, license ids, Hafs source identity, ayah coverage, accepted checksums, source availability notes, and morphology source-drop policy.

The Search lanes are Hafs Search text, Bridges translation/context, and Quranic Arabic Corpus morphology 0.4. Morphology is source-backed and license-gated: the official QAC download page is the source of truth, the committed raw source file is `data/normalized/search/qac/quranic-corpus-morphology-0.4.txt`, and the accepted SHA-256 for the verified 0.4 text file is recorded in the catalog. The morphology gate requires the source file, checksum, license decision, availability notes, transformed-data notes, 6,236 ayah coverage, 128,219 source rows, and 77,429 unique word positions before Search packs can expose morphology-derived features.

Search pack runtime output is not `/dataset/search/**`. The registry is `public/search-packs/registry.json`, and immutable manifests and shards are emitted under `public/search-packs/packs/<contentHash>/**`. Runtime URLs mirror that layout under `/search-packs/**` and are owned by the dedicated Search pack installer/cache.

`scripts/data/search/build.mjs` builds the Hafs Search pack from committed normalized Hafs text, Bridges translation/context inputs, and the verified QAC morphology source. It writes ABI-v1 shards for references, dictionaries, Arabic postings, exact-word postings, translation postings, phrase postings, morphology rows, root and lemma dictionaries, same-written-form postings, same-root postings, lemma postings, Surah context aggregates, and provenance. Each generated shard is SHA-256 verified over fetched encoded bytes, declared in the manifest, and kept below its shard byte budget.

`pnpm run data -- check` runs source catalog validation, morphology source validation, and Search pack check mode after baseline text output is available. `pnpm run data -- build` and `pnpm run data -- build --profile=full` regenerate Search packs alongside the normal dataset lanes. `scripts/ci/affected.mjs` treats `shared/search/**`, `scripts/data/search/**`, `public/search-packs/**`, Search catalogs, normalized sources, and data scripts as dataset-relevant inputs.

## Mushaf Page Artifacts

Release/local Mushaf page imports use:

```bash
pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
```

The import step downloads quran.ws PDFs into `.scratch/` and converts them to normalized SVG inputs using Poppler. The build step validates and emits edition-aware runtime page assets and manifests. CI caches the expensive PDF/SVG inputs and still validates the generated page pack before app build.

CI runs the Mushaf import/page-build lane when `scripts/ci/affected.mjs` detects changes to Mushaf catalogs, normalized page inputs, riwayah source files, Mushaf page scripts, the default reader asset profile, generated Mushaf runtime assets, or dependency files. CI and the shared local preview runner also run that lane whenever Playwright is selected so the tested `dist/` artifact includes the real Mushaf SVG pages that the browser specs assert.

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
