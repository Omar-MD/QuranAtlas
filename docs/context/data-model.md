# Data Model

IDB is the single source of client-side truth in QuranAtlas. This file documents the **cross-cutting rules** that hold across every store, the canonical store-→-owner-dossier index, and the static datasets shipped outside IDB. **Per-store record shapes, indexes, and write invariants live in the owning surface dossier** (`docs/context/surfaces/<surface>.md` §Data) — see the index below.

The DB is `quran-atlas`, version 6, defined in `src/core/db/`. Schema changes live in `src/core/db/migrations.js::applySchema`.

**Write gate.** Every `put(storeName, value)` passes through `validateWrite()` in `src/core/db/validate.ts`. Validation checks both field presence **and field types** before any transaction opens. Required fields are declared in `_shapes`; optional fields with type constraints are in `_optionalTypes`. Missing required fields or type mismatches throw synchronously.

**Compile-time contract.** Per-store record shapes are also encoded as TypeScript `interface`s and exported as the `StoreRecords` map from `src/core/db/types.ts`. `put<K>(store: K, record: StoreRecords[K])` makes the compiler refuse a write whose shape doesn't match the declared store. Runtime `validateWrite` is still the last-line defence (and carries the SW-side shape union for `activationState`); the TS types catch most drift in advance.

---

## Per-store details — see owning dossier

<!-- AUTO-GENERATED:store-owner-index START -->
| Store | Owner dossier |
| --- | --- |
| `activationState` | [`review`](surfaces/review.md) |
| `audioPosition` | [`listen`](surfaces/listen.md) |
| `bookmarks` | [`navigate`](surfaces/navigate.md) |
| `datasetMeta` | [`infra`](surfaces/infra.md) |
| `marks` | [`mark`](surfaces/mark.md) |
| `meta` | [`read`](surfaces/read.md) |
| `settings` | [`configure`](surfaces/configure.md) |
<!-- AUTO-GENERATED:store-owner-index END -->

Each dossier carries:

- `keyPath`, `DB_VERSION` at which it landed, indexes
- Validated fields list (mirror of `_shapes`)
- Sole writer (one per store; for `settings`, one per **key**)
- Record-shape TS snippet
- Typical queries

If you change a store's shape, indexes, key, or sole writer — update the **dossier**, then re-run `pnpm run docs` so the index here picks up any owner shift. Within the shared `settings` store, `settings.wirdPlan` is a read-surface-owned key whose sole writer lives in `src/read/wird/store.ts`, even though the store itself remains configure-owned.

Some stores document implementation that exists pending later source cleanup. `bookmarks` remains active reading-continuity data. `marks`, `activationState`, `edges`, and `audioPosition` describe current code and persistence contracts only; they are removed product scope unless a later cleanup or product decision changes that status.

---

## Static datasets (read-only, not in IDB)

- `public/dataset/riwayat/qaloon/{NNN}.json` (114 files) — **baseline reader corpus**, KFGQPC Uthmanic text for Qalun v10. Product prose uses Qalun; runtime keys and paths continue to use `qaloon`. Hafs and Warsh normalized sources remain under `data/normalized/quran/riwayat/` for counts, translation-alignment validation, and the `full` dataset profile, but their per-surah bodies are not emitted by the baseline build. `surahs.json`, `juz.json`, `indexes/sources.json`, `indexes/source-assets.json`, `manifest.json`, and `provenance.json` live alongside. `scripts/data/cli.mjs` orchestrates `scripts/data/text/build.mjs`, `scripts/data/knowledge/build.mjs`, `scripts/data/mushaf-pages/build.mjs`, and `scripts/data/manifest/inventory.mjs`; `pnpm run data -- build` emits the baseline runtime manifest plus same-origin optional source assets and any available Qalun page pack, and is chained by `pnpm run build`. Source formats, font pairing, normalization rules, and build/runtime boundaries live in `docs/context/source-data-flow.md`. Do not write any of these to IDB unless a future surface needs offline caching beyond the SW pre-cache.
- `data/catalog/*.json` — QuranAtlas-owned source catalog: authorities, licenses, source records, verification rules, and generic fetch metadata. `scripts/data/source-catalog.mjs` validates provider/license/default-visibility/output-path/fetch rules, `scripts/data/fetch-source.mjs` refreshes normalized sources, and `scripts/data/text/build.mjs` emits the runtime subset to `public/dataset/indexes/sources.json`.
- `data/catalog/mushaf-pages.json` — quran.ws Mushaf page source policy. It maps QuranAtlas riwayah ids (`hafs`, `warsh`, `qaloon`) to quran.ws source slugs (`hafs`, `warsh`, `qalun`), declares the 604-page count, and records free-use page-asset provenance.
- `data/normalized/mushaf-pages/{riwayah}/pages/{NNN}.svg` — generated local/release artifact inputs produced by `scripts/data/mushaf-pages/import.mjs` from quran.ws page PDFs. This tree is gitignored by default; normal data builds do not fetch quran.ws and do not require these files.
- `public/dataset/mushaf-pages/{riwayah}/manifest.json` and `public/dataset/mushaf-pages/{riwayah}/pages/{NNN}.svg` — generated same-origin page packs emitted by `scripts/data/mushaf-pages/build.mjs` when a complete local SVG set is present. Baseline page output is Qaloon-only; the `full` profile can emit Hafs, Warsh, and Qaloon. Clean-checkout builds skip absent page packs with a warning unless a release command passes `--require-riwayah=<id>`. Runtime never fetches quran.ws.
- `data/taxonomy/themes.json` and `data/normalized/knowledge/*.json` — curated Knowledge Lane build inputs (Phase 01). Build-only sources; never imported by runtime modules.
- `public/dataset/knowledge/ayah/{NNN}.json`, `public/dataset/knowledge/passages/{NNN}.json`, and `public/dataset/knowledge/indexes/*.json` — deterministic knowledge shards and indexes generated by `scripts/data/build-knowledge-dataset.mjs`, consumed by `src/data/knowledge-dataset.ts`. Missing files are treated as optional at runtime (`null` / empty fallbacks), so reader text rendering stays independent.

Qira'ah/riwayah, translation, tafsir, curated metadata, Mushaf page, and search/index assets use one-active-pack semantics. Optional pack availability in `indexes/sources.json`, `indexes/source-assets.json`, or `indexes/riwayah-packages.json` is not enough for rendering; install-state verification decides usability.

### Translation packs

- `public/dataset/translations/{id}/{NNN}.json` (114 files per shipped translation) — per-surah translation pack consumed by `Reader.svelte` via `src/data/dataset.ts::loadTranslationForSurah(id, n)`. **Schema:**
  ```ts
  {
    translationId: string,         // 'saheeh', 'bridges', etc.
    translationVersion: string,    // upstream id + fetch month, e.g. '20.2026-04'
    surahNo: number,               // 1..114
    intro: string[],               // optional surah intro paragraphs (empty array when not shipped)
    verses: Array<{ key: string, text: string }>,
    footnotes: Record<string, string>, // keys '1'..'K' contiguous; markers in text are `[N]` tokens
  }
  ```
- `data/normalized/translations/{id}.json` — **normalized monolithic source**, committed to git outside `public/`, produced by `scripts/data/fetch-source.mjs` from catalog fetch metadata. Quran DB and QUL translation payloads are normalized into the same source shape used by the build; Bridges uses QUL so its authored footnotes and complete Surah 79 text are present. Build-only input; never shipped to clients.
- **Invariants (asserted by `scripts/data/build-dataset.mjs::buildTranslationSplits`):** 114 surahs present; per-surah verse count matches Hafs counting from `surahs.json`; verse keys are exactly `${surahNo}:${1..count}`; every `[N]` marker in verse text resolves to `footnotes[N]`; footnote keys are contiguous 1..K; every defined footnote is referenced at least once. Build hard-fails on any violation.
- **Markers:** `[N]` tokens in verse text are tokenised by `src/read/translation-tokens.ts` and rendered as buttons by `Verse.svelte`. Translation strings stay byte-exact end-to-end (the build script does not normalize whitespace or punctuation) so license terms remain valid for redistribution.
- **provenance.json `translations[]`** — one entry per shipped pack: `{ id, label, translator, language, version, ayatCount, footnoteCount, hasIntros, license, licenseUrl, source, sourceUrl, fetchedAt, primaryRiwayah, coverage }`. The Settings translation picker reads this list (via `src/data/dataset.ts::getTranslations`) so the UI never offers a pack the dataset does not contain.

### Tafsir packs

- `data/normalized/tafsir/muyassar.json` — committed normalized source derived from QUL Tafsir Muyassar resource 38. It preserves QUL grouped tafsir ranges as one canonical entry instead of duplicating text per ayah.
- `public/dataset/tafsir/{id}/{NNN}.json` (114 files per selectable tafsir) — per-surah tafsir packs consumed by `src/data/dataset.ts::loadTafsirForSurah(id, n)`. The baseline manifest includes `muyassar`; optional `mukhtasar` and `saadi` files live on the same origin and are planned by `indexes/source-assets.json` for on-demand cache/download. **Schema:**
  ```ts
  {
    tafsirId: string,
    tafsirVersion: string,
    language: string,
    surahNo: number,
    entries: Array<{
      id: string,
      startKey: string,
      endKey: string,
      ayahKeys: string[],
      sourceGranularity: 'ayah' | 'range',
      text: string,
    }>,
  }
  ```
- **Invariants (asserted by `scripts/data/build-dataset.mjs::buildTafsirSplits`):** every entry has valid `S:A` keys; grouped QUL ranges keep their full `ayahKeys`; `sourceGranularity` is `range` when a single tafsir text spans more than one ayah.
- **provenance.json `tafsir[]`** — one entry per shipped tafsir pack: `{ id, label, language, version, entryCount, rangeEntryCount, license, licenseUrl, source, sourceUrl, coverage }`.

### Knowledge lane packs (Phase 01)

- `public/dataset/knowledge/ayah/{NNN}.json` (114 files) — per-surah ayah knowledge rows. Each row includes `{ key, passageId|null, themes[] }`, and every ayah in the surah is present even when `themes` is empty.
- `public/dataset/knowledge/passages/{NNN}.json` (114 files) — approved curated passage rows for each surah, emitted from `data/normalized/knowledge/passages.json`.
- `public/dataset/knowledge/indexes/theme-to-ayah.json` — deterministic map of `themeId -> ayahKey[]`.
- `public/dataset/knowledge/indexes/ayah-to-passage.json` — deterministic map of `ayahKey -> passageId`.
- `public/dataset/knowledge/indexes/passage-to-ayah.json` — deterministic map of `passageId -> ayahKey[]`.
- **Invariants (asserted by `scripts/data/build-knowledge-dataset.mjs`):** theme ids must exist in `data/taxonomy/themes.json`; ayah keys/ranges must be valid Hafs-keyed addresses; passage ranges must stay inside one surah and must not overlap in Phase 01; theme weights must be in `[0,1]`; only `source.reviewStatus === "approved"` passages are emitted to runtime files.
- **Knowledge manifest inclusion:** `scripts/data/manifest/inventory.mjs` records `knowledge/**` outputs as lane-owned inventory entries in `public/dataset/manifest.json`, and the existing offline/update pipeline caches them under the Text selector path without requiring a separate persisted toggle.

### Source index and profiles

- `public/dataset/indexes/sources.json` — runtime source catalog index. It lists default sources (`qaloon`, `bridges`, `muyassar`), selected optional translation packs (`saheeh`, `clear-quran`, `abdel-haleem`), selected optional tafsir packs (`mukhtasar`, `saadi`), baseline/optional visibility, same-origin output path templates, and whether each body is present in the current manifest. Optional Hafs and Warsh entries are discoverable here while their bodies are omitted from the baseline manifest.
- `public/dataset/indexes/source-assets.json` — source-pack download index. It lists byte totals and per-surah file paths for selectable translation and tafsir packs, including optional packs that are present on the static origin but excluded from `manifest.json`. Settings and `src/data/offline.ts` use it for source selection pre-flight, on-demand caching, and cache removal.
- `public/dataset/manifest.json` — runtime inventory manifest. **Schema:**
  ```ts
  {
    packageVersion: string
    profile: 'baseline' | 'full' | 'catalog'
    builtAt: string
    lanes: Record<string, { enabled: boolean; files: number; bytes: number }>
    files: Array<{
      path: string
      lane: 'text' | 'knowledge' | 'reflection' | 'search' | 'pages'
      category:
        | 'text-core'
        | 'text-riwayah'
        | 'text-translation'
        | 'text-tafsir'
        | 'text-index'
        | 'knowledge-ayah'
        | 'knowledge-passages'
        | 'knowledge-index'
        | 'reflection-prompts'
        | 'reflection-index'
        | 'search-index'
        | 'pages'
      bytes: number
    }>
  }
  ```
  Used by `src/data/dataset.ts::getManifestUrls`, `src/data/offline.ts`, `src/infra/sw/route-defs.ts::sumBytesForCategory`, and the service worker/update pipeline. Baseline/offline category caching trusts manifest membership and build-time validation, not per-file hashes. Optional source-pack caching is planned by `indexes/source-assets.json`.
- Dataset profiles:
  - `baseline`: emits Qaloon riwayah, Bridges translation, Muyassar tafsir, core metadata, source indexes, manifest, provenance, same-origin optional translation/tafsir pack files that stay outside the manifest, and a Qaloon page pack only when the generated local page artifacts are present.
  - `full`: emits every locally configured approved text source and every available generated Mushaf page pack for Hafs, Warsh, and Qaloon.
  - `catalog`: emits metadata/index files without text bodies or page bodies.
- Knowledge lane outputs are profile-independent in Phase 01 and are generated by the grouped `pnpm run data -- build` flow from curated local sources.
- Runtime guards in `src/data/dataset.ts` and `src/data/mushaf-pages.ts`: saved optional riwayah ids remain active only when their text and page packages are installed from the same-origin riwayah package index; otherwise the reader surfaces a promptable unavailable-pack state instead of implicitly switching to Qalun. If an optional selected translation or tafsir body cannot be verified usable, the reader must surface an unavailable state or explicitly switch the active setting to a verified baseline before rendering baseline content under a baseline label. `getTranslations()` and `getTafsirs()` read from `indexes/sources.json`, not `provenance.json`, so Settings can expose optional packs even when the current manifest does not include their bodies.

#### Translation ↔ riwayah alignment

Translations ship Hafs-keyed (Kufan numbering); Warsh and Qaloon (Madinan numbering) partition the same Quranic text differently. Hafs total 6236; Warsh / Qaloon 6214. A Hafs-numbered translation cannot 1:1 map to every Warsh / Qaloon ayah without explicit scholarly aliases — at split boundaries the same Quranic text is partitioned across different ayah counts. Note: count-equality across the three riwayat is **not** sufficient to imply identity boundaries; the source-data-flow reference documents the equal-count boundary-drift cases and the alias derivation path.

- `public/dataset/translations/_verse-aliases.json` — **per-ayah Hafs ↔ Warsh ↔ Qaloon equivalence table**, mechanically derived from KFGQPC by `scripts/data/derive-verse-aliases.mjs`. Schema:
  ```ts
  {
    _meta: { version: 1, description, generator, source, method, generatedAt },
    aliases: Record<string /* surahNo */, Array<{
      hafs: number,
      warsh: number | number[] | null,
      qaloon: number | number[] | null,
    }>>,
    aliasMeta: Record<string, {
      method: 'word-stream' | 'ayah-dp',
      warshMethod: string,
      qaloonMethod: string,
      reviewRecommended: boolean,
    }>,
  }
  ```
  KFGQPC's Madinah Mushaf is the authoritative source. Two aligners produce the table:
    1. **Word-stream cumulative** (`method: 'word-stream'`) — 53 of 60 surahs.
    2. **Ayah-boundary DP** (`method: 'ayah-dp'`) — 7 surahs (7, 27, 36, 40, 41, 56, 57) where qira'at-level word-count drift defeats word-stream alignment.
  Surah 1 is included for the Bismillah carve-out (Hafs 1:1 → `null` in Warsh / Qaloon).
  - **Runtime use**: `Reader.svelte::loadSurah` calls `src/data/verse-aliases.ts::loadVerseAliases()` once per session and `resolveTranslationFor(aliases, riwayah, surahNo, ayahNo)` per visible ayah. Roles: `identity` / `merged` / `primary` / `continuation` / `none`. See `read` dossier §Translation rendering.
  - **Coverage impact**: 100% across all three riwayat with aliases applied.
  - **Validation**: `scripts/data/validate-translation-mapping.mjs` is the canonical checker.

- `public/dataset/translations/_verse-map.json` — **checks anchor**, not a scholarly per-ayah equivalence table. Sole writer: hand-curated; build hard-fails (`scripts/data/build-dataset.mjs::validateVerseMap`) when divergences drift from `surahs.json` count diffs.

- **Coverage block** (`provenance.translations[].coverage[riwayah]`) — `{ total, covered, missing, divergentSurahs }` per riwayah, computed by `scripts/data/build-dataset.mjs::computeTranslationCoverage`.
- **Runtime guard**: `Reader.svelte::loadSurah` walks the active riwayah's ayat after building `translationByVerse` and emits `logger.warn('[translation-miss] …')` (dev-only) when the active riwayah ships an ayah index the Hafs-numbered translation has no key for.
- **Regression guard**: `tests/unit/data/translation-riwayah-alignment.test.js`.

---

## Cross-cutting rules

> **Removed-scope implementation invariant — single global `<audio>` element.** Owned by `src/listen/state.svelte.ts::getOrCreateAudioElement()` while the audio code remains. Multiple `<audio>` elements break iOS media-session binding and risk concurrent playback races. This documents current implementation pending source cleanup, not active product scope. (See `listen` dossier §Invariants.)

> **Invariant — one writer per store.** Per-store sole writers live in each owning dossier's §Invariants. The store→owner index above points to them. For the `settings` shared scratchpad, the rule holds at **key** granularity — one writer per key, listed in the `configure` dossier's §Data table. **Violating this rule causes silent cross-tab / event-contract bugs that are hard to catch in review. If you need a new writer, add it to the dossier's §Invariants in the same commit.**

- **All writes go through `src/core/db::put`** (client side), which runs `validateWrite`. Service-worker code uses its own `idbPut` wrapper but writes to the same underlying DB.
- **`versionchange` invalidates the handle.** If a peer tab deletes the DB, `DB_VERSION_CHANGE` fires and `dbPromise` is cleared — the next call to `getDb()` reopens. `src/infra/safety/sync.ts` shows the reload banner; `src/configure/clear-data.ts` suppresses this via `suppressNextVersionChange()` when the current tab is the one deleting.
- **Quota**: `put()` detects `QuotaExceededError` and emits `DB_QUOTA_EXCEEDED`. `src/core/quota-banner.svelte` surfaces the UI. A soft-warning threshold fires earlier via `STORAGE_QUOTA_WARNING`.
- **Cross-tab coherence**: mark writes broadcast a `'marks:changed'` BroadcastChannel message → `SYNC_UPDATE_RECEIVED` on receipt. Edge writes broadcast `'edges:changed'` → `SYNC_EDGES_UPDATED` on receipt. Other stores don't broadcast — if you add cross-tab writes for `settings` or `meta`, extend `src/infra/safety/sync.ts` (see `infra` dossier §Generic sync envelope).

---

## Adding a new store

1. Add the store in `src/core/db/migrations.js::applySchema` and bump `DB_VERSION`. Write a clean upgrade path (no destructive rewrites unless you've handled migration; pre-release schema-change-free posture per `project_pre_release` memory still applies).
2. Add a `@typedef` JSDoc comment + a required-fields entry to `_shapes` in `validateWrite`. Add optional-but-type-checked fields to `_optionalTypes` if applicable.
3. If the store needs an index, create it inside the same migration block.
4. **Pick the owning dossier** in `docs/context/surfaces/`. Add `owns_stores: [<store-name>]` to its frontmatter. Add a `### \`<store>\` store body` section under §Data with keyPath, indexes, record shape, writers, and typical queries.
5. Consider whether writes should cross tabs (broadcast via `src/infra/safety/sync.ts::registerTopic` + `broadcast`) and whether they should emit a public event.
6. Run `pnpm run docs` — the store→owner index above re-renders.
