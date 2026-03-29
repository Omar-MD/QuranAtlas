# Story 1: Online-first web reading + PWA install

**Phase:** 1 (P1)
**Priority:** P1
**Depends on:** Phase 0 Foundation
**Blocks:** Story 2 (continuous reader)

---

## Summary

User opens QuranAtlas in a browser and reads the Quran immediately (online). The app is installable as a PWA. After install, user can prepare offline reading via explicit download.

## Functional Requirements

### FR-001: Web entry

- Reader is usable immediately on first visit with no setup gate, no modal, no required action
- Surah Al-Fatiha (1:1) is the default starting position for new users

### FR-022: PWA installability

- `manifest.webmanifest` includes: `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`, icons (192x192, 512x512 PNG)
- Service Worker registered on first page load
- App passes Lighthouse PWA installability checks

### FR-003: Install prompt

- Capture `beforeinstallprompt` event, call `e.preventDefault()`, store reference
- Show one gentle, dismissible install prompt during calm reading (not during navigation, review, or editor flows)
- On dismissal: suppress prompt for 7 days (timestamp stored in IDB `settings` store, NOT localStorage)
- Detect standalone mode via `window.matchMedia('(display-mode: standalone)').matches`
- Do not show prompt if already installed (standalone detected)

### FR-002: Offline preparation

- "Download Quran data" button visible in settings/about
- On tap: SW message `{ type: 'CACHE_DATASET', urls: [...] }` triggers download
- UI shows progress bar with percentage (streamed from SW via `postMessage`)
- Download fetches 114 per-surah JSON files + metadata files
- After all files cached: SHA-256 verification against baked hashes
- PASS: write `datasetMeta` to IDB; emit `OFFLINE_READY` event; show success state
- FAIL: purge partial cache; show recovery message with retry affordance
- Interruption: on resume, skip already-cached files via `caches.match(url)` check
- `activationState` in IDB tracks phase: `idle | downloading | verifying | applying | failed`
- Background Fetch API used as progressive enhancement (feature-detect `registration.backgroundFetch`)

## Acceptance Criteria

- [ ] First visit loads reader with Al-Fatiha visible, no blocking UI
- [ ] Lighthouse PWA score >= 80
- [ ] Install prompt appears once during reading, not during other flows
- [ ] Dismissing prompt suppresses it for 7 days (verified: re-open app after simulated 6 days = no prompt; after 7 days = prompt again)
- [ ] Offline download completes with progress bar showing 0-100%
- [ ] After download: app works fully offline (verified with `context.setOffline(true)` in Playwright)
- [ ] SHA-256 verification failure shows recovery message and retains previous dataset
- [ ] Interrupted download resumes without re-fetching cached files
- [ ] `activationState` transitions: idle -> downloading -> verifying -> applying -> idle (success) or failed
- [ ] No `localStorage` usage anywhere in the implementation
- [ ] Install prompt timestamp stored in IDB `settings` store

## Data Dependencies

- IDB stores: `settings` (install prompt timestamp), `datasetMeta`, `activationState`
- Cache: `quran-dataset-v1` (dataset files)
- Events: `OFFLINE_READY`, `DATASET_PROGRESS`, `DATASET_ERROR`
- SW messages: `CACHE_DATASET`, `PURGE_DATASET_CACHE`, `SKIP_WAITING`

## Out of Scope

- Continuous reading / cross-surah scroll (Story 2)
- Navigation surface (Story 3)
- Marks (Story 4)
- Automatic dataset updates (Story 8)
