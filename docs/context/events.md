# Events catalog

> AUTO-GENERATED from `src/core/constants.ts` (Events map) + `emit(Events.X)` / `on(Events.X)` call sites across `src/**`. Run `pnpm run docs` to regenerate. Manual edits below the next paragraph are preserved (write them outside the auto-generated table).

Total events declared: **53**. Live emits: **51**. Live listeners: **29**.

Dead (declared but neither emitted nor listened): **2**.
Orphan emit (emitted, never listened): **22**.
Orphan listen (listened, never emitted): **0**.

## Catalog

<!-- AUTO-GENERATED:catalog START -->
| Constant | Event name | Emit sites | Listen sites |
| --- | --- | --- | --- |
| `Events.AMBIENT_SURFACE` | `ambient:surface` | `src/read/AmbientDock.svelte:64`<br>`src/read/AmbientPill.svelte:90`<br>`src/read/EdgeIndicator.svelte:42`<br>`src/read/MarginHeader.svelte:41`<br>`src/read/Reader.svelte:671`<br>`src/read/edge-indicators.ts:62` | `src/read/AmbientPill.svelte:76`<br>`src/read/MarginHeader.svelte:175` |
| `Events.APP_INIT_ERROR` | `app:init-error` | `src/app-bootstrap.ts:331`<br>`src/app-bootstrap.ts:425` | `src/core/save-failure-toast.svelte:41` |
| `Events.APP_READY_FOR_DOWNLOAD` | `app:ready-for-download` | `src/app-bootstrap.ts:486` | _(none)_ |
| `Events.APP_UPDATE_AVAILABLE` | `app:update-available` | `src/app-bootstrap.ts:404`<br>`src/app-bootstrap.ts:415` | `src/core/UpdateBanner.svelte:19` |
| `Events.AUDIO_ENDED` | `audio:ended` | `src/listen/player-runtime.ts:116` | _(none)_ |
| `Events.AUDIO_ERROR` | `audio:error` | `src/listen/player-runtime.ts:121`<br>`src/listen/player-runtime.ts:161`<br>`src/listen/player-runtime.ts:168` | _(none)_ |
| `Events.AUDIO_PAUSED` | `audio:paused` | `src/listen/player-runtime.ts:109` | _(none)_ |
| `Events.AUDIO_RECITER_CHANGED` | `audio:reciter-changed` | _(none)_ | _(none)_ |
| `Events.AUDIO_STARTED` | `audio:started` | `src/listen/player-runtime.ts:103` | _(none)_ |
| `Events.AUDIO_VERSE_CHANGED` | `audio:verse-changed` | `src/listen/player-runtime.ts:79` | `src/read/audio-autoscroll.ts:48`<br>`src/read/audio-highlight.ts:32` |
| `Events.BOOKMARKS_DELETED` | `bookmarks:deleted` | `src/navigate/bookmarks/store.ts:59` | `src/navigate/bookmarks/BookmarksList.svelte:225`<br>`src/navigate/bookmarks/BookmarksPage.svelte:34`<br>`src/navigate/bookmarks/indicator.ts:86`<br>`src/navigate/surahs/SurahList.svelte:138` |
| `Events.BOOKMARKS_SAVED` | `bookmarks:saved` | `src/navigate/bookmarks/store.ts:38` | `src/navigate/bookmarks/BookmarksList.svelte:224`<br>`src/navigate/bookmarks/BookmarksPage.svelte:33`<br>`src/navigate/bookmarks/indicator.ts:79`<br>`src/navigate/surahs/SurahList.svelte:137` |
| `Events.BOOKMARKS_SAVE_FAILED` | `bookmarks:save-failed` | `src/navigate/bookmarks/store.ts:42` | `src/core/save-failure-toast.svelte:29` |
| `Events.BOOKMARK_JUMP_LANDED` | `bookmark:jump-landed` | `src/navigate/bookmarks/BookmarksList.svelte:104` | `src/navigate/bookmarks/pulse.ts:29` |
| `Events.DATASET_APPLIED` | `dataset:applied` | `src/data/offline.ts:270` | _(none)_ |
| `Events.DATASET_DOWNLOAD_PROGRESS` | `dataset:download-progress` | `src/data/offline.ts:285` | _(none)_ |
| `Events.DATASET_PENDING_CONFIRMATION` | `dataset:pending-confirmation` | `src/data/offline.ts:263` | _(none)_ |
| `Events.DATASET_UPDATE_AVAILABLE` | `dataset:update-available` | `src/data/offline.ts:278` | _(none)_ |
| `Events.DATASET_UPDATE_FAILED` | `dataset:update-failed` | `src/data/offline.ts:275` | _(none)_ |
| `Events.DB_DELETE_BLOCKED` | `db:delete-blocked` | `src/core/db/connection.ts:52`<br>`src/core/db/connection.ts:89` | `src/core/save-failure-toast.svelte:38` |
| `Events.DB_QUOTA_EXCEEDED` | `db:quota-exceeded` | `src/core/db/connection.ts:126` | `src/core/quota-banner.svelte:12` |
| `Events.DB_VERSION_CHANGE` | `db:version-change` | `src/core/db/connection.ts:39` | `src/infra/safety/sync.ts:102` |
| `Events.DB_VISIBILITY_VISIBLE` | `db:visibility-visible` | `src/core/db/connection.ts:64` | `src/mark/indicator.ts:149`<br>`src/navigate/bookmarks/indicator.ts:107`<br>`src/read/position.ts:156`<br>`src/review/Hub.svelte:465` |
| `Events.EDGES_DELETED` | `edges:deleted` | `src/review/edges/store.ts:107` | _(none)_ |
| `Events.EDGES_SAVED` | `edges:saved` | `src/review/edges/store.ts:63`<br>`src/review/edges/store.ts:95` | _(none)_ |
| `Events.EDGES_SAVE_FAILED` | `edges:save-failed` | `src/review/edges/store.ts:68` | `src/core/save-failure-toast.svelte:32` |
| `Events.MARKS_DELETED` | `marks:deleted` | `src/mark/store.ts:113` | `src/mark/indicator.ts:113` |
| `Events.MARKS_SAVED` | `marks:saved` | `src/mark/store.ts:88` | `src/mark/indicator.ts:100` |
| `Events.MARKS_SAVE_FAILED` | `marks:save-failed` | `src/mark/store.ts:95` | `src/core/save-failure-toast.svelte:26` |
| `Events.MARKS_UNDO` | `marks:undo` | `src/core/ui.svelte:41` | `src/mark/indicator.ts:119` |
| `Events.NAVIGATION_NAVIGATE` | `navigation:navigate` | `src/navigate/CommandSheet.svelte:303`<br>`src/navigate/CommandSheet.svelte:305`<br>`src/navigate/NavDrawer.svelte:195`<br>`src/navigate/bookmarks/BookmarksList.svelte:106`<br>`src/navigate/surahs/SurahList.svelte:167` | `src/app-bootstrap.ts:293` |
| `Events.OFFLINE_DOWNLOAD_COMPLETE` | `offline:download-complete` | `src/data/offline.ts:208`<br>`src/data/offline.ts:247` | _(none)_ |
| `Events.OFFLINE_DOWNLOAD_ERROR` | `offline:download-error` | `src/data/offline.ts:200`<br>`src/data/offline.ts:215`<br>`src/data/offline.ts:259`<br>`src/data/offline.ts:311` | _(none)_ |
| `Events.OFFLINE_DOWNLOAD_PROGRESS` | `offline:download-progress` | `src/data/offline.ts:235` | `src/data/offline.ts:337` |
| `Events.OFFLINE_INSTALL_AVAILABLE` | `offline:install-available` | `src/data/offline.ts:351` | _(none)_ |
| `Events.OFFLINE_INSTALL_COMPLETE` | `offline:install-complete` | `src/data/offline.ts:356` | _(none)_ |
| `Events.OFFLINE_SW_TIMEOUT` | `offline:sw-timeout` | `src/data/offline.ts:165` | _(none)_ |
| `Events.READER_POSITION_SAVE_FAILED` | `reader:position-save-failed` | `src/read/position.ts:28` | `src/core/save-failure-toast.svelte:35` |
| `Events.READER_VERSE_RENDERED` | `reader:verse-rendered` | `src/read/Verse.svelte:62` | `src/mark/indicator.ts:96`<br>`src/navigate/bookmarks/indicator.ts:75` |
| `Events.REVIEW_FILTER` | `review:filter` | _(none)_ | _(none)_ |
| `Events.REVIEW_OPEN` | `review:open` | `src/review/Hub.svelte:427`<br>`src/review/Hub.svelte:459` | _(none)_ |
| `Events.ROUTER_LAUNCH_RESTORE` | `router:launch-restore` | `src/core/router.ts:148` | `src/app-bootstrap.ts:201` |
| `Events.ROUTER_ROUTE_CHANGE` | `router:route-change` | `src/core/router.ts:173`<br>`src/core/router.ts:191` | `src/read/AmbientDock.svelte:86`<br>`src/read/MarginHeader.svelte:174` |
| `Events.ROUTER_ROUTE_ERROR` | `router:route-error` | `src/core/router.ts:169`<br>`src/core/router.ts:187`<br>`src/core/router.ts:199` | `src/core/save-failure-toast.svelte:44` |
| `Events.SETTINGS_DATA_CLEARED` | `settings:data-cleared` | `src/configure/clear-data.ts:170` | _(none)_ |
| `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `settings:recent-surahs-updated` | `src/configure/state-recent-surahs.svelte.ts:26` | `src/navigate/NavDrawer.svelte:244`<br>`src/navigate/surahs/SurahList.svelte:141` |
| `Events.SETTINGS_RIWAYAH_CHANGED` | `settings:riwayah-changed` | `src/configure/riwayah.ts:58`<br>`src/configure/riwayah.ts:74` | `src/app-bootstrap.ts:172`<br>`src/configure/reading-typography.ts:133`<br>`src/navigate/bookmarks/BookmarksList.svelte:227`<br>`src/navigate/bookmarks/BookmarksPage.svelte:36`<br>`src/navigate/bookmarks/indicator.ts:102`<br>`src/navigate/surahs/SurahList.svelte:140`<br>`src/read/Reader.svelte:504` |
| `Events.SHEET_CLOSED` | `sheet:closed` | `src/configure/Panel.svelte:152`<br>`src/navigate/shortcuts-sheet.js:162` | _(none)_ |
| `Events.SHEET_OPENED` | `sheet:opened` | `src/configure/Panel.svelte:135`<br>`src/navigate/shortcuts-sheet.js:153` | _(none)_ |
| `Events.STORAGE_QUOTA_WARNING` | `storage:quota-warning` | `src/data/offline.ts:113` | `src/core/quota-banner.svelte:18` |
| `Events.SYNC_BOOKMARKS_UPDATED` | `sync:bookmarks-updated` | `src/infra/safety/sync.ts:276` | `src/navigate/bookmarks/BookmarksList.svelte:226`<br>`src/navigate/bookmarks/BookmarksPage.svelte:35`<br>`src/navigate/bookmarks/indicator.ts:93`<br>`src/navigate/surahs/SurahList.svelte:139` |
| `Events.SYNC_EDGES_UPDATED` | `sync:edges-updated` | `src/infra/safety/sync.ts:264` | _(none)_ |
| `Events.SYNC_UPDATE_RECEIVED` | `sync:update-received` | `src/infra/safety/sync.ts:256` | `src/mark/indicator.ts:132`<br>`src/mark/tag/TagSheet.svelte:175`<br>`src/review/Hub.svelte:461` |
<!-- AUTO-GENERATED:catalog END -->

## Dead events

Declared in `Events` but neither emitted nor listened. Candidate for deletion.

<!-- AUTO-GENERATED:dead START -->
- `Events.AUDIO_RECITER_CHANGED` (`audio:reciter-changed`)
- `Events.REVIEW_FILTER` (`review:filter`)
<!-- AUTO-GENERATED:dead END -->

## Orphan emits (no listener)

<!-- AUTO-GENERATED:orphan-emit START -->
- `Events.APP_READY_FOR_DOWNLOAD` (`app:ready-for-download`) — emitted at `src/app-bootstrap.ts:486`
- `Events.AUDIO_ENDED` (`audio:ended`) — emitted at `src/listen/player-runtime.ts:116`
- `Events.AUDIO_ERROR` (`audio:error`) — emitted at `src/listen/player-runtime.ts:121`<br>`src/listen/player-runtime.ts:161`<br>`src/listen/player-runtime.ts:168`
- `Events.AUDIO_PAUSED` (`audio:paused`) — emitted at `src/listen/player-runtime.ts:109`
- `Events.AUDIO_STARTED` (`audio:started`) — emitted at `src/listen/player-runtime.ts:103`
- `Events.DATASET_APPLIED` (`dataset:applied`) — emitted at `src/data/offline.ts:270`
- `Events.DATASET_DOWNLOAD_PROGRESS` (`dataset:download-progress`) — emitted at `src/data/offline.ts:285`
- `Events.DATASET_PENDING_CONFIRMATION` (`dataset:pending-confirmation`) — emitted at `src/data/offline.ts:263`
- `Events.DATASET_UPDATE_AVAILABLE` (`dataset:update-available`) — emitted at `src/data/offline.ts:278`
- `Events.DATASET_UPDATE_FAILED` (`dataset:update-failed`) — emitted at `src/data/offline.ts:275`
- `Events.EDGES_DELETED` (`edges:deleted`) — emitted at `src/review/edges/store.ts:107`
- `Events.EDGES_SAVED` (`edges:saved`) — emitted at `src/review/edges/store.ts:63`<br>`src/review/edges/store.ts:95`
- `Events.OFFLINE_DOWNLOAD_COMPLETE` (`offline:download-complete`) — emitted at `src/data/offline.ts:208`<br>`src/data/offline.ts:247`
- `Events.OFFLINE_DOWNLOAD_ERROR` (`offline:download-error`) — emitted at `src/data/offline.ts:200`<br>`src/data/offline.ts:215`<br>`src/data/offline.ts:259`<br>`src/data/offline.ts:311`
- `Events.OFFLINE_INSTALL_AVAILABLE` (`offline:install-available`) — emitted at `src/data/offline.ts:351`
- `Events.OFFLINE_INSTALL_COMPLETE` (`offline:install-complete`) — emitted at `src/data/offline.ts:356`
- `Events.OFFLINE_SW_TIMEOUT` (`offline:sw-timeout`) — emitted at `src/data/offline.ts:165`
- `Events.REVIEW_OPEN` (`review:open`) — emitted at `src/review/Hub.svelte:427`<br>`src/review/Hub.svelte:459`
- `Events.SETTINGS_DATA_CLEARED` (`settings:data-cleared`) — emitted at `src/configure/clear-data.ts:170`
- `Events.SHEET_CLOSED` (`sheet:closed`) — emitted at `src/configure/Panel.svelte:152`<br>`src/navigate/shortcuts-sheet.js:162`
- `Events.SHEET_OPENED` (`sheet:opened`) — emitted at `src/configure/Panel.svelte:135`<br>`src/navigate/shortcuts-sheet.js:153`
- `Events.SYNC_EDGES_UPDATED` (`sync:edges-updated`) — emitted at `src/infra/safety/sync.ts:264`
<!-- AUTO-GENERATED:orphan-emit END -->

