# QuranAtlas Tech Stack

Tools, versions, and reasoning. Architecture and module layout live in [`docs/context/`](context/).

> **Kept fresh by root `AGENTS.md`.** Any change to `package.json` scripts, dev tools, pinned versions, or CI gates must update this file in the same commit.

## Tooling

| Layer | Tool | Version (pinned) | Purpose |
|---|---|---|---|
| Package manager | **pnpm** | `10.31.0` (via `packageManager` in `package.json`) | Fast, disk-efficient, strict dependency isolation |
| Build tool | **Vite** | `^8.0.10` | Dev server, HMR, production bundling (Rolldown-powered) |
| UI framework | **Svelte** | `^5.55.7` | Runes-based reactivity; components compile to tight vanilla JS |
| Svelte ↔ Vite | **@sveltejs/vite-plugin-svelte** | `^7.0.0` | Svelte integration for Vite's module graph |
| React | **React** + **React DOM** | `^19.2.6` | Isolated preview app under `src-react/**`; not shipped until cutover |
| React ↔ Vite | **@vitejs/plugin-react** | `^6.0.2` | React-only Vite integration in `vite.react.config.js` |
| React styling authoring | **Tailwind CSS v4** + `@tailwindcss/vite` | `^4.3.0` | React-only utility authoring mapped to QuranAtlas semantic tokens; scoped to `vite.react.config.js` during dual-build |
| React behavior primitives | **Radix UI React primitives** | accordion `^1.2.12`, checkbox `^1.3.3`, dialog `^1.1.15`, dropdown menu `^2.1.16`, popover `^1.1.15`, progress `^1.1.8`, select `^2.2.6`, slider `^1.3.6`, slot `^1.2.4`, switch `^1.2.6`, tabs `^1.1.13`, toast `^1.2.15`, tooltip `^1.2.8` | Internal implementation detail of `src-react/components/ui/**`; direct Radix imports are forbidden outside the owned UI layer |
| React owned component helpers | **class-variance-authority**, **clsx**, **tailwind-merge**, **lucide-react** | `class-variance-authority ^0.7.1`; `clsx ^2.1.1`; `tailwind-merge ^3.6.0`; `lucide-react ^1.16.0` | Owned shadcn-style component APIs, class composition, and icons for React-only UI primitives |
| React design checks | custom Node scripts | n/a | `pnpm run check:react:design` rejects raw palettes, unapproved arbitrary values, primitive-token consumption, and inline color drift in `src-react/**` |
| React Storybook | **Storybook React/Vite** + `@vitest/browser-playwright` | `storybook ^10.4.1`; `@vitest/browser-playwright 4.1.5` | React component development/proof surface, scoped to `src-react/**` and `storybook-static-react/` |
| React component tests | **@testing-library/react** + Vitest | `@testing-library/react ^16.3.2` | TSX unit/component tests under `tests/unit/**`, run by `pnpm run test:react` |
| React visual regression | local Playwright screenshot baselines | `@playwright/test ^1.59.1` | Regression evidence for React stories/routes; not visual source of truth |
| React offline storage | **Dexie** | `^4.4.2` | React-only mirror of the existing `quran-atlas` IndexedDB v7 stores; no schema bump during dual-build |
| React reader list rendering | **TanStack Virtual** | `^3.13.26` | Available dependency from the React parity track; the current React verse reader renders the single-surah list into normal document scroll to match the Svelte scrolling contract until measured virtualization is reintroduced safely |
| Language | **TypeScript** | `^6.0.3` | Type gate across all feature modules |
| Type check | **svelte-check** | `^4.4.6` | TypeScript + Svelte type-only pass (`pnpm run check`) |
| PWA | **vite-plugin-pwa** | `^1.2.0` (patched — see `patches/`) | Workbox integration, manifest generation, `injectManifest` mode |
| Service worker | **Workbox** (`workbox-*`) | `^7.4.0` | Runtime caching strategies used by `src/infra/service-worker/sw.js` |
| Optional page import | **Poppler `pdftocairo`** | external system tool | Converts quran.ws page PDFs to generated SVG artifacts for Mushaf page release/local packs; required by CI's release artifact build, not by normal local app builds |
| Event bus | **mitt** | `^3.0.1` | Tiny (~200B) pub/sub (sole runtime `dependencies` entry) |
| Logger | custom | — | Dev-only console wrapper, zero-cost in production (`src/core/logger.ts`) |
| Test runner | **Vitest** | `^4.1.5` | Unit + integration, Vite-native (+ `@vitest/coverage-v8` `^4.1.5`) |
| E2E | **Playwright** | `^1.59.1` | Cross-browser end-to-end; runs journey specs A–I |
| a11y assertions | **@axe-core/playwright** | `^4.11.2` | Drives the `@a11y`-tagged assertions inside each journey spec |
| Component tests | **@testing-library/svelte** | `^5.3.1` | Svelte-5-aware component unit tests |
| DOM env | **jsdom** | `^29.1.0` | Browser-like environment for Vitest |
| IDB polyfill | **fake-indexeddb** | `^6.2.5` | IndexedDB for Vitest runs (auto-registered) |
| Linter | **ESLint** | `^10.2.1` (+ `@typescript-eslint/parser` `^8.59.1`, `typescript-eslint` `^8.59.1`, `eslint-plugin-svelte` `^3.17.1`) | Code quality and strict mode across app code plus shared framework-neutral contracts |
| CSS linter | **Stylelint** | `^17.9.1` (+ `stylelint-config-standard` `^40.0.0`) | Selector grammar + custom-property prefix discipline under `src/styles/` |
| Perf gate | **Lighthouse CI** | `@lhci/cli ^0.15.1` | Performance / a11y / best-practices regression guard |
| Deploy | **cloudflare/wrangler-action** | `v3` | Runs `wrangler pages deploy` in CI using the artifact built by CI (no rebuild in deploy) |

`lightningcss` ships as a transitive dep of Vite; it is **not** explicitly configured for CSS transforms in this project (Vite's default CSS pipeline applies). No direct dependency.

`pnpm.overrides` pins patched transitive dependency ranges used by CI audit gates, including `serialize-javascript`, `@babel/plugin-transform-modules-systemjs`, `basic-ftp`, `fast-uri`, `ip-address`, `tmp`, `uuid`, `postcss`, `brace-expansion`, `ws`, and `qs`. Keep those overrides narrow and remove them when upstream direct dependencies resolve to patched versions without help.

## Why these choices

### pnpm (not npm, not Bun)
- **3.4× faster** cold installs than npm; sub-second warm installs.
- **~70% less disk** via global content-addressable store with hard-links.
- **Strict dependency isolation** eliminates phantom dependencies.
- **100% npm-compatible** — no edge cases with native addons.
- **Readable `pnpm-lock.yaml`** — git-friendly diffs.

Bun is faster for pure-JS paths but lacks jsdom (uses happy-dom), has native-addon compatibility gaps, and thinner ecosystem coverage. For a religious-text app where correctness matters, pnpm's reliability wins.

### Vite 8 with Rolldown (not Bun bundler, not raw esbuild)
- **Rolldown** (Rust, built on Oxc) replaced Rollup in Vite 8 — **10–30× faster** production builds.
- **Instant HMR** (~20 ms) via ESM-native dev server.
- **Single bundler for dev and prod** — no "works in dev, breaks in prod" drift.
- **Largest plugin ecosystem** — 25M+ weekly downloads.
- Production builds suppress Rolldown's advisory `checks.pluginTimings` warning in `vite.config.js` so `pnpm run build` and `pnpm run validate` stay focused on actionable failures.

### Svelte 5 + TypeScript
- **Runes** (`$state`, `$derived`, `$effect`) replace hand-rolled reactivity without the virtual-DOM cost of React/Vue.
- **Compile-time reactivity** — the compiler emits direct DOM updates; runtime is tiny.
- **TypeScript across `.ts` + `.svelte`** — uniform type gate via `svelte-check`; catches drift between modules and Svelte props.
- Component state per surface lives colocated in the `.svelte` file; cross-surface state lives in `src/<surface>/state*.svelte.ts` rune modules colocated with their owning surface (see `docs/context/module-graph.md`).

### vite-plugin-pwa + Workbox (not manual SW config)
- **2.8M+ weekly downloads**, 4,100+ GitHub stars.
- **`injectManifest` mode** — supports our custom `src/infra/service-worker/sw.js` with dataset-cache handlers and runtime caches.
- In production, runtime routes come from the custom service worker; the top-level `workbox.runtimeCaching` config is retained for vite-plugin-pwa's dev-service-worker path when `devOptions.enabled` is on.
- Handles offline fallbacks and update notifications.
- **Patched** via `patches/vite-plugin-pwa@1.2.0.patch` (applied by pnpm's `patchedDependencies`).

### Vitest 4 (not Bun test, not Jest)
- **Full `fake-indexeddb/auto` + `jsdom` support** — critical for testing the IDB layer.
- **Vite-native** — shares config with build (aliases, env vars, module resolution).
- **~3.7× faster** than Jest.
- **Jest-compatible API** — familiar patterns.

## Scripts

Defined in `package.json`:

| Command | Action |
|---|---|
| `pnpm run dev` | Start the Vite dev server (`vite`) |
| `pnpm run dev:react` | Start the isolated React preview app on port 5174. Non-deploy during dual-build. |
| `pnpm run build` | Build production bundle into `dist/` (`pnpm run data -- build && vite build`) |
| `pnpm run build:react` | Build the isolated React app into `dist-react/`. This artifact is proof-only until cutover and is not deployed. |
| `pnpm run data -- build` | Grouped baseline data build: `scripts/data/cli.mjs` orchestrates `scripts/data/text/build.mjs`, `scripts/data/knowledge/build.mjs`, `scripts/data/mushaf-pages/build.mjs`, `scripts/data/riwayah-packages/build.mjs`, and `scripts/data/manifest/inventory.mjs` to emit Qalun (runtime `qaloon`) riwayah, Bridges translation, source indexes, riwayah package index, metadata, manifest, provenance, Phase 01 knowledge shards, and a Qalun (`qaloon`) page pack when local page artifacts are present. Runs offline against committed normalized text sources plus optional generated page artifacts. |
| `pnpm run data -- build --profile=full` | Full local data build for the current MVP asset profile: emits every approved shipped text source, Phase 01 knowledge shards, and the available default Qalun (`qaloon`) page pack. Used as a heavier CI guard for dataset-source/catalog/script changes and protected-branch pushes. |
| `pnpm run data -- build --profile=catalog` | Catalog/profile build without text bodies. |
| `pnpm run data -- check` | Grouped data check: validates source catalog plus baseline text, knowledge, and available Mushaf page artifacts without fetching quran.ws. |
| `pnpm run data -- aliases` | Rebuild `_verse-aliases.json` from riwayah sources. |
| `pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604` | Release/local artifact import: downloads quran.ws page PDFs to `.scratch/` and converts them to generated SVG inputs with Poppler `pdftocairo`. CI runs this in the `build` job before packaging `dist/`, with PDFs and normalized SVGs restored from an Actions cache when available. Existing SVG inputs are treated as reusable generated artifacts and are not reconverted unless missing or invalid. |
| `pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon` | Strict Mushaf page artifact build for release packaging; fails if the required local page SVG pack is absent or unsafe. |
| `pnpm run data:fetch -- <type>:<id>` | Generic catalog-driven source fetcher (`scripts/data/fetch-source.mjs`). Supports Quran DB translations such as `translation:saheeh`, QUL translations such as `translation:bridges`, and QUL tafsir such as `tafsir:muyassar`, writing normalized JSON under `data/normalized/**` through provider adapters in `scripts/data/sources/providers/`. |
| `pnpm run preview` | Serve the built bundle (`vite preview --strictPort`) |
| `pnpm run preview:react` | Serve `dist-react/` on port 4175; `vite.react.config.js` also serves the root `public/dataset/**` tree at same-origin `/dataset/**` for React parity proof without copying dataset bodies into `dist-react/`. React font faces import the shared `public/fonts/**` assets through the React design-system CSS so preview/build typography matches the Svelte app. |
| `pnpm run test` | Run Vitest once (CI-style) |
| `pnpm run test:react` | Run React TSX unit/component tests. |
| `pnpm run test:e2e` | Run the full Playwright suite (all journey specs A–I + performance + SW integration) |
| `pnpm run test:e2e:react` | Build Svelte `dist/` and production-target React `dist-react/`, serve both on strict preview ports, then run the React parity Playwright suite against production artifacts. |
| `pnpm run test:e2e:react:golden` | Build Svelte + production-target React, then run Svelte-vs-React golden route parity fixtures. These assertions intentionally fail while later parity-fix plans still own missing React behavior. |
| `pnpm run test:e2e:react:a11y` | Build Svelte + production-target React, then run the React axe, overflow, touch-target, and keyboard/focus coverage carried by the golden parity fixtures. |
| `pnpm run test:e2e:react:offline` | Build Svelte + production-target React, then run preview service-worker/offline proof with network, console, and dataset-failure guards. |
| `pnpm run visual:react` | Run the selected React visual regression gate. Provider screenshots are regression evidence only and do not replace `docs/ui-references/**`. |
| `pnpm run storybook:react` | Start React Storybook on port 6007. |
| `pnpm run build:storybook:react` | Build React Storybook into `storybook-static-react/`. |
| `pnpm run test:storybook:react` | Run React Storybook interaction/component tests. |
| `pnpm run lint` | ESLint over `src/` and `shared/` plus Stylelint over `src/styles/**/*.css` |
| `pnpm run lint:react` | Lint the React tree, `shared/`, React e2e specs, all `tests/unit/react-*` suites, and React-specific config files. |
| `pnpm run typecheck:react` | Run TypeScript over `src-react/**/*.ts?(x)` and `shared/**/*.ts`. |
| `pnpm run check` | Static validation gate: lint + token/style-structure checks + UI refactor safety checks + `svelte-check` |
| `pnpm run check:react:design` | Run React-only design literal and Tailwind drift checks. |
| `pnpm run check:react:radix` | Reject direct Radix imports outside `src-react/components/ui/**`. |
| `pnpm run check:react-registry` | Validate the React component registry shape, sorted ids, and referenced story/test/export paths. |
| `pnpm run check:react-ui-patterns` | Reject raw React controls in feature code when an owned UI primitive exists. |
| `pnpm run check:react-mushaf-assets` | Reject legacy React Mushaf paths and SVG page bodies in `dist-react/`, and validate edition-aware Mushaf indexes when present. |
| `pnpm run check:react` | Run React typecheck, lint, import-boundary, design, and Radix-boundary checks. |
| `pnpm run validate:react` | Composite non-deploy React gate: static checks, registry/pattern/Mushaf checks, React unit/component tests, proof-only React build, React golden/a11y/offline e2e, visual regression, Storybook build/test, and docs check. |
| `pnpm run docs` | Regenerate context-doc inventories and event/module indexes |
| `pnpm run docs:check` | Assert generated docs are up to date |
| `pnpm run lighthouse` | Build + Lighthouse CI (`lhci autorun --config=.lighthouserc.cjs`) |
| `pnpm run clean` | Remove `dist` and `test-output` |
| **`pnpm run validate`** | Composite gate: `check` → feature-state guard → `test` → `build` → chunk budget → `docs:check`. Run before pushing. |

The `packageManager` field pins `pnpm@10.31.0` exactly. Commands also run under `npx` (e.g. `npx vitest run`), but pnpm is the canonical path.

### Optional environment variables
- `PLAYWRIGHT_INCLUDE_OFFLINE=1` — includes the `@offline` project (otherwise skipped locally; always included in CI). See `playwright.config.js`.
- `PLAYWRIGHT_USE_PREVIEW=1` — run Playwright against a production preview build instead of the dev server. Used for SW/offline specs and by CI (vite's on-demand compile under workers=6 on the 2-core runner serialised past the 25 s `waitForReader` timeout). When set, the `Offline (Preview)` project reuses the same preview server instead of spawning a second build.
- `PLAYWRIGHT_SKIP_BUILD=1` — assume `dist/` already exists; skip the prebuild step inside the preview webServer command. CI sets this after downloading the `dist/` artifact from the Build job, avoiding a redundant rebuild.

## Architecture and internals

These used to be inlined in this file; they now live in `docs/context/`:

- **Boot flow, router, events, cross-cutting patterns** → [`architecture.md`](context/architecture.md)
- **Directory layout + imports-from / imported-by** → [`module-graph.md`](context/module-graph.md)
- **IDB stores, keys, indexes, record shapes** → [`data-model.md`](context/data-model.md)
- **Event bus catalog (emitters, listeners, payloads)** → [`events.md`](context/events.md)
- **Feature inventory + routing table** → [`feature-map.md`](context/feature-map.md)
- **What's live, what's on deck, what's broken** → [`implemented.md`](context/implemented.md), [`roadmap.md`](context/roadmap.md), [`open-issues.md`](context/open-issues.md)

## Testing strategy

Two layers:

- **Unit tests (Vitest + jsdom + `fake-indexeddb/auto`)** — suites under `tests/unit/` covering core, Reader First surfaces, settings/nav/safety/data/offline, dataset scripts/catalogs, state modules, service worker handlers, and a console-guard. Mark/review/listen tests are removed-scope implementation regression coverage while that code remains. Runs in every CI job via `pnpm run test`.
- **E2E tests (Playwright)** — specs under `tests/e2e/` are clustered by surface: `onboard`, `read`, `configure`, `navigate`, and `infra` for active Reader First behavior; `mark` and `review` are removed-scope cleanup/regression placement while that implementation remains.

Locally, ordinary Playwright specs run against the **Vite dev server**; offline/service-worker specs run against the **Vite preview server** (production build required for the SW). In CI, all projects share a single preview server (`PLAYWRIGHT_USE_PREVIEW=1` + `PLAYWRIGHT_SKIP_BUILD=1`) — the e2e job depends on the Build job and reuses its `dist/` artifact rather than rebuilding.

#### Suite setup: `tests/e2e/global-setup.ts` + `storageState` reuse

Playwright's `globalSetup` hook captures an onboarded `storageState` snapshot once per suite run into `tests/e2e/.auth/onboarded.json` (gitignored). The hook boots the app, marks `onboardingComplete=true` in IDB, navigates past onboarding, and writes the captured cookies + localStorage + IDB to disk. Every non-onboarding journey spec opts in via:

```js
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })
```

Each test gets a fresh `BrowserContext` with the snapshot reloaded — no per-test `markOnboardingComplete + clearAllData + cold-boot` needed, and the `marks`/`edges`/`bookmarks` stores are reset to the snapshot (empty) implicitly between tests. Onboarding-flow specs (`journey-a`) and SW/cross-tab carve-outs (`journey-h`, `journey-i`) opt OUT with `test.use({ storageState: { cookies: [], origins: [] } })`. See `tests/e2e/AGENTS.md`.

### Static checks
- **ESLint + Stylelint** via `pnpm run lint`.
- **svelte-check** type gate via `pnpm run check`.
- **Design-token gates** inside `pnpm run check`:
  - `check-theme-parity.mjs` — every token in a theme override must exist in `:root`.
  - `check-token-usage.mjs` — every `var(--qa-*)` must resolve to a declared token (global or file-local/scoped).
  - `check-at-layer.mjs` — no bare rules outside `@layer` (except `reset.css` / `base.css` / `index.css`).
  - `check-style-entry.mjs` — blocking check for stale, duplicate, or missing `src/styles/index.css` imports across shipped CSS partials.
  - `check-ui-references.mjs` — blocking check for committed UI-reference image/note pairing plus required intent-note fields.
  - `check-selector-liveness.mjs` — blocking scan for `.qa-*` classes that drift between CSS ownership and code references, with explicit allowlists for dynamic or non-style qa-prefixed hooks.
  - `check-primitive-token-consumption.mjs` — blocking scan for primitive token consumption outside `src/styles/tokens/**`.
  - `check-design-literals.mjs` — blocking scan for hardcoded color, motion, and radius design literals outside token files unless the file carries an explicit local allow comment.
- **React-only gates** inside `pnpm run validate:react`:
  - `check-react-radix-boundaries.mjs` — direct Radix imports are allowed only in `src-react/components/ui/**`.
  - `check-react-component-registry.mjs` — registry entries must be sorted and point at existing exports, stories, and tests.
  - `check-react-ui-forbidden-patterns.mjs` — raw controls are blocked in React feature code when owned UI primitives exist.
  - `check-react-mushaf-assets.mjs` and `check-react-mushaf-indexes.mjs` — React must use edition-aware Mushaf pack contracts and must not ship page SVG bodies in `dist-react/`.
  - React Playwright golden/a11y/offline commands — build and serve Svelte plus production-target React artifacts, then prove or intentionally fail route parity, accessibility basics, viewport containment, and service-worker/offline dataset behavior without deploying React.
- **Gzipped-chunk budget** via `scripts/check-chunks.js` during `pnpm run validate` (≤150 KB per chunk).
- **Feature-state guard** via `scripts/check-no-feature-state.js` during `pnpm run validate` (blocks top-level mutable state in feature modules).
- **Lighthouse CI** via `pnpm run lighthouse` (performance / a11y / best-practices regression guard).

Composite gate: `pnpm run validate` runs check → feature-state → test → build → check-chunks → docs:check.

Minimum browser: Chrome 111, Safari 16.2, Firefox 113 (required for `color-mix()` in `semantic.css`).

## CI/CD

CI lives at `.github/workflows/ci.yml` and runs on push/PR to `main`, `dev`, `staging`. Jobs share a composite setup action (`.github/actions/setup/action.yml`) that pins `pnpm@10.31.0` + Node 20 and restores a lockfile-keyed cache. The `build` job restores cached Qalun (`qaloon`) Mushaf page PDFs / normalized SVG inputs, installs Poppler, imports any missing baseline Qalun (`qaloon`) artifacts, strictly builds the generated page pack, then runs the normal production build before uploading `dist/`. `lighthouse` and `e2e` consume that artifact (no redundant rebuilds). Dataset check/build jobs remain clean-checkout tolerant and do not require generated page SVGs. Jobs:

| Job | Purpose |
|---|---|
| `lint` | `pnpm run lint` |
| `typecheck` | `pnpm run check` (static validation gate; job name `Check`) |
| `test` | `pnpm run test` (Vitest) |
| `feature-state` | `node scripts/check-no-feature-state.js` |
| `dataset-catalog` | `pnpm run data -- check` |
| `dataset-baseline` | `pnpm run data -- build` |
| `dataset-full` | `pnpm run data -- build --profile=full` on protected-branch pushes and PRs whose diff touches dataset sources, catalogs, generated dataset files, or dataset scripts |
| `audit` | `pnpm audit --audit-level moderate` |
| `build` | Installs Poppler, runs `pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604`, runs `pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon`, then `pnpm run build`; uploads `dist/` artifact with the release Qalun (`qaloon`) page pack |
| `lighthouse` | `lhci autorun` against uploaded `dist/` |
| `e2e` | `pnpm test:e2e --project=chromium --project="Mobile Chrome" --project="Offline (Preview)"` with `PLAYWRIGHT_INCLUDE_OFFLINE=1`, `PLAYWRIGHT_USE_PREVIEW=1`, `PLAYWRIGHT_SKIP_BUILD=1`. Depends on `build` and downloads its `dist/` artifact, then runs against a preview server (no dev-server compile path under workers=6). React parity specs are excluded from this Svelte app gate and run through `pnpm run validate:react`. |
| `ci-ok` | No-op aggregator — single required status check for branch protection |

Deploy lives at `.github/workflows/deploy.yml` and observes CI via `workflow_run`: on CI success for a push to `dev`, `staging`, or `main`, the deploy job downloads the `dist/` artifact the CI run produced and runs `wrangler pages deploy` against the single Cloudflare Pages project `quranatlas`. Custom domains are bound per branch in the Cloudflare dashboard:

| Branch | Domain |
|---|---|
| `main` (production) | `quranatlas.org`, `www.quranatlas.org` |
| `staging` | `staging.quranatlas.org` |
| `dev` | `dev.quranatlas.org` |

Required repo secrets: `CLOUDFLARE_API_TOKEN` (scopes: `Cloudflare Pages:Edit`, `User Details:Read`) and `CLOUDFLARE_ACCOUNT_ID`.

## Module lifecycle

`src/app-bootstrap.ts::initBootstrap()` is the composition root. It drains `bootCleanups[]` at entry (so a re-invocation cleans up a prior partial init) and pushes a cleanup for each registered subsystem:

1. `openDB()` — opens the IDB connection.
2. `initSafetySync()` — registers the `DB_VERSION_CHANGE` listener **before** any versionchange can fire. See `docs/context/architecture.md` §Boot flow for the ordering rationale.
3. `initTheme()` + `initFontSize()` — apply persisted theme/font before route dispatch.
4. Event subscriber for `ROUTER_LAUNCH_RESTORE` → `handleLaunchRestore`.
5. `router.init()` — begins hash routing.
6. `initReaderActions()` — global reader keyboard shortcuts.
7. Event subscriber for `NAVIGATION_NAVIGATE` → `router.navigate`.
8. `initInstallListener()` — PWA install prompt capture.
9. Service worker registration (production only).
10. `offline.initInstallPrompt()` + activation-state restore.

Persistent overlays (`MoreSheet`, `AmbientDock`, `AmbientPill`, `QuotaBanner`, `Editor`, `Panel`, `ClearDataConfirm`, `UndoToast`) are **Svelte components mounted once in `App.svelte`**, not imperative `init()` modules — they expose `open*` / `close*` APIs through bridge modules (`settings/panel-bridge.ts`, `marks/editor-bridge.ts`) rather than being composed by bootstrap.

Route modules (`reader/Reader.svelte`, `review/Hub.svelte`, `surahs/SurahList.svelte`, `about/About.svelte`, `onboarding/Onboarding.svelte`) are loaded lazily on first route match; the router invokes their cleanup before mounting the next route.

See [`architecture.md`](context/architecture.md) §Boot flow for the authoritative sequence.
