# Vocabulary glossary

Single source of truth for the names this codebase uses.

If a doc, comment, or commit message disagrees with an entry below, fix the doc — code wins, but **this glossary defines what the code's tokens *mean***. New names must land here before they ship.

---

## bookmark vs metadata

- **Bookmark.** Reader continuity state for a specific `verseKey` or Mushaf page under the active riwayah. Bookmarks are navigation data, not annotation data.
- **Curated metadata.** QuranAtlas-authored or source-backed enrichment such as tafsir, translation, passage summaries, knowledge chips, and Mushaf/page structure. Metadata stays read-only from the user’s perspective.

Reader First does not ship personal annotation or taxonomy editing. New docs should describe bookmarks, saved position, riwayah packs, and curated metadata directly instead of using older study-taxonomy vocabulary.

## canonicalize vs canon vs slug

- **Canonicalize.** Verb. Normalize source-facing text into a machine-comparable form: NFC, lowercase where applicable, Arabic alias resolution, and space collapse. Keep this logic in the owning data/search helper that uses it.
- **`_canon`.** Noun, the noun form of "canonicalised values". Use it only for machine-normalised internal fields; never user-visible and never hand-written.
- **Slug.** Forbidden synonym. Don't introduce.

## verseKey vs verseRef vs ayah

- **verseKey.** The string `'<surah>:<ayah>'` (e.g. `'2:255'`) for verse identity. Mushaf page bookmarks use `m:<page>` as a page-scoped bookmark key. The DOM identity attribute is `data-token-key`.
- **verseRef.** Forbidden. Don't introduce.
- **ayah.** A single verse — the user-facing concept. Use as the noun ("the third ayah of Sūrat al-Fātiḥa"); use **verseKey** for the identifier, **`aya_no`** only when echoing a dataset field (KFGQPC source).

## Reader First

Reader First is QuranAtlas's product doctrine: complete offline-first Verse and Mushaf reading, reader preferences, bookmarks, saved position, Daily Wird, search/navigation, and reader-attached curated metadata when it strengthens reading. The current MVP narrows that doctrine to one default reader profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation.

## curated metadata vs personal notes

Curated metadata is QuranAtlas-authored or source-backed reader enrichment: tafsir, verse themes, short meanings or summaries, passage grouping/context, Makki/Madani and revelation/asbab metadata, and juz/hizb/rub/ruku/page metadata. Tafsir and richer curated metadata are future work in the current MVP. Personal notes are future scope; do not describe them as part of the shipped Reader First product.

## asset pack terms

- **Reader asset profile.** The current framework-neutral contract describing the shipped reader assets. The MVP profile is Qaloon text/font, Qaloon Mushaf, and Bridges translation.
- **Asset pack.** A coherent set of files for one source type, such as qira'ah/riwayah text, translation, tafsir, curated metadata, Mushaf pages, or search indexes.
- **Active pack.** The selected pack for a source type. In the current MVP there is only the default profile, so the UI does not expose active-pack switching.
- **Baseline pack.** The pack shipped with the baseline app bundle. Qalun is the baseline qira'ah/riwayah pack; runtime keys use `qaloon`.
- **Optional pack.** Future multiple-profile vocabulary for a discoverable pack that must install before activation. Catalog availability is not usability.

## Qalun and runtime `qaloon`

Use Qalun in product prose. Existing runtime keys, paths, and TypeScript unions may continue to use `qaloon`. Upstream source slugs such as `qalun` may appear only when documenting provider mappings.

## riwayah vs riwayat vs reciter

Pin the meanings to avoid audio-side collisions:

- **Riwayah.** Singular. A *textual* transmission of the Qur'an. The current MVP reader uses only `'qaloon'`; Hafs and Warsh source data may remain in build-time inputs for validation/future work but are not selectable current product profiles. The reader dataset path is still split by riwayah, and the active KFGQPC font is keyed off riwayah.
- **Riwayat.** Plural. Used in directory paths (`public/dataset/riwayat/{name}/`) and prose contexts ("supports three riwayat"). Never used as an identifier or runtime variable name.
- **Reciter.** Removed-scope implementation vocabulary for a voice: a person reciting one of the textual transmissions. A reciter is not a riwayah. Any remaining audio code is cleanup inventory and must stay separate from `settings.riwayah`.

**Forbidden conflations:** `qira'a` (which is technically a different concept from riwayah but is sometimes used loosely upstream), `recitation` as an identifier for text source (use `riwayah` for the text). Do not let removed-scope audio vocabulary drive reader source naming.

## surface vs route vs view

- **Surface.** The user-visible, cluster-by-surface unit. Each one has a journey entry in `docs/context/surfaces/<surface>.md` and a Playwright spec. The clustering workflow lives in `.agents/skills/quranatlas-workflow/SKILL.md`.
- **Route.** A hash pattern parsed by `src/app/router/routes.ts` (`#/s/:surah`, `#/bookmarks`, etc.). One surface may have multiple routes (e.g. the reader has `#/s/:surah` and `#/s/:surah/:ayah`). Routes are concrete; surfaces are conceptual.
- **View.** Forbidden as an identifier for either. Don't introduce. ("View" is fine in casual prose but never as a function name, prop name, or doc heading.)

## settings keys

`settings` is the IDB store. Each *key* in it has exactly one writer module — see `data-model.md` §Cross-cutting rules for the table. New settings keys must list a sole-writer module here AND in that table in the same commit.

The store is namespaced informally — sub-features prefix when there's a collision risk (e.g. `quota-warning-suppressed`). Do not introduce a flat `settings.foo / settings.bar` for two different features — the namespace eventually collides.

## overlay opener

Settings and navigation overlays are React-owned state transitions. Imperative opener helpers, such as `src/app/settings-overlay-events.ts` and `src/components/navigation/nav-drawer-controller.ts`, must stay tiny and route-aware. They should dispatch intent into mounted React owners rather than becoming hidden application state.

## sole writer

A module that is the only callsite that writes a given store *or* a given settings key. Documented in `data-model.md`. Violating this rule causes silent cross-tab and route-state bugs that are hard to catch in review.

## topic (BroadcastChannel)

A stable string label on a same-device browser sync envelope. Active built-in topics are currently bookmark-focused. Each topic should have one owner and a documented payload shape.
