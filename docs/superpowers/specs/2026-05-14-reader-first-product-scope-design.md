# Reader First Product Scope Design

## Goal

Refocus QuranAtlas around a clear v1 product thesis and update the roadmap,
vision, and context documents to match it. This spec is documentation and
product-context cleanup only. Source-code removal or refactoring for cut product
areas will be handled in a later cleanup cycle.

## Product Doctrine

QuranAtlas is Reader First.

The v1 promise is a complete, offline-first Qur'an reading experience across
Verse and Mushaf modes, with serious reader controls: qira'at/riwayat,
translations, tafsir, transliteration-backed search, Surah/Juz navigation,
bookmarks/current position, themes, typography, spacing, and Daily Wird.

Study exists only where it strengthens reading. V1 study is curated dataset
metadata: verse themes, short meanings, passage structure, Makki/Madani and
source-backed revelation context, juz/hizb/rub/ruku/page metadata, concepts, and
other provenance-backed enrichment. It should appear inside reading, search, and
navigation flows rather than becoming a separate research product.

AI readiness is infrastructural, not a v1 feature. The asset pipeline should
produce clean, provenance-rich, versioned assets that can later support
retrieval and citation-first AI. No AI assistant, chat, agent, or synthesis UI
belongs in the current roadmap.

Personal annotations are future scope. Future user-authored meanings, tags,
comments, notes, and edges/layer systems must be separate from curated
QuranAtlas metadata. Bookmarks remain part of reading continuity; personal
marks/tags/review are removed from current product scope.

Audio is removed from the product. It is not deferred v2 scope. Existing audio
code cleanup is future source cleanup work, not part of this documentation pass.

## V1 Core Reading Scope

Keep and describe as central:

- Verse reader.
- Mushaf reader.
- Bookmarks and saved reading position.
- Reading preferences: themes, text size, line spacing, word spacing, margins,
  and related reader typography controls.
- Surah and Juz navigation.
- Page-break indicators.
- Daily Wird with reminder and goal.
- Search over Arabic Qur'an text, translations, transliteration, and curated
  metadata.
- Hafs, Qalun, and Warsh as the only supported qira'ah/riwayah scope.
- Translation packs, one active at a time.
- Tafsir packs, one active at a time.
- Offline-first reader asset-pack installation.

Adjust:

- Hizb, rub, and ruku stay as metadata. They are not first-class visible
  navigation controls yet.
- Khatm tracking folds into Daily Wird rather than becoming a separate product
  branch.
- Offline UI should be framed around reader asset packs, not generic feature
  categories.
- Product docs must not claim runtime SHA verification, even if an
  implementation later verifies assets. Documentation should emphasize
  source provenance, build-time validation, manifest membership, and
  install-state verification.

Cut from current roadmap:

- Streaks.
- Audio.
- Personal marks/tags/notes/review as a product promise.
- Copy, share, export, import, sync, and community/shared collections.
- Multiple translations side-by-side.
- Qira'at beyond Hafs, Qalun, and Warsh.

## Asset Pack Model

Every major reader source follows the same rule: one active pack per asset type.
Switching to a non-baseline pack requires installation before activation. The
reader must never silently render another pack behind a selected label.

Baseline app bundle:

- Ships one default qira'ah/riwayah pack.
- Ships one default translation pack.
- Ships one default tafsir pack.
- Ships one default curated metadata pack.
- Ships the reader shell and enough baseline navigation/search assets for the
  default reading experience.

Pack behavior:

- Qira'ah/riwayah: one active pack at a time. Hafs, Qalun, and Warsh are the
  whole supported scope. Non-baseline packs install before switch.
- Translation: one active pack at a time. Optional translations install before
  activation.
- Tafsir: one active pack at a time. Optional tafsirs install before activation.
- Curated metadata: baseline metadata ships by default. Richer future metadata
  packs may follow install/activate semantics when needed.
- Mushaf pages: tied to the active qira'ah/riwayah. Switching qira'ah requires
  matching text and page assets to be installed.
- Search indexes: generated first-class assets for Arabic text, translation,
  transliteration, tafsir/metadata where applicable, and curated metadata.

Asset requirements:

- Product/docs copy may use Qalun, while runtime asset keys may keep the
  existing repo spelling `qaloon`; the docs cleanup should avoid presenting
  those as separate packs.
- Every shipped qira'ah/riwayah, translation, tafsir, curated metadata, and
  search asset needs provenance.
- Asset indexes must support install-state checks, byte planning, offline
  caching, and future retrieval boundaries.
- Optional pack availability must not equal usability. A pack becomes usable
  only after the app verifies local install state for all required files.

## Curated Study Layer

Keep as reader-attached curated metadata:

- Verse themes.
- Short curated meanings/summaries.
- Passage grouping and passage context.
- Makki/Madani and revelation/asbab metadata when source-backed.
- Arabic roots as curated metadata backlog.
- Concepts, divine names, and cross-references as curated metadata backlog.
- Tafsir as the main reader-attached study text.

Defer:

- Transliteration display.
- Word-by-word translation.
- Tajweed coloring.
- Reflection prompts.
- Muhkam/mutashabih classification unless there is a clear scholarly source and
  a clear reader UI purpose.

Future infrastructure, not product UI:

- Scholarly claims dataset.
- Citation-first retrieval.
- Embedding/vector indexes as infrastructure only.

Cut from roadmap wording:

- AI assistant/chat as a product feature.

## Future Personal Layer

Future only and separate from curated assets:

- User meanings.
- User tags.
- Comments.
- Notes.
- Edges/layer system.

Current personal marks/tags/review/edges should be documented as removed product
scope pending source cleanup. Bookmarks remain because they are reading
continuity, not study annotation.

## Documentation Rewrite Plan

### `docs/product-info.md`

Rewrite around the v1 product promise:

- Offline-first Qur'an reader.
- Complete Verse and Mushaf reading modes.
- One-active-pack source model for qira'ah/riwayah, translation, tafsir, and
  curated metadata.
- Search, navigation, preferences, bookmarks, and Daily Wird.
- Curated metadata as reader enrichment.
- AI readiness through asset quality, not AI UI.

Remove:

- Mark-first product framing.
- Legacy tag routes and personal tag/review promises.
- Audio product references.
- Sharing/sync/community promises.
- Runtime SHA verification claims.
- Multiple-translation or broad-qira'at implications.

### `docs/context/roadmap.md`

Replace the broad wishlist with release-oriented scope:

- V1 Reader Completion.
- V1 Asset Packs and Pipeline.
- V1 Search and Navigation.
- V1 Curated Metadata.
- Future Personal Layer.
- Future AI/Retrieval Infrastructure.
- Deferred Language Aids.
- Removed Scope.

The removed-scope section should explicitly include audio, personal marks/tags
as current product value, sharing/export/import/sync/community, streaks, AI
assistant/chat, multiple translations side-by-side, and qira'at beyond
Hafs/Qalun/Warsh.

### `docs/context/future.md`

Refocus future direction around:

- Asset pipeline quality.
- Provenance and versioning.
- Curated metadata expansion.
- Future personal layer separation.
- Future citation-first retrieval and AI readiness.

Remove any wording that makes AI assistant/chat look like a committed product
surface.

### `docs/context/implemented.md`

Keep it honest about code that exists, but separate implemented code inventory
from product scope:

- Reader, navigation, configure, infra, and curated metadata remain active
  product scope.
- Audio becomes removed product scope pending source cleanup.
- Personal marks/review/edges become removed product scope pending source
  cleanup, except bookmarks.

### `docs/context/open-issues.md`

Add cleanup debt for removed branches:

- Remove audio product/code surface in a later source cleanup.
- Remove personal marks/tags/review/edges product/code surface in a later source
  cleanup, preserving bookmarks.
- Align onboarding and shortcut copy with Reader First scope.

Existing performance, schema, and validation issues should remain unless fixed.

### Surface dossiers

`docs/context/surfaces/read.md`

- Establish Reader First as the owner of Verse/Mushaf, preferences, tafsir,
  curated metadata display, page indicators, and Daily Wird.
- Remove any implication that personal mark creation is a core reader action.
- State pack invariants for qira'ah/riwayah, translation, tafsir, metadata, and
  Mushaf pages.

`docs/context/surfaces/navigate.md`

- Align navigation around Surah/Juz, search, bookmarks, reader mode switching,
  and Daily Wird.
- Remove product framing around tag/review navigation except deprecated cleanup
  notes where needed.

`docs/context/surfaces/configure.md`

- Reframe Settings around reader preferences and asset-pack source management.
- Use one-active-pack semantics for qira'ah/riwayah, translation, tafsir, and
  metadata.
- Remove audio as a source category from product docs.

`docs/context/surfaces/infra.md`

- Reframe offline around asset-pack handling, install-state verification,
  provenance, manifest membership, and build-time validation.
- Remove runtime SHA verification as a product claim.
- Mark audio cache routes as removed product scope pending source cleanup.

`docs/context/surfaces/listen.md`

- Mark listen/audio as removed product scope pending source cleanup.
- Do not keep audio in the roadmap as deferred v2 work.

`docs/context/surfaces/mark.md` and `docs/context/surfaces/review.md`

- Mark personal marks/tags/review/edges as removed product scope pending source
  cleanup.
- State that future personal annotations may return as a separate layer for user
  meanings, tags, comments, notes, and edges.
- Do not present marks/review as current v1 product value.

`docs/context/surfaces/onboard.md`

- Align onboarding with Reader First: reading modes, qira'ah/riwayah,
  translation, tafsir, search/navigation, preferences, offline, and Daily Wird.
- Remove mark/tag-first onboarding copy.

## Non-Goals For This Spec

- No source-code deletion.
- No database migration.
- No UI redesign.
- No new asset pipeline implementation.
- No test changes.
- No generated context fence edits by hand.

## Success Criteria

After implementation of this documentation cleanup:

- A reader can understand QuranAtlas's v1 promise from `product-info.md` without
  encountering cut features.
- `roadmap.md` no longer reads as a broad wishlist.
- Audio is clearly removed from product scope.
- Personal marks/tags/review are clearly removed from current product scope,
  with future personal annotations separated from curated metadata.
- Asset packs have one consistent rule across qira'ah/riwayah, translation,
  tafsir, metadata, Mushaf pages, and search indexes.
- AI readiness is described as asset/pipeline/retrieval readiness, not AI UI.
- Context dossiers no longer contradict the Reader First doctrine.
