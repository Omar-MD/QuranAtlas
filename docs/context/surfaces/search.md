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

> Shipped Phase 1 deterministic Quran Search surface for lexical source-backed queries.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| `#/search` | URL | Renders the Search route |
| Search story | Storybook | Shows empty, loading, results, detail, saved-search, no-mapping, offline, and source states |
| Search contracts | Shared contracts and data checks | Define pack ABI, manifests, normalization, mapping, query, worker, source catalog, and cache ownership before route promotion |
| Search pack build | `pnpm run data -- build` | Emits immutable Phase 1 core Search pack manifests and shards under `public/search-packs/**` |
| Search worker runtime | Search route | Lazily decodes the active core Search pack and returns serializable result windows |
| Search helpers | Internal callers | Provide query parsing, pack reading, result mapping, ranking, cursors, and a lazy worker client |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/search/SearchRoute.tsx` | _(no leading comment)_ |
| `src/components/search/SavedSearchesRail.tsx` | _(no leading comment)_ |
| `src/components/search/SavedSearchesSheet.tsx` | _(no leading comment)_ |
| `src/components/search/SearchBox.tsx` | _(no leading comment)_ |
| `src/components/search/SearchExplorePanel.tsx` | _(no leading comment)_ |
| `src/components/search/SearchHeader.tsx` | _(no leading comment)_ |
| `src/components/search/SearchIndexGate.tsx` | _(no leading comment)_ |
| `src/components/search/SearchModeControl.tsx` | _(no leading comment)_ |
| `src/components/search/SearchMorphologyPanel.tsx` | _(no leading comment)_ |
| `src/components/search/SearchPage.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResultCard.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResultDetail.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResultList.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResults.tsx` | _(no leading comment)_ |
| `src/components/search/SearchShell.tsx` | _(no leading comment)_ |
| `src/components/search/SearchSourcePanel.tsx` | _(no leading comment)_ |
| `src/components/search/search-labels.ts` | _(no leading comment)_ |
| `src/components/search/search.stories.tsx` | _(no leading comment)_ |
| `src/components/search/useSavedSearches.ts` | _(no leading comment)_ |
| `src/components/search/useSearchRouteState.ts` | _(no leading comment)_ |
| `src/offline/search/activation.ts` | _(no leading comment)_ |
| `src/offline/search/cache.ts` | _(no leading comment)_ |
| `src/offline/search/quota.ts` | _(no leading comment)_ |
| `src/offline/search/registry.ts` | _(no leading comment)_ |
| `src/offline/search/repair.ts` | _(no leading comment)_ |
| `src/offline/search/search-pack.ts` | _(no leading comment)_ |
| `src/search-worker/cancellation.ts` | _(no leading comment)_ |
| `src/search-worker/morphology-executor.ts` | _(no leading comment)_ |
| `src/search-worker/query-executor.ts` | _(no leading comment)_ |
| `src/search-worker/search.worker.ts` | _(no leading comment)_ |
| `src/search-worker/session.ts` | _(no leading comment)_ |
| `src/search-worker/shard-cache.ts` | _(no leading comment)_ |
| `src/search/client.ts` | _(no leading comment)_ |
| `src/search/cursors.ts` | _(no leading comment)_ |
| `src/search/index-client.ts` | _(no leading comment)_ |
| `src/search/morphology.ts` | _(no leading comment)_ |
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

`matchReactRoute('#/search')` returns `search`, and `App` lazy-loads `src/app/routes/search/SearchRoute.tsx` only for the Search route. The Search route owns a route-scoped `SearchClient`, prepares the core Search pack lazily on Search entry, and disposes the worker client on route teardown. Reader cold launch performs no Search pack fetch, graph decode, or Search worker startup.

Search contracts live in `shared/search/**` and `data/catalog/search-*.json`. They define a Hafs-backed analytical Search corpus, explicit Hafs-to-Qalun Reader mapping states, static Search pack manifests, lazy worker protocol, normalizer/tokenizer policy, source/license records, and dedicated Search pack cache ownership. The user-facing label is `Qalun`; the runtime key remains `qaloon`.

Search packs use a filesystem registry at `public/search-packs/registry.json`, runtime registry URL `/search-packs/registry.json`, and immutable manifests/shards under `public/search-packs/packs/<contentHash>/**`. Search pack assets are owned by the dedicated Search installer/cache plan, not the generic `/dataset/**` CacheFirst route.

Data-pack lifecycle code builds and validates the Search pack from committed normalized Hafs text, Bridges translation/context inputs, and verified QAC morphology input. Runtime pack availability states are `not available`, `available online`, `installing`, `staged`, `verifying`, `active`, `update available`, `incompatible`, `failed`, and `offline unavailable`. The route shows `Loading search index`, `Search data is ready on this device.`, or `Search data is not available on this device.` according to the scoped pack state.

`savedSearches` stores user-created query definitions and compatibility metadata only. Result windows are not persisted; they are recomputed against the active compatible pack.

Search utilities under `src/search/**`, `src/search-worker/**`, and `src/offline/search/**` support runtime Search. Query parsing normalizes Arabic text with the Phase 0 policy, parses ayah references such as `2:255` and `Surah 2 255`, parses morphology modes such as same written form, same root, lemma, and Surah context, and emits serializable query ASTs. The pack reader loads only immutable `/search-packs/packs/<contentHash>/**` shard URLs from the dedicated Search cache, verifies SHA-256 encoded bytes, parses ABI headers and table directories with `DataView`, and exposes bounded table payloads to the worker. When the registry fetch is unavailable but an active pack is already cached, the worker can load the cached manifest from the dedicated Search pack cache.

`src/search-worker/**` owns the restartable worker session. It handles `init`, `preloadCore`, `query`, `loadFeature`, `cancel`, and `dispose` envelopes, includes request ids and worker epochs in responses, suppresses stale cursor windows through pack/query/rank/sort cursor validation, and returns DTO windows rather than shard buffers. The worker can answer reference, Arabic text, translation/context, exact word form, exact phrase, same written form, same root, lemma, and Surah context queries from the active pack. Missing optional feature packs degrade through typed worker errors rather than breaking core Search.

Result mapping is explicit Hafs-to-Qalun Reader mapping. Unmapped Hafs refs return source-only/no-open states instead of silently becoming Reader identity refs. `Open in Read` is available only for validated single Reader targets, and `canHighlightWordsInRead` is always false because Qalun token alignment is not validated.

The route renders a result-first Search shell with mode controls for All, Arabic text, Translation, Context, Exact word form, Phrase, Same written form, Same root, and Lemma. Result cards show source refs, lane chips, bidi-safe snippets, provenance chips, and `Open in Read` only when mapping validates a single Reader target. Result detail exposes Match, Explore, and Source tabs. Explore and Source show Hafs-source morphology details, the exact Search source note, same-root interpretation warning, and no Reader word-highlight state for morphology results. Memory-graph features stay unavailable until later phases.

Saved searches are created only through `Save search`. `savedSearches` stores Phase 1 user intent fields, compatibility metadata, and timestamps. It does not store result DTOs, result windows, Explore section ids, or source corpus snapshots. Loading a saved search applies its query and filters, announces the loaded state, and recomputes against the active compatible Search index.

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

- Search route promotion must preserve Reader First launch: cold Reader launch performs no Search pack fetch, graph decode, or worker startup.
- Search route state must not overwrite Reader `lastSurface` in Phase 1.
- Search analysis uses Hafs source text; Reader opens the verified Qalun/Qaloon text only through explicit mapping states.
- Hafs aliases must never silently fall back to identity Reader refs.
- Qalun word highlighting from Hafs morphology is forbidden until Qalun token alignment is validated.
- Search pack files must not be double-owned by both generic dataset CacheFirst caching and a manual Search installer/cache.
- Search saved-search storage must store query definitions, not materialized results.
- Search must not introduce AI assistant, chat, generated Quran text, synthesis, semantic answer, or reflection-prompt product scope.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (14):**

- `tests/unit/react-offline/search-pack-lifecycle.test.ts`
- `tests/unit/react-search/generated-pack-smoke.test.ts`
- `tests/unit/react-search/morphology-worker.test.ts`
- `tests/unit/react-search/pack-reader.test.ts`
- `tests/unit/react-search/query-parser.test.ts`
- `tests/unit/react-search/result-mapping.test.ts`
- `tests/unit/react-search/saved-searches.test.tsx`
- `tests/unit/react-search/search-route.test.tsx`
- `tests/unit/react-search/search-wave3.test.ts`
- `tests/unit/react-search/search-worker.test.ts`
- `tests/unit/react-storage/search-schema.test.ts`
- `tests/unit/scripts/search-builder.test.js`
- `tests/unit/scripts/source-catalog.test.js`
- `tests/unit/shared/search-contracts.test.ts`

**E2E (2):**

- `tests/e2e/search/react-search-offline.spec.ts`
- `tests/e2e/search/react-search.spec.ts`
<!-- AUTO-GENERATED:tests END -->
