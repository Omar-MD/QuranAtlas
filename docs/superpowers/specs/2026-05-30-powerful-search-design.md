# Powerful Search Design

## Summary

QuranAtlas will promote Search from deferred prototype to a shipped product mode. The feature is a deterministic, source-backed Quran search and analysis workspace powered by generated static search packs and a lazy browser worker. It is not an AI assistant, chat surface, tafsir generator, semantic answer engine, or Quran text generator.

The app remains Reader First. `Read` continues to own the Qalun/Qaloon reader, Mushaf reader, navigation, bookmarks, Daily Wird, reader settings, and reader continuity. `Search` becomes the second top-level mode for finding and inspecting Quran text, translations, roots, wording patterns, and saved query definitions.

Search uses a Hafs-backed analytical corpus for morphology, roots, lemmas, word forms, and wording patterns because the available morphology sources align to Hafs. Search results may open in the Qalun/Qaloon reader only through explicit mapping states. The UI must never present Hafs morphology as Qalun/Qaloon-native data.

## Scope

MVP is delivered as Phases 1-3. The phases are implementation sequence, not product marketing. Search should not be promoted as shipped until every Phase 1 release gate passes; Phases 2-3 complete the requested Quran memory graph MVP.

Phase 0 is a prerequisite gate:

- Resolve QAC-style morphology source licensing, notice, and source-availability obligations.
- Define the Search pack ABI, worker message envelopes, pack discovery, and activation storage contracts.
- Add catalog records and verification rules for Search text, morphology, and licenses.
- Decide exact source-drop path and accepted checksums for the manual morphology source.
- Confirm that `Qalun` is the user-facing UI term while `qaloon` remains a runtime key.
- Define the normalization/tokenization contract shared by the builder and worker.
- Decide Search pack cache ownership before writing route UI. Search packs must either be excluded from the generic `/dataset/**` Workbox CacheFirst route or owned entirely by a dedicated Search pack route/cache strategy.
- Define multi-tab activation coordination and app/service-worker/Search-worker version handshakes.

Phase 1 proves shipped deterministic Search:

- Top-level `Read / Search` product model.
- Shipped `#/search` route.
- Client-only, no-server runtime.
- Versioned static core Search pack under `/dataset/search/**`.
- Lazy restartable Web Worker for query execution.
- Reference, Arabic text, translation/context, exact word form, and exact phrase search.
- Result list, result detail, `Open in Read`, and Search source details.
- Saved searches as explicit user-created dynamic query definitions with create, load, rename, and delete.
- Core Search pack install, verify, activate, rollback, startup reconciliation, and clear-data behavior.
- Automated tests for the builder, worker, mapping, storage, UI, and offline core pack behavior.

Phase 2 adds morphology and source-backed study depth:

- Same written form, same root, lemma detail, and morphology-backed fields.
- Surah context and counts for exact word forms, same-root groups, phrase occurrences, ayah endings, and distribution.
- The required morphology license/source gate must pass before Phase 2 can ship.
- Result detail must continue to separate Search source text from Reader text.

Phase 3 completes the Quran memory graph MVP:

- Attested following wording indexes.
- Shared wording adjacency.
- Repeated phrase exploration.
- Occurs-once phrase exploration.
- Stronger Counts & patterns workflows over phrase counts, root counts, surah distribution, ayah endings, and adjacency counts.
- Explore sections ordered by query relevance and loaded on demand.

Out of MVP:

- Runtime server, FastAPI, SQLite server database, or external search API.
- AI assistant, chat, generated answers, generated Quran text, semantic answer UI, or RAG.
- Tafsir reader UI, audio playback, memorization quizzes, mistake tracking, or spaced repetition.
- User notes, tags, annotations, shared collections, or manually curated study sets.
- Qalun/Qaloon word-level highlighting from Hafs morphology unless validated token alignment is later added.

## Product Language

Use:

- `Read`
- `Search`
- `Saved searches`
- `Save search`
- `Open in Read`
- `Match`
- `Explore`
- `Source`
- `Same written form`
- `Exact word form`
- `Same root`
- `Attested following wording`
- `Shared wording`
- `Surah context`
- `Counts & patterns`
- `Repeated phrases`
- `Occurs once in this index`
- `Ayah endings`
- `Search source text`
- `Reader text`
- `Same wording in Reader`
- `Corresponding ayah in Reader`
- `Different ayah boundary`
- `Hafs source only`
- `Word-level match not available in Reader text`

Avoid:

- `Discover`
- `Collections`
- `Journey`
- `Probability`
- `Prediction`
- `Likely next`
- `Suggested verse`
- `Autocomplete`
- `Semantic answer`
- `Meaning match`
- `Insights`
- `Chat`
- `Ask`
- `AI Search`
- `Hafs Search` as a product label

Required Search source note:

> Search analysis currently uses a Hafs text source for word forms, roots, morphology, and wording patterns. The Reader opens verses in the Qalun text.

Required trust note:

> Open in Read always uses the verified Reader text.

Required wording note:

> Results show attested wording in the indexed Quran text. They are not generated suggestions, paraphrases, or tafsir.

Required same-root note:

> Same-root matches are morphological aids. They do not mean the verses have the same interpretation.

Required shared-wording note:

> Shared wording shows lexical overlap in the indexed text. It does not mean the verses have the same interpretation, ruling, theme, or sabab.

Required following-wording note:

> Attested following wording shows wording observed after this phrase in the indexed text.

Required occurs-once note:

> "Occurs once" means once in the current Search index, according to its text and tokenization.

User workflows that define MVP success:

- A user enters an ayah reference and opens the corresponding Qalun Reader ayah when mapping validates.
- A user searches an Arabic word or phrase, sees all matched occurrences, and can inspect why each result matched.
- A user searches translation/context text and sees results clearly marked as source-backed indexed context, not tafsir.
- A user saves a search, later loads it, and sees results recomputed against the active compatible pack.
- A user inspects same-root matches and sees the morphology-aid warning.
- A user asks what wording follows a phrase and sees only attested following wording from the Search index.
- A user inspects repeated phrases, occurs-once phrases, ayah endings, and surah context with the source text, tokenization, and boundary policy visible in Source.
- A user opens a Search result in Read without Hafs morphology being projected onto Qalun words.

## Architecture

Search uses generated static packs plus a lazy worker. It must not load a large parsed JSON object graph at runtime.

Runtime architecture:

- Search route lazy-loads the worker only when Search opens.
- Reader launch performs no search pack fetch or graph work.
- Worker owns query normalization, pack loading, cancellation, result windows, and typed errors.
- UI receives small result windows, not rich copied graph objects.
- Existing reader loaders render reader text where appropriate.
- Search index assets stay in `/dataset/**`, not JS bundles.

Pack structure:

- A small manifest and source metadata may be JSON.
- Hot indexes should use compact representations where practical: dictionaries, delta-encoded postings, typed-array or binary shards, prefix ranges, and precomputed adjacency lists.
- Pack URLs must be immutable or content-addressed to avoid stale CacheFirst runtime assets.
- Active pack state lives in IndexedDB. Cache Storage stores immutable pack files under one owner only.
- Phase 1 core pack is generated with the baseline dataset and is staged/activated lazily on first Search entry. It must not block Reader launch. Search is ready offline only after a core pack has been activated on the device.
- `/dataset/search/**` must not be handled by both the generic runtime dataset cache and a manual Search installer. Double-caching large shards creates two cleanup authorities and is forbidden.

Search pack ABI v1:

- Every binary shard starts with a fixed container header: magic bytes, ABI major/minor, endian marker, schema id, feature id, header length, table directory offset, table count, body length, and fixture id.
- Table directory entries declare table role, offset, byte length, item count, value width, alignment, and checksum scope.
- Manifest files are UTF-8 JSON and reference only immutable content-addressed shard URLs.
- Hot index shards are little-endian binary unless a shard is explicitly marked JSON in the manifest.
- Integer ids and offsets default to unsigned 32-bit values; any 16-bit or 64-bit field must be declared in the shard schema.
- Text dictionaries are UTF-8 string tables with offset tables.
- Postings use sorted integer ids with delta encoding.
- Multi-byte header and table-directory values must be parsed with `DataView` before typed-array views are trusted.
- Shards are grouped by feature: core dictionary/reference tables, Arabic postings, translation/context postings, phrase postings, morphology, following wording, shared wording, counts/patterns, and provenance.
- Checksum algorithm is SHA-256 for every manifest and shard.
- Shard checksums are over fetched encoded bytes unless a shard explicitly declares an internal compression codec and decoded checksum.
- Phase 1 must define `maxShardBytes`, `maxDecodedShardBytes`, and `maxResidentWorkerBytes`. Browser-native SHA-256 is whole-buffer; shards must stay small enough for bounded WebCrypto verification unless an incremental hasher is explicitly budgeted.
- Compression is transport-level compression only in Phase 1 unless a shard declares an internal compression codec in the manifest.
- Each shard declares byte length, schema id, feature id, required dictionaries, checksum, memory estimate, and decoding fixture id.
- ABI changes require a new `packAbiVersion`; workers must reject unknown major versions.

Pack manifest fields:

- `packId`
- `packVersion`
- `packAbiVersion`
- `minAppVersion`
- `minWorkerVersion`
- `contentHash`
- `graphCorpusId`
- `sourceRiwayah`
- `features`
- `requires`
- `compatibleWith`
- `licenseIds`
- `sourceIds`
- `normalizerVersion`
- `queryAstVersion`
- `checksumAlgorithm`
- `totalBytes`
- `estimatedMemoryBytes`
- `shards`
- `notices`
- `buildInputDigests`
- `builtAt`

Core pack features:

- Manifest schema and pack feature flags.
- Normalizer version and query parser config.
- Ayah/reference table.
- Token dictionary.
- Arabic text postings.
- Translation/context postings.
- Exact word and phrase indexes.
- Basic prefix index.
- Provenance and source metadata.

Core searchable unit model:

- `ayahId`
- `tokenOrdinal`
- `normalizedTokenId`
- `surfaceTokenId`
- `sourceRef`
- `positionInAyah`
- `positionGlobal`
- boundary flags for ayah, surah, and allowed phrase windows
- positional postings for exact phrase search

Phrase and window policy:

- Phase 1 exact phrase search uses positional postings, not verse-level substring matching.
- Phase 1 must set a maximum phrase length for exact phrase queries.
- Phase 3 must set a separate n-gram materialization limit for repeated phrases, occurs-once phrases, following wording, and shared wording.
- Boundary policy must name whether phrases can cross ayah boundaries, surah boundaries, and Bismillah boundaries.
- Long or rare phrase features must have byte-budget gates; avoid materializing every possible phrase window without a bounded plan.

Advanced pack features:

- Same-root and lemma/morphology indexes.
- Attested following wording indexes.
- Repeated phrase counts.
- Occurs-once phrase indexes.
- Ayah endings.
- Surah context aggregates.
- Shared wording adjacency.
- Counts and patterns aggregates.

Worker protocol:

- `init(packId)`
- `preloadCore()`
- `query(request)`
- `loadFeature(featureId)`
- `cancel(requestId)`
- `dispose()`

Worker rules:

- Every request has a request id.
- Every worker session has a worker epoch and active pack identity.
- Cancellation is request-scoped.
- Stale responses are ignored.
- Responses include the request id, worker epoch, pack id, pack version, and either a typed payload or typed error.
- Fetch and decode paths must be abortable where browser APIs allow it.
- CPU-bound posting scans, phrase checks, decode loops, and ranking loops must use cooperative cancellation: chunked iteration, periodic request-token checks, and yielding between chunks.
- Cancellation returns an explicit `cancelled` acknowledgement when work is stopped before completion.
- A stuck worker epoch can be terminated and restarted as a fallback.
- Shard ArrayBuffers are worker-owned and must not be transferred to UI; transferring would detach them from the worker. UI receives result DTOs only.
- The worker maintains a resident-shard budget with LRU/refcount semantics, feature unload behavior, and `dispose()` cleanup.
- Activation changes invalidate in-flight requests from older pack epochs.
- Worker shutdown and restart must not corrupt active pack state.
- `dispose()` releases buffers and storage handles.

Typed worker errors:

- unavailable pack
- incompatible version
- missing feature
- corrupt shard
- offline miss
- cancelled
- unsupported query
- stale epoch
- activation changed
- quota unavailable

Ranking and cursor contract:

- Every result has a stable `resultId`.
- Ranking uses a versioned `rankVersion`.
- Sort options are explicit enums, not free-form strings.
- Tie-breakers must be deterministic: match type, source ref order, token position, then result id.
- Result cursors include pack id, pack version, query hash, query AST version, rank version, sort, and last stable result key.
- Saved searches store user intent and compatibility metadata; result windows are recomputed and re-ranked against the active compatible pack.

## Data Flow

Source inputs remain build-time only under `data/**`. Runtime code never imports source data directly.

Build inputs:

- Hafs source text for the Search analysis corpus.
- Manual source drop for QAC-style morphology, root, and lemma data.
- Approved translation/context/metadata sources.
- Source catalog records, license records, and verification rules.
- Existing Hafs-to-Qalun/Qaloon verse alias data for `Open in Read`.

Search source catalog requirements:

- Add first-class catalog records for Search text, morphology, and Search pack licenses before route promotion.
- Catalog records must include authority/provider, source URL, license id, allowed local source filename, accepted checksum, expected source version, expected ayah coverage, expected token/row counts, and source availability notes.
- Raw manual source drops live outside committed generated runtime output. If raw sources are not committed, normalized outputs must carry enough source availability metadata to satisfy the license plan.
- Search source lanes must be wired into `pnpm run data -- check`, `pnpm run data -- build`, full profile builds, and affected CI gates before Search ships.

Manual morphology source flow:

1. The user downloads the official morphology source outside automation.
2. The source file is placed in a documented local source-drop path.
3. The importer verifies expected filename, version, checksum, row counts, token counts, ayah coverage, and license metadata.
4. Unknown source bytes fail the build.
5. Transformed outputs carry source checksums, transform version, normalizer version, and license ids.

Graph corpus contract:

- `graphCorpusId`
- `graphCorpusKind`
- `sourceRiwayah`
- `sourceTextId`
- `sourceTextVersion`
- `morphologySourceId`
- `morphologyVersion`
- `licenseIds`
- `normalizationRules`
- `tokenizationPolicy`
- `phraseWindowPolicy`
- `boundaryPolicy`
- `alignmentPolicy`
- `sourceChecksums`
- `outputChecksums`
- `packSchemaVersion`
- `builtAt`

Normalization and tokenization contract:

- Builder and worker must use the same normalizer version.
- The contract names Unicode normalization form, Quran mark handling, tatweel handling, hamza/alif folding, ya/alif-maqsura handling, taa-marbuta handling, punctuation handling, Arabic/Latin digit handling, whitespace collapse, and token-boundary rules.
- Exact word form search must state whether diacritics, hamza forms, Uthmani marks, punctuation, and rasm variants are preserved or normalized.
- Phrase matching must use token positions from the indexed source, not substring matching over display text.
- Golden fixtures cover diacritized Arabic, undiacritized Arabic, hamza/alif variants, Quran marks, mixed Arabic/English input, references, and phrase boundaries.

Reference mapping rules:

- Search refs are Hafs graph refs.
- Reader refs are Qalun/Qaloon reader refs.
- Mapping is explicit and non-lossy.
- Verse-level opening is allowed only when alias mapping validates.
- Word-level highlighting in Reader is blocked unless Qalun/Qaloon token alignment is later validated.
- No alias fallback may silently become identity.
- One Hafs ref may map to zero, one, or multiple Reader refs.
- Every mapping asset declares source checksum, target checksum, mapping algorithm/version, and unresolved-ref count.
- Counts, patterns, and ayah endings visibly belong to the Search index unless a Qalun/Qaloon source index is explicitly selected in the future.

Mapping states:

- `same-wording-in-reader`
- `corresponding-ayah-in-reader`
- `different-ayah-boundary`
- `no-reader-ayah-alignment`
- `no-reader-token-alignment`
- `hafs-source-only`

Mapping asset fields:

- `mappingId`
- `sourceCorpusId`
- `readerCorpusId`
- `sourceRef`
- `readerRefs`
- `mappingState`
- `aliasRole`
- `boundaryRole`
- `canOpenInRead`
- `canHighlightWordsInRead`
- `reason`
- `sourceChecksum`
- `readerChecksum`
- `mappingVersion`

Builder outputs:

- Immutable pack manifest.
- Core index shards.
- Optional advanced feature shards.
- Source/provenance manifest.
- License/notice references.
- Pack byte plan.
- Checksum list.
- Feature dependency graph.

Saved searches store query definitions, not results:

- id
- name
- schema version
- query text
- query mode
- query AST version
- filters
- source lanes
- sort
- compatible pack requirements
- display preferences
- last opened timestamp
- created and updated timestamps

Opening a saved search recomputes results against the active compatible Search pack. If the pack changed, the UI may report that results can differ because the index changed.
Saved searches incompatible with the active pack remain readable and editable, but cannot run until a compatible pack is active.
Phase 1 saved searches persist user intent only: name, query text, mode, filters, sort, timestamps, and derived compatibility metadata. Explore section ids, required features, and source corpus id are derived at runtime unless the user explicitly customizes them in a later phase.

## UI Flow

Search is result-first and calm. It should feel like a precise inspection tool, not a dashboard and not a chat workspace.

Default Search state:

- Heading: `Search`
- Input label: `Search Quran text, translation, or context`
- Placeholder: `Search...`
- Modes/filters: All, Arabic text, Translation, Context, Root, Phrase.
- Action: `Saved searches`.
- Empty helper: `Enter a word, phrase, or ayah reference. Save only the searches you want to keep.`

`Context` means source-backed indexed context such as approved translation/context metadata. It must not mean tafsir, generated explanation, or interpretive commentary.

Phone layout:

- Single column.
- Sticky compact search header.
- Results first.
- Saved searches opens as a full-height sheet or subview.
- Result detail opens as a pushed detail view.
- Explore sections load one at a time.

Tablet layout:

- Portrait behaves like phone.
- Landscape may show results plus detail.
- No three-column tablet layout.

Desktop layout:

- Main results area.
- Optional selected-result detail pane.
- Collapsible Saved searches rail.
- Rail width around 280-320px when open.

Result cards:

- Reference line, e.g. `Surah 2 · 2:255`.
- Lane chips: Arabic text, Translation, Context, Same root, Phrase.
- Bidi-safe snippet rendering for Arabic and English.
- Primary action: `Open in Read`.
- Secondary action: `Details`.
- Optional provenance chip: Same wording in Reader, Corresponding ayah in Reader, Different ayah boundary, Hafs source only.
- Result cards may show `Open in Read` as primary only when `canOpenInRead` is true. Otherwise, the primary action is `Details`.
- Result cards do not show Qalun word highlighting for Hafs morphology results.

Result detail tabs:

- `Match`: matched passage, search source text, reader text where mapped, translation/context where available, and match reason. Match reason means why the result matched the query, not tafsir or interpretation.
- `Explore`: Same written form, Same root, Attested following wording, Shared wording, Surah context, Counts & patterns, Repeated phrases, Occurs once in this index, Ayah endings.
- `Source`: source ids, license/provenance, mapping state, pack version, and checksums where useful.

Explore rules:

- Explore sections default collapsed on phone.
- Explore sections are ordered by query type and source confidence, not by a fixed dashboard order.
- Only relevant sections are shown for a query.
- Expensive sections load on demand.
- Source and boundary policy are visible for counts, patterns, ayah endings, repeated phrases, and occurs-once phrases.
- Counts & patterns includes token counts, phrase counts, root counts, surah distribution, ayah endings, and adjacency counts when their feature packs are active.

Saved searches:

- Created only by `Save search`.
- List title: `Saved searches`.
- Empty state: `No saved searches yet. Save a search to return to its query and filters.`
- Phase 1 management actions: Rename, Delete.
- Phase 2+ management actions: Duplicate, Update saved search.
- Selecting a saved search loads its query and filters, announces the loaded state, and recomputes results.
- If a pack change affects a saved search, the UI announces that results were recomputed against the active Search index.

Accessibility rules:

- Use unique accessible action names, e.g. `Open 2:255 in Read`.
- Use `dir="auto"` and bidi isolation for mixed Arabic/English snippets, saved-search names, input echoes, chips, references, tab labels, and source rows.
- Use polite status messages for loading, searching, and saved-search loading.
- Announce result counts and active tab state.
- Return focus from result detail and Saved searches sheets to the launching control.
- Source notes should be available to assistive tech without being announced repeatedly for every result.
- Provenance chips must not rely on color alone.
- Charts and pattern summaries need text equivalents.
- Explore panels must be keyboard-accessible disclosures or tabs.

## Offline And Pack Lifecycle

Search pack states:

- not available
- available online
- installing
- staged
- verifying
- active
- update available
- incompatible
- failed
- offline unavailable

Activation rules:

- Never activate a partially fetched pack.
- Verify bytes and checksums before activation.
- Keep the previous active pack until the new one succeeds.
- If verification fails, discard staged files and keep the previous pack.
- If no active pack exists, Search shows a scoped unavailable state and keeps Read usable.
- Stable mutable URLs such as `/dataset/search/baseline/index.json` must not be the active runtime contract under CacheFirst caching.
- A small app-versioned Search pack registry points to immutable manifest URLs. The registry may ship with the app bundle or another non-CacheFirst app-versioned asset, but it must not rely on a stable mutable `/dataset/search/**` URL.
- The Search pack registry path is explicit and outside the generic `/dataset/**` CacheFirst runtime route unless the route is changed to exclude Search packs. A registry under `/dataset/search/**` is invalid.
- Search pack files are owned by either a dedicated Search installer/cache or the Workbox dataset cache, never both.
- Staged files live in a cache namespace keyed by content hash.
- Activation writes an IndexedDB active-pack pointer in one transaction after all required core shards verify.
- Previous active pack files are retained until the new active pack has loaded successfully at least once.
- Startup reconciles IndexedDB active-pack state with Cache Storage. Missing active files downgrade Search to repair/install state.
- Cleanup removes orphaned staged packs and old inactive packs only after active-pack verification succeeds.
- Low-quota failures surface before activation and keep the previous active pack.
- Activation uses a single-writer coordinator with monotonic activation generation and compare-and-swap active pointer writes.
- Cross-tab changes are announced through BroadcastChannel or storage events. Visible tabs and workers invalidate stale epochs before running new queries.
- Cleanup must not delete packs that another visible tab or live worker may still reference.
- App version, service-worker version, Search worker version, and active pack `min*Version` are checked on startup and before activation. Incompatible active packs move to repair/update state.
- Active and previous-active packs are protected from planned cleanup; staged packs are expendable.
- Byte-plan preflight uses manifest `totalBytes`, retained-pack overhead, and quota estimates before download.
- Boot-time repair is a normal state because browser storage is best-effort and may evict Cache Storage or IndexedDB data.

Offline degradation:

- Missing advanced packs do not break core search.
- Missing feature panels show panel-level unavailable states.
- Core unavailable state uses: `Search data is not available on this device.`
- Loading state uses: `Loading search index`.
- Ready state uses: `Search data is ready on this device.`
- Avoid promising permanent offline availability; browsers may evict storage.

Clear-data behavior:

- Remove saved searches.
- Remove search activation state.
- Remove staged pack metadata.
- Remove cached search pack assets according to the app clear-data contract.
- Keep reader bookmarks and Search saved searches conceptually separate.

## Integrity And Licensing

Religious/source integrity is a release gate.

Rules:

- Every result carries graph corpus identity.
- Every `Open in Read` action uses an explicit mapping state.
- Same-root results include the required same-root note.
- Attested following wording never appears as prediction, autocomplete, or suggested Quran text.
- QAC/GPL or other morphology license handling must be resolved before shipping morphology packs.
- License catalog entries, bundled notices, source links, source availability, transformed-data notes, and checksums must exist before release.
- Source details must be available offline.
- Morphology and same-root features cannot ship until QAC/GPL or replacement morphology license handling is complete.
- Source notices and transformed-data notes live in the core provenance payload when required for all Search, and in feature shards only when they apply to optional advanced features.

## Tests

Automated tests are required.

Data builder tests:

- Pack ABI golden fixtures decode deterministically across supported platforms.
- Header magic, ABI version, endian marker, table directory, endian, integer width, offset table, string table, and checksum validation fail on malformed fixtures.
- Source catalog validates Hafs/QAC/search license records.
- Manual source drop rejects unknown checksums.
- Morphology import validates ayah/token coverage.
- Normalization/tokenization fixtures are stable.
- N-gram/posting counts are reproducible.
- Attested following wording counts match source occurrences.
- Repeated phrase and occurs-once indexes obey token/window/boundary policy.
- Pack manifests include feature dependencies, byte sizes, checksums, source ids, and schema versions.
- Pack discovery rejects stable mutable Search URLs for active packs.
- Search builder rejects registry or active pack manifests under a stable mutable `/dataset/search/**` URL.
- Phrase/window policy tests cover max n, ayah boundary, surah boundary, Bismillah handling, and byte-budget gates.

Search engine and worker tests:

- Query normalization.
- Reference parsing.
- Arabic exact and normalized search.
- Translation/context search.
- Phrase search.
- Same-root lookup.
- Shared wording lookup.
- Ayah endings.
- Request ids and stale response handling.
- Request-scoped cancellation.
- Cooperative cancellation in posting scans, phrase checks, decode loops, and ranking loops.
- Worker restart mid-query.
- Activation change mid-query.
- Worker-owned shard buffers are not transferred to UI; UI receives result DTOs only.
- Resident-shard LRU/refcount limits and feature unload behavior.
- Stable ranking, tie-breakers, cursor pagination, and cursor invalidation across pack/query/rank changes.
- Positional postings for exact phrase search.
- Missing advanced pack degradation.
- Corrupt/incompatible pack errors.
- Quota failure and cache eviction reconciliation.
- Cache present/IDB missing and IDB present/Cache missing repair states.
- Cross-tab activation invalidation.
- No large index data imported into app JS chunks.

Mapping tests:

- Hafs graph refs map to Qalun/Qaloon reader refs only through explicit alias rules.
- No alias becomes unmapped, not identity.
- Merged, split, and different-boundary states are represented.
- No Reader word highlighting unless token alignment is validated.
- `Open in Read` builds the correct reader URL when mapping exists.

Storage tests:

- Dexie migration adds saved-search and search-pack stores.
- Phase 1 saved-search records include id, name, schema version, query text, mode, filters, sort, timestamps, and derived compatibility fields.
- Saved searches persist query definitions, not result snapshots.
- Saved searches recompute against active compatible packs.
- Clear-data removes saved searches and search activation state.
- Storage/versionchange failure states are handled.

UI tests:

- `#/search` is promoted from unsupported to shipped.
- Empty state copy appears.
- Basic query displays results.
- `Save search` creates a saved search.
- Saved search loads query/filter state.
- Result detail uses Match / Explore / Source.
- `Open in Read` has unique accessible names.
- Results without Reader mapping do not show `Open in Read` as primary.
- Mobile saved searches open as sheet/subview.
- Explore panels load on demand.
- Explore panels default collapsed on phone.
- Match tab uses match reason, not interpretive explanation.
- Offline and missing-feature states are scoped.

E2E/offline tests:

- Search route loads after app launch without affecting reader cold start.
- Active search pack works offline after installation/activation.
- Missing advanced pack does not break core results.
- Service worker update does not leave stale stable pack URLs active.
- Reader continuity remains dominant unless Search resumability is explicitly enabled.
- Search pack registry is not served from the generic dataset CacheFirst path.
- Multi-tab activation does not run stale workers or delete packs used by another visible tab.

Implementation verification should include:

- `pnpm run data -- check`
- `pnpm run data -- build`
- `pnpm run data -- build --profile=full` once Search data joins dataset profiles
- `pnpm run check`
- `pnpm run test`
- `pnpm run build`
- `node scripts/check-chunks.js`
- targeted Playwright Search/offline specs
- targeted `pnpm run test:e2e:offline` coverage for Search pack activation
- `pnpm run docs`
- `pnpm run docs:check`
- final `pnpm run validate`

Implementation integration checklist:

- Complete Phase 0 contracts before route promotion.
- Promote `#/search` from unsupported only after Phase 1 core pack, worker, storage, and offline checks exist.
- Lazy-load the shipped Search route from the app shell as a late Phase 1 integration step.
- Update product docs, implemented/future docs, the Search surface dossier, source-data-flow docs, data-model docs, tech stack if scripts or gates change, and generated docs.
- Also update architecture, repo-structure, style-map, feature-map/generated docs, and any docs that currently state Search is unsupported.
- Treat existing `src/search/**` prototype code as hard replace unless audited line by line. The current alias fallback and stable pack URL shape must not be reused unchanged.
- Add `scripts/data/search/build.mjs` and wire Search into `pnpm run data -- check`, `pnpm run data -- build`, and affected CI gates.
- Update `scripts/ci/affected.mjs` for any new `shared/search/**`, `data/search/**`, morphology source-drop, Search ABI, or pack registry paths.
- Add explicit Dexie v8 store names, indexes, typed table access, migration tests, e2e fixture updates, versionchange handling, and clear-data coverage.
- Treat Search pack lifecycle as a Search+Infra implementation unit and update both dossiers.
- Keep Search UI in owned route/component boundaries and compose approved `src/components/ui` primitives.
- Update design-system registry maturity/proof state for shipped Search components.
- Keep Search JS chunks within the existing `check-chunks.js` budget: 150 KB gzip per chunk and 500 KB gzip total.
- Place tests deliberately: builder tests under `tests/unit/scripts`, worker/query tests under `tests/unit/react-search`, storage tests under `tests/unit/react-storage`, and browser Search journeys under `tests/e2e/search/` with Search dossier coverage.
- Require local `pnpm run validate` before PR readiness for route-promotion work. Search PRs must run e2e/offline gates even when CI would otherwise skip them for `dev` PRs.

Phase acceptance gates:

- Phase 0: source/license, ABI, pack registry, mapping schema, and route promotion docs are designed and test fixtures exist.
- Phase 1: core lexical Search, result detail, saved searches, Open in Read, core pack activation, and offline repair states pass automated and browser verification.
- Phase 2: morphology/same-root/Search source notes ship only after license/source gates pass and no Qalun word highlighting is projected from Hafs data.
- Phase 3: memory-graph Explore panels ship with relevance ordering, source/boundary policy, no-interpretation guardrails, and scoped missing-pack degradation.

## Fixed Decisions For Implementation Planning

- The implementation plan must begin with Phase 0 gates.
- Search does not replace Reader continuity in Phase 1. Cold launch remains Reader-first; Search may preserve in-route state while the app is open but does not overwrite `lastSurface`.
- Core Search pack is generated with the baseline dataset and lazily staged/activated on first Search entry. It is offline-ready only after successful activation.
- User-facing source labels use `Qalun`; runtime keys may continue to use `qaloon`.
- Morphology/same-root features remain in the Phase 1-3 MVP, but they cannot ship before the source/license gate passes.
