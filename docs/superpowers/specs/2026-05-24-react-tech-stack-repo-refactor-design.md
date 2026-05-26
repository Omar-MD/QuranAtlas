# React Tech Stack And Repo Refactor Master Spec

## Purpose

This is the north-star control document for rebuilding QuranAtlas as a
React + Vite offline PWA while preserving the current Svelte app as the live
reference until React reaches v1 product promise parity.

The spec exists to constrain agentic implementation. It defines the target
stack, repository boundaries, design-system contract, offline architecture,
verification gates, child-spec sequence, and cutover rules. Child specs may
refine implementation details after current documentation is verified, but they
must update this master spec if they discover a decision here is wrong.

## Decision Summary

- Target app stack: React + TypeScript + Vite PWA.
- Migration strategy: parallel rebuild in `src-react`.
- Current Svelte app status: canonical shipped app and behavioral/visual
  reference until React parity gates pass.
- Parity target: v1 product promise parity, not historical implementation
  parity.
- Styling strategy: Tailwind v4 inside owned design-system and product
  components only.
- Component strategy: copied-owned shadcn/ui-style components with Radix
  behavior primitives.
- Reader performance strategy: TanStack Virtual where large reader surfaces need
  virtualization.
- Storage strategy: Dexie over the existing `quran-atlas` IndexedDB contract
  during dual-build, Cache Storage for URL-addressed app and dataset assets,
  and OPFS only where a child spec proves a non-URL binary/index access need.
- Offline strategy: Workbox / VitePWA with explicit app-shell precache and
  user-triggered reader asset packs.
- Verification strategy: Storybook for component and product-pattern proof;
  Playwright golden routes for app-level parity, responsive behavior, keyboard
  and focus journeys, and offline/service-worker journeys.
- Visual regression strategy: provider-neutral gate at the master level, with a
  blocker child spec to select and wire the provider.

## Authority

This master spec is authoritative over the React rebuild child specs. If a child
spec conflicts with this document, the child spec must either be corrected or
update this document in the same change with a clear current-state rationale.

This document does not change the current shipped stack by itself. The current
stack remains documented in `docs/tech-stack.md` until package scripts,
dependencies, build targets, or CI gates actually change.

## Required Current-Docs Verification

Before child implementation specs lock API, config, or CLI details, they must
verify current official documentation through the repo Context7 workflow:

```bash
npx ctx7@latest library <official-name> "<full question>"
npx ctx7@latest docs <library-id> "<full question>"
```

The verification applies at minimum to:

- React
- Vite
- vite-plugin-pwa / Workbox
- Tailwind CSS v4
- Radix UI
- shadcn/ui component ownership workflow
- TanStack Virtual
- Dexie
- Storybook
- Playwright
- the selected visual regression provider

The master spec records product and architecture intent. It is not an API
reference.

Child specs must use Context7 first for library, framework, SDK, API, CLI, or
cloud-service details. If Context7 is quota-blocked, the child spec must record
that failure and stop until the user can authenticate or provide a higher-limit
key. If Context7 lacks coverage or is otherwise unavailable after the required
retry, the child spec must record the failure and the official-doc fallback
source in its decision appendix; it must not silently answer from memory.

## Product Scope

The React rebuild targets v1 product promise parity.

In scope:

- Reader First app shell.
- Verse reader.
- Mushaf reader.
- Reader continuity and bookmarks.
- Daily Wird.
- Navigation: Surah, Juz, bookmarks, and reader mode switching.
- Settings: theme, typography, sources, storage, and reader comfort controls.
- Onboarding.
- Offline-first asset lifecycle.
- Qira'ah/riwayah packs: Hafs, Qalun, and Warsh.
- One active translation, one active tafsir, and one active curated metadata
  pack.
- Full-text search across Arabic Qur'an text, translations, transliteration or
  index data where shipped, tafsir, and curated metadata, with install-before-
  activate search/index packs.
- Service worker, install, update, and offline flows.
- IndexedDB persistence model.
- Design system, component registry, and page recipes.
- Storybook, golden screens, accessibility gates, visual regression gates, and
  agent-facing workflow docs.

Out of scope for the React parity target:

- Removed mark, review, and listen product branches.
- Audio playback.
- Personal notes, tags, comments, review, and edges, except bookmarks.
- Accounts, user-facing sync, community, import, or export.
- AI assistant, chat, synthesis UI, or reflection-prompt product branches.
- Multiple translations side by side.
- Qira'at beyond Hafs, Qalun, and Warsh.
- Display transliteration as a reader-visible text lane, word-by-word
  translation, and tajweed coloring.

Removed-scope branches must not be rebuilt into `src-react`. If any legacy
audio/listen, marks/tags/notes/review/edges remnants are discovered, treat them
only as cleanup or regression context and reconcile `docs/context/implemented.md`
if code and docs disagree.

Product/data invariants:

- Product prose uses Qalun; runtime ids and existing paths use `qaloon`.
  Qalun and `qaloon` must not become separate packs.
- The active reader asset bundle is atomic: `settings.riwayah`,
  `settings.quranTextStyleId`, and `settings.mushafEditionId` change together
  through the owning settings writer. This is a text/Mushaf asset bundle, not
  audio or playback scope.
- Hafs and Warsh become usable only after compatible text and Mushaf assets
  verify locally; missing optional assets must show an install/unavailable/switch
  state or explicitly change settings to a verified baseline.
- Translation packs remain Hafs-keyed. React reader parity must use the existing
  `_verse-aliases.json` role resolution for Warsh and Qalun (`qaloon`) before
  rendering translations.

## Repository Shape

`src-react` is the future app tree. It must remain framework-isolated from the
current Svelte tree.

Target shape:

```text
src-react/
  app/
    routes/
    providers/
    router/
  components/
    ui/
    layout/
    reader/
    sources/
    navigation/
    settings/
    offline/
  design-system/
    tokens/
    registry/
    recipes/
    docs/
  data/
  offline/
  storage/
```

Shared, framework-neutral inputs remain outside `src-react`:

```text
data/
public/dataset/
public/fonts/
public/icons/
scripts/data/
docs/
tests/
```

React tests do not live under `src-react/test/` unless a later child spec
explicitly updates repo-structure docs, CI filters, docs derivation, and scoped
test instructions. By default, React unit and component tests live under
`tests/unit/**`; browser-only journeys, golden routes, service-worker proof, and
layout assertions live under `tests/e2e/<surface>/**`.

Rules:

- React code must not import Svelte modules.
- Svelte code must not import React modules.
- Shared runtime code may be extracted only when both apps need it and the
  interface is stable, typed, and framework-neutral.
- Child spec 01 must define the framework-neutral runtime location and import
  rules before sharing code. React and Svelte may consume that neutral layer, but
  neither app tree may import the other app tree.
- Svelte remains the canonical shipped app until React passes v1 parity gates.
- React must have its own dev, build, preview, and verification paths while the
  dual-build period is active.
- During dual-build, Svelte remains `pnpm run build -> dist/` and the only
  deployable artifact. React must use explicit non-deploy paths such as
  `dev:react`, `build:react -> dist-react/`, and `preview:react`; CI must not
  feed `dist-react/` to deploy until the cutover child spec flips production.
- React Vite config must not use the repository `public/` directory as an
  unfiltered `publicDir` during dual-build, because that would copy current
  `public/dataset/**` page bodies into `dist-react/`. React must use an
  allowlisted app-shell public asset path or an explicit copy step for shell
  assets, tiny boot metadata, and approved indexes. Full reader asset packs are
  published separately under same-origin `/dataset/**`.
- React service-worker scope, cache names, preview ports, output directories,
  and generated manifests must be isolated from the shipped Svelte app during
  the dual-build period.
- Existing `pnpm run dev`, `pnpm run build`, `pnpm run preview`, and
  `pnpm run validate` behavior must remain Svelte-shipping compatible until the
  approved cutover spec changes them.
- Production entry flips only after React v1 parity gates pass.
- Svelte source and dependency removal happens only after a separate post-flip
  cleanup gate passes.

React routing must preserve the current public hash route contract through
parity, including `#/s/:surah`, `#/s/:surah/:ayah`, `#/m/:page`, `#/surahs`,
`#/bookmarks`, `#/settings`, `#/assets`, `#/about`, `#/onboarding`, empty-hash
launch restore, `lastSurface` exclusions, and saved-position fallback. Any route
model change requires an approved migration plan and updates to architecture
docs, continuity tests, and golden routes.

## Target Stack

The intended React end-state is:

```text
React
TypeScript
Vite
vite-plugin-pwa / Workbox
Tailwind CSS v4
Radix UI primitives
copied-owned shadcn/ui-style components
class-variance-authority
TanStack Virtual
Dexie
Storybook
Vitest
Playwright
provider-selected visual regression
```

Stack choices must be verified in child specs before implementation details are
locked. A child spec may replace a package only if it preserves the master
goals: agentic code accuracy, high-fidelity design, low implementation friction
for agents, and deterministic generation.

## Design System Contract

The React design system is a controlled generation environment. Agents should
instantiate QuranAtlas design grammar, not invent UI.

Generation and proof order:

```text
Semantic tokens
Typed component primitives
Product-specific reader/source/offline components
Page recipes
Component registry
Storybook examples and interaction proof
Committed visual references and intent notes where visual direction is involved
Visual + accessibility + interaction tests
Agent instructions
```

Storybook is the verification layer, not the source of truth. The source of
truth is code: tokens, component APIs, recipes, and registry metadata, plus
committed visual references and intent notes where visual direction is involved.
For creative visual direction, committed `docs/ui-references/...` images plus
their intent notes are the visual-intent reference. Transient screenshots,
Storybook snapshots, and visual-regression provider artifacts are proof evidence,
not design source of truth.

Hard rules:

- Tailwind v4 is allowed inside owned design-system and product components
  only, and Tailwind theme values must resolve to QuranAtlas semantic tokens.
- Built-in Tailwind palettes, direct primitive-token consumption, arbitrary
  values, one-off shadows/radii/motion, and inline styles are forbidden unless
  covered by an explicit measured-reader-layout allowlist and static check.
- Feature and page code should compose typed components and recipes.
- shadcn/ui-style components are copied into the repo and owned by QuranAtlas.
- Radix is the behavior layer for dialogs, popovers, menus, tabs, tooltips,
  switches, sliders, and focus-sensitive primitives.
- Feature code must not build custom dialogs, popovers, menus, tabs, tooltips,
  switches, sliders, or focus traps.
- Raw arbitrary styling, raw hex colors, custom spacing, custom typography, and
  inline design styles are forbidden except for measured reader layout values
  covered by the allowlist.
- Direct Radix imports are allowed only inside owned design-system behavior
  components.
- New component variants require token, story, test, registry, and documentation
  updates.
- `class-variance-authority` is the default variant helper. Replacing it requires
  child-spec rationale, Context7 verification, and a registry/check update.

Component maturity ladder:

```text
Level 1: UI primitives
Level 2: Accessible behavior primitives
Level 3: Product components
Level 4: Page recipes
```

Most agent-generated UI should compose Level 3 product components and Level 4
page recipes.

## Component Registry

The React design system must include a machine-readable component registry:

```text
src-react/design-system/registry/component-registry.json
```

Each registry entry must document:

- import path;
- purpose;
- allowed variants and sizes;
- required props and states;
- forbidden uses;
- examples;
- required Storybook stories;
- required tests;
- accessibility expectations;
- visual proof surface.

The registry is an agent-facing map of what can be composed. Agents should
search the registry before creating or modifying UI.

The registry must have a versioned JSON schema, stable sorted component ids, and
a validation check that proves each entry matches exported components, allowed
variants, stories, tests, docs, accessibility expectations, and visual proof
references. Advisory registry text without drift checks is not sufficient.

## Reader-Specific Components

The React design system must include product-specific reader primitives rather
than forcing agents to assemble reader layout from generic boxes.

Required reader components include:

- `ReaderShell`
- `ReaderChrome`
- `ReaderViewport`
- `ReaderOverlay`
- `ReaderToolbar`
- `ReaderSidePanel`
- `ReaderBottomSheet`
- `ReaderFocusMode`
- `ReaderProgressRail`
- `ReaderSettingsPanel`

Required source/offline components include:

- `SourcePackCard`
- `AssetDownloadCard`
- `ChapterList`
- `SurahList`
- `JuzList`
- `BookmarkList`
- `OfflineStatusBanner`
- `StorageUsagePanel`
- `ReaderAssetGate`
- `SearchWithinQuran`

Required page or embedded-surface recipes include:

- `SourceSelectionPageRecipe`
- `ReaderPageRecipe`
- `AssetManagementPageRecipe`
- `AssetInstallPanelRecipe`
- `SettingsPageRecipe`
- `SearchPageRecipe`
- `OnboardingPageRecipe`

## Tokens

Tokens are a public API. Agents must not invent arbitrary design values.

The React design system must define semantic tokens for:

- app canvas, surfaces, borders, text, accents, focus, and danger states;
- reader page background, margins, body text, muted text, selection, and
  controls;
- bookmark, tafsir, curated metadata, reader selection, and reader status
  namespaces;
- offline warning, storage danger, install progress, active pack, and cache
  state;
- spacing, radius, typography, motion, shadow, and z-index.

Reader-specific tokens must exist because generic tokens produce generic UI.
Reader comfort is a product requirement, not a styling detail.

## Offline And Storage Architecture

The React app must keep offline behavior explicit and asset-pack driven.

Caching split:

| Asset type | Strategy |
| --- | --- |
| App shell: HTML, JS, CSS, icons, fonts | Precache |
| URL-addressed reader dataset, text, Mushaf page, source, and search assets | Cache Storage with user-triggered install packs |
| Previously opened URL-addressed assets | Runtime cache |
| Settings, dataset metadata, activation/install state, and continuity | IndexedDB via Dexie over the existing DB contract |
| Non-URL large binary/index artifacts | OPFS only after an explicit child-spec contract |

Rules:

- Do not precache all reader assets during service worker install.
- Asset packs must be manifest-driven, versioned, provenance-rich,
  byte-planned, and install-before-activate.
- During dual-build, React storage must remain compatible with the existing
  `quran-atlas` IndexedDB v7 stores, settings keys, record shapes, and
  one-writer-per-store/key ownership rules. React must not bump schema or run a
  migration that breaks the shipped Svelte app before cutover.
- During dual-build, rich React pack statuses are state-machine vocabulary, not
  permission to persist new shapes into existing v7 stores. React may persist
  only validator-compatible records through the approved storage writers; any
  new per-pack metadata store, schema shape, or DB version requires a separate
  migration spec with docs, tests, cross-tab proof, and rollback.
- React runtime may consume only same-origin `/dataset/**` outputs. `data/`,
  `data/catalog/`, `data/normalized/`, `data/taxonomy/`, and upstream providers
  such as quran.ws are build-only and must never be fetched by the browser.
- Optional packs are planned from generated indexes such as
  `indexes/source-assets.json`, `indexes/text-assets.json`,
  `indexes/mushaf-assets.json`, `indexes/riwayah-packages.json`, and manifest
  inventory, then verified through local install state before activation.
- No silent fallback: missing, stale, unavailable, or offline-only packs must
  produce explicit UI states or an intentional setting change.
- Service worker logic owns app-shell and runtime network/cache strategy.
- Cache Storage remains the default for same-origin URL-addressed assets. OPFS
  may be introduced only for non-URL large binary or index artifacts with
  fallback, manifest, quota, and service-worker interaction rules.
- Storage modules own IndexedDB, Cache Storage, and any OPFS contracts.
- UI components consume typed asset state rather than inventing labels.

Canonical pack status vocabulary:

```ts
type PackStatus =
  | "not-installed"
  | "queued"
  | "installing"
  | "installed"
  | "verifying"
  | "verified"
  | "active"
  | "incomplete"
  | "incompatible"
  | "stale"
  | "failed"
  | "update-available"
  | "storage-full"
  | "unavailable-offline";
```

Pack status is separate from active selection. Download/cache presence does not
mean the pack is usable; only verified installed assets may be activated by the
owning settings writer. User-facing copy may say "download" where appropriate,
but the underlying state must preserve install, verify, activate, stale,
unavailable, and failure distinctions.

Continuity parity must preserve onboarding-gated launch restore, valid
`lastSurface`, fallback to `settings.currentPosition`, riwayah-scoped bookmarks
with cross-tab sync, Daily Wird `settings.wirdPlan`, and exclusion of
operational routes such as `#/assets` from launch restore.

## Verification Gates

Verification must scale from component proof to app parity.

Required layers:

- Context7 stack verification before child specs lock API or tooling details.
- React-specific typecheck through `check:react` or the composite React gate.
- React-specific lint/static checks through `check:react` or the composite React
  gate.
- React unit/component tests through `test:react` or the composite React gate.
- Component tests.
- Storybook stories and interaction tests.
- Accessibility checks.
- Playwright golden routes.
- Offline/service-worker journeys.
- Visual regression gate.
- Bundle/chunk budget.
- React e2e must run through a React-specific Playwright config and script such
  as `test:e2e:react` that targets `dev:react`/`preview:react` and
  `dist-react/`; raw current Playwright commands can false-pass against Svelte
  during dual-build.
- A composite `validate:react` gate must exist before cutover readiness and
  must include React static checks, registry/token checks, unit/component tests,
  Storybook tests, `build:react`, React e2e, visual regression, and docs checks.
- Data/source-pack checks when source catalogs, dataset builders,
  `public/dataset/**`, asset-pack manifests, source-data flow, or release dataset
  behavior changes.
- Docs and generated-context checks.

Storybook owns:

- UI primitive states;
- behavior primitive states;
- product component states;
- page recipe examples;
- mobile, tablet, desktop, dark mode, reduced motion, loading, empty, error,
  offline, disabled, and long-text states where relevant.

Playwright owns:

- app-level route behavior;
- Reader First journeys;
- offline/service-worker journeys;
- responsive proof;
- keyboard and focus journeys;
- golden screens;
- parity proof against the Svelte reference until cutover.

An early baseline task must freeze the Svelte reference for parity comparison:
approved routes, fixtures/storage state, viewport matrix, themes, data profile,
fonts/assets, screenshot or assertion update policy, and which differences are
product-accepted rather than regressions.

Every changed UI component must prove the QuranAtlas viewport tiers: mobile
`<768`, tablet `768-1179`, and desktop `>=1180`. Add awkward-state proof where
relevant, including `320x568`, `768x1024`, mobile landscape, short sheets, long
labels, dense ayah content, expanded panels, focus rings, safe-area insets, and
sticky-header/control overlap.

Any child spec touching source catalogs, dataset builders, `public/dataset/**`,
asset-pack manifests, source-data flow, or release dataset behavior must run the
relevant `pnpm run data -- check` or `pnpm run data -- build` profile, plus
`pnpm run validate` when app/runtime/release behavior is affected.

## Golden Screens

React parity requires golden proof for at least:

- source selection baseline;
- source selection optional pack unavailable;
- asset management populated;
- asset pack not installed;
- asset pack installed and verified;
- active pack unavailable or stale;
- reader clean mode;
- reader toolbar visible;
- reader settings panel;
- asset install active;
- asset install error;
- offline mode;
- storage almost full;
- search results;
- search offline/index unavailable;
- mobile reader;
- tablet reader;
- desktop reader;
- dark-mode reader;
- sepia reader.

Golden proof must be expressed as named route-state fixtures, not independent
route and state lists. Each fixture must record route, seed state, viewport and
theme/night-mode coverage, proof owner, required assertions, and accepted
difference status. Required coverage includes populated bookmarks, Juz rows,
both Verse and Mushaf settings modes, onboarding inner screens, Daily Wird
detail/continue flows, search unavailable/results states, and night recitation
mode `off`, `on`, and `auto` on reader/settings/drawer proof.

Golden proof must reference committed `docs/ui-references/<surface>/<component>/`
intent where visual direction is involved. Storybook stories demonstrate
component states, and Playwright golden routes prove app-level behavior with
checked-in assertions or baselines. Transient artifacts do not replace committed
visual references or durable regression checks.

## Accessibility Requirements

Accessibility is a quality gate for the reader, not an afterthought.

Minimum requirements:

- keyboard navigation;
- focus trapping in dialogs and sheets;
- visible focus states;
- ARIA names for icon-only controls;
- reduced motion support;
- sufficient contrast;
- screen-reader labels for progress and install state;
- no keyboard traps;
- no hover-only required controls;
- touch targets appropriate for mobile reader use.

Radix primitive behavior must not be bypassed unless a child spec explains the
replacement behavior and tests it.

Accessibility gates must include automated axe checks on fully rendered
Playwright routes, Storybook interaction/a11y checks for primitives, keyboard and
focus-order journeys for sheets, drawers, menus, and reader chrome, live-region
or status assertions for install/download progress, and measured touch-target
checks against the QuranAtlas minimum target token.

## CI And Static Enforcement

React child specs must add or extend static checks that reject deterministic
generation failures.

The desired CI surface includes:

```text
typecheck
lint
unit tests
component tests
Storybook tests
a11y tests
visual regression tests
Playwright e2e
offline/service-worker tests
bundle/chunk budget
docs checks
```

Static checks should reject:

- raw hex colors outside token files;
- inline color styles;
- built-in Tailwind palettes, direct primitive-token consumption, arbitrary
  Tailwind values, and one-off design literals outside the measured reader
  layout allowlist;
- direct Radix imports outside owned behavior components;
- raw button/input/dialog usage in feature/page code where a design-system
  component exists;
- new dependencies without approved child-spec rationale;
- components without stories;
- stories missing required default, loading, error, mobile, and relevant offline
  states.
- registry entries that drift from exported components, variants, stories, tests,
  docs, accessibility expectations, or proof references.
- React build outputs, service-worker scopes, or cache names that collide with
  the shipped Svelte app before cutover.
- React/Svelte cross-tree imports, except through explicitly documented
  framework-neutral shared directories with typed interfaces and tests.
- React app-shell builds that copy Mushaf page SVG bodies or legacy Mushaf page
  paths into `dist-react/`.

## Agent Instructions And Skills

The React rebuild must update agent-facing instructions so future agents have a
small, deterministic search space.

Required instruction surfaces:

- root `AGENTS.md`;
- `.agents/skills/quranatlas-workflow/SKILL.md`;
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`;
- `DESIGN.md`;
- `docs/context/repo-structure.md`;
- `docs/context/architecture.md`;
- `docs/context/style-map.md`;
- relevant `docs/context/surfaces/*.md`;
- `docs/ui-references/` conventions;
- `tests/unit/AGENTS.md` and `tests/e2e/AGENTS.md`;
- React design-system docs under `src-react/design-system/docs/`;
- component registry.

Required workflow themes:

- create or modify a UI component;
- create a reader pattern;
- perform visual regression review;
- perform accessibility review;
- perform offline PWA UI review;
- add or change a page recipe.

These workflows may be implemented as repo-local skills, docs, or both. The
important invariant is that agents know where to look, what to compose, what is
forbidden, and what proof is required.

## Shared Handoff Log

All React refactor child plans use one coordination log:

```text
docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md
```

Agents must read this log before starting any child plan and update it before
handing over. The log is the shared record for completed work, divergence,
blockers, validation results, dependency intake, files changed, commits, and the
next-agent note. Child plans must not create separate per-agent or per-plan
handoff logs unless this master spec is amended to name a split log explicitly.

Every child spec that changes repo shape, package scripts, dev tools, pinned
versions, CI gates, app architecture, generated context, or agent workflow must
update the owning context docs and run the required docs generation/checks in
the same change.

## Child Spec Index

The implementation must be split into focused child specs. Each child spec
should finish, verify, and commit before the next dependent spec starts.
Each child spec must include parent/dependency prerequisites, required reads,
allowed files/directories, forbidden changes, deliverables, acceptance criteria,
targeted verification commands, docs updates, rollback or failure handling, and
next-spec handoff notes.
Every child spec's required reads must include `AGENTS.md` and
`docs/context/repo-structure.md`; every child plan's required context must
include the shared handoff log. Specs that add or change scripts, packages, CI,
verification commands, or tool configuration must also read `package.json` and
`docs/tech-stack.md`.

Minimum child specs:

1. **00 Stack And Docs Verification**
   Verify React, Vite, VitePWA/Workbox, Tailwind v4, Radix, shadcn/ui,
   TanStack Virtual, Dexie, Storybook, Playwright, and visual regression options
   through the repo Context7 workflow first (`library` then `docs`). Produce a
   current-docs decision appendix, including any documented Context7 fallback.

2. **01 React App Shell And Dual Build**
   Create the `src-react` app shell, independent Vite entry, routing skeleton,
   provider structure, non-deploy React dev/build/preview scripts, isolated
   `dist-react/` output, isolated app-shell public asset strategy, React
   `check:react` and `test:e2e:react` gates, import-boundary checks, isolated
   service-worker/cache scope, and framework-neutral runtime-sharing rules while
   Svelte remains shipped.

3. **02 Svelte Reference Baseline**
   Freeze the current Svelte reference routes, fixtures/storage state, viewport
   matrix, themes, data profile, fonts/assets, screenshot or assertion update
   policy, and accepted product differences for later React parity comparisons.

4. **03 Tokens And Tailwind v4 Design System**
   Define semantic tokens, Tailwind v4 constraints, token exports, token checks,
   reader-specific token namespaces, measured reader-layout allowlists, and
   static rejection of palette/literal/arbitrary-value drift.

5. **04 Storybook And Component Test Harness**
   Wire Storybook, interaction tests, accessibility checks, viewport/theme
   states, component test placement under `tests/unit/**`, and story requirements
   before component specs require stories.

6. **05 Visual Regression Provider Selection**
   Blocker-grade spec. Select Chromatic, Percy, Argos, Playwright screenshots,
   Loki, or another approved provider; evaluate Quran/Mushaf screenshot privacy
   and retention, self-hosted/offline viability, deterministic fonts/assets, CI
   cost and flake profile, branch review policy, and review workflow. Provider
   snapshots are regression evidence only, not visual source of truth.

7. **06 Owned shadcn/Radix Component Layer**
   Add copied-owned UI and behavior components with narrow typed APIs, tests,
   stories, accessibility expectations, and no direct feature-code Radix usage.

8. **07 Component Registry And Agent Rules**
   Add the versioned `component-registry.json` schema, validation check, initial
   primitive and behavior entries, agent docs, forbidden-pattern checks, and
   usage examples. Later product-component and page-recipe specs must extend the
   registry in the same change that adds those components.

9. **08 Offline Storage And Asset Pack Architecture**
   Define Dexie stores, Cache Storage and OPFS boundaries, service-worker
   strategy, asset-pack lifecycle, manifest contracts, install-before-activate,
   quota behavior, offline UI state contracts, existing IDB v7 compatibility, and
   data/source-pack verification gates.

10. **08A Mushaf Install-On-Demand Asset Strategy**
    Refine child spec 08 for React-only Mushaf page handling: no Mushaf page SVG
    bodies in the React app artifact, edition-aware paths only, no legacy page
    support in React route/install plans, service-worker-owned asset-pack
    installs, executable asset-size/path checks, and split app/asset-pack
    shipping.

11. **09 Reader Surface Parity**
    Rebuild Verse and Mushaf reader surfaces, reader chrome, reader settings
    entry points, reader comfort controls, and large-surface virtualization where
    needed. Preserve hash routes, translation/riwayah alias rendering, reader
    typography, and no-silent-fallback source states.

12. **10 Navigation, Settings, And Onboarding Parity**
    Rebuild Surah/Juz/bookmark navigation, settings, source/storage controls,
    and onboarding against v1 product scope, including atomic reader asset bundle
    activation and install-before-activate source selection.

13. **11 Search And Index Parity**
    Build full-text search across Arabic text, translations, transliteration or
    index data where shipped, tafsir, and curated metadata. Search/index packs
    must follow install-before-activate, offline unavailable states, exact
    search artifact URL/cache contracts, translation alias resolution, and
    golden proof. If curated metadata implementation is still owned by child
    spec 12, this spec defines extension hooks and child spec 12 adds metadata
    corpus/index proof.

14. **12 Curated Metadata Parity**
    Rebuild curated reader-attached metadata lanes that are in v1 scope, using
    existing build/runtime dataset boundaries and explicit unavailable states.

15. **13 Continuity And Bookmarks Parity**
    Preserve onboarding-gated launch restore, valid `lastSurface`, saved
    position fallback, riwayah-scoped bookmarks, landing pulse, route exclusions,
    reload behavior, and cross-tab bookmark coherence.

16. **14 Daily Wird Parity**
    Rebuild Daily Wird as reader-adjacent continuity, including `settings.wirdPlan`
    ownership, progress persistence, reader integration, and focused tests.

17. **15 Golden Routes And Accessibility Gates**
    Complete Playwright golden routes, app-level a11y proof, keyboard/focus
    journeys, responsive proof, and Svelte-reference parity checks.

18. **16 Cutover Readiness**
    Prove parity gates, define rollback, document staging/dev soak policy,
    confirm CI/deploy artifact routing for both the React app artifact and
    same-origin asset-pack artifact set, and prepare docs/skill updates without
    removing Svelte. Search is the only deferrable parity lane unless this
    master spec and affected child specs are amended in the same change.

19. **17 Production Entry Flip With Svelte Retained**
    Flip the production entry only after readiness approval, keep Svelte source
    and dependencies available for rollback, update `docs/tech-stack.md`, docs,
    scripts, React service-worker migration/rollback choreography, and CI/deploy
    routing for app and asset-pack artifacts, then run full validation.

20. **18 Svelte Removal**
    Remove Svelte-only source, dependencies, scripts, generated context entries,
    and skills only after the React production flip has soaked successfully and a
    rollback path is documented.

## Parity Gate

React reaches parity only when:

- all in-scope v1 product surfaces exist in `src-react`;
- asset and offline flows match the product promise;
- search and search/index offline states meet the v1 product promise or
  product docs explicitly defer search before parity is claimed;
- React preserves the existing `quran-atlas` IDB contract, route contract,
  launch restore, bookmarks, and Daily Wird continuity behavior through cutover;
- no removed-scope product branch is rebuilt by accident;
- Storybook component/product-pattern coverage exists for required states;
- Playwright golden routes cover required app states and viewports;
- accessibility gates pass;
- visual regression gate is wired and passing;
- Svelte-reference baseline comparisons are resolved or intentionally accepted;
- dual-build scripts prove React and Svelte can coexist without build output,
  service-worker, cache, route, storage, or deploy-artifact collisions;
- cutover readiness, production flip, rollback, and post-flip Svelte removal are
  approved as separate gates;
- documentation, AGENTS instructions, and repo-local workflows reflect the new
  React source of truth.

## Acceptance Criteria For This Master Spec

- The spec identifies React + Vite PWA as the target end-state.
- The spec defines `src-react` as the parallel rebuild tree.
- The spec preserves Svelte as the canonical shipped app until React parity.
- The spec defines v1 product promise parity as the scope boundary.
- The spec captures design-system, offline, storage, verification, and agent
  determinism requirements.
- The spec requires child specs to be executable with prerequisites, allowed
  files, forbidden changes, deliverables, verification, docs updates, rollback,
  and handoff notes.
- The spec includes a child-spec index with visual regression provider
  selection as a blocker task.
- The spec avoids changing current stack docs until implementation changes make
  those docs current-state inaccurate.
