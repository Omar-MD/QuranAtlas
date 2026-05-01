# Vocabulary glossary

Single source of truth for the names this codebase uses. Audit R-17 / CC-11 (2026-04-29) catalogued six concept-name conflicts that compound when audio lands; lock them here before #13 (audio) and #17 (sync v2) introduce more drift.

If a doc, comment, or commit message disagrees with an entry below, fix the doc — code wins, but **this glossary defines what the code's tokens *mean***. New names must land here before they ship.

---

## mark vs tag

- **Mark.** A persisted record on a single verse. Lives in the `marks` IDB store. One mark per `verseKey`. The record carries a 12-layer tag taxonomy plus a `note`.
- **Tag.** A *value* inside one of the 12 layers of a mark — e.g. the string `"mercy"` inside `mark.threads`. Plural-form fields like `mark.subjects` hold multiple tags. Tags have user-facing UI (`tag/TagSheet.svelte`, `tag/TagChip.svelte`) but no IDB store of their own.

**Rule of thumb:** "Mark this verse" → write a Mark. "Pick a tag" → choose a string within a layer.

The pre-2026-04-29 file layout reflected the older single-meaning conflation: `marks/Editor.svelte`, `marks/TagChip.svelte`, `marks/TagLayerRegion.svelte` (now removed). The deep editor lives at `tag/TagSheet.svelte`; per-verse mark CRUD lives at `marks/store.ts`.

## layer vs facet vs category

Use **layer** everywhere. The 12 layers are: `threads`, `subjects`, `audience`, `speaker`, `quotedSpeaker`, `mode`, `form`, `tone`, `people`, `places`, `events`, `divineNames` (canonical list at `core/db/types.ts::LAYER_NAMES`). "Facet" and "category" are forbidden in code identifiers and new docs; references in older specs are grandfathered.

## canonicalize vs canon vs slug

- **Canonicalize.** Verb. The pipeline at `core/normalize.ts::canonicalize(s)` — NFC + lowercase + Arabic alias resolution + space-collapse. Always normalises Arabic and Latin.
- **`_canon`.** Noun, the noun form of "canonicalised values". Stored on `MarkRecord._canon` (a `{layer → string[]}` map) and `EdgeRecord._canonKind` (single string). Indexable; never user-visible; never written by hand (`marks/store.ts` recomputes via `canonicalize()` on every put).
- **Slug.** Forbidden synonym. Don't introduce.

## verseKey vs verseRef vs ayah

- **verseKey.** The string `'<surah>:<ayah>'` (e.g. `'2:255'`). Length cap 12. Regex `/^\d+:\d+$/`. Used as IDB key, BroadcastChannel payload element, route parameter. The DOM identity attribute is `data-token-key` (which also accepts the word-grain form `'<surah>:<ayah>:<wordIdx>'`); use `tokenVerseKey()` from `core/tokenisable.ts` to strip the word index when resolving to a verseKey for IDB lookup. Single source of truth.
- **verseRef.** Forbidden. Don't introduce. (Some pre-2026 specs use it — grandfathered.)
- **ayah.** A single verse — the user-facing concept. Use as the noun ("the third ayah of Sūrat al-Fātiḥa"); use **verseKey** for the identifier, **`aya_no`** only when echoing a dataset field (KFGQPC source).

## riwayah vs riwayat vs reciter

This is the audio-collision risk the audit flagged. Pin the meanings now:

- **Riwayah.** Singular. A *textual* transmission of the Qur'an. Three of them ship today: `'hafs'`, `'warsh'`, `'qaloon'` (canonical list at `core/db/types.ts::Riwayah`). The reader is parameterised by riwayah, the dataset is split by riwayah, the active KFGQPC font is keyed off riwayah.
- **Riwayat.** Plural. Used in directory paths (`public/dataset/riwayat/{name}/`), prose contexts ("supports three riwayat"), and the audit. Never used as an identifier or runtime variable name.
- **Reciter.** A *voice*: a person reciting one of the textual transmissions. Husary recites Hafs; Al-Minshawi recites Hafs; etc. **A reciter is not a riwayah.** When audio lands (#13), the schema is `audio/{reciter-id}/{NNN}.mp3` and `settings.activeReciter` (string) — separate from `settings.riwayah`.

**Forbidden conflations:** `qira'a` (which is technically a different concept from riwayah but is sometimes used loosely upstream), `recitation` as an identifier (use `reciter` for the voice, `riwayah` for the text). Don't let an audio fetch script read `settings.riwayah` to pick which reciter file to download — those are different settings.

## surface vs route vs view

- **Surface.** The user-visible, cluster-by-surface unit. Each one has a journey entry in `docs/context/surfaces/<surface>.md` and a Playwright spec. The cluster-by-surface playbook lives at `docs/workflow/cluster-by-surface.md`.
- **Route.** A hash pattern registered on `core/router.ts` (`#/s/:surah`, `#/review`, etc.). One surface may have multiple routes (e.g. the reader has `#/s/:surah` and `#/s/:surah/:ayah`). Routes are concrete; surfaces are conceptual.
- **View.** Forbidden as an identifier for either. Don't introduce. ("View" is fine in casual prose but never as a function name, prop name, or doc heading.)

## settings keys

`settings` is the IDB store. Each *key* in it has exactly one writer module — see `data-model.md` §Cross-cutting rules for the table. New settings keys must list a sole-writer module here AND in that table in the same commit.

The store is namespaced informally — sub-features prefix when there's a collision risk (e.g. `quota-warning-suppressed`). Do not introduce a flat `settings.foo / settings.bar` for two different features — the namespace eventually collides.

## bridge

A persistent-overlay pattern used by `nav/CommandSheet.svelte`, `tag/TagSheet.svelte`, `settings/Panel.svelte`, and similar components. The pattern:

- The Svelte component, mounted persistently in `App.svelte`, calls `register*({ open, close })` in `onMount`.
- Imperative callers (vanilla JS, command sheet, keyboard handlers) import the module-level `open*()` / `close*()` functions and call them.

As of 2026-05-01 (N22 / R-13), all five overlay bridges (UndoToast, Settings Panel, CommandSheet, NavDrawer, TagSheet) are produced by `core/persistent-overlay.ts::createOverlayBridge<API>()`. "Bridge" is synonymous with "overlay registered with `createOverlayBridge`". The factory's `setMounter` + pending-call queue handles the chicken-and-egg between boot-time bridge calls and lazy-mounted components (N25). New persistent overlays MUST use the factory — hand-rolled bridges are forbidden.

## sole writer

A module that is the only callsite that does `put(store, …)` for a given store *or* a given settings key. Documented in `data-model.md` §Cross-cutting rules. Violating this rule causes silent cross-tab / event-contract bugs that are hard to catch in review.

## topic (BroadcastChannel)

A stable string label on `safety/sync.ts`'s generic envelope `{ topic, payload }`. Built-in topics: `'marks'`, `'edges'`, `'bookmarks'`. Feature-owned topics: `'settings.riwayah'` (registered by `settings/riwayah.ts::initRiwayah`). Future audio: `'audio.position'`, `'audio.reciter'` etc. Each topic has at most one handler registered via `registerTopic(topic, fn)`.
