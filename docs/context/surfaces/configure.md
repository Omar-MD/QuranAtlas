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

> Settings sheet (full-screen mobile + tablet, modal desktop) + About page. Reading section (font size, reading flow), Sources section (recitation = riwayah, translation, tafsir), Storage section (per-feature offline opt-in selector), Theme footer, night-mode toggle, clear-all-data on About footer.

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
| `src/configure/audio.ts` | Sole writer for all `settings.audio*` keys. Mirrors the riwayah / theme |
| `src/configure/clear-data.ts` | Clear data: confirmation flow and data deletion. |
| `src/configure/font-size.ts` | Font size preference: persisted in IDB settings store, applied via data-font-size |
| `src/configure/night-mode.ts` | Night recitation mode: dim+warm overlay, composes over any theme. |
| `src/configure/offline-categories.ts` | Offline categories preference: per-feature opt-in for the offline selector. |
| `src/configure/panel-bridge.ts` | Settings Panel — overlay bridge + sole-writer/-reader data functions. |
| `src/configure/reading-typography.ts` | Reading typography preferences: line spacing, word spacing, reader margin. |
| `src/configure/riwayah.ts` | Riwayah preference: which Qur'anic transmission the reader displays. |
| `src/configure/state-last-surface.svelte.ts` | Sole writer for settings.lastSurface — the hash the launch-restore |
| `src/configure/state-recent-surahs.svelte.ts` | Sole writer for `settings.recentSurahs`. Pre-fix App.svelte did its |
| `src/configure/state.svelte.ts` | _(no leading comment)_ |
| `src/configure/surah-header-visibility.ts` | Surah header visibility: persisted user preference for whether the in-reader |
| `src/configure/tafsir.ts` | _(no leading comment)_ |
| `src/configure/theme.ts` | Theme management: load and apply user theme preferences. |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Settings sheet

**Mobile + tablet (<1180 px):** single-tap gear → Settings sheet takes over full viewport (`inset: 0`, safe-area insets all four edges, no border). Portrait: preview → body → footer. Landscape (`max-height ≤540 px and orientation: landscape`): side-by-side grid — preview = left rail (full height with theme-true bg), body + footer stack on right column with own scroll.

**Desktop (≥1180 px):** `#/settings` (e.g. via `G`+`P` or command-sheet "Preferences") opens as centered modal (~440 px, max-height 720 px). Same component, narrower frame.

Three zones:

1. **Live preview band** at top — theme-true colors. Sūrat ar-Raḥmān 1–4 in active riwayah's glyphs. Arabic uses `.qa-verse-arabic`, translation uses `.qa-verse-translation` — same cascade as reader (font-size, line-height, word-spacing all match exactly). Translation row always rendered; visibility gated on `settings.translationVisible` — row keeps layout space when toggled off, preview height does not shift on toggle. ✕ close button floats top-right inside band.
2. **Body** — three sections (Reading + Sources + Storage), content-sized (`flex: 0 0 auto`) with soft hairline gold-fade separator between adjacent sections. Body scrolls vertically when content overflows the available space (no per-section stretch).
   - **Reading** — Font size slider (5-step) + Reading flow slider (5-step coordinated knob). Reset-to-default pill in section header right edge, **always rendered** (disabled = idle when both knobs at `md`); flipping in/out of default never reflows slider rows. Preview band hard-locked at 32dvh portrait / 180 px desktop modal (landscape uses the side-by-side override) — inner stage scrolls when verse content overflows.
   - **Sources** — Recitation source row (`[data-testid="src-row-recitation"]`) showing `RECITATION · Qālūn ʿan Nāfiʿ ›`; Translation dual-action row showing `TRANSLATION · {selected source} › [toggle]`; Tafsir source row (`[data-testid="src-row-tafsir"]`) showing `TAFSIR · {selected source} ›`. Tapping a source row opens the centered picker popover. The Translation row's toggle still controls `settings.translationVisible` independently.
3. **Theme footer** — pill cluster of 4 theme swatches with mini Mushaf glyphs in each theme's palette + 38 px **night-mode moon ☾** pill. Italic serif "Theme" label anchors cluster left.

Every change updates live preview (font size, reading flow, theme palette, riwayah glyph swap when popover row picked).

Switching riwayah via popover emits `SETTINGS_RIWAYAH_CHANGED`, broadcasts cross-tab via `safety/sync.ts::broadcastRiwayahChange`, re-renders reader with new Riwayah's text + font + line-height floor.

### Storage section — offline-selector

Mounted between Sources and the Theme footer as a single collapsible accordion (default closed). Header summary shows either `Cache content for offline use ›` (none cached) or `N of 4 cached ›` (gold accent). Tap-to-expand reveals four inline category rows — Text, Audio (gated), Pages (gated), Search (gated) — each carrying name + sub-label. Available rows show byte size + checkbox; gated rows show their version label only. Footer underneath has live `usage / quota` from `navigator.storage.estimate()` plus an Apply CTA.

The Text row represents the baseline reader source set: Qaloon Arabic, Saheeh International translation, Tafsir Muyassar data, and shipped Knowledge Lane context. The selector writes this as source-aware state under `settings.offlineCategories.text.{riwayat,translations,tafsir}`; knowledge has no separate persisted toggle in this phase because it is bundled into the Text download plan when present in `manifest.json`.

Expand/collapse animates via CSS `grid-template-rows: 0fr → 1fr` so the panel doesn't measure heights in JS — the Theme footer's bounding box stays put on toggle (no rebound). Inside the body's scroll region; long expansion just adds scrollable content, no chrome reflow.

Apply gating:
- Disabled when no diff vs `settings.offlineCategories`.
- Disabled with a red "Need X MB more free space" message when sum-of-newly-checked exceeds available quota (audit Q4 — pre-flight refuse).
- On click: writes `settings.offlineCategories` via `settings/offline-categories.ts::setOfflineCategories` (sole writer), then per-category `src/data/offline.ts::startCategoryDownload(cat)` for each available category. Button flips to a solid gold `Saved ✓` for ~1.5 s after a successful write so the user has visible confirmation.

Selector commits additions only — uncheck + Apply records the new state but does not evict cache contents. Cache wins from prior precache passes are honored: SHA-256 verify on cached entries skips re-download for unchanged files.

**Picker popover** (`[data-testid="settings-pop"]`): blurred + tinted scrim, parchment-gradient surface on light themes / deep-ink gradient on dark, gold hairline corner ornaments, italic serif "Choose a {Riwāyah / translation / tafsir}" title + uppercase eyebrow key. Each row: name + italic sub-meta when available + opacity-0 gold check badge that lights when active. Hover/focus tints background. Backdrop tap, Esc, or row-tap dismisses. With popover open, Esc closes popover first; second Esc closes sheet.

Dismissal: ✕ close button (inside preview), backdrop tap, Esc.

### Pick a translation

Toggle translation-visibility switch → `settings.translationVisible` rune updates → reader's `$effect` on rune re-renders with translation hidden/shown. Any footnote markers (`[N]`) present in the active pack and any open inline footnote panels disappear with translation. Sticky preview at top of Settings sheet drops translation line in lockstep.

The shipped source index exposes four selectable English sources in this phase: Saheeh International (default baseline), Bridges, The Clear Quran, and M.A.S. Abdel Haleem. Only the default body is present in the baseline manifest; the others remain opt-in dataset packs.

### Pick a tafsir source

The Settings Sources section owns the saved tafsir preference under `settings.tafsirId`. The picker exposes al-Tafsir al-Muyassar (default baseline), al-Mukhtasar fi al-Tafsir, and Tafsir al-Sa'di from the runtime source index. Optional packs remain selectable even when their bodies are not in the current baseline manifest; the Reader falls back to `muyassar` at runtime when a selected optional tafsir pack is unavailable.

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

### Clear all data

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
| `theme` | `src/configure/theme.ts` | `'light' \| 'sepia' \| 'dark' \| 'auto'` |
| `nightMode` | `src/configure/night-mode.ts` | `boolean` |
| `riwayah` | `src/configure/riwayah.ts` | `'hafs' \| 'warsh' \| 'qaloon'` |
| `translationId` | `src/configure/panel-bridge.ts` | `string` |
| `tafsirId` | `src/configure/tafsir.ts` | `string` |
| `translationVisible` | `src/configure/panel-bridge.ts` | `boolean` |
| `fontSize` | `src/configure/font-size.ts` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` |
| `lineSpacing` | `src/configure/reading-typography.ts` | step |
| `wordSpacing` | `src/configure/reading-typography.ts` | step |
| `readerMargin` | `src/configure/reading-typography.ts` | step |
| `verseSpacing` | `src/configure/reading-typography.ts` | step |
| `surahHeaderHidden` | `src/configure/surah-header-visibility.ts` | `boolean` |
| `currentPosition` | `src/read/state.svelte.ts` (router/scroll-tracker) | `{ surah, verse }` |
| `lastSurface` | `src/configure/state-last-surface.svelte.ts` | `string` (hash) |
| `recentSurahs` | `src/configure/state-recent-surahs.svelte.ts` | `number[]` |
| `onboardingComplete` | `src/onboard/state.ts` | `boolean` |
| `offlineCategories` | `src/configure/offline-categories.ts` | `OfflineCategoriesState` (source-aware text opt-in plus audio/pages/search; see `state/settings.svelte.ts`) |

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:data-cleared` | `Events.SETTINGS_DATA_CLEARED` | `src/configure/clear-data.ts:170` |
| `settings:recent-surahs-updated` | `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `src/configure/state-recent-surahs.svelte.ts:26` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/configure/riwayah.ts:58`, `src/configure/riwayah.ts:74` |
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/configure/Panel.svelte:152` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/configure/Panel.svelte:135` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/configure/reading-typography.ts:133` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **One writer per `settings` key.** Settings is a key-value store, not a record store; the invariant holds at key granularity.
- **Settings sheet sticky preview band keeps fixed warm-bronze dark bg regardless of theme.** Constant reference frame — do not retint with active theme.
- **Reset-to-default pill always rendered.** Disabled when both Reading-section knobs at `md`. Flipping in/out of default never reflows the slider rows (regression guard in `tests/unit/configure/panel.test.ts`).
- **Settings sheet body is three sections: Reading + Sources + Storage.** Storage section sits between Sources and the Theme footer. Order is regression-guarded in `tests/unit/configure/panel.test.ts`.
- **Saved tafsir preference is source metadata, not body availability.** Settings can persist an optional tafsir id from `indexes/sources.json` even when its pack is absent from the active baseline manifest; Reader load is responsible for the soft fallback to `muyassar`.
- **Sole writer of `settings.offlineCategories`: `src/configure/offline-categories.ts`** — the selector calls `setOfflineCategories(next)` and never writes IDB raw.
- **Text offline opt-in remains source-aware under one compact UI row.** The visible Text checkbox maps to the baseline Qaloon + Saheeh + Muyassar set and also caches `text-knowledge` manifest entries when they exist. Optional text bodies must still be added through `indexes/sources.json` / manifest plumbing before they can affect byte estimates or download plans.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (12):**

- `tests/unit/configure/about/pwa-install.test.ts`
- `tests/unit/configure/clear-data-confirm.test.ts`
- `tests/unit/configure/font-size.test.ts`
- `tests/unit/configure/night-mode.test.ts`
- `tests/unit/configure/offline-categories.test.ts`
- `tests/unit/configure/panel.test.ts`
- `tests/unit/configure/reading-typography-line-height.test.ts`
- `tests/unit/configure/reading-typography.test.ts`
- `tests/unit/configure/riwayah.test.ts`
- `tests/unit/configure/state.test.ts`
- `tests/unit/configure/surah-header-visibility.test.ts`
- `tests/unit/configure/theme.test.ts`

**E2E (4):**

- `tests/e2e/configure/about.spec.js`
- `tests/e2e/configure/night-mode.spec.js`
- `tests/e2e/configure/settings.spec.js`
- `tests/e2e/configure/typography.spec.js`
<!-- AUTO-GENERATED:tests END -->
