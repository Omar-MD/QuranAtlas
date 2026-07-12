# Roadmap

Agreed future work that supports the Reader First product promise. When work starts the entry moves into the active plan; when it ships, it moves to `implemented.md`.

## V1 Reader Completion

- Complete Verse and Mushaf reading modes around the current Qaloon default profile.
- Bookmarks and saved reading position as reading-continuity primitives.
- Reading preferences: themes, typography, line spacing, word spacing, margins, and related reader comfort controls.
- Daily Wird goal, reminder, and progress inside the reader-continuity flow.
- Page-break indicators and metadata-backed page/juz/hizb/rub/ruku awareness where they strengthen reading.

## V1 Asset Packs and Pipeline

- The current MVP defaults to Qaloon text/font, quran.ws Mushaf, and Bridges translation. Fresh or cleared storage may make one Mushaf edition choice from the availability index.
- Asset Management is read-only inventory for that profile.
- Future multiple-profile work can extend the shared reader asset profile contract before reintroducing riwayah, translation, tafsir, routine switching, or edition switching outside Clear All Data.
- Optional packs must install before activation and become usable only after local install state is verified when that future work returns.
- Asset indexes support byte planning, offline caching, provenance, manifest membership, and future retrieval boundaries.

## V1 Search and Navigation

- Deterministic Quran Search is now an active plan: Hafs-backed Search text, translation/context lookup, immutable static packs, lazy worker execution, explicit Qalun Reader mapping, and saved searches. It must remain route-unsupported until Phase 1 gates pass.
- Surah, Juz, and Hizb navigation as first-class reader paths.
- Rub, ruku, and page data remain metadata until separately promoted to visible controls.
- Reader mode switching between Verse and Mushaf.

## V1 Curated Metadata

- Tafsir as future reader-attached study text.
- Verse themes, short curated meanings or summaries, and passage grouping/context.
- Makki/Madani classification and source-backed revelation/asbab metadata.
- Rub, ruku, and page metadata as reader/navigation metadata.

## Future AI/Retrieval Infrastructure

- Provenance-rich, versioned source assets.
- Citation-first retrieval indexes and boundaries beyond the deterministic Search pack plan.
- Scholarly claims datasets when sourcing and review rules are defined.
- Optional embedding/vector indexes as infrastructure only.

This lane may support future answer, assistant, chat, agent, synthesis, or guided-study products when they are citation-first, source-bounded, and explicit about evidence limits. Generated Quran text and unsupported theological claims remain out of scope.

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
- Multiple translations side by side.
- Riwayah, translation source, tafsir source, and Mushaf edition switching UI until the multiple-profile contract is restored. The one-time fresh/cleared Mushaf setup choice is not a switching UI.
- Qira'at beyond the current Qaloon default profile.

Future personal annotations are not a roadmap lane. They belong only in `future.md` as a separate possible personal layer outside current product scope.

## Infra

- Versioned `_shapes` and cursor-walk backfill before first user-visible release.
- Remove `'unsafe-inline'` from `style-src`.
- Lazy-mount overlays where it reduces boot cost without weakening reader reliability.
