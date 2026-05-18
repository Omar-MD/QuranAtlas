---
surface: configure
src_paths:
  - 'src/configure/**'
  - 'src/configure/about/**'
owns_stores:
  - settings
test_paths:
  unit:
    - 'tests/unit/configure/**'
    - 'tests/unit/configure/about/**'
  e2e:
    - 'tests/e2e/configure/*.spec.js'
---

# Surface: configure

> Mode-aware Verse Settings, Mushaf Settings, Asset Management, and About page for Reader First preferences: theme, night mode, typography, qira'ah/riwayah source, translation, tafsir, active Quran text style, active Mushaf edition, install state, and clear-all-data. Pack-state policy now lives in `src/packs/**`; configure consumes those APIs and only changes active source settings once a pack is verified usable or explicitly switched back to the verified baseline. Audio is removed product scope pending source cleanup.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Settings gear ⚙ on MarginHeader (mobile) | single tap | open Verse Settings on `#/s/*`, Mushaf Settings on `#/m/*` |
| Settings gear double-tap (mobile, ≤300 ms) | gesture | cycle theme without opening sheet |
| Manage Assets in Settings | tap | close Settings and route to `#/assets` |
| Storage/quota banner CTA | tap | route to `#/assets` |
| Missing reader asset prompt | tap | route to `#/assets` |
| Drawer header ⓘ icon | tap | `#/about` |
| AmbientDock ⋯ → drawer → About | tap | `#/about` |
| `⌘↑` / `Ctrl+↑` | keyboard | bump font size up (works outside the sheet; guarded against focused inputs) |
| `⌘↓` / `Ctrl+↓` | keyboard | bump font size down |
| `t` (reader) | keyboard | toggle `translationVisible` |
| `n` (reader) | keyboard | toggle night-mode |
| `d` (reader) | keyboard | cycle theme |
| About footer "Clear all data" link | tap | confirmation dialog |

Routes: `#/settings` (transient settings opener), `#/assets` (all viewports), `#/about` (all viewports).

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/configure/ClearDataConfirm.svelte` | Focus the input after the DOM updates |
| `src/configure/Panel.svelte` | _(no leading comment)_ |
| `src/configure/about/About.svelte` | _(no leading comment)_ |
| `src/configure/about/pwa-install.ts` | PWA install prompt management. |
| `src/configure/assets/AssetManagement.svelte` | _(no leading comment)_ |
| `src/configure/assets/asset-view-model.ts` | _(no leading comment)_ |
| `src/configure/clear-data.ts` | Clear data: confirmation flow and data deletion. |
| `src/configure/font-size.ts` | Font size preference: persisted in IDB settings store, applied via data-font-size |
| `src/configure/mushaf-edition.ts` | _(no leading comment)_ |
| `src/configure/night-mode.ts` | Night recitation mode: dim+warm overlay, composes over any theme. |
| `src/configure/offline-categories.ts` | Offline categories preference: per-feature opt-in for the offline selector. |
| `src/configure/offline-selector.svelte` | Per-feature offline opt-in selector. |
| `src/configure/panel-bridge.ts` | Settings Panel — overlay bridge + sole-writer/-reader data functions. |
| `src/configure/quran-text-style.ts` | _(no leading comment)_ |
| `src/configure/reading-typography.ts` | Reading typography preferences: line spacing, word spacing, reader margin. |
| `src/configure/riwayah.ts` | Riwayah preference: which Qur'anic transmission the reader displays. |
| `src/configure/settings/MushafSettings.svelte` | _(no leading comment)_ |
| `src/configure/settings/NestedAssetPicker.svelte` | _(no leading comment)_ |
| `src/configure/settings/SettingsShell.svelte` | _(no leading comment)_ |
| `src/configure/settings/ThemeNightControls.svelte` | _(no leading comment)_ |
| `src/configure/settings/VerseSettings.svelte` | _(no leading comment)_ |
| `src/configure/state-last-surface.svelte.ts` | _(no leading comment)_ |
| `src/configure/state-recent-surahs.svelte.ts` | Sole writer for `settings.recentSurahs`. Pre-fix App.svelte did its |
| `src/configure/state.svelte.ts` | _(no leading comment)_ |
| `src/configure/surah-header-visibility.ts` | Surah header visibility: persisted user preference for whether the in-reader |
| `src/configure/tafsir.ts` | _(no leading comment)_ |
| `src/configure/theme.ts` | Theme management: load and apply user theme preferences. |
| `src/configure/variant-bundle.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Settings shells

The settings overlay is mode-aware. `openSettingsSheet('verse')` renders Verse Settings; `openSettingsSheet('mushaf')` renders Mushaf Settings. The mobile MarginHeader passes the current reader mode directly. `#/settings` is a transient compatibility route: app bootstrap opens the shell inferred from the previous reader hash, then restores that previous hash.

**Mobile + tablet (<1180 px):** the shell takes the full viewport with safe-area padding, a parchment surface, sticky header, scrollable body, and footer controls. Verse and Mushaf settings share the same header, row density, footer, backdrop dismissal, and focus restoration.

**Desktop (≥1180 px):** the shell opens as a right-side reader-adjacent sidebar. Reader content remains visible to the left; the old centered preferences modal is no longer the desktop settings shape.

Shared shell zones:

1. **Header** — title (`Verse Settings` or `Mushaf Settings`), concise subtitle, and close button. Backdrop tap, close, or Esc dismisses and restores focus to the opener unless the footer navigates away.
2. **Body** — mode-specific preview and controls. Rows use stable heights and open the nested asset picker for source/asset choices.
3. **Footer** — shared Theme and Night Mode controls plus a Manage Assets action. Manage Assets closes the shell without focus restore and routes to `#/assets`.

Verse Settings contains:

- **Verse preview** — Arabic sample using the live reader Arabic cascade and optional translation line gated by `settings.translationVisible`.
- **Reading** — Font Size writes through `src/configure/font-size.ts::setFontSize`; Reading Flow writes all four reading typography dimensions through `src/configure/reading-typography.ts::setReadingFlow`.
- **Sources** — Active Riwayah, Quran Text Style, Translation Source, Show Translation, and Tafsir Source. Riwayah changes use the atomic active variant bundle; text style changes require a usable compatible text asset; translation visibility writes through `setTranslationVisible`.

Mushaf Settings contains:

- **Mushaf preview** — an unframed page-like preview, distinct from the Verse typography preview.
- **Mushaf** — Active Riwayah and Mushaf Edition rows. Mushaf edition changes require a usable compatible Mushaf asset and preserve the active text style.

The nested picker is a small dialog within the shell. It lists compatible rows for the active mode, marks the current row, and closes after a successful row choice. Esc closes the shell while no nested picker-specific key trap is active.

Switching riwayah via popover is gated by the variant-asset domain. Qalun is the baseline and remains the active usable riwayah; the runtime key remains `qaloon`. Active recitation state is the atomic bundle `settings.riwayah` + `settings.quranTextStyleId` + `settings.mushafEditionId`, written only by `src/configure/variant-bundle.ts`. A riwayah switch chooses that riwayah's default Quran text style and Mushaf edition, validates both assets are usable, then writes all three keys in one IDB transaction before mutating runes, applying DOM state, emitting `SETTINGS_RIWAYAH_CHANGED`, or broadcasting cross-tab. A rejected switch returns `false` and leaves all three active keys unchanged.

The recitation picker exposes the package state on each row. Installed rows switch immediately. Installable rows show the package byte estimate and start the install flow instead of switching. Installing rows show cached/total progress and disable switching. Unavailable rows are disabled. Error rows offer retry. The current active row remains visibly active until the install verifies and `setRiwayah(requested)` succeeds. The same policy applies to other source rows: selection labels do not move early just because a pack is download-capable.

Package install progress lives outside `settings.riwayah`: `src/configure/state.svelte.ts::riwayahPackageState` holds runtime package status by riwayah, and `riwayahInstallIntent` records the requested optional package plus the previous usable riwayah. Failed installs clear the request or mark an error while preserving both `settings.riwayah` and `previousUsable`.

The old in-panel Storage accordion is no longer mounted in the settings shell. Offline install, verify, set-active, and delete controls move to the dedicated asset-management route.

### Asset Management route

`#/assets` is a real route, but it is excluded from `settings.lastSurface` persistence and launch restore. Direct entry renders a `Back to Reader` link to `#/s/1`; entry from another route can use browser history. On mount the page focuses the `Asset Management` heading so Manage Assets navigation does not restore focus to the settings opener.

Mobile and tablet use a single dense column: sticky Back/Verify header, active variant summary, polite route-level status region, then grouped rows for Quran Text Styles, Mushaf Editions, Translations, and Tafsir. Mobile MarginHeader is hidden on this route so the asset page owns the header chrome. Rows expose status, compatibility reason, size, primary action, and Delete when relevant.

Desktop uses a two-pane operational layout: left section navigation, right grouped asset tables. AmbientDock remains visible. `src/configure/assets/asset-view-model.ts` owns row action labels and blocked-delete copy, including the active optional delete reason `Switch to another compatible asset before deleting.`

Actions:

- Text and Mushaf rows install/delete via concrete variant asset helpers in `src/data/offline.ts`; Set Active writes through `setQuranTextStyleId` or `setMushafEditionId`.
- Translation and tafsir rows install/delete via source asset helpers and set active through their settings writers.
- Shipped rows never show Install. Active rows show Active and block Delete where deletion would remove the active optional asset.

### Pick a translation

Toggle translation-visibility switch → `settings.translationVisible` rune updates → the mounted reader re-renders with translation hidden/shown. Any footnote markers (`[N]`) present in the active pack and any open inline footnote panels disappear with translation. Sticky preview at top of Settings sheet drops translation line in lockstep.

The shipped source index exposes four selectable English sources in this phase: Bridges (default baseline), Saheeh International, The Clear Quran, and M.A.S. Abdel Haleem. Only the default body is present in the baseline manifest; the others are same-origin opt-in dataset packs listed in `indexes/source-assets.json`.

When a non-default translation is selected, Settings pre-flights storage, downloads its pack when Cache Storage is available, saves `settings.translationId`, and the mounted Reader switches to it immediately while staying on the same surah. If storage is insufficient or the pack cannot be fetched, the picker stays open and shows a compact error.

### Pick a tafsir source

The Settings Sources section owns the saved tafsir preference under `settings.tafsirId`. The picker exposes al-Tafsir al-Muyassar (default baseline), al-Mukhtasar fi al-Tafsir, and Tafsir al-Sa'di from the runtime source index. Optional packs are not in the baseline manifest but are present as same-origin opt-in assets. Selecting one pre-flights storage and downloads the pack when Cache Storage is available. If a selected tafsir pack cannot be verified usable, Reader surfaces unavailable/install/switch state or explicitly switches to a verified baseline before baseline tafsir renders.

If an inline tafsir preview or the full tafsir sheet is already open, changing the saved tafsir source from Settings updates that active Reader study view in place.

### Theme swap

Tap theme swatch (Light / Sepia / Dark / Auto) → `settings/theme.js::setTheme` writes `settings.theme` and flips `<html data-theme>`. All surfaces re-theme live. Auto attaches `prefers-color-scheme` listener.

Settings sheet's sticky preview band keeps fixed warm-bronze dark background regardless of chosen theme — constant reference frame, not theme demo. Theme changes still re-paint everything else.

`settings/theme.ts::applyTheme` swaps `<html data-theme>` and writes `<meta name="theme-color">` from live `--qa-surface-app` value, so installed-PWA system chrome (Android Chrome toolbar, iOS standalone status bar fallback) retints with theme instead of staying white.

### Night recitation mode

Independent toggle below theme swatches. Drives `data-night-mode="on"` on `<html>` (sole writer `settings/night-mode.ts`); overlays dim+warm tint via persistent `.qa-night-shift` element (mounted in `App.svelte`, styled in `styles/surfaces/night-shift.css`, `mix-blend-mode: multiply`). Composes with any base theme. Reachable from Appearance row or via global `n` reader shortcut (announced via `a11y/announcer`). Persists in `settings.nightMode` as `'off' | 'on' | 'auto'`; legacy boolean values migrate on load (`true` → `'on'`, `false` → `'off'`).

### About page

Mobile (<1180 px): tap hamburger ≡ → drawer → tap ⓘ icon (or wordmark). Desktop (≥1180 px): tap ⋯ on AmbientDock → drawer → About.

Renders: wordmark, mission, 54:17 Arabic blessing + translation, attribution list, PWA install button (if install prompt captured), version line, **Clear all data** link in footer. About no longer reads mark data or presents removed-scope marks/tags/review stats.

### Install PWA

About with captured install prompt → tap **Install App** → `promptInstall()` runs browser install flow. On accept → button text becomes "Installed!" and disables; `OFFLINE_INSTALL_COMPLETE` fires (no UI listener today).

### Clear all data

`#/about` → scroll to footer → tap **Clear all data** link → confirmation dialog appears.

Dialog copy stays reader-first while accurately covering old local data: saved reading positions, bookmarks, offline downloads, settings, and any older local QuranAtlas data still stored on the device.

Type `DELETE`, tap red **Clear All Data** → `safety/sync.js::suppressNextVersionChange()` arms, then `deleteDB()` runs → DB gone → page reloads → first-run onboarding (A1) starts fresh.

Cancel / Escape → dialog closes, nothing changes.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `settings`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `settings` store body

Single key-value store. Sole writer per **key** discipline (multi-writer leaks closed in `b997c76`).

Keys + sole writers:

| Key | Sole writer | Type |
| --- | --- | --- |
| `theme` | `src/configure/theme.ts` | `'light' \| 'sepia' \| 'dark' \| 'auto'` |
| `nightMode` | `src/configure/night-mode.ts` | `'off' \| 'on' \| 'auto'` |
| `riwayah` | `src/configure/variant-bundle.ts` | `'hafs' \| 'warsh' \| 'qaloon'` |
| `quranTextStyleId` | `src/configure/variant-bundle.ts` | variant id string |
| `mushafEditionId` | `src/configure/variant-bundle.ts` | variant id string |
| `translationId` | `src/configure/panel-bridge.ts` | `string` |
| `tafsirId` | `src/configure/tafsir.ts` | `string` |
| `translationVisible` | `src/configure/panel-bridge.ts` | `boolean` |
| `fontSize` | `src/configure/font-size.ts` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` |
| `lineSpacing` | `src/configure/reading-typography.ts` | step |
| `wordSpacing` | `src/configure/reading-typography.ts` | step |
| `readerMargin` | `src/configure/reading-typography.ts` | step |
| `verseSpacing` | `src/configure/reading-typography.ts` | step |
| `mushafViewMode` | `src/read/mushaf/view-mode.ts` | `'auto' \| 'fit-page' \| 'fit-width'` |
| `surahHeaderHidden` | `src/configure/surah-header-visibility.ts` | `boolean` |
| `currentPosition` | `src/read/state.svelte.ts` (router/scroll-tracker) | `{ surah, verse }` |
| `wirdPlan` | `src/read/wird/store.ts` | `WirdPlan \| null` |
| `lastSurface` | `src/configure/state-last-surface.svelte.ts` | `string` (hash) |
| `recentSurahs` | `src/configure/state-recent-surahs.svelte.ts` | `number[]` |
| `onboardingComplete` | `src/onboard/state.ts` | `boolean` |
| `offlineCategories` | `src/configure/offline-categories.ts` | `OfflineCategoriesState` (source-aware text/pages/search opt-in; legacy audio values are dropped during normalization so removed-scope state does not survive invisibly) |

Riwayah package status and install intent are in-memory runtime state, not `settings` keys. They are intentionally separate from the persisted active bundle so an optional asset can be installable, installing, or errored without becoming rendered content.

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:data-cleared` | `Events.SETTINGS_DATA_CLEARED` | `src/configure/clear-data.ts:170` |
| `settings:recent-surahs-updated` | `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `src/configure/state-recent-surahs.svelte.ts:26` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/configure/riwayah.ts:68`, `src/configure/variant-bundle.ts:66` |
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/configure/Panel.svelte:37` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/configure/Panel.svelte:29` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/configure/reading-typography.ts:133` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **One writer per `settings` key.** Settings is a key-value store, not a record store; the invariant holds at key granularity. The active variant keys (`riwayah`, `quranTextStyleId`, `mushafEditionId`) are intentionally co-owned by `src/configure/variant-bundle.ts` so they can be validated, written, applied, and broadcast as one bundle.
- **Mushaf view mode is owned by the read surface.** The Settings store persists `mushafViewMode`, but the sole writer is `src/read/mushaf/view-mode.ts` because the visible control lives in Mushaf page chrome, not the Settings sheet.
- **Sole writer of `settings.wirdPlan`: `src/read/wird/store.ts`.** The settings store remains key-value; Daily Wird owns only this key and does not change the settings objectStore schema.
- **Settings shell is mode-aware.** Verse Settings may show typography, translation, tafsir, and Quran text-style controls; Mushaf Settings may show Mushaf page source and edition controls. Mushaf Settings must not render Verse typography or Storage rows.
- **Settings shell restores focus on dismissal.** Manage Assets is the exception because it closes the shell and routes away.
- **Verse typography controls use existing sole writers.** Font Size calls `setFontSize`; Reading Flow calls `setReadingFlow` so all reading-flow dimensions remain coordinated.
- **Saved tafsir preference is source metadata, not manifest membership.** Settings can persist an optional tafsir id from `indexes/sources.json`; optional body availability is planned by `indexes/source-assets.json`, and Reader load is responsible for unavailable/install/switch handling when the body fetch fails.
- **Source rows expose install state before activation.** Optional qira'ah/riwayah, translation, tafsir, curated metadata, page, and search/index packs are installable before they are usable. The selected label must not change to a pack that has not verified local install state.
- **Asset management owns offline controls.** The legacy `settings.offlineCategories` normalizer remains for old data, but the mode-aware settings shell does not mount `offline-selector.svelte`.
- **Optional variant assets are usable only after local asset verification.** The active bundle may persist Hafs or Warsh only when both the selected Quran text style and Mushaf edition helpers report usable. Qalun (`qaloon`) availability does not make another riwayah usable.
- **Install intent is not the active bundle.** `riwayahInstallIntent.requested` and `previousUsable` guide install/prompt flows without changing the active variant bundle until `setRiwayah(requested)` succeeds.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (15):**

- `tests/unit/configure/about/About.test.ts`
- `tests/unit/configure/about/pwa-install.test.ts`
- `tests/unit/configure/clear-data-confirm.test.ts`
- `tests/unit/configure/font-size.test.ts`
- `tests/unit/configure/night-mode.test.ts`
- `tests/unit/configure/offline-categories.test.ts`
- `tests/unit/configure/panel.test.ts`
- `tests/unit/configure/reading-typography-line-height.test.ts`
- `tests/unit/configure/reading-typography.test.ts`
- `tests/unit/configure/riwayah.test.ts`
- `tests/unit/configure/state-last-surface.test.ts`
- `tests/unit/configure/state.test.ts`
- `tests/unit/configure/surah-header-visibility.test.ts`
- `tests/unit/configure/theme.test.ts`
- `tests/unit/configure/variant-bundle.test.ts`

**E2E (4):**

- `tests/e2e/configure/about.spec.js`
- `tests/e2e/configure/night-mode.spec.js`
- `tests/e2e/configure/settings.spec.js`
- `tests/e2e/configure/typography.spec.js`
<!-- AUTO-GENERATED:tests END -->
