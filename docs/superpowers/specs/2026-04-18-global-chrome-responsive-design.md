# Global Chrome Responsive — Design Spec

**Date:** 2026-04-18
**Scope:** Sub-project 2 of the multi-part responsive overhaul. Adapts the app's shared chrome — ambient dock, ambient pill, bottom sheets (More, Settings, Mark editor), command sheet, and onboarding landscape handling — to the three-tier breakpoint system established in sub-project 1.

---

## Context

Sub-project 1 shipped the responsive foundation (breakpoint tokens, two-track typography, reader two-column layout). It deliberately left chrome surfaces mobile-only, flagging them for this sub-project. The touchable surfaces that still lack responsive adaptation are the ambient dock, ambient pill, three bottom sheets, the ⌘K command sheet, and onboarding. All share one trait: their current layout is mobile-first with at most one legacy breakpoint (`@media (min-width: 720px)` for sheet-to-centered-modal), which pre-dates the breakpoint tokens.

This sub-project brings every chrome surface onto the same three-tier system and fixes two concrete carry-overs: the mismatched 720px sheet breakpoint, and onboarding's lack of a landscape-height guard on short viewports.

## Goals

1. Every chrome surface either (a) adapts intentionally at `--qa-bp-tablet` (768px) and `--qa-bp-desktop` (1180px), or (b) explicitly inherits — no accidental layouts.
2. Dock becomes comfortably sized on tablet and learns to show inline labels on desktop, matching the reader's desktop polish.
3. Mark editor uses the horizontal room desktop provides (a 2-column grid in the editor's body) so the primary interaction surface doesn't look cramped next to the reader's 2-column layout.
4. Landscape phones stop clipping onboarding content.
5. Every journey that touches chrome is Playwright-verified at four viewport configurations before the sub-project closes.
6. CSS-only where possible; one-line JS change permitted in `src/marks/editor.js` to add a modifier class on the sheet body.

## Non-goals

- Sidebar navigation paradigm — rejected during brainstorming as too heavy for the payoff.
- Review hub, surah list, about, settings panel internal layout, and all other non-chrome surfaces — each gets its own sub-project.
- Side-panel (non-dimming) sheet variants — rejected as too divergent from the existing interaction model.
- Visual regression test infrastructure — the Playwright MCP journey pass serves that role for this sub-project.
- Changes to IDB, events catalog, router, or settings schema.
- Any new tokens beyond what sub-project 1 already introduced.

---

## Section 1 — Breakpoints

No new breakpoints. Reuses `--qa-bp-tablet: 768px` and `--qa-bp-desktop: 1180px` from `src/core/theme.css`. Values are still written as literals in `@media` conditions (CSS limitation — same note as sub-project 1).

The existing `@media (min-width: 720px)` block that currently triggers the sheet-to-centered-modal variant is renamed to `min-width: 768px`. This is the only breakpoint-value change in this sub-project.

### Landscape phone regression note

Raising 720 → 768 means phones at 720–767px wide (e.g. iPhone 14 Pro in landscape at 852×393) now get the mobile slide-up sheet instead of the centered modal. The slide-up has `max-height: 86vh` with internal scroll, so content never overflows the viewport. The onboarding landscape guard (Section 6) covers the same width band for its own surface. Accepted as an intentional regression.

---

## Section 2 — Ambient dock

Three-tier progression. All auto-hide logic, scroll handling, and route-based visibility in `src/nav/ambient-dock.js` is unchanged.

### Mobile (<768px)

Unchanged. Existing `#bottom-nav` rules apply (pill container, 38×38px circular `.qa-dock-item`, accent-on-hover).

### Tablet (≥768px)

- `.qa-dock-item` grows from 38×38 → 42×42px.
- `#bottom-nav` gains ~4px additional padding around item cluster.
- Glyph-only (no labels yet).
- No structural / DOM change.

### Desktop (≥1180px)

- `.qa-dock-item` switches from circle to pill shape: `padding: 0.5rem 0.875rem`, `border-radius: 999px`, `gap: 0.5rem` between glyph and label.
- The visually-hidden `.qa-dock-item-label` (currently `sr-only`) un-hides: `clip: auto`, `clip-path: none`, `position: static`, `width: auto`, `height: auto`, `white-space: nowrap`. Font size: `var(--qa-text-size-ui)` (already stepped via sub-project 1).
- `#bottom-nav` widens to accommodate labeled items; stays bottom-centered.
- Active-state styling (`.qa-dock-item--active`) gets the same accent treatment; no additional work.

**No JS changes.** All surfacing via the existing `ambient-dock.js` effect. The label element already exists in the DOM for accessibility; this sub-project just makes it visible at the right viewport.

---

## Section 3 — Ambient pill

No positioning change. No new `@media` blocks.

Text sizes for `.qa-pill-ref-text` and `.qa-pill-ref-hint` already resolve through `--qa-text-size-meta`, which steps 14 → 15 → 16px mobile/tablet/desktop via sub-project 1. Pill therefore auto-scales. The ⌘K hint suffix likewise inherits.

Noted here explicitly so the spec reader and plan implementer know this was considered and intentionally left as-is.

---

## Section 4 — Bottom sheets

Three sheets share the `.qa-sheet-backdrop / .qa-sheet / .qa-sheet-hdr / .qa-sheet-body / .qa-sheet-footer` structure: More, Settings, Mark editor. The shared positioning/animation rules live in `src/core/theme.css:1770–1850`.

### Mobile (<768px)

Unchanged. Slide-up from bottom, full-width, `max-height: 86vh`, internal scroll on body.

### Tablet (≥768px) — reconciled breakpoint

Existing centered-modal rules (currently `@media (min-width: 720px)`) rename to `min-width: 768px`. No changes inside the block: `top: 10vh`, `width: min(480px, calc(100vw - 32px))`, `transform: translateX(-50%)`, enter animation (`qa-sheet-rise`) transforms to match center position.

### Desktop (≥1180px)

Split treatment per sheet:

#### More sheet & Settings sheet

No change from tablet. Stay at ~480px centered modal. These sheets are lightweight (5-ish rows, theme swatches, font slider) — more width would only add whitespace.

#### Mark editor — 2-column layout

Mark editor `.qa-sheet-body` switches to a 2-column CSS Grid at desktop only:

```css
@media (min-width: 1180px) {
  .qa-sheet.qa-sheet--mark {
    width: min(640px, calc(100vw - 32px));
  }
  .qa-sheet--mark .qa-sheet-body--mark {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 1.25rem;
    row-gap: 0.75rem;
  }
  .qa-sheet--mark .qa-sheet-body--mark > .qa-mark-preview,
  .qa-sheet--mark .qa-sheet-body--mark > .qa-mark-note {
    grid-column: 1;
  }
  .qa-sheet--mark .qa-sheet-body--mark > .qa-mark-selected-tags,
  .qa-sheet--mark .qa-sheet-body--mark > .qa-mark-all-tags {
    grid-column: 2;
  }
  .qa-sheet--mark .qa-sheet-footer {
    grid-column: 1 / -1;
  }
}
```

**One JS change required** in `src/marks/editor.js`: when constructing the editor sheet, add two modifier classes:
- On the root sheet: `qa-sheet--mark` (for the width bump).
- On the body container: `qa-sheet-body--mark` (for the grid).

The editor currently uses `class="qa-sheet"` and `class="qa-sheet-body"` at lines ~100 and ~140 of `editor.js`. The change is additive — existing selectors keep matching. One line modified in each of the two template strings.

Selector choice rationale: scoping grid rules to a `.qa-sheet--mark` class (not to `.qa-sheet:has(.qa-mark-note)`) avoids specificity clashes with the More / Settings sheets, which share identical DOM classes up to the body's direct children.

---

## Section 5 — Command sheet

### Mobile (<640px)

Unchanged. Full-screen overlay. `.qa-cmd-foot` hidden via existing `@media (max-width: 640px)` rule.

### Tablet (≥768px)

Promote the `⌘K` footer hint. Flip the existing `@media (max-width: 640px) .qa-cmd-foot { display: none }` rule: the hide rule stays targeted at narrow widths; at tablet the footer shows by default (it already does — no explicit change). But add an explicit `@media (min-width: 768px) .qa-cmd-foot { display: flex; }` block to make intent readable for future maintainers.

No width / position change at tablet — the command sheet is already a centered modal from its own rules.

### Desktop (≥1180px)

Cap `max-width` at 640px (currently grows unbounded when content demands). Centered positioning preserved. Result lists stay at their existing row sizes — only the container caps.

---

## Section 6 — Onboarding landscape guard

Scoped to onboarding, not global. Handles phones in landscape and short-desktop windows.

```css
@media (max-height: 500px) {
  .qa-onb-page {
    min-height: 100%;                 /* was: 72vh */
    justify-content: flex-start;      /* was: center */
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  .qa-onb-hero {
    padding-block: 0.5rem;             /* shrink hero breathing room */
  }
  .qa-onb-dots {
    margin-top: 0.75rem;               /* pull dots closer, rely on flex layout to pin */
  }
}
```

Exact selectors verified in `theme.css:2439–2450` during plan writing — if the actual class names differ, the plan task is to adapt names but preserve the three intents above (shrink vertical requirements, top-align content, reduce hero padding).

Sheets are **not** affected by this guard. Their existing `max-height: 86vh` + internal-scroll behavior already handles short viewports.

---

## Section 7 — Files touched

### In scope

1. **`src/core/theme.css`** — all CSS additions:
   - Dock tablet + desktop blocks.
   - Sheet breakpoint rename (720 → 768) and mark-editor desktop 2-col block.
   - Command sheet desktop `max-width` cap + footer-hint promotion.
   - Onboarding landscape guard.

2. **`src/marks/editor.js`** — add `qa-sheet--mark` to the sheet root and `qa-sheet-body--mark` to the sheet body. Two-line change total, no logic touched.

3. **`tests/unit/core/responsive-tokens.test.js`** — regex-assert the new CSS rules are present (same pattern as sub-project 1).

4. **`docs/context/user-journeys.md`** — per Rule 1, add desktop-variant notes to: A (onboarding landscape), B1/B4 (dock at tablet/desktop), C1–C5 (mark editor 2-col at desktop), F1 (command sheet desktop cap).

5. **`docs/context/architecture.md`** — extend the Responsive breakpoints bullet added in sub-project 1 with a sentence on chrome adaptation.

### Explicitly untouched

- `src/nav/ambient-dock.js`, `src/nav/ambient-pill.js`, `src/nav/more-sheet.js`, `src/nav/command-sheet.js`
- `src/settings/panel.js`
- `src/onboarding/index.js`, `src/onboarding/screens.js`
- `src/reader/index.js`, `src/reader/scroll-tracker.js`
- All IDB stores, `src/core/db.js`, `src/core/events.js`, `src/core/router.js`

---

## Section 8 — Automated CSS regression tests

Extend `tests/unit/core/responsive-tokens.test.js` with text-level assertions:

1. Dock — tablet block exists, targeting `.qa-dock-item` with `width: 2.625rem` (42px) at `min-width: 768px`.
2. Dock — desktop block exists making `.qa-dock-item-label` visible (`position: static`) at `min-width: 1180px`.
3. Sheet breakpoint — `min-width: 768px` sheet-centered-modal block exists; `min-width: 720px` no longer targets `.qa-sheet`.
4. Mark editor — `min-width: 1180px` block with `display: grid` on `.qa-sheet-body--mark` and `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`.
5. Command sheet — `min-width: 1180px` block capping `.qa-cmd-sheet { max-width: 640px }`.
6. Onboarding — `max-height: 500px` block targeting `.qa-onb-page` with `min-height: 100%`.

Same jsdom caveat as sub-project 1: tests assert rules are *present*, not that they *apply*. Application verification happens in Section 9.

---

## Section 9 — Playwright MCP journey verification (required)

Executed after all CSS/JS work commits and unit tests are green. Regressions found are fixed in the same sub-project — this is not a follow-up ticket; it is the definition of "done."

### Viewport matrix

| Config | Size | Role |
|---|---|---|
| Mobile | 375×667 | iPhone SE baseline |
| Tablet | 820×1180 | iPad portrait |
| Desktop | 1440×900 | Laptop |
| Landscape phone | 667×375 | Onboarding guard |

### Journeys (from `docs/context/user-journeys.md`)

| Journey | Chrome surface impacted |
|---|---|
| A1 First-run onboarding | Landscape guard; onboarding is chrome |
| B1 Tap-to-surface dock + pill | Dock sizing across tiers; pill auto-scale |
| B2 Scroll hide/show dock | Auto-hide at tablet/desktop |
| B4 Non-reader persistent dock | Dock at non-reader routes across tiers |
| B6 Font slider live preview | Chrome tokens × slider multiply still works |
| C1/C4/C5 Long-press → save/delete mark | Mark editor 2-col on desktop |
| D1–D3 Settings sheet | 720→768 rename; sheet behavior at tablet |
| F1/F3 Command sheet (⌘K) | Desktop `max-width` cap; footer hint |
| E3 Review hub chip → FVR | Regression smoke adjacent to sheet work |

### Verification loop per journey

1. Resize viewport to the target width.
2. Navigate to entry route.
3. Execute every numbered step verbatim from `user-journeys.md`.
4. Take screenshots of key states: dock at rest/surfaced, sheet open/closed, mark editor open on desktop.
5. Assert DOM state and capture console output.
6. On regression: record catalog entry (inline in the plan's final task), fix, re-run the same journey. **Do not advance past a failing journey.**

### Exit criteria

- All listed journeys pass on all four viewports.
- No new console errors or warnings.
- Screenshots archived under `docs/superpowers/verification/2026-04-18-chrome-responsive/` and referenced from the final commit or PR description.

### Output

Either (a) a clean walkthrough summary or (b) a catalog of regressions with their fix commit SHAs. Both live in the final commit message or an appended section of the plan.

---

## Risks & open questions

- **Mark editor 2-column content-fit.** The note textarea and tags search list differ in natural height. The grid uses `align-items: start` implicitly, so the shorter column ends earlier — accepted. If the visual feels imbalanced during Section 9 verification, the fix is either `align-self: stretch` on the tags panel or a `min-height` on the note textarea at desktop. Decision deferred to implementation.
- **Dock label overflow on locale switch.** Labels are currently English-only ("Read", "Search", "Review", "More"). A future localization pass may produce longer strings. Out of scope here — documented as a forward-looking risk.
- **Landscape-phone sheet regression (720→768).** Already called out in Section 1. If user feedback later indicates the slide-up is too tall at 720×393, the fix is a height-aware addition: `@media (max-height: 500px) { .qa-sheet { max-height: 92vh } }` — left as a known lever, not applied pre-emptively.
- **Command sheet footer-hint promotion — redundant rule.** The explicit `@media (min-width: 768px) .qa-cmd-foot { display: flex }` block is arguably already the default behavior. Added for explicit intent; plan can collapse it if the implementer prefers fewer rules.

---

## Foundation contract for downstream sub-projects

After this ships, sub-projects 3+ (surah list, review hub, settings panel internals, about, mark editor's JS behavior if needed) inherit:

- **Chrome fully responsive.** New surfaces only need to concern themselves with their own content layout — dock, pill, sheet animation, command sheet, onboarding all scale for them.
- **Sheet convention.** Any new sheet uses `.qa-sheet` root + `.qa-sheet-body` wrapper → it automatically becomes centered modal at tablet+. For sheets whose desktop layout benefits from more width or structure, add a single modifier class (`qa-sheet--foo`, `qa-sheet-body--foo`) and scope the desktop rules to that class — same pattern this sub-project establishes for the mark editor.
- **Playwright MCP as the visual regression bar.** Sub-project 3+ should adopt the Section 9 journey-verification phase as the closing step of their own plans.

---

## Downstream sub-project sequence (for context, not in scope)

1. ✅ Foundation + Reader (sub-project 1)
2. ✅ Global chrome adaptation (this spec)
3. Reader-adjacent list surfaces — review hub, surah list.
4. Settings, onboarding (internal layout polish), about, mark editor internal polish, command sheet content scaling.

Each gets its own spec → plan → implementation cycle.
