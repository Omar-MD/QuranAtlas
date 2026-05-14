---
surface: infra
src_paths:
  - 'src/infra/offline/**'
  - 'src/infra/safety/**'
  - 'src/infra/service-worker/sw.js'
  - 'src/infra/service-worker/sw-handlers.js'
  - 'src/infra/sw/**'
owns_stores:
  - datasetMeta
test_paths:
  unit:
    - 'tests/unit/infra/offline/**'
    - 'tests/unit/infra/safety/**'
    - 'tests/unit/infra/service-worker/**'
    - 'tests/unit/infra/sw/**'
  e2e:
    - 'tests/e2e/infra/service-worker.spec.js'
    - 'tests/e2e/infra/offline.spec.js'
    - 'tests/e2e/infra/cross-tab.spec.js'
---

# Surface: infra

> Cross-cutting Reader First infrastructure. Service worker, offline asset-pack handling, install-state verification, manifest membership, byte planning, provenance, build-time validation, cross-tab safety, and update/clear-data banners. Audio cache routes are removed product scope pending source cleanup.

User-facing exposure: update banner (toast/popover when new build rolls out) + clear-data confirmation cross-tab banner. No standalone UI.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| App boot, `controllerchange` | passive (SW lifecycle) | `APP_UPDATE_AVAILABLE` → UpdateBanner |
| Service worker install | passive | precache + manifest membership fetch on demand |
| `BroadcastChannel('qa-sync')` message | passive | `safety/sync.ts` dispatches per-topic listener |
| IDB `versionchange` event (other tab cleared data) | passive | `safety/sync.ts` shows "Data was cleared in another tab — reload" banner |
| `visibilitychange` visible | passive | `DB_VISIBILITY_VISIBLE` → reader / position consumers |

No routes. Surface is invisible until something goes wrong (or update rolls out).

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/infra/offline/dataset-updater.js` | Dataset update orchestrator for service worker activate. |
| `src/infra/offline/manifest-fetcher.js` | Fetch the dataset manifest. |
| `src/infra/offline/offline-selector.svelte` | Per-feature offline opt-in selector. |
| `src/infra/offline/staging-cache.js` | Staging cache for dataset updates. |
| `src/infra/safety/input-validator.ts` | Input validation for navigation and tag parameters. |
| `src/infra/safety/state.svelte.ts` | _(no leading comment)_ |
| `src/infra/safety/sync.ts` | Cross-tab safety and synchronization module. |
| `src/infra/service-worker/sw-handlers.js` | _(no leading comment)_ |
| `src/infra/service-worker/sw.js` | Service worker for QuranAtlas. |
| `src/infra/sw/route-defs.ts` | Per-asset-class route definitions for the QuranAtlas service worker. |
| `src/infra/sw/strategies.ts` | Service-worker route registration. Pure data lives in `route-defs.ts`; |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Reload offline (H1)

With service worker active and dataset cached:

1. DevTools → Network → Offline.
2. Reload → reader still loads (shell + dataset served from cache); command sheet still works; `⌘K → 2:255` → preview renders from cache.

All major surfaces degrade gracefully. Reads from IDB + SW cache; no new persistence.

### Update banner

When a new build rolls out + SW activates: `controllerchange` fires → `app-bootstrap.ts` emits `APP_UPDATE_AVAILABLE` → `UpdateBanner.svelte` (mounted in `App.svelte`) surfaces with reload CTA.

### Cross-tab coherence

Backed by `safety/sync.ts` + native `BroadcastChannel('qa-sync')`. Generic envelope: `registerTopic` + `broadcast`. Cross-tab coherence is technical safety for open tabs on the same device. It is not user-facing sync, accounts, community, export/import, or shared collections.

**Marks change (I1):**
1. Tab A double-taps 1:5 → saves mark → `broadcastMarkChange(['1:5'])` fires.
2. Tab B's `safety/sync.ts` receives → emits `SYNC_UPDATE_RECEIVED { verseKeys: ['1:5'] }`.
3. Tab B's reader indicator refreshes → gold edge appears on 1:5 without reload.

IDB shared; no double-write.

**Mark deleted while editing (I2):**
1. Tab A has mark editor open for 2:255.
2. Tab B deletes 2:255 → broadcast → Tab A's editor receives `SYNC_UPDATE_RECEIVED` with that key → editor closes silently (no error, no toast).

**Clear-data in another tab (I3):**
1. Tab A running normally.
2. Tab B runs Clear Data → `suppressNextVersionChange()` keeps Tab B's banner off → `deleteDB` triggers `onversionchange` in Tab A.
3. Tab A's `safety/sync.ts` shows a "Data was cleared in another tab — reload" banner.

### Dataset manifest fetch + apply

`src/infra/offline/manifest-fetcher.js` fetches `public/dataset/manifest.json` without cache, `src/infra/offline/dataset-updater.js` stages listed files for updates, and `dataset:applied` fires after `applyUpdate()`.

The manifest is an inventory, not a digest ledger. The service worker update/download path refuses category-cache URLs that are absent from the manifest, but it does not perform per-file SHA verification before cache writes or update staging. Optional translation/tafsir source-pack caching is the narrow `CACHE_DATASET` exception: window code plans those URLs from `public/dataset/indexes/source-assets.json` and writes/removes them directly after quota pre-flight, so optional packs do not inflate the baseline manifest. Mushaf page packs are planned from `manifest.json` by riwayah and written through `cacheNameFor()` into `qa-pages-{riwayah}-v1`, not into `CACHE_DATASET`.

Riwayah package availability is summarized by `public/dataset/indexes/riwayah-packages.json`, which routes as `text-index` and caches in `CACHE_DATASET`. The package helper treats Qaloon as installed when the baseline same-origin text and page package are present. Hafs and Warsh are installable only when the index lists complete same-origin text and page assets, and become installed only after every planned text URL is found in `CACHE_DATASET` and every planned page manifest/SVG URL is found in `qa-pages-{riwayah}-v1`.

Window-side package installation is owned by `src/data/offline.ts`. It plans package bytes from the package index, pre-flights `navigator.storage.estimate()`, writes text URLs to `CACHE_DATASET`, writes page manifest/SVG URLs to the route-derived `qa-pages-{riwayah}-v1` cache, emits package-specific progress/errors, and verifies cache membership before `settings.riwayah` can change. Failed fetch or cache writes leave the active riwayah and previous-usable install intent untouched. Removing optional Hafs/Warsh deletes both cache groups; Qaloon removal is refused, and active optional removal first verifies and switches to Qaloon.

### Per-asset-class SW partition + offline opt-in selector

All SW route registrations live in `src/infra/sw/strategies.ts::registerAll()`, driven by the declarative `ROUTE_DEFS` table in `src/infra/sw/route-defs.ts`. Runtime selector categories remain compact (`text`, `pages`, `search`, plus removed-scope audio while code remains), but dataset text routes are source-aware underneath: `text-core`, `text-riwayah`, `text-translation`, `text-tafsir`, and `text-index` all share `quran-dataset-v2`. Audio mp3/timing/meta routes are removed product scope pending source cleanup, pages cache per-riwayah, search-index is a reader asset lane, and fonts are always-on. `cleanupStaleCaches` in `sw-handlers.js` preserves caches by prefix sourced from `route-defs.ts::CACHE_PREFIXES` — single source of truth. Adding a new asset class is one row in `ROUTE_DEFS` plus the prefix in `CACHE_PREFIXES`.

The window-side companion is `src/infra/offline/offline-selector.svelte` (mounted in Settings → Storage section, configure dossier). Per-feature opt-in: user checks Text / Audio / per-riwayah Pages / Search; selector pre-flights `navigator.storage.estimate()` and refuses Apply when the selection exceeds available quota. Baseline page availability is Qaloon-only unless the manifest includes a fuller artifact profile. Unavailable unchecked Hafs/Warsh page packs are hidden; unavailable previously checked packs stay visible so stale opt-ins can be removed. The Text row maps to the baseline source set (`qaloon`, `bridges`, `muyassar`) through `settings.offlineCategories.text.{riwayat,translations,tafsir}`. Optional translation and tafsir rows read byte plans from `indexes/source-assets.json`, can be cached on demand, and can be removed from Cache Storage by uncheck + Apply. Knowledge Lane files under `/dataset/knowledge/**` still route as `text-knowledge`, share `CACHE_DATASET`, and are included in the existing Text offline row. The top-level selector category remains `text`; `text-knowledge` is an internal route class used for byte summing, service-worker matching, and cache cleanup. `src/data/offline.ts::startCategoryDownload(cat)` filters manifest inventory entries through `route-defs.ts::sumBytesForCategory()`, while `startSourceAssetDownload(kind, id)` filters optional source packs through `indexes/source-assets.json`. Generic `startCategoryDownload('pages')` and `removeCategoryDownload('pages')` throw so callers use `startPageAssetDownload(riwayah)` / `removePageAssetDownload(riwayah)`.

### Generic sync envelope

`safety/sync.ts::registerTopic` + `broadcast` — each store/feature plugs in by registering a topic name. This same-device envelope is technical infrastructure, not user-facing sync or multi-device product scope.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `datasetMeta`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `datasetMeta` store body

Current dataset package version for the applied runtime corpus. Sole writer: `src/infra/offline/dataset-updater.js` (or equivalent — see `data-model.md` §Cross-cutting rules).

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `sync:bookmarks-updated` | `Events.SYNC_BOOKMARKS_UPDATED` | `src/infra/safety/sync.ts:276` |
| `sync:edges-updated` | `Events.SYNC_EDGES_UPDATED` | `src/infra/safety/sync.ts:264` |
| `sync:update-received` | `Events.SYNC_UPDATE_RECEIVED` | `src/infra/safety/sync.ts:256` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `db:version-change` | `Events.DB_VERSION_CHANGE` | `src/infra/safety/sync.ts:102` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **SW category downloads cache only manifest-listed dataset URLs.** Manifest membership is the runtime allowlist for baseline/update category downloads. Optional source-pack caching is window-planned from `indexes/source-assets.json` and does not go through the manifest-membership SW message path. Mushaf page caching is also manifest-listed but page-specific: helpers filter by riwayah and use route-derived `qa-pages-{riwayah}-v1` caches.
- **Riwayah package index is a text index.** `/dataset/indexes/riwayah-packages.json` belongs to `text-index`, uses `CACHE_DATASET`, and is included in `manifest.json` so offline/update flows keep the package gate available.
- **Optional riwayah package status is cache-derived.** Hafs/Warsh availability in the package index is not enough for rendering; installed status requires cache hits in both the dataset cache and that riwayah's page cache.
- **Optional package removal preserves a usable active riwayah.** Qaloon cannot be removed. If Hafs or Warsh is active, removal must first switch to verified Qaloon; otherwise the delete is refused.
- **Sole writer of `datasetMeta`: `src/infra/offline/dataset-updater.js`** (or store-specific writer — see `data-model.md`).
- **Cross-tab broadcast goes through `safety/sync.ts::broadcast` + `registerTopic`.** Don't open new BroadcastChannels directly — register a topic.
- **`suppressNextVersionChange()` armed before `deleteDB()`** — ensures the same tab doesn't get its own clear-data banner.
- **Every SW `registerRoute()` call lives in `src/infra/sw/strategies.ts::registerAll()`.** No inline route registrations in `sw.js`. Adding a new asset class = one entry in `route-defs.ts::ROUTE_DEFS` and (if it introduces a new cacheName prefix) one entry in `CACHE_PREFIXES`.
- **Per-asset-class cache prefixes preserved by `cleanupStaleCaches`** sourced from `route-defs.ts::CACHE_PREFIXES` (passed as `preservePrefixes`) — never hardcoded.
- **`route-defs.ts` is window-importable.** Workbox imports live only in `strategies.ts` (SW-only). Window code (offline-selector, data/offline.ts) reads the table for byte-sum + URL-filter helpers.
- **`settings.offlineCategories` is the source of truth for "user opted into category/source X".** Text opt-in is source-aware (`text.riwayat`, `text.translations`, `text.tafsir`) with a migration from the former `{ hafs, warsh, qaloon }` text shape. Pages opt-in is source-aware by riwayah, with the former `{ _all: true }` pages shape normalized to `{ qaloon: true }`. Optional translation and tafsir source rows write the same text maps. `text-knowledge` has no separate persisted toggle; it is bundled into the Text plan when present in `manifest.json`. `getActivationState()` reports `'cached'` when any category/source/page is opted in; `'downloading'` while a `CACHE_DATASET` category download is in flight.
- **Build-time validation is the integrity gate.** The lane builders must hard-fail on structural or product drift before `manifest.json` is emitted; per-file digest checks are not current product scope.
- **`@offline` Playwright project is the single carve-out for the preview build.** The dev server is the default; the service worker only emits in production builds. See `tests/e2e/AGENTS.md`.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (11):**

- `tests/unit/infra/offline/dataset-updater.test.js`
- `tests/unit/infra/offline/manifest-fetcher.test.js`
- `tests/unit/infra/offline/offline-selector.test.ts`
- `tests/unit/infra/offline/staging-cache.test.js`
- `tests/unit/infra/safety/csp-headers.test.ts`
- `tests/unit/infra/safety/input-validator.test.js`
- `tests/unit/infra/safety/state.test.ts`
- `tests/unit/infra/safety/sync.test.js`
- `tests/unit/infra/service-worker/sw-handlers.test.js`
- `tests/unit/infra/service-worker/sw.test.js`
- `tests/unit/infra/sw/route-defs.test.ts`

**E2E (3):**

- `tests/e2e/infra/cross-tab.spec.js`
- `tests/e2e/infra/offline.spec.js`
- `tests/e2e/infra/service-worker.spec.js`
<!-- AUTO-GENERATED:tests END -->
