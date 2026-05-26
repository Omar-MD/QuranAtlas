# React Tech Stack Repo Refactor Handoff Log

This is the single coordination log for the React refactor child plans named by
`docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`.
Agents must read it before starting any related child plan and update it before
handing over. Do not create per-agent or per-plan handoff logs unless the master
spec is amended to name a split log explicitly.

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

## 2026-05-25 - Shared Handoff Log Policy Setup

- Status: complete.
- Summary: established this shared handoff log as the canonical React refactor
  coordination artifact; updated the reusable child-plan handover skill to
  require master-spec-declared shared logs; updated the React refactor master
  spec and child plans so related agents can discover this file before work.
- Divergence: none from product scope; process clarified from flexible
  "nearest coordination artifact" language to one constant log for this master
  track.
- Blockers and follow-ups: Plan `00` execution in the parent thread was
  interrupted before completion; do not treat that chat as a completed Plan `00`
  handoff. The next Plan `00` agent should reconcile from repo state and this
  log.
- Tests and validation: `pnpm run docs:check` passed with `derive: all clean`;
  `git diff --check` passed.
- Dependency intake: none.
- Files changed and commits: `.agents/skills/child-plan-handover/SKILL.md`;
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`;
  `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`;
  React refactor child plans `00` through `18`, including `08A`, under
  `docs/superpowers/plans/`. No commit yet.
- Next-agent note: use this file for every React refactor child-plan summary.

## 2026-05-25 - Plan 01 React App Shell And Dual Build

- Status: complete.
- Summary: added isolated React preview scaffold under `src-react/**`, React-only Vite/TypeScript/Playwright configs, non-deploy `*:react` package scripts, a React/Svelte import-boundary scanner, React shell smoke e2e coverage, and docs for the dual-build boundary.
- Divergence: none from the plan.
- Blockers and follow-ups: later plans should keep `dist-react/` proof-only and avoid copying root `public/` into React output.
- Tests and validation: `node scripts/check-react-boundaries.mjs` passed; `pnpm run build:react` passed; `pnpm run check:react` passed; `pnpm run test:e2e:react` passed with 1 test; `pnpm run build` passed and wrote `dist/`; `pnpm run check` passed; `pnpm run docs:check` passed with `derive: all clean`; `test ! -e dist-react/dataset/mushaf-pages && git diff --check` passed.
- Dependency intake: added `react` `^19.2.6`, `react-dom` `^19.2.6`, `@vitejs/plugin-react` `^6.0.2`, `@types/react` `^19.2.15`, and `@types/react-dom` `^19.2.3`. Existing `vite-plugin-pwa` peer warning against Vite 8 remains.
- Files changed and commits: `package.json`; `pnpm-lock.yaml`; `eslint.config.js`; `vite.react.config.js`; `tsconfig.react.json`; `playwright.react.config.js`; `scripts/check-react-boundaries.mjs`; `src-react/index.html`; `src-react/app/App.tsx`; `src-react/app/main.tsx`; `src-react/app/providers/AppProviders.tsx`; `src-react/app/router/routes.ts`; `src-react/styles/index.css`; `src-react/public/.gitkeep`; `tests/e2e/react-shell/smoke.spec.ts`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; `docs/context/architecture.md`; this handoff log. No commit yet.
- Next-agent note: Plan 02 can treat the Svelte app as unchanged by Plan 01; do not stage generated `dist-react/` output.

## 2026-05-25 - Plan 02 Svelte Reference Baseline

- Status: complete.
- Summary: added the Svelte reference baseline appendix with dataset profile, route-state fixture matrix, storage seeding rules, viewport/theme coverage, accepted-difference policy, and reference update policy.
- Divergence: none from the plan. No e2e helper was added because `tests/e2e/fixtures/idb.js` already exposes `seedBookmarks` for populated bookmark rows.
- Blockers and follow-ups: missing-pack, failed-asset, and Daily Wird drawer route states are named manual baseline notes until later surface plans add narrower durable helpers or app-level browser routes.
- Tests and validation: proof-owner path check passed with no missing concrete `tests/**` or `docs/ui-references/**` paths; `pnpm run docs:check` passed with `derive: all clean`; `git diff --check` passed; `git diff --name-only -- src public/dataset test-output` produced no output.
- Dependency intake: none.
- Files changed and commits: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`; this handoff log. No commit yet.
- Next-agent note: Plan 03 can use the appendix fixture ids as the frozen Svelte parity reference; do not treat manual notes as accepted React differences.

## 2026-05-25 - Plan 03 Tokens And Tailwind v4 Design System

- Status: complete.
- Summary: added React-only primitive and semantic token files, a prefixed Tailwind v4 theme, the React design-system CSS entry, token usage docs, a measured-layout allowlist, a React-only design literal scanner, scanner unit coverage, and wired Tailwind only into `vite.react.config.js`.
- Divergence: added `tests/unit/**/*.test.mjs` to `vitest.config.js` so the planned `.test.mjs` unit fixture under `tests/unit/**` is discovered by Vitest.
- Blockers and follow-ups: none for Plan 03. Later component plans must keep Tailwind usage behind the `qar:` prefix and semantic token theme.
- Tests and validation: `pnpm run check:react:design` passed; `pnpm exec vitest run tests/unit/react-design-system/check-react-design-literals.test.mjs` passed with 2 tests; `pnpm run check:react` passed; `pnpm run build:react` passed; `pnpm run check` passed; `pnpm run docs:check && git diff --check && ( ! rg -n "@tailwindcss/vite|tailwindcss" vite.config.js src/styles )` passed.
- Dependency intake: added `tailwindcss` `^4.3.0` and `@tailwindcss/vite` `^4.3.0`. Existing `vite-plugin-pwa` peer warning against Vite 8 remains.
- Files changed and commits: `package.json`; `pnpm-lock.yaml`; `vite.react.config.js`; `vitest.config.js`; `src-react/app/App.tsx`; `src-react/app/main.tsx`; `src-react/design-system/**`; `scripts/check-react-design-literals.mjs`; `tests/unit/react-design-system/check-react-design-literals.test.mjs`; deleted `src-react/styles/index.css`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; this handoff log. No commit yet.
- Next-agent note: Plan 04 should import `src-react/design-system/index.css` for Storybook preview and can rely on `pnpm run check:react` to include the React design scanner.

## 2026-05-25 - Plan 04 Storybook And Component Test Harness

- Status: complete.
- Summary: added React Storybook config, theme/viewport/reduced-motion preview globals, Storybook Vitest browser-test project, React TSX Vitest config, React Testing Library shell test, React shell story, and story coverage rules.
- Divergence: did not keep `@storybook/test` because the current package is `8.6.15` and peers on Storybook 8 while current Storybook packages are `10.4.1`; Storybook 10 testing is wired through `@storybook/addon-vitest` and `@vitest/browser-playwright` instead. Added Storybook-only Vite filtering to remove the shipped Svelte PWA plugin and explicitly add Tailwind, so Storybook does not build a service worker or inherit deploy app behavior.
- Blockers and follow-ups: none. Storybook build output is generated and was removed after verification.
- Tests and validation: `pnpm run test:react` passed with 1 test; `pnpm run build:storybook:react` passed without warnings after Storybook-only Vite tuning; `pnpm run test:storybook:react` passed with 1 browser story test; `pnpm run check:react` passed; `pnpm run check` passed; `pnpm run docs:check` passed with `derive: all clean`; `git diff --check` passed; `git status --short storybook-static-react test-output` produced no output after cleanup.
- Dependency intake: added `storybook` `^10.4.1`, `@storybook/react` `10.4.1`, `@storybook/react-vite` `^10.4.1`, `@storybook/addon-a11y` `^10.4.1`, `@storybook/addon-vitest` `^10.4.1`, `@testing-library/react` `^16.3.2`, `@testing-library/user-event` `^14.6.1`, and `@vitest/browser-playwright` `4.1.5`. Existing `vite-plugin-pwa` peer warning against Vite 8 remains.
- Files changed and commits: `package.json`; `pnpm-lock.yaml`; `eslint.config.js`; `.storybook/main.ts`; `.storybook/preview.tsx`; `.storybook/vitest.setup.ts`; `vitest.react.config.ts`; `vitest.workspace.ts`; `src-react/app/App.stories.tsx`; `src-react/design-system/docs/story-requirements.md`; `tests/unit/react-shell/App.test.tsx`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; this handoff log. No commit yet.
- Next-agent note: Plan 05 can use both `pnpm run build:storybook:react` and Playwright route coverage as candidate screenshot sources; Storybook is proof evidence only, not the visual source of truth.

## 2026-05-25 - Plan 05 Visual Regression Provider Selection

- Status: complete.
- Summary: selected local Playwright screenshot baselines, documented provider comparison and privacy/baseline/update policies, added a React visual Playwright config, route screenshot spec, baseline README, stable `visual:react` script, initial desktop/mobile React shell baselines, and cleaned up two ineffective dynamic imports so the final Svelte build log is warning-free.
- Divergence: Context7 search for `Percy` matched an unrelated TypeScript compiler, so `BrowserStack Percy` was used and resolved to `/websites/browserstack`. The first attempted baseline generation used `pnpm run visual:react -- --update-snapshots`, which Playwright interpreted incorrectly; the successful baseline update command was `pnpm exec playwright test --config playwright.visual.react.config.js --update-snapshots`.
- Blockers and follow-ups: hosted providers remain blocked until Quran/Mushaf screenshot upload scope, privacy, retention, and deletion policy are explicitly approved.
- Tests and validation: Context7 `library` and `docs` were run for Chromatic, BrowserStack Percy, Argos, Loki, and Playwright; `pnpm exec playwright test --config playwright.visual.react.config.js --update-snapshots` created two baselines and passed; `pnpm run visual:react` passed with 2 tests; `pnpm run test:e2e:react` passed with 1 test; `pnpm exec vitest run tests/unit/data/riwayah-packages.test.ts tests/unit/infra/offline/offline-selector.test.ts tests/unit/read/tafsir-state.test.ts` passed with 28 tests; `pnpm run build` passed without warnings; `pnpm run check` passed; `pnpm run check:react` passed after adding React visual spec lint coverage; `pnpm run docs:check` passed with `derive: all clean`; `git diff --check` passed; `! rg -n "dist-react|visual:react|storybook-static-react" .github/workflows/deploy.yml` passed.
- Dependency intake: none.
- Files changed and commits: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md`; `package.json`; `playwright.react.config.js`; `playwright.visual.react.config.js`; `src/data/offline-client.ts`; `tests/e2e/react-visual/shell.spec.ts`; `tests/e2e/react-visual/README.md`; `tests/e2e/react-visual/__screenshots__/shell.spec.ts-snapshots/react-shell-visual-desktop-darwin.png`; `tests/e2e/react-visual/__screenshots__/shell.spec.ts-snapshots/react-shell-visual-mobile-darwin.png`; `eslint.config.js`; `docs/tech-stack.md`; this handoff log. No commit yet.
- Next-agent note: child spec 06 can graduate component primitives with local Playwright visual coverage first; do not enable hosted visual uploads without updating the decision doc.

## 2026-05-25 - Plan 06 Owned shadcn/Radix Component Layer

- Status: complete.
- Summary: added the React-owned UI layer under `src-react/components/ui/**`, `components.json`, class composition helper, Button/IconButton/form/feedback/tooltip/overlay/menu/disclosure components, stories, component tests, and Radix-boundary enforcement.
- Divergence: `SegmentedControl` is an owned tablist implementation instead of a Radix Tabs wrapper because Radix Tabs requires matching tab panels; Storybook axe caught dangling `aria-controls` when it was used as a panel-less segmented control.
- Blockers and follow-ups: none. Future React feature code must import from `src-react/components/ui` and may not import Radix directly.
- Tests and validation: Context7 Radix/shadcn docs commands completed; `pnpm exec vitest run tests/unit/react-components tests/unit/react-registry tests/unit/react-storage tests/unit/react-offline tests/unit/react-packs --config vitest.react.config.ts` passed with 26 tests; `pnpm run check:react` passed; `pnpm run validate:react` passed with 29 React tests and `build:react`; `pnpm run build:storybook:react` passed; `pnpm run test:storybook:react` passed; `pnpm run visual:react` passed with 2 tests. Final full-repo validation is recorded in the Plan 08A entry.
- Dependency intake: added Radix React primitive packages, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`.
- Files changed and commits: `components.json`; `package.json`; `pnpm-lock.yaml`; `src-react/components/ui/**`; `src-react/design-system/utils/cn.ts`; `src-react/design-system/docs/components.md`; `scripts/check-react-radix-boundaries.mjs`; `tests/unit/react-components/**`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; `docs/context/architecture.md`; `.agents/skills/quranatlas-ui-workflow/SKILL.md`; `AGENTS.md`; this handoff log. No commit yet.
- Next-agent note: the owned component layer is intentionally small; add variants only when a later product surface needs them and update the registry in the same change.

## 2026-05-25 - Plan 07 Component Registry And Agent Rules

- Status: complete.
- Summary: added the registry schema, initial component registry entries for Plan 06 exports, registry README, agent component workflow doc, registry validator, raw React UI pattern scanner, tests, `validate:react`, and agent-facing pointers to the registry.
- Divergence: none from product scope; `SegmentedControl` registry dependencies reflect its owned implementation rather than Radix Tabs after the Storybook a11y finding.
- Blockers and follow-ups: none.
- Tests and validation: `pnpm run check:react-registry` passed; `pnpm run check:react-ui-patterns` passed; registry and pattern tests passed as part of the React unit suite; `pnpm run validate:react` passed. Final full-repo validation is recorded in the Plan 08A entry.
- Dependency intake: none beyond Plan 06 packages.
- Files changed and commits: `src-react/design-system/registry/**`; `src-react/design-system/docs/agent-component-workflow.md`; `scripts/check-react-component-registry.mjs`; `scripts/check-react-ui-forbidden-patterns.mjs`; `tests/unit/react-registry/**`; `package.json`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; `AGENTS.md`; `.agents/skills/quranatlas-ui-workflow/SKILL.md`; this handoff log. No commit yet.
- Next-agent note: later product components and page recipes should extend `component-registry.json` in the same change that adds the component.

## 2026-05-25 - Plan 08 Offline Storage And Asset Pack Architecture

- Status: complete.
- Summary: added React-only Dexie v7 schema mirror, storage types, DB open/close helpers, reader asset bundle writer facade, storage error helpers, generic asset-pack status/lifecycle, Cache Storage plan helpers, React cache names, quota mapping, service-worker message contracts, UI-state mapping, and same-origin `/dataset/**` runtime URL guard.
- Divergence: Workbox/VitePWA Context7 docs were not fetched in this execution because no React service-worker implementation, VitePWA config, or Workbox strategy code was written; this plan delivered typed contracts and validators only.
- Blockers and follow-ups: no new IDB stores or service-worker behavior landed. Later installer implementation must keep install, verify, and activate separate.
- Tests and validation: `pnpm exec vitest run tests/unit/react-storage tests/unit/react-offline --config vitest.react.config.ts` passed as part of the focused React suite; `pnpm run validate:react` passed. Final full-repo validation is recorded in the Plan 08A entry.
- Dependency intake: added `dexie` `^4.4.2`.
- Files changed and commits: `src-react/storage/**`; `src-react/offline/**`; `src-react/data/runtime-boundary.ts`; `tests/unit/react-storage/**`; `tests/unit/react-offline/**`; `package.json`; `pnpm-lock.yaml`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; `docs/context/architecture.md`; `docs/context/data-model.md`; `docs/context/source-data-flow.md`; this handoff log. No commit yet.
- Next-agent note: React storage is a mirror of the existing v7 contract only; do not persist rich pack lifecycle state without an explicit schema migration plan.

## 2026-05-25 - Plan 08A Mushaf Install-On-Demand Asset Strategy

- Status: complete.
- Summary: added React-only edition-aware Mushaf path, index, cache-name, fixture, install-plan, service-worker protocol helpers, static asset/index scanners, package scripts, and tests. React rejects legacy Mushaf paths and checks `dist-react/` for page SVG bodies.
- Divergence: the index checker accepts the current generated `public/dataset/indexes/mushaf-assets.json` shape (`assets[]` with `files[]`) as well as future React pack-shaped `packs[]`, while enforcing edition-aware URLs for both.
- Blockers and follow-ups: no React service-worker installer code exists yet; later implementation must use the message contracts here and keep page bodies out of the app shell.
- Tests and validation: `pnpm run check:react-mushaf-assets` passed; Mushaf path/install-plan/scanner tests passed as part of the focused React suite; `pnpm run validate:react` passed; `pnpm run build:storybook:react` passed; `pnpm run test:storybook:react` passed; `pnpm run visual:react` passed with 2 tests; `pnpm run validate` passed with 127 Vitest files / 919 tests, production build, chunk checks, and docs check; `git diff --check` passed.
- Dependency intake: none beyond Plan 08.
- Files changed and commits: `src-react/packs/**`; `src-react/offline/mushaf-service-worker-protocol.ts`; `scripts/check-react-mushaf-assets.mjs`; `scripts/check-react-mushaf-indexes.mjs`; `tests/unit/react-packs/**`; `package.json`; `docs/tech-stack.md`; `docs/context/repo-structure.md`; `docs/context/source-data-flow.md`; this handoff log. No commit yet.
- Next-agent note: React Mushaf URLs are edition-aware only: `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/...`; legacy per-riwayah paths remain Svelte compatibility only until a later migration/removal plan owns deletion.

## 2026-05-26 - Wave 3 Plans 09-14 React Parity

- Status: complete.
- Summary: implemented React preview routes and product modules for Wave 09
  through Wave 14: Verse reader, Mushaf asset gate/page viewer, reader chrome,
  reader data and translation alias adapters, metadata lanes, navigation drawer
  and lists, settings/assets/onboarding routes, search schema/query/alias
  helpers, continuity launch restore/current position/bookmark helpers, and
  Daily Wird progress/store/components. The React app now renders routed
  preview surfaces instead of only the placeholder shell while Svelte remains
  the shipped production app.
- Divergence: React e2e proof remains under the existing React Playwright
  `tests/e2e/react-shell/**` project instead of adding separate top-level
  `read`, `navigate`, `configure`, and `search` React projects. Search landed
  as an owned runtime shard schema/query path with preview seed data; no
  generated `/dataset/search/**` output or data-build command was added in this
  wave. The React service-worker installer remains contract-only from Waves 08
  and 08A.
- Blockers and follow-ups: Wave 15 should add golden route/a11y/focus coverage
  over these routed React surfaces. Before cutover, search needs real generated
  shard output and install verification if it is kept in required parity scope.
- Tests and validation: Context7 `library` and `docs` completed for TanStack
  Virtual; `pnpm exec vitest run tests/unit/react-read tests/unit/react-navigate
  tests/unit/react-search tests/unit/react-metadata tests/unit/react-continuity
  tests/unit/react-wird --config vitest.react.config.ts` passed with 6 files /
  18 tests; `pnpm run validate:react` passed with React registry/pattern/Mushaf
  gates, 20 React test files / 47 tests, and `build:react`; `pnpm run
  test:e2e:react` passed with 2 tests; `pnpm exec playwright test --config
  playwright.visual.react.config.js --update-snapshots` regenerated desktop and
  mobile React shell baselines; `pnpm run visual:react` passed with 2 tests.
  In-app browser proof covered `#/s/1/1` at 375x812, `#/settings` at 768x1024,
  and `#/search` at 1280x900 with no horizontal overflow. Final full-repo
  validation is recorded in the conversation outcome.
- Dependency intake: added `@tanstack/react-virtual` `3.13.26`.
- Files changed and commits: `package.json`; `pnpm-lock.yaml`;
  `src-react/app/App.tsx`; `src-react/app/router/routes.ts`;
  `src-react/app/routes/**`; `src-react/components/reader/**`;
  `src-react/components/navigation/**`; `src-react/components/settings/**`;
  `src-react/components/sources/**`; `src-react/components/offline/**`;
  `src-react/components/search/**`; `src-react/continuity/**`;
  `src-react/data/reader-corpus.ts`; `src-react/data/verse-aliases.ts`;
  `src-react/metadata/**`; `src-react/search/**`;
  `src-react/offline/search/search-pack.ts`; `src-react/design-system/recipes/**`;
  `src-react/design-system/registry/component-registry.json`;
  `tests/unit/react-read/**`; `tests/unit/react-navigate/**`;
  `tests/unit/react-search/**`; `tests/unit/react-metadata/**`;
  `tests/unit/react-continuity/**`; `tests/unit/react-wird/**`;
  `tests/e2e/react-shell/wave3.spec.ts`;
  `tests/e2e/react-visual/__screenshots__/shell.spec.ts-snapshots/*.png`;
  `docs/tech-stack.md`; `docs/context/architecture.md`;
  `docs/context/data-model.md`; `docs/context/repo-structure.md`;
  `docs/context/style-map.md`; this handoff log. No commit yet.
- Next-agent note: start Wave 15 from the React routes now present in
  `src-react/app/routes/**`; keep production deploy routing on Svelte until
  the cutover plans explicitly flip it.

## 2026-05-26 - Plan 15 Golden Routes And Accessibility Gates

- Status: complete.
- Summary: added the React golden route fixture matrix, route-owned React
  Playwright specs for read/configure/navigate/onboard surfaces, React a11y and
  offline helpers, explicit React preview offline service-worker proof, query
  hash route matching, empty-hash hash normalization, touch-target and heading
  accessibility fixes, stable Wave 15 e2e scripts, and the Wave 15 appendix.
  `validate:react` now includes React static checks, registry/pattern/Mushaf
  checks, React unit/component tests, build, golden/a11y e2e, offline preview
  proof, visual regression, Storybook build/test, and docs check.
- Divergence: React offline proof required adding an isolated proof-only
  VitePWA service worker in `dist-react/` because earlier waves only delivered
  contracts. This does not alter Svelte production routing or the production
  service worker. The route fixture for first-run onboarding uses explicit
  `#/onboarding` because React does not yet implement persisted first-run
  onboarding gating.
- Blockers and follow-ups: generated production search shards and installed
  search-pack proof remain a cutover decision if search stays required parity.
  React production entry remains unapproved and unflipped.
- Tests and validation: Context7 `library` and `docs` completed for
  `vite-plugin-pwa`; `pnpm exec vitest run tests/unit/react-shell/routes.test.ts
  --config vitest.react.config.ts` failed before the query-route fix and passed
  after it; `pnpm run check:react` passed; `pnpm run test:react` passed with 21
  files / 48 tests; `pnpm run test:e2e:react:golden` passed with 35 tests;
  `pnpm run test:e2e:react:a11y` passed with 35 tests; `pnpm run
  test:e2e:react:offline` passed with 1 test after `build:react`; `pnpm run
  visual:react` passed with 2 tests after updating the selected local
  baselines; `pnpm run validate:react` passed with 37 React e2e passes and one
  offline-in-dev skip; `pnpm run validate` passed with 130 Vitest files / 927
  tests, Svelte production build, chunk checks, and docs check; `git diff
  --check` passed.
- Dependency intake: none. `vite-plugin-pwa` was already present; React now uses
  it in `vite.react.config.js` for proof-only preview service-worker output.
- Files changed and commits: `package.json`; `eslint.config.js`;
  `vite.react.config.js`; `vitest.storybook.react.config.ts`;
  `playwright.react.config.js`; `src-react/app/App.tsx`;
  `src-react/app/router/routes.ts`; `src-react/components/ui/button.tsx`;
  `src-react/components/reader/wird/DailyWirdCard.tsx`;
  `src-react/data/reader-corpus.ts`; `tests/e2e/fixtures/react-*.ts`;
  `tests/e2e/{read,configure,navigate,onboard,infra}/react-*.spec.ts`;
  `tests/unit/react-shell/routes.test.ts`;
  `tests/e2e/react-visual/__screenshots__/shell.spec.ts-snapshots/*.png`;
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-appendix.md`;
  `docs/tech-stack.md`; `docs/context/architecture.md`;
  `docs/context/source-data-flow.md`; `docs/context/style-map.md`; this handoff
  log. No commit yet.
- Next-agent note: use `pnpm run validate:react` for the complete React proof
  gate. Use `pnpm run test:e2e:react:offline` only after `pnpm run build:react`;
  default dev-server e2e intentionally skips the preview-only offline test.

## 2026-05-26 - Plan 16 Cutover Readiness

- Status: complete.
- Summary: added
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md`
  with child-wave readiness, command evidence, artifact routing readiness,
  rollback plan, soak policy, and Wave 17 handoff. The evidence explicitly keeps
  React non-production and marks production flip approval as not approved.
- Divergence: none from the plan; this wave remained evidence/docs-only beyond
  consuming the Wave 15 validation evidence.
- Blockers and follow-ups: Wave 17 is blocked until the user/stakeholder
  explicitly approves the production entry flip based on the readiness evidence.
  Wave 18 is blocked until after a successful Wave 17 production flip, soak, and
  explicit Svelte-removal approval.
- Tests and validation: same final validation as Plan 15: `pnpm run
  validate:react` passed; `pnpm run validate` passed; `git diff --check` passed.
- Dependency intake: none.
- Files changed and commits:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md`;
  this handoff log. No commit yet.
- Next-agent note: do not start Wave 17 from this repo state without explicit
  approval text or an approved artifact changing `Approval status: not approved`.
