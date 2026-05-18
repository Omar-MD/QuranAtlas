# Events catalog

> AUTO-GENERATED from `src/core/constants.ts` (Events map) + `emit(Events.X)` / `on(Events.X)` call sites across `src/**`. Run `pnpm run docs` to regenerate. Manual edits below the next paragraph are preserved (write them outside the auto-generated table).

Total events declared: **38**. Live emits: **38**. Live listeners: **22**.

Dead (declared but neither emitted nor listened): **0**.
Orphan emit (emitted, never listened): **16**.
Orphan listen (listened, never emitted): **0**.

## Catalog

<!-- AUTO-GENERATED:catalog START -->
| Constant | Event name | Emit sites | Listen sites |
| --- | --- | --- | --- |
| `Events.AMBIENT_SURFACE` | `ambient:surface` | `src/read/AmbientDock.svelte:79`<br>`src/read/AmbientPill.svelte:90`<br>`src/read/EdgeIndicator.svelte:42`<br>`src/read/MarginHeader.svelte:53`<br>`src/read/Reader.svelte:667`<br>`src/read/edge-indicators.ts:62` | `src/read/AmbientPill.svelte:76`<br>`src/read/MarginHeader.svelte:195` |
| `Events.APP_INIT_ERROR` | `app:init-error` | `src/app-bootstrap.ts:334`<br>`src/app-bootstrap.ts:428` | `src/core/save-failure-toast.svelte:35` |
| `Events.APP_READY_FOR_DOWNLOAD` | `app:ready-for-download` | `src/app-bootstrap.ts:489` | _(none)_ |
| `Events.APP_UPDATE_AVAILABLE` | `app:update-available` | `src/app-bootstrap.ts:407`<br>`src/app-bootstrap.ts:418` | `src/core/UpdateBanner.svelte:19` |
| `Events.BOOKMARKS_DELETED` | `bookmarks:deleted` | `src/continuity/bookmarks/store.ts:53` | `src/navigate/bookmarks/BookmarksList.svelte:229`<br>`src/navigate/bookmarks/BookmarksPage.svelte:34`<br>`src/navigate/bookmarks/indicator.ts:91`<br>`src/navigate/surahs/SurahList.svelte:138` |
| `Events.BOOKMARKS_SAVED` | `bookmarks:saved` | `src/continuity/bookmarks/store.ts:35` | `src/navigate/bookmarks/BookmarksList.svelte:228`<br>`src/navigate/bookmarks/BookmarksPage.svelte:33`<br>`src/navigate/bookmarks/indicator.ts:84`<br>`src/navigate/surahs/SurahList.svelte:137` |
| `Events.BOOKMARKS_SAVE_FAILED` | `bookmarks:save-failed` | `src/continuity/bookmarks/store.ts:39` | `src/core/save-failure-toast.svelte:26` |
| `Events.BOOKMARK_JUMP_LANDED` | `bookmark:jump-landed` | `src/navigate/bookmarks/BookmarksList.svelte:108` | `src/navigate/bookmarks/pulse.ts:29` |
| `Events.DATASET_APPLIED` | `dataset:applied` | `src/data/offline.ts:351` | _(none)_ |
| `Events.DATASET_DOWNLOAD_PROGRESS` | `dataset:download-progress` | `src/data/offline.ts:366` | _(none)_ |
| `Events.DATASET_PENDING_CONFIRMATION` | `dataset:pending-confirmation` | `src/data/offline.ts:344` | _(none)_ |
| `Events.DATASET_UPDATE_AVAILABLE` | `dataset:update-available` | `src/data/offline.ts:359` | _(none)_ |
| `Events.DATASET_UPDATE_FAILED` | `dataset:update-failed` | `src/data/offline.ts:356` | _(none)_ |
| `Events.DB_DELETE_BLOCKED` | `db:delete-blocked` | `src/core/db/connection.ts:52`<br>`src/core/db/connection.ts:89` | `src/core/save-failure-toast.svelte:32` |
| `Events.DB_QUOTA_EXCEEDED` | `db:quota-exceeded` | `src/core/db/connection.ts:126` | `src/core/quota-banner.svelte:12` |
| `Events.DB_VERSION_CHANGE` | `db:version-change` | `src/core/db/connection.ts:39` | `src/infra/safety/sync.ts:95` |
| `Events.DB_VISIBILITY_VISIBLE` | `db:visibility-visible` | `src/core/db/connection.ts:64` | `src/navigate/bookmarks/indicator.ts:112`<br>`src/read/position.ts:161` |
| `Events.NAVIGATION_NAVIGATE` | `navigation:navigate` | `src/navigate/CommandSheet.svelte:258`<br>`src/navigate/CommandSheet.svelte:260`<br>`src/navigate/NavDrawer.svelte:250`<br>`src/navigate/NavDrawer.svelte:325`<br>`src/navigate/NavDrawer.svelte:709`<br>`src/navigate/bookmarks/BookmarksList.svelte:110`<br>`src/navigate/surahs/SurahList.svelte:167` | `src/app-bootstrap.ts:296` |
| `Events.OFFLINE_DOWNLOAD_COMPLETE` | `offline:download-complete` | `src/data/offline.ts:289`<br>`src/data/offline.ts:328`<br>`src/data/offline.ts:431`<br>`src/data/offline.ts:508`<br>`src/data/offline.ts:623` | _(none)_ |
| `Events.OFFLINE_DOWNLOAD_ERROR` | `offline:download-error` | `src/data/offline.ts:282`<br>`src/data/offline.ts:296`<br>`src/data/offline.ts:340`<br>`src/data/offline.ts:392`<br>`src/data/offline.ts:411`<br>`src/data/offline.ts:490`<br>`src/data/offline.ts:512`<br>`src/data/offline.ts:595`<br>`src/data/offline.ts:629` | _(none)_ |
| `Events.OFFLINE_DOWNLOAD_PROGRESS` | `offline:download-progress` | `src/data/offline.ts:316`<br>`src/data/offline.ts:429`<br>`src/data/offline.ts:501`<br>`src/data/offline.ts:614` | `src/data/offline.ts:718` |
| `Events.OFFLINE_INSTALL_AVAILABLE` | `offline:install-available` | `src/data/offline.ts:732` | _(none)_ |
| `Events.OFFLINE_INSTALL_COMPLETE` | `offline:install-complete` | `src/data/offline.ts:737` | _(none)_ |
| `Events.OFFLINE_RIWAYAH_PACKAGE_ERROR` | `offline:riwayah-package-error` | `src/data/offline.ts:588`<br>`src/data/offline.ts:594`<br>`src/data/offline.ts:600`<br>`src/data/offline.ts:628` | _(none)_ |
| `Events.OFFLINE_RIWAYAH_PACKAGE_PROGRESS` | `offline:riwayah-package-progress` | `src/data/offline.ts:613` | _(none)_ |
| `Events.OFFLINE_SW_TIMEOUT` | `offline:sw-timeout` | `src/data/offline.ts:243` | _(none)_ |
| `Events.READER_POSITION_SAVE_FAILED` | `reader:position-save-failed` | `src/read/position.ts:33` | `src/core/save-failure-toast.svelte:29` |
| `Events.READER_VERSE_RENDERED` | `reader:verse-rendered` | `src/read/Verse.svelte:62` | `src/navigate/bookmarks/indicator.ts:80` |
| `Events.ROUTER_LAUNCH_RESTORE` | `router:launch-restore` | `src/core/router.ts:148` | `src/app-bootstrap.ts:213` |
| `Events.ROUTER_ROUTE_CHANGE` | `router:route-change` | `src/core/router.ts:173`<br>`src/core/router.ts:191` | `src/navigate/NavDrawer.svelte:395`<br>`src/read/AmbientDock.svelte:100`<br>`src/read/MarginHeader.svelte:186` |
| `Events.ROUTER_ROUTE_ERROR` | `router:route-error` | `src/core/router.ts:169`<br>`src/core/router.ts:187`<br>`src/core/router.ts:199` | `src/core/save-failure-toast.svelte:38` |
| `Events.SETTINGS_DATA_CLEARED` | `settings:data-cleared` | `src/configure/clear-data.ts:170` | _(none)_ |
| `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `settings:recent-surahs-updated` | `src/configure/state-recent-surahs.svelte.ts:26` | `src/navigate/NavDrawer.svelte:392`<br>`src/navigate/surahs/SurahList.svelte:141` |
| `Events.SETTINGS_RIWAYAH_CHANGED` | `settings:riwayah-changed` | `src/configure/riwayah.ts:68`<br>`src/configure/variant-bundle.ts:66`<br>`src/packs/riwayah.ts:181` | `src/app-bootstrap.ts:175`<br>`src/configure/reading-typography.ts:133`<br>`src/navigate/bookmarks/BookmarksList.svelte:231`<br>`src/navigate/bookmarks/BookmarksPage.svelte:36`<br>`src/navigate/bookmarks/indicator.ts:107`<br>`src/navigate/surahs/SurahList.svelte:140`<br>`src/read/Reader.svelte:499`<br>`src/read/mushaf/MushafReader.svelte:369` |
| `Events.SHEET_CLOSED` | `sheet:closed` | `src/configure/Panel.svelte:37`<br>`src/navigate/shortcuts-sheet.js:160` | _(none)_ |
| `Events.SHEET_OPENED` | `sheet:opened` | `src/configure/Panel.svelte:29`<br>`src/navigate/shortcuts-sheet.js:151` | _(none)_ |
| `Events.STORAGE_QUOTA_WARNING` | `storage:quota-warning` | `src/data/offline.ts:154` | `src/core/quota-banner.svelte:18` |
| `Events.SYNC_BOOKMARKS_UPDATED` | `sync:bookmarks-updated` | `src/infra/safety/sync.ts:233` | `src/navigate/bookmarks/BookmarksList.svelte:230`<br>`src/navigate/bookmarks/BookmarksPage.svelte:35`<br>`src/navigate/bookmarks/indicator.ts:98`<br>`src/navigate/surahs/SurahList.svelte:139` |
<!-- AUTO-GENERATED:catalog END -->

## Orphan emits (no listener)

<!-- AUTO-GENERATED:orphan-emit START -->
- `Events.APP_READY_FOR_DOWNLOAD` (`app:ready-for-download`) — emitted at `src/app-bootstrap.ts:489`
- `Events.DATASET_APPLIED` (`dataset:applied`) — emitted at `src/data/offline.ts:351`
- `Events.DATASET_DOWNLOAD_PROGRESS` (`dataset:download-progress`) — emitted at `src/data/offline.ts:366`
- `Events.DATASET_PENDING_CONFIRMATION` (`dataset:pending-confirmation`) — emitted at `src/data/offline.ts:344`
- `Events.DATASET_UPDATE_AVAILABLE` (`dataset:update-available`) — emitted at `src/data/offline.ts:359`
- `Events.DATASET_UPDATE_FAILED` (`dataset:update-failed`) — emitted at `src/data/offline.ts:356`
- `Events.OFFLINE_DOWNLOAD_COMPLETE` (`offline:download-complete`) — emitted at `src/data/offline.ts:289`<br>`src/data/offline.ts:328`<br>`src/data/offline.ts:431`<br>`src/data/offline.ts:508`<br>`src/data/offline.ts:623`
- `Events.OFFLINE_DOWNLOAD_ERROR` (`offline:download-error`) — emitted at `src/data/offline.ts:282`<br>`src/data/offline.ts:296`<br>`src/data/offline.ts:340`<br>`src/data/offline.ts:392`<br>`src/data/offline.ts:411`<br>`src/data/offline.ts:490`<br>`src/data/offline.ts:512`<br>`src/data/offline.ts:595`<br>`src/data/offline.ts:629`
- `Events.OFFLINE_INSTALL_AVAILABLE` (`offline:install-available`) — emitted at `src/data/offline.ts:732`
- `Events.OFFLINE_INSTALL_COMPLETE` (`offline:install-complete`) — emitted at `src/data/offline.ts:737`
- `Events.OFFLINE_RIWAYAH_PACKAGE_ERROR` (`offline:riwayah-package-error`) — emitted at `src/data/offline.ts:588`<br>`src/data/offline.ts:594`<br>`src/data/offline.ts:600`<br>`src/data/offline.ts:628`
- `Events.OFFLINE_RIWAYAH_PACKAGE_PROGRESS` (`offline:riwayah-package-progress`) — emitted at `src/data/offline.ts:613`
- `Events.OFFLINE_SW_TIMEOUT` (`offline:sw-timeout`) — emitted at `src/data/offline.ts:243`
- `Events.SETTINGS_DATA_CLEARED` (`settings:data-cleared`) — emitted at `src/configure/clear-data.ts:170`
- `Events.SHEET_CLOSED` (`sheet:closed`) — emitted at `src/configure/Panel.svelte:37`<br>`src/navigate/shortcuts-sheet.js:160`
- `Events.SHEET_OPENED` (`sheet:opened`) — emitted at `src/configure/Panel.svelte:29`<br>`src/navigate/shortcuts-sheet.js:151`
<!-- AUTO-GENERATED:orphan-emit END -->

