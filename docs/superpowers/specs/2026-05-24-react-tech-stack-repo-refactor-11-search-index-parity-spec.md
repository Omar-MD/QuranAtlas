# React Tech Stack Refactor 11 - Search And Index Parity Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-09-reader-surface-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-10-navigation-settings-onboarding-parity-spec.md`

## Purpose

Build full-text search and index parity for the React app across Arabic Quran
text, translations, transliteration or index data where shipped, tafsir, and
curated metadata extension hooks. Search must be offline-first,
install-before-activate, and explicit about missing or unavailable indexes.
Child spec `12` owns adding the approved curated metadata corpus/index content
to the search framework unless this spec implements those adapters first.

## Current Docs Requirement

No external search engine or indexing library is selected by this spec. Before
choosing or configuring any search/index package, worker API, compression
library, OPFS path, or tokenizer library, fetch current docs through Context7
using the repo workflow (`library` then `docs`). If implementation stays
project-owned with no new external API, document that decision in the plan.

## Scope

In scope:

- Define the search corpus lanes and index artifacts.
- Define install-before-activate for search/index packs.
- Build search UI entry points and results display.
- Search across in-scope sources that are shipped and verified usable.
- Expose explicit unavailable, missing, stale, indexing, offline, and no-results
  states.
- Preserve runtime boundary: browser consumes only same-origin `/dataset/**`.
- Add golden proof for search results and search-index unavailable states.

Out of scope:

- AI semantic search, assistant, chat, or synthesis UI.
- User-generated notes/tags/comments search.
- Multiple translations side by side.
- Runtime fetches from upstream providers.
- Search over uninstalled optional packs as if they were locally available.

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/product-info.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `08`, `09`, and `10`

## Allowed Files And Directories

Allowed create:

- `src-react/search/**`
- `src-react/components/search/**`
- `src-react/app/routes/search/**`
- `src-react/offline/search/**`
- `scripts/data/search/**` only if search-index build output is introduced
- `public/dataset/search/**` only through dataset build scripts, not hand edits
- `docs/context/surfaces/search.md` only if this spec creates a new top-level
  search e2e surface.
- Unit tests under `tests/unit/**`
- E2E tests under `tests/e2e/navigate/**`, `tests/e2e/read/**`, or a new
  `tests/e2e/search/**` only if a new search surface dossier is also created

Allowed modify:

- Dataset builders and source-data docs if search index artifacts are added.
- Manifest inventory and route definitions for search index assets.
- Asset Management route for search/index pack install state.
- Component registry and page recipes for search UI.
- Continuity/route docs when a new `#/search` route or search overlay affects
  launch restore or `lastSurface`.

Forbidden modify:

- Hand-editing generated `public/dataset/**`.
- Fetching upstream search data at runtime.
- Reviving removed mark/review/listen branches.
- Claiming parity if search/index is deferred without updating product docs and
  parity gates.

## Search Corpus Contract

The search corpus may include only verified local assets:

- active Arabic Quran text;
- installed translations;
- installed tafsir;
- curated metadata packs;
- transliteration or index data where shipped;
- navigation metadata such as surah names and references.

Search results must identify source lane, reference, snippet, match reason, and
pack availability. If a selected source pack is unavailable, the UI must say so
instead of silently searching a different baseline pack.

Translation search must preserve the existing Hafs-keyed translation alignment
contract. Index artifacts or result adapters must store the source Hafs
reference and resolve the active-riwayah display/navigation reference through
the same `_verse-aliases.json` roles used by Reader: identity, merged, primary,
continuation, and none. Tests must cover Hafs, Warsh, and Qalun (`qaloon`),
including DP-aligned surahs 7, 27, 36, 40, 41, 56, and 57.

If curated metadata lanes are not implemented until child spec `12`, this spec
must create the search corpus extension contract, unavailable state, and tests
that prove adding metadata later cannot search unavailable packs as if installed.

## Index Pack Contract

Search/index packs must follow child spec `08`:

- planned from same-origin indexes or manifest inventory;
- installed before activation;
- verified before search uses them;
- status separated from active source selection;
- removable only when not required by the active search configuration;
- unavailable offline state when the index is not installed and network cannot
  fetch it.

Large non-URL index artifacts may use OPFS only after a documented decision
appendix proves Cache Storage is insufficient.

This spec must choose and document the search index URL schema before
implementation. Acceptable shapes include a versioned pack manifest plus shards,
for example:

```text
/dataset/search/{packId}/manifest.json
/dataset/search/{packId}/shards/{shardId}.json
```

or a deliberately retained single-file index such as
`/dataset/search-index.json`. The chosen schema must update manifest inventory,
service-worker route matching, cache names, install plans, and tests in the same
change.

## UI Contract

Search UI must support:

- focused query entry with clear button;
- keyboard submit and result navigation;
- loading/indexing state;
- no-results state;
- unavailable index state with install/manage-assets action;
- source filters only for installed/usable source classes;
- result rows that navigate to reader routes;
- match snippets that do not corrupt Arabic directionality;
- accessible names and status announcements.

Search entry points may appear in navigation, reader, or command surfaces only
after this spec defines their route and state ownership.

## Deliverables

- Search corpus and index-pack contract for Arabic text, translations, tafsir,
  curated metadata hooks, and shipped index data.
- React search UI, state ownership, and route or overlay entry-point definition.
- Search/index asset-pack install, verification, unavailable, stale, offline,
  and no-results states.
- Dataset builder, manifest, route-definition, and source-data docs updates if
  new search index artifacts are introduced.
- Unit/component tests, Storybook stories, registry entries, golden routes, and
  visual proof for result and unavailable-index states.

## Acceptance Criteria

- Search cannot run against unverified or unavailable index packs.
- Search results reference correct Quran locations and source lanes.
- Offline search works only when required index packs are installed.
- Missing search/index packs show explicit unavailable/install states.
- Search result navigation preserves reader route contract.
- Translation search references use `_verse-aliases.json` for Warsh and Qalun
  (`qaloon`) result display/navigation.
- Search index build/runtime boundaries are documented and checked.
- Search index URL schema, manifest membership, service-worker route matching,
  and cache naming are defined before UI consumes indexes.
- Product docs are updated if search is intentionally deferred before parity.

## Verification

Run targeted search unit tests and dataset checks when index builders change:

```bash
pnpm run test:react -- tests/unit/search
pnpm run docs:check
git diff --check
```

If dataset/search index output changes, run:

```bash
pnpm run data -- check
```

If app runtime, route, or offline behavior changes, also run:

```bash
pnpm run check
pnpm run check:react
pnpm run build:react
pnpm run test:e2e:react -- tests/e2e/read tests/e2e/navigate --reporter=line
```

Expected result:

- Search/index unit tests pass.
- Data checks pass for generated index artifacts.
- Search golden routes cover result and unavailable-index states.
- Docs checks are clean.

## Rollback And Failure Handling

- If selected index technology cannot work offline deterministically, stop and
  choose a simpler local index strategy.
- If index artifacts bloat baseline install beyond product budget, move them to
  optional install-before-activate packs.
- If search relevance is not ready for parity, update product and parity docs
  before deferring it.

## Handoff

Child specs `12` and `15` must include curated metadata and golden route search
proof where search consumes those lanes. Cutover readiness cannot claim search
parity unless this spec is complete or product docs explicitly defer search.
