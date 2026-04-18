# Global Chrome Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the app's shared chrome — ambient dock, ambient pill, bottom sheets (More, Settings, Mark editor), command sheet, and onboarding landscape handling — to the three-tier breakpoint system shipped in sub-project 1.

**Architecture:** CSS-only. All CSS changes land in `src/core/theme.css`. No JavaScript changes — the mark editor already has the required `.qa-sheet--mark` / `.qa-mark-body` modifier classes in `src/marks/editor.js:78` and `:99`. Same test approach as sub-project 1 (regex-assert CSS rules against `theme.css` text from Vitest/jsdom). Playwright MCP journey verification at the end walks real flows in a real browser across four viewport configurations.

**Tech Stack:** Vanilla JS + Vite, single `src/core/theme.css`, Vitest + jsdom test runner, pnpm package manager, Playwright MCP tools (`mcp__plugin_playwright_playwright__*`) for journey verification.

**Source spec:** `docs/superpowers/specs/2026-04-18-global-chrome-responsive-design.md`.

---

## Pre-flight

- [ ] **Verify clean working tree on `main`**

Run: `git status`
Expected: clean working tree on `main`; last commit is `a9572dc` (the chrome responsive spec). Sub-project 1 has merged.

- [ ] **Verify baseline test suite passes**

Run: `pnpm run test:run`
Expected: all tests pass (baseline is 378 from sub-project 1). If anything fails before we touch code, stop and investigate.

- [ ] **Create a fresh worktree for this sub-project**

Use the `superpowers:using-git-worktrees` skill. Target: `.worktrees/chrome-responsive` on branch `feature/chrome-responsive`. Verify the branch diverges from `main` at the correct commit (`a9572dc`), run `pnpm install`, and confirm `pnpm run test:run` passes inside the worktree (378 tests).

- [ ] **Confirm the deferred Playwright MCP tools exist**

In the executing environment, list the MCP tools. The following must be callable (they are deferred — load via `ToolSearch` when needed):
- `mcp__plugin_playwright_playwright__browser_navigate`
- `mcp__plugin_playwright_playwright__browser_resize`
- `mcp__plugin_playwright_playwright__browser_click`
- `mcp__plugin_playwright_playwright__browser_type`
- `mcp__plugin_playwright_playwright__browser_press_key`
- `mcp__plugin_playwright_playwright__browser_snapshot`
- `mcp__plugin_playwright_playwright__browser_take_screenshot`
- `mcp__plugin_playwright_playwright__browser_wait_for`
- `mcp__plugin_playwright_playwright__browser_console_messages`
- `mcp__plugin_playwright_playwright__browser_evaluate`
- `mcp__plugin_playwright_playwright__browser_hover`

If any are unavailable, flag and stop — the Playwright phase (Tasks 11–17) depends on them.

---

## Task 1: Ambient dock — tablet sizing bump

**Files:**
- Modify: `src/core/theme.css` (insert a new `@media (min-width: 768px)` block near `.qa-dock-item` at line ~482)
- Modify: `tests/unit/core/responsive-tokens.test.js` (append new `it()`)

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('theme.css — responsive breakpoint tokens', ...)` block in `tests/unit/core/responsive-tokens.test.js` (before its closing `})`):

```javascript
  it('bumps .qa-dock-item size at tablet (42×42px)', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-dock-item\s*\{[^}]*width:\s*2\.625rem/.test(b[1]) &&
      /\.qa-dock-item\s*\{[^}]*height:\s*2\.625rem/.test(b[1])
    )
    expect(hit, 'expected a min-width: 768px block bumping .qa-dock-item to 42×42px').toBeDefined()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: 1 new failure.

- [ ] **Step 3: Add the tablet dock block**

In `src/core/theme.css`, locate the `.qa-dock-item::after` rule at line ~477–482 (the "touch target hit zone" rule). Immediately after its closing `}`, insert:

```css
/* Tablet: larger dock hit targets for iPad. Glyph-only still — labels arrive
 * at desktop. Matches --qa-bp-tablet. */
@media (min-width: 768px) {
  .qa-dock-item {
    width: 2.625rem;
    height: 2.625rem;
  }
  .qa-dock-icon {
    font-size: 1.2rem;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: all pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm run test:run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "feat(chrome): bump ambient dock hit targets at tablet breakpoint"
```

---

## Task 2: Ambient dock — desktop pill + visible labels

At desktop, `.qa-dock-item` switches from a circle to a pill and the visually-hidden `.qa-dock-label` becomes visible inline.

**Files:**
- Modify: `src/core/theme.css` (new `@media (min-width: 1180px)` block)
- Modify: `tests/unit/core/responsive-tokens.test.js`

- [ ] **Step 1: Extend the failing test**

Append inside the existing `describe`:

```javascript
  it('at desktop, .qa-dock-label un-hides (position: static)', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-dock-label\s*\{[^}]*position:\s*static/.test(b[1]))
    expect(hit, 'expected a min-width: 1180px block un-hiding .qa-dock-label').toBeDefined()
  })

  it('at desktop, .qa-dock-item becomes pill-shaped with gap + padding', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-dock-item\s*\{[^}]*border-radius:\s*999px/.test(b[1]) &&
      /\.qa-dock-item\s*\{[^}]*gap:\s*0\.5rem/.test(b[1])
    )
    expect(hit, 'expected .qa-dock-item to be pill-shaped with gap 0.5rem at desktop').toBeDefined()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: 2 new failures.

- [ ] **Step 3: Add the desktop dock block**

In `src/core/theme.css`, immediately after the tablet dock block added in Task 1, insert:

```css
/* Desktop: dock becomes a labeled pill. The sr-only .qa-dock-label unhides
 * inline next to the glyph. Matches --qa-bp-desktop. */
@media (min-width: 1180px) {
  .qa-dock-item {
    width: auto;
    height: auto;
    padding: 0.5rem 0.875rem;
    border-radius: 999px;
    gap: 0.5rem;
    font-size: var(--qa-text-size-ui);
  }
  .qa-dock-label {
    position: static;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    overflow: visible;
    clip: auto;
    clip-path: none;
    white-space: nowrap;
  }
  .qa-dock-icon {
    font-size: 1.15rem;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: all pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm run test:run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "feat(chrome): show dock labels and pill shape at desktop breakpoint"
```

---

## Task 3: Sheet breakpoint reconciliation (720px → 768px)

**Files:**
- Modify: `src/core/theme.css:1786` (rename the media query value)
- Modify: `tests/unit/core/responsive-tokens.test.js`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe`:

```javascript
  it('sheet-to-centered-modal triggers at min-width: 768px (not 720px)', () => {
    // The .qa-sheet centered-modal rules must live in a 768px block now.
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet\s*\{[^}]*top:\s*10vh/.test(b[1]) &&
      /\.qa-sheet\s*\{[^}]*width:\s*min\(480px,\s*calc\(100vw\s*-\s*32px\)\)/.test(b[1])
    )
    expect(hit, 'expected sheet-centered-modal rules under min-width: 768px').toBeDefined()
  })

  it('no remaining @media (min-width: 720px) targeting .qa-sheet', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*720px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const sheetHit = blocks.find(b => /\.qa-sheet\s*\{/.test(b[1]))
    expect(sheetHit, 'no 720px block should still target .qa-sheet').toBeUndefined()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: 2 new failures — the sheet rules still live under 720px.

- [ ] **Step 3: Rename the breakpoint**

In `src/core/theme.css`, find the block at line 1786 (which reads `@media (min-width: 720px) { .qa-sheet { … } @keyframes qa-sheet-rise { … } }`). Change `720px` to `768px`. The block's content is preserved exactly as-is.

Final header line:

```css
@media (min-width: 768px) {
```

The `@keyframes qa-sheet-rise` inside the block (line 1795) also gets renormalized under the 768px guard — this is automatic since we changed the outer media query value only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: all pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm run test:run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "chore(chrome): normalize sheet-to-modal breakpoint 720px -> 768px"
```

---

## Task 4: Mark editor — desktop 2-column body grid + width bump

At desktop, the mark editor sheet grows from 480px to 640px and its body becomes a 2-column grid. Uses the existing `.qa-sheet--mark` (on sheet root, `editor.js:78`) and `.qa-mark-body` (on body wrapper, `editor.js:99`) modifier classes — no JS change needed.

**Files:**
- Modify: `src/core/theme.css` (new `@media (min-width: 1180px)` block, placed near the existing `.qa-sheet--mark` rule at line ~2030)
- Modify: `tests/unit/core/responsive-tokens.test.js`

- [ ] **Step 1: Inspect mark editor DOM**

Before writing the CSS, verify the children of `.qa-mark-body` in `src/marks/editor.js`. Expected direct children in order:
1. `.qa-mark-quote` (verse preview)
2. `.qa-mark-label` (note label)
3. `.qa-mark-note` (textarea)
4. `.qa-mark-selected` (selected-tags strip)
5. `.qa-mark-search` (search input wrap)
6. `.qa-mark-all-head` (all-tags header)
7. `.qa-mark-chips.qa-mark-chips--all` (all-tags chips)

Confirm by reading `src/marks/editor.js` around lines 99–200. If the actual structure nests any of these under an intermediate wrapper, use `.qa-mark-body <descendant>` instead of `> `; update the selectors in Step 3 accordingly.

- [ ] **Step 2: Extend the failing test**

Append inside the existing `describe`:

```javascript
  it('at desktop, .qa-sheet--mark widens to 640px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet\.qa-sheet--mark[^{]*\{[^}]*width:\s*min\(640px,\s*calc\(100vw\s*-\s*32px\)\)/.test(b[1])
    )
    expect(hit, 'expected .qa-sheet--mark to widen to 640px at desktop').toBeDefined()
  })

  it('at desktop, .qa-mark-body becomes a 2-column grid', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-sheet--mark\s+\.qa-mark-body\s*\{[^}]*display:\s*grid/.test(b[1]) &&
      /\.qa-sheet--mark\s+\.qa-mark-body\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/.test(b[1])
    )
    expect(hit, 'expected .qa-mark-body to be 2-col grid at desktop').toBeDefined()
  })

  it('at desktop, mark-body left column hosts quote + note; right hosts tags', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-mark-quote[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-note[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-selected[^{]*\{[^}]*grid-column:\s*2/.test(b[1])
    )
    expect(hit, 'expected quote+note in col 1 and selected tags in col 2').toBeDefined()
  })
```

- [ ] **Step 3: Add the desktop mark-editor block**

In `src/core/theme.css`, find the `.qa-sheet--mark { max-height: 86%; }` rule at line ~2030. Immediately after it, insert:

```css
/* Desktop: mark editor grows and its body splits into two columns.
 * Left: verse preview + note textarea. Right: selected tags + search + all tags.
 * Uses the existing .qa-sheet--mark / .qa-mark-body modifier classes from
 * src/marks/editor.js — no JS change. Matches --qa-bp-desktop. */
@media (min-width: 1180px) {
  .qa-sheet.qa-sheet--mark {
    width: min(640px, calc(100vw - 32px));
  }

  .qa-sheet--mark .qa-mark-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 1.25rem;
    row-gap: 0.75rem;
    align-items: start;
  }

  /* Left column — preview + note */
  .qa-sheet--mark .qa-mark-body > .qa-mark-quote,
  .qa-sheet--mark .qa-mark-body > .qa-mark-label,
  .qa-sheet--mark .qa-mark-body > .qa-mark-note {
    grid-column: 1;
  }

  /* Right column — tags */
  .qa-sheet--mark .qa-mark-body > .qa-mark-selected,
  .qa-sheet--mark .qa-mark-body > .qa-mark-search,
  .qa-sheet--mark .qa-mark-body > .qa-mark-all-head,
  .qa-sheet--mark .qa-mark-body > .qa-mark-chips--all {
    grid-column: 2;
  }
}
```

Note: `.qa-sheet-footer` is a **sibling** of `.qa-sheet-body`, not a child, so no `grid-column: 1 / -1` rule is needed for it — the footer simply sits below the grid in the sheet's existing flex column.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: all pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm run test:run`
Expected: all tests pass (including reader + editor tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "feat(chrome): mark editor 2-column body grid at desktop"
```

---

## Task 5: Command sheet — desktop max-width cap + footer-hint promotion

**Files:**
- Modify: `src/core/theme.css` (add rules near existing `.qa-cmd-foot` at line ~1469 and `.qa-cmd-sheet` elsewhere in the command-sheet section)
- Modify: `tests/unit/core/responsive-tokens.test.js`

- [ ] **Step 1: Locate the command-sheet CSS section**

Read `src/core/theme.css` around lines 1420–1500. Find:
- `.qa-cmd-sheet` rule (the main modal container)
- `.qa-cmd-foot` rule at line ~1469
- `@media (max-width: 640px) { .qa-cmd-foot { display: none; } }` at line ~1479–1481

- [ ] **Step 2: Extend the failing test**

Append inside the existing `describe`:

```javascript
  it('at desktop, .qa-cmd-sheet caps max-width at 640px', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*1180px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-cmd-sheet\s*\{[^}]*max-width:\s*640px/.test(b[1]))
    expect(hit, 'expected .qa-cmd-sheet to cap at 640px at desktop').toBeDefined()
  })

  it('at tablet+, .qa-cmd-foot is explicitly shown', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*min-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b => /\.qa-cmd-foot\s*\{[^}]*display:\s*flex/.test(b[1]))
    expect(hit, 'expected .qa-cmd-foot display:flex at min-width 768px').toBeDefined()
  })
```

- [ ] **Step 3: Add the command-sheet desktop + tablet rules**

In `src/core/theme.css`, locate the end of the command-sheet section (somewhere after line ~1490, before the next section comment / surah-list section around ~1500+). Insert:

```css
/* Tablet+: show the ⌘K footer hint. The mobile rule above hides it below
 * 640px; this makes "shown" the explicit intent at tablet+. */
@media (min-width: 768px) {
  .qa-cmd-foot {
    display: flex;
  }
}

/* Desktop: cap command sheet width so result lists don't stretch
 * edge-to-edge on wide screens. */
@media (min-width: 1180px) {
  .qa-cmd-sheet {
    max-width: 640px;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: all pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm run test:run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "feat(chrome): command sheet desktop width cap and footer hint promotion"
```

---

## Task 6: Onboarding landscape guard (`max-height: 500px`)

**Files:**
- Modify: `src/core/theme.css` (new `@media (max-height: 500px)` block placed near the existing `.qa-onb-page` rule at line ~2440)
- Modify: `tests/unit/core/responsive-tokens.test.js`

- [ ] **Step 1: Locate onboarding CSS section**

Read `src/core/theme.css` around line 2440. The existing rule is:

```css
.qa-onb-page { position: relative; display: flex; flex-direction: column; min-height: 72vh; }
```

Also look nearby for `.qa-onb-hero` and `.qa-onb-dots` rules — the guard block references them. If their exact class names differ, adapt the selectors in Step 3.

- [ ] **Step 2: Extend the failing test**

Append inside the existing `describe`:

```javascript
  it('onboarding landscape guard: max-height: 500px shrinks .qa-onb-page', () => {
    const blocks = [...THEME_CSS.matchAll(/@media\s*\(\s*max-height:\s*500px\s*\)\s*\{([\s\S]*?)\n\}/g)]
    const hit = blocks.find(b =>
      /\.qa-onb-page\s*\{[^}]*min-height:\s*100%/.test(b[1]) &&
      /\.qa-onb-page\s*\{[^}]*justify-content:\s*flex-start/.test(b[1])
    )
    expect(hit, 'expected .qa-onb-page height guard at max-height 500px').toBeDefined()
  })
```

- [ ] **Step 3: Add the landscape guard block**

In `src/core/theme.css`, immediately after the `.qa-onb-page` rule at line ~2440, insert:

```css
/* Landscape phones & short-desktop windows: drop the 72vh min-height that
 * overflows when viewport is short. Top-align content; sheets are unaffected
 * (they already internal-scroll). */
@media (max-height: 500px) {
  .qa-onb-page {
    min-height: 100%;
    justify-content: flex-start;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  .qa-onb-hero {
    padding-block: 0.5rem;
  }
  .qa-onb-dots {
    margin-top: 0.75rem;
  }
}
```

If `.qa-onb-hero` or `.qa-onb-dots` do not exist in the current CSS (confirm via grep), include only the selectors that do — preserve the three intents (1) shrink min-height on `.qa-onb-page`, (2) top-align, (3) reduce hero/dots spacing if those targets exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/responsive-tokens.test.js`
Expected: all pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm run test:run`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "feat(chrome): onboarding landscape-height guard (max-height: 500px)"
```

---

## Task 7: Update `docs/context/architecture.md`

Per Rule 2, extend the existing Responsive breakpoints bullet (added in sub-project 1 under *Cross-cutting patterns*) with a sentence about chrome adaptation.

**Files:**
- Modify: `docs/context/architecture.md`

- [ ] **Step 1: Locate the existing Responsive breakpoints bullet**

Run: `grep -n "Responsive breakpoints" docs/context/architecture.md`
Expected: one hit — the bullet added in sub-project 1 (around line 84).

- [ ] **Step 2: Append chrome sentence to the bullet**

At the end of the existing `- **Responsive breakpoints** — …` bullet (before the bullet that follows it), append this continuation:

```markdown
 Chrome surfaces (ambient dock, bottom sheets, command sheet, onboarding) all adapt at the same two breakpoints: dock grows from 38×38 to 42×42 at tablet and becomes a labeled pill at desktop; bottom sheets become a centered modal at tablet (width ~480px) and the mark editor widens to 640px with a 2-column body grid at desktop; command sheet caps at 640px on desktop; onboarding adds a `max-height: 500px` landscape guard that drops the 72vh min-height when the viewport is short.
```

- [ ] **Step 3: Commit**

```bash
git add docs/context/architecture.md
git commit -m "docs(context): extend responsive breakpoints bullet with chrome adaptation"
```

---

## Task 8: Update `docs/context/user-journeys.md`

Per Rule 1, every UI change updates relevant journeys. Add desktop/tablet variant notes to the affected journeys.

**Files:**
- Modify: `docs/context/user-journeys.md`

- [ ] **Step 1: Locate and update each affected journey**

Read `docs/context/user-journeys.md`. Find these journeys and append the corresponding text at the end of each (before the next journey begins):

**For journey B1 (tap-to-surface dock):**

```markdown
**Tablet+ variant:** Dock items grow from 38×38 to 42×42 for easier iPad tap targets (≥768px). Auto-hide behavior unchanged.

**Desktop variant (≥1180px):** Dock items expand to labeled pills — the visually-hidden text label ("Read", "Search", "Review", "More") unhides inline next to each glyph. Positioning stays bottom-centered.
```

**For journey C1 (long-press mark editor):**

```markdown
**Desktop variant (≥1180px):** Mark editor sheet grows to ~640px wide, and its body splits into a 2-column grid: verse preview + note textarea on the left, selected tags + all-tags search on the right. Footer buttons (Delete / Cancel / Save) span the full width below. All interactions (long-press, tag select, note edit, save) work identically.
```

**For journey D1 (open Settings):**

```markdown
**Tablet+ variant (≥768px):** Settings sheet opens as a centered modal (~480px wide, top 10vh) instead of sliding up from the bottom. Previously this happened at 720px; now aligns with the canonical tablet breakpoint.
```

**For journey F1 (⌘K command sheet):**

```markdown
**Tablet+ variant:** Keyboard-shortcut footer hint (`⌘K`, `esc`) is explicitly shown at ≥768px (hidden below 640px mobile).

**Desktop variant (≥1180px):** Command sheet caps at 640px wide; result rows stay comfortably readable instead of stretching edge-to-edge.
```

**For journey A1 (first-run onboarding) — short-height guard:**

```markdown
**Landscape phone / short viewport:** When viewport height is under 500px (phones in landscape, small-height browser windows), the onboarding page drops its `72vh` min-height and top-aligns content with reduced hero padding, so no content clips off-screen.
```

- [ ] **Step 2: Commit**

```bash
git add docs/context/user-journeys.md
git commit -m "docs(journeys): add tablet/desktop chrome variants to B1, C1, D1, F1, A1"
```

---

## Task 9: Lint + test + build + chunk-budget sweep

CI-equivalent pass before the Playwright phase. This is the baseline that Playwright tests against.

- [ ] **Step 1: Lint**

Run: `pnpm run lint`
Expected: zero errors. (Warnings in `logger.js` from sub-project 1 remain acceptable.)

- [ ] **Step 2: Full test run**

Run: `pnpm run test:run`
Expected: all tests pass (baseline 378 + the ~9 new responsive-tokens tests added across Tasks 1–6 ≈ 387).

- [ ] **Step 3: Build**

Run: `pnpm run build`
Expected: build succeeds.

- [ ] **Step 4: Chunk budget**

Run: `pnpm run check-chunks`
Expected: within budget. This sub-project is CSS-only so JS chunks are unchanged; CSS has grown slightly.

- [ ] **Step 5: Gate check**

If any of Steps 1–4 fail, stop and investigate before proceeding to the Playwright phase. A regression here signals something in Tasks 1–8 is broken and the fix belongs in the relevant earlier task's commit chain (or a new fix commit).

---

## Task 10: Playwright MCP verification — setup

Brings up the dev server, opens the real browser, archives a screenshot directory. All Playwright MCP calls use deferred tools — load them via `ToolSearch` with `select:mcp__plugin_playwright_playwright__<tool_name>` before first use.

**Files:**
- Create: `docs/superpowers/verification/2026-04-18-chrome-responsive/` (directory for screenshots)

- [ ] **Step 1: Start the dev server (background)**

In the worktree, run (background): `pnpm run dev`
The Vite default port is `5173`. Wait for "Local: http://localhost:5173/" to print.

- [ ] **Step 2: Create the screenshot archive directory**

```bash
mkdir -p docs/superpowers/verification/2026-04-18-chrome-responsive
```

- [ ] **Step 3: Load Playwright MCP tools**

Use `ToolSearch` with:
```
select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_resize,mcp__plugin_playwright_playwright__browser_click,mcp__plugin_playwright_playwright__browser_type,mcp__plugin_playwright_playwright__browser_press_key,mcp__plugin_playwright_playwright__browser_snapshot,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_wait_for,mcp__plugin_playwright_playwright__browser_console_messages,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_hover
```

- [ ] **Step 4: Navigate to the app and take baseline screenshots at four viewports**

For each viewport in `[{name:'mobile',w:375,h:667}, {name:'tablet',w:820,h:1180}, {name:'desktop',w:1440,h:900}, {name:'landscape',w:667,h:375}]`:

1. `mcp__plugin_playwright_playwright__browser_resize({width: w, height: h})`
2. `mcp__plugin_playwright_playwright__browser_navigate({url: 'http://localhost:5173/'})`
3. `mcp__plugin_playwright_playwright__browser_wait_for({text: 'QuranAtlas'})` (or fallback: wait for a verse-text selector once we know it renders)
4. `mcp__plugin_playwright_playwright__browser_take_screenshot({filename: '00-baseline-${name}.png'})`
5. `mcp__plugin_playwright_playwright__browser_console_messages()` — record any existing console warnings/errors so they aren't attributed to regressions.

Save screenshots to `docs/superpowers/verification/2026-04-18-chrome-responsive/`. Later Playwright browser_take_screenshot calls should pass an explicit path or move the output from Playwright's default location into this dir.

- [ ] **Step 5: Record baseline observations**

Write a single file `docs/superpowers/verification/2026-04-18-chrome-responsive/NOTES.md` with the following template:

```markdown
# Chrome Responsive — Playwright MCP Verification

**Worktree:** `.worktrees/chrome-responsive`
**Branch:** `feature/chrome-responsive`
**Baseline commit:** <sha of last Task 9 commit>

## Viewport baselines

- Mobile 375×667 — baseline OK / console: <summary>
- Tablet 820×1180 — baseline OK / console: <summary>
- Desktop 1440×900 — baseline OK / console: <summary>
- Landscape 667×375 — baseline OK / console: <summary>

## Journey results

(filled in by Tasks 11–16)

## Regressions found

(filled in by Task 17)
```

- [ ] **Step 6: Commit the NOTES scaffolding + baselines (no source changes yet)**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp verification baseline screenshots"
```

---

## Task 11: Journey A1 — Onboarding + landscape guard

The landscape guard from Task 6 must be exercised at 667×375.

- [ ] **Step 1: Clear IDB to force onboarding**

At any current viewport, evaluate:
```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "async () => { indexedDB.deleteDatabase('quran-atlas'); }"
})
```
Then navigate to `http://localhost:5173/` and confirm onboarding route (`#/onboarding` or equivalent — check `src/onboarding/index.js` for the route).

- [ ] **Step 2: Walk onboarding at mobile 375×667**

1. Resize 375×667.
2. Navigate to the app root; reload until onboarding screen 1 renders.
3. Screenshot: `a1-onboarding-mobile-screen1.png`.
4. Click the forward/Next button; screenshot screens 2, 3, 4. Filenames: `a1-onboarding-mobile-screen2.png`, etc.
5. Complete onboarding; confirm reader loads. Screenshot: `a1-onboarding-mobile-complete.png`.
6. Read console — flag any errors.

- [ ] **Step 3: Reset IDB and walk onboarding at landscape 667×375**

1. `browser_evaluate` to delete IDB again.
2. Resize 667×375.
3. Navigate to root.
4. Screenshot each of the 4 screens: `a1-onboarding-landscape-screen[1-4].png`.
5. **Critical check:** all hero, CTA, and dot-indicator are visible without requiring scroll beyond normal reading. No content clipped at viewport top/bottom.
6. Inspect via `browser_evaluate` that `.qa-onb-page` has `min-height: 100%` (not `72vh`) at this viewport:
```javascript
() => window.getComputedStyle(document.querySelector('.qa-onb-page')).minHeight
```
Expected result: a percentage that resolves to ≤ viewport height (not larger). If the rule didn't apply, note it as a regression.

- [ ] **Step 4: Record findings in NOTES.md**

Under `## Journey results`, add:
```markdown
### A1 Onboarding
- Mobile 375×667: PASS / FAIL — <notes>
- Landscape 667×375: PASS / FAIL — <notes>
```

- [ ] **Step 5: Commit screenshots**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp — journey A1 (onboarding) verified"
```

---

## Task 12: Journeys B1, B2, B4, B6 — Ambient chrome on reader

- [ ] **Step 1: Seed past onboarding**

Use `browser_evaluate` to write `onboardingComplete: true` into IDB (see the editor spec section if needed; alternatively navigate through onboarding once and let IDB persist).

- [ ] **Step 2: B1 — Tap-to-surface dock & pill, at each viewport**

For each of `[mobile, tablet, desktop]`:
1. Resize to viewport.
2. Navigate to `/#/s/1` (Al-Fatihah reader).
3. Wait for `.qa-verse` to render.
4. Screenshot: `b1-<viewport>-dock-at-rest.png` (dock may be auto-hidden after timeout — wait for it to fade or force-surface by clicking the reader body).
5. Click into the reader body to surface dock + pill.
6. Screenshot: `b1-<viewport>-dock-surfaced.png`.
7. **Desktop only:** verify `.qa-dock-label` is visible (not `clip: rect(0,0,0,0)`) via:
```javascript
() => {
  const el = document.querySelector('.qa-dock-label')
  if (!el) return 'no-label'
  const s = window.getComputedStyle(el)
  return { position: s.position, clip: s.clip, width: s.width }
}
```
Expected: `position: 'static'`, width auto.
8. **Tablet only:** verify `.qa-dock-item` has `width: 42px`:
```javascript
() => window.getComputedStyle(document.querySelector('.qa-dock-item')).width
```
Expected: `'42px'` (i.e. `2.625rem` resolved).

- [ ] **Step 3: B2 — Scroll hide/show, at desktop only**

1. Resize desktop 1440×900.
2. Navigate to `/#/s/2` (longer surah than Al-Fatihah — Al-Baqarah has many verses, good for scroll).
3. Scroll down 400px via `browser_evaluate`:
```javascript
() => window.scrollBy(0, 400)
```
4. Wait briefly, screenshot: `b2-desktop-after-scroll-down.png`. Dock should be hidden (`.qa-dock--hidden` class on `#bottom-nav`).
5. Scroll up 400px. Dock should reappear.
6. Screenshot: `b2-desktop-after-scroll-up.png`.

- [ ] **Step 4: B4 — Non-reader persistent dock**

At desktop 1440×900:
1. Navigate to `/#/review` (or whichever non-reader route — confirm via `user-journeys.md`).
2. Wait for surface to render.
3. Screenshot: `b4-desktop-non-reader.png`. Dock must be visible (no fade) and show labels.

- [ ] **Step 5: B6 — Font slider live preview**

At desktop 1440×900:
1. Navigate to a reader route; open Settings sheet via More → Settings.
2. Screenshot: `b6-desktop-settings-open.png`.
3. Drag / set font slider to its max value via `browser_evaluate` (range input:
```javascript
() => { const el = document.querySelector('input[type="range"][name*="font"]') || document.querySelector('.qa-font-slider'); el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); }
```
or click drag handle if easier).
4. Close sheet. Observe reader text grows. Screenshot: `b6-desktop-font-max.png`.
5. Reset slider to 1.0.
6. **Sanity:** verify `.qa-verse-arabic` computed font-size responds to both viewport (clamp from sub-project 1) AND slider (multiplier from chrome tokens).

- [ ] **Step 6: Record + commit**

Update NOTES.md `### B1/B2/B4/B6 Reader Chrome` with per-viewport results. Commit screenshots:

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp — journeys B1/B2/B4/B6 verified"
```

---

## Task 13: Journeys C1, C4, C5 — Mark editor (desktop 2-col focus)

- [ ] **Step 1: C1 — Long-press opens mark editor, at each viewport**

For each of `[mobile, tablet, desktop]`:
1. Resize viewport.
2. Navigate to `/#/s/1`.
3. Wait for first `.qa-verse`.
4. Simulate long-press on the first verse via `browser_evaluate` (the long-press is touch-based; fall back to dispatching a synthetic `TouchEvent` start + timer):
```javascript
async () => {
  const v = document.querySelector('.qa-verse')
  const rect = v.getBoundingClientRect()
  const t = new Touch({ identifier: 0, target: v, clientX: rect.left + 10, clientY: rect.top + 10 })
  v.dispatchEvent(new TouchEvent('touchstart', { touches: [t], bubbles: true }))
  await new Promise(r => setTimeout(r, 650)) // > 500ms long-press threshold
  v.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true }))
}
```
If the existing e2e helper pattern uses something different (see `.worktrees/…/tests/e2e/` helpers from sub-project 1 history — commit `4d3c9f0` fixed a TouchEvent dispatch bug there — model after that).
5. Wait for `.qa-sheet--mark` to be visible.
6. Screenshot: `c1-<viewport>-mark-editor-open.png`.
7. **Desktop only:** evaluate
```javascript
() => {
  const body = document.querySelector('.qa-sheet--mark .qa-mark-body')
  const sheet = document.querySelector('.qa-sheet.qa-sheet--mark')
  return {
    sheetWidth: window.getComputedStyle(sheet).width,
    bodyDisplay: window.getComputedStyle(body).display,
    bodyCols: window.getComputedStyle(body).gridTemplateColumns,
  }
}
```
Expected at desktop: `sheetWidth: '640px'`, `bodyDisplay: 'grid'`, `bodyCols` contains two column tracks (e.g. `'... 1fr ... 1fr'`).
8. Close the sheet (Esc or Cancel).

- [ ] **Step 2: C4 — Save a mark, at desktop**

Desktop 1440×900, sheet open from above:
1. Type a note into `.qa-mark-note`: `browser_type` or `browser_evaluate` setting the textarea value + dispatching `input`.
2. Click a tag chip in `.qa-mark-chips--all` (the right column).
3. Verify the chip appears in `.qa-mark-chips--selected` (left/right? — confirm from Section 4 of spec; selected goes right column).
4. Click the Save button.
5. Wait for sheet to dismiss.
6. Screenshot: `c4-desktop-mark-saved.png`. Confirm the verse now shows the gold edge indicator.

- [ ] **Step 3: C5 — Delete + undo, at desktop**

1. Open the same verse's mark via long-press.
2. Click Delete (red button, left side of footer).
3. Wait for undo toast to appear.
4. Screenshot: `c5-desktop-undo-toast.png`.
5. Click undo.
6. Confirm mark restored (gold edge back).

- [ ] **Step 4: Record + commit**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp — journeys C1/C4/C5 (mark editor) verified"
```

---

## Task 14: Journeys D1–D3 — Settings sheet

- [ ] **Step 1: D1 — Open Settings, at each viewport**

For each of `[mobile, tablet, desktop]`:
1. Resize.
2. Navigate to `/#/s/1`.
3. Surface dock, click More (`[data-tab="more"]`), click Settings button in More sheet.
4. Wait for `.qa-sheet--settings` (or equivalent — Settings may not carry a specific modifier class; look at `src/settings/panel.js` for the class).
5. Screenshot: `d1-<viewport>-settings-open.png`.
6. **Tablet + desktop:** verify sheet positioning:
```javascript
() => {
  const sheet = document.querySelector('.qa-sheet:not(.qa-sheet--mark):not(.qa-sheet--more)') || document.querySelector('.qa-sheet-settings')
  const s = window.getComputedStyle(sheet)
  return { top: s.top, left: s.left, transform: s.transform, width: s.width }
}
```
Expected at tablet+: `top ≈ 10vh`, `transform` includes `translateX(-50%)`, `width: 480px` (or close).
At mobile: `top: auto`, bottom-anchored.

- [ ] **Step 2: D2 — Translation picker sub-view**

At desktop 1440×900, sheet open:
1. Click the translation picker row.
2. Wait for the sub-view (picker list) to render.
3. Screenshot: `d2-desktop-translation-picker.png`.
4. Click back.
5. Verify returns to Settings root.

- [ ] **Step 3: D3 — Theme swap**

At desktop 1440×900:
1. Cycle through each theme swatch (Light, Sepia, Dark, Auto).
2. For each, screenshot: `d3-desktop-theme-<name>.png`.
3. Verify `html[data-theme]` attribute changes via `browser_evaluate`.

- [ ] **Step 4: Record + commit**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp — journeys D1/D2/D3 (settings) verified"
```

---

## Task 15: Journeys F1, F3 — Command sheet

- [ ] **Step 1: F1 — ⌘K opens command sheet, at each viewport**

For each of `[mobile, tablet, desktop]`:
1. Resize.
2. Navigate to `/#/s/1`.
3. Press `Meta+k` (Playwright aliases Meta→Ctrl on non-macOS):
```
mcp__plugin_playwright_playwright__browser_press_key({key: 'Meta+k'})
```
4. Wait for `.qa-cmd-sheet` to be visible.
5. Screenshot: `f1-<viewport>-cmd-open.png`.
6. **Desktop:** verify width cap:
```javascript
() => window.getComputedStyle(document.querySelector('.qa-cmd-sheet')).maxWidth
```
Expected: `'640px'`.
7. **Tablet + desktop:** verify footer hint visible:
```javascript
() => window.getComputedStyle(document.querySelector('.qa-cmd-foot')).display
```
Expected: `'flex'` at tablet+, `'none'` at mobile <640px.

- [ ] **Step 2: F3 — Tag search → FVR**

At desktop 1440×900, sheet open:
1. Type a tag name (e.g. "favorite") into the command input.
2. Wait for filtered results.
3. Screenshot: `f3-desktop-cmd-tag-results.png`.
4. Click a tag result. Wait for FVR (filter-verses-by-reference?) view to render.
5. Screenshot: `f3-desktop-fvr.png`.

- [ ] **Step 3: Record + commit**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp — journeys F1/F3 (command sheet) verified"
```

---

## Task 16: Journey E3 — Review hub regression smoke

Not directly modified by this sub-project, but the sheet-breakpoint rename (Task 3) touches code the review-hub nav path surfaces. Smoke-test to catch accidental breakage.

- [ ] **Step 1: At desktop 1440×900**

1. Navigate to `/#/review` (adjust if route is different).
2. Wait for review hub to render.
3. Screenshot: `e3-desktop-review-hub.png`.
4. Click any tag chip.
5. Wait for FVR to render.
6. Screenshot: `e3-desktop-fvr-from-hub.png`.
7. Navigate back (browser_navigate_back or similar).
8. Verify return to review hub.

- [ ] **Step 2: Record + commit**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/
git commit -m "test(chrome): playwright mcp — journey E3 (review hub regression smoke) verified"
```

---

## Task 17: Catalog regressions and fix

After Tasks 11–16, review `NOTES.md` for any FAIL entries and all console-error collections.

- [ ] **Step 1: Enumerate regressions**

In `NOTES.md`, fill in the `## Regressions found` section. One entry per failure:

```markdown
### R<N>: <short title>
- **Journey/viewport:** e.g. C1 / mobile
- **Observed:** what broke
- **Expected:** what should have happened
- **Suspected cause:** file:line guess
- **Fix commit:** <sha> (filled in after fix)
```

- [ ] **Step 2: Fix each regression**

For each catalog entry:
1. Identify the failing rule/selector/behavior.
2. Patch `src/core/theme.css` (or `src/marks/editor.js` if genuinely DOM-related).
3. Re-run `npx vitest run tests/unit/core/responsive-tokens.test.js` to confirm unit tests still pass.
4. Re-run the specific Playwright journey that was failing.
5. Commit the fix with message `fix(chrome): <short desc>` and record the SHA in NOTES.md.

**Important:** If a regression stems from a Task 1–6 rule that was too narrow or too broad, amend the rule where it was originally written — don't add a second patching rule. The goal is a clean end-state, not stacked overrides.

- [ ] **Step 3: If no regressions**

Write `## Regressions found\n\nNone — all journeys passed on first run.\n` in NOTES.md.

- [ ] **Step 4: Final re-run of automated suite**

Run: `pnpm run test:run && pnpm run lint && pnpm run build && pnpm run check-chunks`
Expected: all green.

- [ ] **Step 5: Commit final NOTES update**

```bash
git add docs/superpowers/verification/2026-04-18-chrome-responsive/NOTES.md
git commit -m "test(chrome): playwright mcp verification complete — <N regressions fixed|no regressions>"
```

- [ ] **Step 6: Stop the dev server**

Kill the background `pnpm run dev` process started in Task 10.

---

## Notes for the implementer

- **Branch origin.** This plan assumes the worktree was created from `main` at commit `a9572dc` (the spec commit). If sub-project 1 merged in a different order, rebase or re-branch from main before starting.

- **Commit discipline.** Project CLAUDE.md says "Do not commit unless the user asks." Each task's commit step is a natural pause point — either batch-approve all commits at start (via explicit user instruction), or pause and confirm before each.

- **Playwright MCP vs. Playwright test runner.** This plan uses the MCP browser control (`mcp__plugin_playwright_playwright__*`), not the existing `tests/e2e/*.spec.js` suite. The existing specs are out of scope here (covered by a separate e2e audit plan). MCP lets us interactively walk the journeys and capture screenshots without writing new .spec files.

- **Selector robustness.** If a Playwright step can't find an expected selector (e.g. `.qa-sheet--settings` doesn't exist), don't silently give up — inspect `src/settings/panel.js` for the actual class name and update the step. The Playwright phase IS the verification — flaky selectors get fixed here, not papered over.

- **Screenshot volume.** Budget ~40 screenshots total across Tasks 10–16 (4 baseline + ~36 journey). Keep filenames semantic (`<journey>-<viewport>-<state>.png`) so the PR reviewer can scan the archive without reading NOTES.md.

- **The `qa-sheet--mark` class already exists.** Verified during spec writing at `src/marks/editor.js:78`. No JS PR in this sub-project. If the implementer feels tempted to restructure editor.js "while they're in there" — don't; that's a separate refactor.

- **Subgrid parallel.** The mark editor desktop 2-col grid is a *regular* grid, not subgrid (unlike the reader). The children don't need vertical row alignment across the two columns, so the simpler `display: grid` suffices.

- **What not to test in the Playwright phase.** Don't try to exercise service worker offline, cross-tab sync (BroadcastChannel), or PWA install — those journeys are not affected by this sub-project and the environment may not support them cleanly.

---

## Summary of file touches

| File | Lines changed | Nature |
|---|---|---|
| `src/core/theme.css` | +~100 additions (no removals except the `720` → `768` rename) | All responsive rules |
| `tests/unit/core/responsive-tokens.test.js` | +~9 new `it()` tests | Regression coverage |
| `docs/context/architecture.md` | ~1 sentence appended | Rule 2 |
| `docs/context/user-journeys.md` | 5 journey variants appended | Rule 1 |
| `docs/superpowers/verification/2026-04-18-chrome-responsive/*` | 1 NOTES.md + ~40 screenshots | Playwright phase artifacts |

**Zero** changes expected in: `src/marks/editor.js`, `src/nav/ambient-dock.js`, `src/nav/ambient-pill.js`, `src/nav/more-sheet.js`, `src/nav/command-sheet.js`, `src/settings/panel.js`, `src/onboarding/**`, any IDB or event code.
