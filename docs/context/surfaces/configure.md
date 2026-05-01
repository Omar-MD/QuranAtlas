---
surface: configure
src_paths:
  - 'src/settings/**'
  - 'src/about/**'
owns_stores:
  - settings
test_paths:
  unit:
    - 'tests/unit/settings/**'
    - 'tests/unit/about/**'
  e2e:
    - 'tests/e2e/journey-d-settings*.spec.js'
    - 'tests/e2e/journey-g-about*.spec.js'
---

# Surface: configure

> Settings sheet (full-screen mobile + tablet, modal desktop) + About page. Reading section (font size, reading flow), Sources section (recitation = riwayah, translation), **Storage section (per-feature offline opt-in selector — N21)**, Theme footer, night-mode toggle, clear-all-data on About footer. Future absorption: tafsir picker, export/import, clear-cache, audio settings surfaces.

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
| `src/about/About.svelte` | _(no leading comment)_ |
| `src/about/pwa-install.ts` | PWA install prompt management. |
| `src/settings/ClearDataConfirm.svelte` | Focus the input after the DOM updates |
| `src/settings/Panel.svelte` | _(no leading comment)_ |
| `src/settings/audio.ts` | Sole writer for all `settings.audio*` keys. Mirrors the riwayah / theme |
| `src/settings/clear-data.ts` | Clear data: confirmation flow and data deletion. |
| `src/settings/font-size.ts` | Font size preference: persisted in IDB settings store, applied via data-font-size |
| `src/settings/night-mode.ts` | Night recitation mode: dim+warm overlay, composes over any theme. |
| `src/settings/offline-categories.ts` | Offline categories preference: per-feature opt-in for the offline selector. |
| `src/settings/panel-bridge.ts` | Settings Panel — overlay bridge + sole-writer/-reader data functions. |
| `src/settings/reading-typography.ts` | Reading typography preferences: line spacing, word spacing, reader margin. |
| `src/settings/riwayah.ts` | Riwayah preference: which Qur'anic transmission the reader displays. |
| `src/settings/surah-header-visibility.ts` | Surah header visibility: persisted user preference for whether the in-reader |
| `src/settings/theme.ts` | Theme management: load and apply user theme preferences. |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Settings sheet — v7 polish redesign 2026-04-29

**Mobile + tablet (<1180 px):** single-tap gear → Settings sheet takes over full viewport (`inset: 0`, safe-area insets all four edges, no border). Portrait: preview → body → footer. Landscape (`max-height ≤540 px and orientation: landscape`): side-by-side grid — preview = left rail (full height with theme-true bg), body + footer stack on right column with own scroll.

**Desktop (≥1180 px):** `#/settings` (e.g. via `G`+`P` or command-sheet "Preferences") opens as centered modal (~440 px, max-height 720 px). Same component, narrower frame.

Three zones (no scroll under default content):

1. **Live preview band** at top — theme-true colors. Sūrat ar-Raḥmān 1–4 in active riwayah's glyphs. Arabic uses `.qa-verse-arabic`, translation uses `.qa-verse-translation` — same cascade as reader (font-size, line-height, word-spacing all match exactly). Translation row always rendered; visibility gated on `settings.translationVisible` — row keeps layout space when toggled off, preview height does not shift on toggle. ✕ close button floats top-right inside band.
2. **Body** — two sections, each `flex: 1` (balanced). Soft hairline gold-fade separator between them.
   - **Reading** — Font size slider (5-step) + Reading flow slider (5-step coordinated knob). Reset-to-default pill in section header right edge, **always rendered** (disabled = idle when both knobs at `md`); flipping in/out of default never reflows slider rows. Preview band hard-locked at 42dvh portrait / 38dvh landscape / 240 px desktop modal — inner stage scrolls when verse content overflows.
   - **Sources** — Recitation source row (`[data-testid="src-row-recitation"]`) showing `RECITATION · Qālūn ʿan Nāfiʿ ›`; Translation dual-action row showing `TRANSLATION · Saheeh International › [toggle]`. Tapping source row opens centered picker popover. Toggle on Translation row controls `settings.translationVisible` independently.
3. **Theme footer** — pill cluster of 4 theme swatches with mini Mushaf glyphs in each theme's palette + 38 px **night-mode moon ☾** pill. Italic serif "Theme" label anchors cluster left.

Every change updates live preview (font size, reading flow, theme palette, riwayah glyph swap when popover row picked).

Switching riwayah via popover emits `SETTINGS_RIWAYAH_CHANGED`, broadcasts cross-tab via `safety/sync.ts::broadcastRiwayahChange`, re-renders reader with new Riwayah's text + font + line-height floor.

### Storage section — offline-selector (N21, 2026-05-01)

Mounted between Sources and the Theme footer. Renders four accordion rows (`<details>` semantics) — Text, Audio (gated v2.0), Pages (gated v2.1), Search (gated v1.1). Available rows expand on tap to reveal a "Cache for offline use" checkbox + per-category byte size sourced from the verified manifest's `fileSizes` map. Footer shows live `usage / quota` from `navigator.storage.estimate()` and an Apply button.

Apply gating:
- Disabled when no diff vs `settings.offlineCategories`.
- Disabled with a red "Need X MB more free space" message when sum-of-newly-checked exceeds available quota (audit Q4 — pre-flight refuse).
- On click: writes `settings.offlineCategories` via `settings/offline-categories.ts::setOfflineCategories` (sole writer), then per-category `src/data/offline.ts::startCategoryDownload(cat)` for each available category.

Selector v1 commits additions only — uncheck + Apply records the new state but does not evict cache contents (eviction UX is a follow-up). Cache wins from prior precache passes are honored: SHA-256 verify on cached entries skips re-download for unchanged files. Closes audit P2.14 / R-11 / C-4 / CC-7.

**Picker popover** (`[data-testid="settings-pop"]`): blurred + tinted scrim, parchment-gradient surface on light themes / deep-ink gradient on dark, gold hairline corner ornaments, italic serif "Choose a {Riwāyah / translation}" title + uppercase eyebrow key. Each row: name + italic sub-meta + opacity-0 gold check badge that lights when active. Hover/focus tints background. Backdrop tap, Esc, or row-tap dismisses. With popover open, Esc closes popover first; second Esc closes sheet.

Dismissal: ✕ close button (inside preview), backdrop tap, Esc.

### Pick a translation

Single shipped pack today (Saheeh International, default since 2026-04-27). Picker hidden — row shows toggle + subtitle only. When second pack lands, picker UI returns (deferred per `future-work.md` §Translation packs §Translation picker UI · M5).

Toggle translation-visibility switch → `settings.translationVisible` rune updates → reader's `$effect` on rune re-renders with translation hidden/shown. Footnote markers (`[N]`) and any open inline footnote panels disappear with translation. Sticky preview at top of Settings sheet drops translation line in lockstep.

### Theme swap

Tap theme swatch (Light / Sepia / Dark / Auto) → `settings/theme.js::setTheme` writes `settings.theme` and flips `<html data-theme>`. All surfaces re-theme live. Auto attaches `prefers-color-scheme` listener.

Settings sheet's sticky preview band keeps fixed warm-bronze dark background regardless of chosen theme — constant reference frame, not theme demo. Theme changes still re-paint everything else.

`settings/theme.ts::applyTheme` swaps `<html data-theme>` and writes `<meta name="theme-color">` from live `--qa-surface-app` value, so installed-PWA system chrome (Android Chrome toolbar, iOS standalone status bar fallback) retints with theme instead of staying white.

### Night recitation mode

Independent toggle below theme swatches. Drives `data-night-mode="on"` on `<html>` (sole writer `settings/night-mode.ts`); overlays dim+warm tint via persistent `.qa-night-shift` element (mounted in `App.svelte`, styled in `styles/surfaces/night-shift.css`, `mix-blend-mode: multiply`). Composes with any base theme. Reachable from Appearance row or via global `n` reader shortcut (announced via `a11y/announcer`). Persists in `settings.nightMode` (boolean).

### About page

Mobile (<1180 px): tap hamburger ≡ → drawer → tap ⓘ icon (or wordmark). Desktop (≥1180 px): tap ⋯ on AmbientDock → drawer → About.

Renders: wordmark, mission, 54:17 Arabic blessing + translation, 2×2 stat grid (Marks / Tags / Surahs / % Qur'an), attribution list, PWA install button (if install prompt captured), version line, **Clear all data** link in footer.

### Install PWA

About with captured install prompt → tap **Install App** → `promptInstall()` runs browser install flow. On accept → button text becomes "Installed!" and disables; `OFFLINE_INSTALL_COMPLETE` fires (no UI listener today).

### Clear all data (D4 — moved to About footer 2026-04-25)

`#/about` → scroll to footer → tap **Clear all data** link → confirmation dialog appears.

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
| `theme` | `src/settings/theme.ts` | `'light' \| 'sepia' \| 'dark' \| 'auto'` |
| `nightMode` | `src/settings/night-mode.ts` | `boolean` |
| `riwayah` | `src/settings/riwayah.ts` | `'hafs' \| 'warsh' \| 'qaloon'` |
| `translationId` | `src/settings/panel-bridge.ts` | `string` |
| `translationVisible` | `src/settings/panel-bridge.ts` | `boolean` |
| `fontSize` | `src/settings/font-size.ts` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` |
| `lineSpacing` | `src/settings/reading-typography.ts` | step |
| `wordSpacing` | `src/settings/reading-typography.ts` | step |
| `readerMargin` | `src/settings/reading-typography.ts` | step |
| `verseSpacing` | `src/settings/reading-typography.ts` | step |
| `surahHeaderHidden` | `src/settings/surah-header-visibility.ts` | `boolean` |
| `currentPosition` | `src/state/reader.svelte.ts` (router/scroll-tracker) | `{ surah, verse }` |
| `lastSurface` | `src/state/last-surface.svelte.ts` | `string` (hash) |
| `recentSurahs` | `src/state/recent-surahs.svelte.ts` | `number[]` (serialised, see `b997c76`) |
| `onboardingComplete` | `src/onboarding/state.ts` | `boolean` |
| `offlineCategories` | `src/settings/offline-categories.ts` | `OfflineCategoriesState` (per-category opt-in map; see `state/settings.svelte.ts`) |

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:data-cleared` | `Events.SETTINGS_DATA_CLEARED` | `src/settings/clear-data.ts:170` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/settings/riwayah.ts:58`, `src/settings/riwayah.ts:74` |
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/settings/Panel.svelte:130` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/settings/Panel.svelte:113` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/settings/reading-typography.ts:133` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **One writer per `settings` key.** Settings is a key-value store, not a record store; the invariant holds at key granularity. Multi-writer leaks were closed in `b997c76` (`R-08, R-25, R-27, C-9`).
- **Settings sheet sticky preview band keeps fixed warm-bronze dark bg regardless of theme.** Constant reference frame — do not retint with active theme.
- **Reset-to-default pill always rendered.** Disabled when both Reading-section knobs at `md`. Flipping in/out of default never reflows the slider rows (regression guard in `tests/unit/settings/panel.test.ts`).
- **Settings sheet body is now three sections: Reading + Sources + Storage (N21).** Storage section sits between Sources and the Theme footer. Order is regression-guarded in `tests/unit/settings/panel.test.ts`.
- **Sole writer of `settings.offlineCategories`: `src/settings/offline-categories.ts`** — the selector calls `setOfflineCategories(next)` and never writes IDB raw.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (11):**

- `tests/unit/about/pwa-install.test.ts`
- `tests/unit/settings/clear-data-confirm.test.ts`
- `tests/unit/settings/font-size.test.ts`
- `tests/unit/settings/night-mode.test.ts`
- `tests/unit/settings/offline-categories.test.ts`
- `tests/unit/settings/panel.test.ts`
- `tests/unit/settings/reading-typography-line-height.test.ts`
- `tests/unit/settings/reading-typography.test.ts`
- `tests/unit/settings/riwayah.test.ts`
- `tests/unit/settings/surah-header-visibility.test.ts`
- `tests/unit/settings/theme.test.ts`

**E2E (2):**

- `tests/e2e/journey-d-settings.spec.js`
- `tests/e2e/journey-g-about.spec.js`
<!-- AUTO-GENERATED:tests END -->

## Deprecated

- **2026-04-29 (`0622496`):** Settings sheet pre-v7 layout retired (Reading / Appearance / Recitation three-section). Replaced by balanced two-section body + footer rail + tap-to-popover source pickers.
- **2026-04-25 (`0890a53`):** Clear-data row moved off Settings sheet bottom row, onto About footer.
- **2026-04-25:** Typography subview retired — sliders inlined into Settings Reading section (D5).
- **2026-04-27 (`248b927`):** font picker dropped — KFGQPC default per Riwayah is now hardwired (no user-facing font picker).
- **2026-05-01 (N21):** single full-corpus "Cache for offline" UX retired. Replaced by per-feature offline-selector mounted in the new Storage section. Pre-N21 `src/data/offline.ts::startDownload` retained as a backward-compatible alias for `startCategoryDownload('text')`.
