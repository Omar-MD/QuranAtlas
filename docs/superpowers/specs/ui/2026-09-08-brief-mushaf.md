# QuranAtlas Mushaf Screen Design Brief — `#/m/:page`

**Status:** Director design brief (per-screen, v2 part 2). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Route family:** `#/m/:page` (e.g. `#/m/2`).
**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (chrome tiers §2, ownership/state map §3, theme/night §4, motion §5). No new tokens, colors, easings, or namespaces are introduced. All mushaf surfaces draw from the existing `--qa-react-mushaf-*` family (semantic.css:71-77) plus shared tokens.

**Evidence base.** Live inspection of `http://127.0.0.1:5173/#/m/2` at 1280×900 and 375×812, in light / sepia / dark (+ dark+night). Interactions exercised live: chrome hide/show, reader↔Mushaf view toggle (`#/m/2` → `#/s/2/1` and back), settings entry (adaptive-settings rail over a `qar:bg-text/30` scrim), page-turn animation tokens resolved (240ms `cubic-bezier(0.32,0.72,0,1)`), asset-gated state (Manage assets / Retry). **The active reading profile's page pack is not installed in this environment**, so the live mushaf surfaces rendered are the gate `Status` + chrome; the page-stage recipe was verified in source (index.css:3284-3537, `MushafPageViewer.tsx`). Sources: `src/design-system/index.css` (chrome 1890-2092, mushaf 3284-3537), `src/components/reader/{MushafPageViewer,ReaderAssetGate,ReaderChrome,ReadingViewToggle}.tsx`, `src/app/routes/read/MushafRoute.tsx`.

---

## 1. Composition (target — commonality language)

The mushaf route composes **Tier A chrome** (commonality §2.1) over a full-bleed `MushafPageViewer` stage (registry `mushaf-page-viewer`). Unlike the verse reader, the shell is `height:100dvh; overflow:hidden` with **no top padding** (index.css:1403-1406) — the chrome floats over the stage and hides on demand.

**Structure (ready state):**
1. `ReaderChrome` (Tier A) — left nav `IconButton`, center `h1` title (mushaf mode renders LTR "Page N" / surah label, not the Arabic display font), right `[wirdStatus?] + ReadingViewToggle + settings IconButton`.
2. `MushafPageViewer` — `.qar-react-mushaf-page-surface` (grid, safe-area padding-inline via `--qa-react-mushaf-safe-left/-right`) containing:
   - `.qar-react-mushaf-page-stage` (the gesture/focus surface, `tabIndex` for keyboard page-turn) with either a `.qar-react-mushaf-page-strip` (single mode: prev/current/next cells, translate3d) or `.qar-react-mushaf-continuous-stack` (scroll mode).
   - `.qar-react-mushaf-page-actions` dock (only when `chromeVisible`): prev/next `IconButton`s, `.qar-react-mushaf-page-counter`, and `.qar-react-mushaf-bookmark-toggle` `IconButton`.
3. **Gate / status surfaces** (when assets are absent or a page fails) replace the stage.

Every interactive element is a registry primitive: `IconButton` (chrome, dock prev/next, dock bookmark), `Button` (gate recovery actions), `Status`/`Spinner` (gate/loading). No hand-rolled buttons.

---

## 2. Defects seen (each cited)

### Blocking
- **M-D1 — Gate `Status` is occluded by the fixed Tier-A chrome on both viewports.** `#/m/2`, all themes, 1280×900 and 375×812. The mushaf shell sets `padding-top: 0` (index.css:1403-1406) so the gate `Status` renders at `top: 0` (`position: static`, `z-index: auto`) while the fixed chrome (`z-index: 95`) sits on top of it. Desktop: gate top 0 < chrome bottom 56 → the gate's title/description are partially hidden behind the chrome bar. Mobile (375×812): the chrome wraps to two rows (88px tall) and the gate shows only as a red-bordered sliver beneath it — the Manage assets/Retry actions are obscured. Source: `MushafRoute.tsx:505-511` renders `ReaderAssetGate` directly inside the padding-less mushaf shell; chrome stacking index.css:1890-1895, mobile wrap index.css:2069-2092. **This makes the asset-gate recovery actions hard to reach on mobile — blocking.**

### Major
- **M-D2 — Gate `Status` spans the full content width with no horizontal constraint or centering.** `#/m/2`, both viewports. The gate `Status` computes to `display: block; width: 1152px` (desktop) / `375px` (mobile), `padding: 16px`, text left-aligned, no `max-width`/`margin: auto`. On a reading screen the error reads as a raw banner edge-to-edge rather than a centered, bounded status surface. The mushaf recipe already has `.qar-react-mushaf-page-status` (index.css:3396-3404) — a centered, `--qa-react-mushaf-boundary-surface`, muted-text container — but the gate path does **not** use it. Source: `ReaderAssetGate.tsx` renders bare `Status`; `MushafRoute.tsx:482-501`.
- **M-D3 — Gate `Status` lacks a tone icon and reads as plain text.** `#/m/2`, all themes. The `error`/`missing`/`stale` gates pass no `icon` slot (only `installing` passes a `Spinner`), so the surface is color + text only at a glance. Commonality §3.2 requires state to not be color-only when composed with text; an explicit tone icon (registry `status` `icon` slot) is the owned mechanism. Source: `ReaderAssetGate.tsx:20-44`.

### Minor
- **M-D4 — Gate error tone (red/orange) clashes with the warm palette.** `#/m/2`, light/sepia. K2.6 flagged this (minor). Adjudication: the *palette* is correct — the gate is a genuine `error` state and `--qa-react-status-error-border/-bg` (danger-derived) is the owned error tone per commonality §3.2 ("error → Status tone=error"). The visual harshness comes from M-D2/M-D3 (full-width, icon-less, chrome-occluded), not the hue. **Do not re-hue the error tone**; fixing M-D1/M-D2/M-D3 resolves the perceived clash. No token change.
- **M-D5 — Chrome center title in mushaf mode shows LTR "Page N" without the reader's Arabic display treatment.** `#/m/2`, both viewports. In mushaf mode `ReaderChrome` renders the title as an LTR `h1` in `--qa-react-font-ui` at `qar:text-sm` (ReaderChrome.tsx:47-50), whereas verse mode uses the Arabic display font at `clamp(1.28rem→1.75rem)`. The mushaf title reads noticeably smaller/plainer than the verse-reader title — an intra-chrome inconsistency. Source: ReaderChrome.tsx:47-52.
- **M-D6 — Static-audit "mushaf bookmark toggle `!important` block (~3620-3643)" is NOT present.** Grep for `!important` in `src/design-system/index.css` returns zero matches; `.qar-react-mushaf-bookmark-toggle` (index.css:3444-3470) is a plain recipe with proper `aria-pressed` tint (`--qa-react-accent` 13% bg). **Adjudicated: stale finding, already resolved.** Recorded so it is not re-investigated.
- **M-D7 — Duplicate view-toggle vs wird-status chip recipes (reader-family shared, R-D5).** Same consolidation applies to the mushaf chrome; see reader brief R-P5.

### Adjudicated K2.6 findings (mushaf)
- **"Night-mode nearly indistinguishable from dark (minor)" → confirmed as designed.** The mushaf stage dims under the global `.qar-react-night-shift` wash (opacity 0.78 multiply) with no per-component change — verified live (dark+night chrome bg `color(srgb 0.094 0.109 0.129 / 0.92)` under the wash). Night is orthogonal to theme (commonality §4). No mushaf-screen change.
- **"Mushaf warning-bar red/orange clashes (minor)" → M-D4 above** (palette correct; fix layout/icon, not hue).

---

## 3. States (single prescription each)

- **Ready (page pack installed, page loaded):** composition per §1. Stage shows the page; dock visible when chrome is visible.
- **Loading (page fetch):** `Status tone="info"` with `Spinner label="Loading page N"` icon, title "Loading Mushaf page" (MushafRoute.tsx:470-477). Polite live region. Per-cell loading uses `.qar-react-mushaf-page-status` (`role=status`) — correct; keep.
- **Gate — missing (`confirmed-missing` / asset `missing`):** `Status tone="warning"` (never error-red) with Manage assets + Retry actions. `role=status`. This is an **intended gate**, not an error — keep the warning tone and both recovery actions.
- **Gate — stale / installing:** `Status tone="info"` (installing gets a `Spinner` icon); Manage assets + Retry actions.
- **Gate — error (pack load / profile error):** `Status tone="error"` (`role=alert`, assertive) with Manage assets (`Button` primary) + Retry (`Button` secondary) actions (ReaderAssetGate.tsx:34-42). Keep both actions; add a tone icon (M-P3).
- **Page-turn failure (`requestedPageFailure`):** `Status tone="error"` with two actions — Retry page N (`Button` primary) + Stay on page M (`Button` secondary) (MushafRoute.tsx:455-466). Correct; keep. This surface must also clear the fixed chrome (M-P1).
- **Bookmarked (page):** dock bookmark `IconButton` `aria-pressed="true"` → border `--qa-react-accent` 44% mix, bg `--qa-react-accent` 13% over surface, glyph filled. State not color-only (fill + border + `aria-pressed`). Keep.
- **Chrome hidden (mushaf):** `opacity: 0` + `translate3d(0,-100%-8px)`, `pointer-events: none`, `inert`. Transition `--qa-react-transition-fast` on both opacity and transform (index.css:1915-1931). Keep.
- **Disabled (dock prev/next at boundaries):** `IconButton` `opacity-55 + pointer-events-none` (commonality §3.2) — page 1 disables "Previous", last page disables "Next". Keep.
- **Focus-visible:** `2px solid var(--qa-react-focus); outline-offset: 2px` on chrome controls, dock controls, and the stage (`.qar-react-mushaf-page-stage:focus-visible`, index.css:3284-3287). Keep.

---

## 4. Per-viewport layout

### 1280×900 (desktop)
- Chrome: single row, 56px + safe-area, padded `max(16px, safe-area)` inline (index.css:3526-3530).
- Stage: centered; single mode sizes to `min(100%, 100dvh × page-ratio)` aspect box (index.css:3289-3296); dock `max-width: min(stage-width, 32rem)` (index.css:3527-3531).
- Gate/status: must be horizontally centered and bounded (M-P2), and vertically clear of the 56px chrome (M-P1).

### 375×812 (mobile)
- Chrome: wraps to two rows (88px) at ≤520px portrait — left/right clusters on row 1, title on row 2 (index.css:2069-2092). This is the *correct* mobile chrome treatment; the verse reader should match it (reader brief R-P3).
- Stage: full-bleed within `--qa-react-mushaf-safe-left/-right` padding; dock `min-height: 48px`, controls 48px (44px in landscape ≤600px, index.css:3505-3517).
- Gate/status: **currently occluded by the 88px chrome (M-D1)** — must be inset below it (M-P1).

---

## 5. Prescriptions (commonality language; zero aesthetic gaps)

**M-P1 — Clear the fixed chrome from every mushaf gate/status surface (fixes M-D1, blocking).** The mushaf shell's `padding-top: 0` is correct for the *stage* (chrome floats over it by design) but wrong for *gate/status* content. When `MushafRoute` renders a `ReaderAssetGate` / failure `Status` (i.e. not the `MushafPageViewer` stage), wrap it in a container that applies `padding-top: calc(env(safe-area-inset-top) + 56px)` — and on ≤520px portrait `calc(env(safe-area-inset-top) + 88px)` to match the two-row chrome. No token change; reuse the existing chrome-height values already encoded in the chrome recipe (index.css:1895, 2073). This makes the Manage assets/Retry actions reachable on mobile.

**M-P2 — Center and bound the gate/status surface (fixes M-D2).** Present every mushaf gate/status `Status` inside the existing `.qar-react-mushaf-page-status` recipe (registry `mushaf-page-viewer` owns it; index.css:3396-3404): `display: grid; place-items: center; background: var(--qa-react-mushaf-boundary-surface); color: var(--qa-react-text-muted); text-align: center; padding: var(--qa-react-space-control-x)`. Constrain the inner `Status` to `max-width: var(--qa-react-page-max-width)` with `margin-inline: auto` so it reads as a bounded status surface, not an edge-to-edge banner. The `Status` keeps its own tone border/bg; the boundary-surface container provides the centered stage fill. No new tokens.

**M-P3 — Add a tone icon to the gate `Status` (fixes M-D3).** Fill the `Status` `icon` slot per tone: a warning glyph (lucide `AlertTriangle`, as already used in `ui.stories.tsx:177`) for `missing`/`stale`/page-failure, and keep the `Spinner` for `installing`. This satisfies commonality §3.2 "not color-only". Icon is `aria-hidden`. No new tokens.

**M-P4 — Align the mushaf chrome title with the verse-reader title (fixes M-D5, minor).** In mushaf mode, render the center title with the same visual weight as the verse reader: keep it LTR (page numbers are LTR) but raise it from `qar:text-sm` to the chrome title scale `clamp(1.28rem, 2.75vw, 1.75rem)` in `--qa-react-accent` (the `.qar-reader-chrome-title` recipe already provides this — the mushaf `h1` should consume the same class/font-size rather than `qar:text-sm`). Where a surah label is available, show it; otherwise "Page N". On ≤520px portrait it drops to `clamp(1.2rem,6vw,1.48rem)` per the two-row chrome (index.css:2087-2089). No new tokens.

**M-P5 — Consolidate the two chrome pill recipes onto `IconButton` (M-D7, Phase-C remainder).** Same cutover as reader brief R-P5: route `.qar-reader-chrome-view-toggle` and `.qar-reader-chrome-wird-status` through `IconButton` with one shared pill treatment; depends on commonality D3 (bare `IconButton` → 44px) so the wird chip reaches 44px. No visual change intended.

**No change** prescribed for: page-turn animation tokens/timing, dock composition or counter typography, bookmark-toggle `aria-pressed` treatment, chrome hide/show behavior, night-mode wash, focus rings, the gate's error/warning *hues*. These are correct and on-token.

---

## 6. Motion / reduced-motion

- **Page turn (direct manipulation):** `transform` transition on `.qar-react-mushaf-page-strip` using `--qa-react-mushaf-page-turn-duration` (240ms) + `--qa-react-mushaf-page-turn-easing` (`cubic-bezier(0.32,0.72,0,1)`) — resolved live. Reduced-motion: duration → `0ms`, `will-change: auto` (index.css:3537-3541). Correct; keep. During an active horizontal drag the transition is `none` (index.css:3306-3308) for direct manipulation.
- **Chrome hide/show:** `--qa-react-transition-fast` on opacity + transform; reduced-motion `transition: none; transform: none` (index.css:3545-3550). Keep.
- **Gate/status appearance:** no animation; instant. Correct.
- **No new motion** is introduced by M-P1..M-P5 (M-P1/M-P2 are layout, M-P3 an icon, M-P4 a font-size, M-P5 a composition cutover).