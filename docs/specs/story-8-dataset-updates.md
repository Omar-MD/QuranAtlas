# Story 8: Dataset updates | P3 | Requires: Story 1

- On SW activate: fetch `/dataset/manifest.json`, compare `package_version` vs IDB `datasetMeta.version`; if newer → download only changed files (hash diff) to `quran-dataset-staging` cache (never use Workbox precache prefix to avoid cleanupOutdatedCaches conflict); verify SHA-256 all staged files
- Safe activation (no mark verseKeys invalidated) → auto-swap staging→quran-dataset-v1 + update datasetMeta + bounded toast; risky activation → show review-and-confirm UI first; interruption → resume via `caches.match()` per URL; activationState: idle→downloading→verifying→applying→idle|failed; clean up staging cache after activation
- IDB: datasetMeta (version), marks (verseKey validation), activationState; caches: quran-dataset-v1 (live), quran-dataset-staging (temp)
