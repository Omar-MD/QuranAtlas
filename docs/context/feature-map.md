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

## Ambient dock (desktop left rail)

- **Entry:** `src/nav/AmbientDock.svelte` (Svelte component mounted inside `#bottom-nav` in `App.svelte`)
- **Files:** `nav/AmbientDock.svelte`
- **Purpose:** 56-px full-height left panel on desktop (≥1180px). Cream-surface panel (`var(--qa-ambient-surface)`) with right-border separator. Top section: Arabic "أ" logo + 4 icon tabs (Read / Search / Review / Marks). Bottom section: rotated verse crumb (`{surah} : {verse}`) + ⋯ more button. Always-on — no auto-fade.
- **Key behaviors:**
  - Desktop only: entire rail hidden via `@media (max-width: 1179px)`. Mobile primary nav is `MarginHeader`.
  - `#app-shell` gets `padding-left: 56px` at ≥1180px so main-content sits flush right of the panel; rail itself is `position: fixed` and escapes the shift.
  - Hidden on `#/onboarding` via `qa-dock--hidden` class on `#bottom-nav`.
  - Read → last-visited surah (from `settings.lastSurface`, default `#/s/1`), Search → `openCommandSheet()`, Review + Marks → `#/review`. Surah list reachable via More sheet → "Surah list", command sheet, or `G`+`S` shortcut (no longer a rail tab).
  - Hover/focus shows parchment tooltip to the right of the icon.
  - Verse crumb reads `reader.currentSurahNum` + `reader.currentVerseKey` runes reactively; rendered rotated 90° via `transform: rotate(-90deg)` on inline text; hidden when no surah set.
  - ⋯ more button has `data-tab="more"` and calls `openMoreSheet()`.
  - Emits `AMBIENT_SURFACE` on tab click while on reader routes.

## Margin header (mobile top nav)

- **Route:** all routes; auto-hides on scroll down, reveals on scroll up or `AMBIENT_SURFACE`.
- **Entry:** `src/nav/MarginHeader.svelte` (mounted persistently in `App.svelte`; display-hidden on desktop ≥1180px).
- **Files:** `nav/MarginHeader.svelte`
- **Purpose:** Mobile/tablet (<1180px) fixed top bar. Row 1: surah breadcrumb pill (`{surah} : {verse} · {Name}` ▼) + circular fast-tag toggle + ⋮ more. Row 2: section tabs (Read / Review N / Marks / Threads).
- **Key behaviors:**
  - Crumb button → `openCommandSheet()` (surah picker).
  - Fast-tag button (dot-only circle): toggles `tagSession.quickbarOpen`; when active pulses green (light) / mint (dark). Calls `beginFast(verseKey)` to start, `tagSession.end()` to stop. Reads `reader.currentVerseKey`; no-op if no active verse.
  - ⋮ button → `openMoreSheet()`.
  - Section tabs use `#/review` for Review/Marks/Threads stubs today; Read jumps to `lastSurahHref` from `settings.lastSurface`.
  - Review count badge reads `marks/store::getAll().length`; updates on `MARKS_SAVED` / `MARKS_DELETED`.
  - Scroll listener on `#main-content` toggles `qa-mh--hidden` (transform translateY −100%).
- **Reader clearance:** `theme.css` pads `#main-content` by `calc(env(safe-area-inset-top) + 108px)` at <768 and 768–1179 breakpoints so the header never covers the surah title.

## Fast-tag quickbar

- **Entry:** `src/tag/AmbientDock.svelte` (mounted in `App.svelte` as `TagAmbientDock`). Opens when `tagSession.quickbarOpen === true`.
- **Files:** `tag/AmbientDock.svelte`, `tag/TagChip.svelte`, `tag/session-bridge.ts`, `state/tag-session.svelte.ts`, `data/tag-layers.ts`
- **Purpose:** Fast path for tagging a single verse — floating bottom-center bar with suggested tag chips. Complement to the deep path (`marks/Editor.svelte`).
- **Key behaviors:**
  - Triggered by: mobile MarginHeader fast-tag button, or programmatic `beginFast(verseKey)` via `tag/session-bridge.ts`.
  - `beginFast` hydrates `tagSession` from any existing mark for the verse (`marks/store::getByVerseKey`), then sets `quickbarOpen = true`.
  - Suggested chips come from `data/tag-layers::QUICK_PICKS`. Tap chip → `tagSession.toggle(layer, value)` → debounced 350 ms save through `marks/store::save`.
  - Desktop `accept` button applies every quick-pick at once. `⌘/Ctrl + Enter` opens the deep sheet (`openMore()` → `sheetOpen = true`, `quickbarOpen = false`).
  - Esc ends the session (`tagSession.end()`).
  - Active verse in the reader gets `.qa-verse--active` styling (accent bracket, inset ring, parchment verse-key) driven by `isActive = tagSession.verseKey === verseKey && tagSession.quickbarOpen`.

## Deep-tag sheet (fast-path peer)

- **Entry:** `src/tag/TagSheet.svelte` (mounted in `App.svelte`). Opens when `tagSession.sheetOpen === true`.
- **Files:** `tag/TagSheet.svelte`, `tag/TagModeToggle.svelte`, `tag/VerseSpotlight.svelte`, `tag/session-bridge.ts`
- **Purpose:** Deep counterpart to the quickbar — full 12-layer editor that shares `tagSession` state.
- **Key behaviors:**
  - Opened via `openDeep(verseKey)` (session-bridge) or the quickbar's `⌘+Enter` transition.
  - Writes through `marks/store::save`. Legacy `marks/Editor.svelte` remains the canonical long-press surface.

## Tag-mode pill (desktop)

- **Entry:** `src/nav/TagModePill.svelte` (mounted in `App.svelte`). Always visible on desktop (≥1180px) reader routes (`#/s/`); hidden everywhere else.
- **Files:** `nav/TagModePill.svelte`
- **Purpose:** Top-right desktop toggle for fast-tag mode. Two visual states:
  - **Off** (hollow dot) — tap starts fast-tag on `reader.currentVerseKey` via `beginFast(vk)`. No-op if no active verse.
  - **On** (filled dot, green/mint) — `tagSession.quickbarOpen || sheetOpen` true. Tap calls `tagSession.end()`.
- **Key behaviors:**
  - Listens to `ROUTER_ROUTE_CHANGE` + `hashchange` to hide off-reader routes.
  - Mirror of the mobile MarginHeader fast-tag dot button; desktop users have no other entry point since verse tap does not start fast-tag mode.

## Verse tags (inline chip row)

- **Entry:** `src/reader/VerseTags.svelte` (rendered inside every `Verse.svelte`).
- **Files:** `reader/VerseTags.svelte`
- **Purpose:** Shows canonical tag chips under each verse when that verse has a mark. **Gated on `tagSession.quickbarOpen`** — chips are only visible while fast-tag mode is active. When the user exits tag mode, chips hide on every verse (keeps reader uncluttered). Updates live on `MARKS_SAVED` / `MARKS_DELETED` for the matching `verseKey`.

## Surah progress chip

- **Entry:** `src/nav/SurahProgress.svelte` (rendered inside `reader/SurahHeader.svelte`).
- **Files:** `nav/SurahProgress.svelte`, `data/juz.ts`
- **Purpose:** Juz / surah-progress meta chip under the surah title (juz number + percent through surah).

## Ambient pill

- **Entry:** `src/nav/AmbientPill.svelte` (Svelte component mounted inside `#top-bar` in `App.svelte`)
- **Files:** `nav/AmbientPill.svelte`
- **Purpose:** Top floating pill showing `{surah}:{verse} · {Name}` + ⌘K hint. Purely informational + clickable to open command sheet.
- **Key behaviors:**
  - Only visible on reader routes; reads `reader.currentSurahNum` + `reader.currentVerseKey` directly from rune state (no event subscriptions for label updates).
  - Tap surfaces chrome (`AMBIENT_SURFACE`), click-outside or blur hides it.
  - Click-through guard in the outside-click handler ignores taps that land inside sheets / command overlays.
