# Desktop redesign — Surah list · Mark editor · Review hub · About · Theme tokens

**Date:** 2026-04-18
**Scope:** Four desktop surfaces (`#/surahs`, `#/review`, `#/about`, Mark editor modal) plus a cross-cutting theming pass that unifies accents, introduces selection tokens, and switches dark mode from sky blue to honey amber.
**Out of scope:** Reader (except one stale-selector bug fix), Settings sheet, More sheet, Command sheet, Onboarding (these consume the new tokens but get no layout changes).

---

## Problem statement

Three concrete issues diagnosed from `src/core/theme.css`:

1. **Two parallel accent systems.** `--qa-accent` (legacy, `#8b6b3a` in light) and `--qa-ambient-accent` (newer, `#78592e` in light) both live in the codebase. The ambient palette dominates chrome (dock, pill, sheets, surah list, mark editor, onboarding) but `--qa-accent` leaks into Review hub controls, the generic `.qa-modal`, `.qa-about-install-btn`, `.qa-verse-number`, and several focus outlines — producing a visible color mismatch when those surfaces sit next to ambient surfaces.
2. **Eight selectors hardcode "text on accent" per theme.** Every "selected" or "primary" pill sets `color: var(--qa-ambient-surface)` on the base selector and then adds two `html[data-theme="dark"]` / `html[data-theme="sepia"]` override lines — eight copies of the same pattern (`.qa-dock-item--active`, `.qa-sl-seg-item--on`, `.qa-sl-continue-icon`, `.qa-mark-selected-count`, `.qa-mark-chip--on`, `.qa-mark-btn--primary`, `.qa-review-seg-item--on`, `.qa-onb-cta--primary`).
3. **No real desktop layout for the affected surfaces.** Surah list has no desktop media query at all (frozen at 720px). About page has no desktop rules (stacked full-width). Review hub has no desktop layout beyond inheriting `#main-content`'s 1180px. Mark editor modal at desktop is styled as "a narrower bottom sheet" — top-anchored, with grip handle and slide-up animation. The reader's surah-title card falls into the left column because the grid-column-span rule at `theme.css:1327` targets `.qa-surah-header` but `src/reader/index.js::renderSurahHeader` emits `.qa-surah-header-card`.

4. **Reader grid hijacks every non-reader surface at desktop** (discovered by inspecting computed styles at 1440×900). The rule `#main-content { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr) }` at ≥1180px is the reader's Arabic-translation split — but it applies to every surface because the selector isn't scoped to reader-specific content. Direct children of `#main-content` land in implicit grid columns in DOM order:
   - `.qa-surah-list-page` → grid-col-1, width 349px, left edge x=266, ~900px empty gutter on the right.
   - `.qa-about-*` children → alternating columns (heading→col1, mission→col2, blessing→col1, stat-grid→col2 …). Visual collision, not a design.
   - `.qa-review-*` children → same pattern; empty-state message falls into col-1.

5. **All bottom-sheets are top-biased at desktop** because the tablet-up override uses `top: 10vh` without a matching `bottom`. At 1440×900 the mark editor measures 90px top-gap vs 107px bottom-gap — same issue applies to `.qa-sheet` in general, i.e. Settings, More, and Mark editor all sit ~17px above optical center.

6. **Clear-data confirm modal placement is fine.** Verified at 1440×900: `.qa-modal-backdrop` uses `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center`, producing a perfectly centered 400×361 modal (520/520 horizontal, 269.5/269.5 vertical). Only the *styling* (flat `--qa-bg-primary` bg, legacy `.qa-btn-*` buttons) is out-of-sync with ambient sheets — addressed by Phase 1 migration below, not by any placement change.

---

## Design decisions

Captured live during brainstorming. Each row is a commitment; alternatives considered are in the "Alternatives" section at the bottom.

| # | Decision |
|---|----------|
| 1 | **Tokens first, then per-surface desktop layouts.** One coherent refactor of the accent system before any surface layout work begins. |
| 2 | **Selected state uses soft tint + accent text** (not solid fill). Background `--qa-ambient-accent-soft`, text `--qa-ambient-accent`, optional 1px inset ring. Applied to all eight current hardcoded-override selectors. |
| 3 | **Dark-mode accent swaps from sky blue `#7dd3fc` to honey amber `#d4a253`.** The three themes now share a bronze family: light `#78592e`, sepia `#78592e`, dark `#d4a253`. |
| 4 | **Primary actions stay solid fill.** Save / Install / Get Started / confirm-modal primary buttons keep bronze-on-parchment contrast via a new `--qa-on-accent` token. Selection is quiet; commit actions are loud. |
| 5 | **`.qa-modal` adopts `--qa-ambient-surface`** — same look as every sheet. `.qa-btn-primary`, `.qa-btn-secondary`, `.qa-btn-danger` are retired; their one consumer (clear-data confirm) migrates to the `.qa-mark-btn--*` family. |
| 6 | **Surah list desktop: two-column rows.** Existing row markup unchanged; at ≥1180px the `.qa-sl-list` becomes `grid-template-columns: 1fr 1fr; column-gap: 2rem`. |
| 7 | **Mark editor desktop: verse-hero modal.** At ≥1180px the sheet becomes a 820px-wide proper modal — vertically centered, symmetric radius, scale-in animation, no grip. Body restructures: full-width verse hero on top, then 2-col body (note left, tag picker right). |
| 8 | **Review hub desktop: left rail + 2-col card grid.** At ≥1180px, `#main-content` on `#/review` becomes `grid-template-columns: 220px 1fr`. Left rail hosts group-by segmented control plus the live tag/surah/date list with counts. Right pane shows a 2-col card grid under a single active-group header. FVR (`#/t/:tag`) renders without the rail. |
| 9 | **About desktop: hero + 4-across stats + 2-col body.** Hero (wordmark + mission + blessing) stays centered, blessing capped to 720px. Stats become a 4-across horizontal row. Below: 2-col body with attribution on the left, install CTA + version line on the right. |
| 10 | **Reader surah-title bug.** Update `theme.css:1327` to span `.qa-surah-header-card` (the class the reader actually renders) so the title card correctly spans both grid columns at desktop. |
| 11 | **Scope the reader grid** so it only applies to reader surfaces. Change `#main-content { display: grid … }` at `theme.css:1318` to `#main-content:has(.qa-verse) { display: grid … }`. `:has()` is already used in this file (line 1360) so no browser-support risk. Fixes problem (4) at the root — every other surface gets a natural single-column baseline. |
| 12 | **True-center all bottom sheets at desktop.** Update the base `.qa-sheet` ≥768px rule from `top: 10vh` to `top: 50%; transform: translateX(-50%) translateY(-50%)`, plus `max-height: min(720px, 86vh)` so they cap instead of stretching to 86% of viewport. Applies to Settings, More, and Mark editor in one edit; mark editor desktop rules stay as add-ons on top. |

---

## Phase 1 — Token system

### New tokens (all three themes)

```css
/* Text color to use on a solid --qa-ambient-accent fill. */
--qa-on-accent: <see per-theme values below>;

/* Selection chrome (soft-tint treatment). */
--qa-selection-bg:   var(--qa-ambient-accent-soft);
--qa-selection-text: var(--qa-ambient-accent);
--qa-selection-ring: color-mix(in srgb, var(--qa-ambient-accent) 35%, transparent);
```

Per-theme values for `--qa-on-accent`:

- **Light:** `#faf1d8` (ambient-surface parchment)
- **Sepia:** `#3d2e14` (parchment-text — readable against sepia surface)
- **Dark:** `#15110a` (near-black — amber-on-black primary button)

### Unified legacy accent

```css
/* Light + Sepia */
--qa-accent: var(--qa-ambient-accent);      /* #78592e */
--qa-accent-hover: #5e3a18;                 /* existing sepia hover — WCAG AA on parchment */

/* Dark (post amber swap) */
--qa-accent: var(--qa-ambient-accent);      /* #d4a253 */
--qa-accent-hover: #e4b882;                 /* lighter amber for hover */
```

This is a backwards-compatible alias. Every site that still reads `--qa-accent` keeps working. Over time `--qa-accent` can be deleted in a follow-up.

### Dark-theme accent swap

```css
html[data-theme="dark"] {
  --qa-ambient-accent: #d4a253;              /* was #7dd3fc */
  --qa-ambient-accent-soft: rgba(212, 162, 83, 0.18);
  --qa-ambient-kbd-color: #e4b882;           /* AA 4.5:1 on the soft-tinted surface */
  --qa-verse-hover-bg: rgba(212, 162, 83, 0.05);
  --qa-on-accent: #15110a;
  /* --qa-ambient-parchment / -muted / -dim / -surface / -border stay as today. */
}
```

### Selector refactor

Each of the eight hardcoded selectors collapses from four rules (base + 2 overrides) to a single rule:

```css
/* Before (example) */
.qa-mark-chip--on {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
  border-color: var(--qa-ambient-accent);
  font-weight: 600;
}
html[data-theme="dark"]  .qa-mark-chip--on { color: #0e0e0c; }
html[data-theme="sepia"] .qa-mark-chip--on { color: #3d2e14; }

/* After — soft-tint selection */
.qa-mark-chip--on {
  background-color: var(--qa-selection-bg);
  color: var(--qa-selection-text);
  box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  border-color: transparent;
  font-weight: 600;
}
```

Selectors migrating to selection tokens (soft-tint):

- `.qa-dock-item--active`
- `.qa-sl-seg-item--on`
- `.qa-sl-continue-icon` — gets selection-text color on selection-bg (was solid fill)
- `.qa-mark-selected-count`
- `.qa-mark-chip--on`
- `.qa-review-seg-item--on`
- `.qa-onb-t--on` (onboarding translation picker)
- `.qa-onb-sw--on` (onboarding theme swatch)

Primary-action selectors keeping solid fill via `--qa-on-accent`:

- `.qa-mark-btn--primary`
- `.qa-onb-cta--primary`
- `.qa-about-install-btn` — migrates from `--qa-accent` → `--qa-ambient-accent` + `--qa-on-accent`
- `.qa-cmd-vcard`, `.qa-cmd-item-glyph` — no change needed (already use ambient-accent-soft)

### Review hub leak realignment

| Selector | Today | After |
|---|---|---|
| `.qa-review-controls` bg | `var(--qa-bg-secondary)` | `var(--qa-ambient-surface)` + 1px `--qa-ambient-border` |
| `.qa-review-select` bg / focus | `--qa-bg-primary` + `--qa-accent` focus | `--qa-ambient-surface` + `--qa-ambient-accent` focus |
| `.qa-review-card-chip` bg | `--qa-bg-secondary` | `var(--qa-selection-bg)` |
| `.qa-review-clear-all-btn` color | `--qa-accent` | `--qa-ambient-accent` |
| `.qa-review-load-more:hover` | `--qa-accent` border + color | `--qa-ambient-accent` |
| `.qa-review-filter-chip` bg | `--qa-bg-secondary` + `--qa-border` | `--qa-ambient-surface` + `--qa-ambient-border` |

### Modal → ambient surface

```css
.qa-modal {
  background: var(--qa-ambient-surface);
  border: 1px solid var(--qa-ambient-border);
  box-shadow: var(--qa-ambient-elevation);
  border-radius: var(--qa-ambient-sheet-radius);
  /* rest unchanged */
}

.qa-modal h2 { color: var(--qa-ambient-parchment); }
.qa-modal p  { color: var(--qa-ambient-muted); }

.qa-input {
  background: var(--qa-bg-primary);
  border-color: var(--qa-ambient-border);
  color: var(--qa-ambient-parchment);
}
.qa-input:focus-visible {
  outline: 2px solid var(--qa-ambient-accent);
  border-color: var(--qa-ambient-accent);
}
```

Delete `.qa-btn`, `.qa-btn-primary`, `.qa-btn-secondary`, `.qa-btn-danger` from `theme.css`. Migrate `src/settings/clear-data.js` to emit `qa-mark-btn qa-mark-btn--ghost` for Cancel and `qa-mark-btn qa-mark-btn--danger-primary` for Delete (both already exist in the mark-editor CSS block).

### Reader surah-title bug fix

```css
/* theme.css line ~1327 */
@media (min-width: 1180px) {
  .qa-surah-header,
  .qa-surah-header-card,    /* ← added */
  .qa-basmala,
  .qa-surah-end,
  .qa-invalid-verse-error {
    grid-column: 1 / -1;
  }
}
```

The `.qa-surah-header` class is unused today but kept in the selector list for forward-compat; the `-card` variant is what `src/reader/index.js:580` actually renders. One-line addition, zero risk.

### Scope the reader grid (root fix for non-reader desktop surfaces)

```css
/* theme.css line ~1318 — BEFORE */
@media (min-width: 1180px) {
  #main-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 2rem;
    align-items: start;
  }
  /* ... */
}

/* AFTER */
@media (min-width: 1180px) {
  #main-content:has(.qa-verse) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 2rem;
    align-items: start;
  }
  /* grid-column rules below stay unchanged; they only match inside reader */
}
```

The companion `:has(.qa-verse-translation.qa-hide-translation)` rule at line ~1360 keeps working unchanged (it's already specific to reader). No JS change.

**Effect:** Every non-reader surface gets natural single-column behavior and fills `#main-content` up to its 1180px max-width. The Phase-2 per-surface desktop rules below (Surah list 2-col, About hero, Review rail) then land on a clean baseline instead of fighting the reader grid.

### True-center all bottom sheets at desktop

```css
/* theme.css — the tablet-up .qa-sheet override around line 1881 */
@media (min-width: 768px) {
  .qa-sheet {
    left: 50%;
    right: auto;
    bottom: auto;
    top: 50%;                                                 /* was 10vh */
    transform: translate(-50%, -50%);                         /* was translateX(-50%) */
    width: min(480px, calc(100vw - 32px));
    max-height: min(720px, 86vh);                             /* added: cap height */
  }
  @keyframes qa-sheet-rise {
    from { transform: translate(-50%, calc(-50% + 20px)); opacity: 0; }
    to   { transform: translate(-50%, -50%); opacity: 1; }
  }
}
```

Fixes the 17px top-bias measured at 1440×900 for Settings, More, and Mark editor in one edit. Mobile rule (`.qa-sheet { left: 8px; right: 8px; bottom: calc(8px + env(safe-area-inset-bottom)) }`) is unchanged — bottom-sheet placement stays mobile-native.

---

## Phase 2 — Desktop layouts

Every rule below is scoped inside `@media (min-width: 1180px)`. Mobile + tablet layouts are unchanged.

### Surah list (`#/surahs`)

```css
@media (min-width: 1180px) {
  .qa-surah-list-page { max-width: 1180px; }

  .qa-sl-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 2rem;
    row-gap: 0;
  }

  /* Continue-reading card spans both columns */
  .qa-sl-continue { grid-column: 1 / -1; }

  /* Row border becomes the column divider */
  .qa-sl-row { border-bottom: 1px dotted var(--qa-ambient-border); }
}
```

No JS changes. `.qa-sl-row` markup unchanged. Bookmark left-edge indicator (`.qa-sl-row--bm::before` at `left: -10px`) stays visible because each column's content area has enough left padding.

### Mark editor modal

```css
@media (min-width: 1180px) {
  .qa-sheet.qa-sheet--mark {
    width: min(820px, calc(100vw - 48px));
    /* top, transform already true-centered by the base .qa-sheet rule — decision #12 */
    max-height: min(760px, 86vh);
    border-radius: 14px;             /* symmetric, not bottom-sheet */
    animation: qa-modal-scale-in 0.18s ease forwards;
  }

  .qa-sheet--mark .qa-sheet-grip { display: none; }

  /* Verse hero: full-width subject, centered, gentle tint */
  .qa-sheet--mark .qa-mark-quote {
    grid-column: 1 / -1;
    margin: 0 -14px 14px;
    padding: 18px 22px;
    background: linear-gradient(180deg,
      color-mix(in srgb, var(--qa-ambient-accent) 6%, transparent),
      transparent);
    border-left: none;
    border-bottom: 1px solid var(--qa-ambient-border);
    border-radius: 0;
    text-align: center;
  }
  .qa-sheet--mark .qa-mark-quote-ref { letter-spacing: 0.15em; }
  .qa-sheet--mark .qa-mark-quote-ar  { font-size: 1.375rem; line-height: 2; }
  .qa-sheet--mark .qa-mark-quote-en  {
    font-size: 0.9375rem;
    max-width: 520px;
    margin: 0 auto;
    font-style: italic;
  }

  /* Body: 2-col under the hero */
  .qa-sheet--mark .qa-mark-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 1.5rem;
    row-gap: 0.5rem;
    align-items: start;
  }
  .qa-sheet--mark .qa-mark-body > .qa-mark-label,
  .qa-sheet--mark .qa-mark-body > .qa-mark-note           { grid-column: 1; }
  .qa-sheet--mark .qa-mark-body > .qa-mark-selected,
  .qa-sheet--mark .qa-mark-body > .qa-mark-search,
  .qa-sheet--mark .qa-mark-body > .qa-mark-all-head,
  .qa-sheet--mark .qa-mark-body > .qa-mark-chips--all     { grid-column: 2; }

  .qa-sheet--mark .qa-mark-note { min-height: 96px; }
}

@keyframes qa-modal-scale-in {
  from { transform: translate(-50%, -50%) scale(0.96); opacity: 0; }
  to   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
```

The existing body class-names are reused, so `src/marks/editor.js` needs no structural change. The one refinement the JS may need: the verse-preview block is today rendered with the same compact `qa-mark-quote` structure on mobile; the desktop CSS above simply re-styles it to a full-width hero.

### Review hub (`#/review`)

At desktop only, the top filter controls (`.qa-review-controls`) collapse; their group-by segmented control and filter function move into the left rail. The existing controls block continues to render (backward-compat) but is hidden at desktop via `display: none`. A new `.qa-review-rail` container is constructed by `src/review/hub.js` and inserted as the first child of the main content at `window.matchMedia('(min-width: 1180px)').matches`.

```css
@media (min-width: 1180px) {
  /* Only when review hub is the active surface */
  .qa-review-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    column-gap: 2rem;
    align-items: start;
    max-width: 1180px;
    margin: 0 auto;
  }

  .qa-review-layout .qa-review-controls { display: none; }

  .qa-review-rail {
    position: sticky;
    top: 1rem;
    padding-right: 1rem;
    border-right: 1px solid var(--qa-ambient-border);
    font-size: var(--qa-text-size-meta);
  }
  .qa-review-rail-section {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-accent);
    font-weight: 700;
    margin: 14px 0 6px;
  }
  .qa-review-rail-section:first-child { margin-top: 0; }
  .qa-review-rail-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--qa-ambient-parchment);
  }
  .qa-review-rail-row--on {
    background: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }
  .qa-review-rail-dot { width: 9px; height: 9px; border-radius: 50%; }
  .qa-review-rail-count { margin-left: auto; font-size: 0.6875rem; color: var(--qa-ambient-muted); }

  /* Main content: 2-col card grid */
  .qa-review-main { min-width: 0; }
  .qa-review-main .qa-review-card-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1rem;
    row-gap: 0.625rem;
  }
  .qa-review-main .qa-review-tag-header,
  .qa-review-main .qa-review-surah-header {
    grid-column: 1 / -1;
  }
}

/* FVR keeps its existing centered no-rail layout */
@media (min-width: 1180px) {
  .qa-fvr-layout { max-width: 720px; margin: 0 auto; }
}
```

**JS changes** (`src/review/hub.js`):

1. At init, wrap the existing main children in a `.qa-review-layout` container.
2. Build a `.qa-review-rail` sibling containing:
   - A fresh segmented control (Tag / Surah / Date) re-rendered from the same `state.groupBy` value — not a DOM clone, just a second view onto the same state. Click handler reuses the existing groupBy setter so mobile top-controls and desktop rail segmented stay in sync across breakpoint resizes.
   - The live list of entries in the active group with counts, each row acting as a filter toggle. Clicking a row filters the main view to that tag/surah/date bucket.
3. Group the existing card output under `.qa-review-main > .qa-review-card-list`. Individual card markup is unchanged; only two new wrapper divs are introduced so the 2-col grid can target `.qa-review-card-list` without affecting group headers (which should span both columns).
4. Guard desktop behavior with `matchMedia('(min-width: 1180px)')` — below breakpoint, mount the rail but apply `display: none` so the existing top controls keep working. On a resize across the breakpoint, no re-mount needed (CSS handles visibility).
5. FVR (`hub.js::init({ tag })` branch) skips rail construction entirely.

### About page (`#/about`)

```css
@media (min-width: 1180px) {
  #main-content:has(> .qa-about-heading) {
    max-width: 1000px;
  }

  .qa-about-heading,
  .qa-about-mission {
    text-align: center;
  }

  .qa-about-heading  { font-size: 2rem; }
  .qa-about-mission  { font-size: 1.125rem; margin-bottom: 2rem; }

  .qa-about-blessing-wrap {
    max-width: 720px;
    margin: 0 auto 2rem;
    padding: 1.75rem 1.5rem;
  }

  .qa-about-stat-grid {
    grid-template-columns: repeat(4, 1fr);
    margin: 2rem 0 2.5rem;
  }

  .qa-about-body-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    column-gap: 2.5rem;
    align-items: start;
  }
  .qa-about-body-split .qa-about-attribution { margin-bottom: 0; }
  .qa-about-body-split .qa-about-install     { margin-bottom: 0; }
}
```

**JS change** (`src/about/index.js`): wrap attribution + install + version in a `.qa-about-body-split` container. Single-column mobile layout is preserved because the grid only activates at ≥1180px.

---

## Testing plan

### Unit (Vitest)

- **`src/core/theme.contrast.test.js`** (new) — walks each theme and asserts WCAG AA:
  - `--qa-selection-text` on `--qa-selection-bg`: ≥ 4.5:1 for body copy.
  - `--qa-on-accent` on `--qa-ambient-accent`: ≥ 4.5:1.
  - `--qa-ambient-accent` on `--qa-bg-primary`: ≥ 3:1 (non-text UI).

### E2E (Playwright)

- **Smoke: existing specs run unchanged.** Markup for rows / cards / chips is stable; the new CSS adds column-grid behavior at desktop only. The surah-list, review-hub, and mark-editor beforeEach specs stay green.
- **New: `tests/e2e/desktop-layouts.spec.js`.** One test per surface at `viewport: 1440x900`:
  - Surah list → assert two columns present, row count unchanged from mobile snapshot.
  - Mark editor → open from a verse, assert modal is vertically centered, grip hidden, verse hero spans full width.
  - Review hub → assert `.qa-review-rail` visible, clicking a rail row filters main.
  - About → assert stats render 4-across.
- **Visual regression (screenshots):** baseline for each of the four surfaces × three themes at 375 / 768 / 1440 widths. Playwright's default screenshot-diff directory (`<spec>-snapshots/`) is used — no new test-infra work needed.

### Manual

- Per-theme walkthrough of every selection state (dock, surah-list filter, mark-chip, review-seg, onboarding swatch + translation picker) in Light / Sepia / Dark to confirm the soft-tint reads legibly and the primary buttons still stand out.
- Clear-data flow to confirm modal looks native alongside sheets in all themes.

---

## Migration risk

| Risk | Mitigation |
|---|---|
| `--qa-accent` aliased to ambient changes color slightly in light (`#8b6b3a` → `#78592e`). | Difference is ΔE≈4 — visually subtle bronze shift, intentional unification. Caught by screenshot baseline. |
| Dark-mode accent goes from sky `#7dd3fc` to amber `#d4a253`. | Explicitly desired. Called out in release notes. |
| `.qa-btn-*` retirement breaks any future consumer. | Only current consumer is `clear-data.js`. Delete the class, grep for `qa-btn-` to confirm zero external use. |
| Review hub rail is new JS structure — potential re-render regression. | New rail wraps existing output; card-rendering code is untouched. Rail construction is additive and guarded by a media-query check. |
| Mark editor desktop hero depends on existing class names. | Every class referenced already exists; CSS only. Zero JS change in `marks/editor.js`. |
| Reader surah-header selector fix could theoretically affect something that expected left-column placement. | Nothing in the codebase depends on this; the current placement is a bug relative to the sibling `.qa-basmala` / `.qa-surah-end` rules which already span both columns. |

---

## Documentation updates required (per CLAUDE.md Rule 1 & 2)

- **`docs/context/user-journeys.md`** — update the "Review hub" journey to mention the left rail at desktop. The surah-list / mark-editor / about flows are unchanged at the surface level.
- **`docs/context/architecture.md`** — no update; no new cross-cutting patterns.
- **`docs/context/feature-map.md`** — no update; route/entry points unchanged.
- **`docs/context/events.md`** — no update; no new events.
- **`docs/context/data-model.md`** — no update; no IDB changes.
- **`docs/context/module-graph.md`** — no update; no new imports.

---

## Alternatives considered

| Decision | Alternatives rejected | Why |
|---|---|---|
| Tokens first | Per-surface end-to-end | Same tokens would be touched three times; higher risk of drift. |
| Soft-tint selection | Solid fill with `--qa-on-accent` only | Solid fill in dark mode with amber-on-near-black feels harsh for a quiet reading app; soft tint reads "state" not "action". |
| Bronze family (amber dark) | Keep sky `#7dd3fc` | Sky contrasts against light/sepia's bronze — three themes felt disjoint, not variants. |
| Primaries stay solid | Soft-tint primaries too | Commit buttons need visual weight; soft-tint Save reads as "maybe save". |
| Modal adopts ambient | Keep `.qa-modal` distinct | A standalone modal style among six ambient-surface sheets is just drift. |
| Surah list 2-col rows | Card grid / wide single column | 114 surahs is a scanning task; cards slow scanning, single column wastes width. |
| Mark editor verse hero | Refined 2-col (current shape) | The modal is about one verse — making it the subject fixes the "crammed" feel. |
| Review hub left rail | Top 2-col grid / dense single col | Many tags → rail navigation beats dropdowns; desktop-native inbox pattern. |
| About hero + 4-across | Magazine split | Blessing is the emotional center; splitting it weakens the page. |

---

## Implementation sequencing

Rough order for the writing-plans / executing-plans phase:

1. **Structural scoping fixes** — these unblock every Phase-2 surface, so they land first:
   - Scope reader grid (`#main-content` → `#main-content:has(.qa-verse)`).
   - True-center all `.qa-sheet` at desktop + cap height.
   - Fix the `.qa-surah-header-card` grid-column-span selector.
   One commit, CSS-only, no user-visible effect on reader or mobile.
2. **Tokens** — add `--qa-on-accent`, `--qa-selection-*`; alias `--qa-accent`; swap dark accent.
3. **Contrast test** — add the Vitest contrast suite before touching selectors, so the refactor is guarded.
4. **Selector refactor** — eight selection selectors + six Review hub leaks + `.qa-modal` + reader header fix. All CSS-only except `settings/clear-data.js` class swap.
5. **Retire `.qa-btn-*`** — delete classes, migrate clear-data.
6. **Desktop — Surah list** (CSS-only).
7. **Desktop — About** (CSS + single wrapper in `about/index.js`).
8. **Desktop — Mark editor** (CSS-only; verify `marks/editor.js` is untouched).
9. **Desktop — Review hub** (CSS + `review/hub.js` rail construction).
10. **Screenshot baseline** + **desktop-layouts.spec.js** + manual walkthrough.
11. **Docs** — update `user-journeys.md`.
