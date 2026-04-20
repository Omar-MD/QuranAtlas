# Feature Map

Every user-facing surface in QuranAtlas, with its entry point, constituent files, and behavior summary. Use this as a lookup table when you know the feature name but not the files — or vice versa.

For dependencies between directories, see `module-graph.md`. For the events each surface emits/listens to, see `events.md`.

---

## Reader

- **Route:** `#/s/:surah`, `#/s/:surah/:ayah`
- **Entry:** `src/reader/Reader.svelte` (Svelte 5 component; lazy-loaded via `app-bootstrap.ts`)
- **Files:** `reader/Reader.svelte`, `reader/Verse.svelte`, `reader/SurahHeader.svelte`, `reader/EdgeIndicator.svelte`, `reader/position.ts`, `reader/chunked-append.ts`, `reader/verse-scroll.ts`, `reader/scroll-tracker.ts`, `reader/edge-indicators.ts`, `reader/render-helpers.ts`
- **Purpose:** Main reading surface. Chunked verse rendering, translation toggle, position persistence, bookmark edge indicators.
- **Key behaviors:**
  - Loads one surah at a time via `data/dataset.ts::getSurah`.
  - Emits `AMBIENT_SURFACE` on first render, `READER_VERSE_RENDERED` per verse. Reader surah + position is shared through the `reader` state rune (`reader.currentSurahNum`, `reader.currentVerseKey`) rather than events — see `events.md` "Dissolved into rune reads."
  - Listens to `DB_VISIBILITY_VISIBLE` to scroll to last position after tab focus; translation toggle reactive via `settings.translationVisible` rune (`$effect`).
  - `setupLongPress` hook (from `marks/long-press.ts`) wires the single verse gesture: long-press → mark editor (passed as prop from `app-bootstrap.ts`).
  - `initIndicators` hook (from `marks/indicator.ts`) decorates rendered verses with mark indicators.
- **IDB touch:** reads `positions` (resume), writes `positions` on scroll (sole writer via `reader/position.ts`).

## Review hub

- **Route:** `#/review`
- **Entry:** `src/review/Hub.svelte` (Svelte component, mounted via router `onRouteChange`)
- **Files:** `review/Hub.svelte`, `review/ReviewCard.svelte`, `review/state.ts`
- **Purpose:** All-marks surface. 12-layer selector segment, group-by segment (Value / Surah / Date), value chips per layer, surah filter, sort, paginated mark cards.
- **Key behaviors:**
  - **Layer selector:** 12 tabs (Thread / Subject / Audience / Speaker / Quoted / Mode / Form / Tone / People / Places / Event / Name) — clicking a layer switches `activeLayer`, resets `activeValue`, and reloads the value chip pool via `getAllCanonicalValues(layer)`.
  - **Value chips:** clicking a chip sets `activeValue` and filters the card list to marks with that canonical value in the active layer (via `_canon[layer].includes(activeValue)`). Clicking the same chip again clears the filter.
  - Card grammar: ref eyebrow + jump link + async verse content + optional note + chip row (threads only). Tap card body → opens mark editor.
  - Flat de-duplicated single-column list regardless of groupBy UI setting.
  - Subscribes to `SYNC_UPDATE_RECEIVED` + `DB_VISIBILITY_VISIBLE` for cross-tab and tab-resume coherence.
  - Desktop (≥1180px): left rail with layer selector + group-by segment + bucket list; main column with filter bar.
  - `openEditor` imported directly from `marks/editor-bridge.ts` (no hooks injection needed).
- **IDB touch:** reads `marks` (all), reads/writes `positions["review"]` for view state (via `review/state.ts` sole writer).

## FVR (Filtered-Verse Review)

- **Route:** `#/<layer>/:value` (e.g. `#/threads/mercy`, `#/people/musa`)
- **Entry:** `src/review/Hub.svelte` (same component — branches on `layer` + `value` props)
- **Files:** `review/Hub.svelte` (shared), `safety/input-validator.ts` (`validateLayerParam`)
- **Purpose:** Deep-link view of all marks carrying a specific canonical value in a given layer. Compact centered header (layer label, color dot, value name, verse/surah stats, hairline).
- **Key behaviors:**
  - `validateLayerParam(layer, value)` from `safety/input-validator.ts` whitelists the layer against `LAYER_NAMES` and canonicalizes the value; invalid params render a "not found" state that announces via `a11y/announcer.ts`.
  - Writes `settings.lastSurface = '#/<layer>/<value>'` + `positions["review"]` with `view: 'fvr'` via `review/state.ts`.
  - No group controls — shows a flat list under the FVR header.
  - `ReviewCard.svelte` chip links use `#/threads/<tag>` (threads layer only; other layers have no chip row on the card).

## Mark editor

- **Entry:** `src/marks/editor-bridge.ts::openEditor(verseKey)` (imperative open, no route)
- **Files:** `marks/Editor.svelte`, `marks/TagLayerRegion.svelte`, `marks/TagChip.svelte`, `marks/editor-bridge.ts`, `marks/long-press.ts`, `marks/store.ts`, `marks/tags.js` (palette), `marks/indicator.ts` (visual refresh), `core/seeds.ts` (seed palettes)
- **Purpose:** Bottom sheet for tagging a verse across 12 thematic layers. Triggered by long-press on a verse or by "Mark this verse" from command sheet.
- **Key behaviors:**
  - 12 collapsible `TagLayerRegion` sections: threads, subjects, audience, speaker, quotedSpeaker, mode, form, tone, people, places, events, divineNames. Threads, audience, and mode expanded by default; others collapsed.
  - Each layer has a search input + chip pool (seeds ∪ existing canonicals ∪ user-added). Clicking a chip toggles selected/unselected within that layer; each layer shows its own count badge. Inline "+ label" chip creates a new tag in the layer.
  - Flag row: "Open question" (`hasQuestion`) and "To apply" (`hasApplication`) checkboxes.
  - Note textarea (optional, ≤500 chars).
  - Delete button hidden for new marks; inline-confirm + undo toast for existing marks.
  - Closes if `SYNC_UPDATE_RECEIVED` reports the editing verseKey was deleted elsewhere.
  - Mounted persistently in `App.svelte` alongside `UndoToast` and `QuotaBanner`.
  - `long-press.ts` exposes a Svelte action (`use:longPress`) and an imperative `setupLongPress(container, onPress)` wrapper for vanilla-JS consumers.
- **IDB touch:** `marks` (CRUD via `marks/store.ts` only — CLAUDE.md Rule 5).

## Command sheet

- **Entry:** `src/nav/CommandSheet.svelte` (Svelte component mounted in `App.svelte`); `openCommandSheet()` from `nav/command-sheet-bridge.ts` triggers it.
- **Files:** `nav/CommandSheet.svelte`, `nav/command-sheet-bridge.ts`
- **Purpose:** Unified ⌘K overlay. Searches surahs, verses, tags, marks, commands; direct verse-ref input (`2:255`) promotes a preview card.
- **Key behaviors:**
  - Arrow keys navigate, Enter activates, Esc closes. No hash route — pure overlay.
  - Emits `NAVIGATION_NAVIGATE` for verse/surah targets (`app-bootstrap.ts` routes the hash).
  - Opens mark editor directly for "Mark this verse" shortcut.

## Settings sheet

- **Route:** `#/settings` (stub — opens sheet over the previous surface, then replaces hash back)
- **Entry:** `src/settings/Panel.svelte` (Svelte component, mounted persistently in App.svelte); opened imperatively via `settings/panel-bridge.ts::openSettingsSheet()`.
- **Files:** `settings/Panel.svelte`, `settings/ClearDataConfirm.svelte`, `settings/panel-bridge.ts`, `settings/theme.ts`, `settings/font-size.ts`, `settings/clear-data.ts`
- **Purpose:** Bottom sheet. Theme swatches (Light/Sepia/Dark/Auto), font slider with live preview, translation toggle + nested picker, Clear data link.
- **Key behaviors:**
  - Theme swatches call `setTheme(opt)` from `settings/theme.ts`, which writes `settings.theme` and swaps `data-theme` on `<html>`.
  - Font slider writes `settings.fontSize`; reader/preview watch via `SETTINGS_FONT_SIZE_CHANGED`.
  - Translation toggle writes `settings.translationVisible` (IDB + rune); `Reader.svelte` re-renders via `$effect` on the rune (no event).
  - Clear data link delegates to `ClearDataConfirm.svelte` (also persistently mounted in App.svelte) via `settings/clear-data.ts::showClearDataConfirmation` — confirmation modal → `deleteDB` → reload.
  - `toggleTranslation()` exported from `panel-bridge.ts` for use by command-sheet and other callers.
- **IDB touch:** `settings` store (theme, fontSize, translationVisible, translationId).

## More sheet

- **Entry:** `src/nav/MoreSheet.svelte` (Svelte component mounted in `App.svelte`); `openMoreSheet()` from `nav/more-sheet-bridge.ts` triggers it. The `window.__qaOpenMoreSheet` global has been removed.
- **Files:** `nav/MoreSheet.svelte`, `nav/more-sheet-bridge.ts`
- **Purpose:** First-level parent sheet from the dock's ⋯ button. Five entries: Settings, Review hub, Surah list, About, Clear data.
- **Key behaviors:**
  - Settings entry closes this sheet then calls `openSettingsSheet()` directly (not via route).
  - Review / Surah / About navigate via hash.
  - Clear data calls `showClearDataConfirmation`.

## About

- **Route:** `#/about`
- **Entry:** `src/about/About.svelte` (Svelte component, mounted via router `onRouteChange`)
- **Files:** `about/About.svelte`, `about/pwa-install.ts`
- **Purpose:** Static-ish page with wordmark, mission, 54:17 Arabic blessing + translation, 2×2 stat grid (Marks / Tags / Surahs / % Qur'an), attribution, PWA install CTA (if prompt available), version.
- **Key behaviors:**
  - `getAll()` from `marks/store.ts` fuels the stat grid; `onMount` handles async load with fallback to zeros.
  - PWA install handled via `getInstallPrompt` / `promptInstall` in `about/pwa-install.ts`.
  - No back link (arrived via More sheet or hash-change).

## Onboarding

- **Route:** `#/onboarding`
- **Entry:** `src/onboarding/Onboarding.svelte` (Svelte component, mounted via router `onRouteChange`); `isComplete()` / `markComplete()` exported from module script and called from `app-bootstrap.ts::handleLaunchRestore`
- **Files:** `onboarding/Onboarding.svelte`, `onboarding/OnboardingScreen.svelte`, `onboarding/screens.ts`
- **Purpose:** First-run 5-screen flow — Welcome → Theme → Translation → Shortcuts → Tags intro.
- **Key behaviors:**
  - Progress dots + Skip button from screen 2 onward.
  - Theme picker writes through `settings/theme.ts::setTheme` so the change applies live.
  - Translation picker writes `settings.translationId` directly to IDB.
  - Completion writes `settings.onboardingComplete = true`; CTAs route to `#/s/1` or `#/surahs`.
  - Ambient dock + pill hidden on this route (`AmbientDock.svelte` guards `#/onboarding`; pill's non-reader-routes check naturally hides it).
  - Short-viewport guard (`@media (max-height: 500px)`): drops the 72vh min-height so landscape phones and short windows don't overflow; content top-aligns instead.

## Surah list

- **Route:** `#/surahs`
- **Entry:** `src/surahs/SurahList.svelte` (Svelte component, mounted via router `onRouteChange`)
- **Files:** `surahs/SurahList.svelte`, `surahs/SurahRow.svelte`
- **Purpose:** Browseable directory of all 114 surahs. Name / meaning / type / verse count, Bookmarked + Recent filters, search by name/number/ref (`67`, `67:1`, "Mulk"), continue-reading card.
- **Key behaviors:**
  - "Bookmarked" filter reads unique surah numbers from `marks/store.ts::getAll()` (sole read path per CLAUDE.md Rule 5).
  - "Recent" filter reads `settings.recentSurahs` (populated by `App.svelte`'s `$effect` on `reader.currentSurahNum`, capped at 5).
  - Direct-ref query (e.g. `2:255`) emits `NAVIGATION_NAVIGATE` for verse jump.
  - Filter and search state managed via the `surahs` rune (`state/surahs.svelte.ts`).
  - CSS co-located in `SurahList.svelte` `<style>` block; removed from `theme.css`.

## Ambient dock

- **Entry:** `src/nav/AmbientDock.svelte` (Svelte component mounted inside `#bottom-nav` in `App.svelte`)
- **Files:** `nav/AmbientDock.svelte`
- **Purpose:** Floating bottom pill with 4 glyphs (Read, Search, Review, More). Always-on chrome that replaces a traditional bottom tab bar.
- **Key behaviors:**
  - On reader routes: hidden by default, surfaces on tap (`AMBIENT_SURFACE`) and auto-fades after ~2.8s.
  - On non-reader routes: persistent (no fade).
  - On `#/onboarding`: hidden entirely.
  - Read glyph → `#/s/1`, Search → `openCommandSheet()` via bridge, Review → `#/review`, More → `openMoreSheet()` via bridge.

## Ambient pill

- **Entry:** `src/nav/AmbientPill.svelte` (Svelte component mounted inside `#top-bar` in `App.svelte`)
- **Files:** `nav/AmbientPill.svelte`
- **Purpose:** Top floating pill showing `{surah}:{verse} · {Name}` + ⌘K hint. Purely informational + clickable to open command sheet.
- **Key behaviors:**
  - Only visible on reader routes; reads `reader.currentSurahNum` + `reader.currentVerseKey` directly from rune state (no event subscriptions for label updates).
  - Tap surfaces chrome (`AMBIENT_SURFACE`), click-outside or blur hides it.
  - Click-through guard in the outside-click handler ignores taps that land inside sheets / command overlays.
