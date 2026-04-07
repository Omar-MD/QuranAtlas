# Observability — Core Checklist

**Weight: 1** | **Version: 2** | **Items: 17**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

> **Severity guidance for this dimension:** Observability has weight=1, reflecting that it is "acceptable to fly blind short-term." Failed observability items are typically P2 (plan for sprint) or P3 (backlog). Missing monitoring, logging, or analytics tools are absences, not defects — see the Absence Test in `references/scoring-model.md`. Only flag P0/P1 if missing observability directly masks an active data-loss or security issue in existing code.

1. **Error reporting** — Errors are not just `console.error()`. A diagnostic mechanism exists (IDB log store, error event, or lightweight reporting).
   - Check: All `catch` blocks — do they emit events or log to a diagnostic store?
   - Verify: Production errors are inspectable via dev tools or a diagnostics page

2. **Storage quota monitoring** — App monitors ongoing IDB usage, not just pre-download check. Warning emitted when approaching quota limit.
   - Check: `navigator.storage.estimate()` usage beyond `offline.js:48-57`
   - Verify: Periodic or event-driven quota checks, warning at 80% threshold

3. **PWA update diagnostics** — Service worker update failures are tracked. User receives feedback if `SKIP_WAITING` fails or new SW doesn't activate.
   - Check: `src/sw.js` update flow, `core/app.js` SW registration
   - Verify: Failed update emits event or shows user-facing message

4. **Performance marks** — Critical render paths have `performance.mark()` calls for debugging. First verse render, chunk render, scroll append are measurable.
   - Check: `performance.mark()` usage across codebase
   - Verify: Marks around `reader:init-start`, `reader:first-verse-rendered`, etc.

5. **Init failure visibility** — App initialization failure emits an event that other modules can react to (e.g., error banner, recovery UI).
   - Check: `core/app.js:58-60` — does it emit an event beyond console.error?
   - Verify: `app:init-error` or similar event exists

6. **Navigation failure tracking** — Failed route matches, invalid deep links, and navigation errors are logged with context.
   - Check: `core/router.js` unmatched route handling
   - Verify: Failed navigation emits diagnostic event

7. **Dataset download progress** — Download progress is emitted as events (not just console.log). UI can display progress to user.
   - Check: `data/offline.js` — progress event emission
   - Verify: `offline:download-progress` events with byte counts

8. **Cross-tab diagnostic signals** — When another tab triggers a version change or data update, the current tab receives and logs the signal via `db:version-change` event (Phase 1-3). BroadcastChannel signals deferred to Phase 4.
   - Check: `core/db.js` `versionchange` handler emits `db:version-change` event
   - Verify: `safety/sync.js` consumes event and renders reload banner. Event is logged for diagnostics

9. **Dataset update observability** — All 5 dataset update state transitions emit events: `dataset:update-available`, `dataset:download-progress`, `dataset:pending-confirmation`, `dataset:applied`, `dataset:update-failed` (Story 8).
   - Check: `data/dataset-updater.js` — all state transitions emit corresponding events via `core/events.js`
   - Verify: SW also postMessages all clients with matching `SCREAMING_SNAKE` type names for each transition

10. **Mark operation events** — `marks:saved` and `marks:deleted` events fire with `verseKey` payload (Story 4). `marks:undo` fires when undo toast is actioned.
    - Check: `marks/store.js` — event emission on every IDB transaction `oncomplete`
    - Verify: Events contain sufficient context (`verseKey`, `tags`) for subscribers to react without re-querying IDB

11. **Settings change events** — `settings:theme-changed` fires with `{ from, to }` payload (Story 9). `settings:data-cleared` fires on full data wipe.
    - Check: `settings/theme.js` — event emission on theme change. `settings/clear-data.js` — event emission on data clear
    - Verify: Events fire before navigation/redirect (if any) so subscribers can react

12. **Session restore diagnostics** — App logs which restore path was taken on launch: deep link, review hub restore, reader position restore, or default (no saved state). Visible in browser dev tools.
    - Check: `core/router.js` or `core/app.js` — restore path logging
    - Verify: Console or diagnostic event indicates: "Restored to #/review (lastSurface)" or "Deep link: #/s/2/255" or "Reader restore: Al-Baqarah v100"

13. **Structured error context** — Errors are logged with structured context (module name, operation, relevant IDs), not just message strings. Errors are categorizable as transient (network timeout) vs permanent (schema mismatch).
    - Check: All `catch` blocks — error logging includes `{ module, operation, error }` structure
    - Verify: A network timeout error in `dataset.js` is distinguishable from an IDB error in `db.js` from the log output alone. Error objects include the original cause via `Error.cause` or equivalent

14. **Build version tagging** — The running app version (`__APP_VERSION__`) is accessible in diagnostic output. Errors can be correlated to a specific build. The About page displays it (Story 9).
    - Check: `about/versions.js::getAppVersion()` returns the injected build version. Console logs include version on init
    - Verify: `vite.config.js` `define` injects `__APP_VERSION__` from `package.json`. Version is visible in the About page and in any error diagnostic output

15. **User action trail** — A lightweight in-memory ring buffer (last 10-20 events) captures the sequence of user actions (route changes, mark operations, setting changes) leading up to an error. Not persisted, not sent externally — available in console on error.
    - Check: `core/events.js` — does the event bus maintain a recent event log?
    - Verify: On error, the last N events can be inspected in dev tools. Buffer has a fixed size limit (no memory leak). Events are lightweight (type + timestamp, not full payloads)

16. **Degraded mode indication** — When a feature is unavailable (offline without cache, storage full, SW not activated), the UI communicates this state clearly rather than silently hiding functionality.
    - Check: `data/offline.js` — offline-without-cache state. `marks/store.js` — storage full state. `about/pwa-install.js` — no SW state
    - Verify: Each degraded state has a user-visible indicator or message. No feature silently disappears without explanation

17. **Lifecycle timing visibility** — App startup timing is measurable: IDB open, dataset fetch, first render, route resolution. Each phase has a `performance.mark()` or equivalent.
    - Check: `core/app.js`, `core/db.js`, `core/router.js` — `performance.mark()` at lifecycle boundaries
    - Verify: `performance.measure()` can produce a waterfall of: `app:start` → `db:open` → `router:resolve` → `reader:first-verse`. Useful for diagnosing slow starts on low-end devices
