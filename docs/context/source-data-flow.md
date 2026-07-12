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
7. Build the explicit Mushaf edition set for the selected profile when its local inputs are available. Baseline and full select only quran.ws; the local private profile selects quran.ws plus the Furatiyyah image edition.
8. Build the source-backed Search pack registry and immutable core, morphology, and memory-graph pack shards under `public/search-packs/**`.
9. Emit runtime files to `public/dataset/**` and Search pack files to `public/search-packs/**`.

The build preserves the existing provenance `builtAt` value when package version and profile are unchanged, so validation does not dirty tracked dataset files just by running. Set `QURANATLAS_DATASET_BUILT_AT` when an intentional dataset timestamp change is required.

`pnpm run data -- build --skip=mushaf-pages` rebuilds the non-Mushaf dataset lanes while reusing existing local/generated Mushaf page runtime assets. CI and local preview validation use this after the release Qaloon page pack has already been generated, or when the affected-file gate shows dataset inputs changed but Mushaf page inputs did not.

`pnpm run data -- check` validates source/catalog structure without necessarily rebuilding every runtime file. It checks stamped Mushaf page output when local page SVG inputs are present, and otherwise skips the ignored page-body lane; use the explicit Mushaf page build command below with `--require-riwayah=qaloon` when the release Qaloon page pack must be generated or strictly verified.

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

Search source records live in `data/catalog/search-sources.json`, with Search-specific license and verification contracts in `data/catalog/search-licenses.json` and `data/catalog/search-verification.json`. `pnpm run data -- check` validates required source ids, license ids, Hafs/Tanzil source identity, ayah coverage, accepted checksums, source availability notes, and morphology source-drop policy.

The Search lanes are Hafs/Tanzil Search text, Bridges translation/context, and Quranic Arabic Corpus morphology 0.4. The committed Search text source is expected at data/normalized/search/tanzil/hafs.json; generated Search packs must use that Hafs/Tanzil corpus rather than the Reader riwayah text files. `scripts/data/search/tanzil/import.mjs` imports Tanzil numbered Uthmani and simple-clean text into canonical Hafs refs and rejects incomplete coverage before pack build. Morphology is source-backed and license-gated: the official QAC download page is the source of truth, the committed raw source file is `data/normalized/search/qac/quranic-corpus-morphology-0.4.txt`, and the accepted SHA-256 for the verified 0.4 text file is recorded in the catalog. QAC itself cites Tanzil compatibility, but QAC remains the morphology source and is not the Search text corpus. The morphology gate requires the source file, checksum, license decision, availability notes, transformed-data notes, 6,236 ayah coverage, 128,219 source rows, and 77,429 unique word positions before Search packs can expose morphology-derived features.

Search pack runtime output is not `/dataset/search/**`. The registry is `public/search-packs/registry.json`, and immutable manifests and shards are emitted under `public/search-packs/packs/<contentHash>/**`. Runtime URLs mirror that layout under `/search-packs/**` and are owned by the dedicated Search pack installer/cache.

`scripts/data/search/build.mjs` builds the Hafs Search pack from committed normalized Hafs/Tanzil text, Bridges translation/context inputs, and the verified QAC morphology source. The pack indexes normalized Hafs emlaey text for search matching while the references shard carries the marked Hafs text for Search result display. It writes ABI-v1 shards for references, dictionaries, Arabic postings, exact-word postings, translation postings, phrase postings, morphology rows, root and lemma dictionaries, same-written-form postings, same-root postings, lemma postings, Surah context aggregates, attested following wording, shared wording adjacency, repeated phrases, occurs-once phrases, ayah endings, Counts & patterns aggregates, graph provenance, and core provenance. Each generated shard is SHA-256 verified over fetched encoded bytes, declared in the manifest, and kept below its shard byte budget.

Phase 3 graph generation is bounded by an explicit phrase/window policy: graph windows stay inside one ayah and one surah, do not cross Bismillah boundaries, materialize up to five-token n-grams, and reject source units that exceed the per-unit phrase-window cap. Graph output is chunked by feature so lazy Explore panels can load attested following wording, shared wording, repeated phrases, occurs-once phrases, ayah endings, and Counts & patterns without decoding every graph shard at core query time.

`pnpm run data -- check` runs source catalog validation, morphology source validation, and Search pack check mode after baseline text output is available. `pnpm run data -- build` and `pnpm run data -- build --profile=full` regenerate Search packs alongside the normal dataset lanes. `scripts/ci/affected.mjs` treats every Search dataset lane (`shared/search/**`, `scripts/data/search/**`, `public/search-packs/**`, Search catalogs, normalized Search sources, and data scripts) as dataset/full-dataset relevant without forcing the Mushaf page import lane unless Mushaf page inputs changed.

## Mushaf Page Artifacts

Release/local Mushaf page imports use:

```bash
pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
```

The quran.ws import downloads PDFs into `.scratch/` and converts them with Poppler into the edition-scoped ignored normalized input `data/normalized/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/`. A complete safe legacy ignored SVG directory is staged into that edition path without mutating the legacy directory.

The private Furatiyyah edition has no network importer and never enters a standard build or CI cache. Its local-only command is:

```bash
pnpm run data -- mushaf-pages import --edition=qalun-furatiyyah-2023-v1 --pdf="/absolute/path/to/Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf"
```

The private importer first checks the pinned PDF digest, document page count, and CropBox. It renders only source PDF pages 5 through 608 with `pdftocairo -cropbox -png -r 300`, applies the reviewed normalized Full frame through `cwebp -crop`, emits 1,280 and 2,136 pixel WebP renditions, validates every pair with `webpinfo`, then atomically promotes a complete immutable ignored sibling at `data/normalized/mushaf-pages/qaloon/qalun-furatiyyah-2023-v1/`. Its `import.json` binds the source-PDF digest, complete source/review/framing/media contract digest, and signed metadata digest; the builder independently verifies those bindings and each reviewed page mapping before it can emit private output. It refuses to overwrite a different output under the same edition id.

`mushaf-pages build` selects editions explicitly: `baseline` and `full` emit only `qalun-quran-ws-v1`; `private` emits that default plus `qalun-furatiyyah-2023-v1`; `catalog` emits none. All selected siblings build before a single riwayah-level prune, so a private build keeps both editions while a later baseline build removes the unselected private output and its index entry. Only quran.ws writes the legacy riwayah-level V1 manifest and SVG page paths. The private edition writes a V2 manifest with canonical `firstVerse`, transformed unit `textFrame`/`sideLane`, an external-image fallback at 2,136 pixels, and both verified WebP renditions. The asset index repeats absolute `/dataset/**` URLs and each WebP descriptor's digest, byte count, dimensions, and MIME type. `--require-edition=<id>` strictly requires a selected edition and complete normalized input; standard CI never names the private edition.

CI runs the Mushaf import/page-build lane when `scripts/ci/affected.mjs` detects changes to Mushaf catalogs (including private edition contracts), normalized page inputs, riwayah source files, Mushaf page scripts, the default reader asset profile, generated Mushaf runtime assets, or dependency files. Its quran.ws-only cache uses the edition-scoped normalized page directory; it never caches or requires ignored private inputs. CI and the shared local preview runner also run that lane whenever Playwright is selected so the tested `dist/` artifact includes the real quran.ws SVG pages that the browser specs assert.

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
