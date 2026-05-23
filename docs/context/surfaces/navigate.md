---
surface: navigate
src_paths:
  - 'src/navigate/**'
  - 'src/navigate/surahs/**'
  - 'src/navigate/bookmarks/**'
owns_stores:
  - bookmarks
test_paths:
  unit:
    - 'tests/unit/navigate/**'
    - 'tests/unit/navigate/surahs/**'
    - 'tests/unit/navigate/bookmarks/**'
  e2e:
    - 'tests/e2e/navigate/*.spec.js'
style_paths:
  - 'src/styles/surfaces/navigate/**'
---

# Surface: navigate

> Reader navigation — nav drawer, Surah/Juz browsing, bookmarks, reader mode switching, shortcuts, and Daily Wird entry points. Bookmark persistence and resume validation are consumed from `src/continuity/**`.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Hamburger ≡ on MarginHeader (mobile) | tap | open nav drawer |
| MarginHeader swipe-down (mobile) | gesture | `openNavDrawer('read')` |
| AmbientDock ⋯ (desktop) | tap | open nav drawer |
| `G` then `S` | keyboard | `#/surahs` (desktop) / drawer Surahs tab (mobile) |
| `?` from any non-input context | keyboard | shortcuts cheatsheet sheet |
| Hash `#/surahs` (desktop ≥1180 px) | URL | render standalone surah directory |
| Hash `#/surahs` (mobile <1180 px) | URL | hard-redirect to `lastSurface` + open drawer |
| Verse number tap → bookmark toggle | tap | save/delete bookmark for verseKey at active riwayah |
| Bookmark row tap (drawer Bookmarks tab) | tap | drawer closes, reader navigates to verse, landing pulses 1 s |
| Read drawer mode switch | tap | bridges between the active verse route and Mushaf page route |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/navigate/EmptyRoute.svelte` | intentionally empty |
| `src/navigate/JuzList.svelte` | _(no leading comment)_ |
| `src/navigate/NavDrawer.svelte` | Mobile (<1180px): full-screen drawer focused on reading continuity: |
| `src/navigate/bookmarks/BookmarksList.svelte` | Shared bookmark list — renders grouped-by-surah verse rows for the active |
| `src/navigate/bookmarks/BookmarksPage.svelte` | Desktop /bookmarks page — verse-level list grouped by surah. |
| `src/navigate/bookmarks/click-handler.ts` | Document-level pointer handler that toggles a bookmark when the user |
| `src/navigate/bookmarks/indicator.ts` | Bookmark verse-id glyph indicator. |
| `src/navigate/bookmarks/pulse.ts` | Pulse-highlight a verse on bookmark-jump landing. |
| `src/navigate/bookmarks/store.ts` | _(no leading comment)_ |
| `src/navigate/global-shortcuts.ts` | Boot-mounted global keyboard shortcuts. Survives lazy-mount of overlay |
| `src/navigate/nav-drawer-bridge.ts` | Imperative bridge for the NavDrawer Svelte component. Migrated to |
| `src/navigate/reader-actions.js` | Reader action API backing the single-key shortcuts (j/k/[/]/Home/End/m). |
| `src/navigate/shortcuts-sheet.js` | Shortcuts cheatsheet opened by `?`. Grouped by Universal · Go-to · Reader, |
| `src/navigate/surahs/SurahList.svelte` | ---- data loaded on mount ---- |
| `src/navigate/surahs/SurahRow.svelte` | _(no leading comment)_ |
| `src/navigate/surahs/state.svelte.ts` | _(no leading comment)_ |
| `src/navigate/swipe-gestures.ts` | Pure swipe-classification helpers for MarginHeader gestures. |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Nav drawer (mobile, full-screen)

Hamburger or swipe-down opens full-screen drawer. Two top-level mode tabs.

Header uses the locked mobile chrome: a product row with tappable QuranAtlas wordmark, About icon button, and separate Close button, followed by the `Read` rail.

**Read mode** uses the ledger drawer layout: an elevated Daily Wird card with progress/chevron affordance, then a `Verse | Mushaf` reader-mode switch, then the peer source control for `Surah | Juz | Bookmarks` when Verse mode is active. The selected source uses a muted accent fill plus bronze underline; unselected sources remain muted on the shared rail.

`NavDrawer.svelte` renders `DailyWirdCard`, but navigate owns only drawer placement through the local slot wrapper; read remains the owner of the card source and presentation styles.

`Surah` shows search plus `All | Recent`, keeps current-surah highlight, and renders ledger-style surah rows with number, English name, verse count, Arabic name, and chevron. `Juz` removes Surah-only search/filter controls, renders 30 Juz rows, marks the Juz containing the current reader position, marks the Juz containing the active Daily Wird next reference, and routes row taps to the Juz start reference. `Bookmarks` renders the existing riwayah-scoped grouped bookmark list with static group headers, count badges, verse references, truncated Arabic snippets, tap-to-jump rows, and swipe-left Delete.

When the active route is Mushaf (`#/m/:page`), the drawer marks Mushaf mode active, shows a compact Page N continuation surface with previous, open, and next page actions, and hides the `Surah | Juz | Bookmarks` source controls. The mode active state follows hash changes while the drawer remains mounted.

Daily Wird detail opens in-drawer. Without a plan, the summary card invites creating a plan and the creator uses Settings-style sections for completion target, display unit, start point, and reminder; each option exposes selected/unselected state through pressed semantics and visible accent styling. With a plan, the detail shows today range, remaining work, Continue, Edit, and Reset controls. When the reminder browser-notification action is tapped, the drawer requests browser permission from that same user gesture and reflects the resulting permission state before the plan is saved. If the saved state is denied, the drawer still exposes a request-again action; browsers that require site-settings changes may return denied immediately.

`✕` closes; backdrop tap, swipe-left, Esc also dismiss. Drawer state local; not persisted. Header controls and the peer source rail keep comfortable touch targets on mobile; the Read source switch stays visually compact while preserving selected-state clarity.

Desktop kebab path keeps narrow side-panel size but uses same tabbed component.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| `src/styles/surfaces/navigate/drawer-lists.css` | nav — AmbientDock (desktop left rail), AmbientPill (floating top pill), |
| `src/styles/surfaces/navigate/drawer-read-source.css` | nav — AmbientDock (desktop left rail), AmbientPill (floating top pill), |
| `src/styles/surfaces/navigate/drawer-shell.css` | nav — AmbientDock (desktop left rail), AmbientPill (floating top pill), |
| `src/styles/surfaces/navigate/shortcuts-sheet.css` | nav — AmbientDock (desktop left rail), AmbientPill (floating top pill), |
<!-- AUTO-GENERATED:style-inventory END -->

### Surah directory (`#/surahs`, desktop ≥1180 px only)

- 114 rows. Compact header rail above search mirrors the mobile drawer: `Browse` eyebrow + `Surahs` title on the left, `All | Recent` switch on the right. Search input filters below. Match `67` → 1 result, "Jumping to #67" eyebrow, Al-Mulk row (with gold left-edge if bookmarked).
- Tap row → `#/s/{n}`.
- **Continue-reading card** at top: with search cleared and All filter active, shows last-read position. Tap → navigates to surah + verse. Reads from `settings.currentPosition` via `loadGlobalPosition`.

### Bookmarks (riwayah-scoped)

Verse-level. Single-tap toggle: tap verse number in reader → `src/continuity/bookmarks/store.ts::toggle(verseKey, riwayah)` writes / removes; emits `BOOKMARKS_SAVED` / `BOOKMARKS_DELETED`. Reader indicator (`bookmarks/indicator.ts`) updates gold left-edge.

Drawer Bookmarks tab is the read surface (above). Empty-state when no bookmarks exist for active riwayah.

Pulse animation (`bookmarks/pulse.ts`) — landing-flash on jumped-to verse fires `BOOKMARK_JUMP_LANDED`.

### Shortcut cheatsheet (`?`)

Press `?` → bottom sheet slides up titled "Keyboard shortcuts". Lists every active binding grouped into Universal, Go to, and Reader sections, plus gesture rows. Backdrop tap, `×`, Esc → close. No persistence.

The retired command/search sheet has no drawer, dock, keyboard, or boot mount entry. Navigation search lives in the Surah/Juz drawer controls; global keyboard help is the shortcuts sheet only.

### Global keyboard reference

Full in-app reference is the `?` cheatsheet. Summary:

**Universal**
- `?` — open shortcut cheatsheet
- `Esc` — close sheet

**Go to** (g-chord)
- `g h` — home / continue reading
- `g s` — surah list
- `g a` — about

**Reader** (only on `#/s/*`, blocked when a text input is focused)
- `j` / `k` — next / previous verse
- `]` / `[` — next / previous surah
- `Home` / `End` — first / last verse
- `m` — open tafsir for the centered verse
- `t` — toggle translation visibility
- `n` — toggle night-mode
- `+` / `-` — bigger / smaller font
- `0` — reset font size to default
- `d` — cycle theme (light → sepia → dark → auto)

**Gestures**
- Double-tap a verse (touch) → inline tafsir preview (parity with `m`)
- Right-click a verse (desktop) → inline tafsir preview
- Expand from the inline tafsir preview → full tafsir sheet

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
- **Sole writer:** `src/navigate/bookmarks/store.ts`.
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
| `bookmark:jump-landed` | `Events.BOOKMARK_JUMP_LANDED` | `src/navigate/bookmarks/BookmarksList.svelte:108` |
| `navigation:navigate` | `Events.NAVIGATION_NAVIGATE` | `src/navigate/NavDrawer.svelte:250`, `src/navigate/NavDrawer.svelte:325`, `src/navigate/NavDrawer.svelte:711`, `src/navigate/bookmarks/BookmarksList.svelte:110`, `src/navigate/surahs/SurahList.svelte:167` |
| `sheet:closed` | `Events.SHEET_CLOSED` | `src/navigate/shortcuts-sheet.js:146` |
| `sheet:opened` | `Events.SHEET_OPENED` | `src/navigate/shortcuts-sheet.js:137` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `bookmark:jump-landed` | `Events.BOOKMARK_JUMP_LANDED` | `src/navigate/bookmarks/pulse.ts:29` |
| `bookmarks:deleted` | `Events.BOOKMARKS_DELETED` | `src/navigate/bookmarks/BookmarksList.svelte:229`, `src/navigate/bookmarks/BookmarksPage.svelte:34`, `src/navigate/bookmarks/indicator.ts:91`, `src/navigate/surahs/SurahList.svelte:138` |
| `bookmarks:saved` | `Events.BOOKMARKS_SAVED` | `src/navigate/bookmarks/BookmarksList.svelte:228`, `src/navigate/bookmarks/BookmarksPage.svelte:33`, `src/navigate/bookmarks/indicator.ts:84`, `src/navigate/surahs/SurahList.svelte:137` |
| `db:visibility-visible` | `Events.DB_VISIBILITY_VISIBLE` | `src/navigate/bookmarks/indicator.ts:112` |
| `reader:verse-rendered` | `Events.READER_VERSE_RENDERED` | `src/navigate/bookmarks/indicator.ts:80` |
| `router:route-change` | `Events.ROUTER_ROUTE_CHANGE` | `src/navigate/NavDrawer.svelte:395` |
| `settings:recent-surahs-updated` | `Events.SETTINGS_RECENT_SURAHS_UPDATED` | `src/navigate/NavDrawer.svelte:392`, `src/navigate/surahs/SurahList.svelte:141` |
| `settings:riwayah-changed` | `Events.SETTINGS_RIWAYAH_CHANGED` | `src/navigate/bookmarks/BookmarksList.svelte:231`, `src/navigate/bookmarks/BookmarksPage.svelte:36`, `src/navigate/bookmarks/indicator.ts:107`, `src/navigate/surahs/SurahList.svelte:140` |
| `sync:bookmarks-updated` | `Events.SYNC_BOOKMARKS_UPDATED` | `src/navigate/bookmarks/BookmarksList.svelte:230`, `src/navigate/bookmarks/BookmarksPage.svelte:35`, `src/navigate/bookmarks/indicator.ts:98`, `src/navigate/surahs/SurahList.svelte:139` |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **Hamburger drawer is the sole mobile in-app entry to the full surah list.** Standalone `#/surahs` page renders only on desktop ≥1180 px; mobile arrivals at that hash hard-redirect to `lastSurface` and open the drawer. (Mirror of `read` dossier invariant.)
- **Read source controls are Verse-mode only and peer-owned.** The drawer Read mode exposes `Surah | Juz | Bookmarks` as peer sources only while the reader mode is Verse. Search and `All | Recent` belong only to Surah; Juz, Bookmarks, and Mushaf page continuation must not show disabled or decorative Surah controls.
- **Sole writer of `bookmarks` store: `bookmarks/store.ts`.** Anywhere else writing `bookmarks` directly is a bug.
- **Bookmarks scope to active riwayah.** ID format `<riwayah>:<surah>:<verse>` — switching riwayah surfaces a different set.
- **Bookmarks remain Reader First navigation.** Bookmarks are reading-continuity data, not personal study annotations.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (10):**

- `tests/unit/navigate/bookmarks/click-handler.test.ts`
- `tests/unit/navigate/bookmarks/indicator.test.ts`
- `tests/unit/navigate/bookmarks/store.test.ts`
- `tests/unit/navigate/drawer.test.ts`
- `tests/unit/navigate/reader-actions.test.js`
- `tests/unit/navigate/retired-entry-state.test.ts`
- `tests/unit/navigate/retired-entry.test.ts`
- `tests/unit/navigate/surahs/list.test.ts`
- `tests/unit/navigate/surahs/state.test.ts`
- `tests/unit/navigate/swipe-gestures.test.ts`

**E2E (3):**

- `tests/e2e/navigate/drawer.spec.js`
- `tests/e2e/navigate/retired-entry.spec.js`
- `tests/e2e/navigate/surahs.spec.js`
<!-- AUTO-GENERATED:tests END -->
