# UI Iteration 3 — Navigation family defect wave (JIT plan)

**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (Phase B, Iteration 3)
**Binding briefs:** `docs/superpowers/specs/ui/2026-09-08-brief-surahs.md`, `docs/superpowers/specs/ui/2026-09-08-brief-bookmarks.md` (incl. NavDrawer §3-§4), commonality brief as foundation.
**Prerequisite:** Iteration 1 (layer fix, 44px base). Depends on nothing from Iteration 2.
**Owner:** orchestrator plans → `ui-implementer` → gates → K2.6 re-review → commit.

## Tasks

### Task 1 — Surah/Juz/Hizb rows → ListRow (S1, S3, S5, N5; surahs brief §3)
- Migrate `SurahList`, `JuzList`, `HizbList` rows onto `ListRow`/`ListRowActions`: `num` ← number, `title` ← name, `meta` ← verses/last-reached, `arabic` ← Arabic name (slot already ellipsizes), chevron ← action slot glyph (not a fixed 16px column).
- Row separation = ListRow flat `border-block-start` divider (`--qa-react-nav-row-separator`); drop per-row `nav-row-surface` fill + inset-shadow separator (S2: dark stops reading elevated).
- Current-row: ListRow `current` (`nav-current-bg` + 3px inset accent spine + `aria-current`) — identical in all themes; may keep title/num accent tint.
- Clean cutover: retire the hand-rolled `.qar-react-nav-drawer-surah/juz/hizb` row CSS — no parallel row systems.
- Verify: rows start-aligned at 1280×900 + 375×812 (no dead gutters), dark flat, current-row treatment in all 3 themes, 44px row targets, real focus rings.

### Task 2 — Page cap on navigation lists (S4)
- `NavigationPageRecipe` consumers (`#/surahs`, `#/bookmarks`): list container `qar:max-w-page qar:mx-auto qar:w-full` at ≥1180px. No new token.
- Verify: 1280×900 list capped; mobile full-bleed unchanged.

### Task 3 — Drawer source tabs + filter → SegmentedControl (N1, N4)
- Replace `role="tab"` ghost Buttons (Read source Surah/Juz/Hizb/Bookmarks + All/Recent filter) with `SegmentedControl` radiogroups; selected = `--qa-react-nav-control-selected-bg` + accent text (wins cascade by construction).
- Delete the losing `.qar-react-nav-drawer-source-tab[aria-selected]` / `-filter-option[aria-selected]` rules incl. dark variants (index.css ~2216-2293) — clean cutover.
- Verify: selected option paints in light+sepia+dark; keyboard radio semantics; 44px options.

### Task 4 — Drawer search input own row (N3)
- Search `Input` gets a full-width row above the filter, `min-height: var(--qa-react-control-touch-target)`; keep label (hideLabel), prefix icon, hint line.
- Verify: 360px drawer — input full usable width; toolbar ≥44px.

### Task 5 — Wird card → Card primitive (N2)
- `DailyWirdCard` renders on `Card` (registry `card`): border + nav-row-surface fill + nav-shadow-row actually apply; single ghost overlay Button inside for clickability; status badge stays.
- Verify: reader drawer — card shows border/elevation in all themes; click target intact.

### Task 6 — Bookmarks rows → ListRow + always-visible delete (B1, B2, B3, B4)
- `BookmarksList` rows → `ListRow`: `num` ← verse ref, `title` ← surah/page label, `arabic` ← snippet (drop `SNIPPET_CHARS` 50-char JS cut — CSS ellipsis only), chevron action.
- Delete → labelled destructive `IconButton` (danger ink, 44px, focus ring) in `ListRowActions` at ALL times. Swipe may remain as touch shortcut only (progressive enhancement); delete the degenerate desktop hover-pill rules; fix swiped-ref clipping if swipe kept.
- Saved-searches drawer rows: same cutover (fixes their `outline: none` too).
- Verify: keyboard-only delete path; mobile delete visible without gesture; focus rings on all rows/controls; long-snippet ellipsis single mechanism.

### Task 7 — Badges + route states (B5, B6; surahs states)
- Section counts + Current/Page markers → `Badge` primitive (retire `.qar-react-bookmarks-section-count`/hizb-group-count/marker mini-pills).
- `#/bookmarks` + `#/surahs` route loading → `Spinner` + label; error → `Status tone="error"` + retry `Button`; empty → `Status tone="info"` (bookmarks empty already correct — keep).
- Verify: states exercise (empty bookmarks, error via blocked fetch); roles/names only.

### Task 8 — Gates + review + commit
- `mise run check` && `mise run build:ui` && `env -u CI mise run smoke`.
- K2.6 re-review: `#/surahs`, `#/bookmarks` (populated + empty), drawer (tabs/filter/search/wird card/lists) both viewports × themes.
- Correctness review: REQUIRED — swipe-to-delete semantics change (B2) + radiogroup semantics (Task 3) + row focus behavior (B1) are interaction changes.
- Commit `fix: navigation family wave (ListRow cutover, selected-state, delete affordance)`.

## Out of scope
Reader chrome (Iter 2), search surfaces (Iter 4), settings (Iter 5), K3 addendum only if a real aesthetic gap emerges (e.g. ambiguous chrome icons noted in inventory §7 — report, don't decide).
