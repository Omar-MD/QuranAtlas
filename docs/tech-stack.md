# QuranAtlas Tech Stack

## Tooling

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| Package Manager | **pnpm** | 10+ | Fast, disk-efficient, strict dependency isolation |
| Build Tool | **Vite** | 8+ | Dev server, HMR, production bundling (Rolldown-powered) |
| CSS | **Lightning CSS** | — | Vendor prefixing, minification, CSS transforms |
| PWA | **vite-plugin-pwa** | 1.2+ | Workbox integration, manifest generation, `injectManifest` mode |
| Events | **mitt** | 3+ | Tiny (~200B) typed pub/sub event emitter |
| Logger | **Custom** | — | Dev-only console wrapper, zero-cost in production |
| Test Runner | **Vitest** | 3+ | Unit + integration tests, Vite-native |
| E2E | **Playwright** | — | Cross-browser end-to-end tests |
| DOM Env | **jsdom** | 26+ | Browser-like environment for tests |
| IDB Mock | **fake-indexeddb** | 6+ | IndexedDB polyfill for tests |
| Linter | **ESLint** | 9+ | Code quality, strict mode |

## Why These Choices

### pnpm (not npm, not Bun)
- **3.4x faster** cold installs than npm; sub-second warm installs
- **70% less disk space** via global content-addressable store with hard-links
- **Strict dependency isolation** eliminates phantom dependencies — only declared packages are accessible
- **100% npm compatibility** — no edge cases with native addons or tooling
- **Clean `pnpm-lock.yaml`** — human-readable, git-friendly diffs

Bun is faster (17x) but lacks jsdom support (uses happy-dom instead), has native addon compatibility gaps, and smaller ecosystem coverage. For a religious text app where correctness matters, pnpm's reliability wins.

### Vite 8 with Rolldown (not Bun bundler, not esbuild alone)
- **Rolldown** (Rust-based, built on Oxc) replaced Rollup in Vite 8 — **10-30x faster** production builds
- **Instant HMR** (~20ms) via ESM-native dev server
- **Single bundler** for dev and prod — eliminates "works in dev, breaks in prod" bugs
- **Perfect vanilla JS support** — no framework required
- **Largest plugin ecosystem** — 25M weekly downloads

### vite-plugin-pwa (not manual Workbox config)
- **2.8M weekly downloads**, 4,100+ GitHub stars
- **Zero-config** service worker generation, manifest creation, Workbox integration
- **`injectManifest` mode** — supports our custom `sw.js` with `CACHE_DATASET`, `APPLY_DATASET_UPDATE` handlers
- **Works with vanilla JS** — no framework required
- Handles offline fallbacks, push notifications, update notifications

### Vitest (not Bun test, not Jest)
- **Full `fake-indexeddb` + `jsdom` support** — critical for testing IndexedDB layer
- **Vite-native** — shares config with build (path aliases, env vars, module resolution)
- **3.7x faster** than Jest
- **Jest-compatible API** — familiar patterns, easy to reference

Bun test is faster but lacks jsdom, making IndexedDB testing harder and less reliable. For an app that depends heavily on IndexedDB, reliable DOM/IndexedDB simulation is non-negotiable.

## Project Structure

```
src/
├── core/                    # Infrastructure (no deps on features)
│   ├── app.js               # Bootstrap: wires modules, init lifecycle
│   ├── router.js            # Hash router, launch restore logic
│   ├── events.js            # Global pub/sub bus
│   ├── db.js                # IndexedDB connection, schema v1
│   └── theme.css            # CSS vars for themes, tokens
│
├── data/                    # Data access (deep modules)
│   ├── dataset.js           # Facade: getSurah(), getSurahs()
│   └── offline.js           # PWA install + corpus download
│
├── offline/                 # Offline dataset management
│   ├── dataset-updater.js   # Version check, cache invalidation, re-download
│   ├── manifest-fetcher.js  # Fetch remote dataset manifest
│   ├── sha256-verifier.js   # Verify downloaded file integrity
│   └── staging-cache.js     # Stage new dataset before activation
│
├── reader/                  # Reading experience (#/s/:surah/:ayah)
│   ├── index.js             # Route handler
│   ├── scroll-tracker.js    # IntersectionObserver position tracking
│   └── resume-indicator.js  # "Resume reading" banner
│
├── nav/                     # Navigation & browsing
│   └── index.js             # Surah list, search, filter, dispatch
│
├── marks/                   # Verse marking & tagging
│   ├── store.js             # IDB CRUD for marks
│   ├── tags.js              # Default tag registry
│   ├── editor.js            # Long-press/modal, tag assignment, undo
│   └── indicator.js         # Colored dots on verses
│
├── review/                  # Review hub (#/review)
│   ├── hub.js               # All Marks: grouping, filtering, pagination
│   └── state.js             # Review state persistence to IDB
│
├── settings/                # Settings (#/settings)
│   ├── index.js             # Settings page UI
│   ├── theme.js             # Theme load/set, CSS var application
│   └── clear-data.js        # "DELETE" confirmation modal, full wipe
│
├── about/                   # About (#/about)
│   ├── index.js             # About page UI
│   ├── versions.js          # App version, dataset version
│   ├── attribution.js       # Credits
│   ├── storage.js           # Storage quota display
│   └── pwa-install.js       # beforeinstallprompt + install button
│
├── safety/                  # Cross-cutting safety (permitted cross-imports)
│   └── input-validator.js   # parseNavigationInput(), validateTagParam()
│
├── a11y/                    # Accessibility (permitted cross-imports)
│   └── announcer.js         # aria-live announcements
│
└── sw.js                    # Service worker (separate execution context)
```

## Module Communication Rules

1. **Default:** Cross-feature communication goes through `core/events.js` or through dependencies wired in `core/app.js`
2. **Wiring layer:** `core/app.js` is the composition root; route modules receive cross-feature hooks as the second argument to `init(params, hooks)`
3. **Permitted direct imports:** `safety/` and `a11y/` modules may be imported directly by any feature module
4. **Feature boundaries:** Feature modules must not import sibling feature modules directly; `reader/` and `review/` receive marks UI hooks via `core/app.js`
5. **Narrow data access exception:** `review/` may import `marks/store.js` for persisted mark queries and mutations
6. **Dependency direction:** `core/` ← `data/` ← features (one-way, no cycles)

## IDB Schema (v1)

| Store | Key Path | Records |
|---|---|---|
| `settings` | `key` | `{ key: 'translationVisible', value: boolean }`, `{ key: 'theme', value: 'light' \| 'sepia' \| 'dark' }`, `{ key: 'deleted-default-tags', value: string[] }` |
| `positions` | `id` | `{ id: 's{surah}', surah, verse, savedAt }`, `{ id: 'review', view, activeTag, surahFilter, sortBy, groupBy }` |
| `marks` | `verseKey` | `{ verseKey, tags[], createdAt, updatedAt }` (indexes: `by-tag` multiEntry, `by-updated`) |
| `activationState` | `id` | `{ id: 'current', status, version, progress, error, stagedAt }` |
| `datasetMeta` | `id` | `{ id: 'current', version }` |

## Routing

| Route | Module |
|---|---|
| `#/s/:surah` | `reader/index.js` |
| `#/s/:surah/:ayah` | `reader/index.js` |
| `#/review` | `review/hub.js` |
| `#/settings` | `settings/index.js` |
| `#/about` | `about/index.js` |
| `#/t/:tag` | `review/hub.js` — FVR fallback when marks exist for tag, not-found otherwise |

## Testing Strategy

### Boundary Unit Tests (Vitest)
5 unit test files guard security and data integrity boundaries that E2E cannot reach:
- `safety/input-validator.test.js` — XSS rejection, surah/verse parsing boundaries
- `safety/sync.test.js` — cross-tab sync, IDB versionchange
- `offline/dataset-updater.test.js` — SHA-256 verification, update state machine
- `core/router.test.js` — param sanitization, route matching
- `core/db.test.js` — IDB schema validation, store operations

### E2E Tests (Playwright)
9 specs cover critical user journeys against the production build.
See product-info.md “Critical User Journeys” for the canonical list.

### Static Checks
- ESLint + strict mode
- `pnpm audit` (dependency security)
- `scripts/check-chunks.js` (max 150KB gzip per chunk)

## Module Lifecycle Contract

Every `init()` function returns a cleanup function. The caller stores it and calls it when the module’s lifetime ends.

- **Route modules** (`reader`, `review/hub`, `settings`, `about`): Router calls cleanup on route change
- **Boot services** (`nav`, `safety/sync`, `quota-banner`): `app.js` collects cleanups in `bootCleanups[]`, drains on re-init
- **Router itself**: Returns cleanup from `init()`, collected by `app.js`

This replaces the previous mixed pattern of `cleanup()` exports, `destroy()` exports, and return values.
