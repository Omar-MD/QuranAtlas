# Data Model

IDB is the single source of client-side truth in QuranAtlas. This file documents every object store, every key, every index, and the record shape each surface writes. If you find something in IDB that isn't here, either (a) we've drifted — update this doc — or (b) an extension is writing there.

The DB is `quran-atlas`, version 3, defined in `src/core/db.ts`. Schema changes live in `onupgradeneeded`.

**Write gate.** Every `put(storeName, value)` passes through `validateWrite()` in `core/db.ts`. Validation checks both field presence **and field types** before any transaction opens. Required fields are declared in `_shapes`; optional fields with type constraints are in `_optionalTypes`. Missing required fields or type mismatches throw synchronously.

**Compile-time contract.** The per-store record shapes are also encoded as TypeScript `interface`s and exported as the `StoreRecords` map from `core/db.ts`. `put<K>(store: K, record: StoreRecords[K])` makes the compiler refuse a write whose shape doesn't match the declared store. Runtime `validateWrite` is still the last-line defence (and carries the SW-side shape union for `activationState`); the TS types catch most drift in advance. The sections below quote the interface name that mirrors each runtime shape.

---

## Store: `settings`

- **keyPath:** `key`
- **Record shape:** `{ key: string, value: any }` — TS interface `SettingsRecord` in `core/db.ts`
- **Validated fields:** `key` (string, required); `value` (any, required — present but not type-checked)
- **Indexes:** none
- **Written by:** many modules (this is the app's scratchpad for preferences and session pointers)

### Known keys

| Key | Value type | Writer | Purpose |
|---|---|---|---|
| `theme` | `'light' \| 'sepia' \| 'dark' \| 'auto'` | `settings/theme.ts` | Active theme. `auto` follows `prefers-color-scheme`. |
| `riwayah` | `'hafs' \| 'warsh' \| 'qaloon'` | `settings/riwayah.ts` | Active Riwayah for reader text + font + line-height floor. Default `'qaloon'`. Sole writer. Cross-tab broadcast via `safety/sync.ts::broadcastRiwayahChange`. |
| `fontSize` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `settings/font-size.ts` | Reader font scale (sole writer). |
| `lineSpacing` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `settings/reading-typography.ts` | Reader line-height step (Arabic + translation, ratio preserved). Sole writer. |
| `wordSpacing` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `settings/reading-typography.ts` | Reader word-spacing step (Arabic + translation). Sole writer. |
| `readerMargin` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `settings/reading-typography.ts` | Reader column inset step. Desktop: max-width on `#main-content` (inverse — larger step = narrower). Mobile: `--qa-verse-pad-x` on `.qa-verse` (xs ≈ edge-to-edge, xl wide gutters). Sole writer. |
| `verseSpacing` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `settings/reading-typography.ts` | Vertical padding between verses via `--qa-verse-pad-y` on `.qa-verse`. Sole writer. |
| `arabicFont_hafs` | `'amiri-quran' \| 'kfgqpc' \| 'scheherazade'` | `settings/arabic-font.ts` | Arabic font choice for the Hafs riwayah. Default `'amiri-quran'`. Sole writer. Active value drives `<html data-arabic-font>` only when `settings.riwayah === 'hafs'`. |
| `arabicFont_warsh` | `'amiri-quran' \| 'kfgqpc' \| 'scheherazade'` | `settings/arabic-font.ts` | Arabic font choice for the Warsh riwayah. Default `'amiri-quran'`. Sole writer. Same active-Riwayah rule as `arabicFont_hafs`. |
| `arabicFont_qaloon` | `'amiri-quran' \| 'kfgqpc' \| 'scheherazade'` | `settings/arabic-font.ts` | Arabic font choice for the Qaloon riwayah. Default `'amiri-quran'`. Sole writer. Same active-Riwayah rule as `arabicFont_hafs`. |
| `nightMode` | boolean | `settings/night-mode.ts` | Night recitation mode (dim+warm overlay via `.qa-night-shift`). Sole writer. |
| `surahHeaderHidden` | boolean | `settings/surah-header-visibility.ts` | User hid the in-reader Surah Header (title + meta + juz). Toggled by MarginHeader center-label tap. Bismillah + verses still render. Default `false`. Persists across surah navigation. Sole writer. |
| `translationVisible` | boolean | `settings/Panel.svelte` | Translation-toggle state. |
| `translationId` | string (id from `provenance.translations[]`; default `'saheeh'`) | `settings/Panel.svelte`, `onboarding/Onboarding.svelte` | Selected translation. Validated at read time against the shipped pack list. |
| `lastSurface` | string (hash path) | `core/router.ts`, `review/Hub.svelte` (FVR) | Where to resume on next launch. |
| `recentSurahs` | `number[]` (length ≤5) | `App.svelte` (`$effect` on `reader.currentSurahNum`) | Feeds the surah-list "Recent" filter. |
| `onboardingComplete` | boolean | `onboarding/Onboarding.svelte` | First-run flow completion flag. |
| `quota-warning-suppressed` | boolean | `core/quota-banner.svelte` | User dismissed the quota banner — don't re-show this session. |

Plus any other ad-hoc keys a feature introduces. Convention: write `{ key, value }` shape and scope the key to the feature (e.g. `review:lastFilter`). Avoid stuffing structured data into `value` if it has a natural dedicated store.

---

## Store: `meta`

- **keyPath:** `id` (string)
- **Validated fields:** `id` (string)
- **Written by:** `review/state.ts` (sole writer for `meta['review']`)
- **DB_VERSION:** introduced in v4 (cross-surah infinite scroll, 2026-04-25). Replaces the legacy `positions` store, which previously held both per-surah reading positions and the review-hub state with dummy `surah`/`verse` fields.

### Known record shapes

Review hub state (`id: 'review'`):

```ts
{
  id: 'review',
  savedAt: number,
  view: 'all' | 'fvr',
  activeTag: string | null,
  activeLayer: string,
  activeValue: string | null,
  surahFilter: number | null,
  sortBy: 'updatedAt' | 'createdAt',
  groupBy: 'tag' | 'surah' | 'flat',
}
```

### Typical queries

- **Load review state**: `review/state.ts::load()` → `get('meta', 'review')`.

### Reading position

Per-surah position records (`positions['s<n>']`) were retired in DB v4. Reading position is now a single global record stored as `settings.currentPosition` (see the `settings` store section). Sole reader/writer: `src/reader/global-position.ts`. The launch-restore cascade calls `loadGlobalPosition()` instead of the removed `getMostRecentPosition`.

---

## Store: `marks`

- **keyPath:** `verseKey` (string, e.g. `'2:255'`)
- **DB_VERSION:** 2 (v1 → v2 dropped and recreated the store — no migration; pre-release)
- **Indexes:**
  - `by-canon-threads` on `_canon.threads` (multiEntry)
  - `by-canon-subjects` on `_canon.subjects` (multiEntry)
  - `by-canon-audience` on `_canon.audience` (multiEntry)
  - `by-canon-speaker` on `_canon.speaker` (multiEntry)
  - `by-canon-quotedSpeaker` on `_canon.quotedSpeaker` (multiEntry)
  - `by-canon-mode` on `_canon.mode` (multiEntry)
  - `by-canon-form` on `_canon.form` (multiEntry)
  - `by-canon-tone` on `_canon.tone` (multiEntry)
  - `by-canon-people` on `_canon.people` (multiEntry)
  - `by-canon-places` on `_canon.places` (multiEntry)
  - `by-canon-events` on `_canon.events` (multiEntry)
  - `by-canon-divineNames` on `_canon.divineNames` (multiEntry)
  - `by-updated` on `updatedAt`
- **Validated fields (all required):** `verseKey` (string), 12 layer fields (string[], see below), `_canon` (any), `note` (string), `createdAt` (number), `updatedAt` (number) — TS interface `MarkRecord` + `LayerName` + `LAYER_NAMES` in `core/db.ts`
- **Written by:** `marks/store.ts` only. External callers NEVER populate `_canon` — it is computed inside the writer.

### Record shape

```ts
{
  verseKey: string,          // 'S:V', e.g. '2:255'
  // 12 free-form user-tagged layers (raw user input):
  threads: string[],
  subjects: string[],
  audience: string[],
  speaker: string[],
  quotedSpeaker: string[],
  mode: string[],
  form: string[],
  tone: string[],
  people: string[],
  places: string[],
  events: string[],
  divineNames: string[],
  // Denormalized canonical keys (computed by store.ts::save(), never by callers):
  _canon: Record<LayerName, string[]>,
  note: string,              // '' if no note
  createdAt: number,
  updatedAt: number,
}
```

### Write invariant

`marks/store.ts::save()` takes a `MarkInput` (raw layer arrays, no `_canon`), then:
1. Calls `computeCanon()` which runs every label through `core/normalize.ts::canonicalize()`.
2. `put`s the record (with createdAt preserved if existing, updatedAt refreshed).
3. `emit(MARKS_SAVED, { verseKey, tags })` — `tags` = union of canonical keys across all 12 layers.
4. `broadcastMarkChange([verseKey])` — peers receive `SYNC_UPDATE_RECEIVED` and re-read.

**Invariant: `_canon` is computed inside `marks/store.ts::save()` only. No external caller should ever populate `_canon`.**

**Invariant: a mark must carry ≥1 tag across the 12 layers to persist.** `save()` rejects empty input with `EmptyMarkError` before any IDB touch — a note alone is not sufficient. UI guards Save at the callsite so the error should never be user-visible. Exported helper: `hasAnyTag(input)`.

**Mark-level flags** (`hasQuestion`, `hasApplication`) were part of the 2026-04-20 data-model spec but were removed from UI + schema in the tagging polish pass; deferred to `future-work.md` if later needed.

`del()` mirrors this with `MARKS_DELETED` + broadcast.

If you bypass `store.ts` and write `marks` directly, `_canon` will be stale/missing, indexes will be wrong, indicators will go stale, and other tabs will miss the change. Don't.

### Typical queries

- **All marks**: `marks/store.ts::getAll()` → `store.getAll()`.
- **One mark**: `getByVerseKey(verseKey)` → `store.get(verseKey)`.
- **By layer canonical** (FVR deep link, filter): `getByLayerCanonical(layer, canonical)` → `index('by-canon-<layer>').getAll(canonical)`.
- **All canonical values for a layer**: `getAllCanonicalValues(layer)` — index-only key cursor scan.
- **By recency**: the hub sorts in memory after `getAll()` — the `by-updated` index is available if a cursor-based fetch becomes needed.

---

## Store: `activationState`

- **keyPath:** `id`
- **Validated fields:** `id` (string), `status` (string) — TS interface `ActivationStateRecord` in `core/db.ts`
- **Written by:** `data/offline.ts`, `offline/dataset-updater.js` (SW side)

### Record shapes

**Client side (`data/offline.ts`)** — minimal:

```ts
{
  id: 'current',
  status: 'none' | 'downloading' | 'cached',
}
```

**Service-worker side (`offline/dataset-updater.js`)** — richer:

```ts
{
  id: 'current',
  status: 'downloading' | 'verifying' | 'pending-confirmation' | 'applying' | 'idle' | 'failed',
  version?: string,
  progress?: number,
  error?: string,
}
```

### ⚠ Known tension

Client and service worker write overlapping but non-identical shapes to the same record. The client treats `status` as a small enum (`none | downloading | cached`); the SW dataset-updater treats it as a fuller state machine (`downloading → verifying → pending-confirmation → applying → idle`, with `failed` as a terminal). If you're editing this store, reconcile both writers. A cleanup could either:

- Carve the SW-side state into a separate `datasetUpdate` store, or
- Extend `validateWrite` and document the union, and align the client's three-state model with the SW's broader one.

This isn't actively broken — the two writers don't collide in practice because SW runs in a different process — but the shared `id: 'current'` means a newer SW write can clobber a stale client write. Worth being aware of.

---

## Store: `datasetMeta`

- **keyPath:** `id`
- **Validated fields:** `id` (string) — TS interface `DatasetMetaRecord` in `core/db.ts`
- **Written by:** `offline/dataset-updater.js` (SW side)

### Record shape

```ts
{
  id: 'current',
  version: string,      // the currently-applied dataset version
}
```

Only written after a successful `copyToLive` in the dataset-update pipeline. The client side reads this on boot indirectly via the service worker.

---

## Store: `edges`

- **keyPath:** `id` (string, UUID)
- **DB_VERSION:** 3 (added in v3)
- **Indexes:**
  - `by-from` on `from`
  - `by-to` on `to`
  - `by-canon-kind` on `_canonKind`
  - `by-updated` on `updatedAt`
- **Validated fields (all required):** `id` (string), `from` (string), `to` (string), `kind` (string), `_canonKind` (string), `directed` (boolean), `note` (string), `createdAt` (number), `updatedAt` (number) — TS interface `EdgeRecord` in `core/db.ts`
- **Written by:** `edges/store.ts` only. External callers NEVER populate `_canonKind` — it is computed inside the writer.

### Record shape

```ts
{
  id: string,             // UUID
  from: string,           // verseKey, e.g. '2:255'
  to: string,             // verseKey, e.g. '20:98'
  kind: string,           // raw user-supplied kind label, e.g. 'Parallel'
  _canonKind: string,     // kind.trim().toLowerCase() — computed by store, never by callers
  directed: boolean,      // false for symmetric kinds; auto-inferred unless overridden
  note: string,           // '' if no note
  createdAt: number,
  updatedAt: number,
}
```

### Write invariant

`edges/store.ts::createEdge()` takes `from`, `to`, `kind`, and optional `{ directed, note }`, then:
1. Validates both verse keys against `/^\d+:\d+(-\d+)?$/`.
2. Computes `_canonKind = kind.trim().toLowerCase()` (simple ASCII normalization, not the Arabic tag pipeline).
3. Infers `directed` from `inferDirectedFromKind(_canonKind)` unless overridden in opts.
4. `put`s the record.
5. `emit(EDGES_SAVED, { edgeId, from, to, kind })`.
6. `broadcastEdgeChange([edgeId])` — peers receive `SYNC_EDGES_UPDATED` and re-read.

**Invariant: `_canonKind` is computed inside `edges/store.ts` only. No external caller should populate `_canonKind`.**

`updateEdge` re-derives `_canonKind` (and re-infers `directed` unless the caller passes an explicit override) when `kind` is included in the patch.

`deleteEdge` emits `EDGES_DELETED` + broadcast.

### Typical queries

- **All edges**: `getAll()` → `store.getAll()`.
- **One edge**: `getById(id)`.
- **By verse (either end)**: `getByVerse(verseKey)` — unions `by-from` and `by-to` index lookups, deduplicates by id.
- **By kind**: `getByKindCanonical(canonKind)` → `index('by-canon-kind').getAll(canonKind)`.

---

## Static datasets (read-only, not in IDB)

- `public/dataset/riwayat/{hafs,warsh,qaloon}/{NNN}.json` (114 files per riwayah) — **active reader corpus**, KFGQPC Uthmanic text (Hafs v18, Warsh v10, Qaloon v10). `surahs.json`, `juz.json`, `manifest.json`, `provenance.json` live alongside. Built by `scripts/build-dataset.mjs` (renamed from `build-riwayat.mjs` 2026-04-27) from three monolithic source files; run via `pnpm build:dataset` (chained by `pnpm build`). Schema, font pairing, line-height floors, license caveats: see `docs/context/riwayat-dataset.md`. Do not write any of these to IDB unless a future surface needs offline caching beyond the SW pre-cache.

### Translation packs

- `public/dataset/translations/{id}/{NNN}.json` (114 files per shipped translation) — per-surah translation pack consumed by `Reader.svelte` via `dataset.ts::loadTranslationForSurah(id, n)`. **Schema:**
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
- `public/dataset/translations/{id}.raw.json` — **monolithic source**, committed to git, produced by per-translation fetch scripts (`scripts/fetch-translation-saheeh.mjs`). Skipped from `manifest.json` like the riwayat sources. Re-run the fetch script only when refreshing the upstream pack; ordinary builds run offline against the committed source.
- **Invariants (asserted by `scripts/build-dataset.mjs::buildTranslationSplits`):** 114 surahs present; per-surah verse count matches Hafs counting from `surahs.json`; verse keys are exactly `${surahNo}:${1..count}`; every `[N]` marker in verse text resolves to `footnotes[N]`; footnote keys are contiguous 1..K; every defined footnote is referenced at least once. Build hard-fails on any violation.
- **Markers:** `[N]` tokens in verse text are tokenised by `src/reader/translation-tokens.ts` and rendered as buttons by `Verse.svelte`; clicking one expands the footnote text inline below the translation. Translation strings stay byte-exact end-to-end (the build script does not normalize whitespace or punctuation) so license terms remain valid for redistribution.
- **provenance.json `translations[]`** — one entry per shipped pack: `{ id, label, translator, language, version, ayatCount, footnoteCount, hasIntros, license, licenseUrl, source, sourceUrl, fetchedAt }`. The Settings translation picker reads this list (via `dataset.ts::getTranslations`) so the UI never offers a pack the dataset does not contain.

## Cross-cutting rules

> **Invariant (formerly `CLAUDE.md` Rule 5) — one writer per store.** File references use basenames; grep for the basename, not a specific `.js`/`.ts`.
>
> - `marks` — written only via `marks/store`. Never `put('marks', …)` directly. Bypassing this breaks `_canon` computation, cross-tab broadcast, and the `MARKS_SAVED` / `MARKS_DELETED` event contracts (see `marks` §Write invariant above).
> - `edges` — written only via `edges/store`. Never `put('edges', …)` directly. Bypassing this breaks `_canonKind` computation, cross-tab broadcast, and the `EDGES_SAVED` / `EDGES_DELETED` event contracts (see `edges` §Write invariant above).
> - `meta` — written by `review/state` (sole writer for `meta['review']`).
> - `activationState` / `datasetMeta` — written by `data/offline` (client) or `offline/dataset-updater` (SW).
> - `settings` is the shared scratchpad — each feature owns its own keys, namespaced. Sole-writer keys: `theme` (`settings/theme`), `riwayah` (`settings/riwayah`), `fontSize` (`settings/font-size`), `lineSpacing` / `wordSpacing` / `readerMargin` / `verseSpacing` (`settings/reading-typography`), `arabicFont_hafs` / `arabicFont_warsh` / `arabicFont_qaloon` (`settings/arabic-font`), `nightMode` (`settings/night-mode`), `surahHeaderHidden` (`settings/surah-header-visibility`), `currentPosition` (`reader/global-position`).
>
> Violating this rule causes silent cross-tab / event-contract bugs that are hard to catch in review. If you need a new writer, add it to this list in the same commit.

- **All writes go through `core/db::put`** (client side), which runs `validateWrite`. Service-worker code uses its own `idbPut` wrapper but writes to the same underlying DB.
- **`versionchange` invalidates the handle.** If a peer tab deletes the DB, `DB_VERSION_CHANGE` fires and `dbPromise` is cleared — the next call to `getDb()` reopens. `safety/sync.ts` shows the reload banner; `settings/clear-data.ts` suppresses this via `suppressNextVersionChange()` when the current tab is the one deleting.
- **Quota**: `put()` detects `QuotaExceededError` and emits `DB_QUOTA_EXCEEDED`. `core/quota-banner.svelte` surfaces the UI. A soft-warning threshold fires earlier via `STORAGE_QUOTA_WARNING`.
- **Cross-tab coherence**: mark writes broadcast a `'marks:changed'` BroadcastChannel message → `SYNC_UPDATE_RECEIVED` on receipt. Edge writes broadcast `'edges:changed'` → `SYNC_EDGES_UPDATED` on receipt. Other stores don't broadcast — if you add cross-tab writes for `settings` or `meta`, extend `safety/sync.ts`.

## Adding a new store

1. Add the store in `core/db.ts::openDB` inside `onupgradeneeded` and bump `DB_VERSION`. Write a clean upgrade path (no destructive rewrites unless you've handled migration).
2. Add a `@typedef` JSDoc comment and a required-fields entry to `_shapes` in `validateWrite`. Add optional-but-type-checked fields to `_optionalTypes` if applicable.
3. If the store needs an index, create it inside the same `onupgradeneeded` block.
4. Update this file: add a section with keyPath, indexes, record shape, writers, and typical queries.
5. Consider whether writes should cross tabs (broadcast via `safety/sync.ts`) and whether they should emit a public event.
