# QuranAtlas

Distraction-free Quran reader PWA. Online-first; offline after explicit user download. Primary target: Chrome Android 12+ (4× CPU throttle).

## Stack
Vanilla JS ES2022+, Vite 6 + Lightning CSS, vite-plugin-pwa + Workbox 7 (injectManifest), idb 8, Vitest 3 + fake-indexeddb, Playwright (Chromium), ESLint v9 flat, Prettier 3, lefthook, Node 22 LTS, Cloudflare Pages.

## Dataset
Per-surah JSON: `{"ar":[...N verses],"en":[...N verses]}` — 114 files, ayah N = index N-1.
Corpus: quran.com PUA Uthmani (requires KFGQPC font). Translation: Bridges' by Fadel Soliman (non-commercial, attribution required, quran.com ID 149).
Metadata: `surahs.json` (114 records), `juz.json` (30 records), `annotations.json`, `provenance.json`, `manifest.json` (SHA-256 hashes baked into bundle — never fetched at runtime).
Totals: 6,236 ayahs. On-device: ~500 KB gzip.

## Architecture
Modules under `src/`: `core/` `reader/` `navigation/` `marks/` `review/` `dataset/` `offline/` `settings/` `about/` `safety/` `a11y/` `sw.js`
Cross-module: `src/core/events.js` pub/sub only. No direct sibling imports. Exceptions: `safety/input-validator.js`, `a11y/announcer.js`.

**Text storage:** Cache Storage for corpus JSON (never IDB — IDB getAll of 6,236 records = 200–500 ms vs <20 ms JSON parse). IDB for metadata only.

**IDB stores:**
| Store | Key | Durability |
|---|---|---|
| `marks` | verseKey `"2:255"` | strict |
| `positions` | `"main"` or `"review"` | relaxed |
| `settings` | key string | relaxed |
| `datasetMeta` | `"current"` | strict |
| `activationState` | `"current"` | relaxed |

Mark indexes: `by-tag` (multiEntry on tags[]), `by-updated` (on updatedAt).

**SW (injectManifest):** Precache app shell + fonts; dataset excluded via globIgnores (user-triggered download only). CacheFirst for `/fonts/**` (quran-fonts-v1) and `/dataset/**` (quran-dataset-v1).

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

## Security
- Arabic text: `textContent`/`createTextNode` only — never `innerHTML` with corpus data
- No `localStorage`/`sessionStorage` anywhere (IDB is the only mutable store)
- SHA-256 dataset integrity via `crypto.subtle.digest` in SW; hashes baked at build time
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
