# Events catalog

> AUTO-GENERATED from `src/core/constants.ts` (Events map) + `emit(Events.X)` / `on(Events.X)` call sites across `src/**`. Run `pnpm docs:derive` to regenerate. Manual edits below the next paragraph are preserved (write them outside the auto-generated table).

Total events declared: **53**. Live emits: **51**. Live listeners: **29**.

Dead (declared but neither emitted nor listened): **2**.
Orphan emit (emitted, never listened): **22**.
Orphan listen (listened, never emitted): **0**.

## Catalog

<!-- AUTO-GENERATED:catalog START -->
| Constant | Event name | Emit sites | Listen sites |
| --- | --- | --- | --- |
| `Events.AMBIENT_SURFACE` | `ambient:surface` | `src/nav/AmbientDock.svelte:64`<br>`src/nav/AmbientPill.svelte:90`<br>`src/nav/MarginHeader.svelte:41`<br>`src/reader/EdgeIndicator.svelte:42`<br>`src/reader/Reader.svelte:452`<br>`src/reader/edge-indicators.ts:62` | `src/nav/AmbientPill.svelte:76`<br>`src/nav/MarginHeader.svelte:175` |
| `Events.APP_INIT_ERROR` | `app:init-error` | `src/app-bootstrap.ts:340`<br>`src/app-bootstrap.ts:434` | `src/core/save-failure-toast.svelte:51` |
| `Events.APP_READY_FOR_DOWNLOAD` | `app:ready-for-download` | `src/app-bootstrap.ts:495` | _(none)_ |
| `Events.APP_UPDATE_AVAILABLE` | `app:update-available` | `src/app-bootstrap.ts:413`<br>`src/app-bootstrap.ts:424` | `src/core/UpdateBanner.svelte:19` |
| `Events.AUDIO_ENDED` | `audio:ended` | `src/audio/player-runtime.ts:116` | _(none)_ |
| `Events.AUDIO_ERROR` | `audio:error` | `src/audio/player-runtime.ts:121`<br>`src/audio/player-runtime.ts:161`<br>`src/audio/player-runtime.ts:168` | _(none)_ |
| `Events.AUDIO_PAUSED` | `audio:paused` | `src/audio/player-runtime.ts:109` | _(none)_ |
| `Events.AUDIO_RECITER_CHANGED` | `audio:reciter-changed` | _(none)_ | _(none)_ |
| `Events.AUDIO_STARTED` | `audio:started` | `src/audio/player-runtime.ts:103` | _(none)_ |
| `Events.AUDIO_VERSE_CHANGED` | `audio:verse-changed` | `src/audio/player-runtime.ts:79` | `src/reader/audio-autoscroll.ts:48`<br>`src/reader/audio-highlight.ts:32` |
| `Events.BOOKMARKS_DELETED` | `bookmarks:deleted` | `src/bookmarks/store.ts:59` | `src/bookmarks/BookmarksList.svelte:225`<br>`src/bookmarks/BookmarksPage.svelte:34`<br>`src/bookmarks/indicator.ts:86`<br>`src/surahs/SurahList.svelte:138` |
| `Events.BOOKMARKS_SAVED` | `bookmarks:saved` | `src/bookmarks/store.ts:38` | `src/bookmarks/BookmarksList.svelte:224`<br>`src/bookmarks/BookmarksPage.svelte:33`<br>`src/bookmarks/indicator.ts:79`<br>`src/surahs/SurahList.svelte:137` |
| `Events.BOOKMARKS_SAVE_FAILED` | `bookmarks:save-failed` | `src/bookmarks/store.ts:42` | `src/core/save-failure-toast.svelte:39` |
| `Events.BOOKMARK_JUMP_LANDED` | `bookmark:jump-landed` | `src/bookmarks/BookmarksList.svelte:104` | `src/bookmarks/pulse.ts:29` |
| `Events.DATASET_APPLIED` | `dataset:applied` | `src/data/offline.ts:264` | _(none)_ |
| `Events.DATASET_DOWNLOAD_PROGRESS` | `dataset:download-progress` | `src/data/offline.ts:279` | _(none)_ |
| `Events.DATASET_PENDING_CONFIRMATION` | `dataset:pending-confirmation` | `src/data/offline.ts:257` | _(none)_ |
| `Events.DATASET_UPDATE_AVAILABLE` | `dataset:update-available` | `src/data/offline.ts:272` | _(none)_ |
| `Events.DATASET_UPDATE_FAILED` | `dataset:update-failed` | `src/data/offline.ts:269` | _(none)_ |
| `Events.DB_DELETE_BLOCKED` | `db:delete-blocked` | `src/core/db/connection.ts:52`<br>`src/core/db/connection.ts:89` | `src/core/save-failure-toast.svelte:48` |
| `Events.DB_QUOTA_EXCEEDED` | `db:quota-exceeded` | `src/core/db/connection.ts:126` | `src/core/quota-banner.svelte:12` |
| `Events.DB_VERSION_CHANGE` | `db:version-change` | `src/core/db/connection.ts:39` | `src/safety/sync.ts:102` |
| `Events.DB_VISIBILITY_VISIBLE` | `db:visibility-visible` | `src/core/db/connection.ts:64` | `src/bookmarks/indicator.ts:107`<br>`src/marks/indicator.ts:149`<br>`src/reader/position.ts:156`<br>`src/review/Hub.svelte:465` |
| `Events.EDGES_DELETED` | `edges:deleted` | `src/edges/store.ts:107` | _(none)_ |
| `Events.EDGES_SAVED` | `edges:saved` | `src/edges/store.ts:63`<br>`src/edges/store.ts:95` | _(none)_ |
| `Events.EDGES_SAVE_FAILED` | `edges:save-failed` | `src/edges/store.ts:68` | `src/core/save-failure-toast.svelte:42` |
| `Events.MARKS_DELETED` | `marks:deleted` | `src/marks/store.ts:113` | `src/marks/indicator.ts:113` |
| `Events.MARKS_SAVED` | `marks:saved` | `src/marks/store.ts:88` | `src/marks/indicator.ts:100` |
| `Events.MARKS_SAVE_FAILED` | `marks:save-failed` | `src/marks/store.ts:95` | `src/core/save-failure-toast.svelte:36` |
| `Events.MARKS_UNDO` | `marks:undo` | `src/core/ui.svelte:41` | `src/marks/indicator.ts:119` |
| `Events.NAVIGATION_NAVIGATE` | `navigation:navigate` | `src/bookmarks/BookmarksList.svelte:106`<br>`src/nav/CommandSheet.svelte:303`<br>`src/nav/CommandSheet.svelte:305`<br>`src/nav/NavDrawer.svelte:194`<br>`src/surahs/SurahList.svelte:167` | `src/app-bootstrap.ts:302` |
| `Events.OFFLINE_DOWNLOAD_COMPLETE` | `offline:download-complete` | `src/data/offline.ts:202`<br>`src/data/offline.ts:241` | _(none)_ |
| `Events.OFFLINE_DOWNLOAD_ERROR` | `offline:download-error` | `src/data/offline.ts:194`<br>`src/data/offline.ts:209`<br>`src/data/offline.ts:253`<br>`src/data/offline.ts:305` | _(none)_ |
| `Events.OFFLINE_DOWNLOAD_PROGRESS` | `offline:download-progress` | `src/data/offline.ts:229` | `src/data/offline.ts:331` |
| `Events.OFFLINE_INSTALL_AVAILABLE` | `offline:install-available` | `src/data/offline.ts:345` | _(none)_ |
| `Events.OFFLINE_INSTALL_COMPLETE` | `offline:install-complete` | `src/data/offline.ts:350` | _(none)_ |
| `Events.OFFLINE_SW_TIMEOUT` | `offline:sw-timeout` | `src/data/offline.ts:159` | _(none)_ |
| `Events.READER_POSITION_SAVE_FAILED` | `reader:position-save-failed` | `src/reader/position.ts:28` | `src/core/save-failure-toast.svelte:45` |
| `Events.READER_VERSE_RENDERED` | `reader:verse-rendered` | `src/reader/Verse.svelte:50` | `src/bookmarks/indicator.ts:75`<br>`src/marks/indicator.ts:96` |
| `Events.REVIEW_FILTER` | `review:filter` | _(none)_ | _(none)_ |
| `Events.REVIEW_OPEN` | `review:open` | `src/review/Hub.svelte:427`<br>`src/review/Hub.svelte:459` | _(none)_ |
| `Events.ROUTER_LAUNCH_RESTORE` | `router:launch-restore` | `src/core/router.ts:148` | `src/app-bootstrap.ts:210` |
| `Events.ROUTER_ROUTE_CHANGE` | `router:route-change` | `src/core/router.ts:173`<br>`src/core/router.ts:191` | `src/nav/AmbientDock.svelte:86`<br>`src/nav/MarginHeader.svelte:174` |
| `Events.ROUTER_ROUTE_ERROR` | `router:route-error` | `src/core/router.ts:169`<br>`src/core/router.ts:187`<br>`src/core/router.ts:199` | `src/core/save-failure-toast.svelte:54` |
| `Events.SETTINGS_DATA_CLEARED` | `settings:data-cleared` | `src/settings/clear-data.ts:170` | _(none)_ |
| `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `settings:recent-surahs-updated` | `src/state/recent-surahs.svelte.ts:26` | `src/nav/NavDrawer.svelte:243`<br>`src/surahs/SurahList.svelte:141` |
| `Events.SETTINGS_RIWAYAH_CHANGED` | `settings:riwayah-changed` | `src/settings/riwayah.ts:58`<br>`src/settings/riwayah.ts:74` | `src/app-bootstrap.ts:181`<br>`src/bookmarks/BookmarksList.svelte:227`<br>`src/bookmarks/BookmarksPage.svelte:36`<br>`src/bookmarks/indicator.ts:102`<br>`src/reader/Reader.svelte:183`<br>`src/settings/reading-typography.ts:133`<br>`src/surahs/SurahList.svelte:140` |
| `Events.SHEET_CLOSED` | `sheet:closed` | `src/nav/shortcuts-sheet.js:162`<br>`src/settings/Panel.svelte:130` | _(none)_ |
| `Events.SHEET_OPENED` | `sheet:opened` | `src/nav/shortcuts-sheet.js:153`<br>`src/settings/Panel.svelte:113` | _(none)_ |
| `Events.STORAGE_QUOTA_WARNING` | `storage:quota-warning` | `src/data/offline.ts:107` | `src/core/quota-banner.svelte:18` |
| `Events.SYNC_BOOKMARKS_UPDATED` | `sync:bookmarks-updated` | `src/safety/sync.ts:276` | `src/bookmarks/BookmarksList.svelte:226`<br>`src/bookmarks/BookmarksPage.svelte:35`<br>`src/bookmarks/indicator.ts:93`<br>`src/surahs/SurahList.svelte:139` |
| `Events.SYNC_EDGES_UPDATED` | `sync:edges-updated` | `src/safety/sync.ts:264` | _(none)_ |
| `Events.SYNC_UPDATE_RECEIVED` | `sync:update-received` | `src/safety/sync.ts:256` | `src/marks/indicator.ts:132`<br>`src/review/Hub.svelte:461`<br>`src/tag/TagSheet.svelte:175` |
<!-- AUTO-GENERATED:catalog END -->

## Dead events

Declared in `Events` but neither emitted nor listened. Candidate for deletion.

<!-- AUTO-GENERATED:dead START -->
- `Events.AUDIO_RECITER_CHANGED` (`audio:reciter-changed`)
- `Events.REVIEW_FILTER` (`review:filter`)
<!-- AUTO-GENERATED:dead END -->

## Orphan emits (no listener)

<!-- AUTO-GENERATED:orphan-emit START -->
- `Events.APP_READY_FOR_DOWNLOAD` (`app:ready-for-download`) — emitted at `src/app-bootstrap.ts:495`
- `Events.AUDIO_ENDED` (`audio:ended`) — emitted at `src/audio/player-runtime.ts:116`
- `Events.AUDIO_ERROR` (`audio:error`) — emitted at `src/audio/player-runtime.ts:121`<br>`src/audio/player-runtime.ts:161`<br>`src/audio/player-runtime.ts:168`
- `Events.AUDIO_PAUSED` (`audio:paused`) — emitted at `src/audio/player-runtime.ts:109`
- `Events.AUDIO_STARTED` (`audio:started`) — emitted at `src/audio/player-runtime.ts:103`
- `Events.DATASET_APPLIED` (`dataset:applied`) — emitted at `src/data/offline.ts:264`
- `Events.DATASET_DOWNLOAD_PROGRESS` (`dataset:download-progress`) — emitted at `src/data/offline.ts:279`
- `Events.DATASET_PENDING_CONFIRMATION` (`dataset:pending-confirmation`) — emitted at `src/data/offline.ts:257`
- `Events.DATASET_UPDATE_AVAILABLE` (`dataset:update-available`) — emitted at `src/data/offline.ts:272`
- `Events.DATASET_UPDATE_FAILED` (`dataset:update-failed`) — emitted at `src/data/offline.ts:269`
- `Events.EDGES_DELETED` (`edges:deleted`) — emitted at `src/edges/store.ts:107`
- `Events.EDGES_SAVED` (`edges:saved`) — emitted at `src/edges/store.ts:63`<br>`src/edges/store.ts:95`
- `Events.OFFLINE_DOWNLOAD_COMPLETE` (`offline:download-complete`) — emitted at `src/data/offline.ts:202`<br>`src/data/offline.ts:241`
- `Events.OFFLINE_DOWNLOAD_ERROR` (`offline:download-error`) — emitted at `src/data/offline.ts:194`<br>`src/data/offline.ts:209`<br>`src/data/offline.ts:253`<br>`src/data/offline.ts:305`
- `Events.OFFLINE_INSTALL_AVAILABLE` (`offline:install-available`) — emitted at `src/data/offline.ts:345`
- `Events.OFFLINE_INSTALL_COMPLETE` (`offline:install-complete`) — emitted at `src/data/offline.ts:350`
- `Events.OFFLINE_SW_TIMEOUT` (`offline:sw-timeout`) — emitted at `src/data/offline.ts:159`
- `Events.REVIEW_OPEN` (`review:open`) — emitted at `src/review/Hub.svelte:427`<br>`src/review/Hub.svelte:459`
- `Events.SETTINGS_DATA_CLEARED` (`settings:data-cleared`) — emitted at `src/settings/clear-data.ts:170`
- `Events.SHEET_CLOSED` (`sheet:closed`) — emitted at `src/nav/shortcuts-sheet.js:162`<br>`src/settings/Panel.svelte:130`
- `Events.SHEET_OPENED` (`sheet:opened`) — emitted at `src/nav/shortcuts-sheet.js:153`<br>`src/settings/Panel.svelte:113`
- `Events.SYNC_EDGES_UPDATED` (`sync:edges-updated`) — emitted at `src/safety/sync.ts:264`
<!-- AUTO-GENERATED:orphan-emit END -->

