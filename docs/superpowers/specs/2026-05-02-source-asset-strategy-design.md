# QuranAtlas Source Asset Strategy

## Purpose

QuranAtlas needs a source asset system that preserves scholarly trust while keeping the installable app small. The application should always ship with a complete minimum corpus:

- One default riwayah.
- One default translation.
- One default tafsir.

Additional riwayat, translations, tafasir, audio, page images, search indexes, and future reflection assets should be optional packs that users can opt into through the existing offline category flow.

## Principles

Arabic Qur'an text is the highest-trust canonical corpus. Translations and tafsir are scholarly or linguistic renderings layered over the Arabic text; they must never become the authority for Arabic text, ayah counts, riwayah boundaries, or verse identity.

Every shipped asset must trace back to a committed source record and a curated QuranAtlas metadata record. Upstream metadata is evidence, not the full product contract.

Runtime assets should be optimized for lazy loading by surface and surah. Build-only source monoliths stay outside `public/`, and shipped packs live under `public/dataset/`.

## Asset Tiers

### Tier 0: Mandatory Shipped Baseline

This tier is included in every production build and must work immediately after first load:

- Default riwayah: `qaloon` unless the product default changes in settings and docs.
- Default translation: `saheeh` until a different default is explicitly selected.
- Default tafsir: `muyassar`. It is concise, institutionally sourced, and better suited to a minimum shipped corpus. `mukhtasar` remains a first-class optional tafsir because its surah aims and benefits are better suited to the reflection layer.

The baseline must be complete across all 114 surahs. If any baseline asset is incomplete, CI fails and deploy is blocked.

### Tier 1: First-Class Optional Packs

These are app-supported and curated, but not shipped in the minimum build unless selected by the user:

- Riwayat: `hafs`, `warsh`, and any non-default riwayah.
- Translations: the approved Sunni translation shortlist.
- Tafasir: the approved top 10 Sunni tafsir works.
- Search, morphology, and topic indexes when they are introduced.

Optional packs must have complete metadata, source provenance, and validation reports. They are hosted as downloadable static assets outside the baseline Pages artifact and cached by the service worker after opt-in.

### Tier 2: Research And Future Packs

These assets are valid for internal review, experimentation, or future surfaces, but are not visible in UI:

- Unreviewed tafsir imports.
- Experimental thematic datasets.
- AI-derived summaries or graph edges.
- Derived reflection seeds.

Tier 2 assets stay outside `public/dataset/` unless a specific feature graduates them with validation, metadata, and docs.

## Source Layout

Build-only inputs live under `data/`:

```txt
data/
  catalog/
    authorities.json
    quran.sources.json
    translation.sources.json
    tafsir.sources.json
    licenses.json
    verification-rules.json

  sources/
    quran/
      kfgqpc/
        hafs.source.json
        warsh.source.json
        qaloon.source.json
        manifest.json

    translations/
      quran_db/
        bridges.source.json
        saheeh.source.json
        clear-quran.source.json
        manifest.json

    tafsir/
      qul/
        ibn-kathir.source.json
        tabari.source.json
        baghawi.source.json
        sadi.source.json
        mukhtasar.source.json
        muyassar.source.json
        qurtubi.source.json
        ibn-atiyyah.source.json
        adwa-al-bayan.source.json
        ibn-ashur.source.json
        manifest.json

  normalized/
    translations/
      {id}.normalized.json
    tafsir/
      {id}.normalized.json
```

Runtime outputs live under `public/dataset/`:

```txt
public/dataset/
  riwayat/{id}/{001..114}.json
  translations/{id}/{001..114}.json
  tafsir/{id}/{001..114}.json
  indexes/
    sources.json
    translation-index.json
    tafsir-index.json
    trust-index.json
  manifest.json
  provenance.json
```

## Metadata Contract

Each source must have a QuranAtlas-owned metadata entry. The metadata drives UI availability, trust labels, validation, and future retrieval.

```json
{
  "id": "ibn-kathir",
  "kind": "tafsir",
  "title": "Tafsir Ibn Kathir",
  "language": "ar",
  "author": {
    "name": "Ismail ibn Umar ibn Kathir",
    "deathHijri": 774
  },
  "source": {
    "provider": "QUL",
    "providerResourceId": 22,
    "url": "https://qul.tarteel.ai/resources/tafsir/22"
  },
  "trust": {
    "tier": "canonical",
    "school": "sunni",
    "role": "athar-baseline",
    "reviewStatus": "approved"
  },
  "coverage": {
    "ayahKeying": "hafs",
    "grouping": "multi-ayah",
    "surahs": 114
  },
  "license": {
    "status": "needs-review",
    "notes": "Verify redistribution terms before shipping"
  }
}
```

Metadata records are required for every asset in `public/dataset/`. Missing metadata is a build failure.

## Runtime Loading

Reader load order should be:

1. Load active riwayah surah text.
2. Load selected translation pack if visible and available.
3. Load selected tafsir pack only when the tafsir surface or inline tafsir panel asks for it.
4. Fall back to baseline translation or tafsir only when the user-selected optional pack is unavailable.

The reader should not bundle tafsir into verse JSON. Tafsir is a separate lazy asset because the payload is larger, often range-based, and likely to power a separate progressive disclosure surface.

## Tafsir Shape

Tafsir must preserve verse ranges. Classical works often explain multiple ayat in one passage, and splitting them into one-entry-per-ayah would corrupt the source.

```ts
type TafsirSurahPack = {
  tafsirId: string
  tafsirVersion: string
  surahNo: number
  entries: Array<{
    id: string
    ayahKeys: string[]
    startKey: string
    endKey: string
    text: string
    sourceGranularity: 'ayah' | 'range' | 'surah' | 'section'
    certainty:
      | 'canonical_source'
      | 'scholarly_preference'
      | 'difference_of_opinion'
      | 'linguistic_analysis'
      | 'fiqh_derivation'
  }>
}
```

## Offline And Opt-In Packs

The existing offline category model should be expanded from broad `text` into source-aware text packs:

```ts
type OfflineTextSelection = {
  riwayat: Record<string, boolean>
  translations: Record<string, boolean>
  tafsir: Record<string, boolean>
}
```

The minimum baseline is always cache-eligible and should be included in the deploy artifact. Optional packs are available through the manifest and downloaded by category or by explicit source selection. The baseline artifact must not contain optional tafsir or translation pack bodies; it only contains the source index entries needed to discover them.

The service worker route definitions should distinguish:

- `text-core`: mandatory baseline corpus.
- `text-riwayah`: optional riwayah packs.
- `text-translation`: optional translation packs.
- `text-tafsir`: optional tafsir packs.
- `text-index`: optional search, theme, and graph indexes.

This lets the storage selector estimate optional payloads accurately instead of treating every JSON file under `/dataset/` as one text category.

## CI Strategy

CI should add dataset-profile gates alongside the existing lint, typecheck, unit, build, chunk, Lighthouse, and Playwright jobs.

### Dataset Profiles

Introduce explicit build profiles:

```txt
baseline
  Builds only the mandatory shipped corpus:
  default riwayah + default translation + default tafsir + indexes required to list them.

full
  Builds every approved optional source pack from committed normalized sources.

catalog
  Validates metadata, licenses, source manifests, and provenance without writing runtime assets.
```

Suggested scripts:

```json
{
  "build:dataset:baseline": "node scripts/build-dataset.mjs --profile=baseline",
  "build:dataset:full": "node scripts/build-dataset.mjs --profile=full",
  "check:dataset": "node scripts/check-dataset.mjs",
  "check:licenses": "node scripts/check-source-licenses.mjs",
  "check:source-catalog": "node scripts/check-source-catalog.mjs"
}
```

### CI Jobs

Add these jobs:

| Job | Gate |
|---|---|
| `dataset-catalog` | Checks every source has metadata, license status, provider, checksum, trust tier, and approved/default visibility state. |
| `dataset-baseline` | Builds the minimum shipped corpus and fails if default riwayah, translation, or tafsir is missing or incomplete. Uploads a small dataset artifact for inspection. |
| `dataset-full` | Builds every approved optional source pack. Runs on pushes to `dev`, `staging`, `main`, and PRs labeled `dataset-full`; skipped for ordinary feature PRs unless dataset files changed. |
| `dataset-size` | Compares baseline dataset byte size against budget and reports optional pack sizes by source. |
| `dataset-provenance` | Ensures `public/dataset/provenance.json` references exactly the sources emitted in the selected profile. |

### Deploy Rule

Deploy should consume the `baseline` production artifact by default. Optional packs should be uploaded to object storage or CDN as versioned dataset artifacts referenced by `indexes/sources.json`.

This keeps the Cloudflare Pages artifact small while preserving opt-in access to large tafsir packs.

### Branch Behavior

- PR to `dev`: run `dataset-catalog` and `dataset-baseline`; run `dataset-full` only if source/catalog/dataset scripts changed or a `dataset-full` label is present.
- Push to `dev`: run `dataset-full` to catch optional pack breakage after merge.
- PR or push to `staging` and `main`: run all dataset jobs.
- Deploy: block if `baseline` is incomplete, metadata is missing, license status is disallowed, or provenance is inconsistent.

### Budgets

Baseline budgets should be strict because every user receives them:

- Baseline dataset budget: fixed after first implementation from measured output.
- Optional per-source budget: reported, not blocking at first.
- Tafsir pack budget: reported by source and by surah so very large sources can be chunked differently later.

### Verification

The dataset checker should assert:

- Arabic riwayah counts match source-specific expected totals.
- Default riwayah has 114 shipped surah files.
- Default translation has complete Hafs coverage and valid footnotes.
- Default tafsir has at least one valid entry for every surah and all referenced ayah keys exist.
- Optional packs are not offered in `sources.json` unless their files exist and pass validation.
- Every emitted runtime file has sha256 and byte size in `manifest.json`.
- Every runtime source has provenance and license status.

## Testing Strategy

Unit tests should cover:

- Profile selection.
- Source catalog validation.
- Tafsir range validation.
- Optional pack manifest generation.
- Offline byte estimation by pack type.

E2E should add only one minimum journey at first:

- Fresh build loads default riwayah, default translation, and default tafsir without opting in.
- Optional pack is not loaded until selected or cached.

Playwright does not need to exercise every tafsir source. Dataset validation should own coverage and schema correctness.

## Documentation Updates For Implementation

When implemented, update:

- `docs/context/data-model.md` for static dataset shapes.
- `docs/context/architecture.md` for dataset profile and lazy loading behavior.
- `docs/context/surfaces/read.md` for default translation and tafsir rendering behavior.
- `docs/context/surfaces/configure.md` for source picker and optional download behavior.
- `docs/context/surfaces/infra.md` for service worker cache categories and dataset manifests.
- `docs/tech-stack.md` for new scripts and CI jobs.

Generated context blocks must be refreshed with `pnpm docs:derive`.

## Remaining Product Decisions

- Source license review blocks public deployment for any source exposed in UI. Internal Tier 2 research packs may exist locally with `license.status: "needs-review"` if they are not emitted into a public artifact.
- Translation and tafsir source pickers should remain separate controls because translations affect the reader line, while tafsir opens a heavier scholarly layer.
