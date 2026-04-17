# Feature Map

Every user-facing surface in QuranAtlas, with its entry point, constituent files, and behavior summary. Use this as a lookup table when you know the feature name but not the files — or vice versa.

For dependencies between directories, see `module-graph.md`. For the events each surface emits/listens to, see `events.md`.

---

## Reader

- **Route:** `#/s/:surah`, `#/s/:surah/:ayah`
- **Entry:** `src/reader/index.js::init(params, { initIndicators, setupLongPress })`
- **Files:** `reader/index.js`, `reader/scroll-tracker.js`
- **Purpose:** Main reading surface. Chunked verse rendering, translation toggle, position persistence, bookmark edge indicators.
- **Key behaviors:**
  - Loads one surah at a time via `data/dataset.js::getSurah`.
  - Emits `READER_SURAH_LOADED`, `READER_POSITION_CHANGED`, `READER_VERSE_RENDERED`.
  - Listens to `DB_VISIBILITY_VISIBLE` and `SETTINGS_TRANSLATION_CHANGED` to refresh.
  - `setupLongPress` (from `marks/editor.js`) wires the single verse gesture: long-press → mark editor.
- **IDB touch:** reads `positions` (resume), writes `positions` on scroll.

## Review hub

- **Route:** `#/review`
- **Entry:** `src/review/hub.js::init({}, { openEditor })`
- **Files:** `review/hub.js`, `review/state.js`
- **Purpose:** All-marks surface. Three-segment grouping (Tag / Surah / Date), tag + surah filters, sort, paginated mark cards.
- **Key behaviors:**
  - Card grammar: ref eyebrow + jump link + async verse content + optional note + chip row. Tap card body → opens mark editor.
  - Multi-tagged marks appear under each tag in tag-grouped view.
  - Listens to `SYNC_UPDATE_RECEIVED` + `DB_VISIBILITY_VISIBLE` for cross-tab and tab-resume coherence.
- **IDB touch:** reads `marks` (all), reads/writes `positions["review"]` for view state.

## FVR (Filtered-Verse Review)

- **Route:** `#/t/:tag`
- **Entry:** same as review hub (`review/hub.js::init({ tag }, …)` takes the tag-deeplink branch)
- **Files:** `review/hub.js` (shared), `safety/input-validator.js` (tag validation)
- **Purpose:** Deep-link view of all marks carrying a single tag. Compact centered header (color dot, verse/surah stats, hairline).
- **Key behaviors:**
  - Validates `tag` param (≤50 chars, no control chars); invalid or empty tags render a "not found" card that announces via `a11y/announcer.js`.
  - Writes `settings.lastSurface = '#/t/:tag'` + `positions["review"]` with `view: 'fvr'`.
  - No group controls — shows a flat list under the header.

## Mark editor

- **Entry:** `src/marks/editor.js::openEditor(verseKey)` (imperative open, no route)
- **Files:** `marks/editor.js`, `marks/store.js`, `marks/tags.js` (palette), `marks/indicator.js` (visual refresh)
- **Purpose:** Bottom sheet for tagging a verse. Triggered by long-press on a verse or by "Mark this verse" from command sheet.
- **Key behaviors:**
  - Selected strip (count + clear-all + × chips) above the All-tags region; chips move between regions on click.
  - Seed tags (16 defaults) shown when no marks exist; otherwise used-tags list. Search filter + inline "+ create" chip for new tags (≤50 chars, no control chars).
  - Note textarea; delete button hidden for new marks, inline-confirm + undo toast for existing.
  - Closes if `SYNC_UPDATE_RECEIVED` reports the editing verseKey was deleted elsewhere.
- **IDB touch:** `marks` (CRUD), `settings.usedTags` (maintained in `marks/store.js`).

## Command sheet

- **Entry:** `src/nav/command-sheet.js::initCommandSheet()` attaches the ⌘K handler; `openCommandSheet()` triggers it.
- **Files:** `nav/command-sheet.js`
- **Purpose:** Unified ⌘K overlay. Searches surahs, verses, tags, marks, commands; direct verse-ref input (`2:255`) promotes a preview card.
- **Key behaviors:**
  - Arrow keys navigate, Enter activates, Esc closes. No hash route — pure overlay.
  - Emits `NAVIGATION_NAVIGATE` for verse/surah targets (app.js routes the hash).
  - Opens mark editor directly for "Mark this verse" shortcut.

## Settings sheet

- **Route:** `#/settings` (stub — opens sheet over the previous surface, then replaces hash back)
- **Entry:** `src/settings/panel.js::openSettingsSheet()`; `initSettingsPanel()` owns lifecycle cleanup.
- **Files:** `settings/panel.js`, `settings/theme.js`, `settings/font-size.js`, `settings/clear-data.js`
- **Purpose:** Bottom sheet. Theme swatches (Light/Sepia/Dark/Auto), font slider with live preview, translation toggle + nested picker, Clear data link.
- **Key behaviors:**
  - Theme swatches call `setTheme(opt)` from `settings/theme.js`, which writes `settings.theme` and swaps `data-theme` on `<html>`.
  - Font slider writes `settings.fontSize`; reader/preview watch via `SETTINGS_FONT_SIZE_CHANGED`.
  - Translation toggle emits `SETTINGS_TRANSLATION_CHANGED { visible }`; reader re-renders.
  - Clear data link hands off to `settings/clear-data.js::showClearDataConfirmation` — confirmation modal → `deleteDB` → reload.
- **IDB touch:** `settings` store (theme, fontSize, translationVisible, translationId).

## More sheet

- **Entry:** `src/nav/more-sheet.js::openMoreSheet()` (exposed as `window.__qaOpenMoreSheet` so dock can open it without a circular import).
- **Files:** `nav/more-sheet.js`
- **Purpose:** First-level parent sheet from the dock's ⋯ button. Five entries: Settings, Review hub, Surah list, About, Clear data.
- **Key behaviors:**
  - Settings entry closes this sheet then calls `openSettingsSheet()` directly (not via route).
  - Review / Surah / About navigate via hash.
  - Clear data calls `showClearDataConfirmation`.

## About

- **Route:** `#/about`
- **Entry:** `src/about/index.js::init()`
- **Files:** `about/index.js`, `about/pwa-install.js`
- **Purpose:** Static-ish page with wordmark, mission, 54:17 Arabic blessing + translation, 2×2 stat grid (Marks / Tags / Surahs / % Qur'an), attribution, PWA install CTA (if prompt available), version.
- **Key behaviors:**
  - `getAll()` from `marks/store.js` fuels the stat grid; `_initSeq` guards against late-async writes after re-init.
  - PWA install handled via `getInstallPrompt` / `promptInstall` in `about/pwa-install.js`.
  - No back link (arrived via More sheet or hash-change).

## Onboarding

- **Route:** `#/onboarding`
- **Entry:** `src/onboarding/index.js::init()` (+ `isComplete()` / `markComplete()` helpers called from `app.js::handleLaunchRestore`)
- **Files:** `onboarding/index.js`, `onboarding/screens.js`
- **Purpose:** First-run 4-screen flow — Welcome → Theme → Translation → Tags intro.
- **Key behaviors:**
  - Progress dots + Skip button from screen 2 onward.
  - Theme picker writes through `settings/theme.js::setTheme` so the change applies live.
  - Translation picker writes `settings.translationId` directly.
  - Completion writes `settings.onboardingComplete = true`; CTAs route to `#/s/1` or `#/surahs`.
  - Ambient dock + pill hidden on this route (`ambient-dock.js` guards `#/onboarding`; pill's non-reader-routes check naturally hides it).

## Surah list

- **Route:** `#/surahs`
- **Entry:** `src/surahs/list.js::init()`
- **Files:** `surahs/list.js`
- **Purpose:** Browseable directory of all 114 surahs. Name / meaning / type / verse count, Bookmarked + Recent filters, search by name/number/ref (`67`, `67:1`, "Mulk"), continue-reading card.
- **Key behaviors:**
  - "Bookmarked" filter reads unique surah numbers from `marks`.
  - "Recent" filter reads `settings.recentSurahs` (populated by `core/app.js` on `READER_SURAH_LOADED`, capped at 5).
  - Direct-ref query (e.g. `2:255`) emits `NAVIGATION_NAVIGATE` for verse jump.

## Ambient dock

- **Entry:** `src/nav/ambient-dock.js::initAmbientDock()` (invoked from `app.js`)
- **Files:** `nav/ambient-dock.js`
- **Purpose:** Floating bottom pill with 4 glyphs (Read, Search, Review, More). Always-on chrome that replaces a traditional bottom tab bar.
- **Key behaviors:**
  - On reader routes: hidden by default, surfaces on tap (`AMBIENT_SURFACE`) and auto-fades after ~2.8s.
  - On non-reader routes: persistent (no fade).
  - On `#/onboarding`: hidden entirely.
  - Read glyph → `#/s/1`, Search → `openCommandSheet()`, Review → `#/review`, More → `window.__qaOpenMoreSheet()`.

## Ambient pill

- **Entry:** `src/nav/ambient-pill.js::initAmbientPill()`
- **Files:** `nav/ambient-pill.js`
- **Purpose:** Top floating pill showing `{surah}:{verse} · {Name}` + ⌘K hint. Purely informational + clickable to open command sheet.
- **Key behaviors:**
  - Only visible on reader routes; listens to `READER_SURAH_LOADED` + `READER_POSITION_CHANGED` to update label.
  - Tap surfaces chrome (`AMBIENT_SURFACE`), click-outside or blur hides it.
  - Click-through guard in the outside-click handler ignores taps that land inside sheets / command overlays.
