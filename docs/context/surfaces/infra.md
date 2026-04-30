---
surface: infra
src_paths:
  - 'src/offline/**'
  - 'src/safety/**'
  - 'src/sw.js'
  - 'src/sw-handlers.js'
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
| `src/offline/dataset-updater.js` | Dataset update orchestrator for service worker activate. |
| `src/offline/manifest-fetcher.js` | Fetch the dataset manifest. |
| `src/offline/sha256-verifier.js` | SHA-256 verification for dataset file integrity. |
| `src/offline/staging-cache.js` | Staging cache for dataset updates. |
| `src/safety/input-validator.ts` | Input validation for navigation and tag parameters. |
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

`installed PWA detects updates` regression — `5fb86a8` shipped the missing wire-up.

### Cross-tab coherence

Backed by `safety/sync.ts` + native `BroadcastChannel('qa-sync')`. Generic envelope (`registerTopic` + `broadcast`) shipped in `a83c2a3` (R-10, C-2, C-5, CC-4).

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

**Fail-closed manifest chain of trust** — `1acbfdf` shipped: SW refuses to serve cached responses if manifest signature chain fails to verify (R-01). Pre-2026-04-29, mismatches silently fell through to network.

### Per-asset-class SW partition

Audio half landed 2026-04-30 (per-reciter `qa-audio-{reciter}-v1` cache + timing JSON cache + audio-meta NetworkFirst). `cleanupStaleCaches` in `sw-handlers.js` preserves `qa-audio-*` and `qa-fonts-*` by prefix. Mushaf-pages route + search-index route + dedicated `core/sw/strategies.ts` aggregator deferred (tracked in `future-work.md` §Infrastructure §"Per-asset-class SW partition").

### Generic sync envelope (post `a83c2a3`)

`safety/sync.ts::registerTopic` + `broadcast` — each store/feature plugs in by registering a topic name. No per-store deprecation churn when sync v2 (multi-device) arrives (`#17`, v2.2 milestone, design skeleton at `docs/superpowers/specs/2026-04-29-sync-v2-design-SKELETON.md`).

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

- **SW fails closed on manifest chain-of-trust check.** Pre-`1acbfdf`, mismatches silently fell through. Now: refuse to serve cached responses on signature failure.
- **Sole writer of `datasetMeta`: `src/offline/dataset-updater.js`** (or store-specific writer — see `data-model.md`).
- **Cross-tab broadcast goes through `safety/sync.ts::broadcast` + `registerTopic`.** Don't open new BroadcastChannels directly — register a topic.
- **`suppressNextVersionChange()` armed before `deleteDB()`** — ensures the same tab doesn't get its own clear-data banner.
- **Per-asset-class cache prefixes preserved by `cleanupStaleCaches`:** `qa-audio-*`, `qa-fonts-*`. Adding a new asset class requires updating the preserve list.
- **`@offline` Playwright project is single carve-out for preview build.** Per Rule 8 / 6.6, dev server is default; SW only emits in production builds.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (6):**

- `tests/unit/offline/dataset-updater.test.js`
- `tests/unit/offline/manifest-fetcher.test.js`
- `tests/unit/offline/sha256-verifier.test.js`
- `tests/unit/offline/staging-cache.test.js`
- `tests/unit/safety/input-validator.test.js`
- `tests/unit/safety/sync.test.js`

**E2E (3):**

- `tests/e2e/journey-h-offline.spec.js`
- `tests/e2e/journey-i-cross-tab.spec.js`
- `tests/e2e/sw-integration.spec.js`
<!-- AUTO-GENERATED:tests END -->

## Deprecated

- **Pre-`1acbfdf`:** SW silently fell through to network on manifest chain-of-trust failure. Now fail-closed. See audit R-01.
- **Pre-`a83c2a3`:** per-store sync logic was hand-rolled inside each store. Replaced by generic envelope (`registerTopic` + `broadcast`) — dissolved cycle (R-10, C-2, C-5, CC-4).
