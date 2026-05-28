# React Production Parity Audit

> Superseded current-state note: `docs/superpowers/specs/2026-05-28-mvp-default-assets-reset-design.md` narrows the active parity target to the MVP default reader asset profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation. Any older instruction in this audit to restore onboarding source choices, tafsir UI, optional Hafs/Warsh packs, or install/verify asset workflows is historical audit context, not current implementation guidance.

## Summary

- React target URL: `http://127.0.0.1:4181/`
- Svelte target URL: `http://127.0.0.1:4180/`
- Date/time: `2026-05-26 16:08:09 IST`
- Commands run:
  - `pnpm run build` - passed; built Svelte production artifact in `dist/`.
  - `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react` - passed; built React production-target artifact in `dist-react/`.
  - `pnpm exec vite preview --host 127.0.0.1 --port 4180 --strictPort` - running as Svelte reference.
  - `pnpm exec vite preview --config vite.react.config.js --host 127.0.0.1 --port 4181 --strictPort` - running as React target.
  - `node .scratch/react-production-parity-audit.mjs` - passed; generated screenshots, console/network capture, and evidence JSON.
  - `pnpm run test:e2e:react:golden` - passed, 35 tests.
  - `pnpm run test:e2e:react:offline` - passed, 1 test.
- Overall status: React production-target build is not production-parity with the working Svelte app. It renders a small preview/skeleton implementation for most required surfaces, often without console errors, so shallow React route tests pass while core product behavior is missing.
- Biggest blockers:
  - Fresh React launch bypasses Svelte first-run onboarding and opens the reader directly.
  - React reader silently falls back to hardcoded preview verses instead of the real Svelte/data corpus.
  - React Mushaf renders a placeholder SVG rectangle instead of the real Mushaf page asset.
  - React navigation, settings, assets, onboarding, about, bookmarks, Daily Wird, and search are static or invented preview flows rather than Svelte parity.
  - Existing React golden/offline tests pass because they assert route existence and generic accessibility, not Svelte behavior, data completeness, persistence, or real assets.

Audit oracle: current working Svelte source, CSS, and locally served Svelte production runtime. Later design prose was not used as expected behavior.

## Issue Index

| ID | Severity | Surface | React route | Svelte route | Status |
| --- | --- | --- | --- | --- | --- |
| RPA-001 | P0 | Launch / onboarding gate | `/`, empty hash | `/`, empty hash | React-only launch behavior mismatch |
| RPA-002 | P0 | Reader / data loading | `#/s/1`, `#/s/1/1` | `#/s/1`, `#/s/1/1` | React-only data fallback |
| RPA-003 | P0 | Mushaf | `#/m/1` | `#/m/1` | React-only placeholder rendering |
| RPA-004 | P1 | Navigation / bookmarks | `#/s/1`, `#/surahs`, `#/bookmarks` | same | React-only workflow gaps |
| RPA-005 | P1 | Settings / assets | `#/settings`, `#/assets` | same | React-only static controls |
| RPA-006 | P1 | Search | `#/search`, `#/search?q=mercy` | same | Route contract conflict; React fake route, Svelte 404 |
| RPA-007 | P1 | Onboarding | `#/onboarding` | `#/onboarding` | React-only collapsed setup flow |
| RPA-008 | P1 | Daily Wird | `#/s/1` | `#/s/1` | React-only static state |
| RPA-009 | P2 | About / product claims | `#/about` | `#/about` | React-only content and action gaps |
| RPA-010 | P1 | PWA / offline | `#/s/1` | `#/s/1` | React-only offline data failure masked by fallback |
| RPA-011 | P1 | Test coverage | React golden/offline specs | Svelte parity runtime | Existing tests falsely pass |
| RPA-012 | P2 | Responsiveness / a11y basics | `#/s/1`, `#/settings`, `#/assets` | same | React touch/chrome parity gaps |

## Issues

### RPA-001: React Fresh Launch Bypasses First-Run Onboarding

- Severity: P0
- Surface: Launch / onboarding gate
- React route: `/` and empty hash
- Svelte route: `/` and empty hash
- Reproduction steps:
  1. Clear IndexedDB, Cache Storage, and service-worker registration for each target.
  2. Open Svelte `/`.
  3. Open React `/`.
- Expected Svelte behavior: clean launch routes to `#/onboarding` and shows the first-run QuranAtlas welcome/begin flow.
- Actual React behavior: clean launch immediately normalizes to `#/s/1` and renders the reader preview.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/launch-root-clean-react-phone-standard.png`
- Suspected owner/files: `src-react/app/App.tsx`, `src-react/app/router/routes.ts`, `src-react/app/routes/onboarding/OnboardingRoute.tsx`, React storage/launch restore wiring.
- Existing test coverage missed this because: `tests/e2e/navigate/react-golden.spec.ts` expects an empty hash to become `#/s/1`, which encodes the wrong production parity contract for a fresh browser.
- Proposed fix direction: port the Svelte launch restore/onboarding gate semantics before any production flip: read `settings.onboardingComplete`, route clean installs to `#/onboarding`, and only restore reader surfaces after onboarding is complete.
- Verification needed after fix: clean-context Playwright production preview test comparing Svelte and React `/` and empty-hash behavior, including IndexedDB assertion for `settings.onboardingComplete`.

### RPA-002: React Reader Uses Hardcoded Preview Verses Instead Of Real Corpus

- Severity: P0
- Surface: Reader
- React route: `#/s/1`, `#/s/1/1`
- Svelte route: `#/s/1`, `#/s/1/1`
- Reproduction steps:
  1. Seed onboarded baseline settings.
  2. Open `#/s/1` and `#/s/1/1` on mobile and desktop.
  3. Compare rendered verse count, Arabic text, translation, tafsir interaction, and metadata against Svelte.
- Expected Svelte behavior: Svelte renders the full 7-verse Al-Fatihah reader with Surah header, standalone bismillah, Qalun Arabic text, Bridges translation, footnote controls, tafsir preview/sheet behavior, and reader chrome.
- Actual React behavior: React renders only 2 preview verses for Surah 1, shows a static Daily Wird card above reader content, lacks the Svelte Surah header/progress/chrome, and uses fallback text after attempting the wrong Quran text asset path.
- Console/page errors: none online; fallback swallows the data-loading failure.
- Network failures: offline reload exposes failed requests to `http://127.0.0.1:4181/dataset/quran-text/qaloon/uthmani/001.json` and `http://127.0.0.1:4181/dataset/knowledge/ayah/001.json`.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/reader-surah-1-mobile-react-phone-standard.png`
- Suspected owner/files: `src-react/data/reader-corpus.ts`, `src-react/app/routes/read/ReaderRoute.tsx`, `src-react/components/reader/VirtualVerseList.tsx`, `src-react/components/reader/VerseBlock.tsx`.
- Existing test coverage missed this because: `tests/e2e/read/react-golden.spec.ts` checks that a `main` named "Verse reader" exists and that `verse-2:255` appears for one deeplink, but it does not compare verse counts, actual dataset paths, translations, tafsir, or Svelte DOM behavior.
- Proposed fix direction: remove hardcoded fallback as a product path; use the real dataset asset ids (`uthmani-kfgqpc-v1` for current seeded baseline), surface install/unavailable states instead of silent preview fallback, and port Svelte reader rendering/interaction semantics before enabling production routing.
- Verification needed after fix: production preview Playwright assertions for Surah 1 verse count, expected Qalun Arabic snippets, Bridges translation text, footnote opening, tafsir preview, and no fallback data requests.

### RPA-003: React Mushaf Shows Placeholder SVG Instead Of Real Page Asset

- Severity: P0
- Surface: Mushaf
- React route: `#/m/1`
- Svelte route: `#/m/1`
- Reproduction steps:
  1. Build Svelte with baseline Mushaf pages present.
  2. Open `#/m/1` on Svelte and React at `375x812` and `768x1024`.
  3. Inspect the visible page body.
- Expected Svelte behavior: Svelte renders the real Qalun page SVG, unframed, with mobile header and bottom page/mode controls.
- Actual React behavior: React renders a gray placeholder rectangle with `aria-label="Mushaf page placeholder"` and never loads `/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/...`.
- Console/page errors: none.
- Network failures: none; React does not attempt the real page asset.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/mushaf-page-1-mobile-react-phone-standard.png`
- Suspected owner/files: `src-react/app/routes/read/MushafRoute.tsx`, `src-react/components/reader/MushafPageViewer.tsx`, `src-react/packs/**`.
- Existing test coverage missed this because: the React Mushaf golden test only checks for the Mushaf main landmark and Auto/Page/Width tabs, not for real SVG page content or Svelte page layout.
- Proposed fix direction: port Svelte Mushaf manifest loading, page SVG fetch/sanitize/render, view-mode sizing, active asset gating, and install-before-activate behavior. Placeholder SVG must be test-only or removed from production-target builds.
- Verification needed after fix: production preview Playwright test that asserts a real page SVG viewBox/body is loaded from the edition-aware dataset path and that the placeholder label is absent.

### RPA-004: React Navigation And Bookmarks Are Static And Not Svelte Parity

- Severity: P1
- Surface: Navigation / bookmarks
- React route: `#/s/1`, `#/surahs`, `#/bookmarks`
- Svelte route: `#/s/1`, `#/surahs`, `#/bookmarks`
- Reproduction steps:
  1. Seed onboarded state and one bookmark for `qaloon:1:1`.
  2. On mobile reader, click the navigation button.
  3. Open `#/surahs` and `#/bookmarks` on desktop.
- Expected Svelte behavior: mobile opens the full navigation drawer with Daily Wird, Verse/Mushaf switch, Surah/Juz/Bookmarks controls, search, current-state rows, and bookmark jump/delete behavior. Desktop Surah directory shows all 114 rows and Bookmarks reads the seeded bookmark from IndexedDB.
- Actual React behavior: reader navigation button has no drawer behavior in the tested production build; `#/surahs` shows only hardcoded rows 1, 2, and 67; `#/bookmarks` always says "No bookmarks for the active riwayah" despite seeded bookmark data.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/surah-directory-desktop-react-desktop.png`
- Suspected owner/files: `src-react/components/reader/ReaderChrome.tsx`, `src-react/components/navigation/SurahList.tsx`, `src-react/app/routes/navigation/SurahsRoute.tsx`, `src-react/app/routes/navigation/BookmarksRoute.tsx`, `src-react/components/navigation/BookmarksList.tsx`, `src-react/continuity/bookmarks/**`.
- Existing test coverage missed this because: `tests/e2e/navigate/react-golden.spec.ts` expects the Bookmarks route to show "No bookmarks" even for the `bookmarks-populated` fixture, and Surah coverage only focuses the first "Open" button.
- Proposed fix direction: wire the React drawer opener, use the real Surah/Juz/bookmark data sources, read/write the shared bookmark store, and port Svelte drawer/page interactions before production routing.
- Verification needed after fix: production preview Playwright tests that seed bookmarks, open drawer, filter Surahs, navigate to a Surah, jump/delete a bookmark, and assert all 114 Surah rows are available.

### RPA-005: React Settings And Assets Are Static Pages, Not Operational Svelte Controls

- Severity: P1
- Surface: Settings / assets
- React route: `#/settings`, `#/assets`
- Svelte route: `#/settings`, `#/assets`
- Reproduction steps:
  1. Seed `lastSurface = #/s/1`.
  2. Open `#/settings` on mobile and desktop.
  3. Toggle Show Translation and adjust sliders.
  4. Open `#/assets`.
- Expected Svelte behavior: `#/settings` is a transient route that restores `#/s/1` and opens the mode-aware settings shell over the reader. Controls update persisted settings and live reader preview. `#/assets` shows the operational asset-management route with active bundle summary, verify action, grouped text/Mushaf/translation/tafsir rows, install/delete/activate states, and Back to Reader.
- Actual React behavior: `#/settings` stays as a standalone page; controls are local React primitive state and do not prove persisted Svelte settings behavior. `#/assets` shows three static rows: Qalun text, Hafs Mushaf pages, and Search index.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/settings-mobile-react-phone-standard.png`
- Suspected owner/files: `src-react/app/routes/settings/SettingsRoute.tsx`, `src-react/components/settings/VerseSettings.tsx`, `src-react/components/settings/SourcePicker.tsx`, `src-react/components/offline/AssetManagementPage.tsx`, `src-react/storage/settings-writer.ts`, `src-react/offline/**`.
- Existing test coverage missed this because: React configure tests check headings and static text, not route restoration, persistence, live reader updates, install verification, active-asset deletion blocking, or Svelte row inventory.
- Proposed fix direction: port Svelte settings route behavior and asset-management view-model semantics, including real settings writers, asset indexes, Cache Storage verification, and route restoration.
- Verification needed after fix: production preview tests for `#/settings` returning to the reader hash, persisted settings changes, Manage Assets navigation/back behavior, and asset row states derived from real indexes/cache membership.

### RPA-006: Search Route Contract Is Not Parity And React Shows A Fake Preview Search

- Severity: P1
- Surface: Search
- React route: `#/search`, `#/search?q=mercy`
- Svelte route: `#/search`, `#/search?q=mercy`
- Reproduction steps:
  1. Open `#/search` and `#/search?q=mercy` on both targets.
  2. Type `mercy` into the React search input.
- Expected Svelte behavior: current Svelte runtime routes `#/search` to the not-found page. Since Svelte source/runtime is the parity oracle for this audit, React must not imply a shipped Svelte-equivalent search workflow unless the route contract is deliberately changed.
- Actual React behavior: React exposes a Search page backed by an in-memory `PREVIEW_SHARD`; query params are ignored on first render and `#/search?q=mercy` still shows "No verified results yet" until manual typing.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/search-query-desktop-react-desktop.png`
- Suspected owner/files: `src-react/components/search/SearchPage.tsx`, `src-react/search/**`, `src-react/app/router/routes.ts`.
- Existing test coverage missed this because: the React golden test asserts the preview shard result "Most Compassionate Most Merciful" after typing, while Svelte has no matching shipped route and no real generated search index route in this build.
- Proposed fix direction: decide the product route contract before production flip. Either keep React aligned to current Svelte not-found behavior or implement the full Svelte-approved search route/data/index workflow in both parity baseline and React.
- Verification needed after fix: route-contract test comparing Svelte and React for `#/search` plus real search index state tests if search is promoted.

### RPA-007: React Onboarding Is A Single Static Card, Not The Svelte Setup Flow

- Severity: P1
- Surface: Onboarding
- React route: `#/onboarding`
- Svelte route: `#/onboarding`
- Reproduction steps:
  1. Clear browser storage.
  2. Open `#/onboarding` at `320x568`.
  3. Click the primary action.
- Expected Svelte behavior: Svelte onboarding presents the multi-step setup flow: welcome, theme, riwayah, translation, shortcuts, and start reading, with selections persisted through the same configure writers and ambient chrome hidden.
- Actual React behavior: React displays one "Reader setup / Start reading" card and "Open Al-Fatihah"; after clicking, it routes directly to `#/s/1` and does not prove persisted onboarding state or source selection.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/onboarding-mobile-react-phone-small.png`
- Suspected owner/files: `src-react/app/routes/onboarding/OnboardingRoute.tsx`, React settings/storage writers.
- Existing test coverage missed this because: React onboarding tests only assert that the route mounts/no overflow/axe clean, not Svelte step count, state writes, or selected source behavior.
- Proposed fix direction: port Svelte onboarding state machine and settings writes, then connect launch gating from RPA-001.
- Verification needed after fix: clean-context Playwright walkthrough of every onboarding step with IDB assertions and final reader navigation.

### RPA-008: Daily Wird Is Static And Does Not Match Svelte Continuity Behavior

- Severity: P1
- Surface: Daily Wird
- React route: `#/s/1`
- Svelte route: `#/s/1`
- Reproduction steps:
  1. Open reader route on React and Svelte.
  2. Inspect Daily Wird state and create/continue controls.
  3. Run existing React golden tests for `daily-wird-no-plan` and `daily-wird-active`.
- Expected Svelte behavior: Daily Wird state is reader-continuity data stored in `settings.wirdPlan`; no-plan, plan editor, active progress, continue routing, and reminder state are surfaced through the drawer/card workflow.
- Actual React behavior: reader always renders a static no-plan Daily Wird card with a Create plan button, and the route code passes `plan={null}` directly. Existing `daily-wird-active` React golden tests still pass because they only check the generic Verse reader route.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/reader-surah-1-mobile-react-phone-standard.png`
- Suspected owner/files: `src-react/app/routes/read/ReaderRoute.tsx`, `src-react/components/reader/wird/DailyWirdCard.tsx`, `src-react/continuity/wird/**`, `src-react/components/navigation/wird/**`.
- Existing test coverage missed this because: `tests/e2e/read/react-golden.spec.ts` treats `daily-wird-active` as a reader-main visibility test and does not seed/assert active progress or Continue behavior.
- Proposed fix direction: wire React Daily Wird to the shared v7 settings key, port no-plan/create/edit/continue/progress behavior, and remove static `plan={null}` in route code.
- Verification needed after fix: Playwright tests for no-plan state, create plan, active plan progress, Continue route, and persistence across reload.

### RPA-009: React About Page Omits Svelte Content And Makes Unsupported Product Claims

- Severity: P2
- Surface: About
- React route: `#/about`
- Svelte route: `#/about`
- Reproduction steps:
  1. Open `#/about` on both targets.
  2. Compare visible mission, Arabic blessing, attribution, PWA install state, version/footer, and clear-data action.
- Expected Svelte behavior: Svelte renders the QuranAtlas mission, Arabic 54:17 blessing and translation, attribution list, PWA install button when available, version line, and Clear all data link/dialog.
- Actual React behavior: React shows a very short About page saying QuranAtlas provides verified reader, navigation, settings, search, bookmarks, and Daily Wird workflows. It omits Svelte attribution/install/clear-data behavior and claims verified workflows that are not verified in the React production target.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/about-desktop-react-desktop.png`
- Suspected owner/files: `src-react/app/routes/settings/AboutRoute.tsx`, `src-react/design-system/recipes/settings-page.tsx`.
- Existing test coverage missed this because: React configure tests only look for preview-specific text, not Svelte about content or clear-data/PWA behavior.
- Proposed fix direction: port the Svelte About surface content/actions or keep the route out of production until parity exists; remove unsupported "verified" claims from production-target React.
- Verification needed after fix: content/action comparison against Svelte, including Clear all data dialog and PWA install affordance state.

### RPA-010: React Offline Reload Passes App-Shell Test While Data Requests Fail

- Severity: P1
- Surface: PWA / offline
- React route: `#/s/1`
- Svelte route: `#/s/1`
- Reproduction steps:
  1. Open React production preview `#/s/1`.
  2. Wait for service worker ready.
  3. Reload once online, set browser context offline, reload again.
  4. Compare network captures with Svelte.
- Expected Svelte behavior: Svelte service worker serves app shell and dataset from cache with no failed reader data requests after app-shell cache is established.
- Actual React behavior: service worker becomes ready and app shell reloads, but offline reload logs failed requests for `/dataset/quran-text/qaloon/uthmani/001.json` and `/dataset/knowledge/ayah/001.json`. The UI still shows fallback preview verses, masking offline data failure.
- Console/page errors: two `Failed to load resource: net::ERR_INTERNET_DISCONNECTED` console errors in React offline scenario.
- Network failures: `http://127.0.0.1:4181/dataset/quran-text/qaloon/uthmani/001.json`, `http://127.0.0.1:4181/dataset/knowledge/ayah/001.json`.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/offline-reader-reload-react-desktop.png`
- Suspected owner/files: `vite.react.config.js`, `src-react/data/reader-corpus.ts`, `src-react/metadata/knowledge.ts`, `tests/e2e/fixtures/react-offline.ts`.
- Existing test coverage missed this because: `expectOfflineReaderLoads` only asserts `#react-root` and a Verse reader main landmark after offline reload. It does not fail on console/network errors or assert real dataset-backed content.
- Proposed fix direction: use real app-shell plus data-cache parity with Svelte, cache/verify required dataset paths, remove silent fallback, and fail tests on failed dataset requests.
- Verification needed after fix: offline production preview test that asserts no request failures for required reader data and that the rendered verses come from cached dataset content.

### RPA-011: React Golden/Offline Tests Are False-Passing Against Preview Skeletons

- Severity: P1
- Surface: Test coverage
- React route: all React golden/offline routes
- Svelte route: Svelte parity runtime
- Reproduction steps:
  1. Run `pnpm run test:e2e:react:golden`.
  2. Run `pnpm run test:e2e:react:offline`.
  3. Compare against manual production-target audit evidence.
- Expected Svelte behavior: parity gates should fail when React renders preview-only data, fake assets, incomplete route behavior, or missing persistence.
- Actual React behavior: 35 golden/a11y tests and 1 offline test pass even though the React production-target build fails core parity on reader, Mushaf, navigation, settings, assets, onboarding, Daily Wird, search, and about.
- Console/page errors: none from test commands.
- Network failures: not asserted by existing tests.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/reader-surah-1-mobile-react-phone-standard.png`
- Suspected owner/files: `tests/e2e/read/react-golden.spec.ts`, `tests/e2e/navigate/react-golden.spec.ts`, `tests/e2e/configure/react-golden.spec.ts`, `tests/e2e/infra/react-offline.spec.ts`, `tests/e2e/fixtures/react-golden-routes.ts`, `tests/e2e/fixtures/react-offline.ts`.
- Existing test coverage missed this because: the tests assert route landmarks, headings, static text, no horizontal overflow, axe clean, and first-control touch target. They do not compare Svelte behavior, real data counts, persistence, route restoration, network failures, or installed asset semantics.
- Proposed fix direction: replace "React surface exists" golden checks with Svelte parity assertions and production-target preview checks. Add console/network failure guards and fixture seeding that must affect rendered output.
- Verification needed after fix: intentionally break one expected Svelte parity invariant, confirm the React parity suite fails, then restore.

### RPA-012: React Responsive Chrome And Touch Targets Do Not Match Svelte Basics

- Severity: P2
- Surface: Responsiveness / accessibility basics
- React route: `#/s/1`, `#/settings`, `#/assets`
- Svelte route: same
- Reproduction steps:
  1. Open reader at `320x568`, `375x812`, `768x1024`, and `1280x900`.
  2. Compare chrome placement and button sizes.
  3. Tab through reader controls and run axe scan where possible.
- Expected Svelte behavior: mobile/tablet Svelte uses the compact MarginHeader with 48px navigation/settings targets; desktop uses AmbientDock; Svelte layout changes by breakpoint while keeping reader content primary. Axe scans in the audit had no reported violations.
- Actual React behavior: the same large top product header appears across phone/tablet/desktop, with duplicated QuranAtlas text and reader chrome consuming the first viewport. Mobile reader icon buttons measure 40x40 instead of Svelte's 48x48 targets. Axe did not report violations, but parity/accessibility touch-target behavior is weaker than Svelte.
- Console/page errors: none.
- Network failures: none.
- Screenshot path: `.scratch/react-production-parity-audit/screenshots/responsive-320-reader-react-phone-small.png`
- Suspected owner/files: `src-react/app/App.tsx`, `src-react/components/reader/ReaderChrome.tsx`, `src-react/components/ui/icon-button.tsx`, React layout recipes.
- Existing test coverage missed this because: touch-target helper is only applied to the first button in selected tests, and no test compares Svelte responsive chrome or breakpoint-specific behavior.
- Proposed fix direction: port Svelte responsive chrome semantics before production flip, or explicitly mark React preview chrome as non-production. Expand touch target assertions across all visible interactive controls.
- Verification needed after fix: Playwright responsive parity screenshots plus measured assertions for all visible controls at 320, 375, 768, and 1280 widths.

## Playwright Evidence

- Audit spec/script path: `.scratch/react-production-parity-audit.mjs`
- Screenshots path: `.scratch/react-production-parity-audit/screenshots/`
- Console/network capture path: `.scratch/react-production-parity-audit/console-network.json`
- Structured evidence path: `.scratch/react-production-parity-audit/evidence.json`
- Exact commands run and pass/fail results:
  - `pnpm run build` - passed.
  - `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react` - passed.
  - `pnpm exec vite preview --host 127.0.0.1 --port 4180 --strictPort` - started Svelte reference server.
  - `pnpm exec vite preview --config vite.react.config.js --host 127.0.0.1 --port 4181 --strictPort` - started React production-target server.
  - `node .scratch/react-production-parity-audit.mjs` - passed; 46 target/scenario results.
  - `pnpm run test:e2e:react:golden` - passed; 35 tests.
  - `pnpm run test:e2e:react:offline` - passed; 1 test.

The audit used desktop and mobile/tablet viewports: `320x568`, `375x812`, `768x1024`, and `1280x900`. It collected visible state, screenshots, console warnings/errors, page errors, HTTP failures, request failures, offline reload behavior, keyboard tab traversal, touch-target measurements, and axe scans where possible.
