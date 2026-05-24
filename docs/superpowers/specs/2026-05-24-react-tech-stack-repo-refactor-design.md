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
- Storage strategy: Dexie for IndexedDB, Cache Storage for immutable
  URL-addressed assets, OPFS where large binary packs need file-like access.
- Offline strategy: Workbox / VitePWA with explicit app-shell precache and
  user-triggered reader asset packs.
- Verification strategy: Storybook for component and product-pattern proof;
  Playwright golden routes for app-level parity, responsive behavior, and
  offline journeys.
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
- Search/index readiness where it is part of the v1 architecture.
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
- Display transliteration, word-by-word translation, and tajweed coloring.

Existing removed-scope source may remain during the parallel rebuild unless it
blocks shared tooling, verification, or cutover. It must not be rebuilt into
`src-react` unless a later approved product spec changes scope.

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
  test/
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

Rules:

- React code must not import Svelte modules.
- Svelte code must not import React modules.
- Shared runtime code may be extracted only when both apps need it and the
  interface is stable, typed, and framework-neutral.
- Svelte remains the canonical shipped app until React passes v1 parity gates.
- React must have its own dev, build, preview, and verification paths while the
  dual-build period is active.
- Production entry flips only after React v1 parity gates pass.
- Svelte source removal happens only after cutover and cleanup gates pass.

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
class-variance-authority or tailwind-variants
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

Source-of-truth order:

```text
Semantic tokens
Typed component primitives
Product-specific reader/source/offline components
Page recipes
Component registry
Storybook examples
Visual + accessibility + interaction tests
Agent instructions
```

Storybook is the verification layer, not the source of truth. The source of
truth is code: tokens, component APIs, recipes, and registry metadata.

Hard rules:

- Tailwind v4 is allowed inside owned design-system and product components
  only.
- Feature and page code should compose typed components and recipes.
- shadcn/ui-style components are copied into the repo and owned by QuranAtlas.
- Radix is the behavior layer for dialogs, popovers, menus, tabs, tooltips,
  switches, sliders, and focus-sensitive primitives.
- Feature code must not build custom dialogs, popovers, menus, tabs, tooltips,
  switches, sliders, or focus traps.
- Raw arbitrary styling, raw hex colors, one-off shadows, custom spacing,
  custom typography, and inline design styles are forbidden except for measured
  reader layout values.
- Direct Radix imports are allowed only inside owned design-system behavior
  components.
- New component variants require token, story, test, registry, and documentation
  updates.

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
- `AnnotationPopover` only if a later product spec reintroduces annotations

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
- `SearchWithinQuran` only when search implementation begins

Required page recipes include:

- `SourceSelectionPageRecipe`
- `ReaderPageRecipe`
- `AssetManagementPageRecipe`
- `AssetDownloadsPageRecipe`
- `SettingsPageRecipe`
- `SearchPageRecipe`
- `OnboardingPageRecipe`

## Tokens

Tokens are a public API. Agents must not invent arbitrary design values.

The React design system must define semantic tokens for:

- app canvas, surfaces, borders, text, accents, focus, and danger states;
- reader page background, margins, body text, muted text, selection, and
  controls;
- highlight and annotation-compatible namespaces, even if annotations remain
  out of scope;
- offline warning, storage danger, download progress, and cache state;
- spacing, radius, typography, motion, shadow, and z-index.

Reader-specific tokens must exist because generic tokens produce generic UI.
Reader comfort is a product requirement, not a styling detail.

## Offline And Storage Architecture

The React app must keep offline behavior explicit and asset-pack driven.

Caching split:

| Asset type | Strategy |
| --- | --- |
| App shell: HTML, JS, CSS, icons, fonts | Precache |
| Reader content/assets | User-triggered download packs |
| Previously opened assets | Runtime cache |
| Metadata, search, download state | IndexedDB via Dexie |
| Large binary packs | OPFS or Cache Storage, chosen per access pattern |

Rules:

- Do not precache all reader assets during service worker install.
- Asset packs must be manifest-driven, versioned, provenance-rich,
  byte-planned, and install-before-activate.
- No silent fallback: missing, stale, unavailable, or offline-only packs must
  produce explicit UI states or an intentional setting change.
- Service worker logic owns app-shell and runtime network/cache strategy.
- Storage modules own IndexedDB, Cache Storage, and OPFS contracts.
- UI components consume typed asset state rather than inventing labels.

Canonical asset state vocabulary:

```ts
type AssetState =
  | "not-downloaded"
  | "queued"
  | "downloading"
  | "downloaded"
  | "failed"
  | "update-available"
  | "storage-full"
  | "unavailable-offline";
```

Components must not create competing labels such as "saved", "cached",
"installed", "available", or "offline-ready" unless a child spec explicitly
changes the vocabulary and updates all callers.

## Verification Gates

Verification must scale from component proof to app parity.

Required layers:

- Context7 stack verification before child specs lock API or tooling details.
- Typecheck.
- Lint.
- Unit tests.
- Component tests.
- Storybook stories and interaction tests.
- Accessibility checks.
- Playwright golden routes.
- Offline/service-worker journeys.
- Visual regression gate.
- Bundle/chunk budget.
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

## Golden Screens

React parity requires golden proof for at least:

- source selection baseline;
- source selection optional pack unavailable;
- asset management populated;
- asset pack not downloaded;
- asset pack downloaded;
- reader clean mode;
- reader toolbar visible;
- reader settings panel;
- asset downloads active;
- asset downloads error;
- offline mode;
- storage almost full;
- search results when search is implemented;
- mobile reader;
- tablet reader;
- desktop reader;
- dark-mode reader;
- sepia reader.

Golden screens may live as Storybook page stories, Playwright screenshot routes,
or both. Child specs must choose the exact proof location for each screen.

## Accessibility Requirements

Accessibility is a quality gate for the reader, not an afterthought.

Minimum requirements:

- keyboard navigation;
- focus trapping in dialogs and sheets;
- visible focus states;
- ARIA names for icon-only controls;
- reduced motion support;
- sufficient contrast;
- screen-reader labels for progress and download state;
- no keyboard traps;
- no hover-only required controls;
- touch targets appropriate for mobile reader use.

Radix primitive behavior must not be bypassed unless a child spec explains the
replacement behavior and tests it.

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
- arbitrary Tailwind values outside allowed design-system/product files;
- direct Radix imports outside owned behavior components;
- raw button/input/dialog usage in feature/page code where a design-system
  component exists;
- new dependencies without approved child-spec rationale;
- components without stories;
- stories missing required default, loading, error, mobile, and relevant offline
  states.

## Agent Instructions And Skills

The React rebuild must update agent-facing instructions so future agents have a
small, deterministic search space.

Required instruction surfaces:

- root `AGENTS.md`;
- `.agents/skills/quranatlas-workflow/SKILL.md`;
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`;
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

## Child Spec Index

The implementation must be split into focused child specs. Each child spec
should finish, verify, and commit before the next dependent spec starts.

Minimum child specs:

1. **00 Stack And Docs Verification**  
   Verify React, Vite, VitePWA/Workbox, Tailwind v4, Radix, shadcn/ui,
   TanStack Virtual, Dexie, Storybook, Playwright, and visual regression options
   through Context7 or official docs. Produce a current-docs decision appendix.

2. **01 React App Shell And Dual Build**  
   Create the `src-react` app shell, independent Vite entry, routing skeleton,
   provider structure, and dual dev/build/preview scripts while Svelte remains
   shipped.

3. **02 Tokens And Tailwind v4 Design System**  
   Define semantic tokens, Tailwind v4 constraints, token exports, token checks,
   and reader-specific token namespaces.

4. **03 Owned shadcn/Radix Component Layer**  
   Add copied-owned UI and behavior components with narrow typed APIs, tests,
   stories, accessibility expectations, and no direct feature-code Radix usage.

5. **04 Component Registry And Agent Rules**  
   Add `component-registry.json`, agent docs, forbidden-pattern checks, and
   usage examples for primitives, product components, and page recipes.

6. **05 Storybook And Component Test Harness**  
   Wire Storybook, interaction tests, accessibility checks, viewport/theme
   states, and component/product-pattern story coverage.

7. **06 Visual Regression Provider Selection**  
   Blocker-grade spec. Select Chromatic, Percy, Argos, Playwright screenshots,
   Loki, or another approved provider; wire the chosen gate; define review
   policy. React UI work cannot graduate beyond local proof until this is
   complete.

8. **07 Offline Storage And Asset Pack Architecture**  
   Define Dexie stores, Cache Storage and OPFS boundaries, service-worker
   strategy, asset-pack lifecycle, manifest contracts, install-before-activate,
   quota behavior, and offline UI state contracts.

9. **08 Reader Surface Parity**  
   Rebuild Verse and Mushaf reader surfaces, reader chrome, reader settings
   entry points, reader comfort controls, and large-surface virtualization where
   needed.

10. **09 Navigation, Settings, And Onboarding Parity**  
    Rebuild Surah/Juz/bookmark navigation, settings, source/storage controls,
    and onboarding against v1 product scope.

11. **10 Search, Metadata, And Continuity Parity**  
    Rebuild search/index readiness where implemented, curated metadata lanes,
    bookmarks, saved position, Daily Wird, and reader continuity flows.

12. **11 Golden Routes And Accessibility Gates**  
    Complete Playwright golden routes, app-level a11y proof, keyboard/focus
    journeys, responsive proof, and Svelte-reference parity checks.

13. **12 Production Cutover And Svelte Removal**  
    Flip production entry only after parity gates pass, update `docs/tech-stack.md`,
    remove Svelte-only source and dependencies, update docs and skills, and run
    full validation.

## Parity Gate

React reaches parity only when:

- all in-scope v1 product surfaces exist in `src-react`;
- asset and offline flows match the product promise;
- no removed-scope product branch is rebuilt by accident;
- Storybook component/product-pattern coverage exists for required states;
- Playwright golden routes cover required app states and viewports;
- accessibility gates pass;
- visual regression gate is wired and passing;
- dual-build scripts prove React and Svelte can coexist until cutover;
- production cutover plan is approved;
- documentation, AGENTS instructions, and repo-local workflows reflect the new
  React source of truth.

## Acceptance Criteria For This Master Spec

- The spec identifies React + Vite PWA as the target end-state.
- The spec defines `src-react` as the parallel rebuild tree.
- The spec preserves Svelte as the canonical shipped app until React parity.
- The spec defines v1 product promise parity as the scope boundary.
- The spec captures design-system, offline, storage, verification, and agent
  determinism requirements.
- The spec includes a child-spec index with visual regression provider
  selection as a blocker task.
- The spec avoids changing current stack docs until implementation changes make
  those docs current-state inaccurate.
