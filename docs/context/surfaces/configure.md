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
style_paths:
  - 'src/styles/surfaces/configure/**'
  - 'src/styles/surfaces/overlays/night-shift.css'
---

# Surface: configure

> Mode-aware Verse Settings, Mushaf Settings, inline read-only asset inventory, and About page for Reader First preferences: theme, night mode, typography, translation visibility, Mushaf view mode, and clear-all-data. The current MVP has one default reader profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation. Source pickers, tafsir choices, and optional-pack controls are future work.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Settings gear ⚙ on MarginHeader (mobile) | single tap | open Verse Settings on `#/s/*`, Mushaf Settings on `#/m/*` |
| Settings gear double-tap (mobile, ≤300 ms) | gesture | cycle theme without opening sheet |
| Included assets in Settings | view | show the default Qaloon + Bridges inventory inline inside the settings shell |
| Storage/quota banner CTA | tap | open Settings via the legacy `#/assets` compatibility hash |
| Missing reader asset prompt | tap | open Settings via the legacy `#/assets` compatibility hash |
| Drawer header ⓘ icon | tap | `#/about` |
| AmbientDock ⋯ → drawer → About | tap | `#/about` |
| `⌘↑` / `Ctrl+↑` | keyboard | bump font size up (works outside the sheet; guarded against focused inputs) |
| `⌘↓` / `Ctrl+↓` | keyboard | bump font size down |
| `t` (reader) | keyboard | toggle `translationVisible` |
| `n` (reader) | keyboard | toggle night-mode |
| `d` (reader) | keyboard | cycle theme |
| About footer "Clear all data" link | tap | confirmation dialog |

Routes: `#/settings` (transient settings opener), `#/assets` (legacy compatibility opener for Settings), `#/about` (all viewports).

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
| `src/configure/theme.ts` | Theme management: load and apply user theme preferences. |
| `src/configure/variant-bundle.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Settings shells

The settings overlay is mode-aware. `openSettingsSheet('verse')` renders Verse Settings; `openSettingsSheet('mushaf')` renders Mushaf Settings. The mobile MarginHeader passes the current reader mode directly. `#/settings` is a transient compatibility route: app bootstrap opens the shell inferred from the previous reader hash, then restores that previous hash.

**Mobile (<768 px):** the shell takes the full viewport with safe-area padding, a parchment surface, sticky header, fitted body, and footer controls. Verse and Mushaf settings share the same header, row density, footer, backdrop dismissal, and focus restoration.

**Tablet + desktop (≥768 px):** the shell opens as a compact right-side reader-adjacent column bar. Reader content remains visible to the left; the old centered preferences modal and wide tablet sheet are no longer the settings shape.

Shared shell zones:

1. **Header** — constant `Settings` title, concise reader-profile subtitle, and close button. Backdrop tap, close, or Esc dismisses and restores focus to the opener unless the footer navigates away.
2. **Body** — reader-mode toggle, mode-specific Verse or Mushaf controls, and the inline included-assets inventory. Rows use stable heights and avoid source-picker affordances in the current MVP.
3. **Footer** — shared Theme and Night Mode controls.

Equivalent settings rows now share a hyphenated row grammar across Verse, Mushaf, and nested picker states: `qa-settings-row`, `qa-settings-row-label`, `qa-settings-row-control`, `qa-settings-row-meta`, plus state modifiers such as `qa-settings-row--active`, `qa-settings-row--disabled`, `qa-settings-row--picker`, `qa-settings-row--slider`, and `qa-settings-row--switch`. Variant-specific classes remain only where the control family genuinely differs.

Verse Settings contains:

- **Verse preview** — Arabic sample using the live reader Arabic cascade and optional translation line gated by `settings.translationVisible`.
- **Reading** — Font Size writes through `src/configure/font-size.ts::setFontSize`; Reading Flow writes all four reading typography dimensions through `src/configure/reading-typography.ts::setReadingFlow`.
- **Translation** — Bridges visibility switch. Translation visibility writes through `setTranslationVisible`.
- **Included assets** — read-only summary of the included Qaloon Text + Font, Qaloon Mushaf, and Bridges Translation profile.

Mushaf Settings contains:

- **Mushaf preview** — an unframed page-like preview, distinct from the Verse typography preview.
- **Mushaf** — Mushaf view mode only. The active edition is fixed to the included Qaloon Mushaf.

The nested source picker is not mounted in the current MVP. Switching riwayah, text style, translation source, tafsir source, or Mushaf edition is deferred until the multiple-profile contract returns. Active recitation state still persists as the atomic bundle `settings.riwayah` + `settings.quranTextStyleId` + `settings.mushafEditionId`, written only by `src/configure/variant-bundle.ts`, but the only valid current values are the default Qaloon profile.

The old in-panel Storage accordion is no longer mounted in the settings shell. Offline install, verify, set-active, and delete controls are not exposed in the current MVP.

During the React dual-build parity track, `src-react/app/App.tsx` treats `#/settings` as the same transient opener: it resolves the previous persisted reader hash, restores that hash with `history.replaceState`, keeps the reader mounted behind the shell, and passes the current reader mode into `src-react/app/routes/settings/SettingsRoute.tsx`. React reader chrome opens Settings through a local overlay event instead of mutating `window.location.hash`, so entering Settings from a scrolled Verse or Mushaf reader keeps the current route DOM and scroll position intact. The Settings reader-mode toggle uses the mounted Verse DOM's live visible `data-token-key` before falling back to the route ayah, then carries that exact verse hash back when toggling Mushaf to Verse inside the same shell. React also treats legacy `#/assets` URLs as settings-shell compatibility openers instead of mounting a standalone Assets page. React settings writes theme, night mode, translation visibility, typography, and Mushaf view mode through `src-react/storage/settings-writer.ts` using the shared v7 `settings` store keys and the Svelte-compatible Mushaf view-mode values (`auto`, `fit-page`, `fit-width`). React emits a local reader-preferences event after settings writes so mounted Verse and Mushaf reader routes apply presentation changes without requiring a route remount or verse-corpus refetch. React intentionally omits the Verse and Mushaf preview panels; the body is a single constant `Settings` view with a reader-mode toggle and a fixed-height mode-control area so switching Verse/Mushaf does not move the asset inventory or footer. Verse mode exposes font size, reading flow, and Bridges translation visibility; Reading Flow uses the owned React `Select` primitive whose portal content is layered above the settings shell. Mushaf mode exposes only Page/Width view controls; `auto` remains accepted as stored/runtime state but is not offered in Settings. The React footer contains Theme and Night Mode controls only; there is no Manage Assets route action.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| `src/styles/surfaces/configure/about.css` | About/configure styles moved from flat surfaces. |
| `src/styles/surfaces/configure/asset-management.css` | Asset management styles moved from flat surfaces. |
| `src/styles/surfaces/configure/settings-shell.css` | Settings shell styles moved from flat surfaces. |
| `src/styles/surfaces/overlays/night-shift.css` | Night-shift overlay styles moved from flat surfaces. |
<!-- AUTO-GENERATED:style-inventory END -->

### Inline asset inventory

The current MVP does not present a standalone asset-management page in the React shell. `#/assets` is retained as a compatibility hash for older links and opens the settings shell over the previous reader route.

Mobile and tablet use the settings sheet body for a single dense inventory: Qaloon Text + Font, Qaloon Mushaf, and Bridges Translation. Inventory rows expose asset identity, included status, and a quiet chevron affordance without install, verify, set-active, switch, retry, or delete actions.

Desktop uses the same read-only inventory inside the right-side settings sidebar. There are no Install, Verify, Set Active, Switch, Retry, or Delete actions in the current MVP.

### Pick a translation

Toggle translation-visibility switch → `settings.translationVisible` rune updates → the mounted reader re-renders with translation hidden/shown. Any footnote markers (`[N]`) present in the active pack and any open inline footnote panels disappear with translation. Sticky preview at top of Settings sheet drops translation line in lockstep.

The current source index exposes Bridges as the only MVP translation. Non-default translation install/activation is future multiple-profile work.

### Tafsir sources

Tafsir source selection and reader tafsir UI are not current MVP behavior. Old `settings.tafsirId` values are cleared by the MVP launch reset.

### Theme swap

Tap theme swatch (Light / Sepia / Dark / Auto) → `settings/theme.js::setTheme` writes `settings.theme` and flips `<html data-theme>`. All surfaces re-theme live. Auto attaches `prefers-color-scheme` listener.

Settings sheet's sticky preview band keeps fixed warm-bronze dark background regardless of chosen theme — constant reference frame, not theme demo. Theme changes still re-paint everything else.

`settings/theme.ts::applyTheme` swaps `<html data-theme>` and writes `<meta name="theme-color">` from live `--qa-surface-app` value, so installed-PWA system chrome (Android Chrome toolbar, iOS standalone status bar fallback) retints with theme instead of staying white.

### Night recitation mode

Independent toggle below theme swatches. Drives `data-night-mode="on"` on `<html>` (sole writer `settings/night-mode.ts`); overlays dim+warm tint via persistent `.qa-night-shift` element (mounted in `App.svelte`, styled in `styles/surfaces/night-shift.css`, `mix-blend-mode: multiply`). Composes with any base theme. Reachable from Appearance row or via global `n` reader shortcut (announced via `a11y/announcer`). Persists in `settings.nightMode` as `'off' | 'on' | 'auto'`; legacy boolean values migrate on load (`true` → `'on'`, `false` → `'off'`).

### About page

Mobile (<1180 px): tap hamburger ≡ → drawer → tap ⓘ icon (or wordmark). Desktop (≥1180 px): tap ⋯ on AmbientDock → drawer → About.

Renders: wordmark, mission, 54:17 Arabic blessing + translation, attribution list, PWA install button (if install prompt captured), version line, **Clear all data** link in footer. About no longer reads mark data or presents removed-scope marks/tags/review stats.

During the React dual-build parity track, `src-react/app/routes/settings/AboutRoute.tsx` carries the same mission, 54:17 blessing, attribution list, version line, prompt-gated install affordance, and clear-data confirmation contract. It removes the former React preview claim that search, bookmarks, and Daily Wird were all verified shipped workflows.

### Install PWA

About with captured install prompt → tap **Install App** → `promptInstall()` runs browser install flow. On accept → button text becomes "Installed!" and disables; `OFFLINE_INSTALL_COMPLETE` fires (no UI listener today).

### Clear all data

`#/about` → scroll to footer → tap **Clear all data** link → confirmation dialog appears.

Dialog copy stays reader-first while accurately covering old local data: saved reading positions, bookmarks, offline downloads, settings, and any older local QuranAtlas data still stored on the device.

Type `DELETE`, tap red **Clear All Data** → `safety/sync.js::suppressNextVersionChange()` arms, then `deleteDB()` runs → DB gone → page reloads → launch splash applies the default profile and opens the reader.

Cancel / Escape → dialog closes, nothing changes.

React proof-only clear data uses `src-react/app/routes/settings/useClearDataDialog.ts` plus `src-react/storage/clear-data.ts` behind the owned React `Dialog` primitive. The dialog requires exact `DELETE`, supports Cancel/Escape through the primitive, clears Cache Storage and the shared `quran-atlas` IndexedDB database, then reloads at the root so the current MVP launch path reseeds the default profile.

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
| `riwayah` | `src/configure/variant-bundle.ts` | `'qaloon'` |
| `quranTextStyleId` | `src/configure/variant-bundle.ts` | variant id string |
| `mushafEditionId` | `src/configure/variant-bundle.ts` | variant id string |
| `translationId` | `src/configure/panel-bridge.ts` | `string` |
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

Legacy riwayah package status and install intent are not current MVP settings. Optional asset lifecycle state returns only with future multiple-profile work.

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:data-cleared` | `Events.SETTINGS_DATA_CLEARED` | `src/configure/clear-data.ts:170` |
| `settings:recent-surahs-updated` | `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `src/configure/state-recent-surahs.svelte.ts:26` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/configure/riwayah.ts:63`, `src/configure/variant-bundle.ts:66` |
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/configure/Panel.svelte:33` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/configure/Panel.svelte:25` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/configure/reading-typography.ts:132` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **One writer per `settings` key.** Settings is a key-value store, not a record store; the invariant holds at key granularity. The active variant keys (`riwayah`, `quranTextStyleId`, `mushafEditionId`) are intentionally co-owned by `src/configure/variant-bundle.ts` so they can be validated, written, applied, and broadcast as one bundle.
- **Mushaf view mode is owned by the read surface.** The Settings store persists `mushafViewMode`, but the sole writer is `src/read/mushaf/view-mode.ts` because the visible control lives in Mushaf page chrome, not the Settings sheet.
- **Sole writer of `settings.wirdPlan`: `src/read/wird/store.ts`.** The settings store remains key-value; Daily Wird owns only this key and does not change the settings objectStore schema.
- **Settings shell is mode-aware.** Verse Settings may show typography and translation visibility; Mushaf Settings may show Mushaf view mode. Neither shell renders source pickers or Storage rows.
- **Settings shell restores focus on dismissal.** Asset inventory is inline and does not route away from the shell.
- **Verse typography controls use existing sole writers.** Font Size calls `setFontSize`; Reading Flow calls `setReadingFlow` so all reading-flow dimensions remain coordinated.
- **No saved tafsir preference in MVP.** Old `settings.tafsirId` values are unsupported local data and are cleared by the launch reset.
- **No source rows in MVP.** Optional qira'ah/riwayah, translation, tafsir, curated metadata, page, and search/index packs are future multiple-profile work.
- **Inline asset inventory is read-only.** The legacy `settings.offlineCategories` normalizer remains for old data, but the mode-aware settings shell does not mount `offline-selector.svelte`.
- **Default variant assets are the only usable MVP assets.** The active bundle may persist only Qaloon text/font and Qaloon Mushaf.

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
