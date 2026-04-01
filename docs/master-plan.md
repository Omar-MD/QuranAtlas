# QuranAtlas

Distraction-free Quran reader PWA. Online-first; offline after explicit user download. Primary target: Chrome Android 12+ (4× CPU throttle).

## Stack
Vanilla JS ES2022+, Vite 6 + Lightning CSS, vite-plugin-pwa + Workbox 7 (injectManifest), idb 8, Vitest 3 + fake-indexeddb, Playwright (Chromium), ESLint v9 flat, Prettier 3, lefthook, Node 22 LTS, Cloudflare Pages.

## Dataset
Per-surah JSON: `{"ar":[...N verses],"en":[...N verses]}` — 114 files, ayah N = index N-1.
Corpus: quran.com PUA Uthmani (requires KFGQPC font). Translation: Bridges' by Fadel Soliman (non-commercial, attribution required, quran.com ID 149).
Metadata: `surahs.json` (114 records), `juz.json` (30 records), `annotations.json`, `provenance.json`, `manifest.json` (`packageVersion` + SHA-256 hash per file).
`manifest.json` is fetched at runtime in two contexts: (1) `dataset/getManifestUrls()` builds the URL list for the initial offline download (Story 1); (2) the SW `activate` handler fetches it to detect dataset updates (Story 8).
Totals: 6,236 ayahs. On-device: ~500 KB gzip.

## Architecture
Modules under `src/`: `core/` `reader/` `navigation/` `marks/` `review/` `dataset/` `offline/` `settings/` `about/` `safety/` `a11y/` `sw.js`
Cross-module: `src/core/events.js` pub/sub only. No direct sibling imports. Exceptions: `safety/input-validator.js`, `a11y/announcer.js`, `safety/sync.js`.

**Text storage:** Cache Storage for corpus JSON (never IDB — IDB getAll of 6,236 records = 200–500 ms vs <20 ms JSON parse). IDB for metadata only.

**IDB stores:**
| Store | KeyPath | Key Examples | Durability |
|---|---|---|---|
| `marks` | `verseKey` | `"2:255"` | strict |
| `positions` | `id` | `"s2"`, `"s114"`, `"review"` | relaxed |
| `settings` | `key` | `"translationVisible"`, `"lastSurface"`, `"theme"`, `"fontSize"`, `"user-tags"` | relaxed |
| `datasetMeta` | `id` | `"current"` | strict |
| `activationState` | `id` | `"current"` | relaxed |

Mark indexes: `by-tag` (multiEntry on `tags[]`), `by-updated` (on `updatedAt`).

**IDB record schemas:**
- `positions["s{N}"]`: `{ id: "s{N}", surah: number, verse: number, savedAt: timestamp }`
- `positions["review"]`: `{ id: "review", view: "all"|"fvr", activeTag: string|null, surahFilter: number|null, sortBy: "createdAt"|"updatedAt", groupBy: "surah"|"flat"|"tag" }`
- `settings[key]`: `{ key: string, value: any }` — one record per setting. Known keys: `"translationVisible"` (bool), `"lastSurface"` (`"reader"|"review"`), `"theme"` (`"light"|"sepia"|"dark"`), `"fontSize"` (`"small"|"normal"|"large"|"xl"`), `"user-tags"` (string[])
- `datasetMeta["current"]`: `{ id: "current", version: string }`
- `activationState["current"]`: `{ id: "current", state: "idle"|"downloading"|"verifying"|"applying"|"pending-confirmation"|"failed", version: string|null, progress: number, error: string|null, stagedAt: number|null }`. Story 1 uses `state: "downloading"` during initial corpus caching; completion is signalled by writing `datasetMeta.version` and resetting `state` to `"idle"`. Story 8 owns the full update-cycle state machine.

**SW (injectManifest):** Precache app shell + fonts; dataset excluded via `globIgnores` (user-triggered download only). CacheFirst for `/fonts/**` (`quran-fonts-v1`) and `/dataset/**` (`quran-dataset-v1`). Staging cache `quran-dataset-staging` holds in-progress update files; excluded from Workbox `cleanupOutdatedCaches`.

## Routes
| Hash | Handler | Notes |
|---|---|---|
| `#/` or empty | `core/router.js` | Session restore: `settings["lastSurface"] === "review"` → `#/review`; else Story 2 reader restore |
| `#/s/{surah}` | `reader/` | Surah view; Story 2 scroll restore applies |
| `#/s/{surah}/{ayah}` | `reader/` | Verse deep link; overrides session restore |
| `#/review` | `review/` | All Marks hub |
| `#/review/tags` | `review/tags.js` | Manage Tags screen |
| `#/t/{tag_label}` | `review/` | FVR deep link; tag label URL-decoded + lowercased via `validateTagParam` |
| `#/marks` | `marks/` | Marks index |
| `#/settings` | `settings/` | Theme switcher, font size, clear-all-data |
| `#/about` | `about/` | Versions, attribution, PWA install CTA, storage estimate |

## Canonical Content Rules
- Surah 1 basmala: verse 1:1 (counted, mark-eligible)
- Surahs 2–114 basmala: non-interactive prefix header (no verseKey, no mark target)
- Surah 9: no basmala
- 27:30: bismillah is verse content, not a basmala annotation
- Closing dua: from `annotations.json` after 114:6; no verseKey; not mark-eligible

## Performance Budgets (4× CPU throttle, warm cache)
- App shell first paint: ≤ 1,500 ms
- First verse render: ≤ 800 ms
- Surah/juz/verse jump: ≤ 500 ms
- Mark persistence: ≤ 200 ms
- `visibilitychange` re-read (30 marks): ≤ 300 ms
- `checkForUpdate()` (manifest fetch + hash-diff, network excluded): ≤ 200 ms
- `applyUpdate()` (staging→live copy, ≤ 100 files): ≤ 500 ms
- Theme or font size switch: instant (CSS var update only)
- Storage estimate (`navigator.storage.estimate()`): ≤ 100 ms

## Security
- Arabic text: `textContent`/`createTextNode` only — never `innerHTML` with corpus data
- No `localStorage`/`sessionStorage` for user data or app state. Exception: `localStorage` is permitted for volatile, non-sensitive UI state (e.g. active nav-tab indicator) that carries no user data and can be lost without consequence
- SHA-256 dataset integrity via `crypto.subtle.digest` in SW: per-file verification during initial corpus download and during update staging (Story 8); hashes sourced from `manifest.json`
- CSP: `script-src 'self'`, `font-src 'self'`, no inline scripts, no `eval`

## A11y (WCAG 2.2 AA binding)
- Arabic font ≥ 20 CSS px, line-height ≥ 1.8×
- Touch targets ≥ 44×44 CSS px
- `prefers-reduced-motion`: kills all transitions; scroll uses `behavior: 'instant'`
- Arabic diacritics contrast ≥ 4.5:1 in all themes (measured against actual pixel color)
- No `user-scalable=no`

## Roadmap
**Phase 0:** Toolchain, core modules, dataset build pipeline, CI/CD skeleton
**Phase 1 (P1):** Story 1 (online reading + PWA install) → Story 2 (continuous reader + session restore) → Story 3 (navigation)
**Phase 2 (P2):** Story 4 (verse marks) → Story 5 (review hub)
**Phase 3 (P3):** Story 6 (cross-tab safety) → Story 7 (deep links) → Story 8 (dataset updates) → Story 9 (settings + about)

## Out of Scope
Audio, transliteration, page-based Mushaf layout, full-text search, ayah copy, multi-device sync, community annotations, social sharing, multiple editions, intra-ayah position fractions, analytics, footnotes, data export, hizb/ruku navigation, tag management screen.
