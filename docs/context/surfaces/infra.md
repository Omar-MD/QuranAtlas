---
surface: infra
src_paths:
  - 'src/infra/offline/**'
  - 'src/infra/safety/**'
  - 'src/infra/service-worker/sw.js'
  - 'src/infra/service-worker/sw-handlers.js'
  - 'src/infra/sw/**'
owns_stores:
  - activationState
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
style_paths:
  - 'src/styles/surfaces/overlays/**'
---

# Surface: infra

> Cross-cutting Reader First infrastructure. Service worker, default reader asset handling, manifest membership, byte planning, provenance, build-time validation, cross-tab safety, and update/clear-data banners. Optional install/activate asset-pack lifecycle is future multiple-profile work.

User-facing exposure: update banner (toast/popover when new build rolls out) + clear-data confirmation cross-tab banner. No standalone UI.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| `src/styles/surfaces/overlays/night-shift.css` | Night-shift overlay styles moved from flat surfaces. |
| `src/styles/surfaces/overlays/quota-banner.css` | Quota banner overlay styles moved from flat surfaces. |
| `src/styles/surfaces/overlays/save-failure-toast.css` | Save-failure toast overlay rules moved from src/styles/surfaces/toast.css. |
| `src/styles/surfaces/overlays/sync-banner.css` | _(no leading comment)_ |
| `src/styles/surfaces/overlays/update-banner.css` | Update banner overlay styles moved from flat surfaces. |
<!-- AUTO-GENERATED:style-inventory END -->

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
| `src/infra/offline/staging-cache.js` | Staging cache for dataset updates. |
| `src/infra/safety/input-validator.ts` | Input validation for active navigation input. |
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
2. Reload → reader still loads (shell + dataset served from cache); the `?` shortcuts sheet still opens from cached shell assets.

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

The manifest is an inventory, not a digest ledger. The service worker update/download path refuses category-cache URLs that are absent from the manifest, but it does not perform per-file SHA verification before cache writes or update staging. The current MVP uses the manifest and asset indexes for the default Qaloon + Bridges profile only. Mushaf page packs are planned from concrete asset indexes or manifest entries and written through `cacheNameFor()` into `qa-pages-{riwayah}-{mushafEditionId}-v1`, not into `CACHE_DATASET`.

Variant asset availability is summarized by `public/dataset/indexes/text-assets.json` and `public/dataset/indexes/mushaf-assets.json`; both route as `text-index` and cache in `CACHE_DATASET`. `public/dataset/indexes/riwayah-packages.json` is a compatibility facade derived from those two indexes. The package helper treats Qalun (`qaloon`) as installed when the baseline same-origin text and page package are present. Hafs and Warsh are not current installable profiles.

Window-side optional package installation is not exposed in the current MVP UI. `src/data/offline.ts` remains responsible for manifest/category status and default asset availability helpers; future multiple-profile work can reintroduce install-before-activate flows on top of the same indexes.

### Per-asset-class SW partition + offline opt-in selector

All SW route registrations live in `src/infra/sw/strategies.ts::registerAll()`, driven by the declarative `ROUTE_DEFS` table in `src/infra/sw/route-defs.ts`. Dataset text routes are source-aware underneath: `text-core`, `text-riwayah`, `text-translation`, and `text-index` all share `quran-dataset-v2`. Pages cache per-riwayah/edition, search-index is a reader asset lane, and fonts are always-on. `cleanupStaleCaches` in `sw-handlers.js` preserves caches by prefix sourced from `route-defs.ts::CACHE_PREFIXES` — single source of truth. Adding a new asset class is one row in `ROUTE_DEFS` plus the prefix in `CACHE_PREFIXES`.

The current window-side asset UI is `#/assets` (`src/configure/assets/AssetManagement.svelte`). It is read-only inventory for Qaloon Text + Font, Qaloon Mushaf, and Bridges Translation. The legacy `src/configure/offline-selector.svelte` and `settings.offlineCategories` normalizer remain for migration/unit coverage, but the mode-aware Settings shell no longer mounts that selector. Legacy removed-scope media opt-ins are dropped during normalization and ignored by `getActivationState()` so hidden state does not linger invisibly or keep reader-first cache summary stuck on `cached`.

Baseline page availability is Qalun-only; the runtime/package key remains `qaloon`. Variant Quran text files under `/dataset/quran-text/**` route as `text-riwayah`; edition-aware Mushaf files under `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/**` route as `pages` and use `qa-pages-{riwayah}-{mushafEditionId}-v1`, while legacy Mushaf paths keep `qa-pages-{riwayah}-v1` during migration. Knowledge Lane files under `/dataset/knowledge/**` still route as `text-knowledge` and share `CACHE_DATASET`. `src/data/offline.ts::startCategoryDownload(cat)` filters manifest inventory entries through `route-defs.ts::sumBytesForCategory()`. Optional source-pack download/remove helpers are not current MVP APIs.

React proof-only Mushaf loading follows the same same-origin `/dataset/**` and edition-aware path boundary through `src-react/packs/mushaf-paths.ts`, `src-react/packs/mushaf-index.ts`, and `src-react/packs/mushaf-page-asset.ts`. React validates path identity, riwayah/edition index identity, manifest identity, target page membership, and sanitized SVG safety before rendering; it does not embed page SVG bodies in `dist-react/` and it does not introduce a separate deployed cache policy during the dual-build phase.

### Generic sync envelope

`safety/sync.ts::registerTopic` + `broadcast` — each store/feature plugs in by registering a topic name. This same-device envelope is technical infrastructure, not user-facing sync or multi-device product scope.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `activationState`
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
| `sync:bookmarks-updated` | `Events.SYNC_BOOKMARKS_UPDATED` | `src/infra/safety/sync.ts:233` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `db:version-change` | `Events.DB_VERSION_CHANGE` | `src/infra/safety/sync.ts:95` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **SW category downloads cache only manifest-listed dataset URLs.** Manifest membership is the runtime allowlist for baseline/update category downloads. Optional source-pack caching is window-planned from `indexes/source-assets.json` and does not go through the manifest-membership SW message path. Concrete text/Mushaf asset caching is window-planned from `indexes/text-assets.json` and `indexes/mushaf-assets.json`; route-derived cache names decide whether each URL lands in `CACHE_DATASET` or an edition-aware page cache.
- **Variant asset indexes are text indexes.** `/dataset/indexes/text-assets.json`, `/dataset/indexes/mushaf-assets.json`, and the temporary `/dataset/indexes/riwayah-packages.json` facade belong to `text-index`, use `CACHE_DATASET`, and are included in `manifest.json` so offline/update flows keep the package gate available.
- **Optional riwayah package status is future work.** Hafs/Warsh availability in source data is not current runtime availability.
- **Install does not activate.** Future install helpers must cache and verify assets only. Active `riwayah`, `quranTextStyleId`, and `mushafEditionId` changes go through the configure variant bundle writer.
- **No active optional asset deletion in MVP.** The current Asset Management route has no destructive controls.
- **Sole writer of `datasetMeta`: `src/infra/offline/dataset-updater.js`** (or store-specific writer — see `data-model.md`).
- **Cross-tab broadcast goes through `safety/sync.ts::broadcast` + `registerTopic`.** Don't open new BroadcastChannels directly — register a topic.
- **`suppressNextVersionChange()` armed before `deleteDB()`** — ensures the same tab doesn't get its own clear-data banner.
- **React proof clear-data uses the shared DB name.** The React About route's
  `src-react/storage/clear-data.ts` clears browser storage, Cache Storage, and
  the shared `quran-atlas` IndexedDB database, then root-reloads through the
  route-owned dialog hook. Svelte remains the shipped clear-data owner during
  dual-build.
- **React proof caches are namespaced away from shipped Svelte caches.** The
  React Vite PWA config always uses Workbox cache id
  `quranatlas-react-proof`; runtime React dataset caching uses
  `quran-atlas-react-runtime-dataset-v1`. Production-target React preview
  tests assert that `dist-react/` owns its generated Workbox helper while
  shipped Svelte `dist/` does not.
- **Launch asset reset clears stores before seeding defaults.** The passive
  MVP reset path avoids whole-database deletion so startup cannot be blocked by
  another open tab. Full `deleteDB()` remains reserved for explicit Clear All
  Data.
- **Every SW `registerRoute()` call lives in `src/infra/sw/strategies.ts::registerAll()`.** No inline route registrations in `sw.js`. Adding a new asset class = one entry in `route-defs.ts::ROUTE_DEFS` and (if it introduces a new cacheName prefix) one entry in `CACHE_PREFIXES`.
- **Per-asset-class cache prefixes preserved by `cleanupStaleCaches`** sourced from `route-defs.ts::CACHE_PREFIXES` (passed as `preservePrefixes`) — never hardcoded.
- **`route-defs.ts` is window-importable.** Workbox imports live only in `strategies.ts` (SW-only). Window code (asset management, legacy offline-selector, data/offline.ts) reads the table for byte-sum + URL-filter helpers.
- **`settings.offlineCategories` is legacy migration state.** The current MVP asset UI does not write source/category opt-ins. `getActivationState()` still normalizes older values so hidden state does not survive invisibly.
- **Build-time validation is the integrity gate.** The lane builders must hard-fail on structural or product drift before `manifest.json` is emitted; per-file digest checks are not current product scope.
- **`@offline` Playwright project is the single carve-out for the preview build.** The dev server is the default; the service worker only emits in production builds. See `tests/e2e/AGENTS.md`.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (11):**

- `tests/unit/infra/offline/asset-view-model.test.ts`
- `tests/unit/infra/offline/dataset-updater.test.js`
- `tests/unit/infra/offline/manifest-fetcher.test.js`
- `tests/unit/infra/offline/offline-selector.test.ts`
- `tests/unit/infra/offline/staging-cache.test.js`
- `tests/unit/infra/safety/csp-headers.test.ts`
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
