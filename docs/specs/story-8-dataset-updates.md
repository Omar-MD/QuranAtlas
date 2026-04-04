---
issue: 8
title: "Story 8: Dataset Updates"
state: OPEN
---

## Problem Statement

When a new dataset version is published—correcting a translation error, fixing verse boundaries, or updating annotation links—users who have already cached the dataset continue to receive stale content silently. There is no mechanism for the app to detect, download, and apply dataset updates without the user manually clearing their browser cache, a step they have no reason to know is needed. Errors in the Quran text are particularly harmful because they persist invisibly and users trust the app to be authoritative.

## Solution

On each service worker `activate` event, the SW fetches `/dataset/manifest.json` and compares `packageVersion` against the version stored in the `datasetMeta` IDB store. If newer, a hash-diff identifies which files changed (by comparing manifest SHA-256 hashes against responses already in `quran-dataset-v1`). Only changed files are downloaded into a `quran-dataset-staging` cache; each newly downloaded file is SHA-256 verified before staging is considered complete. A **major semver bump** signals a schema change requiring user confirmation (`pending-confirmation` state); a minor or patch bump auto-applies without user interaction. Applying copies staging entries into `quran-dataset-v1`, updates `datasetMeta.version`, and deletes the staging cache. Progress is tracked in the `activationState` IDB store and reported to all open tabs via `postMessage`.

**activationState machine:**

```
idle → downloading → verifying → applying → idle          (minor/patch — auto)
idle → downloading → verifying → pending-confirmation     (major — awaits user)
                                pending-confirmation → applying → idle
                                → failed (auto-cleanup staging → idle on next activate)
```

## User Stories

1. As a reader, I want minor dataset corrections applied automatically on next app open so that I always read the most accurate text without friction.
2. As a reader, I want to be asked to confirm before a major dataset schema change is applied so that I can choose when to accept a potentially disruptive update.
3. As a reader, I want to see download progress during a large update so that I know the app is working and not frozen.
4. As a reader, I want an interrupted download to resume from where it stopped so that I don't waste bandwidth re-downloading files I already have.
5. As a reader, I want a clear error notification if the update fails integrity verification so that I know something went wrong and can try again later.
6. As a reader, I want my bookmarks and reading progress to survive any dataset update so that my personal data is never lost.
7. As a reader, I want the download to continue even if I switch away from the app, because the SW runs independently of the page lifecycle.
8. As a maintainer, I want SHA-256 verification on every newly downloaded file so that corrupted transfers are detected before they replace good cached data.
9. As a maintainer, I want the staging cache isolated from Workbox's `cleanupOutdatedCaches` so that in-progress downloads are never silently deleted by a SW update.

## Implementation Decisions

### Modules to Build / Modify

**`src/sw.js`**

- Add `activate` event handler: `event.waitUntil(Promise.all([self.clients.claim(), checkForUpdate()]))` — `clients.claim()` ensures open tabs receive postMessages immediately
- Add `APPLY_DATASET_UPDATE` message handler (user-confirmed risky apply)
- Keep existing `CACHE_DATASET`, `SKIP_WAITING`, `PURGE_DATASET_CACHE` handlers unchanged
- `quran-dataset-staging` must NOT appear in Workbox `injectManifest` precache manifest

**`src/offline/dataset-updater.js`** (new)

- `checkForUpdate()` — fetch manifest → read `datasetMeta.version` from IDB → if same, return; if newer, compute hash-diff against `quran-dataset-v1`, download changed files to staging (skipping already-staged URLs via `caches.match`), then transition state
- `applyUpdate()` — copy all staging entries into `quran-dataset-v1`, write new `datasetMeta.version`, delete staging cache, write `activationState { state: 'idle' }`, emit `dataset:applied`
- Every state transition writes to `activationState` IDB store and postMessages all clients

**`src/offline/manifest-fetcher.js`** (new)

- `fetchManifest()` — `fetch('/dataset/manifest.json', { cache: 'no-store' })` → returns `{ packageVersion, files }` or throws

**`src/offline/staging-cache.js`** (new)

- `STAGING_CACHE = 'quran-dataset-staging'` (fixed name; not listed in Workbox precache)
- `stageFile(url, response)`, `getStagedResponse(url)`, `listStagedUrls()`, `deleteStaging()`
- `copyToLive()` — opens `quran-dataset-v1`, iterates all staging entries, `cache.put()` each

**`src/offline/sha256-verifier.js`** (new)

- `verify(arrayBuffer, expectedHex)` — `crypto.subtle.digest('SHA-256', arrayBuffer)` → hex encode → compare; returns `boolean`

### IDB

- `datasetMeta` store (keyPath: `id`): read `{ id: 'current', version }` on check; write updated `version` string on apply
- `activationState` store (keyPath: `id`): write full state object on every transition:
  ```js
  {
    id: ("current", state, version, progress, error, stagedAt);
  }
  // state: 'idle' | 'downloading' | 'verifying' | 'applying' | 'pending-confirmation' | 'failed'
  // version: target packageVersion string
  // progress: 0.0–1.0 (during downloading only)
  // error: string | null (during failed only)
  // stagedAt: timestamp ms (when verifying completed, for pending-confirmation)
  ```

### Events

All emitted via `src/core/events.js` pub/sub; SW also postMessages to all clients with matching `SCREAMING_SNAKE` type names.

| Event                          | postMessage type               | Payload        | Emitter           |
| ------------------------------ | ------------------------------ | -------------- | ----------------- |
| `dataset:update-available`     | `DATASET_UPDATE_AVAILABLE`     | `{ from, to }` | `dataset-updater` |
| `dataset:download-progress`    | `DATASET_DOWNLOAD_PROGRESS`    | `{ progress }` | `dataset-updater` |
| `dataset:pending-confirmation` | `DATASET_PENDING_CONFIRMATION` | `{ from, to }` | `dataset-updater` |
| `dataset:applied`              | `DATASET_APPLIED`              | `{ version }`  | `dataset-updater` |
| `dataset:update-failed`        | `DATASET_UPDATE_FAILED`        | `{ error }`    | `dataset-updater` |

### Performance

- `checkForUpdate()` manifest fetch + IDB read + hash-diff ≤ 200 ms (excludes network download time)
- `applyUpdate()` staging→live copy + IDB write ≤ 500 ms for ≤ 100 files
- SHA-256 `verify()` ≤ 50 ms per file (SubtleCrypto, runs in SW off main thread)

## Testing Decisions

Tests exercise only observable behaviour: IDB state transitions, postMessage emissions, and cache contents — not internal function calls.

**`src/offline/` — integration tests (Vitest + fake-indexeddb + Cache API mock)**

- Same version in IDB and manifest: `activationState` remains `idle`, no postMessage emitted
- Patch bump available: state sequence `idle → downloading → verifying → applying → idle`; `datasetMeta.version` updated; staging cache deleted after apply
- Major bump available: state sequence ends at `pending-confirmation`; staging cache preserved; `DATASET_PENDING_CONFIRMATION` postMessage emitted; `activationState.stagedAt` set
- `APPLY_DATASET_UPDATE` message with `pending-confirmation` active: sequence `pending-confirmation → applying → idle`; staging deleted; `datasetMeta.version` updated
- SHA-256 mismatch on newly downloaded file: transitions to `failed`; staging cache deleted; `DATASET_UPDATE_FAILED` postMessage emitted; on next `checkForUpdate()` call, `activationState` resets to `idle` and process restarts
- Interrupted download (partial staging cache from prior run): `checkForUpdate()` skips already-staged URLs via `caches.match`; resumes from where it stopped
- `marks` IDB store unchanged after `applyUpdate()` (no cross-store contamination)

**`src/offline/sha256-verifier.js` — unit tests**

- Valid digest returns `true`
- Tampered `ArrayBuffer` returns `false`
- Non-hex digest string throws

Prior art: Story 1 (initial dataset download, same `quran-dataset-v1` cache and `DATASET_PROGRESS` postMessage pattern), Story 3 (IDB state write patterns)

## Out of Scope

- Differential patching within files (whole-file replacement only)
- Rollback to a previous dataset version
- Background Sync or periodic update checks (activate-only trigger)
- UI components for the confirmation dialog and progress toast (addressed in Story 9)
- Modifications to `scripts/build-dataset.js` (SHA-256 hashes already in manifest output)
- Atomicity guarantee during staging→live copy (mitigated by speed + prior verification)

## Further Notes

- `quran-dataset-staging` must not appear in the Workbox `injectManifest` precache list; `cleanupOutdatedCaches` will otherwise delete it on SW install
- `self.clients.claim()` in the activate handler ensures the SW can postMessage open tabs immediately without waiting for a navigation
- The activate handler must `event.waitUntil(...)` the full `checkForUpdate()` promise to prevent the SW from being terminated before the check completes
- `applyUpdate()` is not atomic: a page reload during the staging→live copy will see a mix of old and new files. Mitigated by: copy is fast (≤500ms), files were SHA-256 verified before copy. Full atomicity is out of scope
- On next SW activate, if `activationState.state === 'pending-confirmation'` in IDB and the staging cache still matches the pending version, leave state as `pending-confirmation` and re-emit `DATASET_PENDING_CONFIRMATION`; if a newer manifest version has since been published, delete staging and restart from `idle`
- If `datasetMeta.version` is absent in IDB on activate (Story 1 initial download not yet complete), `checkForUpdate()` bails out silently and returns. Story 1 writes the baseline version; Story 8 only handles updates from a known baseline
- If manifest fetch fails (network error or non-200), `checkForUpdate()` swallows the error silently, leaves `activationState` as `idle`, and does not postMessage. The next SW activate will retry
- The `APPLY_DATASET_UPDATE` message handler is defined in Story 8 but the UI that sends it (confirmation banner/modal) is out of scope for this story — deferred to Story 9
- No string manipulation of Arabic corpus text at any point (constraint from CLAUDE.md)

## Grill-Me Decisions (12 locked)

| Q                                  | Decision                                                                     | Choice                |
| ---------------------------------- | ---------------------------------------------------------------------------- | --------------------- |
| Update check trigger               | SW activate event only                                                       | Activate only         |
| Safe vs risky activation           | Major semver bump = risky; minor/patch = auto-apply                          | Major semver bump     |
| Schema change detection            | Parse `packageVersion`, compare major component                              | Semver major          |
| `pending-confirmation` persistence | Formal IDB state, survives page reload                                       | Formal IDB state      |
| Failed state behavior              | Auto-cleanup staging + reset to idle on next activate                        | Auto-cleanup + reset  |
| SHA-256 verification scope         | Newly downloaded files only (not files surviving from prior interrupted run) | Newly downloaded only |
| Progress communication             | Write to `activationState` IDB + postMessage all clients                     | IDB + postMessage     |
| Staging cache name                 | `quran-dataset-staging` fixed name; excluded from Workbox precache           | Fixed name            |
| `packageVersion` comparison        | Semver; major component increase = risky; minor/patch = safe                 | Semver major          |
| Empty `datasetMeta` on activate    | Bail out silently (stay idle); Story 1 establishes baseline version          | Bail out silently     |
| Manifest fetch failure             | Silent skip; stay idle; no postMessage; retry on next activate               | Silent skip           |
| Apply confirmation UI              | Deferred to Story 9; Story 8 defines APPLY_DATASET_UPDATE handler only       | Story 9               |
