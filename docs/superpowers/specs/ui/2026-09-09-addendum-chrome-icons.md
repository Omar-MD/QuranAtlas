# Addendum — Reader/Mushaf Chrome Icon Semantics (Task 6)

**Status:** Director design brief (one-shot addendum). Binding for the implementer; no design choice below is optional.
**Date:** 2026-09-09 (user-approved scope 2026-09-11).
**Scope:** Glyph semantics only, for the reader/Mushaf chrome cluster (`ReaderChrome` right cluster) and the bookmark affordances that must stay semantically consistent with it. No layout, spacing, color, motion, token, or accessible-name changes.
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (Tier A chrome §2.1, ownership §3, theme/night §4, motion §5). No new tokens, colors, easings, namespaces, components, or dependencies are introduced.

**Evidence base.** Static audit of the live sources (this addendum changes only decorative glyph identity, so pixel re-inspection is delegated to the visual-reviewer gate):

- `src/components/reader/ReaderChrome.tsx:63-90` — right cluster composition: `{wirdStatus}` → `ReadingViewToggle` → settings `IconButton` (`Settings`, size 26, strokeWidth 1.6); left cluster: navigation `IconButton` (`Menu`, size 26, strokeWidth 1.8).
- `src/components/reader/wird/ReaderWirdStatusIndicator.tsx:24` — wird status renders lucide `Check` (size 15, strokeWidth 2.2) when complete, lucide `BookOpen` (size 15, strokeWidth 1.65) otherwise, inside the 22px `qar-reader-chrome-wird-core` within the conic progress ring (index.css:1513-1541).
- `src/components/reader/ReadingViewToggle.tsx:3-29` — two **custom inline SVGs**: `OpenMushafGlyph` (two-page open-book spread, 24×24, strokeWidth 1.6) and `VerseLinesGlyph` (three text lines + verse-end medallion dot, 24×24, strokeWidth 1.7).
- `src/components/reader/VerseNumber.tsx:31-38` — lucide `Bookmark` (size 18, strokeWidth 1.9, `fill` toggled by state); `src/components/reader/MushafPageViewer.tsx:553` — lucide `Bookmark` (size 17, strokeWidth 1.85, same fill convention) in the mushaf page-actions dock.
- lucide-react **1.16.0** (package.json:88) is installed; its ESM icon set (1960 modules under `node_modules/lucide-react/dist/esm/icons/`) was enumerated and the replacement glyphs named below were verified to exist and their path data inspected.

**The defect.** The right cluster carries two adjacent open-book silhouettes that read as near-identical at 15–24px: the wird status in-progress glyph (lucide `BookOpen`) and the view toggle's mushaf-destination glyph (custom `OpenMushafGlyph`). They mean different things — "open your Daily Wird" vs "switch to Mushaf view" — but are indistinguishable at a glance; only the tooltips disambiguate. Additionally, the two custom inline SVGs violate the lucide-react-only icon-source constraint.

---

## 1. Glyph decisions (per component, exact)

### 1.1 `ReaderWirdStatusIndicator` — REPLACE the in-progress glyph

| State | Current | **Decision** | Size | strokeWidth |
|---|---|---|---|---|
| In progress (`active`, `no-plan`) | lucide `BookOpen` | **lucide `ListChecks`** | 15 (unchanged) | 1.65 (unchanged) |
| Complete (`today-complete`, `plan-complete`) | lucide `Check` | **KEEP lucide `Check`** | 15 (unchanged) | 2.2 (unchanged) |

- `ListChecks` exists in lucide-react 1.16.0 (verified: `list-checks.mjs`; exported as `ListChecks`). Its silhouette — three horizontal lines with two check marks down the left — reads as "daily assignment / checklist", which is exactly the wird semantic (`Daily Wird: N% today…`), and pairs naturally with the plain `Check` shown on completion (checklist → checked).
- It shares no silhouette family with any chrome neighbor: not a book (view toggle), not a gear (settings), not bare lines (navigation `Menu` is far-left, three heavier strokes at 26px vs. the 15px checklist inside a filled ring core).
- Rejected alternatives (do not substitute):
  - `BookOpenCheck` / `BookMarked` — still open-book silhouettes; re-create the collision being fixed.
  - `Target` — concentric circles echo and visually fight the surrounding conic progress ring.
  - `CalendarCheck` — embeds a check mark, implying "done" precisely in the state that means "not done".
- Both glyphs remain inside the existing `aria-hidden="true"` `qar-reader-chrome-wird-ring` span, so they stay decorative with no per-icon aria work. The `data-wird-state` attribute, ring, core, and all CSS are unchanged.

### 1.2 `ReadingViewToggle` — REPLACE both custom glyphs with lucide

Delete both module-private components `OpenMushafGlyph` and `VerseLinesGlyph` (clean cutover; they have no other callers — verified by repo-wide grep). The toggle shows the **destination** glyph (existing behavior, unchanged):

| `destination` | Current | **Decision** | Size | strokeWidth |
|---|---|---|---|---|
| `mushaf` (label `Switch to Mushaf view`) | custom `OpenMushafGlyph` | **lucide `BookOpenText`** | 24 | 1.7 |
| `verse` (label `Switch to Verse view`) | custom `VerseLinesGlyph` | **lucide `ScrollText`** | 24 | 1.7 |

- `BookOpenText` (verified: `book-open-text.mjs`) is an open two-page book with short text strokes on each page — the mushaf metaphor (a written script page), preserving everything the custom spread glyph meant while keeping plain `BookOpen` free of chrome duty. Its symmetric open-book silhouette is unmistakably "page view".
- `ScrollText` (verified: `scroll-text.mjs`) is an asymmetric text sheet with a rolled corner and two lines — "flowing passage of text", the verse-reading view. Its rolled-corner silhouette is visually unrelated to the open book, to `ListChecks` (checks + lines at 15px inside a ring), and to `Menu` (bare parallel lines, no container).
- Rejected alternatives (do not substitute):
  - `BookOpen` for mushaf — workable, but `BookOpenText` carries the "written mushaf page" meaning and avoids overloading plain `BookOpen`, which remains the wird illustration in `DailyWirdCard` (§3).
  - `AlignJustify` / `List` / `Rows*` for verse — bare horizontal lines are glance-confusable with the navigation `Menu` hamburger.
  - `ListOrdered` for verse — semantically defensible (numbered verses) but the tiny digit strokes render as noise at 24px and the silhouette lacks a container; `ScrollText` reads faster.
- Both lucide glyphs MUST carry `aria-hidden="true"` (the current custom SVGs do; lucide forwards the prop to the `<svg>`). The glyphs inherit `currentColor` from the existing `qar-reader-chrome-pill` recipe (index.css:1484-1500) — no CSS change.
- Size 24 (was 24×24 viewBox) and the shared strokeWidth 1.7 preserve the current optical weight and hit-layout exactly: zero layout shift in the 48px pill (`qar-reader-chrome-pill`, `min-h/w-11` from `IconButton`).

### 1.3 Bookmark affordances — KEEP (explicit no-change with justification)

- `VerseNumber.tsx:31` — **KEEP lucide `Bookmark`** (size 18, strokeWidth 1.9, `fill={bookmarked ? 'currentColor' : 'none'}`, `aria-hidden="true"`, `data-active` hook).
- `MushafPageViewer.tsx:553` — **KEEP lucide `Bookmark`** (size 17, strokeWidth 1.85, same fill convention).
- Justification: the bookmark ribbon is a unique silhouette with no collision in any cluster; the same glyph already means "bookmark" on both reading surfaces (verse head row and mushaf dock), which is the cross-surface consistency this addendum exists to protect; state is conveyed redundantly by fill, `aria-pressed`, the `data-active` styling hook, and the accessible name (`Bookmark verse N` / `Remove bookmark for verse N`, `Bookmark Mushaf page N` / `Remove bookmark for Mushaf page N`). Changing it would break a correct established semantic, not fix an ambiguous one.

---

## 2. Resulting cluster semantics (target glance model)

Right cluster, left→right: **wird** = ring + `ListChecks`/`Check` ("my daily assignment, with progress"), **view toggle** = `BookOpenText`/`ScrollText` ("go to page view / go to text view"), **settings** = gear. Left cluster: **navigation** = hamburger. No two controls share a silhouette family; every glyph is a stock lucide export; every state glyph pair (`ListChecks`→`Check`, `BookOpenText`↔`ScrollText`, `Bookmark` fill on/off) is self-consistent.

## 3. Out of scope (recorded, do not expand)

- `DailyWirdCard.tsx:60` (drawer card) keeps lucide `BookOpen` size 19 as the wird illustration. It never sits adjacent to the chrome toggle, so no collision; plain `BookOpen` remaining wird-associated outside the chrome is precisely why the toggle gets `BookOpenText` rather than `BookOpen`.
- `IncludedAssetsSection.tsx:149` (`AssetIcon`, settings) keeps `BookOpen`/`FileText`; different surface, no collision.
- The duplicate pill-recipe consolidation (reader brief R-D5) is a CSS ownership matter, not icon semantics — untouched here.
- No registry change: `component-registry.json` entries `reader-wird-status-indicator` and `reading-view-toggle` pin slots/variants, not icon identity.

## 4. Files to change (exactly these two)

1. `src/components/reader/wird/ReaderWirdStatusIndicator.tsx`
   - Import: replace `BookOpen` with `ListChecks` in the `lucide-react` import (`Check` stays).
   - Line 24: `complete ? <Check size={15} strokeWidth={2.2} /> : <ListChecks size={15} strokeWidth={1.65} />`.
   - Nothing else changes (labels, ring, `data-wird-state`, style hook all untouched).
2. `src/components/reader/ReadingViewToggle.tsx`
   - Delete `OpenMushafGlyph` and `VerseLinesGlyph` in full.
   - Add `import { BookOpenText, ScrollText } from 'lucide-react'`.
   - Line 49 becomes: `destination === 'mushaf' ? <BookOpenText aria-hidden="true" size={24} strokeWidth={1.7} /> : <ScrollText aria-hidden="true" size={24} strokeWidth={1.7} />`.
   - Nothing else changes (`Tooltip`, `IconButton`, label logic untouched).

No other file may be edited for this task. No CSS, token, story, or test changes are required (storybook stories render these components through `ReaderChrome` and pick the new glyphs up automatically; no test asserts glyph identity — verified by grep).

## 5. Styling, themes, viewports, motion

- **Tokens/utilities:** unchanged. Glyph color comes from existing recipes — pill: `color: var(--qa-react-accent)` (hover `var(--qa-react-accent-strong)`), wird core: `var(--qa-react-accent)` (complete states invert to `background: var(--qa-react-accent)` / `color: var(--qa-react-text-on-accent)`), all via `currentColor`. No new `qar:` utilities.
- **Themes (light / sepia / dark, plus the orthogonal night wash):** no per-theme behavior. All replacement glyphs are stroke-only (`fill="none"` by lucide default), inherit `currentColor`, and therefore track the existing theme-resolved accent colors exactly as the current glyphs do. Verify rendered contrast per theme at review; expect zero delta in computed colors.
- **Viewports:** identical glyphs at 1280×900 and 375×812. Sizes are fixed pixels (15/24) inside fixed boxes (22px core in 30px ring; 48px pill; mushaf mode shrinks chrome controls to 44px via index.css:2574-2581 — the glyph sizes stay 15/24, matching today's behavior). No responsive variant is introduced.
- **Reduced motion:** no motion is added, removed, or altered; glyph swaps are static. Nothing to honor beyond the existing recipes.

## 6. Acceptance criteria

The implementer's work passes when ALL of the following hold:

1. **Accessible names unchanged (computed, not source-assumed).** In a real browser (e.g. via `getComputedAccessibleNode`-equivalent or Playwright/Puppeteer `ariaSnapshot`), with a wird summary present:
   - View toggle computed accname is exactly `Switch to Mushaf view` on a verse route (e.g. `#/s/2`) and `Switch to Verse view` on a mushaf route (e.g. `#/m/2`).
   - Wird trigger computed accname is exactly the `statusLabel` output for the active summary state (`Open Daily Wird`, `Daily Wird: plan complete`, `Daily Wird: today complete`, or `Daily Wird: N% today, …`).
   - Verse bookmark buttons compute to `Bookmark verse N` / `Remove bookmark for verse N` (verse view) and `Bookmark Mushaf page N` / `Remove bookmark for Mushaf page N` (mushaf dock).
2. **Glyphs are the specified ones.** The toggle renders lucide `BookOpenText` (mushaf destination) / `ScrollText` (verse destination); the wird core renders lucide `ListChecks` in progress and `Check` on complete; no inline `<svg>` path definitions remain in `ReadingViewToggle.tsx`; `lucide-react` is the only icon import in both changed files.
3. **Visually distinguishable at a glance.** At 1280×900 and 375×812, in light, sepia, and dark: the right cluster shows three unrelated silhouettes (ring+checklist, open-book-with-text or rolled scroll, gear) and the two toggle states are immediately distinguishable from each other and from the wird glyph. Sign-off on this pixel judgment belongs to the `ui-visual-reviewer`.
4. **No layout shift.** Pill, ring, and core boxes compute to the same sizes as before the change at both viewports (48px/44px controls; 30px ring; 22px core).
5. **State coverage.** Wird ring exercised in at least one in-progress state and one complete state; toggle exercised in both modes (round trip `#/s/2` → `#/m/2` → `#/s/2`).

## 7. Open items (director-resolved defaults — no implementer discretion)

- **Mushaf glyph = `BookOpenText`, not plain `BookOpen`.** Chosen to keep plain `BookOpen` semantically associated with wird surfaces (`DailyWirdCard`, settings asset icon) and to carry the "written page" meaning. Recorded so a reviewer does not "simplify" it.
- **Verse glyph = `ScrollText`, not `ListOrdered`/`AlignJustify`.** Chosen for silhouette distinctness from `Menu` and glyph-legibility at 24px. Recorded.
- **Toggle strokeWidth unified at 1.7** (the two custom glyphs were 1.6 and 1.7). 1.7 sits between the neighbors' 1.6 (settings) and 1.8 (menu) and preserves current optical weight at size 24. Recorded.
- **Wird in-progress strokeWidth stays 1.65** (unchanged from the current `BookOpen`), keeping the core's existing optical balance against the 2.2 `Check`. Recorded.
- **`DailyWirdCard`'s `BookOpen` deliberately retained** (§3); a future consistency pass may revisit wird iconography app-wide, but it is not this task.
