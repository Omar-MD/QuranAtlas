# QuranAtlas — Master Plan

**Project:** QuranAtlas (formerly ayahMap)
**Version:** 1.0 (Research Phase)
**Date:** 2026-03-28
**Status:** Draft — pre-implementation

---

## 1. Product Summary

QuranAtlas is a distraction-free Quran reader for personal daily use. It is an **online-first browser web app** with an installable Progressive Web App layer that guarantees offline reading after an explicit offline-preparation step.

### Core Value Chain
1. Open in browser → read immediately (online)
2. Install PWA → continue from existing state
3. Prepare offline package → read with zero network dependency
4. Mark verses, review marks → private, local, no accounts

### Target
- Primary: Chrome on Android 12+ (Moto G Power 2022 equivalent, 4× CPU throttle)
- Secondary: Chrome desktop (online reading)

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | Vanilla JS ES2022+, no TypeScript, no framework | Matches existing CLAUDE-old.md constitution; lowest runtime overhead |
| Build | Vite 6.x | ESM-native, excellent HMR, Rollup-based splitting, `injectManifest` PWA support |
| PWA | vite-plugin-pwa + Workbox 7 (`injectManifest` mode) | Custom SW needed for dataset caching strategy and Background Fetch |
| IDB | idb v8 (ESM-only) | Thin Promise wrapper; typed DBSchema; itera helpers |
| Unit tests | Vitest 3.x + fake-indexeddb | ESM-native, fast; fake-indexeddb for IDB isolation per test |
| E2E tests | Playwright 1.x | Offline simulation, IDB inspection, Lighthouse integration |
| Lint | ESLint v9 flat config | no-eval, no-localStorage, no-unsanitized, unicorn selective rules |
| Arabic font | KFGQPC Uthman Taha Naskh WOFF2 (~280 KB) | Required by quran.com PUA-encoded corpus; same font as the Madinah Mushaf; redistribution confirmed |
| Translation font | Noto Naskh Arabic | System fallback; OFL; covers Arabic UI block |

---

## 3. Dataset Package Specification

### 3.1 Source Data

| Asset | Source | License | Notes |
|---|---|---|---|
| Arabic corpus (Uthmani) | Quran Foundation / quran.com API (`text_uthmani` PUA field) or github.com/quran/quran-json | Redistribution confirmed | PUA-encoded; requires KFGQPC font; ~680 KB uncompressed |
| English translation | The Clear Quran — Dr. Mustafa Khattab (theclearquran.org / quran.com API) | CC BY-NC-ND 4.0 — non-commercial, no derivatives, attribution required | QuranAtlas MUST remain non-commercial |
| Surah metadata | Quran Foundation / quran.com API or risan/quran-json (GitHub) | MIT (risan) | 114 records |
| Juz boundaries | Quran Foundation / quran.com API or risan/quran-json (GitHub) | MIT (risan) | 30 records |
| Sajda / basmala annotations | Derived from quran.com annotated data | Same as corpus — confirmed | 15 sajda positions, basmala rules |
| Navigation font | KFGQPC Uthman Taha Naskh | Proprietary — redistribution confirmed | Bundled in app shell, not dataset package |

### 3.2 Package File Structure

```
quran-atlas-data-v{N}/
├── manifest.json         # SHA-256 hashes of all files + package version
├── provenance.json       # License, attribution, source release, version
├── surahs.json           # 114 surah metadata: [{n,name,arabic,type,count,juz}]
├── juz.json              # 30 juz start positions: [{j,s,a}]
├── annotations.json      # Sajda markers, basmala rules, closing dua text
└── surah/
    ├── 001.json          # Combined Arabic + translation, parallel arrays
    ├── 002.json
    ...
    └── 114.json
```

**Per-surah file format** (minimum-size schema — no per-verse key overhead):
```json
{"ar":["بِسۡمِ ٱللَّهِ...","ٱلۡحَمۡدُ..."],"en":["In the name...","All praise..."]}
```
- Position in array = ayah index (0-based → ayah N-1). Lookup: `data.ar[ayah - 1]`, `data.en[ayah - 1]`.
- Arabic and English grouped in the same file → gzip compresses them together (~10–15% better than separate files).

**Estimated sizes:**

| Component | Uncompressed | Gzip (on-device) |
|---|---|---|
| 114 surah files (PUA Arabic + Clear Quran English) | ~2.0 MB | ~480–520 KB |
| surahs.json | ~10 KB | ~3 KB |
| juz.json | ~1 KB | <1 KB |
| annotations.json | ~2 KB | <1 KB |
| provenance.json | ~2 KB | <1 KB |
| manifest.json | ~3 KB | <1 KB |
| **Total** | **~2.0 MB** | **~490–530 KB** |

> Cache Storage stores gzip-compressed responses, so the on-device footprint is the gzip figure (~500 KB). PUA-encoded Arabic is ~25% larger per character than standard Unicode; the combined parallel-array format offsets this.

### 3.3 Key Data Decisions

| Decision | Ruling |
|---|---|
| Corpus source | quran.com PUA-encoded Uthmani text (requires KFGQPC font); redistribution confirmed |
| Translation | The Clear Quran — Dr. Mustafa Khattab (CC BY-NC-ND 4.0); QuranAtlas must remain non-commercial |
| Per-surah file schema | Parallel arrays `{"ar":[...],"en":[...]}` — no per-verse field name overhead; ayah N = index N-1 |
| Combined per-surah files | Arabic + translation in one file per surah → gzip compresses them together; ~10–15% smaller than separate files |
| Single blob vs per-surah | Per-surah retained for natural download checkpointing; each file 3–80 KB; Web Worker parse <5 ms |
| Verse key (IDB) | `"2:255"` string — used only for marks (IDB), not for corpus storage (Cache Storage) |
| Basmala for surahs 2–114 | `prefix` type — rendered as non-interactive centered header before verse 1; NOT verse `N:0` |
| Basmala for surah 1 | `counted` type — this is verse 1:1; normal verse card with mark eligibility |
| Basmala for surah 9 | `none` — no element rendered |
| Basmala in 27:30 | Regular verse text — treated as verse content, not a bismillah annotation |
| Closing Dua | Non-canonical text in `annotations.json`; rendered as a named reader state with no verse key and no mark tap target |
| Juz metadata | Not in quran.com corpus — sourced separately (quran.com API or risan/quran-json, MIT) |

### 3.4 Integrity Verification

- `manifest.json` SHA-256 hashes baked into the compiled JS bundle at build time (not fetched at runtime).
- All downloaded data files are verified against baked hashes via `crypto.subtle.digest('SHA-256', buffer)` in the Service Worker before any dataset is marked active.
- If any file fails verification: abort, keep current dataset, show recovery message.

### 3.5 Dataset Build Pipeline

The dataset is pre-built by a maintainer (not fetched at app runtime). A Node.js build script (`scripts/build-dataset.js`) produces the package:

```
1. Fetch quran.com Uthmani corpus (PUA-encoded)
   → GET https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number={1..114}
   → Or use github.com/quran/quran-json (Uthmani PUA text field)

2. Fetch The Clear Quran translation
   → GET https://api.quran.com/api/v4/quran/translations/{clear_quran_id}?chapter_number={1..114}
   → Or alquran.cloud/v1/quran/en.khattab

3. For each surah 1–114:
   → Build {"ar": [...N verses...], "en": [...N verses...]}
   → Write to public/dataset/surah/{NNN}.json

4. Build surahs.json, juz.json, annotations.json, provenance.json

5. SHA-256 hash every file → write manifest.json

6. Verify corpus: exactly 6,236 ayahs across 114 surahs; counts match known per-surah totals
```

The build output is committed to `public/dataset/` or published to a CDN. The app downloads on demand and never calls quran.com at runtime.

**License constraint to record in `provenance.json`:** The CC BY-NC-ND 4.0 license on The Clear Quran is a permanent non-commercial constraint — no ads, no paid tiers, no commercial redistribution for any version of QuranAtlas that bundles this translation.

---

## 4. Architecture

### 4.1 Module Map

```
src/
├── core/
│   ├── events.js          # Pub/sub bus (only cross-module communication channel)
│   ├── db.js              # openDB, schema, migrations (idb v8)
│   ├── router.js          # Hash-based routing, lazy module loading
│   └── app.js             # Entry point — initialises core, renders shell
│
├── reader/
│   ├── index.js           # Reader page init, verse rendering pipeline
│   ├── scroller.js        # Continuous scroll, surah boundary detection
│   ├── verse-card.js      # Single verse card DOM builder (Arabic + translation)
│   ├── orientation-cue.js # Persistent surah/juz label
│   └── closing-dua.js     # Closing dua chapter rendering
│
├── navigation/
│   ├── index.js           # Navigation surface (surah/verse/juz tabs)
│   ├── surah-tab.js
│   ├── juz-tab.js
│   └── verse-tab.js
│
├── marks/
│   ├── index.js           # Mark store facade (read/write via db.js)
│   ├── editor.js          # Mark editor surface (auto-save, tag input)
│   ├── tag-input.js       # Tag suggestion + inline creation
│   └── undo.js            # Temporary undo buffer after delete
│
├── review/
│   ├── index.js           # Review hub surface
│   ├── all-marks.js       # All Marks result view
│   ├── tag-result.js      # Single-tag result view
│   └── filtered-reader.js # Filtered verse reader (FVR) mode
│
├── dataset/
│   ├── index.js           # Dataset load orchestration (Cache Storage read)
│   ├── corpus.js          # Arabic corpus loader (Web Worker + per-surah JSON)
│   ├── translation.js     # Translation loader
│   ├── metadata.js        # Surah / juz metadata
│   └── verify.js          # SHA-256 integrity check via crypto.subtle
│
├── offline/
│   ├── index.js           # Offline preparation flow orchestration
│   ├── download.js        # fetch + ReadableStream download with progress
│   ├── bg-fetch.js        # Background Fetch progressive enhancement
│   ├── activation.js      # Activation state persistence + resume logic
│   └── update-check.js    # Automatic dataset update detection
│
├── settings/
│   ├── index.js           # Settings surface
│   └── store.js           # Read/write settings to IDB
│
├── about/
│   └── index.js           # About page (provenance, version, install entry)
│
├── safety/
│   └── input-validator.js # Tag, note, deep-link parameter validation
│
├── a11y/
│   └── announcer.js       # Live region announcements for screen readers
│
└── sw.js                  # Custom Service Worker (injectManifest entry point)
```

### 4.2 Communication Model

- **All cross-module communication flows through `src/core/events.js`** (pub/sub). No direct imports across domain boundaries except into `core/`.
- Modules emit typed events; subscribers react. No shared mutable state outside `core/db.js`.
- Cross-tab changes broadcast on `BroadcastChannel('quran-atlas:db-events')`.
- Tab re-focus triggers lightweight IDB re-reads via `visibilitychange`.

### 4.3 Data Layer

| Store | Key | Primary Operations | Durability |
|---|---|---|---|
| `marks` | `verseKey` string e.g. `"2:255"` | get, put, delete, getAll, cursor by tag | `strict` |
| `positions` | `id` string: `"main"` or `"review"` | get, put | `relaxed` |
| `settings` | `key` string | get, put, getAll | `relaxed` |
| `datasetMeta` | `id` string: `"current"` | get, put | `strict` |
| `activationState` | `id` string: `"current"` | get, put | `relaxed` |

**Mark indexes:**
- `by-tag` — `multiEntry: true` on `tags[]` — enables `getAllFromIndex('marks', 'by-tag', tagValue)`.
- `by-updated` — on `updatedAt` — enables chronological review ordering.
- "All active tags" query: `openKeyCursor(null, 'nextunique')` on `by-tag` index — O(log N + K).

### 4.4 Service Worker Strategy

```
sw.js (injectManifest)
│
├── precacheAndRoute(self.__WB_MANIFEST)
│   └── App shell: HTML, JS chunks, CSS, WOFF2 fonts, icons
│   └── Dataset files: EXCLUDED via globIgnores
│
├── CacheFirst route → /fonts/**
│   └── cacheName: 'quran-fonts-v1'
│   └── ExpirationPlugin: 1 year
│   └── CacheableResponsePlugin: statuses [0, 200]
│
├── CacheFirst route → /assets/dataset/**
│   └── cacheName: 'quran-dataset-v1'
│   └── User-triggered download populates this cache
│
└── Message handlers
    ├── SKIP_WAITING → self.skipWaiting()
    ├── CACHE_DATASET → fetch files, write to dataset cache, postMessage progress
    └── PURGE_DATASET_CACHE → caches.delete('quran-dataset-v1')
```

### 4.5 Chunk Splitting

```
dist/assets/
├── shell-[hash].js       # core/, a11y/, safety/ — loaded synchronously
├── reader-[hash].js      # reader/, navigation/ — loaded at app start
├── dataset-[hash].js     # dataset/, offline/ — loaded user-triggered
├── marks-review-[hash].js # marks/, review/ — loaded when user opens marks
├── settings-[hash].js    # settings/, about/ — loaded on demand
└── vendor-[hash].js      # idb, other node_modules
```

---

## 5. Performance Strategy

### 5.1 Budgets (C-4 — Binding)

| Metric | Budget | Measurement Condition |
|---|---|---|
| App shell first paint | ≤ 1,500 ms | 4× CPU throttle, warm cache |
| First verse render | ≤ 800 ms | 4× CPU throttle, warm cache |
| Surah / juz / verse jump | ≤ 500 ms | Same conditions |
| Deep-link resolve | ≤ 500 ms | Same conditions |
| Mark persistence | ≤ 200 ms | Same conditions |

### 5.2 Critical Render Path

1. `index.html` — minimal shell; inline critical CSS (top bar, first verse placeholder).
2. `<link rel="preload" href="/fonts/kfgqpc-uthmani.woff2" as="font" crossorigin>` — first preload tag; resolves from SW cache in ~0 ms.
3. `shell-[hash].js` deferred — initialises event bus, IDB connection, router.
4. `reader-[hash].js` dynamic import — triggered immediately after shell; renders first verse within budget.
5. Adjacent surah prefetched in `requestIdleCallback` after current surah renders.

### 5.3 Arabic Text Loading

- **Per-surah JSON files** in Cache Storage (`/assets/dataset/surah-001.json` … `surah-114.json`).
- Each file is 5–80 KB; parsed in a **Web Worker** off the main thread.
- First 10 verses rendered synchronously; remainder via `requestIdleCallback` chunks of 20.
- Do NOT use IndexedDB as the primary text store — IDB cursor scans of 6,236 records take 200–500 ms on mid-range Android vs. <20 ms JSON parse of a per-surah file.

### 5.4 Font Strategy

```css
@font-face {
  font-family: 'KFGQPCUthman';
  src: url('/fonts/kfgqpc-uthmani.woff2') format('woff2');
  font-display: fallback;   /* 100ms block, 3s swap window */
  /* PUA block (U+E000-F8FF) must be included — quran.com corpus uses PUA codepoints */
  unicode-range: U+0600-06FF, U+E000-F8FF, U+FB50-FDFF, U+FE70-FEFF;
}
```

With precaching, the 100 ms block is sufficient for cache retrieval — no FOUT. `swap` avoided to prevent severe CLS from Arabic metric mismatch with system fonts. The PUA range declaration ensures the browser loads KFGQPC for every PUA codepoint in the quran.com corpus.

---

## 6. Accessibility Baseline (C-6 — Binding WCAG 2.2 AA)

| Requirement | Implementation |
|---|---|
| 320 px width | Mobile-first layout; no horizontal scroll |
| 200% text zoom | Logical units throughout; no `px`-only flex heights |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` kills all transitions; programmatic scrolls use `behavior: 'instant'` |
| Touch targets | Verse number tap target min 44×44 px via padding expansion (negative margin technique) |
| Focus indicators | `:focus-visible` ring on all interactive elements; no `outline: none` |
| Screen reader announcements | `src/a11y/announcer.js` live region for navigation jumps, mark saves, error conditions |
| Diacritics contrast | ≥ 4.5:1 required; tested against actual diacritic pixel color (not just CSS value) |
| Arabic font size | ≥ 20 CSS px (default 24 px); line-height ≥ 1.8x (default 2.0x) |
| User zoom | `<meta name="viewport" content="width=device-width, initial-scale=1">` — no `user-scalable=no` |

---

## 7. Security Requirements

| Requirement | Implementation |
|---|---|
| No eval | ESLint `no-eval`, `no-implied-eval`, `no-new-func` |
| No innerHTML with untrusted data | `eslint-plugin-no-unsanitized`; all Arabic/translation text via `textContent` or `createTextNode` |
| No localStorage | ESLint `no-restricted-globals` banning `localStorage`/`sessionStorage`; all state in IDB |
| Input validation | `src/safety/input-validator.js` validates tag labels (non-empty, bounded length), note bodies, deep-link params before any use |
| Dataset integrity | SHA-256 via `crypto.subtle.digest` in SW; hashes baked into app bundle at build time |
| Text immutability | Canvas or text node rendering only — no string manipulation of Arabic corpus text |
| CSP | `script-src 'self'`; no inline scripts; no `eval`; `font-src 'self'` |
| No analytics | No external requests except dataset CDN during explicit download |
| Destructive action gates | Mark delete with meaningful content requires confirmation + undo affordance |

---

## 8. PWA Mechanics

### 8.1 Install Prompt
- Capture `beforeinstallprompt`, call `e.preventDefault()`, store reference.
- Suppress for 7 days after user dismissal (timestamp in IDB `settings` store — NOT localStorage).
- Detect standalone mode: `window.matchMedia('(display-mode: standalone)').matches`.
- Do not show prompt if already installed.
- Show one gentle prompt during calm reading; never in review or editor flows.

### 8.2 Offline Preparation Flow

```
[Download Quran data] button
    │
    ▼
SW message: { type: 'CACHE_DATASET', urls: [...] }
    │
    ├── fetch 114 combined per-surah JSON files (Arabic + translation, ~18 KB avg gzip = ~2.1 MB total)
    ├── fetch surahs.json, juz.json, annotations.json, provenance.json
    ├── stream download progress → UI progress bar
    └── after all files cached: verify SHA-256 checksums
          │
          ├── PASS → write datasetMeta to IDB; emit OFFLINE_READY event
          └── FAIL → purge partial cache; show recovery message; allow retry
```

- Interruption handled: on resume, check `caches.match(url)` before fetching — already-cached files are skipped.
- `activationState` IDB record tracks phase: `idle | downloading | verifying | applying | failed`.
- Background Fetch API used as progressive enhancement on Android Chrome 74+.

### 8.3 Automatic Dataset Updates

1. On SW `activate` event (and periodically via Background Sync), fetch `/data/dataset-manifest.json` (stable URL).
2. Compare `package_version` against `datasetMeta.version` in IDB.
3. If newer: download only changed files to a staging cache (`quran-dataset-staging`).
4. Verify all checksums.
5. Check if any existing `marks` have `verseKey` values that would become invalid in the new dataset.
   - If safe: activate automatically; show bounded toast.
   - If marks at risk: pause, show explicit review-and-confirm UI before activating.
6. On activation: swap staging cache to live cache; update `datasetMeta`.

---

## 9. Phased Roadmap

### Phase 0 — Foundation (Before First Feature)
- [ ] `package.json` — Vite 6, Workbox 7, idb 8, Vitest 3, Playwright 1, ESLint 9
- [ ] `vite.config.js` — single SPA entry, `injectManifest` mode, `manualChunks`
- [ ] `eslint.config.js` — flat config with security rules
- [ ] `vitest.config.js` — jsdom, fake-indexeddb setup, v8 coverage
- [ ] `playwright.config.js` — chromium, remote debugging port for Lighthouse
- [ ] `src/sw.js` — skeleton with `precacheAndRoute(self.__WB_MANIFEST)` and font/dataset routes
- [ ] `src/core/events.js` — typed pub/sub bus
- [ ] `src/core/db.js` — `openDB` with full schema v1 + `versionchange` handler
- [ ] `src/core/router.js` — hash routing + lazy module loader
- [ ] Dataset build pipeline — scripts to produce per-surah JSON files + `manifest.json` with SHA-256
- [ ] CI pipeline skeleton — lint → unit → build → e2e → Lighthouse

### Phase 1 — P1 Stories (Core Reading Experience)

**Story 1: Online-first web reading + PWA install (P1)**
- FR-001 Web entry: reader usable immediately online, no setup gate
- FR-022 PWA installability: manifest, icons, SW registration
- FR-003 Install prompt: gentle, dismissible, 7-day suppression
- FR-002 Offline preparation: staged flow with progress, integrity verification, resumable

**Story 2: Continuous reader + session restore (P1)**
- FR-005 Continuous reading: cross-surah scroll, verse-step controls
- FR-009 Canonical content presentation: basmala rules, closing dua, sajda markers
- FR-006 Orientation cue: surah/juz indicator; translation inline by default
- FR-025 Translation display: togglable from reading view
- FR-005 Session restore: exact verse-level position on relaunch; closing dua state

**Story 3: Navigation (P1)**
- FR-007 Navigation surface: surah / juz / verse tabs, last-used tab memory
- FR-008 Review-aware navigation limits
- FR-020 Deep-link resolution: `/s/{surah}/{ayah}` routes

### Phase 2 — P2 Stories (Marks & Review)

**Story 4: Auto-saved verse marks (P2)**
- FR-010 Mark model: one mark per verse, verse-number tap to open
- FR-011 Mark editing: auto-save, tag suggestion + inline creation, no duplicate tags
- FR-012 Mark deletion: confirmation, undo, named error paths
- FR-013 Tag validation: non-empty, bounded, deduplication

**Story 5: Unified review hub (P2)**
- FR-014 Review hub: All Marks + active tags only
- FR-015 Filtered verse reader: active filter, preserves main position
- FR-016 Session continuity: review context persisted separately; resume on relaunch

### Phase 3 — P3 Stories (Safety & Updates)

**Story 6: Single-tab safety (P3)**
- FR-019 Cross-tab: `versionchange` handler, BroadcastChannel sync, `visibilitychange` re-sync
- FR-019 Conflict: preserve-or-discard choice when stale tab has a draft at risk

**Story 7: Private deep links (P3)**
- FR-020 Review deep links: `/t/{tag_id}` same-device review route

**Story 8: Automatic dataset updates (P3)**
- FR-023 Update detection, staging, verification, safe-vs-risky activation, resume on interruption

**Story 9: About page + reading settings (P3)**
- FR-024 About: provenance, dataset version, install/update entry points
- FR-026 Themes: light, sepia, dark (all WCAG 2.2 AA)
- FR-018 Storage durability: non-blocking warnings, explicit reset confirmation
- FR-021 Accessibility baseline: full WCAG 2.2 AA audit across all themes

---

## 10. Pre-Commit Checks

```bash
npm run lint          # ESLint flat config (zero warnings in CI)
npm run test          # Vitest unit + integration suite
```

Before every PR / story stabilisation:
```bash
npm run ci:local      # lint + test + build + e2e + Lighthouse
```

Single test file:
```bash
npx vitest run tests/unit/mark-store.test.js
```

---

## 11. CI Pipeline Definition

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    steps:
      - lint           # ESLint — fail on any error
      - unit-test      # Vitest --coverage; threshold: lines 80%, functions 80%
      - build          # vite build — fail if any chunk > 150 KB gzip
      - e2e            # Playwright chromium — offline + IDB + install tests
      - lighthouse     # PWA ≥ 80, Performance ≥ 80, A11y ≥ 90, Best Practices ≥ 85
```

---

## 12. Review Checklist (per commit)

- [ ] `npm run lint` passes (zero errors)
- [ ] `npm run test` passes (all affected unit/integration tests)
- [ ] No hardcoded secrets or environment-specific values
- [ ] Acceptance criteria in `docs/spec.md` for the task are met
- [ ] No direct cross-module imports outside `core/`
- [ ] No `localStorage` / `sessionStorage` usage
- [ ] No inline scripts, no `eval`
- [ ] Quran text rendered verbatim — `textContent` only, no string transforms
- [ ] Touch targets ≥ 44×44 CSS px for primary flows
- [ ] `prefers-reduced-motion` honoured for any new motion
- [ ] Arabic font ≥ 20 CSS px, line-height ≥ 1.8x
- [ ] Arabic diacritics contrast ≥ 4.5:1 verified in all three themes

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| KFGQPC font or quran.com corpus license is later revised or revoked | Very Low | High | Redistribution currently confirmed; if revoked in future: corpus fallback is Tanzil Uthmani (CC BY 3.0); font fallback is Scheherazade New (OFL, full Uthmani coverage) |
| Clear Quran CC BY-NC-ND 4.0 — non-commercial only | Low | High | QuranAtlas must have no ads, no paid tiers, no commercial redistribution while bundling this translation; document in `provenance.json` and project README |
| PUA corpus is unrenderable without KFGQPC font | High (if font unavailable) | High | Mitigated by bundling KFGQPC in app shell (offline-ready, precached); font is the first precached asset |
| PUA text is garbled when pasted outside the app | Known | Low | Ayah copy is out-of-scope (X-05); no copy affordance exposed |
| Background Fetch API unavailable (Firefox, iOS, old Android Chrome) | High (for non-Chromium targets) | Low | Already a progressive enhancement; `fetch + ReadableStream` is the primary path; no functionality lost |
| IDB storage eviction on non-persistent storage | Medium | High | Request `persist()` at startup; encourage PWA install (auto-grants persistence on Android Chrome); show non-blocking warning if denied |
| SHA-256 verification adds unacceptable time to dataset activation | Low | Medium | Verify in SW (not main thread); async; only affects one-time setup and updates, not reading |
| Per-surah file split (114 files) causes excessive Cache Storage requests | Low | Low | Cache Storage API is O(1) match; SW intercepts all fetches; browser batches cache writes |
| Workbox `cleanupOutdatedCaches` deletes staging cache during update flow | Low | Medium | Use namespaced cache names (`quran-dataset-v1` vs `quran-dataset-staging`); never name staging cache with Workbox precache prefix |
| `visibilitychange` + BroadcastChannel combination causes double re-render on tab switch | Low | Low | Debounce re-sync; track `missedUpdatesWhileHidden` flag to avoid redundant IDB reads |
| Closing Dua text requires ongoing provenance maintenance | Medium | Medium | Treat as content package item in `annotations.json`; never hardcode in renderer |

---

## 14. Out of Scope

| X-Code | Feature |
|---|---|
| X-01 | Audio recitation |
| X-02 | Transliteration |
| X-03 | Page-based Mushaf layout |
| X-04 | Full-text Arabic search |
| X-05 | Ayah copy |
| X-06 | Multi-device sync |
| X-07 | Community annotations |
| X-08 | Social sharing |
| X-09 | Multiple canonical editions |
| X-10 | Intra-ayah position fractions |
| X-11 | Analytics / telemetry |
| X-12 | Textual footnotes |
| X-13 | Data export / import |
| X-14 | Hizb / ruku navigation |
| X-15 | Tag rename, merge, or management screen |

---

## 15. Key Architectural Decisions Log

| Decision | Ruling | Rationale |
|---|---|---|
| Per-surah JSON files vs. single corpus blob | Per-surah split (114 files) | Enables natural download checkpointing; each file is fast to parse in a Web Worker; adjacent surah prefetch is trivial |
| Primary text storage: IDB vs Cache Storage | Cache Storage (JSON files) | IDB `getAll()` of 6,236 records takes 200–500 ms on mid-range Android; JSON parse of a per-surah file takes <20 ms |
| IDB use scope | Metadata only: marks, positions, settings, datasetMeta, activationState | Text corpus is read-only and better served from Cache Storage |
| SW mode | `injectManifest` | Dataset download needs custom caching logic; Background Fetch handler requires custom SW code |
| Dataset files in precache | No — excluded via `globIgnores` | Keeps SW install fast; user controls when dataset is downloaded |
| Install prompt storage | IDB `settings` store (NOT localStorage) | Architecture rule: no localStorage; IDB is the single mutable state store |
| `skipWaiting` policy | Never unconditional — prompt only | Unconditional `skipWaiting` can interrupt a reading session mid-use |
| Mark key format | `"2:255"` string | Simple; works for exact lookups (the dominant operation); zero-pad only if range scans needed |
| Tag query for review hub | `openKeyCursor(null, 'nextunique')` on `by-tag` index | Reads index only (not records); `nextunique` skips duplicates in one pass; sorted |
| Cross-tab sync | BroadcastChannel + `visibilitychange` | BroadcastChannel for live updates; visibilitychange as fallback catchall for suspended tabs |
| Corpus encoding | quran.com PUA (not standard Unicode) | User requirement: pixel-perfect Mushaf fidelity matching KFGQPC rendering |
| Arabic font | KFGQPC Uthman Taha Naskh (not Amiri Quran) | PUA encoding requires KFGQPC; only this font has the PUA glyph mapping for the quran.com corpus |
| Translation | The Clear Quran — Dr. Mustafa Khattab (not Pickthall) | User requirement; modern clear English; CC BY-NC-ND 4.0 non-commercial constraint acceptable for personal-use app |
| Dataset package format | Combined parallel-array per-surah files `{"ar":[...],"en":[...]}` | Minimum size: no per-verse key overhead; Arabic + English gzipped together; natural checkpointing preserved |
