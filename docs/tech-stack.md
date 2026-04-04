# QuranAtlas Tech Stack

## Tooling

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| Package Manager | **pnpm** | 10+ | Fast, disk-efficient, strict dependency isolation |
| Build Tool | **Vite** | 8+ | Dev server, HMR, production bundling (Rolldown-powered) |
| CSS | **Lightning CSS** | — | Vendor prefixing, minification, CSS transforms |
| PWA | **vite-plugin-pwa** | 1.2+ | Workbox integration, manifest generation, `injectManifest` mode |
| Test Runner | **Vitest** | 3+ | Unit + integration tests, Vite-native |
| E2E | **Playwright** | — | Cross-browser end-to-end tests |
| Coverage | **@vitest/coverage-v8** | 3+ | V8-based code coverage |
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
├── data/                    # Data access & offline (deep modules)
│   ├── dataset.js           # Facade: getSurah(), getSurahs()
│   ├── offline.js           # PWA install + corpus download
│   └── dataset-updater.js   # Version check, cache invalidation, re-download
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

1. **Default:** All cross-module communication goes through `core/events.js` (pub/sub bus)
2. **Exceptions:** `safety/` and `a11y/` modules may be imported directly by any feature module
3. **No sibling imports:** Feature modules must not import from other feature modules (except `review/` → `marks/store.js` for data access)
4. **Dependency direction:** `core/` ← `data/` ← features (one-way, no cycles)

## IDB Schema (v1)

| Store | Key Path | Records |
|---|---|---|
| `settings` | `key` | `{ key: 'translationVisible', value: boolean }`, `{ key: 'theme', value: 'light' \| 'sepia' \| 'dark' }`, `{ key: 'deleted-default-tags', value: string[] }` |
| `positions` | `id` | `{ id: 's{surah}', surah, verse, savedAt }`, `{ id: 'review', view, activeTag, surahFilter, sortBy, groupBy }` |
| `marks` | `verseKey` | `{ verseKey, tags[], createdAt, updatedAt }` (indexes: `by-tag` multiEntry, `by-updated`) |
| `activationState` | `id` | `{ id: 'current', state, version, progress, error }` |
| `datasetMeta` | `id` | `{ id: 'current', version }` |

## Routing

| Route | Module | Phase |
|---|---|---|
| `#/s/:surah` | `reader/index.js` | 1 |
| `#/s/:surah/:ayah` | `reader/index.js` | 2 |
| `#/review` | `review/hub.js` | 2 |
| `#/settings` | `settings/index.js` | 3 |
| `#/about` | `about/index.js` | 3 |
| `#/t/:tag` | Simple not-found → `#/review` | 3 |

## Testing Strategy

### Static Checks
- ESLint + strict mode
- `pnpm audit` (dependency security)
- `scripts/check-chunks.js` (max 150KB gzip per chunk)
- PWA manifest validation (lighthouse-ci)

### Unit Tests (Vitest)
- `data/dataset.js` — getSurah, getSurahs, getManifestUrls
- `safety/input-validator.js` — parseNavigationInput, validateTagParam
- `marks/store.js` — CRUD, event emission
- `marks/tags.js` — defaults, cascade deletion
- `review/state.js` — IDB persist/restore
- `settings/theme.js` — load/set, CSS application
- `about/versions.js` — app version, dataset version
- `reader/scroll-tracker.js` — position calculation, debounce
- `data/dataset-updater.js` — version check, state transitions
- `core/db.js` — IDB connection, versionchange

### Integration Tests (Vitest + jsdom + fake-indexeddb)
- Reader rendering, translation toggle, basmala rules
- Session restore, launch restore
- Navigation: search, filtering, current surah highlight
- Marking flow: long-press → modal → save → indicator → delete → undo
- Review hub: pagination, grouping, filtering, delete + undo
- visibilitychange re-read: hide → modify IDB → show → verify update
- Dataset updates: state machine, cache invalidation
- Settings persistence: theme survives reload

### E2E Tests (Playwright)
- First-time user: load → read → install PWA → download corpus → verify offline
- Session restore: read → close → reopen → resume
- Navigation: hamburger → search → navigate → verify
- Verse marks: long-press → tag → verify indicator → review hub
- Offline mode: disconnect → reload → verify cached content
- Deep links: `#/s/2/255` → exact verse
- Settings: dark mode → reload → persists → clear data → reset
- Cross-tab: visibilitychange re-read

### Performance Targets
| Metric | Target |
|---|---|
| First verse render | ≤ 800ms (4x CPU throttle, warm cache) |
| Al-Baqarah initial render (50 verses) | ≤ 500ms |
| Search filter response | ≤ 50ms |
| Mark persist | < 200ms |
| visibilitychange re-read (30 marks) | ≤ 300ms |
| Dataset update check | ≤ 200ms |

## Phases

**Phase 1** — Stories 1-3: Online reading, PWA install, continuous reader, session restore, surah navigation
**Phase 2** — Stories 4-5: Verse marks with default tags, review hub (All Marks view)
**Phase 3** — Stories 6-9: visibilitychange safety, verse deep links, dataset updates, settings/about
**Phase 4** (future): BroadcastChannel sync, custom tags, FVR, bulk delete, font size controls
