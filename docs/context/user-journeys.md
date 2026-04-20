# User Journeys

Cross-surface happy paths a user can actually walk today. Each entry shows the trigger, the step sequence, the surfaces involved (see `feature-map.md`), and any IDB persistence (see `data-model.md`). Use this when you want to answer "what can this app do end-to-end?" without booting it.

> ## ⚠ Maintenance rule
>
> **Any UI change — new surface, renamed button, moved flow, altered CTA, reordered screens — requires updating this file in the same commit.** If the change is too small to be worth documenting, it's also too small to change. Journeys drift faster than any other doc in the repo; keeping them honest is the only way they stay useful.
>
> When adding a journey, keep steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, and hover states. Those belong in specs, not context docs.
>
> If a journey is *removed* (feature deleted), move it to the **Deprecated** section at the bottom and note the commit that removed it. Don't silently delete — the absence should be explicit.

Source of truth baseline is the M10 E2E smoke-test matrix from `docs/superpowers/plans/2026-04-16-ambient-navigation-redesign.md`. These journeys were verified at the close of the ambient-navigation redesign.

---

## Keyboard shortcuts

Full, in-app reference is the `?` cheatsheet (see G3). Summary:

**Universal**
- `/` — open command sheet
- `⌘K` / `Ctrl+K` — open command sheet (alias)
- `?` — open shortcut cheatsheet
- `Esc` — close sheet · back from FVR

**Go to** (g-chord)
- `g h` — home / continue reading
- `g s` — surah list
- `g r` — review hub
- `g a` — about
- `g p` — preferences (settings)

**Reader** (only on `#/s/*`, blocked when a text input is focused)
- `j` / `k` — next / previous verse
- `]` / `[` — next / previous surah
- `Home` / `End` — first / last verse
- `m` — mark the centered verse
- `t` — toggle translation visibility
- `+` / `-` — bigger / smaller font
- `0` — reset font size to default
- `d` — cycle theme (light → sepia → dark → auto)

**Command sheet** (while open)
- `↑` / `↓` — move selection
- `Tab` / `Shift+Tab` — next / previous result group
- `Enter` — activate
- `Esc` — close

**Gestures**
- Long-press a verse — open mark editor (touch parity with `m`)

---

## A. First run & session restore

### A1. First-run onboarding → Al-Fatihah

Launch with a clean IDB (or cleared data).

Screens: 1) Welcome, 2) Theme, 3) Translation, 4) Shortcuts (new), 5) Tags intro + final CTAs.

1. App boots → `handleLaunchRestore` checks `settings.onboardingComplete`, finds nothing → navigates to `#/onboarding`.
2. Screen 1 (Welcome): wordmark, blessing, Begin CTA, progress dot 1 lit. No dock, no pill.
3. Tap **Begin** → Screen 2 (Theme): 4 swatches (Light / Sepia / Dark / Auto), Skip button appears.
4. Pick a theme (e.g. Dark) → applied live → tap **Continue** → Screen 3 (Translation): the options are derived from the shipped dataset's `provenance.json`. Today the corpus bundles a single translation (Bridges' Translation by Fadel Soliman), so one option is listed and auto-selected; the lede reads "This translation ships offline with the app." If the dataset ever bundles multiple translations, the screen lists all of them with the first as default.
5. Tap **Continue** → Screen 4 (Shortcuts). (When multiple translations are available, pick one first.)
6. Screen 4 teaches core shortcuts: `/` search; `?` full cheatsheet; `j` / `k` / `]` / `[` verse/surah nav; `m` mark; `t` translation toggle; `+` / `-` / `0` font; `g h` continue reading; long-press to mark. Desktop renders 2-col grid; mobile stacks single-col. Tap **Continue** → Screen 5 (Tags intro).
7. Screen 5: 2:286 verse preview with 3 sample chips, privacy note. Tap **Open Al-Fatihah** → `settings.onboardingComplete = true`, `#/s/1`, ambient chrome returns.

**Surfaces:** Onboarding → Reader. **Persistence:** `settings.theme`, `settings.translationId`, `settings.onboardingComplete`.

**Alt paths:**
- Any screen from 2 onward, tap **Skip** → same completion write, land on `#/s/1`.
- Screen 5, tap **Browse all surahs** → completion write, land on `#/surahs`.

### A4. Power up (onboarding shortcuts screen)

Screen 4 of the onboarding flow (see A1).

1. Shown after translation selection; lists 9 curated rows: `/`, `?`, `j`/`k` verse nav, `]`/`[` surah nav, `m` mark, `t` translation, `+`/`-`/`0` font, `g h` continue reading, long-press gesture. Lede reminds users they can press `?` anywhere for the full list.
2. Desktop (≥1180px) shows rows in a 2-column grid; mobile stacks in single column.
3. Tap **Continue** → Screen 5 (Tags intro).

**Landscape phone / short viewport:** When viewport height is under 500px (phones in landscape, small-height browser windows), the onboarding page drops its `72vh` min-height and top-aligns content with reduced hero padding, so no content clips off-screen.

### A2. Reload stays on the last surface

Any route other than `#/onboarding`.

1. Browser refresh → hash cleared → `ROUTER_LAUNCH_RESTORE` fires.
2. Onboarding check passes → `settings.lastSurface` read → router navigates there with replace.

**Surfaces:** any. **Persistence:** reads `settings.lastSurface` (written by the router after every successful mount).

---

## B. Reader & ambient chrome

### B1. Tap to surface chrome

On the reader.

1. Surah loads → dock briefly surfaces at bottom (then auto-fades after ~3s).
2. Tap reader body → dock fades in again, pill fades in at top showing `{surah}:{verse} · {Name}` + ⌘K hint.
3. No further input for ~3s → both fade out.

**Surfaces:** Reader, Ambient dock, Ambient pill. **Persistence:** none.

**Tablet+ variant:** Dock items grow from 38×38 to 42×42 for easier iPad tap targets (≥768px). Auto-hide behavior unchanged.

**Desktop variant:** On viewports ≥1180px, the reader renders as a single centered column capped at ~960px. Each verse stacks Arabic (justified, RTL — fills the full column width and wraps naturally) on top, translation below. Toggling Hide translation in Settings simply hides the translation block; the column width is unchanged.


**Desktop variant (≥1180px):** Dock items expand to labeled pills — the visually-hidden text label ("Read", "Search", "Review", "More") unhides inline next to each glyph. Positioning stays bottom-centered.

### B2. Scroll hides dock, scroll-to-top surfaces it

1. Scroll down in reader → dock hides.
2. Scroll back near the top → dock surfaces again.

**Surfaces:** Reader, Ambient dock.

### B3. Tap verse number for edge indicator

1. Tap the number circle on any verse → thin accent bars appear at the verse's row on both viewport edges (~1.6s).
2. Pill label updates to the tapped verse.

**Surfaces:** Reader, Ambient pill. **Persistence:** `positions.s<n>` updated (savedAt + verse).

### B4. Non-reader routes → persistent dock, no pill

1. Navigate to `#/surahs`, `#/review`, `#/about`, etc. → dock is visible and doesn't fade.
2. Ambient pill is hidden on all non-reader routes.

**Surfaces:** Ambient dock, Ambient pill.

### B5. Font slider live preview

From Settings sheet (see D1).

1. Drag the font slider → `settings.fontSize` writes → `SETTINGS_FONT_SIZE_CHANGED` fires.
2. Reader re-renders text at the new scale; preview line in settings also scales.

**Surfaces:** Settings sheet, Reader.

**Desktop variant (viewport ≥1180px):**
The reader renders a single centered column (max ~960px). Each verse stacks Arabic (RTL, justified, filling the full column width and wrapping naturally) on top, translation below with a soft separator. Toggling translation off in Settings hides the translation block; column width is unchanged. Long-press works on either cell to open the mark editor for that verse. All other behaviors (scroll position persistence, bookmark edge indicators, verse numbers) are unchanged.

### B6. Auto theme follows OS

From Settings sheet with Auto swatch selected.

1. OS/browser flips `prefers-color-scheme` → `settings/theme.ts` listener swaps `<html data-theme>`.
2. Reader and all chrome reflect the new theme without reload.

**Surfaces:** Settings sheet, all surfaces (theme applies globally).

---

## C. Marking a verse

### C1. Long-press → open mark editor

On the reader.

1. Long-press (or right-click) a verse → mark editor bottom sheet slides up.
2. Header shows "New mark" + the verse ref; verse-preview card shows Arabic + English; note textarea is empty; tag chips are the 16 seed tags (or the user's used-tags list).

**Surfaces:** Reader, Mark editor. **No persistence yet.**

**Desktop variant (≥1180px):** Mark editor sheet widens to 820px and centers true-vertically (verse-hero modal). The verse quote becomes a full-width hero banner at the top; below it the body splits into 2 columns: note + label on the left, tag search + chips on the right. The bottom grip is hidden; sheet scales in via animation. All interactions (long-press, tag select, note edit, save) work identically.

### C2. Multi-tag selection

Inside mark editor.

1. Tap a tag chip in the All region → moves to the Selected strip with ×; count badge increments.
2. Repeat for more tags. Tap × on a Selected chip → moves back to All.

**Surfaces:** Mark editor.

### C3. Create a new tag inline

Inside mark editor.

1. Type a new label (e.g. `taqwa`) in the search input → no match found → "+ create 'taqwa'" chip appears.
2. Tap the create chip → new tag moves to Selected, search clears.

**Surfaces:** Mark editor.

### C4. Note + save

Inside mark editor with ≥1 tag selected.

1. Type into the note textarea → Save button enables.
2. Tap **Save** → `marks/store.ts::save` writes to IDB → `MARKS_SAVED` fires → `broadcastMarkChange` fires across tabs → sheet closes → reader shows gold left-edge on the verse.

**Surfaces:** Mark editor, Reader (indicator). **Persistence:** `marks[verseKey]` with tags/note/timestamps.

### C5. Delete with undo

Inside mark editor on an existing mark.

1. Tap **Delete** → footer swaps to inline "Delete this mark?" confirm.
2. Tap the red **Delete** → `marks/store.ts::del` writes → `MARKS_DELETED` fires → sheet closes → undo toast appears at bottom.
3. Tap **Undo** before it expires (~5s) → mark restored with original note/tags → gold edge returns.

**Surfaces:** Mark editor, core undo toast, Reader. **Persistence:** delete then re-insert on undo.

### C6. Long-press has no alternative gesture

1. Right-click or long-press a verse → only the mark editor opens.
2. No browser context menu, no multi-action sheet, no preview popover.

This is a cross-cutting rule, not a feature — preserved intentionally.

> **Invariant (formerly `CLAUDE.md` Rule 4).** The mark editor is the **sole action surface** for a single verse. Long-press, right-click, and the command sheet's "Mark this verse" (F2) all route to it. Do **not** introduce a contextual menu, multi-action sheet, or preview popover as an alternative per-verse action surface. The verse-number tap (B3) surfaces edge indicators only — that's a navigation affordance, not a per-verse action, and is unaffected by this invariant.

---

## D. Settings & appearance

### D1. Open Settings sheet

1. Open Ambient dock → tap **⋯** → More sheet opens.
2. Tap **Settings** → More sheet closes → Settings sheet opens with current theme swatch active, font slider + preview, Reading section (translation toggle + picker link).

**Surfaces:** Ambient dock, More sheet, Settings sheet.

**Tablet+ variant (≥768px):** Settings sheet opens as a centered modal (~480px wide, top 10vh) instead of sliding up from the bottom. Previously this happened at 720px; now aligns with the canonical tablet breakpoint.

**Font size.** 5-step slider: xs / sm / md / lg / xl (0.75 → 1.3). Preview shows a short English + Arabic line that scales with the slider. English renders on the left, Arabic on the right. Keyboard: `⌘↑` (Mac) / `Ctrl+↑` (others) bumps up; `⌘↓` / `Ctrl+↓` bumps down; announced to screen readers. Guarded against focused inputs.

### D2. Pick a translation

Inside Settings sheet. Available translations are sourced from the dataset's `provenance.json` at render time — the picker never surfaces options that aren't actually present in the corpus.

1. The **Show translation** row's subtitle shows the name of the currently-selected translation (e.g. "Bridges' Translation").
2. When only one translation is bundled (today's dataset), the row body is non-interactive — there's no picker sub-view to open. `settings.translationId` is still auto-resolved to the bundled translation's id on first paint.
3. When multiple translations are bundled, tapping the row body opens the Translation picker sub-view. Tap an option → `settings.translationId` writes → returns to main Settings view with subtitle updated.
4. Toggle the translation-visibility switch → `settings.translationVisible` rune updates → reader's `$effect` on the rune re-renders with the translation line hidden/shown.

**Surfaces:** Settings sheet, Reader. **Persistence:** `settings.translationId`, `settings.translationVisible`.

### D3. Theme swap (explicit)

Inside Settings sheet.

1. Tap a theme swatch (Light / Sepia / Dark / Auto) → `settings/theme.js::setTheme` writes `settings.theme` and flips `<html data-theme>`.
2. All surfaces re-theme live. Auto additionally attaches a `prefers-color-scheme` listener.

### D4. Clear all data

1. From More sheet or Settings sheet (wherever the Clear data link lives) → **Clear data** → confirmation dialog appears.
2. Confirm → `safety/sync.js::suppressNextVersionChange()` arms, then `deleteDB()` runs → DB gone → page reloads → first-run onboarding (A1) starts fresh.
3. Cancel → dialog closes, nothing changes.

**Surfaces:** More sheet → clear-data confirmation → full app reset.

---

## E. Reviewing marks

### E1. Open the review hub

1. Dock → tap **Review** glyph (or ⌘K → "Review hub" → Enter) → `#/review`.
2. Hub renders: 12-layer selector segment (Thread active by default), group-by segment (Value / Surah / Date), value chips for the active layer, sort dropdown, surah filter dropdown, mark cards for the first 30 results.

**Surfaces:** Review hub. **Persistence:** reads `positions.review` for view state (activeLayer/activeValue/groupBy/sort/filters).

### E2. Switch layer + value chip

Inside review hub.

1. Tap a layer tab (e.g. **Audience**) → `activeLayer` switches, `activeValue` resets, value chips reload for that layer.
2. Tap a value chip (e.g. `muminin`) → `activeValue = 'muminin'`, card list filters to marks with that canonical value in the audience layer.
3. Tap the same chip again → `activeValue` clears; all marks for that layer shown.

**Persistence:** each tap writes `positions.review.activeLayer` / `positions.review.activeValue`.

### E2b. Switch group-by bucket list

Inside review hub.

The "Group by" segment changes which bucket list the rail shows, not how cards are grouped. Cards always render as a flat, unique, single-column list sorted by most-recent update — no duplicates when a mark carries multiple values.

1. Tap **Surah** segment → rail shows surah buckets; cards remain flat.
2. Tap **Date** segment → rail shows month buckets; cards remain flat.
3. Tap **Value** segment (default) → rail shows canonical values for the active layer.

**Persistence:** each tap writes `positions.review.groupBy`.

### E2c. Filter by multiple values (desktop)

In Value mode on desktop (≥1180px).

1. Tap a value rail row → OR filter applied; cards show marks that have that canonical value in the active layer.
2. Tap another value rail row → OR filter expands; cards show marks carrying *either* value.
3. A chip bar appears above the cards showing active value chips with `×` to remove each.
4. `Clear all` removes all active value filters.

Surah and Date modes remain single-select. Mobile keeps the chip strip and single-select behavior.

**Persistence:** `positions.review.activeValue`.

### E3. Tap thread chip → FVR deep link

Inside review hub (any card — threads layer only).

1. Tap a thread chip on a mark card → browser navigates to `#/threads/<tag>`.
2. FVR renders: compact centered header (layer label "Thread", color dot, canonical value, `n verses · n surahs`, hairline) + flat list of mark cards for that thread value.

**Surfaces:** Review hub → FVR. **Persistence:** `settings.lastSurface = #/threads/<tag>`, `positions.review.view = 'fvr'` (reset to `'all'` when hub is entered directly via `#/review`).

### E4. FVR back to hub

Inside FVR.

1. Tap **← Marks** → `#/review` → review hub re-renders with layer segment, group-by pill, and all cards.

### E5. Filter by value chip + surah

Inside review hub.

1. Tap a value chip in the chip strip → filter chip appears in active-filters row; hub re-renders with only cards having that canonical value in the active layer.
2. Pick a surah from the surah dropdown → second filter chip → hub shows intersection.
3. Tap × on a chip → that filter clears; tap **Clear all** → both clear.

**Persistence:** `positions.review.activeValue`, `positions.review.surahFilter`.

**Desktop variant (≥1180px):** The mobile chip strip and dropdowns are replaced by a sticky 220px left rail containing the layer selector (12 rows) + group-by segment + bucket rows. In Value mode, multiple rows can be tapped for an OR filter (see E2c); in Surah/Date modes, a single row is selected at a time. Tapping an active row clears it. FVR (`#/<layer>/:value`) keeps its existing centered no-rail layout at desktop.

### E6. FVR via direct deep link

Navigating directly to a layer-value URL.

1. User navigates to `#/people/Moses` → router passes `{ layer: 'people', value: 'Moses' }` to Hub.svelte → `validateLayerParam('people', 'Moses')` canonicalizes to `musa`.
2. `getByLayerCanonical('people', 'musa')` fetches matching marks → FVR renders with layer label "People", value "musa".
3. If no marks found for that layer+value → "Not found" state, link back to `#/review`.
4. `settings.lastSurface` persists as `#/people/musa` for session restore.

**Surfaces:** FVR. **Persistence:** `settings.lastSurface`, `positions.review` (view: 'fvr').

---

## F. Navigation (command sheet, surah list, keyboard)

### F1. Command sheet direct verse-ref

1. Press **⌘K** (or tap Search glyph in dock) → command sheet opens.
2. Type `2:255` → preview card shows (Arabic of Ayat al-Kursi + English); "Open verse" row is focused.
3. Press Enter → `NAVIGATION_NAVIGATE { surah: 2, verse: 255 }` → `app-bootstrap.ts` routes to `#/s/2/255` → reader scrolls to 2:255.

**Surfaces:** Command sheet → Reader.

**Tablet+ variant:** Keyboard-shortcut footer hint (`⌘K`, `esc`) is explicitly shown at ≥768px (hidden below 640px mobile).

**Desktop variant (≥1180px):** Command sheet caps at 640px wide; result rows stay comfortably readable instead of stretching edge-to-edge.

### F2. Mark a verse from command sheet

Inside command sheet with a verse preview card (F1).

1. Arrow-down past "Open verse" → "Mark this verse" row focused.
2. Enter → command sheet closes → mark editor opens for that verse.

**Surfaces:** Command sheet → Mark editor.

### F3. Tag search → FVR

Inside command sheet.

1. Type `mer` → Tags group in the results shows `mercy` with count badge.
2. Enter → `#/t/mercy` FVR (same landing as E3).

**Surfaces:** Command sheet → FVR.

### F4. Surah directory

1. Dock → **Search** (or keyboard shortcut `G` then `S`, or command sheet → "Browse all surahs") → `#/surahs`.
2. Directory renders: 114 rows. Search `67` → 1 match, "Jumping to #67" eyebrow, Al-Mulk row (with gold left-edge if bookmarked).
3. Tap row → `#/s/67`.

**Surfaces:** Surah list → Reader.

### F5. Continue-reading card

On surah list.

1. With search cleared and All filter active → Continue-reading card shows at top with the last-read position.
2. Tap → navigates to that surah + verse.

**Persistence:** read from most recent `positions.s<n>` via `getMostRecentPosition`.

### F6. Keyboard navigation

1. Tab focus lands on the ambient pill → Enter opens command sheet.
2. Inside command sheet: Arrow-up/down moves focus, Enter activates, Esc closes.
3. Global shortcut `G` then `S` → surah list.

---

## G. About

### G1. Open About

1. Dock → **⋯** → More sheet → **About** → `#/about`.
2. About renders: wordmark, mission, 54:17 Arabic blessing + translation, 2×2 stat grid (Marks / Tags / Surahs / % Qur'an), attribution list, PWA install button (if install prompt has been captured), version line. No back link.

**Surfaces:** Ambient dock → More sheet → About.

### G3. Shortcut cheatsheet (`?`)

From any non-text-input context.

1. Press `?` → bottom sheet slides up titled "Keyboard shortcuts".
2. Sheet lists every binding grouped into 4 sections: Universal, Go to, Reader, Command sheet — plus the long-press gesture row.
3. Tap backdrop, tap `×`, or press `Esc` → sheet closes; focus returns to the prior surface. No persistence.

**Surfaces:** any route → Shortcuts sheet.

### G2. Install PWA

On About with a captured install prompt.

1. Tap **Install App** → `promptInstall()` runs browser install flow.
2. On accept → button text becomes "Installed!" and disables; `OFFLINE_INSTALL_COMPLETE` fires (no UI listener today).

---

## H. Offline

### H1. Reload offline

With the service worker active and the dataset cached.

1. DevTools → Network → Offline.
2. Reload → reader still loads (shell + dataset served from cache); command sheet still works; ⌘K → `2:255` → preview renders from cache.

**Surfaces:** all major surfaces degrade gracefully. **Persistence:** none new; reads from IDB + SW cache.

---

## I. Cross-tab coherence

### I1. Another tab marks a verse

Two tabs open on `#/s/1`.

1. Tab A long-presses 1:5 → saves a mark → `broadcastMarkChange(['1:5'])` fires.
2. Tab B's `safety/sync.ts` receives → emits `SYNC_UPDATE_RECEIVED { verseKeys: ['1:5'] }`.
3. Tab B's reader indicator refreshes → gold edge appears on 1:5 without reload.

**Surfaces:** Reader (both tabs). **Persistence:** IDB is shared; no double-write.

### I2. Another tab deletes the mark I'm editing

1. Tab A has mark editor open for 2:255.
2. Tab B deletes 2:255 → broadcast → Tab A's editor receives `SYNC_UPDATE_RECEIVED` with that key → editor closes silently (no error, no toast).

**Surfaces:** Mark editor.

### I3. Another tab runs Clear Data

1. Tab A running normally.
2. Tab B runs Clear Data → `suppressNextVersionChange()` keeps Tab B's banner off → `deleteDB` triggers `onversionchange` in Tab A.
3. Tab A's `safety/sync.ts` shows a "Data was cleared in another tab — reload" banner.

---

## Deprecated

### E3 (legacy). `#/t/:tag` FVR route — removed in commit cb4e3a2

The old FVR route `#/t/:tag` (e.g. `#/t/mercy`) dispatched Hub.svelte with a `tag` prop and filtered the threads layer only. It was replaced by the `#/<layer>/:value` scheme in cluster-3-review-hub-fvr (commits cb4e3a2, 3fec509). Pre-release — no users when removed. The new canonical route for the same content is `#/threads/mercy`.
