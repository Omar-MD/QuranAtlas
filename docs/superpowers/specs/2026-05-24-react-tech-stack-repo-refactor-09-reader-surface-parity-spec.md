# React Tech Stack Refactor 09 - Reader Surface Parity Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-06-owned-shadcn-radix-component-layer-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-07-component-registry-agent-rules-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`

## Purpose

Rebuild the QuranAtlas Verse and Mushaf reader surfaces in React to v1 product
promise parity, preserving public hash routes, active pack semantics,
translation alias rendering, reader typography, Mushaf behavior, continuity
hooks, accessibility, responsive behavior, and offline unavailable states.

## Current Docs Used

Context7 was used for the TanStack Virtual implementation-sensitive parts of
this spec.

- Command:
  `npx ctx7@latest library "TanStack Virtual" "How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?"`
- Selected library id: `/tanstack/virtual`
- Command:
  `npx ctx7@latest docs /tanstack/virtual "How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?"`
- Current-doc facts used:
  - React virtualization uses `useVirtualizer` from `@tanstack/react-virtual`.
  - Element scrolling requires a scrollable parent element and
    `getScrollElement`.
  - Virtualized lists need an `estimateSize` and can set `overscan`.
  - Unknown-height rows can use `measureElement` with `data-index`.
  - Window scrolling can use `useWindowVirtualizer` with `scrollMargin`.
  - Virtualized items are positioned by total-size spacers and transforms.

Exact React hook code, route integration, and measurement thresholds must be
fetched or verified again during the implementation plan if TanStack Virtual
versions have changed.

## Scope

In scope:

- Rebuild Verse reader route `#/s/:surah/:ayah?`.
- Rebuild Mushaf reader route `#/m/:page`.
- Preserve route canonicalization and saved-position behavior.
- Render active verified riwayah/text-style and Mushaf edition assets only.
- Resolve Hafs-keyed translations through `_verse-aliases.json` for Warsh and
  Qalun (`qaloon`).
- Render active translation, tafsir preview/sheet, and curated knowledge lane
  states that are already in v1 scope.
- Rebuild reader chrome, reader settings entry points, edge indicators, mode
  switching, typography controls, and reader comfort controls.
- Use TanStack Virtual where long reader surfaces need virtualization.
- Add Storybook, registry, unit, e2e, accessibility, and visual proof.

Out of scope:

- Navigation list, settings shell, source management, and onboarding parity.
  Those belong to child spec `10`.
- Search UI. That belongs to child spec `11`.
- New personal notes, tags, review, audio, AI, or annotation product branches.
- Multiple translations side by side.
- Runtime upstream fetches outside `/dataset/**`.

## Required Reads

- `AGENTS.md`
- `DESIGN.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `02`, `06`, `07`, and `08`

## Allowed Files And Directories

Allowed create:

- `src-react/components/reader/**`
- `src-react/app/routes/read/**`
- `src-react/app/router/**` only for reader route integration established by
  child spec `01`
- `src-react/data/**`, `src-react/packs/**`, and `src-react/metadata/**` only
  for reader-facing typed adapters that follow child spec `08`
- `src-react/design-system/recipes/**` for reader recipes
- Storybook stories under `src-react/**`
- Unit tests under `tests/unit/read/**` or React-specific equivalent placement
  under `tests/unit/**`
- E2E tests under `tests/e2e/read/**`

Allowed modify:

- Component registry entries and validation fixtures.
- React route definitions and React app shell wiring.
- React storage/offline adapters when needed for reader pack states.
- Context docs for current-state changes after implementation.

Forbidden modify:

- Svelte reader behavior except for explicitly approved baseline fixes.
- Current Svelte route contract.
- Existing dataset files unless a data/source-pack change is explicitly owned
  and verified.
- Removed-scope mark, review, listen, audio, notes, tags, or AI product
  branches.

## Reader Contract

Verse mode must preserve:

- `#/s/:surah` and `#/s/:surah/:ayah` routes;
- invalid param sanitization and canonical fallback behavior;
- active riwayah/text-style verification before text render;
- no silent fallback from Hafs/Warsh to Qalun;
- translation alias roles: identity, merged, primary, continuation, none;
- tafsir source unavailable states;
- knowledge lane optional behavior that does not block base rendering;
- bismillah and surah header behavior;
- reader typography and spacing controls;
- cross-surah next/previous behavior;
- edge indicators, ambient reader chrome, and focus/keyboard behavior.

Mushaf mode must preserve:

- `#/m/:page` route;
- active riwayah and Mushaf edition selection from settings;
- manifest validation before SVG page render;
- same-origin sanitized SVG page loading;
- no Qalun page fallback under a stale Hafs/Warsh label;
- page count clamping and route replacement;
- physical right-to-left page progression;
- Auto, Fit page, and Fit width view modes;
- page jump input behavior and focus restore;
- adjacent-page warmup that never replaces the visible page on failure.

## Virtualization Contract

Use virtualization only where it improves reader performance without weakening
reading continuity.

Requirements:

- item identity must be stable across settings and translation changes;
- row measurement must account for Arabic text, translation, tafsir preview,
  knowledge lane, footnotes, and theme/typography changes;
- scroll restoration must wait for measured target availability;
- deep links must land on the requested ayah without visible jump loops;
- overscan must avoid blank gaps during ordinary reader scroll;
- virtualized DOM must preserve keyboard focus, accessible labels, and
  screen-reader context;
- non-virtualized fallback must remain possible for small or special surfaces.

## Component And Story Requirements

Register and prove reader components such as:

- `ReaderPageShell`;
- `VerseBlock`;
- `VerseNumber`;
- `TranslationFootnote`;
- `TafsirPreview`;
- `TafsirSheet`;
- `KnowledgeChips`;
- `MushafPageViewer`;
- `MushafModeControl`;
- `ReaderSettingsPanel`;
- `ReaderAssetGate`.

Stories must cover default, loading, unavailable pack, stale pack, error, long
ayah, translation visible/hidden, tafsir open, knowledge open, mobile, tablet,
desktop, light, sepia, dark, and reduced-motion states where relevant.

## Deliverables

- React Verse and Mushaf route implementations with public hash-route parity.
- Reader data, pack, and metadata adapters needed by the React routes.
- Registered reader components, page recipes, stories, and visual proof.
- Unit/component tests for reader state, asset gates, translation aliases,
  tafsir, knowledge, and virtualization behavior.
- E2E/golden proof for Verse, Mushaf, unavailable pack, stale pack, and viewport
  states.
- Updated context docs, tech-stack entries, and registry records for any current
  behavior, route, script, or verification changes.

## Acceptance Criteria

- React reader routes match the public hash route contract.
- React reader renders only verified active assets or explicit unavailable
  states.
- Warsh and Qalun (`qaloon`) translation display uses `_verse-aliases.json`.
- Mushaf page route and SVG rendering preserve the existing product contract.
- Virtualization does not break deep links, scroll restore, focus, or
  accessibility.
- Reader components are registered, tested, storied, and visually proved.
- Removed-scope branches are not rebuilt.

## Verification

Run targeted unit/component tests and Storybook tests introduced by the
implementation, plus:

```bash
pnpm run docs:check
git diff --check
```

Run the owning e2e specs for browser-only proof, for example:

```bash
pnpm exec playwright test tests/e2e/read --reporter=line
```

If React route, build, storage, or service-worker code changes, also run:

```bash
pnpm run check
pnpm run build:react
```

Expected result:

- Unit/component tests pass.
- Reader e2e parity routes pass at required viewport tiers.
- Visual regression proof is reviewed through the selected provider or approved
  temporary local path.
- Docs checks are clean.

## Rollback And Failure Handling

- If virtualization causes deep-link or scroll-restore instability, isolate the
  virtualized path behind a reader feature flag or revert to the previous
  non-virtualized proof for that route until measurement is fixed.
- If a pack is missing or stale, render explicit asset-gate UI rather than
  fallback content.
- If translation alias coverage fails, fix the data/alias contract before
  shipping reader parity for that riwayah.
- If a reader visual diff reveals design drift, update the committed
  `docs/ui-references/**` intent or the implementation before accepting the
  baseline.

## Handoff

Child spec `10 Navigation, Settings, And Onboarding Parity` must integrate its
navigation and settings entry points with the reader routes defined here. Child
specs `13` and `14` must use the reader position and Daily Wird hooks without
rewriting reader route semantics.
