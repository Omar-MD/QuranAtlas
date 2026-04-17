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

## A. First run & session restore

### A1. First-run onboarding → Al-Fatihah

Launch with a clean IDB (or cleared data).

1. App boots → `handleLaunchRestore` checks `settings.onboardingComplete`, finds nothing → navigates to `#/onboarding`.
2. Screen 1 (Welcome): wordmark, blessing, Begin CTA, progress dot 1 lit. No dock, no pill.
3. Tap **Begin** → Screen 2 (Theme): 4 swatches (Light / Sepia / Dark / Auto), Skip button appears.
4. Pick a theme (e.g. Dark) → applied live → tap **Continue** → Screen 3 (Translation): 4 options with Saheeh as default.
5. Pick a translation (e.g. Pickthall) → tap **Continue** → Screen 4 (Tags intro): 2:286 verse preview with 3 sample chips, privacy note.
6. Tap **Open Al-Fatihah** → `settings.onboardingComplete = true`, `#/s/1`, ambient chrome returns.

**Surfaces:** Onboarding → Reader. **Persistence:** `settings.theme`, `settings.translationId`, `settings.onboardingComplete`.

**Alt paths:**
- Any screen from 2 onward, tap **Skip** → same completion write, land on `#/s/1`.
- Screen 4, tap **Browse all surahs** → completion write, land on `#/surahs`.

### A2. Reload stays on the last surface

Any route other than `#/onboarding`.

1. Browser refresh → hash cleared → `ROUTER_LAUNCH_RESTORE` fires.
2. Onboarding check passes → `settings.lastSurface` read → router navigates there with replace.

**Surfaces:** any. **Persistence:** reads `settings.lastSurface` (written by the router after every successful mount).

---

## B. Reader & ambient chrome

### B1. Tap to surface chrome

On the reader.

1. Tap reader body → dock fades in at bottom, pill fades in at top showing `{surah}:{verse} · {Name}` + ⌘K hint.
2. No further input for ~3s → both fade out.

**Surfaces:** Reader, Ambient dock, Ambient pill. **Persistence:** none.

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
The reader renders Arabic and translation in parallel two-column layout. Each verse occupies one row; Arabic on one side, translation on the other, top-aligned. Toggling translation off in Settings collapses the reader to a single centered column (max ~900px). Long-press works on either cell to open the mark editor for that verse. All other behaviors (scroll position persistence, bookmark edge indicators, verse numbers) are unchanged.

### B6. Auto theme follows OS

From Settings sheet with Auto swatch selected.

1. OS/browser flips `prefers-color-scheme` → `settings/theme.js` listener swaps `<html data-theme>`.
2. Reader and all chrome reflect the new theme without reload.

**Surfaces:** Settings sheet, all surfaces (theme applies globally).

---

## C. Marking a verse

### C1. Long-press → open mark editor

On the reader.

1. Long-press (or right-click) a verse → mark editor bottom sheet slides up.
2. Header shows "New mark" + the verse ref; verse-preview card shows Arabic + English; note textarea is empty; tag chips are the 16 seed tags (or the user's used-tags list).

**Surfaces:** Reader, Mark editor. **No persistence yet.**

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
2. Tap **Save** → `marks/store.js::save` writes to IDB → `MARKS_SAVED` fires → `broadcastMarkChange` fires across tabs → sheet closes → reader shows gold left-edge on the verse.

**Surfaces:** Mark editor, Reader (indicator). **Persistence:** `marks[verseKey]` with tags/note/timestamps.

### C5. Delete with undo

Inside mark editor on an existing mark.

1. Tap **Delete** → footer swaps to inline "Delete this mark?" confirm.
2. Tap the red **Delete** → `marks/store.js::del` writes → `MARKS_DELETED` fires → sheet closes → undo toast appears at bottom.
3. Tap **Undo** before it expires (~5s) → mark restored with original note/tags → gold edge returns.

**Surfaces:** Mark editor, core undo toast, Reader. **Persistence:** delete then re-insert on undo.

### C6. Long-press has no alternative gesture

1. Right-click or long-press a verse → only the mark editor opens.
2. No browser context menu, no multi-action sheet, no preview popover.

This is a cross-cutting rule, not a feature — preserved intentionally.

---

## D. Settings & appearance

### D1. Open Settings sheet

1. Open Ambient dock → tap **⋯** → More sheet opens.
2. Tap **Settings** → More sheet closes → Settings sheet opens with current theme swatch active, font slider + preview, Reading section (translation toggle + picker link).

**Surfaces:** Ambient dock, More sheet, Settings sheet.

### D2. Pick a translation

Inside Settings sheet.

1. Tap **Show translation** row → sheet swaps to Translation picker sub-view listing the 4 options (Saheeh / Pickthall / Yusuf / Khattab).
2. Tap an option → `settings.translationId` writes → returns to main Settings view with subtitle updated.
3. Toggle the translation-visibility switch → `SETTINGS_TRANSLATION_CHANGED { visible }` fires → reader hides/shows the translation line on next render.

**Note:** only the Bridges' translation currently ships in the dataset. The picker's 4 options are persisted as a preference but the reader renders one translation source regardless — picker support is stubbed pending additional translations in the dataset.

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
2. Hub renders: 3-segment grouping pill (Tag / Surah / Date) with Tag active by default, sort dropdown, tag + surah filter dropdowns, mark cards for the first 30 results.

**Surfaces:** Review hub. **Persistence:** reads `positions.review` for view state (groupBy/sort/filters).

### E2. Swap grouping

Inside review hub.

1. Tap **Surah** segment → cards regroup under surah headers.
2. Tap **Date** segment → flat list, newest first.
3. Tap **Tag** segment → back to default; multi-tagged marks appear under each tag.

**Persistence:** each tap writes `positions.review.groupBy`.

### E3. Tap chip → FVR deep link

Inside review hub (any card).

1. Tap a tag chip on a mark card → browser navigates to `#/t/<tag>`.
2. FVR renders: compact centered header (Tag label, color dot, tag name, `n verses · n surahs`, hairline) + flat list of mark cards for that tag.

**Surfaces:** Review hub → FVR. **Persistence:** `settings.lastSurface = #/t/<tag>`, `positions.review.view = 'fvr'`.

### E4. FVR back to hub

Inside FVR.

1. Tap **← Marks** → `#/review` → review hub re-renders with segment pill and all cards.

### E5. Filter by tag + surah

Inside review hub (tag-grouped view).

1. Pick a tag from the tag dropdown → filter chip appears in active-filters row; hub re-renders with only cards carrying that tag (only that tag's group shown).
2. Pick a surah from the surah dropdown → second filter chip → hub shows intersection.
3. Tap × on a chip → that filter clears; tap **Clear all** → both clear.

**Persistence:** `positions.review.activeTag`, `positions.review.surahFilter`.

---

## F. Navigation (command sheet, surah list, keyboard)

### F1. Command sheet direct verse-ref

1. Press **⌘K** (or tap Search glyph in dock) → command sheet opens.
2. Type `2:255` → preview card shows (Arabic of Ayat al-Kursi + English); "Open verse" row is focused.
3. Press Enter → `NAVIGATION_NAVIGATE { surah: 2, verse: 255 }` → app.js routes to `#/s/2/255` → reader scrolls to 2:255.

**Surfaces:** Command sheet → Reader.

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
2. Tab B's `safety/sync.js` receives → emits `SYNC_UPDATE_RECEIVED { verseKeys: ['1:5'] }`.
3. Tab B's reader indicator refreshes → gold edge appears on 1:5 without reload.

**Surfaces:** Reader (both tabs). **Persistence:** IDB is shared; no double-write.

### I2. Another tab deletes the mark I'm editing

1. Tab A has mark editor open for 2:255.
2. Tab B deletes 2:255 → broadcast → Tab A's editor receives `SYNC_UPDATE_RECEIVED` with that key → editor closes silently (no error, no toast).

**Surfaces:** Mark editor.

### I3. Another tab runs Clear Data

1. Tab A running normally.
2. Tab B runs Clear Data → `suppressNextVersionChange()` keeps Tab B's banner off → `deleteDB` triggers `onversionchange` in Tab A.
3. Tab A's `safety/sync.js` shows a "Data was cleared in another tab — reload" banner.

---

## Deprecated

(None yet. When a journey is removed in a future change, move its entry here with the commit SHA that removed it, so the change is explicit.)
