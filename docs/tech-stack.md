# QuranAtlas Tech Stack

Tools, versions, and reasoning. Architecture and module layout live in [`docs/context/`](context/).

> **Kept fresh by CLAUDE.md Rule 2.** Any change to `package.json` scripts, dev tools, pinned versions, or CI gates must update this file in the same commit.

## Tooling

| Layer | Tool | Version (pinned) | Purpose |
|---|---|---|---|
| Package manager | **pnpm** | `10.31.0` (via `packageManager` in `package.json`) | Fast, disk-efficient, strict dependency isolation |
| Build tool | **Vite** | `^8.0.5` | Dev server, HMR, production bundling (Rolldown-powered) |
| UI framework | **Svelte** | `^5.55.4` | Runes-based reactivity; components compile to tight vanilla JS |
| Svelte ↔ Vite | **@sveltejs/vite-plugin-svelte** | `^7.0.0` | Svelte integration for Vite's module graph |
| Language | **TypeScript** | `^6.0.3` | Type gate across all feature modules |
| Type check | **svelte-check** | `^4.4.6` | TypeScript + Svelte type-only pass (`pnpm run check`) |
| PWA | **vite-plugin-pwa** | `^1.2.0` (patched — see `patches/`) | Workbox integration, manifest generation, `injectManifest` mode |
| Service worker | **Workbox** (`workbox-*`) | `^7.4.0` | Runtime caching strategies used by `src/sw.js` |
| Event bus | **mitt** | `^3.0.1` | Tiny (~200B) pub/sub (sole runtime `dependencies` entry) |
| Logger | custom | — | Dev-only console wrapper, zero-cost in production (`src/core/logger.ts`) |
| Test runner | **Vitest** | `^4.1.2` | Unit + integration, Vite-native (+ `@vitest/coverage-v8` `^4.1.2`) |
| E2E | **Playwright** | `^1.59.1` | Cross-browser end-to-end; runs journey specs A–I |
| a11y assertions | **@axe-core/playwright** | `^4.11.2` | Drives the `@a11y`-tagged assertions inside each journey spec |
| Component tests | **@testing-library/svelte** | `^5.3.1` | Svelte-5-aware component unit tests |
| DOM env | **jsdom** | `^29.0.1` | Browser-like environment for Vitest |
| IDB polyfill | **fake-indexeddb** | `^6.2.5` | IndexedDB for Vitest runs (auto-registered) |
| Linter | **ESLint** | `^10.2.0` (+ `typescript-eslint` `^8.58.2`, `eslint-plugin-svelte` `^3.17.0`) | Code quality, strict mode |
| CSS linter | **Stylelint** | `^17.8.0` (+ `stylelint-config-standard` `^40.0.0`) | Selector grammar + custom-property prefix discipline under `src/styles/` |
| Perf gate | **Lighthouse CI** | `@lhci/cli ^0.15.1` | Performance / a11y / best-practices regression guard |
| Deploy | **cloudflare/wrangler-action** | `v3` | Runs `wrangler pages deploy` in CI using the artifact built by CI (no rebuild in deploy) |

`lightningcss` ships as a transitive dep of Vite; it is **not** explicitly configured for CSS transforms in this project (Vite's default CSS pipeline applies). No direct dependency.

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

### Svelte 5 + TypeScript (migrated from vanilla JS on `ff574be`, 2026-04-20)
- **Runes** (`$state`, `$derived`, `$effect`) replace the prior hand-rolled reactivity without the virtual-DOM cost of React/Vue.
- **Compile-time reactivity** — the compiler emits direct DOM updates; runtime is tiny.
- **TypeScript across `.ts` + `.svelte`** — uniform type gate via `svelte-check`; catches drift between modules and Svelte props.
- Component state per surface lives colocated in the `.svelte` file; cross-surface state is extracted to `src/state/*` runes modules (see `docs/context/module-graph.md`).

### vite-plugin-pwa + Workbox (not manual SW config)
- **2.8M+ weekly downloads**, 4,100+ GitHub stars.
- **`injectManifest` mode** — supports our custom `src/sw.js` with dataset-cache handlers and runtime caches.
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
| `pnpm run build` | Build production bundle into `dist/` (`pnpm build:dataset && vite build`) |
| `pnpm run build:dataset` | Split KFGQPC riwayat JSONs + each shipped translation `.raw.json` into per-surah files; regenerate `surahs.json`, `juz.json`, `manifest.json`, `provenance.json` (`node scripts/build-dataset.mjs`). Renamed from `build-riwayat.mjs` 2026-04-27 when translations phase landed; runs offline against committed source files. |
| `pnpm run fetch:translation:saheeh` | One-shot networked fetch of Saheeh International (Quran.com qdc translation 20) into `data/raw/saheeh.raw.json` (committed; outside `public/` so it's build-only and never shipped to clients). Re-run only when refreshing the upstream pack. |
| `pnpm run preview` | Serve the built bundle (`vite preview --strictPort`) |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm run test:run` | Run Vitest once (CI-style) |
| `pnpm run test:coverage` | Run Vitest with v8 coverage |
| `pnpm run test:e2e` | Run the full Playwright suite (all journey specs A–I + performance + SW integration) |
| `pnpm run test:e2e:sw` | Run just the SW-integration spec against a production preview build (`PLAYWRIGHT_USE_PREVIEW=1`) |
| `pnpm run lint` | ESLint over `src/` |
| `pnpm run lint:fix` | ESLint with `--fix` |
| `pnpm run lint:css` | Stylelint over `src/styles/**/*.css` (config at `.stylelintrc.json`) |
| `pnpm run check` | `svelte-check --tsconfig ./tsconfig.json` — type gate |
| `pnpm run check:styles` | Run `check-theme-parity.mjs` + `check-token-usage.mjs` + `check-at-layer.mjs` (design-token gates) |
| `pnpm run check-chunks` | Gzipped chunk-budget check (`scripts/check-chunks.js`, ≤150 KB per chunk) |
| `pnpm run check-no-feature-state` | Assert feature modules don't hold top-level mutable state (`scripts/check-no-feature-state.js`) |
| `pnpm run lighthouse` | Build + Lighthouse CI (`lhci autorun --config=.lighthouserc.cjs`) |
| `pnpm run clean` | Remove `dist` and `test-output` |
| `pnpm run mcp:cleanup` | Remove `test-output` (for MCP browser sessions) |
| **`pnpm run validate`** | Composite gate: `lint` → `lint:css` → `check:styles` → `check` → `test:run` → `build` → `check-chunks`. Run before pushing. |

The `packageManager` field pins `pnpm@10.31.0` exactly. Commands also run under `npx` (e.g. `npx vitest run`), but pnpm is the canonical path.

### Optional environment variables
- `PLAYWRIGHT_INCLUDE_OFFLINE=1` — includes the `@offline` project (otherwise skipped locally; always included in CI). See `playwright.config.js`.
- `PLAYWRIGHT_USE_PREVIEW=1` — run Playwright against a production preview build instead of the dev server. Used by `test:e2e:sw` and by CI (vite's on-demand compile under workers=6 on the 2-core runner serialised past the 25 s `waitForReader` timeout). When set, the `Offline (Preview)` project reuses the same preview server instead of spawning a second build.
- `PLAYWRIGHT_SKIP_BUILD=1` — assume `dist/` already exists; skip the prebuild step inside the preview webServer command. CI sets this after downloading the `dist/` artifact from the Build job, avoiding a redundant rebuild.

## Architecture and internals

These used to be inlined in this file; they now live in `docs/context/`:

- **Boot flow, router, events, cross-cutting patterns** → [`architecture.md`](context/architecture.md)
- **Directory layout + imports-from / imported-by** → [`module-graph.md`](context/module-graph.md)
- **IDB stores, keys, indexes, record shapes** → [`data-model.md`](context/data-model.md)
- **Event bus catalog (emitters, listeners, payloads)** → [`events.md`](context/events.md)
- **Feature inventory + routing table** → [`feature-map.md`](context/feature-map.md)
- **End-to-end user journeys** → [`user-journeys.md`](context/user-journeys.md)

## Testing strategy

Two layers:

- **Unit tests (Vitest + jsdom + `fake-indexeddb/auto`)** — **40 files** under `tests/unit/` covering core, reader, marks, review, settings, nav, safety, data/offline, state modules, service worker handlers, and a console-guard. Runs in every CI job via `pnpm run test:run`.
- **E2E tests (Playwright)** — **12 specs** under `tests/e2e/`:
  - `journey-a-onboarding.spec.js` — first-run + session restore
  - `journey-b-reader.spec.js` — reader + ambient chrome
  - `journey-c-marking.spec.js` — mark editor
  - `journey-d-settings.spec.js` — settings sheet, theme, clear-data
  - `journey-e-review.spec.js` — review hub + FVR
  - `journey-f-navigation.spec.js` — command sheet + surah directory
  - `journey-g-about.spec.js` — about + shortcuts + PWA install
  - `journey-h-offline.spec.js` — offline activation (`@offline` project, preview build)
  - `journey-i-cross-tab.spec.js` — cross-tab sync
  - `performance-budgets.spec.js` — initial render budgets
  - `sw-integration.spec.js` — SW cache + runtime caching (preview build only)

Locally, journey specs A–G, I, and performance run against the **Vite dev server**; journey H + `sw-integration` run against the **Vite preview server** (production build required for the SW). In CI, all projects share a single preview server (`PLAYWRIGHT_USE_PREVIEW=1` + `PLAYWRIGHT_SKIP_BUILD=1`) — the e2e job depends on the Build job and reuses its `dist/` artifact rather than rebuilding.

#### Suite setup: `tests/e2e/global-setup.ts` + `storageState` reuse (N15, 2026-04-30)

Playwright's `globalSetup` hook captures an onboarded `storageState` snapshot once per suite run into `tests/e2e/.auth/onboarded.json` (gitignored). The hook boots the app, marks `onboardingComplete=true` in IDB, navigates past onboarding, and writes the captured cookies + localStorage + IDB to disk. Every non-onboarding journey spec opts in via:

```js
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })
```

Each test gets a fresh `BrowserContext` with the snapshot reloaded — no per-test `markOnboardingComplete + clearAllData + cold-boot` needed, and the `marks`/`edges`/`bookmarks` stores are reset to the snapshot (empty) implicitly between tests. Onboarding-flow specs (`journey-a`) and SW/cross-tab carve-outs (`journey-h`, `journey-i`) opt OUT with `test.use({ storageState: { cookies: [], origins: [] } })`. See `CLAUDE.md` Rule 6.5 and the spec at `docs/superpowers/specs/2026-04-30-n15-global-setup-design.md`.

### Static checks
- **ESLint** (strict mode, `typescript-eslint`, `eslint-plugin-svelte`) via `pnpm run lint`.
- **Stylelint** (`stylelint-config-standard`) via `pnpm run lint:css` — enforces selector grammar + custom-property prefixes under `src/styles/`.
- **svelte-check** type gate via `pnpm run check`.
- **Design-token gates** via `pnpm run check:styles`:
  - `check-theme-parity.mjs` — every token in a theme override must exist in `:root`.
  - `check-token-usage.mjs` — every `var(--qa-*)` must resolve to a declared token (global or file-local/scoped).
  - `check-at-layer.mjs` — no bare rules outside `@layer` (except `reset.css` / `base.css` / `index.css`).
- **Gzipped-chunk budget** via `pnpm run check-chunks` (≤150 KB per chunk).
- **Feature-state guard** via `pnpm run check-no-feature-state` (blocks top-level mutable state in feature modules).
- **Lighthouse CI** via `pnpm run lighthouse` (performance / a11y / best-practices regression guard).

Composite gate: `pnpm run validate` runs lint → lint:css → check:styles → check → test:run → build → check-chunks.

Minimum browser: Chrome 111, Safari 16.2, Firefox 113 (required for `color-mix()` in `semantic.css`).

## CI/CD

CI lives at `.github/workflows/ci.yml` and runs on push/PR to `main`, `dev`, `staging`. Jobs share a composite setup action (`.github/actions/setup/action.yml`) that pins `pnpm@10.31.0` + Node 20 and restores a lockfile-keyed cache. All jobs run in parallel except `check-chunks` and `lighthouse`, which consume the `dist/` artifact uploaded by `build` (no redundant rebuilds). Jobs:

| Job | Purpose |
|---|---|
| `lint` | `pnpm run lint` |
| `typecheck` | `pnpm run check` (svelte-check) |
| `test` | `pnpm run test:run` (Vitest, 40 specs) |
| `feature-state` | `pnpm run check-no-feature-state` |
| `audit` | `pnpm audit --audit-level moderate` |
| `build` | `pnpm run build`; uploads `dist/` artifact |
| `check-chunks` | `pnpm run check-chunks` against uploaded `dist/` |
| `lighthouse` | `lhci autorun` against uploaded `dist/` |
| `e2e` | Full Playwright suite (11 specs) with `PLAYWRIGHT_INCLUDE_OFFLINE=1`, `PLAYWRIGHT_USE_PREVIEW=1`, `PLAYWRIGHT_SKIP_BUILD=1`. Depends on `build` and downloads its `dist/` artifact, then runs against a preview server (no dev-server compile path under workers=6). |
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

Persistent overlays (`CommandSheet`, `MoreSheet`, `AmbientDock`, `AmbientPill`, `QuotaBanner`, `Editor`, `Panel`, `ClearDataConfirm`, `UndoToast`) are **Svelte components mounted once in `App.svelte`**, not imperative `init()` modules — they expose `open*` / `close*` APIs through bridge modules (`settings/panel-bridge.ts`, `marks/editor-bridge.ts`) rather than being composed by bootstrap.

Route modules (`reader/Reader.svelte`, `review/Hub.svelte`, `surahs/SurahList.svelte`, `about/About.svelte`, `onboarding/Onboarding.svelte`) are loaded lazily on first route match; the router invokes their cleanup before mounting the next route.

See [`architecture.md`](context/architecture.md) §Boot flow for the authoritative sequence.
