# Reader First Product Scope Design

## Goal

Refocus QuranAtlas around a clear v1 product thesis and update the roadmap,
vision, and context documents to match it. This spec is documentation and
product-context cleanup only. Source-code removal or refactoring for cut product
areas will be handled in a later cleanup cycle.

## Product Doctrine

QuranAtlas is Reader First.

The v1 promise is a complete, offline-first Qur'an reader across Verse and
Mushaf modes. Reader controls include qira'ah/riwayah selection limited to
Hafs, Qalun, and Warsh; one active translation, tafsir, and curated metadata
pack; bookmarks and saved position; themes, typography, spacing; Surah/Juz
navigation; Daily Wird; and powerful search. Transliteration may support
search/indexing, but transliteration display remains a deferred language aid.

Study exists only where it strengthens reading. V1 study is reader-attached
curated dataset metadata: tafsir, verse themes, short meanings or summaries,
passage grouping/context, Makki/Madani classification, source-backed
revelation/asbab metadata, and juz/hizb/rub/ruku/page metadata. Arabic roots,
concepts, divine names, and cross-references remain curated metadata backlog
unless separately promoted. Study metadata should appear inside reading, search,
and navigation flows rather than becoming a separate research product.

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
- Curated metadata packs, one active at a time.
- Offline-first reader asset-pack installation.

Adjust:

- Hizb, rub, and ruku stay as metadata. They are not first-class visible
  navigation controls yet.
- Do not promise a separate khatm tracker. Daily Wird may show goal and progress
  only inside the reader-continuity flow; streaks and standalone reading-plan
  product branches remain cut.
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
- Copy, share, export, import, user-facing sync, accounts, and
  community/shared collections.
- Multiple translations side-by-side.
- Qira'at beyond Hafs, Qalun, and Warsh.

Sync means user-data export/import, multi-device sync, accounts, community, or
shared collections. Existing same-device/cross-tab coherence remains technical
infrastructure and should not be removed from current-state architecture docs.

## Asset Pack Model

Every major reader source follows the same rule: one active pack per asset type.
Switching to a non-baseline pack requires installation before activation. The
reader must never silently render another pack behind a selected label.

Baseline app bundle:

- Ships Qalun as the baseline qira'ah/riwayah pack. Product copy must use
  Qalun; runtime keys may continue to use `qaloon`.
- Ships one default translation pack.
- Ships one default tafsir pack.
- Ships one default curated metadata pack.
- Ships the reader shell and baseline navigation/search indexes needed for the
  default reading experience.

Pack behavior:

- Qira'ah/riwayah: one active pack at a time. Hafs, Qalun, and Warsh are the
  whole supported scope. Non-baseline packs install before switch.
- Translation: one active pack at a time. Optional translations install before
  activation.
- Tafsir: one active pack at a time. Optional tafsirs install before activation.
- Curated metadata: one active pack at a time. Baseline metadata ships by
  default. Any optional richer metadata pack introduced later must install
  before activation.
- Mushaf pages: tied to the active qira'ah/riwayah. Switching qira'ah requires
  matching text and page assets to be installed.
- Search indexes: generated first-class assets for Arabic text, translation,
  transliteration, tafsir/metadata where applicable, and curated metadata.
  Baseline search/index assets ship with the baseline app bundle. Optional
  search/index assets follow the installed pack they index and must not make an
  uninstalled pack appear usable.

Asset requirements:

- Product/docs copy must use Qalun. Runtime asset keys, file paths, and
  existing code identifiers may keep the existing repo spelling `qaloon`.
  Upstream source slugs such as `qalun` may appear only when documenting
  source-provider mappings. The docs cleanup should avoid presenting these as
  separate product packs.
- Every shipped qira'ah/riwayah, translation, tafsir, curated metadata, and
  search asset needs provenance.
- Asset indexes must support install-state checks, byte planning, offline
  caching, and future retrieval boundaries.
- Optional pack availability must not equal usability. A pack becomes usable
  only after the app verifies local install state for all required files.
- If a selected pack is missing, stale, or unavailable, the UI must show an
  unavailable/install/switch state or explicitly change the active setting to a
  verified baseline. It must never render baseline content while keeping the
  unavailable pack's label active.

## Curated Study Layer

V1 reader-attached curated metadata includes:

- Tafsir as the main reader-attached study text.
- Verse themes.
- Short curated meanings/summaries.
- Passage grouping and passage context.
- Makki/Madani and revelation/asbab metadata when source-backed.
- Juz, hizb, rub, ruku, and page metadata as reader/navigation metadata.

Curated metadata backlog, not V1 scope unless separately promoted:

- Arabic roots.
- Concepts.
- Divine names.
- Cross-references.

Deferred language/display aids:

- Transliteration display.
- Word-by-word translation.
- Tajweed coloring.

Removed from current roadmap:

- Reflection prompts. They may return only after AI/retrieval infrastructure is
  ready and after a separate product decision.
- Muhkam/mutashabih classification unless separately approved with clear
  scholarly sourcing and reader purpose.

Future infrastructure, not product UI:

- Scholarly claims dataset.
- Citation-first retrieval.
- Embedding/vector indexes as infrastructure only.

Cut from roadmap wording:

- AI assistant/chat/agent/synthesis UI as a product feature.

## Future Personal Layer

Future only and separate from curated assets:

- User meanings.
- User tags.
- Comments.
- Notes.
- Edges/layer system.

Current personal marks/tags/review/edges should be documented as removed product
scope pending source cleanup. Bookmarks remain because they are reading
continuity, not study annotation. Future personal annotations belong only in the
future personal layer, separate from curated metadata and outside the current
roadmap.

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
- Transliteration as search/index support only, not reader display.

Remove:

- Mark-first product framing.
- Legacy tag routes and personal tag/review promises.
- Audio product references.
- Sharing/export/import/user-facing sync/accounts/community promises.
- Runtime SHA verification claims.
- Multiple-translation or broad-qira'at implications.

### `docs/context/roadmap.md`

Replace the broad wishlist with release-oriented scope:

- V1 Reader Completion.
- V1 Asset Packs and Pipeline.
- V1 Search and Navigation.
- V1 Curated Metadata.
- Future AI/Retrieval Infrastructure.
- Deferred Language Aids.
- Removed Scope.

Future AI/Retrieval Infrastructure remains in the roadmap because the current
asset pipeline, provenance model, manifest/index design, and retrieval-ready
dataset handling are directly affected by v1 work. It must stay framed as
infrastructure and retrieval readiness, not AI assistant/chat/agent/synthesis
product UI.

The removed-scope section should explicitly include audio; personal marks, tags,
notes, review, and edges except bookmarks; copy/share/export/import;
user-facing sync, accounts, community, and shared collections; streaks; AI
assistant/chat/agent/synthesis UI; reflection prompts in the current roadmap;
multiple translations side-by-side; and qira'at beyond Hafs/Qalun/Warsh.
Reflection prompts may return only in later versions after AI/retrieval
infrastructure is ready and after a separate product decision.

Future personal annotations must not appear as a roadmap lane. Keep them in
`docs/context/future.md` only, separated from curated metadata and clearly
outside current product scope.

### `docs/context/future.md`

Refocus future direction around:

- Asset pipeline quality.
- Provenance and versioning.
- Curated metadata expansion.
- Future personal layer separation.
- Future citation-first retrieval and AI readiness.

Remove any wording that makes AI assistant/chat look like a committed product
surface. Reflection prompts should not appear as current or next-step roadmap;
they may return only in later versions after AI/retrieval infrastructure is ready
and after a separate product decision.

### `docs/context/source-data-flow.md`

Align the data-pipeline reference with the Reader First asset-pack model:

- Document Qalun as the baseline qira'ah/riwayah pack while preserving the
  existing runtime key spelling `qaloon`.
- State that qira'ah/riwayah, translation, tafsir, curated metadata, Mushaf page,
  and search assets follow install-before-activate semantics when optional.
- Keep quran.ws and source catalogs as build-time inputs only.
- Describe source provenance, build-time validation, manifest membership, byte
  planning, and install-state checks without claiming runtime SHA verification.
- Remove or qualify fallback wording for qira'ah/riwayah, translation, tafsir,
  curated metadata, Mushaf pages, and derived search indexes. Fallback is
  acceptable only as an explicit active-source change or unavailable-pack state;
  docs must not describe rendering one pack while another selected label remains
  active.

### `docs/context/data-model.md`

Keep the current implemented store inventory honest while separating product
scope from pending cleanup:

- Preserve bookmarks as active reading-continuity data.
- Mark `marks`, `activationState`, `edges`, and `audioPosition` as removed
  product scope pending source cleanup where prose describes product meaning.
- Align static dataset sections with one-active-pack semantics for qira'ah,
  translation, tafsir, curated metadata, Mushaf pages, and search indexes.
- Remove or qualify fallback wording for qira'ah/riwayah, translation, tafsir,
  curated metadata, Mushaf pages, and derived search indexes. Fallback is
  acceptable only as an explicit active-source change or unavailable-pack state;
  docs must not describe rendering one pack while another selected label remains
  active.

### `docs/context/architecture.md`

Align cross-cutting behavior with Reader First:

- Remove mark-first interaction language from cross-cutting patterns.
- Keep review/mark/audio routes and overlays honest as current implementation or
  cleanup debt, not v1 product promise.
- Align dataset, service-worker, and offline sections with asset-pack
  install-state invariants and no runtime SHA claims.
- Preserve cross-tab safety/coherence as technical infrastructure even though
  user-facing sync/community is cut.
- Keep same-device/cross-tab coherence wording separate from user-facing sync,
  accounts, community, export/import, or shared collections.

### `docs/context/glossary.md`

Update vocabulary so terminology cannot keep removed scope alive:

- Reword mark/tag/edge/audio terms as current implementation vocabulary for
  pending cleanup, not product doctrine.
- Add or clarify Reader First, curated metadata, personal layer, asset pack,
  active pack, baseline pack, optional pack, and Qalun/runtime `qaloon`.

### `docs/context/csp-allowlist.md`

Keep CSP policy tied to current and approved infrastructure only:

- Remove future-widening sketches for audio reciter CDNs and multi-device sync
  endpoints.
- Keep the registry focused on current outbound policy and the process for any
  future architecture-level widening.
- Do not reference removed product scope as a reason to widen CSP later.

### `docs/context/implemented.md`

Keep it honest about code that exists, but separate implemented code inventory
from product scope:

- Reader, navigation, configure, infra, and curated metadata remain active
  product scope.
- Audio becomes removed product scope pending source cleanup.
- Personal marks/review/edges become removed product scope pending source
  cleanup, except bookmarks.
- Implemented-code inventory can mention removed surfaces only as code that
  exists pending cleanup, not as V1 value or deferred roadmap value.

### `docs/context/open-issues.md`

Add cleanup debt for removed branches:

- Remove audio product/code surface in a later source cleanup.
- Remove personal marks/tags/review/edges product/code surface in a later source
  cleanup, preserving bookmarks.
- Align onboarding and shortcut copy with Reader First scope.

Existing performance, schema, and validation issues should remain unless fixed.

### `.agents/skills/*/SKILL.md`

Review repo-local skills for product-scope drift and update only the affected
manual prose:

- `quranatlas-workflow`: keep surface-first workflow, docs ownership, testing
  placement, and verification guidance together; do not describe marking,
  review, or listening as active product surfaces except for cleanup work.
- `quranatlas-audit`: make Reader First, one-active-pack invariants, removed
  audio/personal-layer scope, and AI infrastructure-vs-UI separation part of the
  audit baseline.
- `quranatlas-ui-workflow`: update only if it contains product-surface examples
  that contradict Reader First; do not broaden UI scope.

### `AGENTS.md` and scoped `AGENTS.md` files

Keep agent instructions aligned with the rewritten context docs:

- Root `AGENTS.md` should mention every load-bearing context doc and repo-local
  skill that must be checked for product-scope changes.
- Root `AGENTS.md` should describe `future.md` as provisional future direction
  for asset lanes, retrieval readiness, and separately decided future personal
  annotations; it must not make reflection prompts sound like active roadmap.
- `tests/e2e/AGENTS.md` and `tests/unit/AGENTS.md` should stay mostly about test
  placement. Update them only where examples or placement rules imply new
  product work for cut mark/review/listen/sync/community/audio scope.

### Surface dossiers

`docs/context/surfaces/read.md`

- Establish Reader First as the owner of Verse/Mushaf, preferences, tafsir,
  curated metadata display, page indicators, and Daily Wird.
- Remove any implication that personal mark creation is a core reader action.
- State pack invariants for qira'ah/riwayah, translation, tafsir, metadata, and
  Mushaf pages.
- Remove or qualify fallback wording for qira'ah/riwayah, translation, tafsir,
  curated metadata, Mushaf pages, and derived search indexes. Fallback is
  acceptable only as an explicit active-source change or unavailable-pack state;
  docs must not describe rendering one pack while another selected label remains
  active.

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
- Remove or qualify fallback wording for qira'ah/riwayah, translation, tafsir,
  curated metadata, Mushaf pages, and derived search indexes. Fallback is
  acceptable only as an explicit active-source change or unavailable-pack state;
  docs must not describe rendering one pack while another selected label remains
  active.

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
- Do not present future personal annotations inside these active surface
  dossiers as if mark/review are deferred roadmap surfaces. Future personal
  annotations belong in `docs/context/future.md` only, as a separate layer for
  user meanings, tags, comments, notes, and edges.
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

## Verification For Documentation Cleanup

After implementing the planned docs cleanup:

- Run `pnpm run docs`.
- Run `pnpm run docs:check`.
- Run `git diff --check`.
- Run a manual drift grep across `docs/`, `AGENTS.md`, scoped `AGENTS.md` files,
  and `.agents/skills/` for removed-scope terms: audio/listen, marks/tags/review
  and edges as product promises, share/export/import/sync/accounts/community,
  streaks, reflection prompts, AI assistant/chat/agent/synthesis, qira'at beyond
  Hafs/Qalun/Warsh, runtime SHA verification, transliteration display,
  word-by-word translation, and tajweed coloring.
- Any remaining hit must be either implementation inventory, cleanup debt,
  runtime key documentation, future AI/retrieval infrastructure, future personal
  layer context, or explicitly removed scope.
- Do not hand-edit auto-generated fence blocks.

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
