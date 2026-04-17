# QuranAtlas Tech Stack

Tools, versions, and reasoning. For architecture and module layout, see [`docs/context/`](context/).

## Tooling

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| Package manager | **pnpm** | 10.31+ (pinned via `packageManager`) | Fast, disk-efficient, strict dependency isolation |
| Build tool | **Vite** | 8+ | Dev server, HMR, production bundling (Rolldown-powered) |
| CSS | **Lightning CSS** | — | Vendor prefixing, minification, CSS transforms |
| PWA | **vite-plugin-pwa** | 1.2+ | Workbox integration, manifest generation, `injectManifest` mode |
| Event bus | **mitt** | 3+ | Tiny (~200B) pub/sub |
| Logger | custom | — | Dev-only console wrapper, zero-cost in production |
| Test runner | **Vitest** | 3+ | Unit + integration, Vite-native |
| E2E | **Playwright** | — | Cross-browser end-to-end |
| DOM env | **jsdom** | 26+ | Browser-like environment for Vitest |
| IDB polyfill | **fake-indexeddb** | 6+ | IndexedDB for Vitest runs |
| Linter | **ESLint** | 9+ | Code quality, strict mode |

## Why these choices

### pnpm (not npm, not Bun)
- **3.4× faster** cold installs than npm; sub-second warm installs.
- **~70% less disk** via global content-addressable store with hard-links.
- **Strict dependency isolation** eliminates phantom dependencies — only declared packages are accessible.
- **100% npm-compatible** — no edge cases with native addons.
- **Readable `pnpm-lock.yaml`** — git-friendly diffs.

Bun is faster for pure-JS paths but lacks jsdom (uses happy-dom), has native-addon compatibility gaps, and thinner ecosystem coverage. For a religious-text app where correctness matters, pnpm's reliability wins.

### Vite 8 with Rolldown (not Bun bundler, not raw esbuild)
- **Rolldown** (Rust, built on Oxc) replaced Rollup in Vite 8 — **10–30× faster** production builds.
- **Instant HMR** (~20 ms) via ESM-native dev server.
- **Single bundler for dev and prod** — no "works in dev, breaks in prod" drift.
- **Vanilla-JS-friendly** — no framework required.
- **Largest plugin ecosystem** — 25M weekly downloads.

### vite-plugin-pwa (not manual Workbox config)
- **2.8M weekly downloads**, 4,100+ GitHub stars.
- **Zero-config** service worker generation, manifest, Workbox integration.
- **`injectManifest` mode** — supports our custom `src/sw.js` with dataset-cache handlers.
- Handles offline fallbacks and update notifications.

### Vitest (not Bun test, not Jest)
- **Full `fake-indexeddb` + `jsdom` support** — critical for testing the IDB layer.
- **Vite-native** — shares config with build (aliases, env vars, module resolution).
- **~3.7× faster** than Jest.
- **Jest-compatible API** — familiar patterns.

## Scripts

Defined in `package.json`:

| Command | Action |
|---|---|
| `pnpm run dev` | Start the Vite dev server |
| `pnpm run build` | Build production bundle into `dist/` |
| `pnpm run preview` | Preview the built bundle |
| `pnpm test` | Run Vitest in watch mode |
| `pnpm run test:run` | Run Vitest once (CI-style) |
| `pnpm run test:coverage` | Run Vitest with coverage |
| `pnpm run test:e2e:sw` | Run the SW-integration E2E against a production preview build |
| `pnpm run lint` | Run ESLint over `src/` |
| `pnpm run check-chunks` | Assert gzipped chunk budgets via `scripts/check-chunks.js` |
| `pnpm run lighthouse` | Build and run Lighthouse CI |

The `packageManager` field in `package.json` pins pnpm@10.31. Commands also run under `npx` in a pinch (e.g. `npx vitest run`), but pnpm is the canonical path.

## Architecture and internals

These used to be inlined in this file; they now live in `docs/context/` so there's a single source of truth:

- **Boot flow, router, events, cross-cutting patterns** → [`docs/context/architecture.md`](context/architecture.md)
- **Directory layout + imports-from / imported-by** → [`docs/context/module-graph.md`](context/module-graph.md)
- **IDB stores, keys, indexes, record shapes** → [`docs/context/data-model.md`](context/data-model.md)
- **Event bus catalog (emitters, listeners, payloads)** → [`docs/context/events.md`](context/events.md)
- **Feature inventory + routing table** → [`docs/context/feature-map.md`](context/feature-map.md)
- **End-to-end user journeys** → [`docs/context/user-journeys.md`](context/user-journeys.md)

## Testing strategy

The test suite runs in two layers:

- **Unit tests (Vitest + jsdom + fake-indexeddb)** — 35 files under `tests/unit/` covering route modules, IDB store wrappers, safety validators, nav/chrome modules, settings modules, and the review hub. Runs in every CI job via `pnpm run test:run`.
- **E2E tests (Playwright)** — 9 specs under `tests/e2e/` covering launch+navigation, position tracking, reader experience, verse marks, translation persistence, theme switching, navigation panel, performance budgets, and SW integration. Exercises the production build.

### Static checks

- ESLint (strict mode) via `pnpm run lint`.
- Gzipped-chunk budget check via `pnpm run check-chunks` (≤150 KB per chunk).
- Lighthouse CI via `pnpm run lighthouse` (performance / a11y / best-practices regression guard).

## Module lifecycle contract

Every `init()` function in a feature module returns a cleanup function. Who owns that cleanup:

- **Route modules** (`reader/`, `review/`, `surahs/`, `about/`, `onboarding/`): the router invokes cleanup before mounting the next route.
- **Boot services** (`nav/` dock + pill + command sheet + more sheet, `safety/sync`, `core/quota-banner`, `settings/panel`): `core/app.js` pushes each cleanup onto `bootCleanups[]` and drains the array on re-init.
- **Router itself**: returns a cleanup from `init()` — also collected by `core/app.js`.

See `docs/context/architecture.md` for the full boot sequence and cleanup pattern.
