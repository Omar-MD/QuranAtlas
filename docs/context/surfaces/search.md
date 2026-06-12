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

> Shipped deterministic Quran Search surface for lexical, morphology, and memory-graph source-backed queries.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| `#/search` | URL | Renders the Search route |
| Drawer Search tab | tap/click | Routes from Reader navigation to the Search route |
| Search story | Storybook | Shows empty, loading, results, detail, saved-search, no-mapping, offline, and source states |
| Search contracts | Shared contracts and data checks | Define pack ABI, manifests, normalization, mapping, query, worker, source catalog, and cache ownership before route promotion |
| Search pack build | `pnpm run data -- build` | Emits immutable Search pack manifests and core, morphology, and graph shards under `public/search-packs/**` |
| Search worker runtime | Search route | Lazily decodes the active core Search pack and returns serializable result windows |
| Search helpers | Internal callers | Provide query parsing, pack reading, result mapping, ranking, cursors, and a lazy worker client |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/search/SearchRoute.tsx` | _(no leading comment)_ |
| `src/components/search/SavedSearchesNavPanel.tsx` | _(no leading comment)_ |
| `src/components/search/SearchAnswerPreview.tsx` | _(no leading comment)_ |
| `src/components/search/SearchBox.tsx` | _(no leading comment)_ |
| `src/components/search/SearchBrief.tsx` | _(no leading comment)_ |
| `src/components/search/SearchCountsPatterns.tsx` | _(no leading comment)_ |
| `src/components/search/SearchExplorePanel.tsx` | _(no leading comment)_ |
| `src/components/search/SearchGraphExplore.tsx` | _(no leading comment)_ |
| `src/components/search/SearchHeader.tsx` | _(no leading comment)_ |
| `src/components/search/SearchIndexGate.tsx` | _(no leading comment)_ |
| `src/components/search/SearchModeControl.tsx` | _(no leading comment)_ |
| `src/components/search/SearchMorphologyPanel.tsx` | _(no leading comment)_ |
| `src/components/search/SearchOverview.tsx` | _(no leading comment)_ |
| `src/components/search/SearchPage.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResultCard.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResultDetail.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResultList.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResults.tsx` | _(no leading comment)_ |
| `src/components/search/SearchShell.tsx` | _(no leading comment)_ |
| `src/components/search/SearchSourcePanel.tsx` | _(no leading comment)_ |
| `src/components/search/SearchWorkspace.tsx` | _(no leading comment)_ |
| `src/components/search/search-labels.ts` | _(no leading comment)_ |
| `src/components/search/search-presentation-model.ts` | _(no leading comment)_ |
| `src/components/search/search-result-evidence.ts` | _(no leading comment)_ |
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
| `src/search-worker/graph-executor.ts` | _(no leading comment)_ |
| `src/search-worker/morphology-executor.ts` | _(no leading comment)_ |
| `src/search-worker/query-executor.ts` | _(no leading comment)_ |
| `src/search-worker/search-brief.ts` | _(no leading comment)_ |
| `src/search-worker/search.worker.ts` | _(no leading comment)_ |
| `src/search-worker/session.ts` | _(no leading comment)_ |
| `src/search-worker/shard-cache.ts` | _(no leading comment)_ |
| `src/search/ask/answer-preview-builder.ts` | _(no leading comment)_ |
| `src/search/ask/boundaries.ts` | _(no leading comment)_ |
| `src/search/ask/evidence.ts` | _(no leading comment)_ |
| `src/search/ask/query-understanding.ts` | _(no leading comment)_ |
| `src/search/client.ts` | _(no leading comment)_ |
| `src/search/cursors.ts` | _(no leading comment)_ |
| `src/search/graph.ts` | _(no leading comment)_ |
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

`matchReactRoute('#/search')` returns `search`, and `App` lazy-loads `src/app/routes/search/SearchRoute.tsx` only for the Search route. The Search route owns a route-scoped `SearchClient`, initializes the worker against the compatible immutable Search pack manifest on Search entry, loads no result shards until query/explore actions need them, and disposes the worker client on route teardown. Reader cold launch performs no Search pack fetch, graph decode, or Search worker startup. Search uses the same Reader chrome and `NavDrawer` navigation pattern as Read: the compact Reader chrome opens the drawer from the left, the same settings button opens global appearance/settings controls, phone widths use a full-screen drawer, and tablet/desktop widths keep Search content visible on the right while the drawer is open.

Search includes the citation-first Ask/Search v1 preview loop on the lazy Search route. Submitted queries first return an `AnswerPreview` with answerability, typed evidence atoms, compact Evidence Basis, Best Evidence cards, and no generated source text. All Matches, Explore, Method & Sources-style source detail, and graph/morphology panels load only after explicit user action.

Answer claims render only when their `ClaimSupport` resolves to typed v1 evidence and passes the v1 claim authority matrix. No-answer and evidence-only responses carry empty claim arrays. Absence, legal, medical, personal fiqh, crisis, personal pastoral, broad theological, inflammatory, tafsir/asbab/hadith/theme/cross-reference, and unsupported-source queries use fixed recovery copy instead of answer prose.

Reader cold launch remains clean: no Search route chunk, Search worker, Search pack/index request, Search IndexedDB activity, or `/search-packs/**` precache entry occurs before explicit Search intent.

Search contracts live in `shared/search/**` and `data/catalog/search-*.json`. They define a Hafs/Tanzil analytical Search corpus, explicit Hafs-to-Qalun Reader mapping states, static Search pack manifests, lazy worker protocol, normalizer/tokenizer policy, source/license records, and dedicated Search pack cache ownership. The user-facing label is `Qalun`; the runtime key remains `qaloon`.

Search packs use a filesystem registry at `public/search-packs/registry.json`, runtime registry URL `/search-packs/registry.json`, and immutable manifests/shards under `public/search-packs/packs/<contentHash>/**`. Search pack assets are owned by the dedicated Search pack cache/read path, not the generic `/dataset/**` CacheFirst route.

Data-pack lifecycle code builds and validates the Search pack from committed normalized Hafs/Tanzil text at data/normalized/search/tanzil/hafs.json, Bridges translation/context inputs, verified QAC morphology input, and bounded Phase 3 graph transforms. The Tanzil import normalizes Uthmani and simple-clean numbered text into canonical Hafs refs before pack build; pack references index normalized emlaey text for matching while exposing marked Hafs ayah text for result display. QAC cites Tanzil compatibility but remains the morphology source, not the Search text corpus. Runtime Search does not install, verify, or activate packs before use; it reads the compatible immutable registry/manifest when available, caches fetched immutable manifests/shards for later offline reads, and reports route states as `Loading search index`, `Search data is ready on this device.`, or `Search data is not available on this device.`.

`savedSearches` stores user-created query definitions and compatibility metadata only. Result windows are not persisted; they are recomputed against the active compatible pack.

Search utilities under `src/search/**`, `src/search-worker/**`, and `src/offline/search/**` support runtime Search. Query parsing normalizes Arabic text with the Phase 0 policy, parses ayah references such as `2:255` and `Surah 2 255`, parses morphology modes such as same written form, same root, lemma, and Surah context, and emits serializable query ASTs. The pack reader loads only immutable `/search-packs/packs/<contentHash>/**` shard URLs, reads the dedicated Search cache first, fetches immutable shard URLs on cache miss, parses ABI headers and table directories with `DataView`, and exposes bounded table payloads to the worker without runtime SHA-256 verification. When the registry fetch is unavailable but an active pack is already cached, the worker can load the cached active manifest from the dedicated Search pack cache.

`src/search-worker/**` owns the restartable worker session. It handles `init`, `preloadCore`, `query`, `explore`, `loadFeature`, `cancel`, and `dispose` envelopes, includes request ids and worker epochs in responses, suppresses stale cursor windows through pack/query/rank/sort cursor validation, and returns DTO windows rather than shard buffers. The worker can answer reference, Arabic text, translation/context, exact word form, exact phrase, same written form, same root, lemma, and Surah context queries from the active pack. Multi-token non-phrase All, Arabic text, Translation, and Context queries require all unique query tokens to occur within the same source ayah; exact phrase mode remains adjacency-based, and exact word-form mode preserves source spelling while accepting the common initial base-alif/alif-wasla input variant. Explore graph sections are requested lazily and load attested following wording, shared wording, repeated phrases, occurs-once phrases, ayah endings, and Counts & patterns only after the user asks for Explore. Missing optional feature packs degrade at the panel level rather than breaking core Search.

Result windows are Hafs-source-native: worker DTOs keep the Search source ref/text and do not apply Hafs-to-Qalun aliasing during query execution. Each `query-window` response includes a worker-computed query brief from the full ranked result set, including matched source ayah counts, matched result rows, shown rows, occurrence-count status, lane counts, Mushaf-order distribution, representative refs, source frame, feature availability, mapping-state counts, and guardrail source notes. React derives query-level workspace view models from that DTO without changing the worker protocol. Each result DTO includes structured `matchEvidence` so cards and per-result Details render deterministic evidence copy without reverse-engineering explanations from lane labels. `Open in Read` is the only Reader-boundary action. When selected, the route reads the active Reader riwayah, resolves Hafs source refs directly for a Hafs Reader, or applies Hafs-to-Qalun aliases only when the Reader is using Qalun/Qaloon. Navigation proceeds only when that click-time mapping resolves to one safe Reader target. Identity surahs intentionally omitted from the alias table resolve as identity only after alias data is loaded; unavailable alias data and missing rows do not silently become Reader identity refs. `canHighlightWordsInRead` is always false because Qalun token alignment is not validated.

The route renders Search-specific content to the right of the Reader/NavDrawer chrome. The content pane contains query controls, then a query-level workspace with `Overview`, `Verses`, `Explore`, and `Sources` tabs. User-facing Search always runs in `All` mode; legacy mode URL params and saved-search modes are normalized to `All` on load. Submitted Search state is represented in `#/search` URL params for query text, active tab, and selected result identity, and reload restores the submitted query once the active Search pack is ready. Every submitted query receives a fresh Overview default unless the URL restores a valid active tab. Overview reports scoped counts and distributions only with labels such as all indexed matches, known results, or shown results, and no-result states include next-step recovery guidance directly on Overview. `Verses` and preview match cards use reader-style ayah-first rows with reference, full Hafs source ayah text, bundled Bridges translation when available, a compact icon-only Reader jump when the Search state exposes the Reader resolver, and `Details` for result evidence. Match reasons, lane labels, mapping notes, and source diagnostics stay in Details, Explore, or Sources rather than repeating on every shown verse. The Verses layout keeps result count/list and Details in predictable regions at desktop/tablet widths; mobile Details scrolls and focuses into view after selection. The result list exposes `Load more results` only while a worker cursor is available, and loading more updates only the shown-row count.

Per-result Details is result-level, not query-level. It contains why the selected verse matched, texts, Reader mapping, evidence rows, and result-level sources such as source ref, Reader refs, and mapping state. The result card action, Details mapping rows, and Sources mapping summary use the same visible Reader availability state: results with the click-time Reader resolver do not present as having no Reader target, and unavailable mappings keep `Open in Read` hidden. Query-level `Sources` contains Search pack provenance, source/license ids, normalizer/query/rank versions, aggregate Reader mapping summary, tokenization policy, boundary policy, and guardrail notes; it does not present one selected result's source ref or mapping state as a global fact. Query-level `Explore` renders source-backed summary cards for available query-level data such as Surah distribution, shown-result forms, translation/context terms, and source-boundary notes; result-level graph modules are marked as requiring Details instead of appearing as empty placeholders. Selected-token morphology details and graph loading only appear after an explicit per-result Details action seeds Explore. Phrase and non-morphology results show morphology as inapplicable for the selected result type rather than as a missing pack. Graph Explore remains lazy, shows scoped loading detail while graph sections hydrate, and loads source-backed wording sections only after explicit user action.

Graph phrase windows stay within one ayah and one surah, do not cross Bismillah boundaries, and are capped by maximum n-gram length, per-source-unit window count, encoded shard bytes, decoded shard bytes, and resident worker memory estimates. Following wording is attested wording only; Search must not label it as prediction, autocomplete, generated suggestions, semantic answers, tafsir, paraphrase, or generated Quran text. Shared wording is lexical overlap only and must not be presented as interpretive equivalence.

Saved searches are created only through `Save search` after the current query parses into a valid executable Search intent, and are shown inside the Search mode of the existing `NavDrawer`. Saved-search rows mirror bookmark row behavior: the full row loads the saved query, closes the drawer like a navigation jump, and a bookmark-style swipe/reveal delete action removes the record with an undo affordance for accidental deletion. Saved-search save/delete/load announcements are short-lived events and do not remain appended to later query statuses. `savedSearches` stores Phase 1 user intent fields, compatibility metadata, and timestamps. It does not store result DTOs, result windows, Explore section ids, or source corpus snapshots. Loading a saved search applies its query in `All` mode, announces the loaded state, and recomputes against the active compatible Search index.

Search may evolve toward user-facing answer, assistant, or guided-study experiences when the feature remains citation-first, source-bounded, and explicit about evidence limits. Search must not generate Quran text or present unsupported theological claims as sourced results.

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
- Search must use the Reader chrome and existing `NavDrawer`; saved searches must remain in the drawer Search mode.
- Search analysis uses Hafs/Tanzil source text; Reader aliasing happens only at the explicit `Open in Read` boundary when the Reader is using Qalun/Qaloon.
- Hafs-to-Qalun aliases must never silently fall back to identity Reader refs for divergent surahs, missing alias rows, or unavailable alias data.
- Identity surahs omitted from the loaded alias table can open as identity refs; this does not enable Reader word highlighting.
- Qalun word highlighting from Hafs morphology is forbidden until Qalun token alignment is validated.
- Search pack files must not be double-owned by both generic dataset CacheFirst caching and a manual Search installer/cache.
- Search saved-search storage must store query definitions, not materialized results.
- Search graph Explore sections must remain lazy and panel-scoped; core Search queries must not decode graph shards.
- Attested following wording and shared wording must keep their required non-generated/non-interpretive notes visible.
- Search answer, assistant, or guided-study experiences must remain citation-first, source-bounded, and explicit about evidence limits; Search must not generate Quran text or present unsupported theological claims as sourced results.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (16):**

- `tests/unit/react-offline/search-pack-lifecycle.test.ts`
- `tests/unit/react-search/ask-preview.test.ts`
- `tests/unit/react-search/generated-pack-smoke.test.ts`
- `tests/unit/react-search/graph-worker.test.ts`
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

**E2E (3):**

- `tests/e2e/search/react-search-cold-start.spec.ts`
- `tests/e2e/search/react-search-offline.spec.ts`
- `tests/e2e/search/react-search.spec.ts`
<!-- AUTO-GENERATED:tests END -->
