---
issue: 8
title: "Story 8: Dataset Updates"
state: OPEN
---

## Problem Statement

When a new dataset version is published—correcting a translation error, fixing verse boundaries, or updating annotation links—users who have already cached the dataset continue to receive stale content silently. There is no mechanism for the app to detect, download, and apply dataset updates without the user manually clearing their browser cache, a step they have no reason to know is needed. Errors in the Quran text are particularly harmful because they persist invisibly and users trust the app to be authoritative.

## Solution

On each service worker `activate` event, the SW fetches `/dataset/manifest.json` and compares `packageVersion` against the version stored in the `datasetMeta` IDB store. If newer, the old `quran-dataset-v1` cache is deleted and the full dataset is re-downloaded through the existing `CACHE_DATASET` flow (same as Story 1's initial download). A **major semver bump** signals a schema change requiring user confirmation; a minor or patch bump auto-applies without user interaction.

**Simplified from original spec:** No staging cache, no SHA-256 per-file verification, no hash-diff, no 6-state machine. The dataset changes rarely (maybe once or twice a year). The cost of a full re-download is acceptable when updates are infrequent. The existing `CACHE_DATASET` handler is already resumable (skips cached URLs), so interrupted downloads are handled.

**activationState machine (simplified):**

```
idle → downloading → idle                                    (minor/patch — auto)
idle → downloading → pending-confirmation                     (major — awaits user)
                                 pending-confirmation → downloading → idle
                                 → idle (user dismisses, retry later)
```

## User Stories

1. As a reader, I want minor dataset corrections applied automatically on next app open so that I always read the most accurate text without friction.
2. As a reader, I want to be asked to confirm before a major dataset schema change is applied so that I can choose when to accept a potentially disruptive update.
3. As a reader, I want to see download progress during a large update so that I know the app is working and not frozen.
4. As a reader, I want an interrupted download to resume from where it stopped so that I don't waste bandwidth re-downloading files I already have.
5. As a reader, I want a clear error notification if the update fails so that I know something went wrong and can try again later.
6. As a reader, I want my bookmarks and reading progress to survive any dataset update so that my personal data is never lost.
7. As a reader, I want the download to continue even if I switch away from the app, because the SW runs independently of the page lifecycle.

## Implementation Decisions

### Modules to Build / Modify

**`src/sw.js`**

- Add `activate` event handler: `event.waitUntil(Promise.all([self.clients.claim(), checkForUpdate()]))` — `clients.claim()` ensures open tabs receive postMessages immediately
- Add `APPLY_DATASET_UPDATE` message handler (user-confirmed risky apply)
- Keep existing `CACHE_DATASET`, `SKIP_WAITING`, `PURGE_DATASET_CACHE` handlers unchanged

**`src/data/dataset-updater.js`** (new, simplified)

- `checkForUpdate()` — fetch manifest → read `datasetMeta.version` from IDB → if same, return; if newer, delete `quran-dataset-v1` cache, send `CACHE_DATASET` to SW (same flow as Story 1 initial download), then transition state
- Every state transition writes to `activationState` IDB store and postMessages all clients
- No staging cache, no SHA-256, no hash-diff. Full cache invalidation + re-download.

**`src/data/manifest-fetcher.js`** (new)

- `fetchManifest()` — `fetch('/dataset/manifest.json', { cache: 'no-store' })` → returns `{ packageVersion, files }` or throws

### IDB

- `datasetMeta` store (keyPath: `id`): read `{ id: 'current', version }` on check; write updated `version` string on apply
- `activationState` store (keyPath: `id`): write state object on every transition:
  ```js
  {
    id: "current",
    state: 'idle' | 'downloading' | 'pending-confirmation' | 'failed',
    version: target packageVersion string | null,
    progress: 0.0–1.0 | null,
    error: string | null
  }
  ```

### Events

All emitted via `src/core/events.js` pub/sub; SW also postMessages to all clients with matching `SCREAMING_SNAKE` type names.

| Event                          | postMessage type               | Payload        | Emitter               |
| ------------------------------ | ------------------------------ | -------------- | --------------------- |
| `dataset:update-available`     | `DATASET_UPDATE_AVAILABLE`     | `{ from, to }` | `data/dataset-updater`|
| `dataset:download-progress`    | `DATASET_DOWNLOAD_PROGRESS`    | `{ progress }` | `data/dataset-updater`|
| `dataset:pending-confirmation` | `DATASET_PENDING_CONFIRMATION` | `{ from, to }` | `data/dataset-updater`|
| `dataset:applied`              | `DATASET_APPLIED`              | `{ version }`  | `data/dataset-updater`|
| `dataset:update-failed`        | `DATASET_UPDATE_FAILED`        | `{ error }`    | `data/dataset-updater`|

### Performance

- `checkForUpdate()` manifest fetch + IDB read + version compare ≤ 200 ms (excludes network download time)
- Full re-download uses existing Story 1 flow (resumable, progress-tracked)

## Testing Decisions

Tests exercise only observable behaviour: IDB state transitions, postMessage emissions, and cache contents — not internal function calls.

**`src/data/` — integration tests (Vitest + fake-indexeddb + Cache API mock)**

- Same version in IDB and manifest: `activationState` remains `idle`, no postMessage emitted
- Patch bump available: state sequence `idle → downloading → idle`; `datasetMeta.version` updated; old cache deleted, new cache populated
- Major bump available: state sequence ends at `pending-confirmation`; `DATASET_PENDING_CONFIRMATION` postMessage emitted
- `APPLY_DATASET_UPDATE` message with `pending-confirmation` active: sequence `pending-confirmation → downloading → idle`; `datasetMeta.version` updated
- Failed download: transitions to `failed`; `DATASET_UPDATE_FAILED` postMessage emitted; on next `checkForUpdate()` call, `activationState` resets to `idle` and process restarts
- Interrupted download (partial cache from prior run): `CACHE_DATASET` handler skips already-cached URLs; resumes from where it stopped
- `marks` IDB store unchanged after update (no cross-store contamination)

Prior art: Story 1 (initial dataset download, same `quran-dataset-v1` cache and `DATASET_PROGRESS` postMessage pattern), Story 3 (IDB state write patterns)

## Out of Scope

- Differential patching within files (whole-file replacement only)
- Rollback to a previous dataset version
- Background Sync or periodic update checks (activate-only trigger)
- UI components for the confirmation dialog and progress toast (addressed in Story 9)
- Modifications to `scripts/build-dataset.js` (SHA-256 hashes already in manifest output)
- Staging cache — **CUT** (simplified to full cache invalidation)
- SHA-256 per-file verification — **CUT** (dataset changes rarely, full re-download is safe)
- Hash-diff — **CUT** (full cache invalidation is simpler and correct)

## Further Notes

- `self.clients.claim()` in the activate handler ensures the SW can postMessage open tabs immediately without waiting for a navigation
- The activate handler must `event.waitUntil(...)` the full `checkForUpdate()` promise to prevent the SW from being terminated before the check completes
- On next SW activate, if `activationState.state === 'pending-confirmation'` in IDB and a newer manifest version has since been published, reset to `idle` and restart
- If `datasetMeta.version` is absent in IDB on activate (Story 1 initial download not yet complete), `checkForUpdate()` bails out silently and returns. Story 1 writes the baseline version; Story 8 only handles updates from a known baseline
- If manifest fetch fails (network error or non-200), `checkForUpdate()` swallows the error silently, leaves `activationState` as `idle`, and does not postMessage. The next SW activate will retry
- The `APPLY_DATASET_UPDATE` message handler is defined in Story 8 but the UI that sends it (confirmation banner/modal) is out of scope for this story — deferred to Story 9
- No string manipulation of Arabic corpus text at any point (constraint from CLAUDE.md)

## Grill-Me Decisions (12 locked)

| Q                                  | Decision                                                                     | Choice                          |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| Update check trigger               | SW activate event only                                                       | Activate only                   |
| Safe vs risky activation           | Major semver bump = risky; minor/patch = auto-apply                          | Major semver bump               |
| Schema change detection            | Parse `packageVersion`, compare major component                              | Semver major                    |
| `pending-confirmation` persistence | Formal IDB state, survives page reload                                       | Formal IDB state                |
| Failed state behavior              | Auto-reset to idle on next activate                                          | Auto-reset                      |
| SHA-256 verification               | **CUT** — full cache invalidation + re-download is sufficient                | CUT                             |
| Staging cache                      | **CUT** — delete old cache, re-download via existing Story 1 flow            | CUT                             |
| Hash-diff                          | **CUT** — full cache invalidation is simpler and correct                     | CUT                             |
| Progress communication             | Write to `activationState` IDB + postMessage all clients                     | IDB + postMessage               |
| `packageVersion` comparison        | Semver; major component increase = risky; minor/patch = safe                 | Semver major                    |
| Empty `datasetMeta` on activate    | Bail out silently (stay idle); Story 1 establishes baseline version          | Bail out silently               |
| Manifest fetch failure             | Silent skip; stay idle; no postMessage; retry on next activate               | Silent skip                     |
