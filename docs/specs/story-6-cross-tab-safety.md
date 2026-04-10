---
issue: 6
title: "Story 6: Cross-Tab Safety"
state: OPEN
---

## Problem Statement

A user has QuranAtlas open in two browser tabs. They mark a verse in Tab A — but Tab B still shows the unmarked reader. And when a new app version ships with an IDB schema change, the tab left open in the background silently breaks the next time it tries to read data. There is currently no coordination between tabs: each operates on a stale view of shared IDB state.

## Solution

A `visibilitychange` re-read on every module provides eventual consistency for tabs that were frozen or backgrounded. IDB `versionchange` events (schema upgrades) are handled by closing the DB and showing a non-dismissible reload banner.

**BroadcastChannel sync is DEFERRED.** The `visibilitychange` re-read alone is sufficient. It is a one-liner per module and handles the common case of a user returning to a backgrounded tab. Real-time sync between simultaneously-open tabs is an edge case for a reading app.

**Supersedes Story 2 user stories 17–19:** The primary/secondary tab model and "Switch to main tab" hint are dropped. Tabs are peers — each saves reading position independently per-surah (last-write-wins). No `localStorage` is used anywhere. See Issue #2 for the supersession note.

## User Stories

1. As a reader who switched to another app and came back to QuranAtlas, I want the tab to silently refresh its displayed mark data, so that I see up-to-date information even if I missed real-time broadcasts.
2. As a user with a tab open when a new app version is deployed, I want to see a clear "App updated. Reload to continue." message, so that I know why the app stopped responding and what to do.
3. As a user seeing the reload prompt after an app update, I want no way to dismiss it without reloading, so that I don't continue using a broken tab with a stale database schema.
4. As a reader, I want all cross-tab coordination to use BroadcastChannel only — no `localStorage`, no polling — so that the architecture stays consistent with the project's data layer rules. *(Deferred)*
5. As a developer, I want the sync module to be a deep module with a simple interface (`broadcastMarkChange`, `onMarkChange`, `destroy`), so that consumers never need to know about BroadcastChannel internals. *(Deferred)*
6. As a reader on an older browser without BroadcastChannel, I want the `visibilitychange` re-read to keep my tab eventually consistent, so that I don't see permanently stale marks even without real-time sync.

## Implementation Decisions

### Modules to Build / Modify

**Phase 1-3 (this story):**

- **`core/db.js`** — Add `versionchange` handler on the database connection. On `versionchange`: call `db.close()`, emit `db:version-change` via `core/events.js`.
- **All modules** — Add `visibilitychange` listener: on `document.visibilityState === 'visible'`, re-read displayed data from IDB and re-render. No tracking flag, no timing threshold. Simple full re-read.
- **`safety/sync.js`** — Create module stub. On `db:version-change` event: render non-dismissible reload banner in `#app-shell`. BroadcastChannel logic deferred to Phase 4.

**Phase 4 (deferred):**

- `safety/sync.js` — Full BroadcastChannel implementation: `broadcastMarkChange(verseKeys[])`, `onMarkChange(callback)`, `destroy()`.
- `marks/store.js` — After every IDB transaction `oncomplete`, call `broadcastMarkChange(verseKeys)`.
- `marks/editor.js` — On `onMarkChange`, close modal if current verse was deleted in another tab.
- `review/hub.js` — On `sync:update-received`, re-read displayed marks from IDB.
- `review/fvr.js` — On `sync:update-received`, re-read displayed verses.
- `reader/indicator.js` — On `sync:update-received`, update indicators for affected verses.

### `visibilitychange` Catch-all

On every `document.visibilityState === 'visible'` event, each module re-reads its displayed data from IDB. No tracking flag, no timing threshold. Simple full re-read. Provides eventual consistency for tabs that were frozen or backgrounded.

### No `localStorage`

No `localStorage` or `sessionStorage` is used anywhere in this story or any other. The Story 2 `__PRIMARY_READER_TAB_ID__` approach described in Issue #2 is superseded entirely.

### IDB Schema

No changes. No new stores. Cross-tab coordination is purely via `visibilitychange` re-reads (Phase 1-3) and later BroadcastChannel + IDB re-reads (Phase 4).

### Events

- `db:version-change` — emitted by `core/db.js` on `versionchange`. Consumed by `safety/sync.js` to trigger the reload banner.

### Performance Targets

- `visibilitychange` re-read (30 marks): ≤ 300ms
- `versionchange` → reload banner rendered: ≤ 100ms

## Testing Decisions

A good test exercises only the public interface — what the module emits, what it writes to IDB, and what UI state it produces.

**`visibilitychange`** (integration): render hub → set `document.visibilityState = "hidden"` → delete a mark directly from IDB → set `document.visibilityState = "visible"`, fire `visibilitychange` → verify hub re-reads and shows updated marks.

**`core/db.js` versionchange** (unit): open DB, simulate `versionchange` event → verify `db:version-change` emitted and DB connection closed.

**`safety/sync.js`** (unit, Phase 1-3): verify reload banner renders on `db:version-change` event, has no dismiss affordance, reload button triggers `location.reload()`.

Prior art: `tests/unit/core/db.test.js` for IDB setup patterns; Story 2 `scroll-tracker` tests for event listener cleanup patterns.

## Out of Scope

- BroadcastChannel real-time sync — **DEFERRED**
- Position sync between tabs (per-surah last-write-wins is sufficient)
- `settings["lastSurface"]` sync (last-write-wins is fine — only affects next launch)
- SharedWorker or ServiceWorker-based messaging fallback
- Conflict resolution UI beyond the editor close toast
- Multi-device sync
- Primary/secondary tab model (dropped — tabs are peers)

## Further Notes

- The `visibilitychange` re-read is the only sync mechanism for Phase 1-3. This provides eventual consistency when the user switches back to a tab — not real-time, but correct.
- The reload banner on `versionchange` must render even if the IDB connection is closed. It should be injected directly into `#app-shell` without any IDB reads.

## Grill-Me Decisions (13 locked)

| Q   | Decision                           | Choice                                                                                   |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Sync scope                         | Marks only. Positions and `settings["lastSurface"]` use last-write-wins.                 |
| 2   | Primary/secondary tabs             | Dropped. Tabs are peers. No "Switch to main tab" hint.                                   |
| 3   | Missed updates while hidden        | Full re-read of displayed marks on every `visibilitychange→visible`. No tracking flags.  |
| 4   | IDB `versionchange` handling       | Force close DB + non-dismissible "App updated. Reload to continue." banner.              |
| 5   | Unsaved editor on `versionchange`  | Always force reload. Auto-save debounce means unsaved window is <300ms.                  |
| 6   | BroadcastChannel sync              | **DEFERRED** to Phase 4. `visibilitychange` is sufficient for Phase 1-3.                 |
| 7   | BroadcastChannel fallback          | None. `visibilitychange` provides eventual consistency for unsupported browsers.         |
| 8   | Channel scope                      | Single channel `quran-atlas:sync`. `type` field discriminates message kinds. (Phase 4)  |
| 9   | Story 2 localStorage contradiction | Resolved. Story 2 implements no multi-tab coordination. Story 6 owns all cross-tab sync. |
| 10  | Broadcast timing                   | After IDB `oncomplete`. Guarantees data is readable when receiver re-reads. (Phase 4)   |
| 11  | Bulk delete broadcast              | One broadcast per transaction: `{ verseKeys: [...] }` array. (Phase 4)                  |
| 12  | Mark editor conflict               | Close editor with toast: "This mark was deleted in another tab." (Phase 4)              |
| 13  | Review Hub cross-tab updates       | Live update — re-read displayed marks from IDB, re-render immediately. (Phase 4)        |
