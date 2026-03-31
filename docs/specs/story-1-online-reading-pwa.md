# Story 1: Online reading + PWA install | P1 | Requires: Phase 0 | Blocks: Story 2

- First visit loads reader at 1:1 with no setup gate, no modal, no required action
- `manifest.webmanifest`: name, short_name, start_url, display:standalone, theme_color, background_color, icons 192/512px; Lighthouse PWA ≥80
- Capture `beforeinstallprompt`, suppress on dismiss for 7 days (IDB settings, NOT localStorage); skip if standalone (`matchMedia('(display-mode: standalone)')`); show once during calm reading only (not nav/review/editor)
- "Download Quran data" → SW `{type:'CACHE_DATASET', urls:[...]}` → fetch 114 per-surah + metadata files; progress bar via SW postMessage; skip already-cached via `caches.match()`; SHA-256 verify on completion; FAIL → purge partial cache + retry affordance; `activationState`: idle→downloading→verifying→applying→idle|failed
- Background Fetch API as progressive enhancement (feature-detect `registration.backgroundFetch`)
- IDB: settings (prompt timestamp), datasetMeta, activationState; Cache: quran-dataset-v1; events: OFFLINE_READY, DATASET_PROGRESS, DATASET_ERROR; SW msgs: CACHE_DATASET, PURGE_DATASET_CACHE, SKIP_WAITING
