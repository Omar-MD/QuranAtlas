# Architecture

QuranAtlas is a React-only Vite PWA focused on a Reader First Quran experience.

## Runtime Shape

- `index.html` provides `#react-root`.
- `src/app/main.tsx` creates the React root and renders `src/app/App.tsx`.
- `src/app/App.tsx` owns hash routing, launch restore, reader/settings overlay orchestration, and top-level route selection.
- `App.tsx` also owns atomic replace-style hash updates used when continuous Mushaf scrolling passively synchronizes the dominant page; discrete page actions keep normal hash-history navigation.
- The app wrapper keeps ordinary routes on document-flow minimum height, but switches to an exact clipped dynamic viewport while the Mushaf route is mounted so its owned shell and stage cannot create a second document scroller.
- Route parsing lives in `src/app/router/routes.ts`.
- Providers live in `src/app/providers/AppProviders.tsx`.

The app uses browser hash routes so static hosting on Cloudflare Pages can serve the same `index.html` for every runtime route.

## Routes

| Hash | Owner | Purpose |
| --- | --- | --- |
| `#/s/:surah` | `src/app/routes/read/ReaderRoute.tsx` | Verse reader at Surah start |
| `#/s/:surah/:ayah` | `src/app/routes/read/ReaderRoute.tsx` | Verse reader at a specific ayah |
| `#/m/:page` | `src/app/routes/read/MushafRoute.tsx` | Mushaf page reader |
| `#/surahs` | `src/app/routes/navigation/SurahsRoute.tsx` | Standalone Surah directory |
| `#/bookmarks` | `src/app/routes/navigation/BookmarksRoute.tsx` | Standalone bookmarks view |
| `#/settings` | `src/app/routes/settings/SettingsRoute.tsx` | Transient settings overlay route |
| `#/assets` | `src/app/routes/settings/SettingsRoute.tsx` | Compatibility opener for settings/assets inventory |
| `#/about` | `src/app/routes/settings/AboutRoute.tsx` | About, install, attribution, clear data |
| `#/onboarding` | `src/app/routes/onboarding/OnboardingRoute.tsx` | One-time fresh/cleared Mushaf edition setup and compatibility launch path |
| `#/search` | `src/app/routes/search/SearchRoute.tsx` | Phase 1 deterministic Search route |

Unsupported hashes render the route-unavailable state in `App.tsx`.

## State And Storage

React component state stays local unless it must survive reloads, cross-route transitions, or offline use.

- Persistent browser state lives in the Dexie database under `src/storage/**`.
- Store schema constants live in `src/storage/schema.ts`.
- Settings writes go through `src/storage/settings-writer.ts`.
- `mushafEditionId` and `mushafEditionSetupVersion` are written together so first/cleared selection is atomic.
- Reader continuity lives under `src/continuity/**`.
- Bookmarks are owned by `src/continuity/bookmarks/**`.
- Daily Wird state is stored as a settings key and owned by `src/continuity/wird/**`.

There is no app-wide event bus. Cross-component coordination uses React props/hooks, DOM events for the local settings overlay opener, and focused helpers such as the bookmark sync channel.

Reader interaction suspension is explicit rather than inferred from the DOM. `ReaderPageShell` provides `ReaderInteractionContext`, combining its controlled Settings-overlay state with navigation-drawer state so Mushaf gesture and keyboard handling cancel or pause while either overlay is open. Settings composes the owned Radix-backed `Sheet` through `src/components/ui/**`; the `adaptive-settings` variant owns modal semantics, structured scrolling content, and controlled return focus to the recorded opener, the reader Settings action, or the reader main landmark.

## Data Boundary

Runtime data is always same-origin under `/dataset/**`.

- `src/data/runtime-boundary.ts` validates runtime dataset URLs.
- `src/data/reader-corpus.ts` loads Surah text, translation packs, and aliases.
- `src/data/source-index.ts` loads source/asset indexes for settings inventory.
- `src/packs/mushaf-page-asset.ts` validates and loads edition-aware Mushaf page assets.
- Build-only source inputs stay under `data/**` and are never imported by the app.

The current MVP profile is Qaloon text/font, Qaloon Mushaf pages, and Bridges translation.

At launch, `src/launch/asset-contract-reset.ts` distinguishes a valid pre-existing MVP contract from an incompatible profile before it clears state. `src/launch/mushaf-edition-setup.ts` migrates valid prior users to the quran.ws Mushaf selection without disturbing their continuity, or requires exactly one Mushaf edition selection for fresh/cleared state. Only a successfully loaded and validated availability index can classify a completed edition as missing; fetch, response, parse, or index-contract failures preserve the stored edition and enter a retryable availability state. A rejected first-setup transaction likewise keeps the selected option and requested reader hash for retry. Confirmed missing editions remain in recovery, and switching remains About > Clear All Data. The mutable Mushaf availability index is NetworkFirst so an online private-build response replaces stale availability while offline launches may use its cached response.

Search is the second top-level product mode. The `#/search` route is lazy-loaded from `src/app/routes/search/SearchRoute.tsx`, owns a route-scoped `SearchClient`, installs/activates the core Search pack on Search entry when needed, and queries a restartable Web Worker through serializable result windows. The lazy Search route owns the Ask/Search v1 preview loop. `AnswerPreview` is built in the Search worker from typed Search evidence and rendered by the Search surface; Reader routes do not import Ask/Search runtime modules, start Search workers, fetch `/search-packs/**`, or touch Search storage on cold launch. Search uses generated static packs with immutable runtime URLs under `/search-packs/packs/<contentHash>/**`, registry `/search-packs/registry.json`, explicit Hafs-to-Qalun Reader mapping, and source-backed saved-search intent records.

## UI Architecture

- `src/design-system/index.css` is the global CSS entry.
- `src/design-system/tokens/**` defines primitive and semantic tokens.
- `src/design-system/tokens/tailwind-theme.css` maps Tailwind v4 utilities to QuranAtlas semantic tokens.
- `src/components/ui/**` wraps Radix primitives and exposes app-approved controls.
- Feature components compose owned primitives and `qar:` Tailwind utilities; they do not import Radix directly.
- Component registry metadata lives in `src/design-system/registry/component-registry.json`.

Visual work should identify one active component and one active reference source, then verify real rendered states across relevant viewports.

## PWA And Offline

`vite.config.js` configures `vite-plugin-pwa` with Workbox:

- app-shell precache id: `quranatlas`
- runtime dataset cache: `quran-atlas-runtime-dataset-v1`
- app navigation fallback: `/index.html`
- notification-click helper: `public/wird-notification-sw.js`

Offline specs run only against production preview because service workers are build artifacts. The service worker precaches the shell, fonts, icons, and built assets only; `/dataset/**` is excluded from precache and cached through the runtime CacheFirst route. Generated build validation remains the integrity gate for dataset correctness.

Search packs stay outside the generic `/dataset/**` runtime dataset cache. The dedicated Search pack cache namespace is keyed by content hash, active and previous-active packs are protected from cleanup, and the generic dataset CacheFirst route excludes Search pack paths.

## Build And Deploy

`pnpm run build` runs the full dataset build and then `vite build`, producing `dist/`. CI uses `scripts/ci/affected.mjs` and `pnpm run ci:build` to reuse committed runtime dataset assets when source data did not change, and to run the expensive Mushaf import/page-build lane when Mushaf inputs changed or Playwright is selected. CI checks the production chunk budget before uploading one artifact; Lighthouse, Playwright preview/offline/visual checks, and Cloudflare Pages deploy all consume that same artifact, and deploy does not rebuild.

## Agentic Development Rules

- Prefer current local code and docs over remote assumptions.
- Keep docs current-state only; no migration notes or progress logs.
- Use `src/design-system/registry/component-registry.json` and `src/components/ui/**` before adding UI primitives.
- Keep deterministic checks in `package.json` scripts and CI; avoid one-off committed scripts.
- Run the smallest verification that proves the change, and treat warnings as failures.
