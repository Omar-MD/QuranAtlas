# Vocabulary glossary

Single source of truth for the names this codebase uses.

If a doc, comment, or commit message disagrees with an entry below, fix the doc — code wins, but **this glossary defines what the code's tokens *mean***. New names must land here before they ship.

---

## bookmark vs metadata

- **Bookmark.** Reader continuity state for a specific `verseKey` under the active riwayah. Bookmarks are navigation data, not annotation data.
- **Curated metadata.** QuranAtlas-authored or source-backed enrichment such as tafsir, translation, passage summaries, knowledge chips, and Mushaf/page structure. Metadata stays read-only from the user’s perspective.

Reader First does not ship personal annotation or taxonomy editing. New docs should describe bookmarks, saved position, riwayah packs, and curated metadata directly instead of using older study-taxonomy vocabulary.

## canonicalize vs canon vs slug

- **Canonicalize.** Verb. The pipeline at `core/normalize.ts::canonicalize(s)` — NFC + lowercase + Arabic alias resolution + space-collapse. Always normalises Arabic and Latin.
- **`_canon`.** Noun, the noun form of "canonicalised values". Use it only for machine-normalised internal fields; never user-visible and never hand-written.
- **Slug.** Forbidden synonym. Don't introduce.

## verseKey vs verseRef vs ayah

- **verseKey.** The string `'<surah>:<ayah>'` (e.g. `'2:255'`). Length cap 12. Regex `/^\d+:\d+$/`. Used as IDB key, BroadcastChannel payload element, route parameter. The DOM identity attribute is `data-token-key` (which also accepts the word-grain form `'<surah>:<ayah>:<wordIdx>'`); use `tokenVerseKey()` from `core/tokenisable.ts` to strip the word index when resolving to a verseKey for IDB lookup. Single source of truth.
- **verseRef.** Forbidden. Don't introduce.
- **ayah.** A single verse — the user-facing concept. Use as the noun ("the third ayah of Sūrat al-Fātiḥa"); use **verseKey** for the identifier, **`aya_no`** only when echoing a dataset field (KFGQPC source).

## Reader First

Reader First is QuranAtlas's v1 product doctrine: complete offline-first Verse and Mushaf reading, reader preferences, bookmarks, saved position, Daily Wird, search/navigation, and reader-attached curated metadata. Study, storage, and future retrieval work serve reading rather than becoming separate v1 products.

## curated metadata vs personal notes

Curated metadata is QuranAtlas-authored or source-backed reader enrichment: tafsir, verse themes, short meanings or summaries, passage grouping/context, Makki/Madani and revelation/asbab metadata, and juz/hizb/rub/ruku/page metadata. Personal notes are future scope; do not describe them as part of the shipped Reader First product.

## asset pack terms

- **Asset pack.** A coherent set of files for one source type, such as qira'ah/riwayah text, translation, tafsir, curated metadata, Mushaf pages, or search indexes.
- **Active pack.** The single selected pack for a source type. The reader must render the active pack only after it is verified usable.
- **Baseline pack.** The pack shipped with the baseline app bundle. Qalun is the baseline qira'ah/riwayah pack.
- **Optional pack.** A discoverable pack that must install before activation. Catalog availability is not usability.

## Qalun and runtime `qaloon`

Use Qalun in product prose. Existing runtime keys, paths, and TypeScript unions may continue to use `qaloon`. Upstream source slugs such as `qalun` may appear only when documenting provider mappings.

## riwayah vs riwayat vs reciter

Pin the meanings to avoid audio-side collisions:

- **Riwayah.** Singular. A *textual* transmission of the Qur'an. Three of them ship today: `'hafs'`, `'warsh'`, `'qaloon'` (canonical list at `core/db/types.ts::Riwayah`). The reader is parameterised by riwayah, the dataset is split by riwayah, the active KFGQPC font is keyed off riwayah.
- **Riwayat.** Plural. Used in directory paths (`public/dataset/riwayat/{name}/`) and prose contexts ("supports three riwayat"). Never used as an identifier or runtime variable name.
- **Reciter.** Removed-scope implementation vocabulary for a voice: a person reciting one of the textual transmissions. A reciter is not a riwayah. Any remaining audio code is cleanup inventory and must stay separate from `settings.riwayah`.

**Forbidden conflations:** `qira'a` (which is technically a different concept from riwayah but is sometimes used loosely upstream), `recitation` as an identifier for text source (use `riwayah` for the text). Do not let removed-scope audio vocabulary drive reader source naming.

## surface vs route vs view

- **Surface.** The user-visible, cluster-by-surface unit. Each one has a journey entry in `docs/context/surfaces/<surface>.md` and a Playwright spec. The clustering workflow lives in `.agents/skills/quranatlas-workflow/SKILL.md`.
- **Route.** A hash pattern registered on `core/router.ts` (`#/s/:surah`, `#/bookmarks`, etc.). One surface may have multiple routes (e.g. the reader has `#/s/:surah` and `#/s/:surah/:ayah`). Routes are concrete; surfaces are conceptual.
- **View.** Forbidden as an identifier for either. Don't introduce. ("View" is fine in casual prose but never as a function name, prop name, or doc heading.)

## settings keys

`settings` is the IDB store. Each *key* in it has exactly one writer module — see `data-model.md` §Cross-cutting rules for the table. New settings keys must list a sole-writer module here AND in that table in the same commit.

The store is namespaced informally — sub-features prefix when there's a collision risk (e.g. `quota-warning-suppressed`). Do not introduce a flat `settings.foo / settings.bar` for two different features — the namespace eventually collides.

## bridge

A persistent-overlay pattern used by `nav/CommandSheet.svelte`, `settings/Panel.svelte`, `read/TafsirSheet.svelte`, and similar components. The pattern:

- The Svelte component, mounted persistently in `App.svelte`, calls `register*({ open, close })` in `onMount`.
- Imperative callers (vanilla JS, command sheet, keyboard handlers) import the module-level `open*()` / `close*()` functions and call them.

The active reader-first overlay bridges (Settings Panel, CommandSheet, NavDrawer, TafsirSheet) are produced by `core/persistent-overlay.ts::createOverlayBridge<API>()`. "Bridge" is synonymous with "overlay registered with `createOverlayBridge`". The factory's `setMounter` + pending-call queue handles the chicken-and-egg between boot-time bridge calls and lazy-mounted components. New persistent overlays MUST use the factory; hand-rolled bridges are forbidden.

## sole writer

A module that is the only callsite that does `put(store, …)` for a given store *or* a given settings key. Documented in `data-model.md` §Cross-cutting rules. Violating this rule causes silent cross-tab / event-contract bugs that are hard to catch in review.

## topic (BroadcastChannel)

A stable string label on `safety/sync.ts`'s generic envelope `{ topic, payload }`. Active built-in topics are bookmark and riwayah sync. Each topic has at most one handler registered via `registerTopic(topic, fn)`.
