---
surface: navigate
src_paths:
  - 'src/nav/CommandSheet.svelte'
  - 'src/nav/command-sheet-bridge.ts'
  - 'src/nav/NavDrawer.svelte'
  - 'src/nav/nav-drawer-bridge.ts'
  - 'src/nav/EmptyRoute.svelte'
  - 'src/nav/reader-actions.js'
  - 'src/nav/shortcuts-sheet.js'
  - 'src/nav/swipe-gestures.ts'
  - 'src/surahs/**'
  - 'src/bookmarks/**'
owns_stores:
  - bookmarks
test_paths:
  unit:
    - 'tests/unit/nav/**'
    - 'tests/unit/surahs/**'
    - 'tests/unit/bookmarks/**'
  e2e:
    - 'tests/e2e/journey-f-navigation*.spec.js'
---

# Surface: navigate

> Cross-surface navigation. Command sheet (⌘K), nav drawer (mobile full-screen tabbed), surah directory (desktop standalone, mobile via drawer), bookmarks (Reading mode + drawer Bookmarks tab), keyboard shortcuts.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| `⌘K` / Search glyph in dock | keyboard / tap | open command sheet |
| Hamburger ≡ on MarginHeader (mobile) | tap | open nav drawer |
| MarginHeader swipe-down (mobile) | gesture | `openNavDrawer('read')` |
| AmbientDock ⋯ (desktop) | tap | open nav drawer |
| `G` then `S` | keyboard | `#/surahs` (desktop) / drawer Surahs tab (mobile) |
| `?` from any non-input context | keyboard | shortcuts cheatsheet sheet |
| Hash `#/surahs` (desktop ≥1180 px) | URL | render standalone surah directory |
| Hash `#/surahs` (mobile <1180 px) | URL | hard-redirect to `lastSurface` + open drawer |
| Verse number tap → bookmark toggle | tap | save/delete bookmark for verseKey at active riwayah |
| Bookmark row tap (drawer Bookmarks tab) | tap | drawer closes, reader navigates to verse, landing pulses 1 s |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/bookmarks/BookmarksList.svelte` | Shared bookmark list — renders grouped-by-surah verse rows for the active |
| `src/bookmarks/BookmarksPage.svelte` | Desktop /bookmarks page — verse-level list grouped by surah. |
| `src/bookmarks/click-handler.ts` | Document-level pointer handler that toggles a bookmark when the user |
| `src/bookmarks/indicator.ts` | Bookmark verse-id glyph indicator. |
| `src/bookmarks/pulse.ts` | Pulse-highlight a verse on bookmark-jump landing. |
| `src/bookmarks/store.ts` | IDB CRUD for bookmarks (DB v5). |
| `src/nav/CommandSheet.svelte` | Module-level re-export so callers can do: |
| `src/nav/EmptyRoute.svelte` | intentionally empty |
| `src/nav/NavDrawer.svelte` | Mobile (<1180px): full-screen drawer with two top-level mode tabs: |
| `src/nav/command-sheet-bridge.ts` | Bridge for the CommandSheet (⌘K) overlay. Migrated to |
| `src/nav/nav-drawer-bridge.ts` | Imperative bridge for the NavDrawer Svelte component. Migrated to |
| `src/nav/reader-actions.js` | Reader action API backing the single-key shortcuts (j/k/[/]/Home/End/m). |
| `src/nav/shortcuts-sheet.js` | Shortcuts cheatsheet — opened by `?` (also reachable from More → Shortcuts |
| `src/nav/swipe-gestures.ts` | Pure swipe-classification helpers for MarginHeader gestures. |
| `src/surahs/SurahList.svelte` | ---- data loaded on mount ---- |
| `src/surahs/SurahRow.svelte` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Command sheet

- `⌘K` (mobile + desktop) or Search glyph in dock → command sheet opens.
- Type verse-ref (`2:255`) → preview card renders (Arabic + English); "Open verse" row focused. Enter → `NAVIGATION_NAVIGATE { surah: 2, verse: 255 }` → `app-bootstrap.ts` routes to `#/s/2/255`.
- ArrowDown past "Open verse" → "Mark this verse" row → Enter → close + `beginFast(verseKey)` → fast-tag inline panel (mark surface).
- Tag search: type partial label (e.g. `mer`) → Tags group shows `mercy` with count badge → Enter → `#/threads/mercy` FVR (review surface).
- Tablet+ (≥768 px): keyboard-shortcut footer hint (`⌘K`, `esc`) shown.
- Desktop (≥1180 px): caps at 640 px wide.

### Nav drawer (mobile, full-screen, restructured 2026-04-28)

Hamburger or swipe-down opens full-screen drawer. Two top-level mode tabs:

**Read mode** (default), two sub-tabs:
- **Surahs** (default): search input + filter pills (All / ⏱ Recent) + scrolling surah list, auto-scrolled to and highlighting currently-reading surah. Each row: number badge + English name + Arabic surah title (`s.name_ar`, RTL, `--qa-font-arabic`) right-aligned.
- **Bookmarks**: verse-level rows grouped by surah (canonical order, ascending verse within section); each row: `surah:verse` ref + truncated Arabic snippet (RTL). Tap row → drawer closes, reader navigates, landing pulses 1 s. Swipe-left row → reveals Delete (mobile); desktop hover-`×`. Empty-state copy: "Tap a verse number in the reader to bookmark it." Bookmarks scope to active riwayah — switching riwayah surfaces a different set.

**Study mode**: top **Hub** row (→ `#/review`) + 12 layer rows in 4 grouped sections (Speech / Narrative / Themes / Entities). Tap layer → `#/review?layer=<name>`.

Header carries tappable QuranAtlas wordmark + ⓘ icon → `#/about`.

`✕` closes; backdrop tap, swipe-left, Esc also dismiss. Drawer state local; not persisted.

Desktop kebab path keeps narrow side-panel size but uses same tabbed component.

### Surah directory (`#/surahs`, desktop ≥1180 px only)

- 114 rows. Search input filters. Match `67` → 1 result, "Jumping to #67" eyebrow, Al-Mulk row (with gold left-edge if bookmarked).
- Tap row → `#/s/{n}`.
- **Continue-reading card** at top: with search cleared and All filter active, shows last-read position. Tap → navigates to surah + verse. Reads from `settings.currentPosition` via `loadGlobalPosition`.

### Bookmarks (riwayah-scoped, shipped 2026-04-28)

Verse-level. Single-tap toggle: tap verse number in reader → `bookmarks/store.ts::toggle(verseKey, riwayah)` writes / removes; emits `BOOKMARKS_SAVED` / `BOOKMARKS_DELETED`. Reader indicator (`bookmarks/indicator.ts`) updates gold left-edge.

Drawer Bookmarks tab is the read surface (above). Empty-state when no bookmarks exist for active riwayah.

Pulse animation (`bookmarks/pulse.ts`) — landing-flash on jumped-to verse fires `BOOKMARK_JUMP_LANDED`.

### Shortcut cheatsheet (`?`)

Press `?` → bottom sheet slides up titled "Keyboard shortcuts". Lists every binding grouped into 4 sections: Universal, Go to, Reader, Command sheet — plus double-tap gesture row. Backdrop tap, `×`, Esc → close. No persistence.

### Global keyboard reference

Full in-app reference is the `?` cheatsheet. Summary:

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
- `n` — toggle night-mode
- `+` / `-` — bigger / smaller font
- `0` — reset font size to default
- `d` — cycle theme (light → sepia → dark → auto)

**Command sheet** (while open)
- `↑` / `↓` — move selection
- `Tab` / `Shift+Tab` — next / previous result group
- `Enter` — activate
- `Esc` — close

**Gestures**
- Double-tap a verse (touch) → fast-tag inline panel (parity with `m`)
- Right-click a verse (desktop) → fast-tag inline panel
- `⌘/Ctrl + Enter` from fast-tag → escalate to deep TagSheet

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `bookmarks`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `bookmarks` store body

- **keyPath:** `id` (string, format `<riwayah>:<surah>:<verse>` — riwayah-scoped).
- **Indexes:** `by-riwayah` on `riwayah`, `by-updated` on `updatedAt`.
- **Sole writer:** `src/bookmarks/store.ts`.
- **Riwayah scoping:** the same verse-key bookmarked under Hafs vs Warsh are separate records. Switching riwayah surfaces a different set in the drawer Bookmarks tab.

```ts
{
  id: string,           // 'hafs:2:255'
  riwayah: 'hafs' | 'warsh' | 'qaloon',
  surah: number,
  verse: number,
  verseKey: string,     // '2:255'
  arabicSnippet: string,
  createdAt: number,
  updatedAt: number,
}
```

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `bookmark:jump-landed` | `Events.BOOKMARK_JUMP_LANDED` | `src/bookmarks/BookmarksList.svelte:104` |
| `bookmarks:deleted` | `Events.BOOKMARKS_DELETED` | `src/bookmarks/store.ts:59` |
| `bookmarks:save-failed` | `Events.BOOKMARKS_SAVE_FAILED` | `src/bookmarks/store.ts:42` |
| `bookmarks:saved` | `Events.BOOKMARKS_SAVED` | `src/bookmarks/store.ts:38` |
| `navigation:navigate` | `Events.NAVIGATION_NAVIGATE` | `src/bookmarks/BookmarksList.svelte:106`, `src/nav/CommandSheet.svelte:303`, `src/nav/CommandSheet.svelte:305`, `src/nav/NavDrawer.svelte:194`, `src/surahs/SurahList.svelte:167` |
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/nav/shortcuts-sheet.js:162` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/nav/shortcuts-sheet.js:153` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `bookmark:jump-landed` | `Events.BOOKMARK_JUMP_LANDED` | `src/bookmarks/pulse.ts:29` |
| `bookmarks:deleted` | `Events.BOOKMARKS_DELETED` | `src/bookmarks/BookmarksList.svelte:225`, `src/bookmarks/BookmarksPage.svelte:34`, `src/bookmarks/indicator.ts:86`, `src/surahs/SurahList.svelte:138` |
| `bookmarks:saved` | `Events.BOOKMARKS_SAVED` | `src/bookmarks/BookmarksList.svelte:224`, `src/bookmarks/BookmarksPage.svelte:33`, `src/bookmarks/indicator.ts:79`, `src/surahs/SurahList.svelte:137` |
| `db:visibility-visible` | `Events.DB_VISIBILITY_VISIBLE` | `src/bookmarks/indicator.ts:107` |
| `reader:verse-rendered` | `Events.READER_VERSE_RENDERED` | `src/bookmarks/indicator.ts:75` |
| `settings:recent-surahs-updated` | `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `src/nav/NavDrawer.svelte:243`, `src/surahs/SurahList.svelte:141` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/bookmarks/BookmarksList.svelte:227`, `src/bookmarks/BookmarksPage.svelte:36`, `src/bookmarks/indicator.ts:102`, `src/surahs/SurahList.svelte:140` |
| `sync:bookmarks-updated` | `Events.SYNC_BOOKMARKS_UPDATED` | `src/bookmarks/BookmarksList.svelte:226`, `src/bookmarks/BookmarksPage.svelte:35`, `src/bookmarks/indicator.ts:93`, `src/surahs/SurahList.svelte:139` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **Hamburger drawer is the sole mobile in-app entry to the full surah list.** Standalone `#/surahs` page renders only on desktop ≥1180 px; mobile arrivals at that hash hard-redirect to `lastSurface` and open the drawer. (Mirror of `read` dossier invariant.)
- **Sole writer of `bookmarks` store: `bookmarks/store.ts`.** Anywhere else writing `bookmarks` directly is a bug.
- **Bookmarks scope to active riwayah.** ID format `<riwayah>:<surah>:<verse>` — switching riwayah surfaces a different set.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (6):**

- `tests/unit/bookmarks/click-handler.test.ts`
- `tests/unit/bookmarks/store.test.ts`
- `tests/unit/nav/MarginHeader-toggle.test.ts`
- `tests/unit/nav/command-sheet.test.ts`
- `tests/unit/nav/drawer.test.ts`
- `tests/unit/nav/swipe-gestures.test.ts`

**E2E (1):**

- `tests/e2e/journey-f-navigation.spec.js`
<!-- AUTO-GENERATED:tests END -->

## Deprecated

- **2026-04-28 restructure:** drawer was two-row Review + About list (left-slide narrow side panel). Replaced by full-screen tabbed surface on mobile.
- **Pre-2026-04-25 (`cb4e3a2`):** `#/t/:tag` FVR route removed. Old route dispatched `Hub.svelte` with a `tag` prop and filtered the threads layer only. Replaced by `#/<layer>/:value` scheme. Pre-release — no users when removed. New canonical route for same content: `#/threads/mercy`.
