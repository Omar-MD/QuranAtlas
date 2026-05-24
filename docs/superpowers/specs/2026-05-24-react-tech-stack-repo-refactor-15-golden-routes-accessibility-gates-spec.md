# React Tech Stack Refactor 15 - Golden Routes And Accessibility Gates Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-selection-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-09-reader-surface-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-10-navigation-settings-onboarding-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-11-search-index-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-12-curated-metadata-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-13-continuity-bookmarks-parity-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-14-daily-wird-parity-spec.md`

## Purpose

Complete React app-level proof: golden routes, accessibility gates, keyboard and
focus journeys, responsive proof, service-worker/offline proof, visual
regression gate, and Svelte-reference parity resolution.

## Current Docs Used

Context7 was used for Playwright implementation-sensitive parts of this spec.

- Command:
  `npx ctx7@latest library Playwright "How should Playwright test React app routes, screenshots, accessibility scans, storage state, service workers, offline mode, keyboard focus journeys, and multiple viewports for a Vite PWA?"`
- Selected library id: `/websites/playwright_dev`
- Command:
  `npx ctx7@latest docs /websites/playwright_dev "How should Playwright test React app routes, screenshots, accessibility scans, storage state, service workers, offline mode, keyboard focus journeys, and multiple viewports for a Vite PWA?"`
- Current-doc facts used:
  - Playwright can run accessibility scans with `@axe-core/playwright`.
  - Locator screenshot assertions can use `toHaveScreenshot`.
  - Playwright can save and reuse `storageState`.
  - Playwright can inspect service-worker-originated requests.
  - Playwright can emulate offline mode through config `use.offline`.

Exact Playwright APIs must be rechecked during implementation if the installed
Playwright version changes.

## Scope

In scope:

- Define and implement React golden route matrix.
- Add app-level accessibility scans.
- Add keyboard and focus journeys.
- Add responsive viewport proof for QuranAtlas tiers and awkward states.
- Add offline/service-worker proof for React preview build.
- Wire visual regression provider selected by child spec `05`.
- Resolve or explicitly accept Svelte-reference baseline differences.

Out of scope:

- Product feature implementation not already completed by child specs `09`-`14`.
- Replacing committed `docs/ui-references/**` with provider snapshots.
- Feeding React build output to deploy.
- Removing Svelte or changing production entry.

## Required Reads

- `AGENTS.md`
- `DESIGN.md`
- `docs/context/style-map.md`
- `docs/ui-references/README.md`
- `docs/context/architecture.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `02`, `05`, and `09` through `14`

## Golden Route Matrix

Cover at least:

- empty hash launch restore;
- `#/onboarding`;
- `#/s/1`;
- `#/s/2/255`;
- `#/m/1`;
- `#/surahs`;
- `#/bookmarks`;
- `#/settings` over a reader surface;
- `#/assets`;
- `#/about`;
- search results and search unavailable/index missing states;
- Daily Wird no-plan and active-plan states;
- asset pack not installed, installed/verified, stale/unavailable, installing,
  and failed states;
- offline mode with app shell and installed assets.

Viewports:

- `320x568`;
- `375x812`;
- `768x1024`;
- mobile landscape;
- `1280x900`;
- desktop wide where next-section or sticky chrome overlap can appear.

Themes:

- light;
- sepia;
- dark;
- reduced motion where behavior is motion-sensitive.

## Accessibility Contract

Automated and journey proof must cover:

- axe scans on fully rendered app routes;
- keyboard traversal across drawer, settings shell, nested picker, search,
  reader chrome, and Daily Wird flows;
- focus restoration after sheet/dialog close;
- icon-only accessible names;
- live/status announcements for install and search progress;
- reduced-motion behavior;
- no hover-only required controls;
- touch target checks for mobile reader controls;
- no keyboard traps.

## Allowed Files And Directories

Allowed create:

- React-specific e2e specs under the owning `tests/e2e/<surface>/**`
  directories.
- React golden-route helpers and fixtures under `tests/e2e/fixtures/**`.
- Visual-regression configuration or baselines approved by child spec `05`.
- Accessibility helper tests or setup files under `tests/e2e/**` or
  `tests/unit/**` when they are durable gates.

Allowed modify:

- React e2e/visual/a11y scripts and config.
- Existing e2e fixtures when they remain compatible with Svelte-reference proof.
- `docs/tech-stack.md`, context docs, UI-reference notes, and registry entries
  when gates, scripts, proof ownership, or current behavior changes.

Forbidden modify:

- Production entry or deploy artifact routing.
- Replacing committed `docs/ui-references/**` intent with provider snapshots.
- Deleting Svelte-reference proof before cutover.
- Weakening app-level accessibility or visual gates to pass incomplete surfaces.

## Deliverables

- React golden-route matrix with proof owners and seeded fixture strategy.
- App-level axe, keyboard, focus, responsive, offline/service-worker, and visual
  regression gates.
- Svelte-reference parity difference log with resolved or accepted product
  differences.
- Stable React e2e/visual command names and CI placement.
- Updated docs, tech-stack, registry, UI-reference notes, and agent instructions
  for any changed proof ownership or workflow.

## Acceptance Criteria

- Every golden route has a proof owner and passing result.
- Every required viewport tier is covered.
- Accessibility scans and keyboard/focus journeys pass.
- Visual regression gate is wired and passing or explicitly approved as a
  temporary local-only gate by child spec `05`.
- Svelte-reference differences are resolved or documented as accepted v1
  product differences.
- React output remains non-deploy during this spec.

## Verification

Run the React golden route command introduced by implementation, for example:

```bash
pnpm run test:e2e:react
pnpm run visual:react
pnpm run docs:check
git diff --check
```

If React runtime, build, service-worker, or accessibility tooling changes, also
run:

```bash
pnpm run check
pnpm run build:react
```

Expected result:

- React golden routes pass.
- Accessibility gates pass.
- Visual regression gate passes.
- Docs checks are clean.

## Rollback And Failure Handling

- If a golden route flakes, fix deterministic data/font/loading setup before
  relaxing thresholds.
- If a provider snapshot exposes inappropriate data, remove that baseline and
  revise fixture/privacy policy before rerunning.
- If axe failures are product-significant, fix UI before accepting parity.
- If a Svelte-reference difference is intentional, record it as a product
  difference with proof.

## Handoff

Child spec `16 Cutover Readiness` cannot start until this spec has a clean gate
or an approved documented exception for each outstanding difference.
