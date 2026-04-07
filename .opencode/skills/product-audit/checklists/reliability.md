# Reliability — Core Checklist

**Weight: 5** | **Version: 2** | **Items: 19**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

1. **App initialization error handling** — If `app.js` init fails (IDB unavailable, dataset fetch fails), user sees recovery UI with retry option, not blank page.
   - Check: `core/app.js` init error catch block
   - Verify: Error boundary renders recovery UI, not just console.log

2. **IndexedDB connection lifecycle** — `db.js` handles `versionchange` and `close` events. Connection invalidation triggers graceful recovery.
   - Check: `core/db.js` — `versionchange` handler, `close` handler
   - Verify: `dbPromise` is invalidated on connection loss, re-opened on next access

3. **Position save reliability** — Reading position saves survive app backgrounding (`visibilitychange`), not just scroll events. No silent failures.
   - Check: `reader/scroll-tracker.js` — visibilitychange listener
   - Verify: Position saved when `document.visibilityState === 'hidden'`

4. **Service worker lifecycle** — `skipWaiting()` does not interrupt active readers. New SW activation is user-initiated or deferred until no active clients.
   - Check: `src/sw.js` — `skipWaiting()` usage, activation timing
   - Verify: SW update does not kill active reading sessions

5. **Offline download robustness** — Download handles SW controller null case, network timeouts, partial failures. User gets clear feedback on failure.
   - Check: `data/offline.js` — SW controller check, timeout handling
   - Verify: `navigator.serviceWorker.ready` awaited before posting message

6. **Cache state consistency** — Cached dataset matches current version. Stale cache is detected and invalidated. No serving outdated verses.
   - Check: `src/sw.js` cache versioning, `data/dataset.js` cache validation
   - Verify: Version mismatch triggers re-download, not stale serve

7. **Data loss prevention** — No operation silently loses user data (marks, positions, settings). All destructive operations have confirmation or undo.
   - Check: `core/db.js` delete operations, `data/offline.js` purge operations
   - Verify: `deleteDB()` does not force-resolve while blocked

8. **Network timeout handling** — `fetchNetworkFirst()` timeout is appropriate for slow mobile networks (not too aggressive). Timeout does not trigger unnecessary cache fallback.
   - Check: `data/dataset.js` timeout value
   - Verify: Timeout configurable, appropriate for 3G/4G conditions

9. **Concurrent access safety** — Tabs are peers with last-write-wins semantics (Story 6). `visibilitychange` re-read provides eventual consistency for Phase 1-3. IDB `versionchange` triggers non-dismissible reload banner. BroadcastChannel real-time sync deferred to Phase 4.
   - Check: `visibilitychange` listeners in all modules — re-read on `document.visibilityState === 'visible'`
   - Verify: `db:version-change` event emitted by `core/db.js`. `safety/sync.js` renders reload banner with no dismiss affordance. No `localStorage` or `sessionStorage` used anywhere

10. **Error visibility** — All caught errors are logged with context (not swallowed silently). User receives feedback for actionable failures.
    - Check: All `catch` blocks across codebase
    - Verify: No empty catch blocks, no `catch (e) {}` patterns

11. **Skeleton loader timeout** — If initial data fetch exceeds 5s, skeleton transitions to error state with retry button (Story 1 Q13). User never sees a permanently blank screen.
    - Check: `reader/index.js` or `core/app.js` — timeout on initial data fetch
    - Verify: 5s hard timeout triggers error UI with retry. Skeleton loader displays for up to 3s under normal conditions (Story 1 Q1)

12. **Download interruption handling** — User-initiated cancel resets `activationState` to `"none"` with no auto-resume (Story 1 Q7). Network-interrupted download resumes from where it stopped on retry (Story 1 Q8) because SW's `CACHE_DATASET` handler skips already-cached URLs.
    - Check: `data/offline.js` — cancel vs network-failure paths
    - Verify: Cancel sets state to `"none"`. Network failure leaves partially cached URLs. Retry resumes from partial state

13. **Dataset update state machine** — State transitions follow Story 8 spec: `idle → downloading → idle` (minor/patch auto-apply), `idle → downloading → pending-confirmation` (major semver bump). Failed state auto-resets to `idle` on next SW activate. Empty `datasetMeta` on activate bails silently (Story 8 Q11).
    - Check: `data/dataset-updater.js` — state machine transitions, `activationState` IDB writes
    - Verify: Major bump pauses at `pending-confirmation`. `APPLY_DATASET_UPDATE` message resumes. Failed download transitions to `failed` state with `DATASET_UPDATE_FAILED` postMessage

14. **Clear data resilience** — If IDB deletion is blocked (another tab holds connection) or cache deletion fails, user receives error feedback (Story 9). Partial failures don't leave app in inconsistent state.
    - Check: `settings/clear-data.js` — error handling in deletion sequence
    - Verify: `blocked` event on `deleteDatabase()` is handled. Error toast shown on failure. No silent data loss or silent failure

15. **Graceful degradation** — When a non-critical API is unavailable (e.g., `navigator.storage.estimate()` unsupported, `IntersectionObserver` missing), the app degrades to a functional fallback rather than crashing.
    - Check: All browser API usage — feature detection before use
    - Verify: `about/storage.js` shows "Storage info not available" if `navigator.storage.estimate()` is unsupported (Story 9). `reader/scroll-tracker.js` has a scroll-event fallback if `IntersectionObserver` is absent. `about/pwa-install.js` hides install button if `beforeinstallprompt` never fires

16. **Retry with backoff** — Network fetch failures (dataset, manifest) use exponential backoff or bounded retry, not immediate infinite retry loops that flood the network.
    - Check: `data/dataset.js::fetchNetworkFirst()`, `data/dataset-updater.js::checkForUpdate()`, `data/offline.js` download
    - Verify: Failed fetches retry a bounded number of times (or not at all — fail and surface to user). No `while(true)` retry loops. Network-first with 3s timeout (Story 1 Q3) does not retry on timeout — falls back to cache

17. **Resource cleanup on fatal error** — If `init()` throws mid-way, any partially attached listeners, observers, or timers are cleaned up. No zombie listeners survive a failed init.
    - Check: All `init()` functions — are listeners attached before the first `await`? If the `await` throws, are pre-attached listeners orphaned?
    - Verify: `cleanup()` can be called safely even if `init()` never completed. No double-cleanup errors

18. **State recovery after kill** — If the app is force-killed (mobile OS reclaims memory, browser tab crash), IDB state is consistent on next launch. No half-written transactions corrupt the store.
    - Check: All IDB writes — single-record transactions that are atomic by default
    - Verify: No multi-step IDB operations where step 1 succeeds and step 2 fails leaving inconsistent state. Tag deletion cascade (delete tag + update all marks) uses a single transaction or tolerates partial completion

19. **Storage pressure handling** — When device storage is low (`navigator.storage.estimate()` shows >90% usage), write operations degrade gracefully. Position saves and mark saves emit warnings but don't crash.
    - Check: IDB `QuotaExceededError` handling in all write paths
    - Verify: A `QuotaExceededError` on mark save shows user feedback ("Storage full") rather than a silent failure or uncaught exception. Position saves log a warning but don't block reading
