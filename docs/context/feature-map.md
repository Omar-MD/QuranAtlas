# Feature Map

Every user-facing surface in QuranAtlas, with its entry point, constituent files, and behavior summary. Use this as a lookup table when you know the feature name but not the files — or vice versa.

For dependencies between directories, see `module-graph.md`. For the events each surface emits/listens to, see `events.md`.

---

## Reader

- **Route:** `#/s/:surah`, `#/s/:surah/:ayah`
- **Entry:** `src/reader/Reader.svelte` (Svelte 5 component; lazy-loaded via `app-bootstrap.ts`)
- **Files:** `reader/Reader.svelte`, `reader/Verse.svelte`, `reader/SurahHeader.svelte`, `reader/EdgeIndicator.svelte`, `reader/position.ts`, `reader/global-position.ts`, `reader/surah-swap.ts`, `reader/chunked-append.ts`, `reader/verse-scroll.ts`, `reader/scroll-tracker.ts`, `reader/edge-indicators.ts`, `reader/render-helpers.ts`
- **Purpose:** Main reading surface. Chunked verse rendering, translation toggle, position persistence, bookmark edge indicators, cross-surah continuation.
- **Key behaviors:**
  - Loads one surah at a time via `data/dataset.ts::getSurah`.
  - Emits `AMBIENT_SURFACE` on first render, `READER_VERSE_RENDERED` per verse. Reader surah + position is shared through the `reader` state rune (`reader.currentSurahNum`, `reader.currentVerseKey`) rather than events — see `events.md` "Dissolved into rune reads."
  - Listens to `DB_VISIBILITY_VISIBLE` to scroll to last position after tab focus; translation toggle reactive via `settings.translationVisible` rune (`$effect`).
  - `setupLongPress` hook (from `marks/long-press.ts`) wires the single verse gesture: long-press → mark editor (passed as prop from `app-bootstrap.ts`).
  - `initIndicators` hook (from `marks/indicator.ts`) decorates rendered verses with mark indicators.
  - **Cross-surah continuation (2026-04-25):** `← Continue to {prev}` button above the SurahHeader and `Continue to {next} →` button replacing the surah-end terminator (rendered once the last chunk has loaded). Tap or wheel/touch overscroll past either edge fires `swapToSurah` (single-surah swap with wrap 114↔1). See user-journeys §B-Cross.
- **IDB touch:** writes `settings.currentPosition` on scroll center-band crossings (sole writer via `reader/global-position.ts`); also overwritten on every surah load and swap.

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
- **IDB touch:** reads `marks` (all), reads/writes `meta["review"]` for view state (via `review/state.ts` sole writer).

## FVR (Filtered-Verse Review)

- **Route:** `#/<layer>/:value` (e.g. `#/threads/mercy`, `#/people/musa`)
- **Entry:** `src/review/Hub.svelte` (same component — branches on `layer` + `value` props)
- **Files:** `review/Hub.svelte` (shared), `safety/input-validator.ts` (`validateLayerParam`)
- **Purpose:** Deep-link view of all marks carrying a specific canonical value in a given layer. Compact centered header (layer label, color dot, value name, verse/surah stats, hairline).
- **Key behaviors:**
  - `validateLayerParam(layer, value)` from `safety/input-validator.ts` whitelists the layer against `LAYER_NAMES` and canonicalizes the value; invalid params render a "not found" state that announces via `a11y/announcer.ts`.
  - Writes `settings.lastSurface = '#/<layer>/<value>'` + `meta["review"]` with `view: 'fvr'` via `review/state.ts`.
  - No group controls — shows a flat list under the FVR header.
  - `ReviewCard.svelte` chip links use `#/threads/<tag>` (threads layer only; other layers have no chip row on the card).

## Mark editor

- **Entry:** `src/marks/editor-bridge.ts::openEditor(verseKey)` (imperative open, no route). Post 2026-04-25: app-bootstrap routes `openEditor` to `openDeep` (TagSheet) — Editor.svelte itself is no longer mounted. Programmatic callers from Review hub still flow through this bridge.
- **Files:** `marks/Editor.svelte`, `marks/TagLayerRegion.svelte`, `marks/TagChip.svelte`, `marks/editor-bridge.ts`, `marks/long-press.ts`, `marks/store.ts`, `marks/tags.js` (palette), `marks/indicator.ts` (visual refresh), `core/seeds.ts` (seed palettes)
- **Purpose:** Bottom sheet for tagging a verse across 12 thematic layers. Reachable only via the fast-tag panel's `⛶` escalation, the `⌘+Enter` keyboard shortcut, or programmatic bridges (Review hub).
- **Key behaviors:**
  - 12 collapsible `TagLayerRegion` sections: threads, subjects, audience, speaker, quotedSpeaker, mode, form, tone, people, places, events, divineNames. Threads, audience, and mode expanded by default; others collapsed.
  - Each layer has a search input + chip pool (seeds ∪ existing canonicals ∪ user-added). Clicking a chip toggles selected/unselected within that layer; each layer shows its own count badge. Inline "+ label" chip creates a new tag in the layer.
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
  - "Mark this verse" calls `beginFast(verseKey)` (post 2026-04-25 — was `openEditor`); fast-tag inline panel surfaces.

## Settings sheet

- **Route:** `#/settings` (stub — opens sheet over the previous surface, then replaces hash back)
- **Entry:** `src/settings/Panel.svelte` (Svelte component, mounted persistently in App.svelte); opened imperatively via `settings/panel-bridge.ts::openSettingsSheet()`.
- **Files:** `settings/Panel.svelte`, `settings/ClearDataConfirm.svelte`, `settings/panel-bridge.ts`, `settings/theme.ts`, `settings/font-size.ts`, `settings/reading-typography.ts`, `settings/night-mode.ts`, `settings/clear-data.ts`
- **Purpose:** Bottom sheet. Theme swatches (Light/Sepia/Dark/Auto), Typography nav row → subview (font size + line/word spacing + reader margins + reset), translation toggle + nested picker. Clear-data row removed 2026-04-25 — moved to About page footer. Inline font slider removed 2026-04-25 — folded into Typography subview.
- **Key behaviors:**
  - Theme swatches call `setTheme(opt)` from `settings/theme.ts`, which writes `settings.theme` and swaps `data-theme` on `<html>`.
  - Typography subview hosts 4 sliders: font size (`settings/font-size.ts`), line spacing / word spacing / reader margin (`settings/reading-typography.ts` — sole writer for those three keys). Each slider is 5-step (xs/sm/md/lg/xl). Reader picks up changes via CSS attribute selectors on `<html data-line-spacing|data-word-spacing|data-reader-margin>` plus the existing `--qa-font-size-base` var. **Reset to default** restores all four to `md` and is shown only when at least one differs.
  - Translation toggle writes `settings.translationVisible` (IDB + rune); `Reader.svelte` re-renders via `$effect` on the rune (no event).
  - Clear-data confirmation modal (`ClearDataConfirm.svelte`, also persistently mounted in App.svelte) is invoked by `settings/clear-data.ts::showClearDataConfirmation`. Sole entry point post 2026-04-25 is the **About page footer link** — modal → `deleteDB` → reload.
  - `toggleTranslation()` exported from `panel-bridge.ts` for use by command-sheet and other callers.
- **Subviews:** `'main' | 'translation-picker' | 'typography'`.
- **Night mode (post 2026-04-25):** Toggle row in the Theme section drives `data-night-mode` on `<html>`; the persistent `.qa-night-shift` overlay (mounted in `App.svelte`, styled in `styles/surfaces/night-shift.css`, `mix-blend-mode: multiply`) raises its opacity in response. Composes over any theme. Also toggleable via the `n` global reader shortcut (`nav/CommandSheet.svelte`). Sole writer of `settings.nightMode`: `settings/night-mode.ts`.
- **IDB touch:** `settings` store (theme, fontSize, translationVisible, translationId, lineSpacing, wordSpacing, readerMargin, nightMode).

## Nav drawer

- **Entry:** `src/nav/NavDrawer.svelte` (mounted persistently in `App.svelte`); `openNavDrawer()` / `closeNavDrawer()` from `nav/nav-drawer-bridge.ts` trigger it.
- **Files:** `nav/NavDrawer.svelte`, `nav/nav-drawer-bridge.ts`
- **Purpose:** Left-slide drawer (mobile + desktop). Replaces `MoreSheet` (deleted 2026-04-25). Two items: **Review** (→ `#/review`), **About** (→ `#/about`). No count badges (no marks-store coupling).
- **Key behaviors:**
  - Mobile: opened by `MarginHeader` hamburger `≡`. Desktop: opened by `AmbientDock` ⋯ kebab.
  - Dismissal: backdrop tap, swipe-left, ✕ button, Esc.
  - Wordmark in header is non-interactive — About reached via the list item.

## Update banner (rolled-out new build)

- **Entry:** `src/core/UpdateBanner.svelte` (Svelte component, mounted persistently in `App.svelte`).
- **Files:** `core/UpdateBanner.svelte`, `core/constants.ts` (event), `app-bootstrap.ts` (`registerServiceWorker` listens for `updatefound` + `applyAppUpdate` exported), `styles/surfaces/update-banner.css`.
- **Purpose:** Notify the user when a new build was rolled out so they don't keep using a cached version. Surfaces on `Events.APP_UPDATE_AVAILABLE` (emitted when the SW reaches `installed` state with an existing controller).
- **Key behaviors:**
  - **Reload** button calls `applyAppUpdate()` → posts `SKIP_WAITING` to the waiting SW → reloads on `controllerchange`.
  - **✕** dismisses the banner without reloading (state persists until next update).
  - Hidden on dev builds (SW only registered in `import.meta.env.PROD`).
- **Build identity:** version + short commit SHA shown on About page footer (`v<X.Y.Z> · <sha>`) and logged to console on boot. Both injected at build time via Vite `define` (`__APP_VERSION__`, `__BUILD_SHA__`, `__BUILD_TIME__` — see `vite.config.js`; vitest mirrors with `'test'` SHA).

## About

- **Route:** `#/about`
- **Entry:** `src/about/About.svelte` (Svelte component, mounted via router `onRouteChange`)
- **Files:** `about/About.svelte`, `about/pwa-install.ts`
- **Purpose:** Static-ish page with wordmark, mission, 54:17 Arabic blessing + translation, 2×2 stat grid (Marks / Tags / Surahs / % Qur'an), attribution, PWA install CTA (if prompt available), version, **Clear all data** link in footer (post 2026-04-25 — was Settings sheet bottom row).
- **Key behaviors:**
  - `getAll()` from `marks/store.ts` fuels the stat grid; `onMount` handles async load with fallback to zeros.
  - PWA install handled via `getInstallPrompt` / `promptInstall` in `about/pwa-install.ts`.
  - Clear-data link calls `showClearDataConfirmation` from `settings/clear-data.ts` (sole entry point post-redesign).
  - No back link (arrived via NavDrawer or hash-change).

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
  - Read → last-visited surah (from `settings.lastSurface`, default `#/s/1`), Search → `openCommandSheet()`, Review + Marks → `#/review`. Surah list reachable via command sheet or `G`+`S` shortcut (no longer a rail tab; drawer doesn't carry it either).
  - Hover/focus shows parchment tooltip to the right of the icon.
  - Verse crumb reads `reader.currentSurahNum` + `reader.currentVerseKey` runes reactively; rendered rotated 90° via `transform: rotate(-90deg)` on inline text; hidden when no surah set.
  - ⋯ more button has `data-tab="more"` and calls `openNavDrawer()` (was `openMoreSheet()` pre 2026-04-25).
  - Emits `AMBIENT_SURFACE` on tab click while on reader routes.

## Margin header (mobile top nav) — single-row redesign 2026-04-25

- **Route:** all routes; auto-hides on scroll down, reveals on scroll up or `AMBIENT_SURFACE`.
- **Entry:** `src/nav/MarginHeader.svelte` (mounted persistently in `App.svelte`; display-hidden on desktop ≥1180px).
- **Files:** `nav/MarginHeader.svelte`, `nav/swipe-gestures.ts` (pure helper)
- **Purpose:** Mobile/tablet (<1180px) fixed top bar, single row, ~52 px tall. Layout: **hamburger `≡`** · **bilingual surah label** · **settings gear `⚙`**.
- **Key behaviors:**
  - Hamburger → `toggleNavDrawer()` (Review / About). Toggles open/closed; second tap dismisses (post 2026-04-25). Replaces the retired ⋮ kebab.
  - Center label tap (no surah in rune, e.g. cold-load on About): resumes via `loadGlobalPosition()` → `#/s/<lastSurah>` (Reader picks the global saved verse from `settings.currentPosition`). Falls back to `#/s/1` only if no global position record exists.
  - Center label: Arabic surah name (top, RTL) + uppercase smallcaps English (bottom, with chevron `▾`). Tap = surah list (or back to last surah if already on surah list). Swipe left/right on label = next/prev surah, clamped 1–114; haptic nudge at boundaries.
  - Swipe down on header = `#/surahs`.
  - Gear: short tap = `openSettingsSheet()`. Long-press ≥400 ms = `cycleTheme()` (parity with keyboard `d`).
  - Scroll listener on `#main-content` toggles `qa-mh--hidden` (transform translateY −100%).
  - Swipe classifier: `nav/swipe-gestures.ts::classifySwipe` — pure threshold/velocity math (covered by Vitest unit tests at `tests/unit/nav/swipe-gestures.test.ts`).
- **Reader clearance:** `app-shell.css` pads `#main-content` by `calc(env(safe-area-inset-top) + 56px)` at <768 and 768–1179 breakpoints (was 108 px pre-redesign).

## Fast-tag panel (inline, in-verse)

- **Entry:** `src/reader/VerseTagPanel.svelte` (rendered inside `reader/Verse.svelte` under the translation, gated on `isActive`). Opens when `tagSession.quickbarOpen === true` for that verse.
- **Files:** `reader/VerseTagPanel.svelte`, `reader/Verse.svelte`, `tag/session-bridge.ts`, `state/tag-session.svelte.ts`, `data/tag-layers.ts`
- **Purpose:** Sole per-verse action surface (post 2026-04-25 redesign) — inline suggestion panel under the active verse's translation, grouped by layer group (Speech / Narrative / Themes / Entities) with color-coded `#` glyph per layer hue. Replaces the retired floating `tag/AmbientDock` quickbar. Deep editor (`tag/TagSheet`) reachable only via the `⛶` escalation button or `⌘+Enter`.
- **Key behaviors:**
  - **Entry points:** long-press verse (touch), right-click verse (desktop), keyboard `m` on centered verse, command-sheet "Mark this verse" (F2). All four call `beginFast(verseKey)`.
  - `beginFast` hydrates `tagSession` from any existing mark for the verse (`marks/store::getByVerseKey`), then sets `quickbarOpen = true`.
  - Suggested chips come from `data/tag-layers::QUICK_PICKS`, grouped into rows by `LAYER_GROUPS`. Tap chip → `tagSession.toggle(layer, value)` → debounced 350 ms save through `marks/store::save`.
  - Inline type-to-create: `+ add` per group swaps to an `<input>`; Enter commits (creates a new value in the group's first layer), Escape cancels.
  - **`⛶` escalate button** (top-right, replaces retired regenerate placeholder) → `openDeep(verseKey)` → deep TagSheet. `⌘/Ctrl + Enter` keyboard shortcut does the same. Esc ends the session (`tagSession.end()`).
  - No "Accept all" button, no "Suggested for {verseKey}" header — chip toggles + ⛶ are the only interactions.
  - Active verse in the reader gets `.qa-verse--active` styling (accent bracket, inset ring, parchment verse-key) + `contain-intrinsic-size: auto 260px` to prevent bounce when chips wrap during selection. Drive: `isActive = tagSession.verseKey === verseKey && tagSession.quickbarOpen`.

## Deep-tag sheet (fast-path peer)

- **Entry:** `src/tag/TagSheet.svelte` (mounted in `App.svelte`). Opens when `tagSession.sheetOpen === true`.
- **Files:** `tag/TagSheet.svelte`, `tag/TagModeToggle.svelte`, `tag/VerseSpotlight.svelte`, `tag/session-bridge.ts`
- **Purpose:** Deep counterpart to the inline fast-tag panel — full 12-layer editor that shares `tagSession` state.
- **Key behaviors:**
  - Opened via `openDeep(verseKey)` (session-bridge) or the inline panel's `⌘+Enter` transition.
  - Body renders all four layer groups stacked as sections in outer→inner reading order (Speech → Narrative → Themes → Entities), no tab bar. Each section is visually nested: a hue-colored left rail + mono uppercase group name + optional count badge, with layer rows indented inside. Layers within each group are ordered from outer scope to inner detail: Speech = speaker → audience → quotedSpeaker → form; Narrative = mode → tone; Themes = threads → subjects; Entities = events → people → places → divineNames. Chip grammar mirrors `reader/VerseTagPanel.svelte`: hashtag chips (`#value` with `#` colored by layer hue) for selected values, tap-to-remove (× surfaces on hover). Each row has an underline combobox input for type-to-create with seed suggestions via `getSeedsForLayer`.
  - Writes through `marks/store::save`. Legacy `marks/Editor.svelte` remains the canonical long-press surface.
  - **Mobile (<1180px):** full-screen sheet (`inset: 0`), safe-area insets on sticky header + sticky footer, body scrolls between. Verse preview is a collapsible button: tap chevron (or preview card) to reduce Arabic + full translation to a single-line ellipsised summary, freeing vertical space on long ayat. Cancel button + `⌘↵` meta-hint hidden on mobile; Save button stretches; tap targets enlarged.
  - **Desktop ≥1180px:** right-side vertical panel (~min(560px, 44vw)), unchanged.
  - **Header:** "Mark verse" title only — verse ref is not duplicated in the header (already in the preview card).
  - **Delete:** shown only when an existing mark is loaded. First tap swaps the footer into an inline confirm (`Delete this mark? [Keep] [Delete]`); second tap on the solid red button commits, then the undo toast fires. Closing the sheet cancels any pending confirm.

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
