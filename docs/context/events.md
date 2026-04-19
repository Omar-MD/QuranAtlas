# Event Bus Catalog

Every event in `src/core/constants.js::Events`: who emits it, who listens, payload shape, and — importantly — whether each end of the wire is actually connected. This is the wiring diagram of the app. Without it, an agent has to grep each side separately to understand cross-module effects.

Bus mechanics live in `src/core/events.js` (mitt-backed `emit` / `on`, handlers are try/catch-isolated). Background on the pattern is in `architecture.md`.

Every `Events.*` constant has a corresponding JSDoc `@typedef` in `src/core/constants.js` (e.g. `MarksSavedPayload`, `SyncUpdateReceivedPayload`). High-traffic emit call sites are annotated with inline `@type` casts that reference those typedefs.

`emit()` throws in dev (`import.meta.env.DEV`) when called with an event name not present in `Events`. This prevents typos and forces new events through the constants registry.

**Source of truth reminder**: when the code disagrees with this table, the code wins. Re-grep `emit(Events.X` and `on(Events.X` to regenerate.

## Convention

- Event-name constants are SCREAMING_SNAKE; their string values are `domain:kebab-case` (e.g. `MARKS_SAVED` → `'marks:saved'`).
- Payloads are always objects. `{}` means "signal only, no data."
- A one-way event (emitter with no listener, or listener with no emitter) is marked **⚠ dead** in the Status column and grouped at the bottom. These are either telemetry hooks, aspirational plumbing from past milestones, or genuine orphans to clean up.

## Catalog

### Wired events (emitter ↔ listener both exist)

| Event | Value | Emitters | Listeners | Payload |
|---|---|---|---|---|
| `DB_VERSION_CHANGE` | `db:version-change` | `core/db.js:68` | `safety/sync.js:43` | `{}` |
| `DB_VISIBILITY_VISIBLE` | `db:visibility-visible` | `core/db.js:79` | `reader/index.js:135`, `marks/indicator.js:135`, `review/hub.js:83` | `{}` |
| `DB_QUOTA_EXCEEDED` | `db:quota-exceeded` | `core/db.js:157` | `core/quota-banner.js:74` | `{ storeName, message }` |
| `ROUTER_LAUNCH_RESTORE` | `router:launch-restore` | `core/router.js:120` | `core/app.js:52` | `{}` |
| `ROUTER_ROUTE_CHANGE` | `router:route-change` | `core/router.js:146` | `nav/ambient-dock.js:97` | `{ hash }` |
| `READER_SURAH_LOADED` | `reader:surah-loaded` | `reader/index.js:175` | `nav/ambient-pill.js:58`, `marks/indicator.js:63`, `core/app.js:106` | `{ surah }` |
| `READER_POSITION_CHANGED` | `reader:position-changed` | `reader/index.js:483` | `nav/ambient-pill.js:65` | `{ surah, verse }` |
| `NAVIGATION_NAVIGATE` | `navigation:navigate` | `surahs/list.js:129`, `nav/command-sheet.js:417,419` | `core/app.js:97` | `{ surah, verse? }` |
| `OFFLINE_DOWNLOAD_PROGRESS` | `offline:download-progress` | `data/offline.js:164` | `data/offline.js:265` *(self)* | `{ cached, total }` |
| `SETTINGS_TRANSLATION_CHANGED` | `settings:translation-changed` | `settings/panel.js:221` | `reader/index.js:130` | `{ visible }` |
| `MARKS_SAVED` | `marks:saved` | `marks/store.js:42` | `marks/indicator.js:76` | `{ verseKey, tags }` |
| `MARKS_DELETED` | `marks:deleted` | `marks/store.js:67` | `marks/indicator.js:91` | `{ verseKey }` |
| `MARKS_UNDO` | `marks:undo` | `core/ui.js:40` | `marks/indicator.js:101` | `{ verseKey }` |
| `READER_VERSE_RENDERED` | `reader:verse-rendered` | `reader/index.js:343` | `marks/indicator.js:72` | `{ verseKey, element }` |
| `AMBIENT_SURFACE` | `ambient:surface` | `reader/index.js:176,700`, `nav/ambient-dock.js:60,67`, `nav/ambient-pill.js:85` | `nav/ambient-dock.js:111`, `nav/ambient-pill.js:71` | `{ reason }` |
| `SYNC_UPDATE_RECEIVED` | `sync:update-received` | `safety/sync.js:101` | `marks/editor.js:32`, `marks/indicator.js:116`, `review/hub.js:75` | `{ verseKeys }` |
| `STORAGE_QUOTA_WARNING` | `storage:quota-warning` | `data/offline.js:58` | `core/quota-banner.js:79` | `{}` |

### Emitter-only (⚠ dead listener)

These fire but nothing subscribes. Some are intentional telemetry stubs (`SHEET_OPENED`/`SHEET_CLOSED` for future analytics); others are failure signals waiting for a UI that hasn't been built. Don't remove without checking — a listener may be added in a near-term milestone. Do remove if genuinely orphaned.

| Event | Value | Emitters | Payload |
|---|---|---|---|
| `DB_DELETE_BLOCKED` | `db:delete-blocked` | `core/db.js:112` | `{ message }` |
| `ROUTER_ROUTE_ERROR` | `router:route-error` | `core/router.js:142,153` | `{ route, error }` |
| `READER_POSITION_SAVE_FAILED` | `reader:position-save-failed` | `reader/index.js:117,491` | `{ error, surah, verse }` |
| `APP_INIT_ERROR` | `app:init-error` | `core/app.js:139,199` | `{ error, context? }` |
| `APP_READY_FOR_DOWNLOAD` | `app:ready-for-download` | `core/app.js:240` | `{}` |
| `SETTINGS_THEME_CHANGED` | `settings:theme-changed` | `settings/theme.js:86` | `{ from, to }` |
| `SETTINGS_DATA_CLEARED` | `settings:data-cleared` | `settings/clear-data.js:158` | `{}` |
| `SETTINGS_FONT_SIZE_CHANGED` | `settings:font-size-changed` | `settings/font-size.js:38` | `{ size }` |
| `REVIEW_OPEN` | `review:open` | `review/hub.js:64,157` | `{}` |
| `REVIEW_FILTER` | `review:filter` | `review/hub.js:262` | `{ tags, surah }` |
| `MARKS_SAVE_FAILED` | `marks:save-failed` | `marks/store.js:46` | `{ verseKey, error }` |
| `OFFLINE_DOWNLOAD_COMPLETE` | `offline:download-complete` | `data/offline.js:174` | `{}` |
| `OFFLINE_DOWNLOAD_ERROR` | `offline:download-error` | `data/offline.js:134,153,184,241` | `{ error }` |
| `OFFLINE_INSTALL_AVAILABLE` | `offline:install-available` | `data/offline.js:279` | `{}` |
| `OFFLINE_INSTALL_COMPLETE` | `offline:install-complete` | `data/offline.js:284` | `{}` |
| `OFFLINE_SW_TIMEOUT` | `offline:sw-timeout` | `data/offline.js:95` | `{}` |
| `DATASET_UPDATE_AVAILABLE` | `dataset:update-available` | `data/offline.js:203` | `{ from, to }` |
| `DATASET_DOWNLOAD_PROGRESS` | `dataset:download-progress` | `data/offline.js:210` | `{ progress, version }` |
| `DATASET_PENDING_CONFIRMATION` | `dataset:pending-confirmation` | `data/offline.js:188` | `{ from, to }` |
| `DATASET_APPLIED` | `dataset:applied` | `data/offline.js:195` | `{ version }` |
| `DATASET_UPDATE_FAILED` | `dataset:update-failed` | `data/offline.js:200` | `{ error }` |
| `SHEET_OPENED` | `sheet:opened` | `settings/panel.js:52`, `nav/more-sheet.js:93` | `{ name }` |
| `SHEET_CLOSED` | `sheet:closed` | `settings/panel.js:61`, `nav/more-sheet.js:102` | `{ name }` |

### Listener-only (⚠ dead emitter)

No listener-only events remain. `AMBIENT_HIDE` was removed in this pass — its listeners in `nav/ambient-dock.js` and `nav/ambient-pill.js` were deleted because fade-out is driven locally (scroll, timeout) rather than via the bus.

## Adding a new event

1. Add the constant to `core/constants.js::Events` (SCREAMING_SNAKE key, `domain:kebab-case` value).
2. Emit with a literal object payload: `emit(Events.FOO_BAR, { field: 1 })`.
3. Subscribe with `const unsub = on(Events.FOO_BAR, handler)`; store the `unsub` on the owning module's cleanup array.
4. Update this file.

## Subscribing from a surface (pattern)

```js
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'

let _unsub = null

export async function init() {
  // ...
  _unsub = on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => { /* … */ })
  return () => { _unsub?.(); _unsub = null }
}
```

Every feature that subscribes to events should return a cleanup function from its `init()`. The router invokes it before mounting the next route; `core/app.js` drains the bootCleanups array on re-init.
