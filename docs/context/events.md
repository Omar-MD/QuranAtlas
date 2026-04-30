# Event Bus Catalog

Every event in `src/core/constants.ts::Events`: who emits it, who listens, payload shape, and — importantly — whether each end of the wire is actually connected. This is the wiring diagram of the app. Without it, an agent has to grep each side separately to understand cross-module effects.

Bus mechanics live in `src/core/events.ts` (mitt-backed `emit` / `on`, handlers are try/catch-isolated, typed via `EventPayloads`). Background on the pattern is in `architecture.md`.

Every `Events.*` constant has a corresponding entry in the `EventPayloads` map in `src/core/constants.ts`. Emit / on signatures use these types, so passing the wrong payload shape fails `svelte-check`.

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
| `DB_VERSION_CHANGE` | `db:version-change` | `core/db.ts:68` | `safety/sync.ts:43` | `{}` |
| `DB_VISIBILITY_VISIBLE` | `db:visibility-visible` | `core/db.ts:79` | `reader/position.ts:135`, `marks/indicator.ts` (initIndicators), `review/Hub.svelte:83` | `{}` |
| `DB_QUOTA_EXCEEDED` | `db:quota-exceeded` | `core/db.ts:157` | `core/quota-banner.svelte:74` | `{ storeName, message }` |
| `ROUTER_LAUNCH_RESTORE` | `router:launch-restore` | `core/router.ts:120` | `app-bootstrap.ts:52` | `{}` |
| `ROUTER_ROUTE_CHANGE` | `router:route-change` | `core/router.ts:146` | `nav/AmbientDock.svelte`, `nav/MarginHeader.svelte` | `{ hash }` |
| `NAVIGATION_NAVIGATE` | `navigation:navigate` | `surahs/SurahList.svelte`, `nav/CommandSheet.svelte` | `app-bootstrap.ts` | `{ surah, verse? }` |
| `OFFLINE_DOWNLOAD_PROGRESS` | `offline:download-progress` | `data/offline.ts:164` | `data/offline.ts:265` *(self)* | `{ cached, total }` |
| `MARKS_SAVED` | `marks:saved` | `marks/store.ts` | `marks/indicator.ts` (initIndicators) | `{ verseKey, tags }` — `tags` = union of canonical keys across all 12 layers (not raw labels) |
| `MARKS_DELETED` | `marks:deleted` | `marks/store.ts` | `marks/indicator.ts` (initIndicators) | `{ verseKey }` |
| `MARKS_UNDO` | `marks:undo` | `core/ui.svelte` | `marks/indicator.ts` (initIndicators) | `{ verseKey }` |
| `READER_VERSE_RENDERED` | `reader:verse-rendered` | `reader/Verse.svelte` (onMount) | `marks/indicator.ts` (initIndicators) | `{ verseKey, element }` |
| `AMBIENT_SURFACE` | `ambient:surface` | `reader/Reader.svelte`, `nav/AmbientDock.svelte`, `nav/AmbientPill.svelte`, `nav/MarginHeader.svelte` | `nav/AmbientDock.svelte`, `nav/AmbientPill.svelte`, `nav/MarginHeader.svelte` | `{ reason }` |
| `SYNC_UPDATE_RECEIVED` | `sync:update-received` | `safety/sync.ts:101` | `tag/TagSheet.svelte` (onMount), `marks/indicator.ts` (initIndicators), `review/Hub.svelte` | `{ verseKeys }` |
| `SETTINGS_RIWAYAH_CHANGED` | `settings:riwayah-changed` | `settings/riwayah.ts::setRiwayah` (local switch); `safety/sync.ts::handleChannelMessage` (cross-tab fan-in via `applyRiwayah`) | `reader/Reader.svelte` (refetches active surah, restores `aya_no` anchor — clamps to last ayah on miss); `settings/reading-typography.ts::initReadingTypography` (re-clamps `--qa-arabic-line-height` to new Riwayah's floor) | `{ from: 'hafs' \| 'warsh' \| 'qaloon'; to: 'hafs' \| 'warsh' \| 'qaloon' }` |
| `STORAGE_QUOTA_WARNING` | `storage:quota-warning` | `data/offline.ts:58` | `core/quota-banner.svelte:79` | `{}` |
| `AUDIO_VERSE_CHANGED` | `audio:verse-changed` | `audio/player-runtime.ts` (timeupdate → ayahAtMs match) | `reader/audio-highlight.ts` (applies `.qa-verse-active`), `reader/audio-autoscroll.ts` (smart-defer scroll) | `{ verseKey }` |
| `AUDIO_STARTED` | `audio:started` | `audio/player-runtime.ts` (`<audio>.play()` event) | `core/save-failure-toast.svelte` (mount-on-demand pattern, future) | `{ reciter, surah }` |
| `AUDIO_PAUSED` | `audio:paused` | `audio/player-runtime.ts` | _(no listener yet)_ | `{ positionMs }` |
| `AUDIO_ENDED` | `audio:ended` | `audio/player-runtime.ts` | _(no listener yet — future "auto-advance to next surah" hook)_ | `{ surah }` |
| `AUDIO_ERROR` | `audio:error` | `audio/player-runtime.ts` (`<audio>` error, no-resume-target, missing reciter) | `core/save-failure-toast.svelte` (toast routing — known codes: `AUDIO_PLAYBACK_ERROR`, `AUDIO_NO_RESUME_TARGET`, `AUDIO_NO_RECITER`) | `{ code, message }` |
| `AUDIO_RECITER_CHANGED` | `audio:reciter-changed` | `audio/player-runtime.ts::setReciterMidPlayback` | _(no listener yet)_ | `{ reciter }` |

### Emitter-only (⚠ dead listener)

These fire but nothing subscribes. Some are intentional telemetry stubs (`SHEET_OPENED`/`SHEET_CLOSED` for future analytics); others are failure signals waiting for a UI that hasn't been built. Don't remove without checking — a listener may be added in a near-term milestone. Do remove if genuinely orphaned.

| Event | Value | Emitters | Payload |
|---|---|---|---|
| `DB_DELETE_BLOCKED` | `db:delete-blocked` | `core/db.ts:112` | `{ message }` |
| `ROUTER_ROUTE_ERROR` | `router:route-error` | `core/router.ts:142,153` | `{ route, error }` |
| `READER_POSITION_SAVE_FAILED` | `reader:position-save-failed` | `reader/position.ts:117,491` | `{ error, surah, verse }` |
| `APP_INIT_ERROR` | `app:init-error` | `app-bootstrap.ts:139,199` | `{ error, context? }` |
| `APP_READY_FOR_DOWNLOAD` | `app:ready-for-download` | `app-bootstrap.ts:240` | `{}` |
| `SETTINGS_DATA_CLEARED` | `settings:data-cleared` | `settings/clear-data.ts` (via `clearAllData()`) | `{}` |
| ~~`SETTINGS_THEME_CHANGED`~~ | ~~`settings:theme-changed`~~ | _Removed 2026-04-29 audit C-7 — was emitted with no listeners; theme rune mutation in `settings/theme.ts` is the single source of truth._ |
| ~~`SETTINGS_FONT_SIZE_CHANGED`~~ | ~~`settings:font-size-changed`~~ | _Removed 2026-04-29 audit C-7 — was emitted with no listeners; font-size rune mutation in `settings/font-size.ts` is the single source of truth._ |
| `REVIEW_OPEN` | `review:open` | `review/Hub.svelte:64,157` | `{}` |
| `REVIEW_FILTER` | `review:filter` | `review/Hub.svelte:262` | `{ tags, surah }` |
| `MARKS_SAVE_FAILED` | `marks:save-failed` | `marks/store.ts:46` | `{ verseKey, error }` |
| `OFFLINE_DOWNLOAD_COMPLETE` | `offline:download-complete` | `data/offline.ts:174` | `{}` |
| `OFFLINE_DOWNLOAD_ERROR` | `offline:download-error` | `data/offline.ts:134,153,184,241` | `{ error }` |
| `OFFLINE_INSTALL_AVAILABLE` | `offline:install-available` | `data/offline.ts:279` | `{}` |
| `OFFLINE_INSTALL_COMPLETE` | `offline:install-complete` | `data/offline.ts:284` | `{}` |
| `OFFLINE_SW_TIMEOUT` | `offline:sw-timeout` | `data/offline.ts:95` | `{}` |
| `DATASET_UPDATE_AVAILABLE` | `dataset:update-available` | `data/offline.ts:203` | `{ from, to }` |
| `DATASET_DOWNLOAD_PROGRESS` | `dataset:download-progress` | `data/offline.ts:210` | `{ progress, version }` |
| `DATASET_PENDING_CONFIRMATION` | `dataset:pending-confirmation` | `data/offline.ts:188` | `{ from, to }` |
| `DATASET_APPLIED` | `dataset:applied` | `data/offline.ts:195` | `{ version }` |
| `DATASET_UPDATE_FAILED` | `dataset:update-failed` | `data/offline.ts:200` | `{ error }` |
| `SHEET_OPENED` | `sheet:opened` | `settings/Panel.svelte` (on open) | `{ name }` |
| `SHEET_CLOSED` | `sheet:closed` | `settings/Panel.svelte` (on close) | `{ name }` |
| `EDGES_SAVED` | `edges:saved` | `edges/store.ts` (createEdge + updateEdge) | *(no listener yet)* | `{ edgeId, from, to, kind }` |
| `EDGES_DELETED` | `edges:deleted` | `edges/store.ts` (deleteEdge) | *(no listener yet)* | `{ edgeId }` |
| `EDGES_SAVE_FAILED` | `edges:save-failed` | `edges/store.ts` (createEdge on error) | *(no listener yet)* | `{ error }` |
| `SYNC_EDGES_UPDATED` | `sync:edges-updated` | `safety/sync.ts` (handleChannelMessage receiver) | *(no listener yet)* | `{ edgeIds }` |
| `BOOKMARKS_SAVED` | `bookmarks:saved` | `bookmarks/store.ts` (add) | `bookmarks/indicator.ts` (cache + glyph), `bookmarks/BookmarksList.svelte` (reload), `surahs/SurahList.svelte` (★ surah-row hint reload) | `{ verseKey, riwayah }` |
| `BOOKMARKS_DELETED` | `bookmarks:deleted` | `bookmarks/store.ts` (del) | same as `BOOKMARKS_SAVED` | `{ verseKey, riwayah }` |
| `BOOKMARKS_SAVE_FAILED` | `bookmarks:save-failed` | `bookmarks/store.ts` (add on error) | *(no listener yet)* | `{ verseKey, riwayah, error }` |
| `SYNC_BOOKMARKS_UPDATED` | `sync:bookmarks-updated` | `safety/sync.ts` (handleChannelMessage receiver) | `bookmarks/indicator.ts`, `bookmarks/BookmarksList.svelte`, `surahs/SurahList.svelte` | `{ verseKeys, riwayah }` |
| `BOOKMARK_JUMP_LANDED` | `bookmark:jump-landed` | `bookmarks/BookmarksList.svelte` (row click) | `bookmarks/pulse.ts` (verse cell pulse on landing) | `{ verseKey }` |

### Listener-only (⚠ dead emitter)

No listener-only events remain. `AMBIENT_HIDE` was removed earlier — fade-out is driven locally in `nav/AmbientDock.svelte` / `nav/AmbientPill.svelte` (scroll timers + `$effect`) rather than via the bus.

### Dissolved into rune reads (Phase 6 — Task 12)

Three state-shaped events were deleted from `Events` because their payload was always a snapshot of a state rune. Listeners now read the rune directly; the dev-time `emit()` guard rejects any resurrected callers.

| Former event | Rune read that replaces it |
|---|---|
| `READER_SURAH_LOADED` | `reader.currentSurahNum` — `App.svelte` tracks it via `$effect` and calls `indicator.refreshForSurah()` + the recent-surahs IDB tracker. `nav/reader-actions.js` reads the rune at call time. |
| `READER_POSITION_CHANGED` | `reader.currentVerseKey` — `AmbientPill.svelte` renders `{reader.currentVerseKey}` reactively; `reader-actions.js` reads + writes the rune directly on keyboard nav. |
| `SETTINGS_TRANSLATION_CHANGED` | `settings.translationVisible` — `Reader.svelte` has a `$effect` that mirrors the rune into its local `translationVisible` state; the `Verse` component receives it as a prop and toggles `class:qa-hide-translation` reactively. |

## Adding a new event

1. Add the constant to `core/constants.ts::Events` (SCREAMING_SNAKE key, `domain:kebab-case` value) and add a payload entry to `EventPayloads`.
2. Emit with a literal object payload: `emit(Events.FOO_BAR, { field: 1 })`.
3. Subscribe with `const unsub = on(Events.FOO_BAR, handler)`; return the unsubscriber from the component's `onMount` (or track it in a module-level cleanups array for non-component callers).
4. Update this file.

Before adding an event, ask whether the signal is just a snapshot of a rune in `src/state/`. If yes, skip the event — components can `$effect` on the rune directly. See "Dissolved into rune reads" above for three events removed under this rule in Phase 6.

## Subscribing from a surface (pattern)

### In a Svelte 5 component

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { on } from '../core/events'
  import { Events } from '../core/constants'

  onMount(() => {
    const unsub = on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => { /* … */ })
    return unsub
  })
</script>
```

### In a non-component module

```ts
import { on } from '../core/events'
import { Events } from '../core/constants'

let _unsub: (() => void) | null = null

export async function init(): Promise<() => void> {
  _unsub = on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => { /* … */ })
  return () => { _unsub?.(); _unsub = null }
}
```

Every feature that subscribes to events should return a cleanup function. Svelte components return it from `onMount`; non-component modules return it from `init()` so the caller (usually `app-bootstrap.ts`) can drain it on teardown.
