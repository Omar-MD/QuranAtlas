# React Tech Stack Refactor 10 - Navigation, Settings, And Onboarding Parity Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-07-component-registry-agent-rules-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-09-reader-surface-parity-spec.md`

## Purpose

Rebuild navigation, settings, source/storage controls, and onboarding in React
against the Reader First v1 product promise. These surfaces must preserve
reader-continuity routes, source-selection safety, install-before-activate
contracts, first-run flow, and the public hash route behavior while Svelte
remains the shipped reference.

## Current Docs Requirement

This spec is primarily QuranAtlas product and repo behavior. It does not lock
new external API syntax. If implementation adds routing, form, notification,
gesture, or storage libraries beyond the approved stack, fetch current docs
through Context7 before writing the implementation plan.

## Scope

In scope:

- Rebuild mobile and desktop navigation drawer behavior.
- Rebuild Surah, Juz, and bookmark navigation.
- Rebuild reader mode switching between Verse and Mushaf.
- Rebuild settings shell for Verse and Mushaf modes.
- Rebuild Asset Management route `#/assets`.
- Rebuild About route `#/about`.
- Rebuild first-run onboarding route `#/onboarding`.
- Preserve transient `#/settings` behavior.
- Preserve atomic recitation bundle activation.
- Preserve install-before-activate for optional riwayah, text, Mushaf,
  translation, tafsir, metadata, and search/index packs.
- Add registry entries, stories, tests, visual proof, and e2e coverage.

Out of scope:

- Rebuilding reader content internals. That belongs to child spec `09`.
- Search result UI. That belongs to child spec `11`.
- Curated metadata reader lanes beyond source controls. That belongs to child
  spec `12`.
- Daily Wird internals. That belongs to child spec `14`.
- Removed mark, review, listen, audio, notes, tags, AI, or sync product branches.

## Required Reads

- `AGENTS.md`
- `DESIGN.md`
- `docs/product-info.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/infra.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `02`, `07`, `08`, and `09`

## Allowed Files And Directories

Allowed create:

- `src-react/components/navigation/**`
- `src-react/components/settings/**`
- `src-react/components/offline/**`
- `src-react/components/sources/**`
- `src-react/app/routes/navigation/**`
- `src-react/app/routes/settings/**`
- `src-react/app/routes/onboarding/**`
- Unit tests under `tests/unit/navigate/**`, `tests/unit/configure/**`, or
  React-specific equivalents under `tests/unit/**`
- E2E tests under `tests/e2e/navigate/**`, `tests/e2e/configure/**`, and
  `tests/e2e/onboard/**`

Allowed modify:

- React router and app shell route registration.
- Component registry and page recipes.
- React storage/offline/source adapters from child spec `08`.
- Context docs when current behavior changes.

Forbidden modify:

- Current Svelte behavior except approved baseline fixes.
- Current Svelte build/deploy scripts.
- Dataset outputs unless a data/source-pack change is explicitly owned.
- Removed-scope product branches.

## Navigation Contract

React must preserve:

- mobile hamburger and swipe-down opening the full-screen reader drawer;
- desktop AmbientDock overflow path to the drawer;
- `#/surahs` as desktop standalone and mobile drawer redirect behavior;
- Surah list search and All/Recent filter;
- Juz rows with current-position and Daily Wird next-reference indicators;
- Bookmarks grouped by active riwayah;
- bookmark row tap closing drawer and navigating to the verse with landing
  pulse;
- Verse/Mushaf reader mode switching using latest known routes;
- `?` shortcut sheet and active keyboard shortcut behavior.

Navigation search is local Surah/Juz navigation search. Full-text Quran search
belongs to child spec `11`.

## Settings And Asset Contract

React settings must preserve:

- mode-aware Verse Settings and Mushaf Settings;
- transient `#/settings` opener over the previous reader surface;
- focus restoration on dismiss, except Manage Assets route transitions;
- theme, night mode, translation visibility, typography, and reader comfort
  controls through their sole writers;
- nested asset pickers for compatible source choices;
- active recitation bundle writes as one atomic unit;
- `#/assets` excluded from launch restore and `lastSurface`;
- install, reinstall, verify, set active, and delete actions per asset row;
- blocked delete for active optional assets;
- route-level status regions for install/progress/failure states.

Settings must never change the visible active pack label until the pack is
verified usable or an explicit switch to a verified baseline occurs.

## Onboarding Contract

React onboarding must preserve:

- first clean boot routes to `#/onboarding`;
- once complete, onboarding is unreachable until data is cleared;
- completion writes `settings.onboardingComplete`;
- default first-run riwayah is Qalun, runtime key `qaloon`;
- optional riwayat remain disabled or unavailable until usable;
- translation picker derives options from runtime dataset metadata;
- onboarding teaches active Reader First flows only;
- onboarding does not introduce marks/tags/review/audio/AI branches;
- completion routes to `#/s/1` or the selected browse route.

## Component And Recipe Requirements

Register and prove:

- `NavDrawer`;
- `SurahList`;
- `JuzList`;
- `BookmarksList`;
- `ShortcutSheet`;
- `SettingsShell`;
- `SourcePicker`;
- `AssetManagementPage`;
- `AssetRow`;
- `OnboardingFlow`;
- page recipes for navigation drawer, desktop Surah directory, Settings shell,
  Asset Management, About, and Onboarding.

## Deliverables

- React navigation drawer, Surah/Juz/bookmark navigation, About, Settings,
  Asset Management, and Onboarding surfaces.
- Source and asset state adapters that preserve install-before-activate and
  atomic active-bundle writes.
- Registered navigation, settings, source, asset, about, and onboarding
  components with stories, tests, and visual proof.
- E2E coverage for navigation, settings, asset management, onboarding, and route
  behavior across required viewport tiers.
- Updated context docs, tech-stack entries, registry records, and agent
  instructions for any current route, source-control, script, or workflow
  changes.

## Acceptance Criteria

- Navigation, settings, assets, about, and onboarding routes match the Svelte
  reference or documented v1 product differences.
- Source selection follows install-before-activate and atomic bundle rules.
- Bookmarks remain riwayah-scoped reading continuity.
- Onboarding cannot activate unavailable optional packs.
- All new UI is registered, storied, tested, and visually proved.
- Removed-scope product branches are absent.

## Verification

Run targeted unit/component tests and Storybook tests, plus:

```bash
pnpm run docs:check
git diff --check
```

Run owning e2e specs:

```bash
pnpm exec playwright test tests/e2e/navigate tests/e2e/configure tests/e2e/onboard --reporter=line
```

If React router, settings storage, source-pack behavior, or build tooling
changes, also run:

```bash
pnpm run check
pnpm run build:react
```

Expected result:

- Navigation, settings, asset, and onboarding tests pass.
- Accessibility and visual proof cover mobile, tablet, desktop, light, sepia,
  and dark where applicable.
- Docs checks are clean.

## Rollback And Failure Handling

- If source activation can write an unusable pack, stop and fix the pack gate
  before continuing.
- If mobile drawer and desktop route behavior diverge accidentally, restore the
  route contract before adding new navigation features.
- If onboarding needs a new source option, add the source-pack contract first;
  do not hardcode unavailable runtime options.

## Handoff

Child spec `11 Search And Index Parity` may add search entry points to
navigation and settings only after defining search/index pack state. Child spec
`14 Daily Wird Parity` owns Daily Wird internals but must compose through the
navigation surfaces defined here.
