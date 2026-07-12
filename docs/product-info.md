# QuranAtlas

**Reader First.**

QuranAtlas is an offline-first Qur'an reader centered on complete Verse and Mushaf reading. The current MVP promise is reading continuity on one verified default reader profile: Qalun/Qaloon text and font, Qaloon Mushaf pages, Bridges translation, bookmarks, saved position, Daily Wird, Surah/Juz/Hizb navigation, and reader preferences that make long sessions comfortable.

This is the product overview. For implementation detail, see `docs/context/` and the surface dossiers under `docs/context/surfaces/`.

## Who is it for?

- Muslims who want a focused, uncluttered way to read the Qur'an on their phone or laptop.
- Readers who need reliable offline access during commutes, travel, prayer times, or low-connectivity moments.
- Students and regular readers who want a stable reading surface that can grow into curated context without leaving the reader.

## V1 product promise

### Complete reading modes

- **Verse reader** for continuous ayah-by-ayah reading with Qaloon Arabic text, optional Bridges translation display, cross-surah movement, and saved position.
- **Mushaf reader** for page-based reading tied to the default Qaloon quran.ws Mushaf page assets. The private build also includes the reviewed Furatiyyah 2023 WebP edition; first or cleared setup selects one available edition.
- **Bookmarks** for reading continuity. Bookmarks are not part of the future personal annotation layer.
- **Daily Wird** for reader-adjacent goal, reminder, and progress inside the continuity flow.

### Source and asset packs

- **Current default profile:** Qalun in product prose; runtime keys and existing file paths use `qaloon`. The default profile is Qaloon text/font, quran.ws Mushaf, and Bridges translation. The Furatiyyah PDF input and derived WebPs are private-build-only and are not part of the standard build or CI input cache.
- **One-time Mushaf setup:** fresh or cleared storage selects exactly one compatible Mushaf edition. Existing valid profiles migrate to quran.ws without deleting continuity. Changing an edition later requires About > Clear All Data; unavailable completed selections enter recovery rather than remapping bookmarks.
- **No current source pickers:** the MVP UI does not offer riwayah, translation source, tafsir source, or ongoing Mushaf edition switching.
- **Read-only asset inventory:** Asset Management describes the three included reader assets. Install, verify, activate, switch, and remove controls are future multiple-profile work.
- **Silent contract reset:** first launch under the MVP contract clears older unsupported local settings, bookmarks, and caches once, then opens the reader.
- **Offline-first assets:** shipped assets carry provenance, build-time validation, manifest membership, and byte planning.

### Reading controls

- Themes, typography, line spacing, word spacing, reader margins, and related reader comfort controls.
- Surah, Juz, and Hizb navigation, with rub, ruku, and page data treated as metadata until promoted to first-class controls.
- **Search:** `#/search` provides deterministic source-backed Search over the active Hafs-backed Search index: references, Arabic text, translation/context, exact word forms, exact phrases, same written forms, same roots, lemmas, and source-backed wording exploration. Search opens Reader verses only through validated Qalun Reader mappings.
- Page-break indicators and Mushaf page navigation where matching assets exist.

### Curated study inside reading

Study exists where it strengthens reading, but tafsir and richer curated context are future work in the MVP contract. Curated metadata candidates include tafsir, verse themes, short meanings or summaries, passage grouping/context, Makki/Madani classification, source-backed revelation/asbab metadata, and rub/ruku/page metadata.

Concepts, divine names, cross-references, and richer curated study metadata remain backlog unless separately promoted.

### AI readiness

QuranAtlas is preparing its asset pipeline for retrieval and citation-first AI by keeping sources clean, provenance-rich, validated, versioned, and indexable. Future answer, assistant, chat, agent, synthesis, or guided-study experiences are allowed when they are source-bounded, cite their evidence, and stay explicit about evidence limits. Generated Quran text and unsupported theological claims remain out of scope.

## Out of current product scope

- Audio and recitation playback.
- Personal marks, tags, notes, comments, review, and edges, except bookmarks.
- Copy, share, export, import, user-facing sync, accounts, community, or shared collections.
- Streaks and standalone khatm tracker product branches.
- Multiple translations side by side.
- Riwayah, translation source, tafsir source, and Mushaf edition switching UI outside the one-time fresh/cleared setup.
- Tafsir reader UI and tafsir source packs.
- Qira'at beyond the current Qaloon default profile.
- Transliteration display, word-by-word translation, and tajweed coloring.

Existing implementation for removed branches may remain until a later source cleanup, but it is not the v1 product promise.

## Privacy

QuranAtlas is local-first. Current persistence lives in IndexedDB and Cache Storage on the user's device. Same-device and cross-tab coherence are technical infrastructure, not user-facing sync, accounts, or community.

## Learn more

- Current implementation inventory: [`docs/context/implemented.md`](context/implemented.md)
- Codebase orientation: [`docs/context/architecture.md`](context/architecture.md)
- Product roadmap: [`docs/context/roadmap.md`](context/roadmap.md)
- Future direction: [`docs/context/future.md`](context/future.md)
