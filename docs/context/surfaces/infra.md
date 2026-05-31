---
surface: infra
src_paths:
  - 'src/offline/**'
  - 'src/storage/**'
  - 'public/wird-notification-sw.js'
  - 'vite.config.js'
owns_stores:
  - activationState
  - datasetMeta
  - searchPackActivations
  - searchPackStaging
test_paths:
  unit:
    - 'tests/unit/react-offline/**'
    - 'tests/unit/react-packs/**'
    - 'tests/unit/react-storage/**'
    - 'tests/unit/shared/**'
  e2e:
    - 'tests/e2e/infra/*.spec.ts'
style_paths:
  - 'src/design-system/**'
---

# Surface: infra

> PWA, service worker, offline dataset caching, browser storage, quota, cache planning, notification click handling, and release artifact safety.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| App build | `vite-plugin-pwa` | Generates manifest and service worker |
| Runtime dataset fetch | reader/settings/offline | Loads same-origin `/dataset/**` and caches via Workbox |
| Offline reload | browser offline state | Shell and cached reader data survive reload |
| Clear data | About dialog | Clears app caches and IndexedDB |
| Daily Wird notification click | service worker | Focuses or opens QuranAtlas at the saved continuation URL |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/offline/asset-index.ts` | _(no leading comment)_ |
| `src/offline/cache-names.ts` | _(no leading comment)_ |
| `src/offline/cache-plan.ts` | _(no leading comment)_ |
| `src/offline/mushaf-service-worker-protocol.ts` | _(no leading comment)_ |
| `src/offline/pack-lifecycle.ts` | _(no leading comment)_ |
| `src/offline/pack-status.ts` | _(no leading comment)_ |
| `src/offline/quota.ts` | _(no leading comment)_ |
| `src/offline/search/activation.ts` | _(no leading comment)_ |
| `src/offline/search/cache.ts` | _(no leading comment)_ |
| `src/offline/search/quota.ts` | _(no leading comment)_ |
| `src/offline/search/registry.ts` | _(no leading comment)_ |
| `src/offline/search/repair.ts` | _(no leading comment)_ |
| `src/offline/search/search-pack.ts` | _(no leading comment)_ |
| `src/offline/service-worker-contract.ts` | _(no leading comment)_ |
| `src/offline/ui-state.ts` | _(no leading comment)_ |
| `src/storage/clear-data.ts` | _(no leading comment)_ |
| `src/storage/db.ts` | _(no leading comment)_ |
| `src/storage/reader-preferences.ts` | _(no leading comment)_ |
| `src/storage/schema.ts` | _(no leading comment)_ |
| `src/storage/settings-writer.ts` | _(no leading comment)_ |
| `src/storage/storage-errors.ts` | _(no leading comment)_ |
| `src/storage/types.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

`vite.config.js` configures React, Tailwind, and `vite-plugin-pwa`. The production service worker uses Workbox to precache only the app shell, fonts, icons, and built assets; `/dataset/**` stays out of precache and is cached through the CacheFirst runtime route in `quran-atlas-runtime-dataset-v1`. The Workbox cache id is `quranatlas`.

`scripts/ci/affected.mjs` owns changed-file gate decisions for CI and local affected validation. CI still produces a single chunk-checked `dist/` artifact for Lighthouse, Playwright preview/offline/visual, and deploy. Dataset generation runs when affected gates identify relevant source data, builder, asset-profile, runtime dataset, or dependency changes; Mushaf page import/build also runs whenever Playwright is selected so browser specs receive the real page SVG pack.

`src/offline/**` owns cache names, cache plans, Mushaf service-worker message contracts, pack lifecycle/status, quota helpers, and offline UI state. `src/storage/**` owns Dexie schema, clear-data, settings writes, and storage errors.

Search pack files under `/search-packs/**` are not Workbox dataset-cache assets. `vite.config.js` keeps the generic `/dataset/**` CacheFirst route from matching `/dataset/search/**`, while `src/offline/search/**` owns the dedicated `quran-atlas-search-pack-<contentHash>` Cache Storage lifecycle. Search install verifies shard SHA-256 checksums over encoded bytes, writes staging metadata, activates with a monotonic generation, announces activation changes across tabs, and protects active or live leased packs from orphan cleanup.

Dexie v8 adds Search lifecycle stores. Clear data continues to delete browser storage, all Cache Storage entries including Search pack caches, and the shared IndexedDB database.

`public/wird-notification-sw.js` is imported by the generated service worker for notification-click behavior. It must stay small, deterministic, and independent of app bundle state.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| _(no files match `style_paths`)_ | |
<!-- AUTO-GENERATED:style-inventory END -->

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `activationState`
- `datasetMeta`
- `searchPackActivations`
- `searchPackStaging`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- Production offline behavior must be proven against `dist/` preview, not the dev server.
- Runtime dataset caching stays same-origin and under `/dataset/**`.
- Search pack caching stays under the dedicated Search cache owner for immutable `/search-packs/**` URLs.
- Page SVG bodies must stay runtime assets, not JS bundle content.
- Clear-data behavior clears Cache Storage and the shared IndexedDB database.
- CI builds once and reuses the uploaded `dist/` artifact for Lighthouse, Playwright preview/offline, and deploy.
- Affected CI gates must fail open when no trustworthy diff baseline exists.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (11):**

- `tests/unit/react-offline/asset-index.test.ts`
- `tests/unit/react-offline/cache-plan.test.ts`
- `tests/unit/react-offline/search-pack-lifecycle.test.ts`
- `tests/unit/react-packs/mushaf-install-plan.test.ts`
- `tests/unit/react-packs/mushaf-paths.test.ts`
- `tests/unit/react-storage/clear-data.test.ts`
- `tests/unit/react-storage/db-schema.test.ts`
- `tests/unit/react-storage/pack-lifecycle.test.ts`
- `tests/unit/react-storage/search-schema.test.ts`
- `tests/unit/shared/default-reader-assets.test.ts`
- `tests/unit/shared/search-contracts.test.ts`

**E2E (1):**

- `tests/e2e/infra/react-offline.spec.ts`
<!-- AUTO-GENERATED:tests END -->
