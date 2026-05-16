# Src Reader First Refactor Design

## Goal

Refactor `src/` so the shipped application matches the current Reader First
product roadmap. The target outcome is a codebase where active v1 product
surfaces are clear, removed-scope product branches are deleted early, and the
remaining shared logic is organized around the real product invariants:
install-before-activate packs, reading continuity, curated metadata attached to
reading, and reliable Verse/Mushaf navigation.

This spec defines the target architecture, migration boundaries, phase order,
ownership rules, and acceptance criteria for the refactor. It does not yet
specify file-by-file tasks; that will come in the implementation plan.

## Product Alignment Summary

The source of truth for this refactor is the current Reader First product
documentation:

- `docs/product-info.md`
- `docs/context/roadmap.md`
- `docs/context/future.md`
- `docs/context/implemented.md`

Those docs establish the following current-state expectations:

- Active product surfaces are `read`, `navigate`, `configure`, `onboard`, and
  supporting infra/data/core layers.
- Verse and Mushaf reading are central v1 experiences.
- Bookmarks, saved reading position, and Daily Wird are reading-continuity
  features.
- One pack is active per asset type, optional packs install before activation,
  and the app must not silently fall back behind an unavailable selection.
- Search is a v1 reader path over Arabic text, translations,
  transliteration/index data, tafsir, and curated metadata, with result-to-reader
  handoff.
- Curated metadata belongs inside reading, search, and navigation flows rather
  than as a separate study branch, and it must stay source-backed and
  provenance-aware.
- Audio, personal marks/tags/review, and related user-facing branches are
  removed from current product scope.
- Streaks, standalone khatm tracking, copy/share/export/import, user-facing
  sync, accounts, community, shared collections, transliteration display,
  word-by-word translation, tajweed coloring, reflection prompts, and
  synthesis-style AI UI remain out of current scope.

The current `src/` tree still contains removed-scope product areas, especially
`src/listen/`, `src/mark/`, and `src/review/`, plus legacy references inside
active surfaces. This refactor exists to close that gap.

## Design Principles

### Reader First product truth

The codebase should make the current product roadmap feel obvious. A newcomer
reading `src/` should be able to tell that QuranAtlas is an offline-first Qur'an
reader with Verse/Mushaf reading, pack-driven sources, continuity features, and
reader-attached metadata.

### Surfaces stay legible

Top-level product surfaces should remain the main user-facing units:

- `read`
- `navigate`
- `configure`
- `onboard`

These directories should still be the clearest places to understand the app's
primary experiences.

### Shared invariants move into explicit domains

Cross-cutting product rules should not be reimplemented inside multiple
surfaces. The refactor should extract explicit shared domains for the roadmap
areas that now drive product correctness.

### Delete removed scope early

Legacy product branches should not be preserved as if they are still part of
the roadmap. Visible and reachable removed-scope behavior should be removed
early, then their internal scaffolding should be deleted once active surfaces no
longer depend on it.

### Acceptance is behavioral, not cosmetic

Success is measured by product alignment and clearer ownership, not by folder
movement alone. A file move that does not improve ownership or remove product
ambiguity is not useful refactor progress.

## Target Architecture

### Top-level shape

The refactored `src/` should continue to present product surfaces clearly while
introducing a small number of strong shared domains:

- surface ownership:
  - `src/read`
  - `src/navigate`
  - `src/configure`
  - `src/onboard`
- cross-cutting runtime and infra:
  - `src/core`
  - `src/data`
  - `src/infra`
- new or strengthened product domains:
  - `src/packs`
  - `src/continuity`
  - `src/metadata`
  - `src/search` or a search contract owned by `navigate`
  - `src/reader-nav` or equivalent navigation domain folded into `navigate`

Exact folder names can change in planning if a better local fit emerges, but
the ownership boundaries should stay the same. New top-level domains must earn
their own directories: they should have multiple active callers or remove
duplicated policy that would otherwise keep leaking across surfaces. If any of
these become new top-level directories, the implementation plan must also make
them first-class documented ownership units with context docs, test ownership,
and docs-generation support. If that overhead is not justified, they should be
folded into existing layers such as `src/data`, `src/infra`, `src/read`, or
`src/navigate`.

### Surface responsibilities

#### `read`

`read` should own rendering and reader interaction for Verse and Mushaf modes:

- Verse reader rendering
- Mushaf reader rendering
- mode-specific reader controls
- tafsir and curated metadata presentation inside reading
- reader interaction patterns such as scroll behavior, swap behavior, and mode
  switching hooks

`read` should not own source-pack validity rules, install-state policy, or
continuity persistence policy.

#### `navigate`

`navigate` should own user entry into reading and movement between reading
targets:

- Surah and Juz entry points
- bookmarks entry and jump behavior
- command/navigation UI
- reader route entry and route-aware movement
- search entry points and result-to-reader handoff

`navigate` should not own the business rules for pack activation or metadata
loading contracts. If search stays under `navigate` initially, `navigate` owns
search UI, query entry, and result handoff, while `packs` and `metadata` own the
asset-state and data-contract decisions behind those results.

#### `configure`

`configure` should own settings and management UI for active-scope reader
options:

- themes and reading preferences
- active pack selection UI
- storage/install UI
- current-scope reader settings

`configure` should consume shared domain APIs instead of implementing fallback
or validation policy itself. Settings pack controls and storage/install controls
must use the same pack-state contract as reader boot and onboarding.

#### `onboard`

`onboard` should become a narrow first-run setup flow for current-scope product
decisions only:

- welcome/orientation
- theme
- riwayah selection
- translation selection where applicable
- first-run guidance for current reader features

Legacy onboarding content for removed-scope product branches should be deleted.
Riwayah and source choices in onboarding must use the same pack-state contract
as Settings, so uninstalled optional packs are shown as installable or
unavailable rather than failing silently.

### Shared domain responsibilities

#### `packs`

This domain should become the authoritative home for source-pack behavior:

- one-active-pack-per-type rules
- install-before-activate behavior
- pack verification and install-state checks
- baseline fallback policy
- availability versus usability state
- active pack resolution for riwayah, translation, tafsir, curated metadata,
  Mushaf pages, and search/index assets where needed

This is the most important extraction because the roadmap now depends on pack
correctness across multiple surfaces.

The domain should expose typed pack outcomes instead of boolean success or
implicit fallback. The implementation plan should define exact names and should
reuse existing states where they already fit. The minimum semantic outcomes are:

- `usable`: the selected pack is locally verified and can render
- `installable`: the pack is available but not yet locally usable
- `missing`: required local files are absent, when the asset type can detect
  file-level absence
- `stale`: local files or manifest membership do not match the required version,
  when the asset type has version/member checks
- `unavailable`: the pack cannot currently be installed or used
- `switched-to-baseline`: the app explicitly changed active selection to a
  verified baseline before rendering baseline content, where the asset type has
  an approved baseline transition

The boundary should separate policy from mechanics:

- `packs` owns selected-pack usability, activation decisions, and result states.
- `src/data` owns runtime dataset fetch contracts.
- `src/data/offline.ts` and `src/infra` own cache/install mechanics and service
  worker behavior.
- `configure` and `onboard` own UI over the pack-state contract.

Existing silent fallback behavior must be removed as pack APIs are introduced.
The app must never render a verified baseline while the UI still labels an
unavailable pack as active.

#### `continuity`

This domain should own reading continuity behavior:

- bookmarks
- saved reading position
- recent-surah behavior if still used
- Daily Wird state, progress, and reminder ownership
- resume-reading rules

These features belong together because they serve the same product promise:
continuity in reading, not general user annotation. Daily Wird remains
reader-continuity only; it must not grow into streaks, standalone khatm
tracking, accounts, social reminders, or user-facing sync.

The continuity domain should initially own pure persistence/domain APIs and
route handoff rules. UI components can remain in their active surfaces unless a
move clearly simplifies ownership. Any extraction must preserve the repo's
one-writer-per-store and one-writer-per-settings-key invariants.

#### `metadata`

This domain should own curated metadata contracts and loading:

- tafsir data access contracts
- verse themes
- short meanings or summaries
- passage grouping/context
- Makki/Madani
- revelation/asbab metadata
- juz/hizb/rub/ruku/page metadata where used by reading or navigation

Optional metadata should remain additive. Reader boot must stay healthy when
optional metadata is absent.

Metadata contracts must be runtime-only and source-backed. App code should
consume built `/dataset/**` outputs and must not import build-only `data/**`
inputs. Provenance, source attribution, and build-time validation remain
required guardrails for metadata that appears in reading, navigation, or search.
Scholarly claims datasets remain future infrastructure unless sourcing and
review rules are separately approved.

#### `search`

Search is a v1 reader path and needs a protected contract even if the full
implementation lands in later work. This refactor should decide an interim
owner, remove removed-scope search results, and preserve query-to-result-to-reader
handoff. It should not attempt to implement the full multi-source search/index
architecture unless that work is separately planned.

The search contract should cover:

- Arabic Qur'an text
- translations
- transliteration/index data
- tafsir
- curated metadata
- result-to-reader handoff
- search/index asset install-state and pack compatibility

Search UI can live in `navigate`, but search/index pack usability should follow
the same install-before-activate model as other source assets.

#### `reader-nav`

If navigation logic around reading targets is currently too tangled between
`read` and `navigate`, a focused shared domain can own:

- reader mode switching between Verse and Mushaf
- reading-target route normalization
- reader jump semantics
- page/surah/ayah target interpretation

If the repo structure shows this can live cleanly inside `navigate` without new
abstraction overhead, the plan may keep it there. The key requirement is clear
ownership, not the extra folder.

## Removed Scope Strategy

The following product branches should be treated as deletion targets, not as
supported features:

- `listen`
- `mark`
- `review`

This includes both obvious directories and all reachable product affordances
that keep those branches alive:

- routes
- overlays and bridge modules
- command-sheet results or shortcuts
- navigation tabs and drawer entries
- settings entries and storage affordances
- onboarding copy
- CSS surfaces
- event topics and sync channels
- IDB stores and write validation that exist only for removed-scope branches

Legacy code should not be preserved simply because it exists. If a piece of
infrastructure still serves active Reader First scope, keep it and sever the
legacy-specific behavior. Otherwise, delete it.

Removed-scope deletion must start by severing active dependencies. Current
reader behavior may still rely on helpers that live in removed-scope modules,
such as verse tap gestures, bookmark coordination, route restoration, boot
listeners, or overlay wiring. Those active behaviors should move into active
ownership before the removed directories are deleted.

The route-removal plan must include a removed-route matrix for:

- `#/review`
- exact legacy layer routes, enumerated by slug rather than a broad
  `#/<layer>/:value` pattern
- `#/threads/*`
- drawer links
- command-sheet entries
- keyboard shortcuts
- persisted `settings.lastSurface`

For each entry, the plan should state whether the route redirects to an active
reader destination, lands on the not-found card, or is stripped from reachable
UI entirely.

The same plan must include an active-route preserve list so cleanup does not
accidentally catch Reader First routes. At minimum this includes:

- `#/s/:surah`
- `#/s/:surah/:ayah`
- `#/m/:page`
- `#/surahs`
- `#/bookmarks`
- Juz navigation routes or drawer states
- search result routes or handoffs
- valid launch-restore destinations

Persisted route cleanup also needs a `settings.lastSurface` normalization
policy for removed destinations such as `#/review`, `#/threads/*`, and legacy
layer routes before those routes are deleted.

## Migration Phases

### Phase 0: Current-state sync and characterization

Before deleting or moving source, capture the current active Reader First
behavior that must survive the refactor.

Primary outcomes:

- generated context docs are current enough to guide implementation
- active hooks currently living in removed-scope modules are inventoried
- bookmark, saved-position, Daily Wird, Verse/Mushaf, onboarding, and
  pack-selection behavior have targeted characterization coverage where needed
- known docs/source drift that would mislead implementation is corrected or
  explicitly listed in the implementation plan
- current `pnpm run check` / `pnpm run validate` blockers are identified, and
  either restored to green or listed as explicit preconditions before later
  phase gates rely on them
- store inventory is reconciled from `src/core/db/migrations.js`,
  `src/core/db/validate.ts`, `src/core/db/types.ts`, generated context docs, and
  all known store readers/writers before storage planning starts
- Daily Wird inventory is reconciled: the implementation plan must state whether
  existing `src/read/wird` logic remains behind a continuity adapter or moves
  into a continuity domain while preserving the sole writer for `wirdPlan`

### Phase 1a: Sever active dependencies from removed scope

Move active reader behavior out of removed-scope modules before removing visible
legacy features.

Primary outcomes:

- verse tap and double-tap behavior used for active tafsir/reader interactions
  is owned by `read` or another active layer
- bookmark toggle coordination no longer imports mark/tag state
- boot no longer initializes removed-scope audio, mark, or review listeners for
  active reader behavior
- active Verse/Mushaf reader boot, tafsir gestures, and bookmark toggles still
  pass targeted tests

### Phase 1b: Product-scope cleanup

Remove visible and reachable removed-scope behavior first.

Primary outcomes:

- no user-facing audio, mark, or review surface remains reachable
- no active navigation or command affordance points into removed scope
- other out-of-current-scope affordances, including copy/share/export/import,
  are removed or explicitly reclassified before they remain visible
- onboarding no longer introduces removed-scope concepts
- settings and storage UI no longer imply support for removed-scope packs or
  features

This phase may temporarily leave some unused internals in place if active-scope
cleanup is still in progress, but the running app should already reflect the
current product roadmap. Its exit criteria must include proof that Verse,
Mushaf, search entry, bookmarks, saved position, onboarding, and configuration
flows still work.

### Phase 2: Domain extraction

Introduce or strengthen the shared domains that carry Reader First invariants.

Primary outcomes:

- pack rules are owned in one place
- continuity ownership is separated from reader rendering
- curated metadata contracts are explicit
- search interim ownership and contract are resolved before metadata or pack API
  extraction changes search inputs
- surfaces depend on domain APIs rather than reimplementing policies

This phase should prefer narrow adapters and incremental extraction over a
whole-codebase rewrite.

### Phase 3: Surface simplification

Refocus active surfaces around their intended roles after domain boundaries are
available.

Primary outcomes:

- `read` is primarily reader rendering and interaction
- `navigate` is primarily reader entry and movement
- `configure` is UI over settings and pack-management domains
- `onboard` is current-scope first-run setup only

This phase is where deep file movement and simplification should happen, because
the target contracts already exist.

### Phase 4: Infra and dead-code cleanup

Delete leftover internal scaffolding once active surfaces no longer rely on it.

Primary outcomes:

- removed-scope stores are deleted from IndexedDB contracts and migrations
  through a named storage migration task
- removed-scope sync topics, event constants, and helpers are gone
- active code has no remaining tag, audio, mark, or review support helpers
  outside the removed top-level directories unless they are deliberately
  reclassified as Reader First infrastructure
- dead CSS, overlays, bridges, and helper modules are removed
- current docs reflect the final ownership model

Store deletion must be explicit. The implementation plan should define the
before/after storage contract, DB version decision, `deleteObjectStore` order,
type and validation cleanup, fixture updates, generated-doc regeneration, and
whether data loss is acceptable under the repo's pre-release posture.

## Ownership Rules

The refactor should follow these rules consistently:

- surfaces render and orchestrate user flows
- shared domains own product invariants
- infra stays generic and reusable
- data loaders expose runtime data contracts, not UI policy

Applied examples:

- `read` should not decide whether a selected pack is valid
- `configure` should not implement activation fallback rules
- `onboard` should not duplicate pack availability logic
- `navigate` should not hardcode metadata loading policy
- `metadata` should not become a separate user-facing product branch
- `search` should not bypass pack-state or metadata contracts to make an
  uninstalled source appear searchable

## Data Flow Rules

Three data-flow paths should become explicit.

### Runtime source assets

Where roadmap rules matter, surfaces should consume pack/domain APIs rather than
reading source availability ad hoc. Active-source resolution, install-state
checks, and fallback rules belong to shared domain code.

Pack-state APIs should be tested with per-asset vectors for riwayah,
translation, tafsir, curated metadata, Mushaf pages, and search/index assets:
usable, installable, unavailable, and any asset-specific missing, stale, or
explicit baseline-switch states defined in the implementation plan.

### Continuity state

Bookmarks, saved position, Daily Wird, and resume-reading behavior should flow
through a dedicated continuity domain, then into active surfaces.

### Optional metadata enrichment

Curated metadata should flow into reading and navigation as optional enrichment.
Its absence should remove or disable enhancement UI rather than destabilize core
reading. Metadata used in search should carry the same provenance and optional
failure semantics as metadata shown in the reader.

## Failure Handling Rules

The refactor should preserve the product promise under failure.

- if an optional pack is missing, stale, or unavailable, the app should show an
  explicit unavailable/install/switch state
- the app must not silently render a verified baseline while keeping an
  unavailable pack selected in UI state
- fallback is valid only as an explicit state transition: the app either shows
  unavailable/install/switch UI or updates the active setting to a verified
  baseline before rendering baseline content
- if optional metadata is unavailable, the reader should remain usable and the
  enhancement UI should become absent or unavailable
- baseline readable Qur'an text should remain the stability anchor wherever the
  baseline pack is valid
- removed-scope failures should disappear because the removed-scope code paths
  are deleted rather than maintained

## Testing And Verification Strategy

Verification should track the migration phases rather than wait for a final
big-bang pass.

### Phase exit gates

Each implementation phase should name exact commands and owning tests before
work starts. The minimum gates are:

| Phase | Verification gate |
| --- | --- |
| Phase 0 | `pnpm run docs:check`, `git diff --check`, current `pnpm run check` / `pnpm run validate` blockers inventoried or resolved, targeted characterization tests added for touched behavior |
| Phase 1a | targeted Vitest for reader boot, tafsir tap/double-tap behavior, bookmark toggles, and any moved helper modules; import/dependency guard proving active surfaces no longer depend on `listen`, `mark`, or `review` except explicit cleanup shims; `pnpm run check` once Phase 0 has restored that gate |
| Phase 1b | targeted route/unit tests for removed routes, active-route preservation, and `settings.lastSurface` normalization; selected Playwright restore/navigation coverage for removed routes and active reader landing; `pnpm run check` once Phase 0 has restored that gate |
| Phase 2 | targeted pack, continuity, metadata, and search contract tests; `pnpm run check`; `pnpm run docs:check` when ownership docs change |
| Phase 3 | targeted reader, navigation, configure, and onboarding tests for affected flows; selected Playwright specs for Verse/Mushaf/bookmark/onboarding journeys; `pnpm run check` |
| Phase 4 | DB migration/validation/type tests, sync-topic tests, generated docs via `pnpm run docs` when inventories change, `pnpm run validate`, and selected Playwright coverage for launch/restore |

`pnpm run validate` is not a substitute for selected Playwright e2e coverage.
The implementation plan should list the exact `pnpm run test -- <file>` and
`pnpm run test:e2e -- <spec>` commands that prove each phase.

## Acceptance Criteria

The refactor is successful when the following statements are true:

- the running product exposes only current Reader First scope
- removed-scope audio, mark, and review branches are no longer reachable
- no active entrypoint imports from `src/listen`, `src/mark`, or `src/review`
- no drawer, command-sheet, onboarding, settings, or shortcut affordance points
  to removed-scope features
- active top-level surfaces are easy to map to the product docs
- core Reader First journeys still work: Surah/Juz navigation, Verse/Mushaf
  switching, page navigation, reading preferences, Daily Wird continue/progress,
  saved-position restore, bookmarks, and search result landing
- pack activation/install behavior is owned consistently across the app
- no surface-local duplicate pack fallback logic remains
- search has an explicit interim owner, removed-scope results are gone, and
  query-to-result-to-reader handoff still works
- continuity behavior has a clear home separate from rendering concerns
- curated metadata is attached to reading/navigation rather than floating as a
  separate product branch
- deleted legacy code is not replaced by new scattered copies of the same
  policy
- docs and source ownership agree again

## Non-Goals

This refactor should not expand the roadmap. It is not an excuse to add:

- new AI/chat/agent features
- new personal annotation systems
- audio restoration
- copy/share/export/import, accounts, community, shared collections, or
  user-facing sync
- streaks or standalone khatm tracking
- transliteration display, word-by-word translation, or tajweed coloring
- reflection prompts
- AI assistant, chat, agent, synthesis UI, or answer-generation UI
- multiple simultaneous translations
- qira'at beyond Hafs, Qalun, and Warsh

It should also avoid unnecessary abstraction. Only extract shared domains where
the roadmap now depends on shared invariants.

## Open Planning Questions To Resolve In The Implementation Plan

The next planning step should make explicit decisions about:

- exact target folder/module names for the shared domains, including whether new
  top-level domains have enough active callers or duplicated policy to justify
  their documentation/test ownership overhead
- the Phase 0 drift ledger, including docs/source/test drift, current check
  blockers, Daily Wird inventory, and store ownership mismatches
- the active-dependency severing order for tap gestures, bookmark coordination,
  boot listeners, overlays, and route restore behavior
- the removed-route matrix, active-route preserve list, and expected
  redirect/not-found/normalization behavior for every removed-scope route,
  shortcut, command result, drawer link, and persisted surface
- the explicit storage migration plan for removed stores, DB versioning,
  validation/types, sync topics, fixtures, and generated docs
- which current files migrate into `packs`, `continuity`, `metadata`, and the
  search contract, with full multi-source search/index implementation deferred
  unless separately planned
- whether `reader-nav` deserves its own folder or should stay inside `navigate`
- the exact verification commands and targeted test files for each migration
  phase

Those are implementation-planning questions, not design blockers.
