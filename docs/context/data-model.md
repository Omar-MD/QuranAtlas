# Data Model

IDB is the single source of client-side truth in QuranAtlas. This file documents every object store, every key, every index, and the record shape each surface writes. If you find something in IDB that isn't here, either (a) we've drifted — update this doc — or (b) an extension is writing there.

The DB is `quran-atlas`, version 1, defined in `src/core/db.ts`. Schema changes live in `onupgradeneeded`.

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
| `fontSize` | number (rem-scale multiplier) | `settings/font-size.ts` | Reader font scale. |
| `translationVisible` | boolean | `settings/Panel.svelte` | Translation-toggle state. |
| `translationId` | `'saheeh' \| 'pickthall' \| 'yusuf' \| 'khattab'` | `settings/Panel.svelte`, `onboarding/Onboarding.svelte` | Selected translation. |
| `lastSurface` | string (hash path) | `core/router.ts`, `review/Hub.svelte` (FVR) | Where to resume on next launch. |
| `recentSurahs` | `number[]` (length ≤5) | `App.svelte` (`$effect` on `reader.currentSurahNum`) | Feeds the surah-list "Recent" filter. |
| `onboardingComplete` | boolean | `onboarding/Onboarding.svelte` | First-run flow completion flag. |
| `quota-warning-suppressed` | boolean | `core/quota-banner.svelte` | User dismissed the quota banner — don't re-show this session. |

Plus any other ad-hoc keys a feature introduces. Convention: write `{ key, value }` shape and scope the key to the feature (e.g. `review:lastFilter`). Avoid stuffing structured data into `value` if it has a natural dedicated store.

---

## Store: `positions`

- **keyPath:** `id` (string)
- **Indexes:** `by-savedAt` on `savedAt`
- **Validated fields:** `id` (string), `surah` (number), `verse` (number), `savedAt` (number) — TS interface `PositionRecord` in `core/db.ts`
- **Written by:** `reader/position.ts`, `review/state.ts`

### Known record shapes

Reader position per surah (`id: 's<n>'`):

```ts
{
  id: `s${surahNum}`,       // e.g. 's2'
  surah: number,
  verse: number,
  savedAt: number,           // Date.now() — feeds by-savedAt index
}
```

Review hub state (`id: 'review'`) — reuses the store with dummy `surah`/`verse` to satisfy the schema:

```ts
{
  id: 'review',
  surah: 0,                  // dummy, required by validateWrite
  verse: 0,                  // dummy, required by validateWrite
  savedAt: number,
  view: 'all' | 'fvr',
  activeTag: string | null,
  surahFilter: number | null,
  sortBy: 'updatedAt' | 'createdAt',
  groupBy: 'tag' | 'surah' | 'flat',
}
```

The review-state reuse is intentional — see the comment at the top of `review/state.ts`. It avoids carving out a new store for a single record.

### Typical queries

- **Resume most recent**: `core/db.ts::getMostRecentPosition` — opens a reverse cursor on `by-savedAt` and returns the first hit. Called in the launch-restore cascade.
- **Resume specific surah**: `get('positions', 's<n>')` in `reader/position.ts`.
- **Load review state**: `review/state.ts::load()` → `get('positions', 'review')`.

---

## Store: `marks`

- **keyPath:** `verseKey` (string, e.g. `'2:255'`)
- **Indexes:**
  - `by-tag` on `tags` (multiEntry — each tag is indexed separately)
  - `by-updated` on `updatedAt`
- **Validated fields:** `verseKey` (string, required); `tags` (string[], type-checked when present), `note` (string, type-checked when present), `createdAt` (number, type-checked when present), `updatedAt` (number, type-checked when present) — TS interface `MarkRecord` in `core/db.ts`
- **Written by:** `marks/store.ts` only (bypasses `core/db.put()` — writes directly to IDB). If you write elsewhere, you're bypassing the event+broadcast contract.

### Record shape

```ts
{
  verseKey: string,          // 'S:V', e.g. '2:255'
  tags: string[],             // lowercased labels, 1+ expected
  note: string,               // '' if no note; introduced in M6
  createdAt: number,
  updatedAt: number,
}
```

### Write invariant

`marks/store.ts::save()` does three things in order, and callers rely on all three:
1. `put` the record (with createdAt preserved if existing, updatedAt refreshed).
2. `emit(MARKS_SAVED, { verseKey, tags })` — refreshes indicators on the reader.
3. `broadcastMarkChange([verseKey])` — peers receive `SYNC_UPDATE_RECEIVED` and re-read.

`del()` mirrors this with `MARKS_DELETED` + broadcast.

If you bypass `store.ts` and write `marks` directly, indicators go stale and other tabs miss the change. Don't.

### Typical queries

- **All marks**: `marks/store.ts::getAll()` → `store.getAll()`.
- **One mark**: `getByVerseKey(verseKey)` → `store.get(verseKey)`.
- **By tag** (FVR deep link): `getByTag(tag)` → `index('by-tag').getAll(tag)`. Multi-tagged marks appear in one query result; duplicates are not returned because `multiEntry` indexes verse keys once per tag.
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

## Cross-cutting rules

> **Invariant (formerly `CLAUDE.md` Rule 5) — one writer per store.** File references use basenames; grep for the basename, not a specific `.js`/`.ts`.
>
> - `marks` — written only via `marks/store`. Never `put('marks', …)` directly. Bypassing this breaks cross-tab broadcast and the `MARKS_SAVED` / `MARKS_DELETED` event contracts (see `marks` §Write invariant above).
> - `positions` — written by `reader/position` (via `savePosition()`) and `review/state`.
> - `activationState` / `datasetMeta` — written by `data/offline` (client) or `offline/dataset-updater` (SW).
> - `settings` is the shared scratchpad — each feature owns its own keys, namespaced.
>
> Violating this rule causes silent cross-tab / event-contract bugs that are hard to catch in review. If you need a new writer, add it to this list in the same commit.

- **All writes go through `core/db::put`** (client side), which runs `validateWrite`. Service-worker code uses its own `idbPut` wrapper but writes to the same underlying DB.
- **`versionchange` invalidates the handle.** If a peer tab deletes the DB, `DB_VERSION_CHANGE` fires and `dbPromise` is cleared — the next call to `getDb()` reopens. `safety/sync.ts` shows the reload banner; `settings/clear-data.ts` suppresses this via `suppressNextVersionChange()` when the current tab is the one deleting.
- **Quota**: `put()` detects `QuotaExceededError` and emits `DB_QUOTA_EXCEEDED`. `core/quota-banner.svelte` surfaces the UI. A soft-warning threshold fires earlier via `STORAGE_QUOTA_WARNING`.
- **Cross-tab coherence**: mark writes broadcast a `'marks:changed'` BroadcastChannel message → `SYNC_UPDATE_RECEIVED` on receipt. Other stores don't broadcast — if you add cross-tab writes for `settings` or `positions`, extend `safety/sync.ts`.

## Adding a new store

1. Add the store in `core/db.ts::openDB` inside `onupgradeneeded` and bump `DB_VERSION`. Write a clean upgrade path (no destructive rewrites unless you've handled migration).
2. Add a `@typedef` JSDoc comment and a required-fields entry to `_shapes` in `validateWrite`. Add optional-but-type-checked fields to `_optionalTypes` if applicable.
3. If the store needs an index, create it inside the same `onupgradeneeded` block.
4. Update this file: add a section with keyPath, indexes, record shape, writers, and typical queries.
5. Consider whether writes should cross tabs (broadcast via `safety/sync.ts`) and whether they should emit a public event.
