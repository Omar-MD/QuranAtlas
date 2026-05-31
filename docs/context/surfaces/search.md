---
surface: search
src_paths:
  - 'shared/search/**'
  - 'scripts/data/search/**'
  - 'src/app/routes/search/**'
  - 'src/components/search/**'
  - 'src/search/**'
  - 'src/search-worker/**'
  - 'src/offline/search/**'
owns_stores:
  - savedSearches
test_paths:
  unit:
    - 'tests/unit/react-search/**'
    - 'tests/unit/react-offline/search-pack-lifecycle.test.ts'
    - 'tests/unit/react-storage/search-schema.test.ts'
    - 'tests/unit/scripts/search-builder.test.js'
    - 'tests/unit/shared/search-contracts.test.ts'
    - 'tests/unit/scripts/source-catalog.test.js'
  e2e:
    - 'tests/e2e/search/*.spec.ts'
style_paths:
  - 'src/design-system/**'
---

# Surface: search

> Planned deterministic Quran Search surface. Full-text `#/search` remains unsupported until Phase 1 route promotion.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| `#/search` | URL | Renders the unsupported-route state |
| Search story | Storybook only | Shows the deferred prototype surface for review |
| Search contracts | Shared contracts and data checks | Define pack ABI, manifests, normalization, mapping, query, worker, source catalog, and cache ownership before route promotion |
| Search pack build | `pnpm run data -- build` | Emits immutable Phase 1 core Search pack manifests and shards under `public/search-packs/**` |
| Search worker runtime | Internal callers | Lazily decodes the active core Search pack and returns serializable result windows |
| Search helpers | Internal callers | Provide query parsing, pack reading, result mapping, ranking, cursors, and a lazy worker client |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/search/SearchRoute.tsx` | _(no leading comment)_ |
| `src/components/search/SearchBox.tsx` | _(no leading comment)_ |
| `src/components/search/SearchIndexGate.tsx` | _(no leading comment)_ |
| `src/components/search/SearchPage.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResults.tsx` | _(no leading comment)_ |
| `src/components/search/search.stories.tsx` | _(no leading comment)_ |
| `src/offline/search/activation.ts` | _(no leading comment)_ |
| `src/offline/search/cache.ts` | _(no leading comment)_ |
| `src/offline/search/quota.ts` | _(no leading comment)_ |
| `src/offline/search/registry.ts` | _(no leading comment)_ |
| `src/offline/search/repair.ts` | _(no leading comment)_ |
| `src/offline/search/search-pack.ts` | _(no leading comment)_ |
| `src/search-worker/cancellation.ts` | _(no leading comment)_ |
| `src/search-worker/query-executor.ts` | _(no leading comment)_ |
| `src/search-worker/search.worker.ts` | _(no leading comment)_ |
| `src/search-worker/session.ts` | _(no leading comment)_ |
| `src/search-worker/shard-cache.ts` | _(no leading comment)_ |
| `src/search/client.ts` | _(no leading comment)_ |
| `src/search/cursors.ts` | _(no leading comment)_ |
| `src/search/index-client.ts` | _(no leading comment)_ |
| `src/search/normalizer.ts` | _(no leading comment)_ |
| `src/search/pack-reader.ts` | _(no leading comment)_ |
| `src/search/query-parser.ts` | _(no leading comment)_ |
| `src/search/ranking.ts` | _(no leading comment)_ |
| `src/search/reference-parser.ts` | _(no leading comment)_ |
| `src/search/result-aliases.ts` | _(no leading comment)_ |
| `src/search/result-mapping.ts` | _(no leading comment)_ |
| `src/search/schema.ts` | _(no leading comment)_ |
| `src/search/search-engine.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

The shipped route contract keeps Search out of the MVP until Phase 1. `matchReactRoute('#/search')` returns `unsupported`, and `App` renders the route-unavailable state. Search UI files under `src/components/search/**` are prototype/story material only until the product promotes Search into shipped scope.

Search contracts live in `shared/search/**` and `data/catalog/search-*.json`. They define a Hafs-backed analytical Search corpus, explicit Hafs-to-Qalun Reader mapping states, static Search pack manifests, lazy worker protocol, normalizer/tokenizer policy, source/license records, and dedicated Search pack cache ownership. The user-facing label is `Qalun`; the runtime key remains `qaloon`.

Search packs use a filesystem registry at `public/search-packs/registry.json`, runtime registry URL `/search-packs/registry.json`, and immutable manifests/shards under `public/search-packs/packs/<contentHash>/**`. Search pack assets are owned by the dedicated Search installer/cache plan, not the generic `/dataset/**` CacheFirst route.

Phase 1 data-pack lifecycle code builds and validates the core pack from committed normalized Hafs text and Bridges translation/context inputs. Runtime pack availability states are `not available`, `available online`, `installing`, `staged`, `verifying`, `active`, `update available`, `incompatible`, `failed`, and `offline unavailable`. Search pack installation must stay lazy: Reader cold launch performs no Search pack fetch, graph decode, or worker startup.

`savedSearches` stores user-created query definitions and compatibility metadata only. Result windows are not persisted; they are recomputed against the active compatible pack.

Search utilities under `src/search/**`, `src/search-worker/**`, and `src/offline/search/**` support Phase 1 runtime Search while the route remains unpromoted. Query parsing normalizes Arabic text with the Phase 0 policy, parses ayah references such as `2:255` and `Surah 2 255`, rejects Phase 2/3-only modes such as same-root, and emits serializable query ASTs. The pack reader loads only immutable `/search-packs/packs/<contentHash>/**` shard URLs from the dedicated Search cache, verifies SHA-256 encoded bytes, parses ABI headers and table directories with `DataView`, and exposes bounded table payloads to the worker.

`src/search-worker/**` owns the restartable worker session. It handles `init`, `preloadCore`, `query`, `loadFeature`, `cancel`, and `dispose` envelopes, includes request ids and worker epochs in responses, suppresses stale cursor windows through pack/query/rank/sort cursor validation, and returns DTO windows rather than shard buffers. The worker can answer Phase 1 reference, Arabic text, translation/context, exact word form, and exact phrase queries from the active core pack. Missing optional feature packs degrade through typed worker errors rather than breaking core Search.

Result mapping is explicit Hafs-to-Qalun Reader mapping. Unmapped Hafs refs return source-only/no-open states instead of silently becoming Reader identity refs. `Open in Read` is available only for validated single Reader targets, and `canHighlightWordsInRead` is always false in Phase 1 because Qalun token alignment is not validated.

Search runtime code must not introduce user-facing assistant, chat, synthesis, generated Quran text, semantic answer, or reflection-prompt UI.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| _(no files match `style_paths`)_ | |
<!-- AUTO-GENERATED:style-inventory END -->

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `savedSearches`
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

- Full-text Search must stay route-unsupported until Phase 1 pack activation, worker runtime, saved-search storage, and UI gates pass.
- Prototype Search components must remain story/prototype-only and must not be linked from Reader First navigation.
- Search analysis uses Hafs source text; Reader opens the verified Qalun/Qaloon text only through explicit mapping states.
- Hafs aliases must never silently fall back to identity Reader refs.
- Qalun word highlighting from Hafs morphology is forbidden until Qalun token alignment is validated.
- Search pack files must not be double-owned by both generic dataset CacheFirst caching and a manual Search installer/cache.
- Search saved-search storage must store query definitions, not materialized results.
- Search must not introduce AI assistant, chat, generated Quran text, synthesis, semantic answer, or reflection-prompt product scope.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (11):**

- `tests/unit/react-offline/search-pack-lifecycle.test.ts`
- `tests/unit/react-search/generated-pack-smoke.test.ts`
- `tests/unit/react-search/pack-reader.test.ts`
- `tests/unit/react-search/query-parser.test.ts`
- `tests/unit/react-search/result-mapping.test.ts`
- `tests/unit/react-search/search-wave3.test.ts`
- `tests/unit/react-search/search-worker.test.ts`
- `tests/unit/react-storage/search-schema.test.ts`
- `tests/unit/scripts/search-builder.test.js`
- `tests/unit/scripts/source-catalog.test.js`
- `tests/unit/shared/search-contracts.test.ts`

**E2E (1):**

- `tests/e2e/search/react-search-offline.spec.ts`
<!-- AUTO-GENERATED:tests END -->
