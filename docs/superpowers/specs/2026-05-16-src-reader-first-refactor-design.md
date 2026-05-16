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
- Curated metadata belongs inside reading, search, and navigation flows rather
  than as a separate study branch.
- Audio, personal marks/tags/review, and related user-facing branches are
  removed from current product scope.

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
  - `src/reader-nav` or equivalent navigation domain folded into `navigate`

Exact folder names can change in planning if a better local fit emerges, but
the ownership boundaries should stay the same.

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
loading contracts.

#### `configure`

`configure` should own settings and management UI for active-scope reader
options:

- themes and reading preferences
- active pack selection UI
- storage/install UI
- current-scope reader settings

`configure` should consume shared domain APIs instead of implementing fallback
or validation policy itself.

#### `onboard`

`onboard` should become a narrow first-run setup flow for current-scope product
decisions only:

- welcome/orientation
- theme
- riwayah selection
- translation selection where applicable
- first-run guidance for current reader features

Legacy onboarding content for removed-scope product branches should be deleted.

### Shared domain responsibilities

#### `packs`

This domain should become the authoritative home for source-pack behavior:

- one-active-pack-per-type rules
- install-before-activate behavior
- pack verification and install-state checks
- baseline fallback policy
- availability versus usability state
- active pack resolution for riwayah, translation, tafsir, curated metadata,
  Mushaf pages, and later search assets where needed

This is the most important extraction because the roadmap now depends on pack
correctness across multiple surfaces.

#### `continuity`

This domain should own reading continuity behavior:

- bookmarks
- saved reading position
- recent-surah behavior if still used
- Daily Wird state, progress, and reminder ownership
- resume-reading rules

These features belong together because they serve the same product promise:
continuity in reading, not general user annotation.

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

## Migration Phases

### Phase 1: Product-scope cleanup

Remove visible and reachable removed-scope behavior first.

Primary outcomes:

- no user-facing audio, mark, or review surface remains reachable
- no active navigation or command affordance points into removed scope
- onboarding no longer introduces removed-scope concepts
- settings and storage UI no longer imply support for removed-scope packs or
  features

This phase may temporarily leave some unused internals in place if active-scope
cleanup is still in progress, but the running app should already reflect the
current product roadmap.

### Phase 2: Domain extraction

Introduce or strengthen the shared domains that carry Reader First invariants.

Primary outcomes:

- pack rules are owned in one place
- continuity ownership is separated from reader rendering
- curated metadata contracts are explicit
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

- removed-scope stores are deleted from IndexedDB contracts and migrations where
  appropriate
- removed-scope sync topics, event constants, and helpers are gone
- dead CSS, overlays, bridges, and helper modules are removed
- current docs reflect the final ownership model

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

## Data Flow Rules

Three data-flow paths should become explicit.

### Runtime source assets

Where roadmap rules matter, surfaces should consume pack/domain APIs rather than
reading source availability ad hoc. Active-source resolution, install-state
checks, and fallback rules belong to shared domain code.

### Continuity state

Bookmarks, saved position, Daily Wird, and resume-reading behavior should flow
through a dedicated continuity domain, then into active surfaces.

### Optional metadata enrichment

Curated metadata should flow into reading and navigation as optional enrichment.
Its absence should remove or disable enhancement UI rather than destabilize core
reading.

## Failure Handling Rules

The refactor should preserve the product promise under failure.

- if an optional pack is missing, stale, or unavailable, the app should show an
  explicit unavailable/install/switch state
- the app must not silently render a verified baseline while keeping an
  unavailable pack selected in UI state
- if optional metadata is unavailable, the reader should remain usable and the
  enhancement UI should become absent or unavailable
- baseline readable Qur'an text should remain the stability anchor wherever the
  baseline pack is valid
- removed-scope failures should disappear because the removed-scope code paths
  are deleted rather than maintained

## Testing And Verification Strategy

Verification should track the migration phases rather than wait for a final
big-bang pass.

### Cleanup phases

Verify:

- removed routes are unreachable
- removed navigation and command affordances are gone
- onboarding and settings no longer reference removed-scope features

### Domain extraction phases

Verify:

- pack activation and install-state behavior
- baseline fallback behavior
- continuity persistence behavior
- metadata-loading contracts and optional failure handling

These should lean heavily on targeted unit coverage.

### Surface simplification phases

Verify:

- Verse and Mushaf reading journeys
- mode switching
- bookmarks and saved position
- Daily Wird continuity behavior
- onboarding and configuration flows affected by extracted domains

### Final integration verification

Once shared behavior and infra have shifted enough, run the broader project
gates required by repo policy for the touched surfaces and shared modules.

## Acceptance Criteria

The refactor is successful when the following statements are true:

- the running product exposes only current Reader First scope
- removed-scope audio, mark, and review branches are no longer reachable
- active top-level surfaces are easy to map to the product docs
- pack activation/install behavior is owned consistently across the app
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
- multiple simultaneous translations
- qira'at beyond Hafs, Qalun, and Warsh

It should also avoid unnecessary abstraction. Only extract shared domains where
the roadmap now depends on shared invariants.

## Open Planning Questions To Resolve In The Implementation Plan

The next planning step should make explicit decisions about:

- exact target folder/module names for the shared domains
- the safest order for deleting removed-scope routes, overlays, and stores
- which current files migrate into `packs`, `continuity`, and `metadata`
- whether search contracts belong under `navigate`, `packs`, or a small
  separate search domain
- whether `reader-nav` deserves its own folder or should stay inside
  `navigate`
- which verification commands and targeted test files map to each migration
  phase

Those are implementation-planning questions, not design blockers.
