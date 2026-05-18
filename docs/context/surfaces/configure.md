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

> Settings sheet and About page for Reader First preferences: theme, typography, qira'ah/riwayah source, translation, tafsir, curated metadata/storage packs, offline install state, night mode, and clear-all-data. Pack-state policy now lives in `src/packs/**`; configure consumes those APIs and only changes active source settings once a pack is verified usable or explicitly switched back to the verified baseline. Audio is removed product scope pending source cleanup.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Settings gear ⚙ on MarginHeader (mobile) | single tap | open Settings sheet (full viewport) |
| Settings gear double-tap (mobile, ≤300 ms) | gesture | cycle theme without opening sheet |
| `G` then `P` (desktop) | keyboard | `#/settings` → Settings modal |
| `⌘K` → "Preferences" → Enter | keyboard | `#/settings` |
| Drawer header ⓘ icon | tap | `#/about` |
| AmbientDock ⋯ → drawer → About | tap | `#/about` |
| `⌘↑` / `Ctrl+↑` | keyboard | bump font size up (works outside the sheet; guarded against focused inputs) |
| `⌘↓` / `Ctrl+↓` | keyboard | bump font size down |
| `t` (reader) | keyboard | toggle `translationVisible` |
| `n` (reader) | keyboard | toggle night-mode |
| `d` (reader) | keyboard | cycle theme |
| About footer "Clear all data" link | tap | confirmation dialog |

Routes: `#/settings` (desktop), `#/about` (all viewports).

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/configure/ClearDataConfirm.svelte` | Focus the input after the DOM updates |
| `src/configure/Panel.svelte` | _(no leading comment)_ |
| `src/configure/about/About.svelte` | _(no leading comment)_ |
| `src/configure/about/pwa-install.ts` | PWA install prompt management. |
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
| `src/configure/state-last-surface.svelte.ts` | _(no leading comment)_ |
| `src/configure/state-recent-surahs.svelte.ts` | Sole writer for `settings.recentSurahs`. Pre-fix App.svelte did its |
| `src/configure/state.svelte.ts` | _(no leading comment)_ |
| `src/configure/surah-header-visibility.ts` | Surah header visibility: persisted user preference for whether the in-reader |
| `src/configure/tafsir.ts` | _(no leading comment)_ |
| `src/configure/theme.ts` | Theme management: load and apply user theme preferences. |
| `src/configure/variant-bundle.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Settings sheet

**Mobile + tablet (<1180 px):** single-tap gear → Settings sheet takes over full viewport (`inset: 0`, safe-area insets all four edges, no border). Portrait: preview → body → footer. Landscape (`max-height ≤540 px and orientation: landscape`): side-by-side grid — preview = left rail (full height with theme-true bg), body + footer stack on right column with own scroll.

**Desktop (≥1180 px):** `#/settings` (e.g. via `G`+`P` or command-sheet "Preferences") opens as centered modal (~440 px, max-height 720 px). Same component, narrower frame.

Three zones:

1. **Live preview band** at top — theme-true colors. Sūrat ar-Raḥmān 1–4 in active riwayah's glyphs. Arabic uses `.qa-verse-arabic`, translation uses `.qa-verse-translation` — same cascade as reader (font-size, line-height, word-spacing all match exactly). Translation row always rendered; visibility gated on `settings.translationVisible` — row keeps layout space when toggled off, preview height does not shift on toggle. ✕ close button floats top-right inside band.
2. **Body** — three sections (Reading + Sources + Storage), content-sized (`flex: 0 0 auto`) with soft hairline gold-fade separator between adjacent sections. Body scrolls vertically when content overflows the available space (no per-section stretch).
   - **Reading** — Font size slider (5-step) + Reading flow slider (5-step coordinated knob). Reset-to-default pill in section header right edge, **always rendered** (disabled = idle when both knobs at `md`); flipping in/out of default never reflows slider rows. Preview band hard-locked at 32dvh portrait / 180 px desktop modal, with a shorter portrait cap on low-height phones and the side-by-side landscape override — inner stage scrolls when verse content overflows.
   - **Sources** — Qira'ah/riwayah source row (`[data-testid="src-row-recitation"]` may remain as a runtime/test id) showing `QIRA'AH/RIWAYAH · Qalun ʿan Nafiʿ ›`; Translation dual-action row showing `TRANSLATION · {selected source} › [toggle]`; Tafsir source row (`[data-testid="src-row-tafsir"]`) showing `TAFSIR · {selected source} ›`; curated metadata/storage pack state when present. Tapping a source row opens the centered picker popover. The Translation row's toggle still controls `settings.translationVisible` independently, and source/toggle changes must propagate to the mounted Reader without requiring a route reload.
3. **Theme footer** — pill cluster of 4 theme swatches with mini Mushaf glyphs in each theme's palette + 38 px **night-mode moon ☾** pill. Italic serif "Theme" label anchors cluster left.

Every change updates live preview (font size, reading flow, theme palette, riwayah glyph swap when popover row picked).

Switching riwayah via popover is gated by the variant-asset domain. Qalun is the baseline and remains the active usable riwayah; the runtime key remains `qaloon`. Active recitation state is the atomic bundle `settings.riwayah` + `settings.quranTextStyleId` + `settings.mushafEditionId`, written only by `src/configure/variant-bundle.ts`. A riwayah switch chooses that riwayah's default Quran text style and Mushaf edition, validates both assets are usable, then writes all three keys in one IDB transaction before mutating runes, applying DOM state, emitting `SETTINGS_RIWAYAH_CHANGED`, or broadcasting cross-tab. A rejected switch returns `false` and leaves all three active keys unchanged.

The recitation picker exposes the package state on each row. Installed rows switch immediately. Installable rows show the package byte estimate and start the install flow instead of switching. Installing rows show cached/total progress and disable switching. Unavailable rows are disabled. Error rows offer retry. The current active row remains visibly active until the install verifies and `setRiwayah(requested)` succeeds. The same policy applies to other source rows: selection labels do not move early just because a pack is download-capable.

Package install progress lives outside `settings.riwayah`: `src/configure/state.svelte.ts::riwayahPackageState` holds runtime package status by riwayah, and `riwayahInstallIntent` records the requested optional package plus the previous usable riwayah. Failed installs clear the request or mark an error while preserving both `settings.riwayah` and `previousUsable`.

### Storage section — offline-selector

Mounted between Sources and the Theme footer as a single collapsible accordion (default closed). Header summary shows either `Cache content for offline use ›` (none cached) or `N cached ›` (gold accent). Tap-to-expand reveals the active reader-first rows: Text, Pages, Search, plus source-aware optional pack rows. Legacy removed-scope media opt-ins are dropped during normalization so hidden state does not linger once the rows are gone. Available rows show byte size + checkbox; gated rows show their version label only. The Pages row opens into per-riwayah page-pack controls for available Mushaf page packs plus any previously checked stale opt-ins. A source-aware list under the rows exposes translation and tafsir packs so users can keep or remove individual optional text packs from cache. Footer underneath has live `usage / quota` from `navigator.storage.estimate()` plus an Apply CTA.

The Text row represents the baseline reader source set: Qalun Arabic (runtime key `qaloon`), Bridges translation, Tafsir Muyassar data, and shipped Knowledge Lane context. Optional translation and tafsir rows use `public/dataset/indexes/source-assets.json` for byte estimates and same-origin file plans without adding those bodies to the baseline manifest. The selector writes source-aware state under `settings.offlineCategories.text.{riwayat,translations,tafsir}` and per-riwayah page state under `settings.offlineCategories.pages.{riwayah}`; knowledge has no separate persisted toggle in this phase because it is bundled into the Text download plan when present in `manifest.json`.

Storage also lists riwayah package entries. Each package row plans text plus page bytes from `indexes/riwayah-packages.json`, installs optional Hafs/Warsh directly, and removes optional installed packages directly. Removing an active optional riwayah first switches to verified Qalun (`qaloon`); if Qalun (`qaloon`) cannot be verified usable, removal is refused and the cached package is left intact.

Expand/collapse animates via CSS `grid-template-rows: 0fr → 1fr` so the panel doesn't measure heights in JS — the Theme footer's bounding box stays put on toggle (no rebound). Inside the body's scroll region; long expansion just adds scrollable content, no chrome reflow.

Apply gating:
- Disabled when no diff vs `settings.offlineCategories`.
- Disabled with a red "Need X MB more free space" message when sum-of-newly-checked exceeds available quota (audit Q4 — pre-flight refuse).
- On click: downloads newly checked category/source/page plans, removes unchecked cached source/category/page plans, then writes `settings.offlineCategories` via `settings/offline-categories.ts::setOfflineCategories` (sole writer). Button flips to a solid gold `Saved ✓` for ~1.5 s after a successful write so the user has visible confirmation.

Uncheck + Apply removes the matching cached URLs when Cache Storage is available. Cache wins from prior precache passes are honored by network/cache strategy on subsequent reads.

**Picker popover** (`[data-testid="settings-pop"]`): blurred + tinted scrim, parchment-gradient surface on light themes / deep-ink gradient on dark, gold hairline corner ornaments, italic serif "Choose a {Riwāyah / translation / tafsir}" title + uppercase eyebrow key. Each row: name + italic sub-meta when available + opacity-0 gold check badge that lights when active. Hover/focus tints background. Backdrop tap, Esc, or row-tap dismisses. With popover open, Esc closes popover first; second Esc closes sheet.

Dismissal: ✕ close button (inside preview), backdrop tap, Esc.

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
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/configure/Panel.svelte:195` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/configure/Panel.svelte:178` |
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
- **Settings sheet sticky preview band keeps fixed warm-bronze dark bg regardless of theme.** Constant reference frame — do not retint with active theme.
- **Reset-to-default pill always rendered.** Disabled when both Reading-section knobs at `md`. Flipping in/out of default never reflows the slider rows (regression guard in `tests/unit/configure/panel.test.ts`).
- **Settings sheet body is three sections: Reading + Sources + Storage.** Storage section sits between Sources and the Theme footer. Order is regression-guarded in `tests/unit/configure/panel.test.ts`.
- **Saved tafsir preference is source metadata, not manifest membership.** Settings can persist an optional tafsir id from `indexes/sources.json`; optional body availability is planned by `indexes/source-assets.json`, and Reader load is responsible for unavailable/install/switch handling when the body fetch fails.
- **Source rows expose install state before activation.** Optional qira'ah/riwayah, translation, tafsir, curated metadata, page, and search/index packs are installable before they are usable. The selected label must not change to a pack that has not verified local install state.
- **Sole writer of `settings.offlineCategories`: `src/configure/offline-categories.ts`** — the selector calls `setOfflineCategories(next)` and never writes IDB raw.
- **Text offline opt-in remains source-aware.** The visible Text checkbox maps to the baseline Qalun + Bridges + Muyassar set and also caches `text-knowledge` manifest entries when they exist. Optional translation and tafsir rows are controlled by `settings.offlineCategories.text.translations` / `.tafsir` and planned from `indexes/source-assets.json`, not from the baseline manifest.
- **Pages offline opt-in is per-riwayah.** The selector stores Qalun/Hafs/Warsh page choices under `settings.offlineCategories.pages`; `src/configure/offline-categories.ts`, the sole writer, normalizes the legacy `{ _all: true }` shape to `{ qaloon: true }`. Page apply actions call page-specific cache helpers instead of the generic category download path.
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
