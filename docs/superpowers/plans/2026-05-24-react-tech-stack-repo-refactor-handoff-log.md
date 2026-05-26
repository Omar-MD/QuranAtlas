# React Tech Stack Repo Refactor Handoff Log

This is the single coordination log for the React refactor and React production
parity work. Keep entries current-state focused and concise. Do not duplicate
completed historical waves here unless they affect the active production parity
track.

Each entry should include:

- Status: complete, partial, blocked, or retired.
- Summary: what landed and which plan items it satisfies.
- Divergence: anything that changed from the child plan or master spec, or
  `none`.
- Blockers and follow-ups: include owner or next decision when known.
- Tests and validation: commands run, results, and why anything could not run.
- Dependency intake: package, tool, data, or environment changes, or `none`.
- Files changed and commits: exact paths and commit SHAs when available.
- Next-agent note: the shortest useful warning or starting point for the next
  child plan.

## 2026-05-26 - React Production Parity Fix 00 Wave 1

- Status: complete.
- Summary: completed Plan 00 by converting React golden/offline proof from
  React-only route smoke checks into production-target Svelte-vs-React parity
  harness work. React parity Playwright commands now build Svelte `dist/` and
  production-target React `dist-react/`, serve both on strict preview ports,
  and assert a React production deploy-target marker before route checks.
  Golden assertions now fail on named audit classes for clean launch,
  dataset-backed Al-Fatihah, real Mushaf SVG, Surah row count, seeded
  bookmarks, settings route restoration, asset groups, About copy/clear-data,
  search route contract, Daily Wird seed effects, and offline dataset request
  failures. Boundary and registry gates now have focused unit coverage and
  reject Svelte style imports, Svelte `qa-*` styling classes in React feature
  code, missing named exports, and covered visual proof without references.
- Divergence: this wave intentionally did not fix React product behavior; Plan
  00 is harness-only, so the new parity e2e assertions are expected to fail
  until later child plans repair the owned surfaces.
- Blockers and follow-ups: none for Plan 00. The full golden and offline
  suites intentionally remain red on downstream product parity issues until
  later behavior plans close their owned `RPA-*` failures.
- Tests and validation: `pnpm run test:e2e:react:golden -- --grep
  "reader-surah-start phone-small" --reporter=line` rebuilt both targets but
  failed with Playwright argument forwarding (`No tests found`); reran the
  built artifacts directly with `env -u NO_COLOR PLAYWRIGHT_REACT_PARITY=1
  PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test --config
  playwright.react.config.js tests/e2e/read/react-golden.spec.ts --grep
  "reader-surah-start phone-small" --reporter=line`, which failed as expected
  on `RPA-002` (`verse-1:7` missing). `env -u NO_COLOR
  PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_REACT_PARITY=1
  PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test --config
  playwright.react.config.js tests/e2e/infra/react-offline.spec.ts
  --reporter=line` failed as expected on `RPA-010` request/console guards for
  offline dataset failures. `pnpm exec vitest run tests/unit/react-registry
  --config vitest.react.config.ts` passed with 3 files / 9 tests. `pnpm run
  check:react-registry`, `pnpm run check:react-ui-patterns`, and `pnpm run
  check:react` passed. Completion reconciliation reran the full
  `pnpm run test:e2e:react:golden` command: production builds succeeded, the
  harness ran 37 tests, 12 passed, and 25 failed with named downstream parity
  messages for `RPA-002`, `RPA-003`, `RPA-004`, `RPA-005`, `RPA-006`,
  `RPA-008`, and `RPA-009`. `pnpm run test:e2e:react:offline` built both
  targets and failed as expected on required offline dataset request failures
  for `RPA-010`.
- Dependency intake: none.
- Files changed and commits: `package.json`; `playwright.react.config.js`;
  `vite.react.config.js`; `scripts/check-react-boundaries.mjs`;
  `scripts/check-react-component-registry.mjs`;
  `tests/e2e/fixtures/react-golden-routes.ts`;
  `tests/e2e/fixtures/react-offline.ts`;
  `tests/e2e/read/react-golden.spec.ts`;
  `tests/e2e/navigate/react-golden.spec.ts`;
  `tests/e2e/configure/react-golden.spec.ts`;
  `tests/e2e/onboard/react-golden.spec.ts`;
  `tests/e2e/infra/react-offline.spec.ts`;
  `tests/unit/react-registry/check-react-boundaries.test.mjs`;
  `tests/unit/react-registry/check-react-component-registry.test.mjs`;
  `docs/tech-stack.md`; this handoff log. No commit yet.
- Next-agent note: generated `dist-react/` and dataset manifest/provenance
  changes from the verification build were reverted because they are proof
  outputs, not source edits. The new parity e2e suites are red by design until
  the downstream React behavior plans close their RPA issues.

## 2026-05-26 - React Production Parity Fix 01 Wave 1

- Status: complete.
- Summary: completed Plan 01 for `RPA-001` and
  `RPA-007`. React clean launch now has an explicit `#/` launch route, gates
  incomplete storage to `#/onboarding`, restores valid last reader surfaces
  only after onboarding completion, and persists launchable surfaces back to
  `settings.lastSurface`. React onboarding is now a controlled two-step
  Riwayah plus Translation flow backed by runtime source metadata, with
  disabled unavailable sources, focus handoff between steps, atomic completion
  writes for `settings.onboardingComplete`, `settings.riwayah`, and
  `settings.translationId`, hidden ambient shell chrome during onboarding,
  44px onboarding touch targets, and production golden proof through `#/s/1`
  across 320, 375, 768, and 1280 px widths.
- Divergence: React intentionally keeps the shortened onboarding contract from
  the child plan and does not port Svelte theme, shortcuts, reading preference,
  offline expectation, Daily Wird, or later onboarding screens. The route
  canonicalization updates `window.history` without feeding the restored hash
  back into React state, preventing a redundant onboarding remount and aborted
  source-index request during clean launch.
- Blockers and follow-ups: none for Plan 01. Broader React parity still
  remains red on later RPA issues such as reader corpus, Mushaf assets,
  navigation depth, settings overlays, search, Daily Wird, and offline final
  gates.
- Tests and validation: red checkpoint first failed on missing
  `loadLaunchRouteFromDb`, `writeOnboardingCompletion`, `onboarding-flow`, and
  the old clean-hash `#/s/1` expectation. Final validation passed:
  `pnpm exec vitest run tests/unit/react-continuity tests/unit/react-shell
  tests/unit/react-storage tests/unit/react-navigate --config
  vitest.react.config.ts`; `pnpm run check:react`; `pnpm run
  check:react-registry`; `pnpm run check:react-ui-patterns`; `pnpm run
  build`; `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react`;
  `env -u NO_COLOR PLAYWRIGHT_REACT_PARITY=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm
  exec playwright test --config playwright.react.config.js
  tests/e2e/onboard/react-golden.spec.ts
  tests/e2e/navigate/react-golden.spec.ts --grep
  "launch-fresh-onboarding|launch-restore-reader" --reporter=line`; `pnpm run
  build:storybook:react`; `pnpm run test:storybook:react`; and `pnpm run
  docs:check`. The first Storybook test run failed during Vite optimizer
  reload after dependency optimization; the immediate rerun passed with 9 files
  / 13 tests. Completion reconciliation expanded the launch/onboarding golden
  proof to include keyboard traversal, no partial writes before final
  completion, tokenized selected/disabled state checks, touch targets, reload
  restore after completion, and tablet/desktop widths; the targeted
  production slice passed 6/6 tests.
- Dependency intake: none.
- Files changed and commits: `src-react/app/App.tsx`;
  `src-react/app/router/routes.ts`;
  `src-react/app/routes/onboarding/OnboardingRoute.tsx`;
  `src-react/app/routes/onboarding/onboarding-flow.ts`;
  `src-react/continuity/launch-restore.ts`;
  `src-react/continuity/last-surface.ts`;
  `src-react/data/source-index.ts`;
  `src-react/storage/settings-writer.ts`;
  `src-react/storage/types.ts`;
  `src-react/components/settings/settings.stories.tsx`;
  `src-react/design-system/registry/component-registry.json`;
  `tests/unit/react-continuity/continuity-wave3.test.ts`;
  `tests/unit/react-shell/routes.test.ts`;
  `tests/unit/react-storage/db-schema.test.ts`;
  `tests/unit/react-navigate/navigation-wave3.test.tsx`;
  `tests/unit/react-navigate/onboarding-flow.test.ts`;
  `tests/e2e/onboard/react-golden.spec.ts`; this handoff log. No commit yet.
- Next-agent note: start the next wave from Plan 02 reader corpus and verse
  interactions; avoid expanding onboarding beyond the intentional two-step
  React contract.

## 2026-05-26 - React Production Parity Fix 02 Wave 1

- Status: complete.
- Summary: completed Plan 02 for `RPA-002`. React Verse reader now loads the
  real variant-aware Quran corpus from
  `/dataset/quran-text/{riwayah}/{quranTextStyleId}/{surah}.json`, defaults to
  `uthmani-kfgqpc-v1`, resolves Bridges translations through the Hafs-keyed
  alias table for Qalun/Warsh, renders Surah 1 with seven dataset-backed
  verses, Basmala, Svelte-matched KFGQPC/Newsreader typography, faded verse
  dividers, the centered intrinsic Surah title header, Svelte reader column
  caps and verse padding variables, block-level translation footnotes,
  end-positioned verse numbers, full-width LTR translation rows, Svelte-style
  previous/next Surah quick navigation chevrons from `/dataset/surahs.json`,
  verse selection, optional knowledge metadata, and current-position writes.
  Silent React preview fallback verses were removed and missing required text
  now surfaces explicit unavailable or error states. React still intentionally
  omits Tafsir preview and sheet UI.
- Divergence: added a React Vite dev/preview middleware that serves the root
  `public/dataset/**` and `public/fonts/**` trees at same-origin paths for
  parity proof. React list rendering now uses normal document scroll instead
  of the nested virtual scroller because the virtual container could lock or
  jump in long-reader routes; the component name remains `VirtualVerseList`
  until later cleanup or safe measured virtualization work.
- Blockers and follow-ups: none for Plan 02. Plan 03 still owns Mushaf real
  asset loading; Plan 04 still owns drawer, Surah/Juz lists, and bookmark
  persistence UI; Plan 06 still owns Daily Wird rendering.
- Tests and validation: red checkpoint failed as expected on the old
  `/dataset/quran-text/qaloon/uthmani/001.json` path, fallback preview verses,
  missing unavailable state, and missing Basmala/full Al-Fatihah render.
  Final validation passed: `pnpm exec vitest run tests/unit/react-read
  tests/unit/react-metadata --config vitest.react.config.ts`; `pnpm run
  check:react`; `pnpm run check:react-registry`; `pnpm run
  check:react-ui-patterns`; `pnpm run build`; `VITE_QURANATLAS_DEPLOY_TARGET=production
  pnpm run build:react`; direct production parity slice `env -u NO_COLOR
  PLAYWRIGHT_REACT_PARITY=1 PLAYWRIGHT_USE_PREVIEW=1 REACT_PARITY_PORT=4287
  SVELTE_PARITY_PORT=4286 pnpm exec playwright test --config
  playwright.react.config.js tests/e2e/read/react-golden.spec.ts --grep
  "reader-surah-start|reader-ayah-deeplink" --reporter=line` passed 6/6;
  `pnpm run build:storybook:react`; `pnpm run test:storybook:react`; `pnpm run
  docs:check`; and `git diff --check`. The package-script form `pnpm run
  test:e2e:react:golden -- --grep "reader-surah-start|reader-ayah-deeplink"
  --reporter=line` rebuilt both targets but failed with Playwright argument
  forwarding (`No tests found`), so the equivalent direct Playwright command
  above was used after the successful builds. Follow-up polish validation
  passed: `pnpm exec vitest run tests/unit/react-read/reader-wave3.test.tsx
  --config vitest.react.config.ts`; `pnpm run check:react`;
  `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react`; direct
  production parity slice `env -u NO_COLOR PLAYWRIGHT_REACT_PARITY=1
  PLAYWRIGHT_USE_PREVIEW=1 REACT_PARITY_PORT=4289 SVELTE_PARITY_PORT=4288
  pnpm exec playwright test --config playwright.react.config.js
  tests/e2e/read/react-golden.spec.ts --grep
  "reader-surah-start|reader-ayah-deeplink" --reporter=line` passed 6/6;
  `pnpm run docs:check`; and `git diff --check`. Surah-header and reader
  spacing enforcement reran the targeted red/green proof with
  `reader-surah-start phone-standard` failing before the CSS layer fix and
  passing after it, then reran the same direct production parity slice on ports
  4290/4291 with 6/6 passing. The quick-navigation follow-up added a red
  unit proof for missing previous/next controls, then reran
  `pnpm exec vitest run tests/unit/react-read/reader-wave3.test.tsx --config
  vitest.react.config.ts`, `pnpm run check:react`,
  `pnpm run check:react-registry`, `pnpm run check:react-ui-patterns`,
  `VITE_QURANATLAS_DEPLOY_TARGET=production pnpm run build:react`, and the
  same direct reader production parity slice on ports 4290/4291 with 6/6
  passing.
- Dependency intake: none.
- Files changed and commits: `vite.react.config.js`; `docs/tech-stack.md`;
  `docs/context/surfaces/read.md`; `docs/context/style-map.md`;
  `src-react/data/reader-corpus.ts`; `src-react/data/verse-aliases.ts`;
  `src-react/data/surah-index.ts`;
  `src-react/metadata/knowledge.ts`; `src-react/app/routes/read/ReaderRoute.tsx`;
  `src-react/components/reader/ReaderVerseSurface.tsx`;
  `src-react/components/reader/SurahContinuityButton.tsx`;
  `src-react/components/reader/VirtualVerseList.tsx`;
  `src-react/components/reader/VerseBlock.tsx`;
  `src-react/components/reader/TranslationFootnote.tsx`;
  `src-react/components/reader/useReaderPositionSync.ts`;
  `src-react/components/reader/useVerseInteractionReducer.ts`;
  `src-react/components/reader/reader.stories.tsx`;
  `src-react/design-system/registry/component-registry.json`;
  `tests/unit/react-read/reader-wave3.test.tsx`;
  `tests/e2e/read/react-golden.spec.ts`;
  `docs/superpowers/plans/2026-05-24-react-production-parity-fix-02-reader-corpus-and-verse-interactions.md`;
  this handoff log. No commit yet.
- Next-agent note: start Plan 03 from the real Mushaf asset path/index
  contract. The React reader corpus is now dataset-backed, so downstream
  navigation/settings/offline tests should not rely on generic reader landmark
  checks or preview fallback text. Do not reintroduce a nested reader scroll
  container without viewport proof for long Surahs and ayah deeplinks.

## 2026-05-26 - React Production Parity Fix 03 Wave 1

- Status: complete.
- Summary: completed Plan 03 for `RPA-003`. React Mushaf now loads the active
  edition-aware page pack through `src-react/packs/mushaf-page-asset.ts`,
  checks `indexes/mushaf-assets.json` membership before manifest/page fetches,
  validates manifest riwayah/edition/page identity, sanitizes inline SVG
  markup, rewrites quran.ws black/white paint into React Mushaf semantic
  tokens, and renders the page through a pure `MushafPageViewer` with
  Auto/Page/Width controls and a clamped jump chip. The old production
  placeholder SVG label is gone from ready states, and missing active page
  packs show an explicit asset gate without loading Qalun under another active
  label.
- Divergence: used direct Node/Vite/Vitest/Playwright commands because this
  desktop shell had no `pnpm` executable on PATH. The commands are equivalent
  to the package scripts' underlying tools. React route proof performs the
  index-membership check before manifest fetch, avoiding expected 404 console
  noise for missing optional page packs.
- Blockers and follow-ups: none for Plan 03. Plan 05 still owns full settings
  and asset-management install/activate UI. Plan 09 still owns broad offline
  reload/cache proof.
- Tests and validation: red checkpoint failed on missing
  `src-react/packs/mushaf-page-asset`, external URL acceptance, missing
  riwayah/edition index validation, and placeholder route behavior. Final
  validation passed with bundled Node PATH: `vitest run tests/unit/react-packs
  tests/unit/react-read/reader-wave3.test.tsx --config vitest.react.config.ts`
  (5 files / 22 tests); `vitest run tests/unit/react-packs
  tests/unit/react-read/reader-wave3.test.tsx
  tests/unit/react-components/ui-components.test.tsx --config
  vitest.react.config.ts` (6 files / 28 tests); `tsc --project
  tsconfig.react.json --noEmit`; React ESLint command from `lint:react`;
  `node scripts/check-react-boundaries.mjs`; `node
  scripts/check-react-design-literals.mjs`; `node
  scripts/check-react-radix-boundaries.mjs`; `node
  scripts/check-react-component-registry.mjs`; `node
  scripts/check-react-ui-forbidden-patterns.mjs`; `node
  scripts/check-react-mushaf-assets.mjs`; `node
  scripts/check-react-mushaf-indexes.mjs`; `node scripts/data/cli.mjs build`;
  `vite build`; `VITE_QURANATLAS_DEPLOY_TARGET=production vite build --config
  vite.react.config.js`; direct production parity slice `env -u NO_COLOR
  PLAYWRIGHT_REACT_PARITY=1 PLAYWRIGHT_USE_PREVIEW=1 REACT_PARITY_PORT=4289
  SVELTE_PARITY_PORT=4286 playwright test --config
  playwright.react.config.js tests/e2e/read/react-golden.spec.ts --grep
  "mushaf-ready|mushaf-missing-pack" --reporter=line` (6/6 passed);
  `storybook build --config-dir .storybook --output-dir
  storybook-static-react`; `vitest run --config
  vitest.storybook.react.config.ts` (9 files / 18 tests); `node
  scripts/docs/derive.mjs --check`; and `git diff --check`.
- Dependency intake: none.
- Files changed and commits: `src-react/app/routes/read/MushafRoute.tsx`;
  `src-react/components/reader/MushafPageViewer.tsx`;
  `src-react/components/reader/ReaderAssetGate.tsx`;
  `src-react/components/reader/reader.stories.tsx`;
  `src-react/components/ui/form-controls.tsx`;
  `src-react/design-system/index.css`;
  `src-react/design-system/tokens/semantic.css`;
  `src-react/design-system/registry/component-registry.json`;
  `src-react/packs/mushaf-index.ts`;
  `src-react/packs/mushaf-paths.ts`;
  `src-react/packs/mushaf-page-asset.ts`;
  `tests/unit/react-packs/mushaf-paths.test.ts`;
  `tests/unit/react-packs/mushaf-install-plan.test.ts`;
  `tests/unit/react-read/reader-wave3.test.tsx`;
  `tests/e2e/fixtures/react-golden-routes.ts`;
  `tests/e2e/read/react-golden.spec.ts`;
  `docs/context/surfaces/read.md`;
  `docs/context/surfaces/infra.md`;
  `docs/context/style-map.md`;
  `docs/superpowers/plans/2026-05-24-react-production-parity-fix-03-mushaf-real-assets.md`;
  this handoff log. No commit yet.
- Next-agent note: start Plan 04 from real navigation/bookmark data. The React
  Mushaf route now depends on `indexes/mushaf-assets.json` before manifest
  fetches; missing optional page-pack tests should assert index membership and
  absence of fallback page requests, not expected manifest 404s.
