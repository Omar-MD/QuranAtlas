# Story 8: Automatic dataset updates

**Phase:** 3 (P3)
**Priority:** P3
**Depends on:** Story 1 (offline preparation)

---

## Summary

App detects newer dataset versions, downloads changed files to a staging cache, verifies integrity, and activates safely.

## Functional Requirements

### FR-023: Update detection

- On SW `activate` event: fetch `/dataset/manifest.json` (stable URL)
- Compare `package_version` against `datasetMeta.version` in IDB
- If newer version available: begin staging

### FR-023b: Staging

- Download only changed files (compare SHA-256 hashes) to `quran-dataset-staging` cache
- Verify all checksums in staging cache
- Never name staging cache with Workbox precache prefix (avoid `cleanupOutdatedCaches` conflict)

### FR-023c: Safe activation

- Check if any existing `marks` have `verseKey` values that would become invalid in the new dataset
- If safe: activate automatically; show bounded toast notification ("Dataset updated")
- If marks at risk: pause, show explicit review-and-confirm UI before activating
- On activation: swap staging cache to live cache (`quran-dataset-v1`); update `datasetMeta` in IDB

### FR-023d: Resume on interruption

- If staging download is interrupted: resume by checking `caches.match()` for each URL
- `activationState` tracks: `idle | downloading | verifying | applying | failed`

## Acceptance Criteria

- [ ] New dataset version detected when `manifest.json` has higher `package_version`
- [ ] Only changed files downloaded (unchanged files skipped based on hash comparison)
- [ ] Staging cache uses `quran-dataset-staging` name (not Workbox precache prefix)
- [ ] SHA-256 verification passes on all staged files before activation
- [ ] Safe update (no marks affected): activates automatically with toast
- [ ] Risky update (marks could be invalidated): shows review UI before activation
- [ ] Interrupted staging resumes without re-downloading cached files
- [ ] After activation: `datasetMeta.version` reflects new version
- [ ] Old staging cache cleaned up after successful activation

## Data Dependencies

- IDB: `datasetMeta` (version), `marks` (verseKey validation), `activationState`
- Caches: `quran-dataset-v1` (live), `quran-dataset-staging` (temporary)
- SW messages: `CACHE_DATASET`, `PURGE_DATASET_CACHE`
