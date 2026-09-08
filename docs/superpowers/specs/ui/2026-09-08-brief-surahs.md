# QuranAtlas Per-Screen Design Brief — #/surahs

**Status:** Director design brief (K3, BriefNavigationFamily seat). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` §4 (Navigation family), consuming the binding commonality brief `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` without new tokens, colors, or easings.
**Surface:** `#/surahs` — Tier B ChromeFrame (`src/components/navigation/ChromeFrame.tsx`) + `NavigationPageRecipe` (`src/design-system/recipes/navigation-page.tsx`) + `SurahList` (`src/components/navigation/SurahList.tsx`, registry `surah-list`).

---

## 1. Evidence base

Live inspection at `http://127.0.0.1:5173/#/surahs` at 1280×900 and 375×812, in light, sepia, and dark, after establishing a saved position at `#/s/2/255`. Computed values and screenshots taken from my own browser tabs. Sources: `src/app/routes/navigation/SurahsRoute.tsx`, `src/components/navigation/SurahList.tsx`, `src/design-system/recipes/navigation-page.tsx`, `src/design-system/index.css` (surah-row block 2356-2471), `src/design-system/tokens/semantic.css`.

**Static-audit adjudication (spec §9 / assignment):** the cited `html[data-theme="dark"] … [aria-selected="true"]` `!important` rules and raw-px `!important` row grids do **not exist** in the current `src/design-system/index.css` — grep for `!important` returns 0 matches. Those audit items are stale against the current tree and are **dropped**. The live dark selected-tab treatment is the token-based rule at index.css:2285-2288 / 2290-2293 (see Drawer §3 in the bookmarks brief). The stale `--qa-react-nav-current-spine` retirement request is carried by the commonality brief §1.3 R1 and is **not** re-requested here.

---

## 2. Defects seen

| # | Severity | Defect | Citation |
|---|---|---|---|
| S1 | major | Row content is **centered** inside a full-width row, leaving dead gutters on both sides at every viewport. At 1280×900 the 1212px row holds ~156px of content starting at x+528 (~456px left gutter); at 375×812 the 307px row holds ~152px starting at +78. Cause: the button grid `grid-template-columns: 34px minmax(0,1fr) minmax(56px,auto) 16px` with `justify-content` defaulting to center inside the grid — the `minmax(0,1fr)` column collapses to its content. | live `#/surahs` 1280×900 + 375×812 (all three themes); `src/design-system/index.css`:2408-2414 |
| S2 | major | Row separation is an inset `box-shadow` hairline (`inset 0 -1px var(--qa-react-nav-row-separator)`) plus a flat `--qa-react-nav-row-surface` fill — identical recipe in all three themes, but in **dark** the fill/shadow pair reads as raised cards with visible drop edge instead of a flat divided list. K2.6's "dark rows have box-shadows vs flat dividers in light/sepia" is confirmed visually: in dark the `nav-row-surface` vs `canvas` contrast + separator reads as per-row elevation; in light/sepia it reads flat. The current-row spine (`inset 3px 0 var(--qa-react-accent)`) also reads as a floating edge in dark. | live `#/surahs` dark 375×812 + 1280×900 screenshots; index.css:2371-2390 |
| S3 | minor | Chevron cell is a fixed `16px` grid column and the chevron glyph renders at `font-size: 1.15rem` (≈18.4px), wider than its 16px column — the glyph overhangs/cramped. K2.6's "chevrons ~16px" confirmed: column is 16px, glyph ~18px. | index.css:2409 (grid col), 2518-2523 (chev `font-size: 1.15rem`); live computed `chevFont: 18.4px` |
| S4 | minor | `NavigationPageRecipe` applies no content max-width: the list runs to the full 1240px at 1280×900 (main is 1280, ul 1240 after `px-5`), so each row is an ultra-wide band with its content centered (S1) — the combination reads as a broken table. | `src/design-system/recipes/navigation-page.tsx` (`qar:grid qar:gap-4 qar:px-5 qar:py-5`, no `max-w`); live `ulW: 1240` |
| S5 | minor | Long surah names / Arabic names are safe (title `overflow: hidden` + Arabic column is intrinsic-width), but the row has **no `minmax(0,…)` guard on the Arabic column** beyond `minmax(56px, auto)` — with a very long Arabic name the auto column can push the copy column to zero. Lower-risk than the bookmarks Arabic overflow (bookmarks brief B4) but same family. | index.css:2408-2409 (`minmax(56px, auto)`) |

No defects in: chrome Tier B composition, theme token values for the rows (light/sepia/dark `nav-row-*` tokens are all defined and consumed), reduced-motion (rows have no transitions), focus on the hamburger/settings (44px, `focus-visible` ring present).

---

## 3. Target composition (commonality language only)

**Chrome:** Tier B `ChromeFrame` exactly as now — in-flow `qar-react-chrome-bar`, ghost wordmark Button, 44px nav + settings `IconButton`s, single polite status region, single drawer host. No change.

**Page:** `NavigationPageRecipe` keeps `main` + single `h1` "Surahs" + `px-5 py-5 gap-4`. Add the shared page column cap: content wraps at `--qa-react-page-max-width` (`qar:max-w-page`) — for this list the cap that matters is a **list measure**, not 72rem. Compose the list at a readable measure by letting `ListRow` (below) own a content column and the row run full-bleed inside a capped container. Concretely: the list container takes `qar:max-w-page qar:mx-auto qar:w-full` at ≥1180px so rows stop being 1240px bands; below that they are full-bleed minus gutters. No new width token — `--qa-react-page-max-width` already exists.

**Rows:** migrate `SurahList` rows onto the `ListRow` primitive (registry `list-row`) — this is the commonality §3.1 owner for navigable list rows and it already encodes the correct anatomy:

- `ListRow` renders the full-row select surface as `.qar-react-list-row-select` with `grid-template-columns: auto minmax(0,1fr) auto` (start-aligned — **fixes S1**) and a `focus-visible` outline of `2px solid var(--qa-react-focus)` offset `2px` (index.css:3232-3235).
- Slots map as: `num` ← surah number (`qar-react-list-row-num`, `tabular-nums`); `title` ← surah name; `meta` ← `{n} verses` / `Last reached n:v`; `arabic` ← `name_ar` (`.qar-react-list-row-arabic` already has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — **fixes S5**); the trailing chevron moves into the `action` slot via `ListRowActions` as a non-interactive glyph, **not** a fixed 16px column — **fixes S3** (the chevron is sized by the slot, not clamped).
- Row separation uses the ListRow language: `.qar-react-list-row + .qar-react-list-row { border-block-start: 1px solid var(--qa-react-nav-row-separator) }` (index.css:3200-3202) — a flat divider in all three themes. Drop the `inset 0 -1px` box-shadow separator and the flat `nav-row-surface` fill on the row so dark stops reading as elevated cards (**fixes S2**); the list background stays `--qa-react-canvas`.

**Current-row state (§3.2 "current", distinct from "selected"):** the row for `currentSurah` carries `data-current="true"` + `aria-current="true"` (ListRow already does this) and paints `background: var(--qa-react-nav-current-bg)` + `box-shadow: inset 3px 0 0 0 var(--qa-react-accent)` — identical recipe in light, sepia, and dark (the `nav-current-bg` token is themed per-theme: 10% / 11% / 16% accent over surface). **No solid accent fill in dark, no left-border-only in light** — one token-driven treatment everywhere, per commonality §3.2. The current row's `title`/`num` may tint `--qa-react-accent` (as now, index.css:2463-2466) since bg is a tint, not a fill — contrast holds in all three themes.

---

## 4. States

| State | Treatment (registry component + tokens) |
|---|---|
| **Loading** | `Spinner` (registry `spinner`) with a text label, not the hand-rolled `.qar-react-nav-drawer-list-state` paragraph — commonality §3.2 loading-block. |
| **Error** | `Status` `tone="error"` (`role=alert`) "Surah list unavailable." with a recovery `Button` (retry). Replaces the bare `<p role="status">` in `SurahList.tsx`. |
| **Empty** (query/filter yields 0) | `Status` `tone="info"` "No surahs match your search." — replaces the bordered `.qar-react-nav-drawer-list-state` box (commonality §3.2 empty). |
| **Current** | `ListRow current` → `data-current` + `aria-current`, accent tint bg + 3px inset accent spine (§3.2). Never merged with `selected`. |
| **Selected** | Not applicable — `#/surahs` has no single-choice selection; the drawer filter tabs own `selected` (see bookmarks brief §3). |
| **Hover** (hover-capable only) | `--qa-react-nav-row-surface-hover` on the select surface (ListRow `.qar-react-list-row-select:hover`, index.css:3228-3230). |
| **Focus-visible** | `outline: 2px solid var(--qa-react-focus); outline-offset: 2px` on the row select surface (ListRow, index.css:3232-3235). Never removed. |
| **Disabled** | n/a — rows are always navigable. |
| **Search hint** (query parses to a ref) | Keep the muted `qar-react-nav-drawer-search-hint` line (`--qa-react-text-muted`, italic) above the list — it is a `role=status` live hint, correct as-is. |

---

## 5. Per-viewport layout

**1280×900:** ChromeFrame bar in-flow (Tier B). `main` `px-5 py-5`; list capped at `--qa-react-page-max-width` centered. `ListRow` columns `auto minmax(0,1fr) auto` **start-aligned** — number column at the inline start, name+meta grows, Arabic intrinsic, chevron in the action slot at the inline end. No centered content, no dead gutters. Rows full-width of the capped container.

**375×812:** Same composition, full-bleed rows minus the `px-5` gutter. `ListRow` `min-h-11` (44px) touch target on the whole row (the current hand-rolled `min-height: 60px` surah row is superseded by ListRow's 44px rule — acceptable since 44px is the single touch-target rule, commonality §3.3). Arabic ellipsizes if it would overflow (ListRow arabic slot).

---

## 6. Motion / reduced motion

- **No transitions or animations** on this surface beyond the global ones — the list rows have none today and gain none.
- Drawer open (from this surface) is the shared `qar-react-drawer-in` keyframe over `--qa-react-transition-settle` (240ms ease-standard); under `prefers-reduced-motion: reduce` the token collapses to 1ms (commonality §5.2 item 1), so the drawer snaps with no per-component change.
- Current-row tint is a static state, not animated. Reduced-motion changes nothing visible here — correct per §5.2 ("reduced motion removes movement, never the resulting state").

---

## 7. Theme + night behavior

All row surfaces draw from `--qa-react-nav-row-surface`, `--qa-react-nav-row-separator`, `--qa-react-nav-row-surface-hover`, `--qa-react-nav-current-bg`, `--qa-react-accent`, `--qa-react-text`, `--qa-react-text-muted` — every one defined for light, sepia, and dark in `semantic.css`. After S2, separation is the flat 1px `nav-row-separator` divider in all three themes (no shadow), so dark stops reading elevated. Night mode needs no per-component handling: the `.qar-react-night-shift` wash applies globally and all tokens stay legible under it (commonality §4).

---

## 8. Handoff notes for the orchestrator

- **Consumes, does not extend:** `ListRow`/`ListRowActions` (registry `list-row`, `list-row-actions`), `Status`, `Spinner`, `NavigationPageRecipe`, `ChromeFrame`. No new tokens; `--qa-react-page-max-width` and the `--qa-react-nav-*` family are existing.
- The `ListRow` migration here and in `JuzList`/`HizbList`/`BookmarksList` (bookmarks brief) retires the hand-rolled `.qar-react-nav-drawer-surah-*`, `.qar-react-juz-*`, `.qar-react-hizb-*` row CSS in a clean cutover — no parallel row systems.
- The centered-content defect (S1) is the highest-impact visual fix on this screen and is shared by the drawer lists; fixing it once via `ListRow` fixes all four.
