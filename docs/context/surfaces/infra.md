---
surface: infra
src_paths:
  - 'src/offline/**'
  - 'src/safety/**'
  - 'src/sw.js'
  - 'src/sw-handlers.js'
  - 'src/core/sw/**'
owns_stores:
  - datasetMeta
test_paths:
  unit:
    - 'tests/unit/offline/**'
    - 'tests/unit/safety/**'
    - 'tests/unit/sw/**'
  e2e:
    - 'tests/e2e/sw-integration.spec.js'
    - 'tests/e2e/journey-h-offline*.spec.js'
    - 'tests/e2e/journey-i-cross-tab*.spec.js'
---

# Surface: infra

> Cross-cutting non-UI invariants. Service worker (offline reload, update banner, fail-closed manifest, per-asset-class cache partitions), cross-tab coherence (BroadcastChannel + IDB versionchange), dataset manifest fetch + apply, future sync v2.

User-facing exposure: update banner (toast/popover when new build rolls out) + clear-data confirmation cross-tab banner. No standalone UI.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| App boot, `controllerchange` | passive (SW lifecycle) | `APP_UPDATE_AVAILABLE` → UpdateBanner |
| Service worker install | passive | precache + manifest chain-of-trust check |
| `BroadcastChannel('qa-sync')` message | passive | `safety/sync.ts` dispatches per-topic listener |
| IDB `versionchange` event (other tab cleared data) | passive | `safety/sync.ts` shows "Data was cleared in another tab — reload" banner |
| `visibilitychange` visible | passive | `DB_VISIBILITY_VISIBLE` → reader / position consumers |

No routes. Surface is invisible until something goes wrong (or update rolls out).

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/core/sw/route-defs.ts` | Per-asset-class route definitions for the QuranAtlas service worker. |
| `src/core/sw/strategies.ts` | Service-worker route registration. Pure data lives in `route-defs.ts`; |
| `src/offline/dataset-updater.js` | Dataset update orchestrator for service worker activate. |
| `src/offline/manifest-fetcher.js` | Fetch the dataset manifest. |
| `src/offline/offline-selector.svelte` | Per-feature offline opt-in selector. |
| `src/offline/sha256-verifier.js` | SHA-256 verification for dataset file integrity. |
| `src/offline/staging-cache.js` | Staging cache for dataset updates. |
| `src/safety/input-validator.ts` | Input validation for navigation and tag parameters. |
| `src/safety/state.svelte.ts` | _(no leading comment)_ |
| `src/safety/sync.ts` | Cross-tab safety and synchronization module. |
| `src/sw-handlers.js` | _(no leading comment)_ |
| `src/sw.js` | Service worker for QuranAtlas. |
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

Backed by `safety/sync.ts` + native `BroadcastChannel('qa-sync')`. Generic envelope: `registerTopic` + `broadcast`.

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

`offline/offline.ts::fetchAndApplyManifest` (or equivalent) fetches `public/dataset/manifest.json`, validates chain of trust, applies to `datasetMeta` store. `dataset:applied` event fires post-apply.

**Fail-closed manifest chain of trust** — SW refuses to serve cached responses if manifest signature chain fails to verify.

### Per-asset-class SW partition + offline opt-in selector

All SW route registrations live in `src/core/sw/strategies.ts::registerAll()`, driven by the declarative `ROUTE_DEFS` table in `src/core/sw/route-defs.ts`. Categories: text (`qa-dataset-v1`), audio mp3/timing/meta (per-reciter), pages (per-riwayah, roadmap), search-index (single asset, roadmap), fonts (always-on). `cleanupStaleCaches` in `sw-handlers.js` preserves caches by prefix sourced from `route-defs.ts::CACHE_PREFIXES` — single source of truth. Adding a new asset class is one row in `ROUTE_DEFS` plus the prefix in `CACHE_PREFIXES`.

The window-side companion is `src/offline/offline-selector.svelte` (mounted in Settings → Storage section, configure dossier). Per-feature opt-in: user checks Text / Audio / Pages / Search; selector pre-flights `navigator.storage.estimate()` and refuses Apply when the selection exceeds available quota. `src/data/offline.ts::startCategoryDownload(cat)` filters manifest URLs through `route-defs.ts::sumBytesForCategory()` and reuses the fail-closed manifest digest path.

### Generic sync envelope

`safety/sync.ts::registerTopic` + `broadcast` — each store/feature plugs in by registering a topic name. No per-store deprecation churn when multi-device sync arrives.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `datasetMeta`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `datasetMeta` store body

Manifest version, signature, applied-at timestamp, per-asset-class cache versions. Sole writer: `src/offline/dataset-updater.js` (or equivalent — see `data-model.md` §Cross-cutting rules).

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `sync:bookmarks-updated` | `Events.SYNC_BOOKMARKS_UPDATED` | `src/safety/sync.ts:276` |
| `sync:edges-updated` | `Events.SYNC_EDGES_UPDATED` | `src/safety/sync.ts:264` |
| `sync:update-received` | `Events.SYNC_UPDATE_RECEIVED` | `src/safety/sync.ts:256` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `db:version-change` | `Events.DB_VERSION_CHANGE` | `src/safety/sync.ts:102` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **SW fails closed on manifest chain-of-trust check.** Refuse to serve cached responses on signature failure.
- **Sole writer of `datasetMeta`: `src/offline/dataset-updater.js`** (or store-specific writer — see `data-model.md`).
- **Cross-tab broadcast goes through `safety/sync.ts::broadcast` + `registerTopic`.** Don't open new BroadcastChannels directly — register a topic.
- **`suppressNextVersionChange()` armed before `deleteDB()`** — ensures the same tab doesn't get its own clear-data banner.
- **Every SW `registerRoute()` call lives in `src/core/sw/strategies.ts::registerAll()`.** No inline route registrations in `sw.js`. Adding a new asset class = one entry in `route-defs.ts::ROUTE_DEFS` and (if it introduces a new cacheName prefix) one entry in `CACHE_PREFIXES`.
- **Per-asset-class cache prefixes preserved by `cleanupStaleCaches`** sourced from `route-defs.ts::CACHE_PREFIXES` (passed as `preservePrefixes`) — never hardcoded.
- **`route-defs.ts` is window-importable.** Workbox imports live only in `strategies.ts` (SW-only). Window code (offline-selector, data/offline.ts) reads the table for byte-sum + URL-filter helpers.
- **`settings.offlineCategories` is the source of truth for "user opted into category X".** `getActivationState()` reports `'cached'` when any category is opted in; `'downloading'` while a `CACHE_DATASET` is in flight.
- **`@offline` Playwright project is the single carve-out for the preview build.** The dev server is the default; the service worker only emits in production builds. See `tests/e2e/AGENTS.md`.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (10):**

- `tests/unit/offline/dataset-updater.test.js`
- `tests/unit/offline/manifest-fetcher.test.js`
- `tests/unit/offline/offline-selector.test.ts`
- `tests/unit/offline/sha256-verifier.test.js`
- `tests/unit/offline/staging-cache.test.js`
- `tests/unit/safety/csp-headers.test.ts`
- `tests/unit/safety/input-validator.test.js`
- `tests/unit/safety/state.test.ts`
- `tests/unit/safety/sync.test.js`
- `tests/unit/sw/route-defs.test.ts`

**E2E (3):**

- `tests/e2e/journey-h-offline.spec.js`
- `tests/e2e/journey-i-cross-tab.spec.js`
- `tests/e2e/sw-integration.spec.js`
<!-- AUTO-GENERATED:tests END -->
