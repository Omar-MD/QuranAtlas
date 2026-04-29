# Feature Map

Every user-facing surface in QuranAtlas, with its entry point, constituent files, and behavior summary. Use this as a lookup table when you know the feature name but not the files — or vice versa.

For dependencies between directories, see `module-graph.md`. For the events each surface emits/listens to, see `events.md`.

---

## Reader

- **Route:** `#/s/:surah`, `#/s/:surah/:ayah`
- **Entry:** `src/reader/Reader.svelte` (Svelte 5 component; lazy-loaded via `app-bootstrap.ts`)
- **Files:** `reader/Reader.svelte`, `reader/Verse.svelte`, `reader/SurahHeader.svelte`, `reader/EdgeIndicator.svelte`, `reader/position.ts`, `reader/global-position.ts`, `reader/surah-swap.ts`, `reader/chunked-append.ts`, `reader/verse-scroll.ts`, `reader/scroll-tracker.ts`, `reader/edge-indicators.ts`, `reader/render-helpers.ts`, `reader/translation-tokens.ts`
- **Purpose:** Main reading surface. Chunked verse rendering, translation rendering with footnote markers, translation toggle, position persistence, bookmark edge indicators, cross-surah continuation.
- **Key behaviors:**
  - Loads one surah at a time via `data/dataset.ts::getSurah`.
  - Emits `AMBIENT_SURFACE` on first render, `READER_VERSE_RENDERED` per verse. Reader surah + position is shared through the `reader` state rune (`reader.currentSurahNum`, `reader.currentVerseKey`) rather than events — see `events.md` "Dissolved into rune reads."
  - Listens to `DB_VISIBILITY_VISIBLE` to scroll to last position after tab focus; translation toggle reactive via `settings.translationVisible` rune (`$effect`).
  - **Translation pack join (2026-04-27):** in `loadSurah`, fetches `loadTranslationForSurah(settings.translationId, surahNum)` in parallel with the riwayat surah; builds a `verseKey → text` lookup and assigns `v.en` from it during chunked append. Footnote map (`translationPack.footnotes`) is passed to every `Verse.svelte`. `[N]` markers in translation text are tokenised by `reader/translation-tokens.ts` and rendered as `<button class="qa-fn-marker">` elements; clicking one disclose-toggles a `.qa-fn-popover` panel below the verse with the footnote text. Esc closes the panel. Translation pack absent or 404s ⇒ verses render with empty translation strings (no marker buttons), reader still functional. Default `settings.translationId` is `'saheeh'` (Saheeh International, free for non-commercial distribution); user-facing picker is deferred until a second translation ships.
  - `setupLongPress` hook (from `marks/long-press.ts`) wires the single verse gesture: double-tap → mark editor (passed as prop from `app-bootstrap.ts`).
  - `initIndicators` hook (from `marks/indicator.ts`) decorates rendered verses with mark indicators.
  - **Cross-surah continuation (2026-04-25, recessed 2026-04-26):** Chrome-mobile-PTR-style pull-to-swap is the primary affordance — pulling past either edge of the scroller fills a circular progress arc (`PullToSwapIndicator.svelte`); release past full progress commits a single-surah swap with wrap 114↔1 (`surah-swap.ts::setupPullToSwap`). Native browser pull-to-refresh is suppressed via `overscroll-behavior-y: contain` on `#main-content`. Click fallback (post 2026-04-25 redesign, restyled 2026-04-26): single-line italic arrow + surah title at top (`↑ <prev>`) and bottom (`<next> ↓`) — no border, sits flush against the scroller edges (`margin: 2px auto`), muted text color with small italic title (0.7rem) + 12px arrow; reveals to accent color on hover/focus. Markup uses `.qa-continue-arrow` + `.qa-continue-title` spans inside `.qa-continue-prev`/`.qa-continue-next`; see `styles/surfaces/reader.css`. See user-journeys §B-Cross.
  - **Surah Header (post 2026-04-26):** 2-col grid layout — Mushaf Arabic title (`'Amiri Quran'`) in the right column spans both rows full-height; meta line (`SURAH N · COUNT VERSES`, surah English name dropped — Arabic carries it) + juz progress in the left column. Visibility gated by `reader.surahHeaderHidden` rune (mirrors `settings.surahHeaderHidden`); toggled by MarginHeader center-label tap; preference persists across surahs. Bismillah block adds an English translation (`In the Name of Allah — the Most Compassionate, Most Merciful`) under the U+FDFD glyph (always rendered when basmala renders, ignores `settings.translationVisible`; bismillah keeps rendering when the header is hidden).
- **IDB touch:** writes `settings.currentPosition` on scroll center-band crossings (sole writer via `reader/global-position.ts`); also overwritten on every surah load and swap. Reads `settings.surahHeaderHidden` (sole writer `settings/surah-header-visibility.ts`) via the `reader.surahHeaderHidden` rune to decide whether to render `SurahHeader.svelte`.
- **Riwayah:** each `.qa-verse-arabic` element carries `data-riwayah={activeRiwayah}`. CSS rules in `styles/tokens/semantic.css` keyed on `:root[data-riwayah="hafs"|"warsh"|"qaloon"]` set `--qa-font-arabic` (all three resolve to Amiri Quran via `--ff-amiri-quran`). Sole text-source writer: `data/dataset.ts::getSurah` reads `settings['riwayah']` to resolve the per-surah URL (`public/dataset/riwayat/{riwayah}/{NNN}.json`).

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
- **Files:** `settings/Panel.svelte`, `settings/ClearDataConfirm.svelte`, `settings/panel-bridge.ts`, `settings/theme.ts`, `settings/font-size.ts`, `settings/reading-typography.ts`, `settings/night-mode.ts`, `settings/riwayah.ts`, `settings/clear-data.ts`
- **Purpose:** Full-screen sheet on mobile + tablet (<1180px); centered modal on desktop (≥1180px). Three-zone layout: live-preview band (top, theme-true colors, ✕ floats inside), balanced body with **Reading** + **Sources** sections (each `flex: 1`, contents centered), and **theme footer** rail (bottom, swatch pill + night-mode moon). Single view — no subview navigation. Picker popovers (Recitation, Translation) open as themed centered modals. Clear-data row lives on About page footer (since 2026-04-25). Translation picker UI mounts only when a 2nd shipped pack lands.
- **Key behaviors:**
  - **Live preview band** (`.qa-settings-preview`, `data-testid="settings-preview"`) sits at the top of the sheet with the close ✕ button floating inside (`.qa-settings-close`). Renders Sūrat ar-Raḥmān 1–2 in the active riwayah's glyphs (corpus-exact strings from `PREVIEW_AR` in `Panel.svelte`). Translation line under the Arabic is gated on `settings.translationVisible`. **Theme-true:** preview surface = `var(--qa-surface-raised)`, Arabic = `var(--qa-text-arabic)`, eye + translation = on-sheet muted — preview reflects the active theme's palette so what you see equals what the reader produces.
  - **Reading section** (top, `flex: 1`): two sliders — Font size (`settings/font-size.ts`) and Reading flow (`settings/reading-typography.ts::setReadingFlow` — coordinated knob writing `lineSpacing`/`wordSpacing`/`readerMargin`/`verseSpacing` at once). Each slider 5-step (xs/sm/md/lg/xl). Reader picks up changes via CSS attribute selectors on `<html data-…>` plus `--qa-font-size-base`. **Reset to default** is a small italic gold pill button rendered at the section bottom only when at least one knob ≠ `md`; clicking it restores font + flow.
  - **Sources section** (middle, `flex: 1`, separated from Reading by a hairline gold gradient): two source rows in source-key + source-value + chevron grammar.
    - **Recitation row** (`[data-testid="src-row-recitation"]`) — tap opens the **picker popover** (centered modal, `[data-testid="settings-pop"]`) titled "Choose a Riwāyah". Each row inside the popover shows label + sub-meta (`ʿan ʿĀṣim · 6236 ayāt`); active row gets a gold check badge. Click a row → `settings/riwayah.ts::setRiwayah` writes IDB + emits `SETTINGS_RIWAYAH_CHANGED` + closes popover.
    - **Translation dual-action row** — single grid row holding the source key + name + chevron + visibility toggle. Tap the name or chevron → opens the Translation picker popover (only when `translations.length > 1`; otherwise chevron is `disabled`). Toggle on the right writes `settings.translationVisible` (IDB + rune) and live-updates the preview.
  - **Theme footer** (bottom, `.qa-settings-footer`, hairline gold-fade separator on top): pill cluster of 4 theme swatches (`.qa-settings-tf-dot--{light|sepia|dark|auto}`) — each 34 px circular, mini Mushaf glyph in the theme's actual palette. Active swatch scales `1.12`, gets a gold ring + drop shadow. Italic Cormorant Garamond "Theme" label sits left of the cluster. To the right, a 38 px circular **night-mode moon ☾** (`[data-testid="night-mode-switch"]`) pairs with the swatches — both are appearance, both rare-touch. Off = parchment border + gold glyph; on = gold fill, dark glyph, soft halo.
  - **Picker popover** (`.qa-settings-pop`): blurred + tinted scrim, parchment-gradient surface (deep-ink gradient on dark theme), gold hairline corner ornaments (top-right + bottom-left), italic serif "Choose a {…}" title + uppercase eyebrow key. Each row: name + italic sub-meta + opacity-0 check badge that lights gold when active. Hover/focus tints background. Backdrop tap, Esc, or row-tap dismisses (Esc closes the picker first; a second Esc closes the sheet).
  - Clear-data confirmation modal (`ClearDataConfirm.svelte`, also persistently mounted in App.svelte) is invoked by `settings/clear-data.ts::showClearDataConfirmation`. Sole entry point post 2026-04-25 is the **About page footer link** — modal → `deleteDB` → reload.
  - `toggleTranslation()` exported from `panel-bridge.ts` for use by command-sheet and other callers.
- **Layout:** mobile + tablet (<1180px) — `.qa-sheet--settings-fs` overrides the shared `.qa-sheet` shape: `inset: 0`, no border, no border-radius, safe-area insets top + bottom, `display: grid` rows = `auto 1fr auto` (preview · body · footer). No internal scroll under default content — sections balance via flex. Desktop (≥1180px) — same component, narrower modal (~440 px) with `max-height: min(720px, 86vh)`; preview + body + footer remain stacked.
- **Night mode (post 2026-04-25):** Moon button in the theme footer drives `data-night-mode` on `<html>`; the persistent `.qa-night-shift` overlay (mounted in `App.svelte`, styled in `styles/surfaces/night-shift.css`, `mix-blend-mode: multiply`) raises its opacity in response. Composes over any theme. Also toggleable via the `n` global reader shortcut (`nav/CommandSheet.svelte`). Sole writer of `settings.nightMode`: `settings/night-mode.ts`.
- **Recitation → Riwayah picker (popover):** triggered by tapping the Recitation source row. Three options shown with full sub-meta. Tap an option → `settings/riwayah.ts::setRiwayah` writes `settings['riwayah']`, emits `SETTINGS_RIWAYAH_CHANGED`, broadcasts cross-tab. Reader re-renders with the new text source, font, and line-height floor; preview band immediately reflects the new glyphs.
- **IDB touch:** `settings` store (theme, fontSize, riwayah, translationVisible, translationId, lineSpacing, wordSpacing, readerMargin, verseSpacing, nightMode).

## Nav drawer

- **Entry:** `src/nav/NavDrawer.svelte` (mounted persistently in `App.svelte`); `openNavDrawer(tab?, subTab?)` / `closeNavDrawer()` / `toggleNavDrawer(tab?)` from `nav/nav-drawer-bridge.ts` trigger it.
- **Files:** `nav/NavDrawer.svelte`, `nav/nav-drawer-bridge.ts`, `nav/EmptyRoute.svelte`, `bookmarks/BookmarksList.svelte`, `review/parse-layer-query.ts`.
- **Purpose:** Mobile (<1180px) full-screen tabbed surface — sole entry point for the surah list, bookmarks list, and per-layer Review jumps. Two top-level mode tabs: **Read** (default) · **Study**. Read mode has two sub-tabs: **Surahs** (default) · **Bookmarks**. Restructured 2026-04-28 to mirror the 2-mode product model (Reading vs Thematic Study). Header carries a tappable QuranAtlas wordmark + ⓘ icon → `#/about`. ✕ closes. No footer.
- **Key behaviors:**
  - Mobile: opened by `MarginHeader` hamburger `≡` and by header swipe-down (`openNavDrawer('read')`). Desktop (≥1180px): opened by `AmbientDock` ⋯ kebab — same component, narrower side-panel layout (`min(80vw, 360px)`).
  - **Read > Surahs sub-tab:** search input (name / number / `s:v` ref) + filter pills (All / ⏱ Recent) + scrolling surah list. Each row shows the number badge, English name, and **Arabic surah title** (`s.name_ar`, RTL, `--qa-font-arabic`) right-aligned. On open, list scrolls so the current surah is centered (`reader.currentSurahNum ?? settings.currentPosition.surah`); current row gets a tinted background, accent left rail, filled-circle number badge, bold name. Tapping a row navigates to `#/s/<n>` and dismisses drawer. Search reuses `state/surahs.svelte.ts` `filter` + `searchQuery` runes (reset to `'all'` / `''` on each open). Search semantics: number 1–114 filters to that surah; number ≥115 filters to surahs whose verse count meets the threshold; free text matches name / Arabic (`name_ar`) / meaning; `S:V` shows the candidate row + "Press Enter to jump" hint and commits on Enter or row tap.
  - **Read > Bookmarks sub-tab:** delegates to shared `bookmarks/BookmarksList.svelte`. Verse-level rows grouped by surah (canonical order). Each row shows the `surah:verse` ref + a truncated Arabic snippet (RTL). Tap a row → emit `BOOKMARK_JUMP_LANDED` + close drawer + `NAVIGATION_NAVIGATE` (`#/s/<n>/<v>`); reader's verse-cell pulses 1s on landing (`bookmarks/pulse.ts`). Swipe-left → reveals Delete button (mobile); desktop hover-`×`. Empty state: "Tap a verse number in the reader to bookmark it." Bookmarks scope to `settings.riwayah`.
  - **Study tab:** top **Hub** row → `#/review`; below, 4 group sections (Speech / Narrative / Themes / Entities) holding the 12 layer rows from `data/tag-layers::LAYER_GROUPS`. Each row carries a hue dot (`var(--lh-{group})`) and `LAYER_LABELS[layer]`. Tapping a layer routes to `#/review?layer=<name>` and dismisses; `Hub.svelte` reads the query via `parse-layer-query::parseLayerFromHash` to set `activeLayer`.
  - Dismissal: backdrop tap, swipe-left, ✕ button, Esc. Drawer state (`isOpen`, `activeTab`, `activeSubTab`) is local; not persisted.
  - Wordmark + ⓘ in header is the sole entry to `#/about` from the drawer.
- **IDB touch:** reads `bookmarks` store (active-riwayah list) via `BookmarksList`, `settings.recentSurahs` (recent filter). No writes from the drawer itself; bookmark deletes flow through `bookmarks/store.ts::del`.

## Bookmarks (Reading mode)

- **Entry / surface:** verse-id roundel in the reader (single-tap toggle); drawer Read>Bookmarks sub-tab; desktop `#/bookmarks` page.
- **Files:** `src/bookmarks/store.ts`, `src/bookmarks/indicator.ts`, `src/bookmarks/click-handler.ts`, `src/bookmarks/pulse.ts`, `src/bookmarks/BookmarksList.svelte`, `src/bookmarks/BookmarksPage.svelte`, `src/styles/surfaces/bookmarks.css`. Schema in `core/db.ts` (`bookmarks` store, DB v5).
- **Purpose:** Lightweight "save this verse" feature. Riwayah-scoped — switching riwayah surfaces a different set; the same `verseKey` carries one bookmark per riwayah. Verse-id glyph (mono `255`) renders with a leading ★ + accent color when bookmarked. Independent from the 12-layer marks system: bookmarks are a 1-tap toggle; marks are a deliberate semantic tagging gesture (long-press / double-tap → editor).
- **Key behaviors:**
  - Single click on `.qa-verse-number` → `bookmarks/click-handler.ts` calls `toggle(verseKey, settings.riwayah)`. Skipped while `tagSession.quickbarOpen` to avoid colliding with fast-tag's switch-active-verse semantics.
  - Indicator cache (`bookmarks/indicator.ts`) holds the active-riwayah verseKey set in memory; reacts to `BOOKMARKS_SAVED` / `BOOKMARKS_DELETED` / `SYNC_BOOKMARKS_UPDATED` / `SETTINGS_RIWAYAH_CHANGED` / `DB_VISIBILITY_VISIBLE`. Decorates each verse via `qa-verse--bookmarked-glyph` class on `[data-verse-key]` mount.
  - List click → emits `BOOKMARK_JUMP_LANDED` + navigates to `#/s/<n>/<v>`. `bookmarks/pulse.ts` polls for the verse element (up to 3s), adds `qa-verse--pulse` for 1s.
  - Cross-tab sync via `safety/sync.ts::broadcastBookmarkChange`.
  - Desktop `/bookmarks` page (`bookmarks/BookmarksPage.svelte`) mirrors the mobile sub-tab. Reachable from `/surahs` page (★ Bookmarks header link) and direct `#/bookmarks` URL. Mobile arrivals at `#/bookmarks` redirect to `lastSurface` and open the drawer with the Bookmarks sub-tab.
- **IDB touch:** `bookmarks` store (sole writer `bookmarks/store.ts`).

## Update banner (rolled-out new build)

- **Entry:** `src/core/UpdateBanner.svelte` (Svelte component, mounted persistently in `App.svelte`).
- **Files:** `core/UpdateBanner.svelte`, `core/constants.ts` (event), `app-bootstrap.ts` (`registerServiceWorker` listens for `updatefound` + `applyAppUpdate` exported), `core/sw-update-poll.ts` (visibility/focus/interval poller), `styles/surfaces/update-banner.css`.
- **Purpose:** Notify the user when a new build was rolled out so they don't keep using a cached version. Surfaces on `Events.APP_UPDATE_AVAILABLE` (emitted when the SW reaches `installed` state with an existing controller).
- **Key behaviors:**
  - **Reload** button calls `applyAppUpdate()` → posts `SKIP_WAITING` to the waiting SW → reloads on `controllerchange`.
  - **✕** dismisses the banner without reloading (state persists until next update).
  - Hidden on dev builds (SW only registered in `import.meta.env.PROD`).
  - SW registered with `updateViaCache: 'none'` so the browser does not serve a stale `/sw.js` from its HTTP cache (default 24h TTL would otherwise hide new builds from installed PWAs).
  - `core/sw-update-poll.ts::startSwUpdatePolling` calls `reg.update()` on `visibilitychange` (when app becomes visible), on `window.focus`, and every 30 minutes — installed PWAs rarely trigger a hard reload, so without this poll the register-time check is the only one that ever fires and users had to clear all data to receive new builds. **Regression guard:** `tests/unit/core/sw-update-poll.test.ts`.
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
- **Purpose:** First-run 6-screen flow — Welcome → Theme → Riwayah → Translation → Shortcuts → Tags intro.
- **Key behaviors:**
  - Progress dots + Skip button from screen 2 onward.
  - Theme picker writes through `settings/theme.ts::setTheme` so the change applies live.
  - **Screen 3 (Choose Riwayah):** three radio cards (Ḥafṣ / Warsh / Qālūn); default Qālūn. Continue or Skip both write `settings['riwayah']` via `settings/riwayah.ts::setRiwayah` (sole writer). `RIWAYAH_OPTIONS` and label/metadata are defined inline in `Onboarding.svelte`.
  - Translation screen (screen 4) lists the shipped pack (Saheeh International today). Picker sub-view shows it as the single option; surfaces a richer picker once a second translation lands.
  - Completion writes `settings.onboardingComplete = true`; CTAs route to `#/s/1` or `#/surahs`.
  - Ambient dock + pill hidden on this route (`AmbientDock.svelte` guards `#/onboarding`; pill's non-reader-routes check naturally hides it).
  - Short-viewport guard (`@media (max-height: 500px)`): drops the 72vh min-height so landscape phones and short windows don't overflow; content top-aligns instead.

## Surah list (desktop only post 2026-04-25)

- **Route:** `#/surahs` — desktop (≥1180px) only. On mobile the route loader replaces the hash with `settings.lastSurface` and opens the **NavDrawer** Surahs tab via `openNavDrawer('read')`. See `app-bootstrap.ts`'s `#/surahs` registration. The mobile path mounts `nav/EmptyRoute.svelte` as a synthetic empty component while the redirect runs in a microtask.
- **Entry:** `src/surahs/SurahList.svelte` (Svelte component, mounted via router `onRouteChange` on desktop)
- **Files:** `surahs/SurahList.svelte`, `surahs/SurahRow.svelte`, `nav/EmptyRoute.svelte` (mobile redirect synthetic component)
- **Purpose:** Desktop browseable directory of all 114 surahs. Name / meaning / type / verse count, Recent filter, search by name/number/ref (`67`, `67:1`, "Mulk"), continue-reading card, ★ Bookmarks header link to `#/bookmarks` (the dedicated bookmark list page replaces the legacy "Bookmarked" filter pill). (Mobile users get the drawer's Read sub-tabs instead — same data, different surface.)
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
- **Purpose:** Mobile/tablet (<1180px) fixed top bar, single row, ~56 px tall. Layout: **hamburger `≡`** · **Arabic surah label** · **settings gear `⚙`**.
- **Key behaviors:**
  - Hamburger → `toggleNavDrawer()`. Toggles open/closed; second tap dismisses. Drawer is the full-screen tabbed surface (Surahs / Review) post 2026-04-25 overhaul — see Nav drawer entry above.
  - Center label (post 2026-04-26): single-line Arabic surah name in `'Amiri Quran'` Mushaf script, 18px (the previous uppercase smallcaps English subline was dropped — Arabic stands alone). **Tap toggles the in-reader Surah Header visibility** via `settings/surah-header-visibility.ts::toggleSurahHeaderHidden` (rune `reader.surahHeaderHidden` mirrors `settings.surahHeaderHidden` IDB key); no-op off the reader route or when no surah is loaded. Tap is routed through `onLabelTouchEnd` for touch (with `preventDefault` to suppress the synthetic click that would otherwise double-toggle) and through `onclick` / `onkeydown` (Enter / Space) for mouse + keyboard. Swipe left/right on label = next/prev surah, clamped 1–114; haptic nudge at boundaries. (No chevron glyph; the destination it implied no longer exists.)
  - Swipe down on header = `openNavDrawer('read')` (post 2026-04-25 — was hash navigation to `#/surahs`).
  - Gear: short tap = `openSettingsSheet()`. Double-tap ≥400 ms = `cycleTheme()` (parity with keyboard `d`).
  - Scroll listener on `#main-content` toggles `qa-mh--hidden` (transform translateY −100%).
  - Swipe classifier: `nav/swipe-gestures.ts::classifySwipe` — pure threshold/velocity math (covered by Vitest unit tests at `tests/unit/nav/swipe-gestures.test.ts`).
- **Reader clearance:** `app-shell.css` pads `#main-content` by `calc(env(safe-area-inset-top) + 60px)` at <768 and 768–1179 breakpoints (was 108 px pre-redesign).

## Fast-tag panel (inline, in-verse)

- **Entry:** `src/reader/VerseTagPanel.svelte` (rendered inside `reader/Verse.svelte` under the translation, gated on `isActive`). Opens when `tagSession.quickbarOpen === true` for that verse.
- **Files:** `reader/VerseTagPanel.svelte`, `reader/Verse.svelte`, `tag/session-bridge.ts`, `state/tag-session.svelte.ts`, `data/tag-layers.ts`
- **Purpose:** Sole per-verse action surface (post 2026-04-25 redesign) — inline suggestion panel under the active verse's translation, grouped by layer group (Speech / Narrative / Themes / Entities) with color-coded `#` glyph per layer hue. Replaces the retired floating `tag/AmbientDock` quickbar. Deep editor (`tag/TagSheet`) reachable only via the `⛶` escalation button or `⌘+Enter`.
- **Key behaviors:**
  - **Entry points:** double-tap verse (touch), right-click verse (desktop), keyboard `m` on centered verse, command-sheet "Mark this verse" (F2). All four call `beginFast(verseKey)`.
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
  - Writes through `marks/store::save`. Legacy `marks/Editor.svelte` remains the canonical double-tap surface.
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
