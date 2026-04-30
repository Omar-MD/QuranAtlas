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

If you change a store's shape, indexes, key, or sole writer — update the **dossier**, then re-run `pnpm docs:derive` so the index here picks up any owner shift.

---

## Static datasets (read-only, not in IDB)

- `public/dataset/riwayat/{hafs,warsh,qaloon}/{NNN}.json` (114 files per riwayah) — **active reader corpus**, KFGQPC Uthmanic text (Hafs v18, Warsh v10, Qaloon v10). `surahs.json`, `juz.json`, `manifest.json`, `provenance.json` live alongside. Built by `scripts/build-dataset.mjs` (renamed from `build-riwayat.mjs` 2026-04-27) from three monolithic source files; run via `pnpm build:dataset` (chained by `pnpm build`). Schema, font pairing, line-height floors, license caveats: see `docs/context/riwayat-dataset.md`. Do not write any of these to IDB unless a future surface needs offline caching beyond the SW pre-cache.

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
- `data/raw/{id}.raw.json` — **monolithic source**, committed to git outside `public/`, produced by per-translation fetch scripts (`scripts/fetch-translation-saheeh.mjs`). Build-only input; never shipped to clients.
- **Invariants (asserted by `scripts/build-dataset.mjs::buildTranslationSplits`):** 114 surahs present; per-surah verse count matches Hafs counting from `surahs.json`; verse keys are exactly `${surahNo}:${1..count}`; every `[N]` marker in verse text resolves to `footnotes[N]`; footnote keys are contiguous 1..K; every defined footnote is referenced at least once. Build hard-fails on any violation.
- **Markers:** `[N]` tokens in verse text are tokenised by `src/reader/translation-tokens.ts` and rendered as buttons by `Verse.svelte`. Translation strings stay byte-exact end-to-end (the build script does not normalize whitespace or punctuation) so license terms remain valid for redistribution.
- **provenance.json `translations[]`** — one entry per shipped pack: `{ id, label, translator, language, version, ayatCount, footnoteCount, hasIntros, license, licenseUrl, source, sourceUrl, fetchedAt, primaryRiwayah, coverage }`. The Settings translation picker reads this list (via `src/data/dataset.ts::getTranslations`) so the UI never offers a pack the dataset does not contain.

#### Translation ↔ riwayah alignment

Translations ship Hafs-keyed (Kufan numbering); Warsh and Qaloon (Madinan numbering) partition the same Quranic text differently. Hafs total 6236; Warsh / Qaloon 6214. A Hafs-numbered translation cannot 1:1 map to every Warsh / Qaloon ayah without explicit scholarly aliases — at split boundaries the same Quranic text is partitioned across different ayah counts. Note: count-equality across the three riwayat is **not** sufficient to imply identity boundaries (see `riwayat-dataset.md` § Challenges → "Boundary drift at equal counts" — 9 surahs have equal counts but internally drifted boundaries that resync via compensating splits).

- `public/dataset/translations/_verse-aliases.json` — **per-ayah Hafs ↔ Warsh ↔ Qaloon equivalence table**, mechanically derived from KFGQPC by `scripts/derive-verse-aliases.mjs`. Schema:
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
  - **Validation**: `scripts/validate-translation-mapping.mjs` is the canonical checker.

- `public/dataset/translations/_verse-map.json` — **checks anchor**, not a scholarly per-ayah equivalence table. Sole writer: hand-curated; build hard-fails (`scripts/build-dataset.mjs::validateVerseMap`) when divergences drift from `surahs.json` count diffs.

- **Coverage block** (`provenance.translations[].coverage[riwayah]`) — `{ total, covered, missing, divergentSurahs }` per riwayah, computed by `scripts/build-dataset.mjs::computeTranslationCoverage`.
- **Runtime guard**: `Reader.svelte::loadSurah` walks the active riwayah's ayat after building `translationByVerse` and emits `logger.warn('[translation-miss] …')` (dev-only) when the active riwayah ships an ayah index the Hafs-numbered translation has no key for.
- **Regression guard**: `tests/unit/data/translation-riwayah-alignment.test.js`.

---

## Cross-cutting rules

> **Invariant — single global `<audio>` element.** Owned by `src/state/audio.svelte.ts::getOrCreateAudioElement()`. Multiple `<audio>` elements break iOS media-session binding and risk concurrent playback races. (See `listen` dossier §Invariants.)

> **Invariant — one writer per store.** Per-store sole writers live in each owning dossier's §Invariants. The store→owner index above points to them. For the `settings` shared scratchpad, the rule holds at **key** granularity — one writer per key, listed in the `configure` dossier's §Data table. **Violating this rule causes silent cross-tab / event-contract bugs that are hard to catch in review. If you need a new writer, add it to the dossier's §Invariants in the same commit.**

- **All writes go through `src/core/db::put`** (client side), which runs `validateWrite`. Service-worker code uses its own `idbPut` wrapper but writes to the same underlying DB.
- **`versionchange` invalidates the handle.** If a peer tab deletes the DB, `DB_VERSION_CHANGE` fires and `dbPromise` is cleared — the next call to `getDb()` reopens. `src/safety/sync.ts` shows the reload banner; `src/settings/clear-data.ts` suppresses this via `suppressNextVersionChange()` when the current tab is the one deleting.
- **Quota**: `put()` detects `QuotaExceededError` and emits `DB_QUOTA_EXCEEDED`. `src/core/quota-banner.svelte` surfaces the UI. A soft-warning threshold fires earlier via `STORAGE_QUOTA_WARNING`.
- **Cross-tab coherence**: mark writes broadcast a `'marks:changed'` BroadcastChannel message → `SYNC_UPDATE_RECEIVED` on receipt. Edge writes broadcast `'edges:changed'` → `SYNC_EDGES_UPDATED` on receipt. Other stores don't broadcast — if you add cross-tab writes for `settings` or `meta`, extend `src/safety/sync.ts` (see `infra` dossier §Generic sync envelope).

---

## Adding a new store

1. Add the store in `src/core/db/migrations.js::applySchema` and bump `DB_VERSION`. Write a clean upgrade path (no destructive rewrites unless you've handled migration; pre-release schema-change-free posture per `project_pre_release` memory still applies).
2. Add a `@typedef` JSDoc comment + a required-fields entry to `_shapes` in `validateWrite`. Add optional-but-type-checked fields to `_optionalTypes` if applicable.
3. If the store needs an index, create it inside the same migration block.
4. **Pick the owning dossier** in `docs/context/surfaces/`. Add `owns_stores: [<store-name>]` to its frontmatter. Add a `### \`<store>\` store body` section under §Data with keyPath, indexes, record shape, writers, and typical queries.
5. Consider whether writes should cross tabs (broadcast via `src/safety/sync.ts::registerTopic` + `broadcast`) and whether they should emit a public event.
6. Run `pnpm docs:derive` — the store→owner index above re-renders.
