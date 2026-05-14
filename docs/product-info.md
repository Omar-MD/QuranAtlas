# QuranAtlas

**Reader First.**

QuranAtlas is an offline-first Qur'an reader centered on complete Verse and Mushaf reading. The v1 promise is reading continuity: reliable Arabic text, one active translation, one active tafsir, curated reader-attached metadata, bookmarks, saved position, Daily Wird, Surah/Juz navigation, powerful search, and reader preferences that make long sessions comfortable.

This is the product overview. For implementation detail, see `docs/context/` and the surface dossiers under `docs/context/surfaces/`.

## Who is it for?

- Muslims who want a focused, uncluttered way to read the Qur'an on their phone or laptop.
- Readers who need reliable offline access during commutes, travel, prayer times, or low-connectivity moments.
- Students and regular readers who want tafsir and curated context attached to the reading flow without leaving the reader.

## V1 product promise

### Complete reading modes

- **Verse reader** for continuous ayah-by-ayah reading with Arabic text, optional translation display, tafsir access, curated metadata, cross-surah movement, and saved position.
- **Mushaf reader** for page-based reading tied to the active qira'ah/riwayah page assets.
- **Bookmarks** for reading continuity. Bookmarks are not part of the future personal annotation layer.
- **Daily Wird** for reader-adjacent goal, reminder, and progress inside the continuity flow.

### Source and asset packs

- **Qira'ah/riwayah scope:** Hafs, Qalun, and Warsh only. Qalun is the baseline reader pack. Runtime keys and existing file paths may still use `qaloon`.
- **One active pack per source type:** one qira'ah/riwayah, one translation, one tafsir, and one curated metadata pack at a time.
- **Install before activate:** optional qira'ah/riwayah, translation, tafsir, metadata, Mushaf page, and search/index packs become usable only after local install state is verified.
- **No silent pack fallback:** if a selected pack is missing, stale, or unavailable, the app must show an unavailable/install/switch state or explicitly change the active setting to a verified baseline.
- **Offline-first assets:** shipped and optional packs carry provenance, build-time validation, manifest membership, byte planning, and install-state checks.

### Reading controls

- Themes, typography, line spacing, word spacing, reader margins, and related reader comfort controls.
- Surah and Juz navigation, with hizb, rub, ruku, and page data treated as metadata until promoted to first-class controls.
- Search over Arabic Qur'an text, translations, transliteration/index data, tafsir, and curated metadata.
- Page-break indicators and Mushaf page navigation where matching assets exist.

### Curated study inside reading

Study exists where it strengthens reading. V1 curated metadata includes tafsir, verse themes, short meanings or summaries, passage grouping/context, Makki/Madani classification, source-backed revelation/asbab metadata, and juz/hizb/rub/ruku/page metadata. Curated metadata appears inside reading, search, and navigation flows rather than as a separate research product.

Arabic roots, concepts, divine names, and cross-references remain curated metadata backlog unless separately promoted.

### AI readiness

QuranAtlas is preparing its asset pipeline for future retrieval and citation-first AI by keeping sources clean, provenance-rich, validated, versioned, and indexable. No AI assistant, chat, agent, synthesis UI, or reflection-prompt product is in current v1 scope.

## Out of current product scope

- Audio and recitation playback.
- Personal marks, tags, notes, comments, review, and edges, except bookmarks.
- Copy, share, export, import, user-facing sync, accounts, community, or shared collections.
- Streaks and standalone khatm tracker product branches.
- Multiple translations side by side.
- Qira'at beyond Hafs, Qalun, and Warsh.
- Transliteration display, word-by-word translation, and tajweed coloring.

Existing implementation for removed branches may remain until a later source cleanup, but it is not the v1 product promise.

## Privacy

QuranAtlas is local-first. Current persistence lives in IndexedDB and Cache Storage on the user's device. Same-device and cross-tab coherence are technical infrastructure, not user-facing sync, accounts, or community.

## Learn more

- Current implementation inventory: [`docs/context/implemented.md`](context/implemented.md)
- Codebase orientation: [`docs/context/architecture.md`](context/architecture.md)
- Product roadmap: [`docs/context/roadmap.md`](context/roadmap.md)
- Future direction: [`docs/context/future.md`](context/future.md)
