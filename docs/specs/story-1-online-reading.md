---
issue: 1
title: "Story 1: Online Reading & Offline Setup"
state: OPEN
---

## Problem Statement

A user opens QuranAtlas for the first time on their phone. They want to read Quran immediately but also have the app reliably available offline — on a commute, during prayer time, or while travelling without signal. Today they depend on internet connectivity for every session, and the browser's native PWA install prompt is easily missed or misunderstood. There is no guided path to take the app offline.

## Solution

The app loads and renders Quran text immediately from the network — no download gate. The `offline/` module captures the browser's install prompt and surfaces it as a visible, dismissible call-to-action in the top bar. A separate "Download for offline" flow orchestrates the corpus transfer through the service worker, showing per-file progress and completing silently. Once downloaded, every read request is served from cache with no observable difference in experience. The `dataset/` module abstracts whether data comes from cache or network — the reader never knows.

## User Stories

**Reading**

1. As a first-time visitor, I want Quran text to render immediately from the network without any loading gate, so that I can evaluate the app and start reading right away.
2. As a reader, I want each verse to display large, correctly-shaped Arabic text, so that I can read the Quran comfortably on a small screen.
3. As a reader, I want the Bridges' English translation to appear below each Arabic verse, so that I can follow the meaning as I read.
4. As a reader, I want to toggle the translation on or off for the whole session with one tap, so that I can read Arabic only when I want to focus on the text.
5. As a reader, I want my translation toggle preference to persist across sessions, so that I don't have to reset it each time I open the app.
6. As a reader, I want to see the surah name (Arabic and transliteration) and surah number at the top of the page, so that I always know what I am reading.
7. As a reader, I want each verse to be clearly numbered, so that I can identify and reference specific ayahs.
8. As a reader on a surah that has a basmala (all surahs except Al-Fatiha and At-Tawbah), I want to see the basmala displayed before verse 1, so that the text is complete and correct.
9. As a reader on Al-Fatiha, I want the basmala included as verse 1 (not a separate prefix), so that the surah is displayed according to its correct structure.
10. As a reader navigating to a surah directly via URL (e.g. `#/s/2`), I want that surah to load and render, so that deep links and bookmarks work from the first story.

**PWA Install**

11. As a first-time visitor, I want the app to offer to add itself to my home screen, so that I can access it as a dedicated app in the future.
12. As a user who accepted the install prompt, I want the app to launch in standalone mode without any browser chrome, so that the reading experience is focused and distraction-free.
13. As a user who dismissed the install prompt, I want it to disappear for the rest of the session, so that it does not interrupt my reading.
14. As a user on a browser that does not support PWA install (e.g. iOS Safari without prompt support), I want the install offer to simply not appear, so that I am not shown a broken or confusing UI.

**Offline Download**

15. As a user who wants offline access, I want to tap a clearly labelled button to start downloading the corpus, so that I can choose when to use my data.
16. As a user who initiated the download, I want to see a progress indicator showing how many files have been cached out of the total, so that I know the download is happening and roughly how long it will take.
17. As a user whose download was interrupted by a lost connection, I want the download to resume where it left off when I retry, so that I do not re-download already-cached files.
18. As a user who completed the offline download, I want a clear confirmation message, so that I am confident the app will work without internet.
19. As a user downloading the corpus, I want to be able to cancel the download, so that I can stop it if I change my mind or need the bandwidth.
20. As an offline user who has the corpus downloaded, I want the Quran to load transparently from cache, so that offline reading feels identical to online reading.
21. As an offline user who has not downloaded the corpus, I want to see a clear, friendly message explaining that the corpus needs to be downloaded before offline reading is available, so that I understand why the content is not loading.
22. As a user with the corpus already downloaded, I want the "Download for offline" button to be replaced by a confirmation that the corpus is available, so that I know my offline setup is complete.

**App State & Persistence**

23. As a returning user, I want the app to remember whether I have already downloaded the corpus, so that it does not prompt me to download again unnecessarily.
24. As a developer, I want the activation state (`none` | `downloading` | `cached`) to be persisted in IDB, so that the app correctly reflects offline readiness across sessions and tab restores.

## Implementation Decisions

**Modules to build:**

- **`offline/`** — Owns two responsibilities: (1) PWA install prompt lifecycle — captures `beforeinstallprompt`, exposes a method to trigger it, emits `offline:install-available` and `offline:install-complete`; (2) corpus download orchestration — builds the URL list from `manifest.json`, sends `CACHE_DATASET` to the SW via `navigator.serviceWorker.controller.postMessage()`, listens for `DATASET_PROGRESS` / `DATASET_COMPLETE` / `DATASET_ERROR` messages, updates `activationState` in IDB, emits `offline:download-progress`, `offline:download-complete`, `offline:download-error`. Deep module: callers request "start download" or "cancel download" and react to events — they never touch the SW or IDB directly.

- **`dataset/`** — Corpus access layer. Exports `getSurah(n)`, `getSurahs()`, `getJuz()`. Internally decides whether to fetch from `quran-dataset-v1` cache (via `cache.match()`) or the network — the caller never knows which path was taken. Also exports `getManifestUrls()` which reads `manifest.json` and returns the full URL list needed by `offline/` for the CACHE_DATASET call. Deep module: simple interface, complex internal fetch/cache logic.

- **`reader/`** — Route handler for `#/s/:surah` (and later `#/s/:surah/:ayah`). Exports `async init(params)` per router contract. Fetches the surah via `dataset/getSurah()`, renders Arabic text and translation into `#main-content`, handles translation toggle state (reads/writes `settings` IDB store via `getDb()`), emits `reader:surah-loaded`. Does not track scroll position in this story — that is Story 2.

**Architectural decisions:**

- `offline/` and `dataset/` are sibling modules under `src/`. Cross-module communication goes through `events.js` only — `reader/` listens for `offline:download-complete` to re-render if the corpus becomes available mid-session.
- `activationState` IDB store (key `"current"`) holds `{ id: "current", status: "none" | "downloading" | "cached" }`. The `offline/` module is the sole writer; any module may read it via `getDb()`.
- The SW's `CACHE_DATASET` handler is already resumable (skips cached URLs). The client only needs to send the full manifest URL list; the SW handles deduplication.
- Basmala rule: surah 1 (Al-Fatiha) includes basmala as verse 1 per the quran.com PUA encoding. Surahs 2–113 display basmala as a decorative prefix (not a numbered verse). Surah 9 (At-Tawbah) has no basmala. This logic lives in `reader/` — never in `dataset/`.
- Arabic text must be set via `textContent` or `createTextNode` only — never `innerHTML` with corpus data (hard constraint from CLAUDE.md).
- Translation toggle: stored as `{ key: 'translationVisible', value: true }` in the `settings` IDB store. Default is `true`. The toggle button lives in `#top-bar`.
- `manifest.json` in `public/dataset/` contains the canonical list of dataset URLs. `dataset/getManifestUrls()` fetches and parses this file.

**IDB interactions:**

- `settings` store: read/write for `translationVisible` key (reader module).
- `activationState` store: write for `{ id: "current", status }` (offline module).

## Testing Decisions

A good test exercises only the public interface of a module — never the internals. Tests should survive a full rewrite of a module's implementation as long as the interface contract is preserved.

**`dataset/` module** — highest priority, most testable in isolation. Test that `getSurah(2)` returns an object with the expected verse count, that `getSurahs()` returns 114 entries, that `getManifestUrls()` returns a non-empty array of strings. Use `fake-indexeddb` for any IDB interactions. Mock `fetch` and `caches` to test both cache-hit and network-fallback paths. Prior art: `src/core/db.test.js` for IDB setup patterns.

**`offline/` module** — test the state machine: given `activationState = "none"`, after `startDownload()` is called, verify `activationState` transitions to `"downloading"`, then to `"cached"` after simulated `DATASET_COMPLETE` from a mock SW. Test that `offline:download-progress` events fire with the correct `{ cached, total }` shape. Test that a cancelled download leaves `activationState` as `"none"`. Mock `navigator.serviceWorker` and `postMessage`.

**`reader/` module** — DOM integration test. Mount the module against a real (jsdom) DOM with a `#main-content` element. Provide a mock `dataset/getSurah()` returning a two-verse surah. Verify that (a) two verse elements are rendered, (b) each has a text node with Arabic content (not set via innerHTML), (c) translation elements are present when `translationVisible = true` and absent when `false`. Prior art: none yet — this establishes the pattern for all route handler tests.

## Out of Scope

- Scroll position tracking and session restore (Story 2)
- Surah and Juz navigation UI / browsing index (Story 3)
- Verse marks and tagging (Story 4)
- Review hub (Story 5)
- Cross-tab safety (Story 6)
- Deep links beyond `#/s/:surah` (Story 7)
- Dataset update / version check (Story 8)
- Settings page, theme switcher, font size controls (Story 9)
- Audio, transliteration, full-text search, multi-device sync, analytics — permanently out of scope

## Further Notes

- The Bridges' Translation license must be verified before any public release. The dataset is in `public/dataset/` — no string manipulation of Arabic corpus text is permitted at any layer.
- The `manifest.json` in `public/dataset/` is the single source of truth for which URLs constitute the full corpus. If the dataset is rebuilt, the manifest is regenerated automatically by `scripts/build-dataset.js`.
- Performance budget: first verse render ≤ 800 ms on Chrome Android with 4× CPU throttle and a warm cache. The `dataset/getSurah()` path should be the only blocking call in `reader/init()`.
- The service worker `CACHE_DATASET` handler already exists in `src/sw.js` from Phase 0 — do not modify it in this story.

## Grill-Me Decisions (13 locked)

| Q   | Decision                           | Choice                                            |
| --- | ---------------------------------- | ------------------------------------------------- |
| 1   | Cold start UX                      | Skeleton loader (3s) → real content               |
| 2   | Offline nav to uncached surah      | Block nav upfront (⊘ icon on unavailable surahs)  |
| 3   | Dataset fetch strategy             | Network-first with 3s timeout → cache fallback    |
| 4   | Install prompt timing              | After 30s of reading (engagement-based)           |
| 5   | Basmala display rules              | Fatiha numbered, Surahs 2–8 prefix, Tawbah none   |
| 6   | Basmala + translation toggle       | Basmala always Arabic-only, unaffected by toggle  |
| 7   | Download resumability after cancel | No auto-resume; user must re-tap "Download"       |
| 8   | Download interruption on restart   | Auto-resume silently from where it stopped        |
| 9   | Corrupted cache handling           | Pre-validate at SW layer during download          |
| 10  | Storage quota check                | Check upfront with `navigator.storage.estimate()` |
| 11  | Install prompt browser support     | Android auto-prompt; iOS manual guide fallback    |
| 12  | Translation toggle default         | `true` (on) for all users, no detection           |
| 13  | Skeleton timeout                   | 5s hard timeout → error + retry button            |
