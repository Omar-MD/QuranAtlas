# Data Model

QuranAtlas separates build-only source data, generated runtime dataset files, and browser persistence.

## Store Owner Index

<!-- AUTO-GENERATED:store-owner-index START -->
| Store | Owner dossier |
| --- | --- |
| `activationState` | [`infra`](surfaces/infra.md) |
| `bookmarks` | [`navigate`](surfaces/navigate.md) |
| `datasetMeta` | [`infra`](surfaces/infra.md) |
| `savedSearches` | [`search`](surfaces/search.md) |
| `searchPackActivations` | [`infra`](surfaces/infra.md) |
| `searchPackStaging` | [`infra`](surfaces/infra.md) |
| `settings` | [`configure`](surfaces/configure.md) |
<!-- AUTO-GENERATED:store-owner-index END -->

## IndexedDB

The React app uses Dexie against the shared database name and schema defined in `src/storage/schema.ts`.

| Store | Owner | Purpose |
| --- | --- | --- |
| `settings` | `src/storage/settings-writer.ts` plus surface-specific helpers | Key-value user preferences and continuity data |
| `bookmarks` | `src/continuity/bookmarks/**` | Riwayah-scoped verse and Mushaf page bookmarks |
| `activationState` | `src/offline/**` | Runtime asset activation/cache status |
| `datasetMeta` | `src/offline/**` | Applied dataset/package metadata |
| `savedSearches` | `src/storage/**` and Search route code | User-created saved-search query definitions, not cached result windows |
| `searchPackActivations` | `src/offline/search/**` | Active immutable Search pack pointer, content hash, cache name, status, and activation generation |
| `searchPackStaging` | `src/offline/search/**` | Staged Search pack install/verify metadata before activation |

Settings is a key-value store. Ownership is enforced by key, not by a single monolithic settings object.

Important settings keys:

| Key | Purpose |
| --- | --- |
| `theme`, `nightMode` | Appearance controls |
| `fontSize`, `lineSpacing`, `wordSpacing`, `readerMargin`, `verseSpacing` | Verse reader typography |
| `translationVisible`, `translationId` | Translation display and active source |
| `riwayah`, `quranTextStyleId`, `mushafEditionId`, `mushafEditionSetupVersion` | Active reader profile plus atomically persisted first/cleared Mushaf selection marker |
| `mushafViewMode`, `mushafFitWidth` | Independent Mushaf Single/Scroll navigation and Fit page/Fit width preferences |
| `currentPosition`, `lastSurface`, `recentSurahs` | Reader continuity |
| `wirdPlan`, `wirdReaderStatusVisible`, `wirdReminderLastSentDay`, `wirdNotificationPermissionPrompted` | Daily Wird state, visibility, reminder dedupe, and first-launch notification prompt state |

## Bookmarks

Bookmarks are reading-continuity records, not study annotations.

Verse bookmark shape:

```ts
{
  id: string
  kind: 'verse'
  riwayah: 'qaloon'
  surah: number
  verse: number
  verseKey: string
  arabicSnippet: string
  createdAt: number
  updatedAt: number
}
```

Mushaf page bookmark shape:

```ts
{
  id: string
  kind: 'page'
  riwayah: 'qaloon'
  page: number
  verseKey: `m:${number}`
  createdAt: number
  updatedAt: number
}
```

The current MVP writes Qaloon (`qaloon`) only. The riwayah-scoped key shape remains to preserve future multi-profile separation.

## Runtime Dataset

Runtime files are served from `public/dataset/**` and loaded in the app as `/dataset/**`.

Core runtime files:

- `/dataset/surahs.json`
- `/dataset/juz.json`
- `/dataset/quran-text/{riwayah}/{quranTextStyleId}/{surah}.json`
- `/dataset/translations/{translationId}/{surah}.json`
- `/dataset/translations/_verse-aliases.json`
- `/dataset/indexes/text-assets.json`
- `/dataset/indexes/mushaf-assets.json`
- `/dataset/indexes/sources.json`
- `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/manifest.json`
- `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/pages/{page}.svg`
- `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/pages/{page}-{width}.webp`
- `/dataset/knowledge/**` optional knowledge shards

Runtime loaders validate that dataset URLs stay same-origin and under `/dataset/**`.

Search persistence starts at Dexie v8. `savedSearches` stores explicit query definitions with schema version, pack compatibility key, timestamps, filters, source lanes, and display preferences. It does not store result windows; results are recomputed against the active compatible pack.

Search pack activation state uses content-addressed records. `searchPackActivations` stores the current active pack id, pack version, content hash, dedicated cache name, activation generation, status, byte counts, verification timestamps, and any error. `searchPackStaging` stores install/verify progress for a content hash before activation.

Search pack runtime assets live outside `/dataset/**`: the registry is `/search-packs/registry.json`, and immutable pack manifests and shards live under `/search-packs/packs/<contentHash>/**`. They have one cache owner: the dedicated Search installer/cache, not the generic dataset CacheFirst route.

The active Search pack includes source-backed morphology feature shards derived from the verified Quranic Arabic Corpus 0.4 source under `data/normalized/search/qac/`. These shards provide Hafs analytical metadata for same written form, same root, lemma, and Surah context Search modes. Phase 3 graph shards add attested following wording, shared wording adjacency, repeated phrases, occurs-once phrases, ayah endings, and Counts & patterns aggregates. They are Search pack assets, not `/dataset/**` files, and Reader word highlighting remains disabled until Qalun token alignment is validated.

## Translation Alignment

Translations are keyed to Hafs-style verse numbering. The current Qaloon runtime uses `/dataset/translations/_verse-aliases.json` plus `src/data/verse-aliases.ts` to map ayah references into identity, merged, primary, continuation, or missing translation roles. `src/data/reader-corpus.ts` joins the active Quran text, translation pack, footnotes, aliases, and optional knowledge state into the reader corpus consumed by React components.

## Mushaf Pages

Mushaf page assets are edition-aware. Quran.ws keeps manifest V1 with inline-safe SVG page bodies. The private Furatiyyah edition uses manifest V2: each of 604 pages declares its canonical `firstVerse`, a unit Full-relative `textFrame` and side lane, plus `external-image` media with a 2,136-wide fallback and both SHA-256-described WebP renditions. The asset index repeats those descriptor values with absolute same-origin URLs. `src/packs/mushaf-index.ts`, `src/packs/mushaf-paths.ts`, and `src/packs/mushaf-page-asset.ts` validate:

- riwayah identity
- Mushaf edition identity
- manifest page membership
- same-origin asset paths
- SVG safety before rendering, or V2 manifest/index descriptor agreement before external-image preparation

The V2 boundary resolves only manifest-declared edition-relative WebP paths, derives a page's final verse from `verseToPage`, and prepares an image only after browser load and `decode()` complete. The reader retains a five-page logical window: the requested page is current, adjacent pages are decode-gated previews, and the two outer pages are validated descriptors until promoted. The viewer mounts V1 as sanitized inline SVG and V2 as an external image. `mushafPageFraming` is a bounded 0–1 settings value; framing controls are available only when the active V2 manifest validates reviewed framing on every page.

`mushafEditionSetupVersion` is not a schema migration: it is a settings record. A valid existing asset contract with no marker receives the quran.ws selection and version in one readwrite transaction while all other records remain intact. Fresh or compatibility-reset storage has no setup marker and must choose from the current compatible availability index. A marker paired with an unavailable selected edition is a recovery state, not a prompt to remap old page bookmarks.

Page SVG and WebP bodies are runtime assets; they must not be embedded into JS bundles.

## Source Data

Build-only source data lives under `data/**`. Scripts convert it into committed runtime files under `public/dataset/**` and committed Search pack files under `public/search-packs/**`. The app never imports `data/**` directly.

## Invariants

- Build scripts validate source and generated dataset structure before runtime files ship.
- Browser persistence is schema-owned by `src/storage/schema.ts`.
- Runtime app code reads only same-origin `/dataset/**` assets.
- Current shipped profile is Qaloon text/font, Qaloon Mushaf, and Bridges translation.
- Removed or unsupported local settings are normalized or ignored before they can alter the current MVP reader profile.
