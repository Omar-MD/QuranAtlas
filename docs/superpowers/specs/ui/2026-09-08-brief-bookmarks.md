# QuranAtlas Per-Screen Design Brief — #/bookmarks + NavDrawer

**Status:** Director design brief (K3, BriefNavigationFamily seat). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` §4 (Navigation family), consuming the binding commonality brief `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` without new tokens, colors, or easings.
**Surfaces:** `#/bookmarks` — Tier B ChromeFrame + `NavigationPageRecipe` + `BookmarksList` (registry `bookmarks-list`); and the shared **NavDrawer** (`Sheet variant="navigation-drawer"` + `NavDrawer`, registry `nav-drawer`) as opened from both `#/bookmarks` and `#/surahs`.

---

## 1. Evidence base

Live inspection at `http://127.0.0.1:5173` at 1280×900 and 375×812, light/sepia/dark. Bookmarks were created via the reader (`#/s/2` verses 1, 2, 100 and `#/s/3` verse 1) so populated state is real persisted data. Swipe-to-delete exercised on mobile via synthetic touch (row translates, Delete panel reveals). Drawer opened from the reader (`#/s/1`, wird card shown) and from `#/surahs`/`#/bookmarks` (Tier B ChromeFrame). Focus open/return verified by keyboard Tab and close-click. Sources: `src/app/routes/navigation/BookmarksRoute.tsx`, `src/components/navigation/BookmarksList.tsx`, `use-swipe-to-delete.ts`, `NavDrawer.tsx`, `ChromeFrame.tsx`, `src/design-system/index.css` (bookmarks block 2589-2841, drawer block 2093-2391, wird card 2885-3010).

**Static-audit adjudication:** as noted in the surahs brief, the cited `!important` dark selected-tab rule and raw-px `!important` row grids do not exist in the current tree (grep for `!important` = 0). Those items are stale and dropped; the live dark selected-tab defect is real but is a **cascade-order** problem, not an `!important` problem (see N1 below).

---

## 2. Defects seen — #/bookmarks

| # | Severity | Defect | Citation |
|---|---|---|---|
| B1 | major | **Row keyboard focus has no visible ring.** The `.qar-react-bookmarks-row-btn:focus-visible` rule sets `outline: none`, and the focus row only gets the hover background (`--qa-react-nav-row-surface-hover`) — a ~5% tint. Verified by real keyboard Tab: `outlineStyle: none`. Violates commonality §3.2 focus rule (`2px solid var(--qa-react-focus)` ring, never removed). Same for `.qar-react-bookmarks-row-del:focus-visible` (outline: none + faint bg) and the identical `.qar-react-nav-drawer-saved-searches-row-btn/-del` rules. | live mobile drawer, keyboard Tab; index.css:2690-2694, 2777-2781, 1111-1115, 1176-1180 |
| B2 | major | **Delete affordance is invisible until discovered.** Mobile: swipe-reveal only — a 76px destructive button at `opacity: 0` with no visible hint, no keyboard path to reveal it. Desktop (≥1180px hover): the `@media (hover:hover) and (min-width:1180px)` restyle is broken — computed delete size is **31×8px** (a degenerate pill; the `inset-block: 50%` + `transform: translateY(-50%)` + `font-size: 0` + `::before ✕` recipe collapses), still `opacity: 0` until row hover. | live desktop 1280×900 (`delW:31 delH:8`); index.css:2752-2763 (mobile del), 2796-2841 (desktop override) |
| B3 | minor | **Swiped-open row clips its leading content.** On swipe the row-btn translates `-76px` but the ref column (`2:1`) is not compensated, so the verse ref slides under the row's hidden overflow and is cut; Delete appears on the right. Confirmed visually on mobile. | live mobile screenshot; use-swipe-to-delete.ts (`SWIPE_REVEAL_PX = 76`), index.css:2788-2790 |
| B4 | minor | **Long Arabic verse snippet lacks layout-driven overflow guard in the live path.** `.qar-react-bookmarks-row-ar` has `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`, but the row grid is `auto minmax(0,1fr) 16px` — correct — *however* the snippet is JS-truncated at 50 chars (`SNIPPET_CHARS`) *and* ellipsized, so very long verses are double-clipped; on narrow screens the Arabic can still crowd the ref. K2.6's "long Arabic verse text lacks overflow handling" is partially true: CSS handles it, but the 50-char hard cut is a product-level truncation with no expand path. | index.css:2725-2735; BookmarksList.tsx (`SNIPPET_CHARS = 50`); live rows |
| B5 | minor | **Bookmark count badge is a hard-coded mini-pill, not the `Badge` primitive.** `.qar-react-bookmarks-section-count` is 22px min-height, `font-size: 0.62rem` (~9.9px), mono — K2.6's "~20px badge" confirmed (22px). It hand-rolls what `Badge` (registry `badge`, tones neutral/success/warning/danger) owns. Same for `.qar-react-hizb-group-count` and the `.qar-react-juz-marker`/`.qar-react-hizb-marker` "Current" pills. | live computed (`badgeH:22 badgeFont:9.92px`); index.css:2633-2647, 2843-2858 |
| B6 | minor | **Empty state is correct `Status` but the route's own loading/error are hand-rolled.** `BookmarksRoute` renders bare `<p role="status">` for loading and `<p role="status">` (danger text) for error — not `Spinner`/`Status tone="error"`. The in-component empty state (`Status tone="info"`) is right; the route-level states are not on the primitive. | `src/app/routes/navigation/BookmarksRoute.tsx` |

---

## 3. Defects seen — NavDrawer (shared, from both surfaces)

| # | Severity | Defect | Citation |
|---|---|---|---|
| N1 | major | **Source-tab and filter `aria-selected` background never paints — in *all three themes*.** The Button `ghost` variant ships `qar:bg-transparent`, which lives in the **utilities** layer and therefore beats the `components`-layer selected rules (`.qar-react-nav-drawer-source-tab[aria-selected="true"]`, `html[data-theme="dark"] …`). Computed selected tab/filter `background: rgba(0,0,0,0)` in light **and** dark. This is the live form of the "theme-dependent selected state" the static audit flagged — but the cause is cascade order, not a dark-only `!important`. The 2px accent underline (`::after`) survives, so the tab reads selected; the filter ("All"/"Recent") shows **no** selected cue at all. | live light + dark (computed `bg: rgba(0,0,0,0)` on both tab and filter); index.css:2262-2293 vs Button ghost `qar:bg-transparent` (button.tsx) |
| N2 | minor | **Wird card renders on the Button base, not as a Card.** `DailyWirdCard` is a `<Button className="qar-react-wird-card">`; the cva base (secondary default) applies `border`/`bg-surface`/padding, and computed shows `background: rgba(0,0,0,0)`, `border: 1px solid transparent` — the card's intended `border: 1px solid var(--qa-react-nav-row-border)` + `nav-row-surface` fill + `nav-shadow-row` is **overridden by the utilities-layer Button base**. The card reads as a flat transparent strip, losing its bordered-card elevation. Status badge is 40px (K2.6 "~32px" is close; actual 40px) inside a 44px grid column. | live reader drawer (`bg: transparent, border: 1px solid transparent`); index.css:2885-2896 (card) vs Button base |
| N3 | minor | **Search input sits in a cramped combined toolbar.** `.qar-react-nav-drawer-source-tools` is `grid-template-columns: minmax(0,1fr) 112px` — the search field shares one row with the All/Recent filter, giving the input only ~197px at 360px drawer width (and the whole toolbar `min-height: 42px` vs the 44px rule). K2.6's "drawer search input cramped" confirmed. | live mobile (`inputW: 197, toolsH: 64`); index.css:2295-2306, 2323-2334 (`min-height: 40px` input) |
| N4 | minor | **Source tabs are pill-style ghost Buttons, not `SegmentedControl`.** The Read-source switcher (Surah/Juz/Hizb/Bookmarks) and the All/Recent filter are mutually-exclusive modes rendered as `role="tab"` ghost Buttons. Commonality §3.1: mutually-exclusive modes belong to `SegmentedControl` (registry `segmented-control`, `role=radiogroup`) — "never pill buttons for modes." | NavDrawer.tsx (source tabs + filter as `Button role="tab"`); registry segmented-control |
| N5 | minor | **Drawer lists share the surah-row centered-content defect** (S1 in the surahs brief): Juz grid `48px 42px minmax(0,1fr) auto auto 16px` and Hizb grid `58px minmax(0,1fr) auto 16px` center their content, confirmed in drawer screenshots. | live drawer Juz/Hizb screenshots; index.css:2417-2431 |

**Confirmed clean (no defect):** drawer **focus open/return is correct** from both Tier B (`#/surahs`, `#/bookmarks` via `#chrome-navigation-trigger`) and Tier A (`#/s/1` via `#reader-navigation-trigger`) — close returns focus to the exact invoker (`returnFocusId` contract in `ChromeDrawer`/`Sheet`). Mobile drawer is a full-screen modal over `--qa-react-scrim`; desktop is a 360px non-modal rail with keyboard containment. Matches commonality §2.4. Behavioral sweep item is **clean**.

---

## 4. Target composition (commonality language only)

### 4.1 #/bookmarks

- **Chrome/page:** Tier B `ChromeFrame` + `NavigationPageRecipe` ("Bookmarks" h1), list capped at `--qa-react-page-max-width` centered at ≥1180px (same as surahs §3). 
- **Rows → `ListRow` + `ListRowActions`:** the swipe row becomes `ListRow` with `num` ← verse ref, `title` ← surah name (or page label), `arabic` ← snippet (ListRow arabic slot already ellipsizes — drop the JS `SNIPPET_CHARS` cut, fixing B4 by one mechanism), chevron in the `action` slot. **Fixes the shared centered-content defect and gives the row a real `focus-visible` ring** (ListRow `.qar-react-list-row-select:focus-visible`, index.css:3232-3235 — fixing B1).
- **Delete → always-present `IconButton` danger in `ListRowActions`:** remove the swipe-to-reveal + hover-reveal patterns. A labelled destructive `IconButton` (`qar-react-text-danger` ink, 44px, `focus-visible` ring) sits in the action slot at all times — visible, keyboard-reachable, no gesture required, no 31×8px pill, no clipped ref (**fixes B2, B3**). Swipe may remain as an *additional* shortcut on touch, but the persistent button is the single guaranteed affordance (commonality §3.3 touch target + §3.2 focus).
- **Section header count + "Current"/"Page" markers → `Badge`:** counts use `Badge tone="neutral"`; the page-kind marker uses `Badge tone="neutral"`; any current-location marker uses the current-row treatment, not a pill (**fixes B5**).
- **States:** empty → existing `Status tone="info"` (keep); route loading → `Spinner` with label; route error → `Status tone="error"` (`role=alert`) + retry `Button` (**fixes B6**).

### 4.2 NavDrawer

- **Shell:** `Sheet variant="navigation-drawer"` unchanged — mobile full-screen modal + scrim, desktop 360px rail, focus trap/restore as now (verified clean).
- **Source tabs + filter → `SegmentedControl`:** Surah/Juz/Hizb/Bookmarks and All/Recent become `SegmentedControl` radiogroups (**fixes N4**). SegmentedControl's selected option uses `--qa-react-nav-control-selected-bg` + accent text (commonality §3.2 selected) and **wins the cascade** because it does not ship `bg-transparent` on the selected option — **this resolves N1 at the component level**: remove the losing `.qar-react-nav-drawer-source-tab[aria-selected]`/`.qar-react-nav-drawer-filter-option[aria-selected]` overrides and the dark-only variants (index.css:2262-2293) in a clean cutover; the token treatment is theme-correct by construction (10%/10%/14% accent over surface).
- **Search input → own row:** give the search `Input` a full-width row above the filter, `min-height` at `--qa-react-control-touch-target` (44px), placeholder + prefix icon as now (**fixes N3**). Input keeps its visible label (hidden but accessible, `hideLabel`) per the `input` registry contract.
- **Wird card → `Card`:** render `DailyWirdCard` on the `Card` primitive (registry `card`: `rounded-surface border bg-surface p-4`) with an optional header, not on `<Button>` — so the bordered, elevated card treatment actually applies (**fixes N2**). The status badge stays a 40px accent ring; the whole card is clickable via a single ghost overlay Button *inside* the Card, not *as* the Card.
- **Juz/Hizb rows → `ListRow`:** same migration as surahs (**fixes N5**); "Current" becomes the `ListRow current` treatment (`nav-current-bg` + 3px inset accent spine + `aria-current`), not a pill.

---

## 5. States

| State | Treatment |
|---|---|
| **Empty (bookmarks)** | `Status tone="info"` "No bookmarks" + description (keep — already correct). |
| **Loading (route)** | `Spinner` + label (replaces bare `<p>`). |
| **Error (route / list)** | `Status tone="error"` `role=alert` + retry `Button`. |
| **Selected (drawer modes)** | `SegmentedControl` selected = `--qa-react-nav-control-selected-bg` + `--qa-react-accent` text, theme-correct by token. |
| **Current (row location)** | `ListRow current` = `nav-current-bg` + 3px inset accent spine + `aria-current`, all themes (never a pill, never solid fill). |
| **Hover (hover-capable)** | `--qa-react-nav-row-surface-hover` on `ListRow` select; delete `IconButton` hover border-accent. |
| **Focus-visible** | `2px solid var(--qa-react-focus)` offset `2px` on every interactive element — row select, delete IconButton, segmented options, search Input, drawer controls. Never `outline: none`. |
| **Disabled** | `opacity-55` + `pointer-events-none` (Button/IconButton defaults). |
| **Swipe-open (if kept)** | optional touch shortcut; Delete is *also* always visible, so swipe is progressive enhancement, never the only path. |

---

## 6. Per-viewport layout

**1280×900:** Tier B bar in-flow; content capped at `--qa-react-page-max-width` centered. Bookmark rows are `ListRow` start-aligned (ref / name / arabic / chevron / delete). Drawer is the 360px non-modal left rail (`--qa-react-drawer-width`), background interactive, manual Tab loop.

**375×812:** Full-bleed rows minus `px-5`. `ListRow` `min-h-11` = 44px row target; delete `IconButton` 44px. Arabic ellipsizes (no 50-char JS cut). Drawer is full-screen modal over `--qa-react-scrim` (`rgb(0 0 0 / 32%)`), focus trapped, Escape/backdrop close, focus returns to `#chrome-navigation-trigger`.

---

## 7. Motion / reduced motion

- **Drawer slide:** `qar-react-drawer-in` over `--qa-react-transition-settle` (240ms ease-standard); collapses to 1ms under reduce (global token, commonality §5.2).
- **Bookmark row transitions:** the swipe `transform 240ms cubic-bezier(0.32,0.72,0,1)` + `background 120ms` are **killed under reduce** by the existing rule (index.css:3668-3671) — correct; keep it if swipe remains. If swipe is dropped in favor of the always-visible delete IconButton, that rule becomes dead and is removed in the cutover.
- **Bookmark landing pulse** (on jump-to-bookmark) uses the existing `qar-reader-verse-pulse` keyframe, already `animation: none` under reduce (index.css:3662-3666) — unchanged.
- No new motion introduced; all durations/easings consume the existing tokens.

---

## 8. Theme + night behavior

Every surface draws from themed `--qa-react-*` tokens (`nav-row-surface`, `nav-row-separator`, `nav-row-surface-hover`, `nav-current-bg`, `nav-control-selected-bg`, `nav-badge-surface/-text`, `nav-delete-surface/-text`, `accent`, `focus`, `text`, `text-muted`) — all defined for light/sepia/dark in `semantic.css`. After N1, the selected-tab/filter treatment is the token `nav-control-selected-bg` in **all three themes** (no dark-only override), so the theme-dependent selected-state inconsistency is removed at the source. Night mode is the global `.qar-react-night-shift` wash; no per-component dimming (commonality §4).

---

## 9. Handoff notes for the orchestrator

- **Consumes, does not extend:** `ListRow`, `ListRowActions`, `Badge`, `Status`, `Spinner`, `IconButton`, `Button`, `SegmentedControl`, `Input`, `Card`, `Sheet` (navigation-drawer), `NavigationPageRecipe`, `ChromeFrame`. All exist in `component-registry.json`. **No new tokens, no new namespace.**
- The `SegmentedControl` cutover retires `.qar-react-nav-drawer-source-tab`/`.qar-react-nav-drawer-filter-option` and their dark variants (index.css:2216-2293); the `ListRow` cutover retires `.qar-react-bookmarks-row-*`, `.qar-react-juz-*`, `.qar-react-hizb-*` hand-rolled grids; the `Card` cutover fixes the wird card's lost border/elevation. All are clean cutovers — no parallel systems left behind.
- Highest-impact fixes in order: **N1** (selected state paints in all themes), **B1** (visible focus rings on rows/deletes), **B2** (always-visible delete affordance), **S1/N5** (ListRow start-aligned anatomy kills the centered-gutter defect across surahs/juz/hizb/bookmarks), **N2** (wird card elevation).
