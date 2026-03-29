# Phase 0 -- Foundation

**Priority:** Must complete before any feature work
**Depends on:** Nothing
**Blocks:** All Phase 1-3 stories

---

## Acceptance Criteria

### AC-001: Project initialisation

- [ ] `package.json` exists with `"type": "module"`, `engines.node >= 22`, and all dev dependencies from TDR
- [ ] `npm install` succeeds with zero audit vulnerabilities at `high` or `critical` severity
- [ ] `.nvmrc` specifies Node 22

### AC-002: Vite build

- [ ] `vite.config.js` configures: single SPA entry (`src/core/app.js`), `injectManifest` via vite-plugin-pwa, `manualChunks` producing 6 chunks (shell, reader, dataset, marks-review, settings, vendor), `css.transformer: 'lightningcss'` with `chrome: 112` target, `build.modulePreload.polyfill: false`, `build.assetsInlineLimit: 0`
- [ ] `npm run build` produces `dist/` with zero inline `<script>` tags in `index.html`
- [ ] No chunk exceeds 150 KB gzip (verified by post-build script)

### AC-003: ESLint

- [ ] `eslint.config.js` (flat config) enables: `no-eval`, `no-implied-eval`, `no-new-func`, `no-restricted-globals` (localStorage, sessionStorage), `eslint-plugin-no-unsanitized`, selective `eslint-plugin-unicorn` rules, `eslint-config-prettier`
- [ ] `npm run lint` runs with zero errors and zero warnings on the skeleton codebase

### AC-004: Prettier

- [ ] `.prettierrc` exists (or defaults used)
- [ ] `npm run format` formats all `src/`, `tests/`, config files
- [ ] `npm run format:check` exits non-zero if any file is unformatted

### AC-005: Vitest

- [ ] `vitest.config.js` configures: jsdom environment, fake-indexeddb auto-import in setup file, v8 coverage with thresholds (lines 80%, functions 80%)
- [ ] `npm run test` runs and passes (at least one smoke test in `tests/unit/core/`)
- [ ] Coverage report generated in `coverage/`

### AC-006: Playwright

- [ ] `playwright.config.js` configures: Chromium only, `baseURL` pointing to `vite preview`
- [ ] `npm run test:e2e` runs and passes (at least one smoke test in `tests/e2e/`)

### AC-007: Lighthouse CI

- [ ] `lighthouserc.json` configures thresholds: PWA >= 80, Performance >= 80, A11y >= 90, Best Practices >= 85
- [ ] Lighthouse assertion runs against built app

### AC-008: lefthook

- [ ] `lefthook.yml` configures pre-commit: lint staged JS files, format check staged files
- [ ] `lefthook install` succeeds

### AC-009: Service Worker skeleton

- [ ] `src/sw.js` contains `precacheAndRoute(self.__WB_MANIFEST)`, CacheFirst route for `/fonts/**`, CacheFirst route for `/dataset/**`, `SKIP_WAITING` message handler
- [ ] SW registers successfully in built app
- [ ] Font requests served from cache after first load

### AC-010: Core modules

- [ ] `src/core/events.js` implements typed pub/sub with `emit(event, data)`, `on(event, handler)`, `off(event, handler)`
- [ ] `src/core/db.js` implements `openDB` with full schema v1 (marks, positions, settings, datasetMeta, activationState stores + by-tag and by-updated indexes)
- [ ] `src/core/router.js` implements hash-based routing with lazy module loading via dynamic `import()`
- [ ] `src/core/app.js` is the entry point that initialises core modules and renders the app shell
- [ ] `src/core/error.js` registers global error handlers (`window.error`, `unhandledrejection`) and exposes `reportError()`

### AC-011: Dataset build pipeline

- [ ] `scripts/build-dataset.js` fetches corpus + translation, produces per-surah JSON files, `surahs.json`, `juz.json`, `annotations.json`, `provenance.json`, `manifest.json` with SHA-256 hashes
- [ ] Output written to `public/dataset/`
- [ ] Exactly 6,236 ayahs across 114 surahs verified
- [ ] `provenance.json` documents CC BY-NC-ND 4.0 constraint

### AC-012: CI pipeline

- [ ] `.github/workflows/ci.yml` runs: lint -> unit-test (with coverage) -> build (with chunk size check) -> e2e + lighthouse (parallel) -> deploy to Cloudflare Pages (main branch only)
- [ ] Pipeline passes on clean codebase

### AC-013: HTML shell

- [ ] `index.html` contains: minimal shell markup, `<meta>` CSP tag, `<link rel="preload">` for KFGQPC font, `<meta name="viewport">` without `user-scalable=no`, `<link rel="manifest">` for PWA manifest
- [ ] No inline `<script>` tags

### AC-014: CSP headers

- [ ] `public/_headers` file configures CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and path-specific Cache-Control rules
