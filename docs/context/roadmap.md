# Roadmap

Agreed future work that supports the Reader First product promise. When work starts the entry moves into the active plan; when it ships, it moves to `implemented.md`.

## V1 Reader Completion

- Complete Verse and Mushaf reading modes around Hafs, Qalun, and Warsh.
- Bookmarks and saved reading position as reading-continuity primitives.
- Reading preferences: themes, typography, line spacing, word spacing, margins, and related reader comfort controls.
- Daily Wird goal, reminder, and progress inside the reader-continuity flow.
- Page-break indicators and metadata-backed page/juz/hizb/rub/ruku awareness where they strengthen reading.

## V1 Asset Packs and Pipeline

- One active qira'ah/riwayah pack at a time: Hafs, Qalun, or Warsh.
- One active translation pack, one active tafsir pack, and one active curated metadata pack at a time.
- Optional packs install before activation and become usable only after local install state is verified.
- Mushaf pages are tied to the active qira'ah/riwayah and require matching page assets.
- Asset indexes support byte planning, offline caching, provenance, manifest membership, and future retrieval boundaries.

## V1 Search and Navigation

- Search over Arabic Qur'an text, translations, transliteration/index data, tafsir, and curated metadata.
- Surah and Juz navigation as first-class reader paths.
- Hizb, rub, ruku, and page data remain metadata until separately promoted to visible controls.
- Reader mode switching between Verse and Mushaf.

## V1 Curated Metadata

- Tafsir as the primary reader-attached study text.
- Verse themes, short curated meanings or summaries, and passage grouping/context.
- Makki/Madani classification and source-backed revelation/asbab metadata.
- Juz, hizb, rub, ruku, and page metadata as reader/navigation metadata.

## Future AI/Retrieval Infrastructure

- Provenance-rich, versioned source assets.
- Citation-first retrieval indexes and boundaries.
- Scholarly claims datasets when sourcing and review rules are defined.
- Optional embedding/vector indexes as infrastructure only.

This lane is infrastructure and retrieval readiness. It is not an AI assistant, chat, agent, synthesis UI, or answer-generation product.

## Deferred Language Aids

- Transliteration display.
- Word-by-word translation.
- Tajweed coloring.

Transliteration may support search and indexing before it becomes a display aid.

## Curated Metadata Backlog

- Arabic roots.
- Concepts.
- Divine names.
- Cross-references.

These are not v1 scope unless separately promoted with clear reader value and source rules.

## Removed Scope

- Audio and recitation playback.
- Personal marks, tags, notes, comments, review, and edges, except bookmarks.
- Copy, share, export, import, user-facing sync, accounts, community, and shared collections.
- Streaks and standalone khatm tracker product branches.
- AI assistant, chat, agent, synthesis UI, and current-roadmap reflection prompts.
- Multiple translations side by side.
- Qira'at beyond Hafs, Qalun, and Warsh.

Future personal annotations are not a roadmap lane. They belong only in `future.md` as a separate possible personal layer outside current product scope.

## Infra

- Versioned `_shapes` and cursor-walk backfill before first user-visible release.
- Remove `'unsafe-inline'` from `style-src`.
- Lazy-mount overlays where it reduces boot cost without weakening reader reliability.
