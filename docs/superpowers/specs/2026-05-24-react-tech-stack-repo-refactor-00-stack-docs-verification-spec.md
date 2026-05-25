# React Tech Stack Refactor 00 - Stack And Docs Verification Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`

## Purpose

Verify current official documentation for every technology decision that later
React rebuild child specs depend on. This child spec is a blocker: implementation
child specs must not lock API syntax, CLI flags, package configuration, test
harnesses, PWA behavior, or provider setup until the relevant documentation is
verified and recorded here or in a directly linked decision appendix.

## Scope

In scope:

- React app bootstrap and TypeScript usage.
- Vite dev, build, preview, root, output, public directory, and multi-entry
  configuration.
- vite-plugin-pwa and Workbox service-worker behavior.
- Tailwind CSS v4 setup and token integration constraints.
- Radix UI primitive ownership and accessibility behavior.
- shadcn/ui copied-owned component workflow.
- `class-variance-authority` variant authoring.
- TanStack Virtual reader-list virtualization.
- Dexie IndexedDB access over an existing schema.
- Storybook component and interaction test setup.
- Playwright app, screenshot, accessibility, and service-worker test setup.
- Visual regression provider options.

Out of scope:

- Adding packages.
- Editing `package.json`.
- Creating `src-react`.
- Changing current Svelte scripts, CI, or deploy behavior.
- Selecting a visual regression provider. Selection belongs to child spec `05`.

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/tech-stack.md`
- `docs/product-info.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec listed above

## Allowed Files And Directories

Allowed modify:

- This child spec's decision appendix.
- Parent master spec only when current docs invalidate a master decision.
- Other child specs only to correct direct conflicts discovered during docs
  verification.

Forbidden modify:

- `package.json`, lockfile, source, generated dataset, CI, deploy, or app
  behavior.
- `src-react/**`.
- Generated context fences by hand.

## Context7 Workflow

For each library, framework, SDK, API, CLI, or cloud service below, run the repo
Context7 workflow first:

```bash
npx ctx7@latest library <official-name> "<full question>"
npx ctx7@latest docs <library-id> "<full question>"
```

Pick versioned library ids when the `library` output exposes a version matching
the repo or the intended child spec. Record the selected library id, query,
retrieval result, and implementation-relevant facts. If Context7 is quota
blocked, record the exact failure and stop until the user can run
`npx ctx7@latest login` or configure `CONTEXT7_API_KEY`; do not use an
official-doc fallback for quota failures. If Context7 lacks coverage or remains
unavailable after the required non-quota retry, record the exact failure and the
official-doc fallback source; do not silently fall back to memory.

Minimum verification matrix:

| Technology | Required question |
| --- | --- |
| React | How should a React + TypeScript browser app bootstrap, mount, and compose providers in the current React docs? |
| Vite | How should Vite configure dev, build, preview, root, public assets, output directories, and multiple app entries in a dual-build repository? |
| vite-plugin-pwa / Workbox | How should an app-shell precache, runtime caches, update flow, and service-worker scope be configured for a Vite PWA without precaching all content assets? |
| Tailwind CSS v4 | How should Tailwind CSS v4 be configured so utilities resolve to project-owned semantic CSS variables and reject palette/literal drift? |
| Radix UI | How should dialogs, sheets, menus, tabs, switches, sliders, tooltips, and focus-sensitive primitives be wrapped while preserving accessibility behavior? |
| shadcn/ui | What is the current copied-owned component workflow, registry contract, and customization guidance? |
| class-variance-authority | How should typed component variants be modeled and composed with Tailwind class output? |
| TanStack Virtual | How should virtualized long reader surfaces measure rows, preserve scroll behavior, and avoid layout jumps? |
| Dexie | How should Dexie open and use an existing IndexedDB database without unsafe schema migration during a dual-app period? |
| Storybook | How should React stories, interaction tests, accessibility checks, and viewport/theme coverage be configured? |
| Playwright | How should Playwright cover app routes, service workers, screenshots, accessibility, storage state, and multiple viewports? |
| Visual regression candidates | How do candidate providers handle privacy, retention, deterministic assets, baseline updates, and CI gating? |

## Decision Appendix Format

Create or update a decision appendix in this file using this format for each
technology:

```markdown
### <Technology>

- Context7 library id:
- Version selected:
- Query:
- Retrieved:
- Relevant current-doc facts:
- QuranAtlas decision:
- Follow-up child specs:
```

Use concise paraphrase. Do not paste large external-doc excerpts.

## Decision Appendix

### React

- Context7 library id: `/reactjs/react.dev`
- Version selected: current official React docs; no repo package version selected
  by this docs-only spec.
- Query:
  `How should a React TypeScript browser app bootstrap, create a root, render providers, and cleanly mount in a Vite app?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: React browser apps mount with
  `createRoot(container)` from `react-dom/client`, call `root.render(...)`, may
  wrap the tree in `StrictMode`, and can call `root.unmount()` to tear down.
  React's docs identify Vite's `react-ts` template as a supported way to start a
  React TypeScript app.
- QuranAtlas decision: child spec `01` may lock a React bootstrap entry that
  creates one root in the React HTML entry, composes QuranAtlas providers inside
  that root, and keeps Svelte mounting separate during dual-build.
- Follow-up child specs: `01`, `10`, `13`, `17`.

### Vite

- Context7 library id: `/vitejs/vite/v8.0.10`
- Version selected: `v8.0.10`, matching the repo's pinned Vite range.
- Query:
  `How to configure Vite build outDir, root, publicDir, preview server, and multiple app entries for a React TypeScript app in a dual-build repository?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Vite can use a custom project `root`, isolate build
  output with `vite build --outDir <dir>`, configure multiple HTML inputs through
  build input options, and run preview on an explicit port.
- QuranAtlas decision: React must use a clearly non-deploy Vite path during
  dual-build, writing to `dist-react/` while Svelte remains `pnpm run build ->
  dist/`.
- Follow-up child specs: `01`, `16`, `17`.

### vite-plugin-pwa / Workbox

- Context7 library ids: `/vite-pwa/vite-plugin-pwa`, `/googlechrome/workbox`
- Version selected: current Context7 docs; implementation must match installed
  package versions when code is written.
- Query:
  `How should vite-plugin-pwa and Workbox configure a Vite PWA app shell precache, runtime caches, update flow, service-worker scope, injectManifest, and avoid precaching all content assets?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: vite-plugin-pwa supports `strategies:
  'injectManifest'` for a custom service worker, manifest configuration, and
  Workbox asset glob configuration. Workbox supports `precacheAndRoute`,
  `cleanupOutdatedCaches`, navigation routing, route match callbacks, cache
  strategies such as `CacheFirst`, `NetworkFirst`, and `StaleWhileRevalidate`,
  and expiration/quota plugins.
- QuranAtlas decision: React must use a custom app-shell and route strategy with
  isolated scope/cache names, precache only shell/static assets, and keep reader
  content packs user-triggered and manifest/index planned.
- Follow-up child specs: `01`, `08`, `15`, `17`.

### Tailwind CSS v4

- Context7 library id: `/tailwindlabs/tailwindcss.com`
- Version selected: current Tailwind v4 docs.
- Query:
  `How should Tailwind CSS v4 be configured for a React Vite app with project-owned semantic CSS variables, theme tokens, and static checks that prevent palette and arbitrary value drift?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Tailwind v4 integrates with Vite through the
  `@tailwindcss/vite` plugin, supports CSS-first theme variables with `@theme`,
  and can use a class prefix through the CSS import directive.
- QuranAtlas decision: Tailwind is an authoring layer for owned React
  components only; theme variables must resolve to QuranAtlas semantic tokens,
  and checks must reject raw palette and arbitrary-value drift.
- Follow-up child specs: `03`, `06`, `07`.

### Radix UI

- Context7 library id: `/websites/radix-ui_primitives`
- Version selected: current Radix Primitives docs.
- Query:
  `How should Radix UI React primitives such as Dialog, Popover, Dropdown Menu, Tabs, Tooltip, Switch, Slider, and focus-sensitive components be wrapped while preserving accessibility behavior?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Radix docs show project-owned wrappers around
  primitive parts, portals for overlay content, `asChild` composition for custom
  triggers, and `React.forwardRef` so primitives can attach refs for behavior
  and measurement.
- QuranAtlas decision: direct Radix imports stay inside owned behavior wrappers;
  feature and page code compose QuranAtlas components with typed APIs instead of
  raw primitive parts.
- Follow-up child specs: `06`, `07`, `15`.

### shadcn/ui

- Context7 library id: `/websites/ui_shadcn`
- Version selected: current shadcn/ui docs.
- Query:
  `How should shadcn/ui copied-owned React components be added, customized, composed with Radix UI primitives, and maintained in a React Vite TypeScript app with Tailwind CSS v4 and a component registry?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: shadcn/ui components are copied into the project
  and owned locally. `components.json` records TSX/RSC mode, Tailwind CSS entry,
  CSS-variable theming, aliases for component/helper paths, and icon library.
  shadcn/ui can apply a Tailwind class prefix when projects need collision
  avoidance.
- QuranAtlas decision: copied components are starting material only; deliverable
  components must be normalized to semantic QuranAtlas tokens, tests, stories,
  registry entries, and local ownership rules.
- Follow-up child specs: `06`, `07`.

### class-variance-authority

- Context7 library id: `/joe-bell/cva`
- Version selected: current Context7 result; available version listed as
  `v1.0.0-beta.4`, but implementation must pick the package version explicitly.
- Query:
  `How should class-variance-authority model typed React component variants and compose Tailwind class output for design-system components?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: `cva(base, options)` defines base classes,
  variants, compound variants, and defaults. `VariantProps<typeof variants>`
  extracts typed variant props. `cx` composes cva outputs.
- QuranAtlas decision: CVA is the default variant helper for the React component
  layer; registered variants must match source definitions and semantic-token
  class output.
- Follow-up child specs: `03`, `06`, `07`.

### TanStack Virtual

- Context7 library id: `/tanstack/virtual`
- Version selected: current Context7 docs.
- Query:
  `How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: React virtualization uses `useVirtualizer`,
  requires a scroll element, `estimateSize`, and may use `overscan`.
  Unknown-height items can use `measureElement` with `data-index`. Window
  scrolling can use `useWindowVirtualizer` with `scrollMargin`.
- QuranAtlas decision: reader virtualization is allowed only where it preserves
  deep links, scroll restore, focus, Arabic/translation measurement, and
  accessibility.
- Follow-up child specs: `09`, `15`.

### Dexie

- Context7 library id: `/websites/dexie`
- Version selected: current Dexie docs.
- Query:
  `How should Dexie open and use an existing IndexedDB database schema without unsafe migrations during a dual-app React and Svelte period, while preserving store names, keys, indexes, and version compatibility?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Dexie opens a database with `new Dexie(name)`,
  declares schema through `db.version(number).stores(...)`, and `db.open()`
  resolves when the database is ready. Dexie documents use with existing
  IndexedDB databases.
- QuranAtlas decision: React may use Dexie only as a mirror of existing
  `quran-atlas` v7 stores during dual-build; no schema bump or unsafe migration
  is allowed without a separate migration spec.
- Follow-up child specs: `08`, `13`, `17`.

### Storybook

- Context7 library id: `/storybookjs/storybook/v10.2.9`
- Version selected: `v10.2.9`.
- Query:
  `How should Storybook be configured for a React Vite TypeScript app with interaction tests, accessibility checks, viewport/theme coverage, and CI test commands?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Storybook provides Vitest integration through
  `@storybook/addon-vitest/vitest-plugin`, can run component tests in browser
  mode with Playwright-backed Chromium, supports project setup files, and can
  integrate accessibility checks through a11y tooling or test-runner hooks.
- QuranAtlas decision: Storybook is React component/product-pattern proof, not
  visual source of truth. Stories must cover required states before product
  specs consume components.
- Follow-up child specs: `04`, `05`, `06`, `15`.

### Playwright

- Context7 library id: `/websites/playwright_dev`
- Version selected: current Playwright docs; implementation should match the
  repo's installed `@playwright/test` version.
- Query:
  `How should Playwright test React app routes, screenshots, accessibility scans, storage state, service workers, offline mode, keyboard focus journeys, and multiple viewports for a Vite PWA?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Playwright supports page accessibility scans with
  `@axe-core/playwright`, locator screenshot assertions with
  `toHaveScreenshot`, storage-state reuse, service-worker request inspection,
  and offline emulation through config.
- QuranAtlas decision: React golden routes must use Playwright for app-level
  route, storage, keyboard/focus, screenshot, accessibility, and offline/SW
  proof.
- Follow-up child specs: `02`, `05`, `15`, `16`.

### Visual Regression Candidates

- Context7 library ids: `/websites/chromatic`, `/websites/browserstack`,
  `/argos-ci/argos`, `/oblador/loki`
- Version selected: current provider docs; no provider selected by this spec.
- Query:
  `How do candidate providers handle privacy, retention, deterministic assets, baseline updates, and CI gating?`
- Retrieved: 2026-05-24.
- Relevant current-doc facts: Chromatic integrates with Storybook, Playwright,
  and Cypress, compares snapshots against baselines, and requires explicit
  baseline acceptance for visual changes. BrowserStack Percy has Playwright
  snapshot integration and PR/build review flows. Argos is an open-source visual
  testing platform with CI integrations, screenshot upload/finalize APIs, and
  approve/request-changes review APIs. Loki is a Storybook-focused local/CI tool
  with `update`, `test`, and `approve` workflows and CI reference-image checks.
- QuranAtlas decision: provider selection remains child spec `05`; hosted
  providers must pass Quran/Mushaf screenshot privacy and retention review, and
  local Playwright/Loki-style baselines remain acceptable if hosted terms are
  unsuitable.
- Follow-up child specs: `05`, `15`, `16`.

## Dependency Risks

- Hosted visual providers may upload Quran/Mushaf screenshots. Child spec `05`
  must decide privacy, retention, deletion, and seeded-data limits before
  enabling uploads.
- Dexie schema declaration can trigger IndexedDB upgrade behavior if version or
  store definitions drift. Child spec `08` must prove Svelte can still open the
  database after React code runs.
- Tailwind v4 and shadcn/ui defaults can introduce raw palette utilities unless
  copied code is normalized and checked.
- Radix accessibility depends on preserving refs, `asChild` composition, portals,
  labels, and focus behavior. Wrappers must test the behavior they hide.
- Storybook and Playwright browser-mode tests add runtime cost. Child specs must
  keep commands scoped until React becomes production.

## Child-Spec Updates Required

- Child spec `01` can lock React `createRoot` bootstrap details.
- Child spec `05` must use the visual-provider discovery above as input, but
  still fetch final provider docs before selection/wiring.
- Child spec `06` must use Radix `forwardRef`/`asChild` wrapper rules and
  shadcn copied-owned configuration.
- Child spec `08` must treat Dexie as an existing-schema mirror and Workbox as
  isolated React service-worker tooling.
- Child spec `09` must use TanStack Virtual only with stable measurement,
  scroll-restore, and accessibility proof.
- Child spec `15` must use Playwright for golden route, axe, screenshot,
  storage-state, service-worker, offline, and viewport proof.

## Deliverables

- A completed decision appendix covering the minimum verification matrix.
- A dependency-risk list identifying libraries or providers whose current docs
  contradict the master spec.
- A child-spec update list identifying which later child specs must be revised
  because of current documentation.
- No implementation changes.

## Acceptance Criteria

- Every technology in the verification matrix has a Context7 `library` result
  and a Context7 `docs` result, or an explicit documented fallback after a
  non-quota Context7 coverage or availability failure.
- The appendix records the selected library id and version where available.
- The appendix distinguishes official documentation facts from QuranAtlas
  decisions.
- Any contradiction with the master spec is resolved by patching the master spec
  in the same change.
- No package, script, CI, source, generated dataset, or app behavior changes are
  made by this child spec.

## Verification

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected result:

- `pnpm run docs:check` reports `derive: all clean`.
- `git diff --check` exits with no whitespace errors.

## Rollback And Failure Handling

- If Context7 fails because of quota, record the failure and stop this child
  spec until the user can run `npx ctx7@latest login` or configure
  `CONTEXT7_API_KEY`; do not use an official-doc fallback for quota failures.
- If Context7 fails because of network resolution, rerun the same command once
  outside the default sandbox as required by repo instructions.
- If current docs invalidate a master-spec decision, patch the master spec before
  creating implementation child specs that depend on that decision.

## Handoff

Child spec `01 React App Shell And Dual Build` may begin only for the Vite and
React details already verified here or by a narrower Context7 fetch in that child
spec. Specs `03` through `08` must not lock Tailwind, Storybook, visual
regression, Radix, shadcn/ui, Dexie, Workbox, or OPFS behavior until their
corresponding entries are complete.
