---
issue: 6
title: "Story 6: Cross-tab Safety"
state: OPEN
---

## Problem Statement

A user has QuranAtlas open in two browser tabs. They mark a verse in Tab A — but Tab B still shows the unmarked reader. They delete a tag from the Review Hub in Tab B — but the mark editor in Tab A doesn't know. And when a new app version ships with an IDB schema change, the tab left open in the background silently breaks the next time it tries to read data. There is currently no coordination between tabs: each operates on a stale view of shared IDB state.

## Solution

A `safety/sync.js` module creates a single `BroadcastChannel('quran-atlas:sync')` and becomes the sole cross-tab communication layer. After every IDB mark transaction commits, `marks/store.js` calls `broadcastMarkChange(verseKeys[])`. Receiving tabs re-read only what they need from IDB and re-render. The Review Hub, FVR, reader indicators, and mark editor all subscribe to `sync:update-received` events and update live. As a catch-all for frozen or backgrounded tabs, every module re-reads its displayed data on `visibilitychange→visible`. IDB `versionchange` events (schema upgrades) are handled by closing the DB and showing a non-dismissible reload banner.

**Supersedes Story 2 user stories 17–19:** The primary/secondary tab model and "Switch to main tab" hint are dropped. Tabs are peers — each saves reading position independently per-surah (last-write-wins). No `localStorage` is used anywhere. See Issue #2 for the supersession note.

## User Stories

1. As a reader with two tabs open, I want marking a verse in one tab to appear in the other tab within 1 second, so that both tabs reflect my latest annotations.
2. As a reader with the Review Hub open in one tab and the reader in another, I want the hub to update live when I mark or delete a verse in the reader tab, so that my review list is always current.
3. As a reader with the mark editor open in one tab, I want the editor to close with a clear message if another tab deletes that mark, so that I don't accidentally re-save a mark that was intentionally removed.
4. As a reader who switched to another app and came back to QuranAtlas, I want the tab to silently refresh its displayed mark data, so that I see up-to-date information even if I missed real-time broadcasts.
5. As a reader, I want all bulk-deleted marks (multi-select delete) to appear removed in other open tabs at the same time, so that tab state stays consistent across batch operations.
6. As a reader in the Filtered Verse Review, I want deleted marks to disappear in real-time if another tab removes them, so that FVR always shows current data.
7. As a reader with mark indicators visible in the reader, I want indicators to update in real-time when marks are added or deleted in another tab, so that the reading view is always accurate.
8. As a user with a tab open when a new app version is deployed, I want to see a clear "App updated. Reload to continue." message, so that I know why the app stopped responding and what to do.
9. As a user seeing the reload prompt after an app update, I want no way to dismiss it without reloading, so that I don't continue using a broken tab with a stale database schema.
10. As a reader, I want all cross-tab coordination to use BroadcastChannel only — no `localStorage`, no polling — so that the architecture stays consistent with the project's data layer rules.
11. As a developer, I want the sync module to be a deep module with a simple interface (`broadcastMarkChange`, `onMarkChange`, `destroy`), so that consumers never need to know about BroadcastChannel internals.
12. As a reader on an older browser without BroadcastChannel, I want the `visibilitychange` re-read to keep my tab eventually consistent, so that I don't see permanently stale marks even without real-time sync.

## Implementation Decisions

### Modules to Build / Modify

**New: `src/safety/sync.js`** (cross-module exception, like `input-validator.js`)

A deep module — callers never touch BroadcastChannel directly.

- Creates `BroadcastChannel('quran-atlas:sync')` internally on module init.
- Exports `broadcastMarkChange(verseKeys: string[])` — sends `{ type: "marks:changed", verseKeys }` on the channel. Only called after IDB `oncomplete`.
- Exports `onMarkChange(callback)` — registers a handler for incoming `marks:changed` messages. Callback receives `{ verseKeys }`.
- Exports `destroy()` — closes the channel. Called on `unload`.
- On `message` from channel: calls all registered handlers. Does NOT re-read IDB itself — that's the caller's responsibility.
- On IDB `db:version-change` event from `events.js`: renders a non-dismissible banner in `#app-shell` with a Reload button and no dismiss affordance.

**Modify: `src/marks/store.js`** (Story 4)

- After every `put` / `delete` / `deleteMany` IDB transaction `oncomplete`, call `broadcastMarkChange(verseKeys)`.
- `deleteMany(verseKeys[])` broadcasts the full array in one call. One transaction = one broadcast.
- Does NOT broadcast when receiving a `sync:update-received` event (to prevent echo loops).

**Modify: `src/marks/editor.js`** (Story 4)

- On module init, call `onMarkChange(({ verseKeys }) => { ... })`.
- If the editor is open and `verseKeys` contains the current editor's `verseKey`, close the modal and show toast: "This mark was deleted in another tab."

**Modify: `src/review/hub.js`** (Story 5)

- Subscribe to `sync:update-received` via `events.js`. On fire, re-read the currently displayed page of marks from IDB and re-render.
- Add `visibilitychange` listener: on `visible`, re-read and re-render displayed marks.

**Modify: `src/review/fvr.js`** (Story 5)

- Subscribe to `sync:update-received`. Re-read displayed verses for the active tag from IDB, re-render. If the active tag now has 0 marks, show empty state.
- Add `visibilitychange` listener.

**Modify: `src/reader/indicator.js`** (Story 4)

- Subscribe to `sync:update-received`. For each verseKey in the payload, re-read that mark from IDB and update the indicator for any visible verse matching that key.
- Add `visibilitychange` listener: re-read indicators for all currently rendered verses.

**Modify: `src/core/db.js`**

- Add `versionchange` handler on the database connection. On `versionchange`: call `db.close()`, emit `db:version-change` via `events.js`. (`db:version-change` is already defined in Phase 0 events.)

### Cross-Tab Flow

1. User marks verse 2:255 in Tab A
2. `marks/store.js` IDB transaction commits
3. `broadcastMarkChange(["2:255"])` called
4. BroadcastChannel sends `{ type: "marks:changed", verseKeys: ["2:255"] }`
5. Tab B receives message, `onMarkChange` callbacks fire
6. Tab B's `marks/editor.js`, `review/hub.js`, `review/fvr.js`, `reader/indicator.js` each re-read relevant IDB data
7. Tab B re-renders affected UI within 1 second

### `visibilitychange` Catch-all

On every `document.visibilityState === 'visible'` event, each module re-reads its displayed data from IDB. No tracking flag, no timing threshold. Simple full re-read. Provides eventual consistency for tabs that were frozen or backgrounded.

### Broadcast Timing

`broadcastMarkChange()` is only ever called inside an IDB transaction `oncomplete` callback. This guarantees that when the receiving tab re-reads IDB, the data is committed and visible.

### Channel Name

`BroadcastChannel('quran-atlas:sync')` — single channel, all message types use a `type` field discriminator. Future message types (e.g. `settings:changed`) can be added without new channels.

### No `localStorage`

No `localStorage` or `sessionStorage` is used anywhere in this story or any other. The Story 2 `__PRIMARY_READER_TAB_ID__` approach described in Issue #2 is superseded entirely. See Issue #2 supersession note.

### IDB Schema

No changes. No new stores. Cross-tab coordination is purely via BroadcastChannel + IDB re-reads.

### Events

- `sync:update-received` — emitted by `safety/sync.js` on the internal `events.js` bus when a mark change is received from another tab. Payload: `{ verseKeys: string[] }`.
- `db:version-change` — already defined in Phase 0. Emitted by `db.js` on `versionchange`. Consumed by `safety/sync.js` to trigger the reload banner.

### Performance Targets

- Mark change broadcast → receiver re-render: ≤ 1 second
- `visibilitychange` re-read (30 marks): ≤ 300ms
- `versionchange` → reload banner rendered: ≤ 100ms

## Testing Decisions

A good test exercises only the public interface — what the module emits, what it writes to IDB, and what UI state it produces. Never test BroadcastChannel internals or private callbacks.

**`safety/sync.js`** (unit): mock BroadcastChannel. Call `broadcastMarkChange(["2:255"])` → verify channel `postMessage` called with correct payload. Simulate incoming `message` event → verify registered `onMarkChange` callback fires with correct `verseKeys`. Call `destroy()` → verify `channel.close()` called.

**`safety/sync.js` + `marks/store.js`** (integration, fake-indexeddb): save a mark via `store.js` → verify `broadcastMarkChange` was called after `oncomplete`. Simulate receiving the broadcast in a second store instance → verify IDB re-read returns updated data.

**`marks/editor.js` conflict** (integration, jsdom): open editor for verse "2:255" → simulate `sync:update-received` with `verseKeys: ["2:255"]` → verify modal is removed from DOM and toast appears.

**`review/hub.js` cross-tab** (integration, fake-indexeddb): seed 3 marks, render hub → simulate `sync:update-received` with one verseKey deleted → verify hub re-renders showing 2 marks.

**`visibilitychange`** (integration): render hub → set `document.visibilityState = "hidden"` → delete a mark directly from IDB → set `document.visibilityState = "visible"`, fire `visibilitychange` → verify hub re-reads and shows 0 marks.

**`db.js` versionchange** (unit): open DB, simulate `versionchange` event → verify `db:version-change` emitted and DB connection closed.

Prior art: `src/core/db.test.js` for IDB setup patterns; Story 2 `scroll-tracker` tests for event listener cleanup patterns.

## Out of Scope

- Position sync between tabs (per-surah last-write-wins is sufficient)
- `settings["lastSurface"]` sync (last-write-wins is fine — only affects next launch)
- SharedWorker or ServiceWorker-based messaging fallback
- Conflict resolution UI beyond the editor close toast
- Multi-device sync
- Primary/secondary tab model (dropped — tabs are peers)

## Further Notes

- `safety/sync.js` is a cross-module exception (like `safety/input-validator.js`) — it may be imported directly by any module that needs to broadcast or receive mark changes, without going through `events.js`. This is necessary because BroadcastChannel is an external API boundary that the sync module must own exclusively.
- The `visibilitychange` re-read is the only sync mechanism for browsers without BroadcastChannel support (pre-Safari 15.4, ~March 2022). This provides eventual consistency when the user switches back to a tab — not real-time, but correct.
- The reload banner on `versionchange` must render even if the IDB connection is closed. It should be injected directly into `#app-shell` without any IDB reads.
- Broadcast loops are prevented by the rule that `marks/store.js` only broadcasts after its own IDB writes — it does not broadcast when reacting to a `sync:update-received` event.

## Grill-Me Decisions (13 locked)

| Q   | Decision                           | Choice                                                                                   |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Sync scope                         | Marks only. Positions and `settings["lastSurface"]` use last-write-wins.                 |
| 2   | Primary/secondary tabs             | Dropped. Tabs are peers. No "Switch to main tab" hint.                                   |
| 3   | Mark mutation payload              | Notification only: `{ type: "marks:changed", verseKeys: [...] }`. Receiver re-reads IDB. |
| 4   | Missed updates while hidden        | Full re-read of displayed marks on every `visibilitychange→visible`. No tracking flags.  |
| 5   | IDB `versionchange` handling       | Force close DB + non-dismissible "App updated. Reload to continue." banner.              |
| 6   | Unsaved editor on `versionchange`  | Always force reload. Auto-save debounce means unsaved window is <300ms.                  |
| 7   | Mark editor conflict               | Close editor with toast: "This mark was deleted in another tab."                         |
| 8   | Review Hub cross-tab updates       | Live update — re-read displayed marks from IDB, re-render immediately.                   |
| 9   | BroadcastChannel fallback          | None. `visibilitychange` provides eventual consistency for unsupported browsers.         |
| 10  | Channel scope                      | Single channel `quran-atlas:sync`. `type` field discriminates message kinds.             |
| 11  | Story 2 localStorage contradiction | Resolved. Story 2 implements no multi-tab coordination. Story 6 owns all cross-tab sync. |
| 12  | Broadcast timing                   | After IDB `oncomplete`. Guarantees data is readable when receiver re-reads.              |
| 13  | Bulk delete broadcast              | One broadcast per transaction: `{ verseKeys: [...] }` array.                             |
