# Desktop Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the desktop treatment of Surah list, Mark editor modal, Review hub, and About — plus a cross-cutting theming pass (unify accents, introduce selection tokens, swap dark from sky to honey amber, scope the reader grid, true-center all sheets).

**Architecture:** Seven clustered work units. Structural fixes land first (they unblock everything). Tokens next (introduce + alias, no layout effect). Selector refactor consumes the tokens. Each desktop surface builds on the clean baseline. Verification is empirical via Playwright MCP at 1440×900 after each cluster — not "the code looks right."

**Tech Stack:** Vanilla JS + vite + CSS custom properties. `src/core/theme.css` is the single CSS file (~2800 lines, holds tokens + every surface's styles). Playwright MCP is the primary verification tool; Vitest for unit tests; existing e2e specs serve as regression guards.

**Execution constraints (per user feedback):**
- **Cluster related issues together.** Each task below bundles all edits that share files / tokens / risk. No per-selector subagent spawning.
- **Default to main-session execution.** Spawn subagents only if a cluster's context would overflow.
- **Verify each cluster empirically with Playwright** before committing. Measure computed styles and bounding rects; don't trust visual-only eyeball.

**Spec:** `docs/superpowers/specs/2026-04-18-desktop-redesign-design.md`

---

## Shared verification snippets

Reused inside multiple tasks. Keep this section handy.

**Start dev server and capture port:**

```bash
pnpm run dev
# Vite usually picks 5173 or 5174. Read the port from output.
```

**Playwright MCP sequence for a surface (template):**

1. `mcp__plugin_playwright_playwright__browser_resize` → 1440 × 900
2. `mcp__plugin_playwright_playwright__browser_navigate` → `http://localhost:<port>/#/<route>`
3. `mcp__plugin_playwright_playwright__browser_evaluate` → read computed styles / bounding rects
4. `mcp__plugin_playwright_playwright__browser_take_screenshot` → save with descriptive filename under the project root, then move to `docs/superpowers/plans/screenshots/` if you want to keep it in git. Otherwise just delete before commit.

**Safe DOM teardown idiom used in this codebase:**

```javascript
while (el.firstChild) { el.removeChild(el.firstChild) }
```

Use this when teardown is needed inside `rerender()` etc. Do NOT use assignment-to-HTML properties.

**After each cluster — mandatory cleanup before commit:**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short   # confirm only intended changes
```

---

## Task 1 · Structural scoping fixes

**Cluster rationale:** Three CSS-only edits in `src/core/theme.css` that must land first. Without #1.1 every Phase-2 layout rule collides with the reader grid. Without #1.2 every modal visibly sits ~17px above optical center. Without #1.3 the reader's surah title is stuck in the left column. One file, one commit, zero user-visible reader/mobile change.

**Files:**
- Modify: `src/core/theme.css`

### 1.1 — Scope the reader grid to reader content

- [ ] **Step 1: Read `theme.css` lines 1310–1375 to locate the rule**

Run:
```bash
grep -n "^@media (min-width: 1180px)" src/core/theme.css | head -5
grep -n "^#main-content" src/core/theme.css | head -10
```

Expected: a match around line 1310–1318 for the `#main-content { display: grid … }` rule inside `@media (min-width: 1180px)`.

- [ ] **Step 2: Apply the scoping change**

Edit `src/core/theme.css`. Change:

```css
@media (min-width: 1180px) {
  #main-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 2rem;
    align-items: start;
  }
```

to:

```css
@media (min-width: 1180px) {
  #main-content:has(.qa-verse) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 2rem;
    align-items: start;
  }
```

The companion `:has(.qa-verse-translation.qa-hide-translation)` rule farther down stays unchanged (already reader-specific).

### 1.2 — True-center all `.qa-sheet` at desktop + cap height

- [ ] **Step 3: Locate the tablet+ `.qa-sheet` override**

Run:
```bash
grep -n "qa-sheet-rise\|^\.qa-sheet \{" src/core/theme.css | head -10
```

Expected: an `@media (min-width: 768px)` block around line 1881 overriding `.qa-sheet` positioning + redefining `qa-sheet-rise`.

- [ ] **Step 4: Apply the centering and height fixes**

Replace the 768px `.qa-sheet` override block with:

```css
@media (min-width: 768px) {
  .qa-sheet {
    left: 50%;
    right: auto;
    bottom: auto;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(480px, calc(100vw - 32px));
    max-height: min(720px, 86vh);
  }
  @keyframes qa-sheet-rise {
    from { transform: translate(-50%, calc(-50% + 20px)); opacity: 0; }
    to   { transform: translate(-50%, -50%); opacity: 1; }
  }
}
```

### 1.3 — Fix the stale `.qa-surah-header-card` selector

- [ ] **Step 5: Add the `-card` variant to the grid-column-span list**

Around line 1327 in `theme.css`, change:

```css
.qa-surah-header,
.qa-basmala,
.qa-surah-end,
.qa-invalid-verse-error {
  grid-column: 1 / -1;
}
```

to:

```css
.qa-surah-header,
.qa-surah-header-card,
.qa-basmala,
.qa-surah-end,
.qa-invalid-verse-error {
  grid-column: 1 / -1;
}
```

### 1.4 — Build gate

- [ ] **Step 6: Run build**

```bash
pnpm run build
```

Expected: `✓ built in …` with no errors.

- [ ] **Step 7: Run unit tests**

```bash
pnpm run test:run
```

Expected: all tests pass. None should need updating for this task.

### 1.5 — Playwright verification

- [ ] **Step 8: Start dev server**

```bash
pnpm run dev
```

Read the port from output (usually 5174 since 5173 may be busy).

- [ ] **Step 9: Verify grid scoping on non-reader surfaces**

Use Playwright MCP. Resize to 1440×900, navigate to each surface, and read the computed grid-template-columns + bounding rect:

For each of `/#/surahs`, `/#/review`, `/#/about`:

```js
() => {
  const main = document.getElementById('main-content');
  const firstChild = main.firstElementChild;
  return {
    mainDisplay: getComputedStyle(main).display,
    mainGrid: getComputedStyle(main).gridTemplateColumns,
    firstChildRect: firstChild.getBoundingClientRect(),
    firstChildClass: firstChild.className,
  };
}
```

**Expected for all three:** `mainDisplay: "block"`, `mainGrid: "none"`. First child fills the available width (up to the container's `max-width`), not 349px.

- [ ] **Step 10: Verify reader still gets the 2-col grid**

Navigate to `/#/s/2` (Al-Baqarah has longer verses). Run the same evaluate. Expected: `mainDisplay: "grid"`, `mainGrid: "526px 526px"` (or similar equal-width two-column).

Also verify the surah header spans both columns now — take a screenshot and confirm the title card is centered, not stuck in the left column:

```js
() => {
  const card = document.querySelector('.qa-surah-header-card');
  const cs = getComputedStyle(card);
  const r = card.getBoundingClientRect();
  return { gridColumn: cs.gridColumn, width: r.width, left: r.left };
}
```

Expected: `gridColumn: "1 / -1"` (or equivalent), width close to the `#main-content` inner width.

- [ ] **Step 11: Verify sheet centering**

Open the mark editor at 1440×900:

```js
async () => {
  const mod = await import('/src/marks/editor.js');
  const verse = document.querySelector('[data-verse-key]');
  mod.openEditor(verse.getAttribute('data-verse-key'));
  await new Promise(r => setTimeout(r, 250));
  const s = document.querySelector('.qa-sheet--mark');
  const r = s.getBoundingClientRect();
  return {
    viewport: { w: innerWidth, h: innerHeight },
    topGap: r.top,
    bottomGap: innerHeight - r.bottom,
    leftGap: r.left,
    rightGap: innerWidth - r.right,
    height: r.height,
  };
}
```

**Expected:** `topGap` and `bottomGap` within ~5px of each other (true center); `leftGap` and `rightGap` equal. `height` ≤ 720.

- [ ] **Step 12: Run the existing e2e suite as a regression guard**

```bash
PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test --project=chromium-desktop 2>&1 | tail -30
```

Expected: all specs pass (or the same baseline as before this task). No new failures.

- [ ] **Step 13: Stop dev server, clean artifacts**

```bash
# kill the backgrounded dev server, then
rm -rf .playwright-mcp test-output *.png
git status --short
```

Expected: only `src/core/theme.css` modified.

- [ ] **Step 14: Commit**

```bash
git add src/core/theme.css
git commit -m "$(cat <<'EOF'
fix(theme): scope reader grid, true-center sheets, fix surah-title span

- #main-content grid now only applies when .qa-verse is present — fixes
  non-reader desktop surfaces (surah list, about, review) that were
  falling into implicit reader grid columns
- .qa-sheet at >=768px: top: 50% + translate(-50%, -50%) + max-height
  cap — fixes ~17px top bias measured on mark/settings/more at 1440x900
- .qa-surah-header-card added to grid-column: 1/-1 list — fixes reader
  title that was falling into the left column because the selector
  targeted the unused .qa-surah-header class

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 · Token system

**Cluster rationale:** One CSS file + one new test file. All token definitions land together so the contrast test and every downstream selector refactor operate on the final values. Dark-mode accent swap is user-visible; everything else is invisible until Task 3 consumes the new tokens.

**Files:**
- Modify: `src/core/theme.css` (three theme blocks)
- Create: `src/core/theme.contrast.test.js`

### 2.1 — Add new tokens and alias `--qa-accent`

- [ ] **Step 1: Add tokens to the light `:root` block**

In `theme.css`, locate the `:root` block (starts around line 29). Inside the "LIGHT THEME" section, change:

```css
--qa-accent: #8b6b3a;           /* Bronze — shared with Sepia, WCAG AA on white */
--qa-accent-hover: #6b4a16;
```

to:

```css
--qa-accent: #78592e;           /* Alias of --qa-ambient-accent; unified bronze */
--qa-accent-hover: #5e3a18;     /* Darker bronze hover */
```

At the end of the `:root` block (before the closing `}`), add:

```css
/* --- Selection + on-accent tokens (new) --- */
--qa-on-accent: #faf1d8;                                                  /* Text color on solid --qa-ambient-accent fills */
--qa-selection-bg: var(--qa-ambient-accent-soft);                         /* Soft-tint selection background */
--qa-selection-text: var(--qa-ambient-accent);                            /* Accent text on soft tint */
--qa-selection-ring: color-mix(in srgb, var(--qa-ambient-accent) 35%, transparent);
```

- [ ] **Step 2: Apply the same pattern to the sepia block**

In `html[data-theme="sepia"]` (around line 143), change:

```css
--qa-accent: #7c4f23;
--qa-accent-hover: #5e3a18;
```

to:

```css
--qa-accent: #78592e;           /* Aliased to --qa-ambient-accent */
--qa-accent-hover: #5e3a18;
```

Before the closing `}` of the sepia block, add:

```css
--qa-on-accent: #3d2e14;
--qa-selection-bg: var(--qa-ambient-accent-soft);
--qa-selection-text: var(--qa-ambient-accent);
--qa-selection-ring: color-mix(in srgb, var(--qa-ambient-accent) 35%, transparent);
```

- [ ] **Step 3: Swap the dark theme accent and add tokens**

In `html[data-theme="dark"]` (around line 196), change:

```css
--qa-accent: #7dd3fc;
--qa-accent-hover: #bae6fd;
```

to:

```css
--qa-accent: #d4a253;           /* Honey amber — aliased to --qa-ambient-accent */
--qa-accent-hover: #e4b882;     /* Lighter amber for hover */
```

Further down in the same block, change:

```css
--qa-ambient-accent: #7dd3fc;
--qa-ambient-accent-soft: rgba(125, 211, 252, 0.18);
```

to:

```css
--qa-ambient-accent: #d4a253;
--qa-ambient-accent-soft: rgba(212, 162, 83, 0.18);
--qa-ambient-kbd-color: #e4b882;
```

And change:

```css
--qa-verse-hover-bg: rgba(125, 211, 252, 0.05);
```

to:

```css
--qa-verse-hover-bg: rgba(212, 162, 83, 0.05);
```

Before the closing `}` of the dark block, add:

```css
--qa-on-accent: #15110a;
--qa-selection-bg: var(--qa-ambient-accent-soft);
--qa-selection-text: var(--qa-ambient-accent);
--qa-selection-ring: color-mix(in srgb, var(--qa-ambient-accent) 35%, transparent);
```

### 2.2 — Contrast test

- [ ] **Step 4: Create `src/core/theme.contrast.test.js`**

```javascript
/**
 * Contrast guard for theme tokens.
 * Enforces WCAG AA minimums for the selection + on-accent color pairs
 * we rely on in every theme.
 */

import { describe, it, expect } from 'vitest'

// --- Relative luminance per WCAG 2.x ---
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function srgbToLinear(c) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map(srgbToLinear)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrast(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1))
  const l2 = relLuminance(hexToRgb(hex2))
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

// --- Alpha-blend a foreground-with-alpha onto an opaque background ---
// For --qa-selection-bg which is defined as a translucent tint.
function blend(fgRgbA, bgRgb) {
  const [fr, fg, fb, fa] = fgRgbA
  const [br, bg, bb] = bgRgb
  return [
    Math.round(fr * fa + br * (1 - fa)),
    Math.round(fg * fa + bg * (1 - fa)),
    Math.round(fb * fa + bb * (1 - fa)),
  ]
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

// --- Theme snapshots (mirror theme.css exactly) ---
const themes = {
  light: {
    bgPrimary: '#fbf8f0',
    ambientAccent: '#78592e',
    ambientAccentSoftFg: [120, 89, 46, 0.22], // rgba matches theme.css
    ambientSurface: '#faf1d8',
    onAccent: '#faf1d8',
  },
  sepia: {
    bgPrimary: '#f7ebd0',
    ambientAccent: '#78592e',
    ambientAccentSoftFg: [120, 89, 46, 0.22],
    ambientSurface: '#faf1d8',
    onAccent: '#3d2e14',
  },
  dark: {
    bgPrimary: '#0f1215',
    ambientAccent: '#d4a253',
    ambientAccentSoftFg: [212, 162, 83, 0.18],
    ambientSurface: '#1c2128',
    onAccent: '#15110a',
  },
}

describe('theme tokens pass WCAG AA', () => {
  for (const [name, t] of Object.entries(themes)) {
    describe(name, () => {
      it('--qa-on-accent on --qa-ambient-accent (primary button) >= 4.5:1', () => {
        expect(contrast(t.onAccent, t.ambientAccent)).toBeGreaterThanOrEqual(4.5)
      })

      it('--qa-selection-text on --qa-selection-bg (selection pill) >= 4.5:1', () => {
        // selection-bg is the soft tint painted on top of ambient-surface
        const effectiveBg = rgbToHex(
          blend(t.ambientAccentSoftFg, hexToRgb(t.ambientSurface))
        )
        expect(contrast(t.ambientAccent, effectiveBg)).toBeGreaterThanOrEqual(4.5)
      })

      it('--qa-ambient-accent on --qa-bg-primary (non-text UI) >= 3:1', () => {
        expect(contrast(t.ambientAccent, t.bgPrimary)).toBeGreaterThanOrEqual(3)
      })
    })
  }
})
```

- [ ] **Step 5: Run the contrast test**

```bash
pnpm run test:run src/core/theme.contrast.test.js
```

Expected: all 9 assertions pass (3 themes × 3 checks).

If any fail, stop and report the actual ratios. Don't adjust the 4.5:1 threshold — adjust the token values in Step 1–3.

- [ ] **Step 6: Run full test suite**

```bash
pnpm run test:run
```

Expected: all tests pass.

### 2.3 — Playwright verification (dark amber swap is visible)

- [ ] **Step 7: Dev server + verify dark theme color**

Start `pnpm run dev`, then use Playwright MCP at 1440×900. Navigate to `/#/s/1`, open settings, switch to dark theme:

```js
async () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  await new Promise(r => setTimeout(r, 100));
  const cs = getComputedStyle(document.documentElement);
  return {
    ambientAccent: cs.getPropertyValue('--qa-ambient-accent').trim(),
    accent: cs.getPropertyValue('--qa-accent').trim(),
    onAccent: cs.getPropertyValue('--qa-on-accent').trim(),
    selBg: cs.getPropertyValue('--qa-selection-bg').trim(),
  };
}
```

**Expected:** `ambientAccent: "#d4a253"`, `accent: "#d4a253"`, `onAccent: "#15110a"`, `selBg: "var(--qa-ambient-accent-soft)"` (or the resolved rgba value).

- [ ] **Step 8: Take a dark-theme reader screenshot**

Navigate to `/#/s/1` (still in dark mode). Screenshot. The ambient dock's active pill should now be amber, not sky blue. The bookmark edge indicators, verse numbers, and pill should all have shifted.

### 2.4 — Cleanup + commit

- [ ] **Step 9: Clean artifacts**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short
```

Expected: `src/core/theme.css` + `src/core/theme.contrast.test.js`.

- [ ] **Step 10: Commit**

```bash
git add src/core/theme.css src/core/theme.contrast.test.js
git commit -m "$(cat <<'EOF'
feat(theme): unify accent tokens, add selection + on-accent, swap dark to amber

- --qa-accent aliased to --qa-ambient-accent in all themes (value
  now #78592e light/sepia, #d4a253 dark); legacy consumers unaffected
- Introduced --qa-on-accent, --qa-selection-bg, --qa-selection-text,
  --qa-selection-ring per theme
- Dark mode accent: sky #7dd3fc -> honey amber #d4a253, with matching
  soft, kbd, and verse-hover updates to stay in the bronze family
- theme.contrast.test.js guards WCAG AA for the key token pairs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 · Selector refactor — consume new tokens everywhere

**Cluster rationale:** This task drains the entire "eight hardcoded overrides + six review hub leaks + modal migration + clear-data button swap" backlog in one CSS-heavy pass plus one small JS migration. All of these consume tokens introduced in Task 2; splitting them would mean touching the same file in multiple commits and re-checking contrast each time.

**Files:**
- Modify: `src/core/theme.css`
- Modify: `src/settings/clear-data.js`

### 3.1 — Soft-tint the selection states

These six selectors take the soft-tint treatment (`--qa-selection-bg` + `--qa-selection-text` + `--qa-selection-ring`). Delete the per-theme `color:` overrides below each.

- [ ] **Step 1: `.qa-dock-item--active` (~line 479)**

Change:

```css
.qa-dock-item--active {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
}

html[data-theme="dark"] .qa-dock-item--active {
  color: #0e0e0c;
}
html[data-theme="sepia"] .qa-dock-item--active {
  color: #3d2e14;
}
html[data-theme="light"] .qa-dock-item--active {
  color: #faf1d8;
}
```

to:

```css
.qa-dock-item--active {
  background-color: var(--qa-selection-bg);
  color: var(--qa-selection-text);
  box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
}
```

- [ ] **Step 2: `.qa-sl-seg-item--on` (~line 1715)**

Change:

```css
.qa-sl-seg-item--on {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
}
html[data-theme="dark"] .qa-sl-seg-item--on { color: #0e0e0c; }
html[data-theme="sepia"] .qa-sl-seg-item--on { color: #3d2e14; }
```

to:

```css
.qa-sl-seg-item--on {
  background-color: var(--qa-selection-bg);
  color: var(--qa-selection-text);
  box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
}
```

- [ ] **Step 3: `.qa-review-seg-item--on` (~line 2432)**

Change:

```css
.qa-review-seg-item--on {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
}
html[data-theme="dark"] .qa-review-seg-item--on { color: #0e0e0c; }
html[data-theme="sepia"] .qa-review-seg-item--on { color: #3d2e14; }
```

to:

```css
.qa-review-seg-item--on {
  background-color: var(--qa-selection-bg);
  color: var(--qa-selection-text);
  box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
}
```

- [ ] **Step 4: `.qa-mark-chip--on` (~line 2342)**

Change:

```css
.qa-mark-chip--on {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
  border-color: var(--qa-ambient-accent);
  font-weight: 600;
}
html[data-theme="dark"] .qa-mark-chip--on { color: #0e0e0c; }
html[data-theme="sepia"] .qa-mark-chip--on { color: #3d2e14; }
```

to:

```css
.qa-mark-chip--on {
  background-color: var(--qa-selection-bg);
  color: var(--qa-selection-text);
  border-color: transparent;
  box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  font-weight: 600;
}
```

- [ ] **Step 5: `.qa-onb-t--on` (~line 2698)**

Change:

```css
.qa-onb-t--on { border-color: var(--qa-ambient-accent); background-color: var(--qa-ambient-accent-soft); }
```

to:

```css
.qa-onb-t--on {
  border-color: transparent;
  background-color: var(--qa-selection-bg);
  box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
}
```

(The `.qa-onb-t--on .qa-onb-t-radio` and `::after` rules below stay unchanged — the filled radio dot is a primary indicator that uses `--qa-ambient-accent` by design.)

- [ ] **Step 6: `.qa-onb-sw--on` (~line 2662)**

Change:

```css
.qa-onb-sw--on { border-color: var(--qa-ambient-accent); box-shadow: 0 0 0 3px var(--qa-ambient-accent-soft); }
```

to:

```css
.qa-onb-sw--on {
  border-color: var(--qa-selection-text);
  box-shadow: 0 0 0 3px var(--qa-selection-bg);
}
```

### 3.2 — Keep-solid-but-use-`--qa-on-accent` (decorative icon + badge)

These two are semantically NOT "selection state" — they're a decorative action icon and a count badge. Keep the solid-fill look but drop the per-theme overrides via the new `--qa-on-accent` token.

- [ ] **Step 7: `.qa-sl-continue-icon` (~line 1749)**

Change:

```css
.qa-sl-continue-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
  font-size: 0.875rem;
}
html[data-theme="dark"] .qa-sl-continue-icon { color: #0e0e0c; }
html[data-theme="sepia"] .qa-sl-continue-icon { color: #3d2e14; }
```

to:

```css
.qa-sl-continue-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--qa-ambient-accent);
  color: var(--qa-on-accent);
  font-size: 0.875rem;
}
```

- [ ] **Step 8: `.qa-mark-selected-count` (~line 2240)**

Change:

```css
.qa-mark-selected-count {
  padding: 1px 6px;
  border-radius: 999px;
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
  font-size: 0.625rem;
  font-weight: 700;
}
html[data-theme="dark"] .qa-mark-selected-count { color: #0e0e0c; }
html[data-theme="sepia"] .qa-mark-selected-count { color: #3d2e14; }
```

to:

```css
.qa-mark-selected-count {
  padding: 1px 6px;
  border-radius: 999px;
  background-color: var(--qa-ambient-accent);
  color: var(--qa-on-accent);
  font-size: 0.625rem;
  font-weight: 700;
}
```

### 3.3 — Primary-action buttons use `--qa-on-accent`

- [ ] **Step 9: `.qa-mark-btn--primary` (~line 2384)**

Change:

```css
.qa-mark-btn--primary {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
  border-color: var(--qa-ambient-accent);
}
html[data-theme="dark"] .qa-mark-btn--primary { color: #0e0e0c; }
html[data-theme="sepia"] .qa-mark-btn--primary { color: #3d2e14; }
```

to:

```css
.qa-mark-btn--primary {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-on-accent);
  border-color: var(--qa-ambient-accent);
}
```

- [ ] **Step 10: `.qa-onb-cta--primary` (~line 2787)**

Change:

```css
.qa-onb-cta--primary {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-surface);
}
html[data-theme="dark"] .qa-onb-cta--primary { color: #0e0e0c; }
html[data-theme="sepia"] .qa-onb-cta--primary { color: #3d2e14; }
```

to:

```css
.qa-onb-cta--primary {
  background-color: var(--qa-ambient-accent);
  color: var(--qa-on-accent);
}
```

### 3.4 — Review hub leak realignment

- [ ] **Step 11: Update six Review hub selectors (~lines 880–955)**

Change:

```css
.qa-review-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: var(--qa-bg-secondary);
  border-radius: 12px;
}

.qa-review-select {
  padding: 0.5rem 0.75rem;
  background-color: var(--qa-bg-primary);
  border: 1px solid var(--qa-border);
  ...
}

.qa-review-select:focus-visible {
  outline: 2px solid var(--qa-accent);
  border-color: var(--qa-accent);
}

.qa-review-filter-chip {
  ...
  background-color: var(--qa-bg-secondary);
  border: 1px solid var(--qa-border);
  ...
}

.qa-review-clear-all-btn {
  ...
  color: var(--qa-accent);
  ...
}
```

to:

```css
.qa-review-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: var(--qa-ambient-surface);
  border: 1px solid var(--qa-ambient-border);
  border-radius: 12px;
}

.qa-review-select {
  padding: 0.5rem 0.75rem;
  background-color: var(--qa-bg-primary);
  border: 1px solid var(--qa-ambient-border);
  ...
}

.qa-review-select:focus-visible {
  outline: 2px solid var(--qa-ambient-accent);
  border-color: var(--qa-ambient-accent);
}

.qa-review-filter-chip {
  ...
  background-color: var(--qa-ambient-surface);
  border: 1px solid var(--qa-ambient-border);
  ...
}

.qa-review-clear-all-btn {
  ...
  color: var(--qa-ambient-accent);
  ...
}
```

And `.qa-review-load-more:hover`:

```css
.qa-review-load-more:hover {
  background-color: var(--qa-bg-surface);
  border-color: var(--qa-accent);
  color: var(--qa-accent);
}
```

to:

```css
.qa-review-load-more:hover {
  background-color: var(--qa-bg-surface);
  border-color: var(--qa-ambient-accent);
  color: var(--qa-ambient-accent);
}
```

And `.qa-review-card-chip`:

```css
.qa-review-card-chip {
  ...
  background-color: var(--qa-bg-secondary);
  color: var(--qa-ambient-parchment);
  ...
}
```

to:

```css
.qa-review-card-chip {
  ...
  background-color: var(--qa-selection-bg);
  color: var(--qa-selection-text);
  ...
}
```

### 3.5 — `.qa-modal` adopts ambient surface; retire `.qa-btn-*`

- [ ] **Step 12: Migrate `.qa-modal` (~line 1187)**

Change:

```css
.qa-modal {
  background: var(--qa-bg-primary);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.qa-modal h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--qa-text-primary);
}

.qa-modal p {
  font-size: var(--qa-text-size-ui);
  color: var(--qa-text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
}
```

to:

```css
.qa-modal {
  background: var(--qa-ambient-surface);
  border: 1px solid var(--qa-ambient-border);
  border-radius: var(--qa-ambient-sheet-radius);
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: var(--qa-ambient-elevation);
}

.qa-modal h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--qa-ambient-parchment);
}

.qa-modal p {
  font-size: var(--qa-text-size-ui);
  color: var(--qa-ambient-muted);
  line-height: 1.5;
  margin-bottom: 1rem;
}
```

- [ ] **Step 13: Delete `.qa-btn`, `.qa-btn-primary`, `.qa-btn-secondary`, `.qa-btn-danger` (~lines 1237–1278)**

Remove the entire block starting at `.qa-btn {` through `.qa-btn:disabled { ... }`.

Keep `.qa-modal-actions`, `.qa-input`, `.qa-input:focus-visible`, and `.qa-warning-text`. Update `.qa-input` to use ambient tokens:

```css
.qa-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--qa-ambient-border);
  border-radius: 8px;
  background: var(--qa-bg-primary);
  color: var(--qa-ambient-parchment);
  font-size: var(--qa-text-size-ui);
  margin-bottom: 1rem;
}

.qa-input:focus-visible {
  outline: 2px solid var(--qa-ambient-accent);
  border-color: var(--qa-ambient-accent);
}
```

- [ ] **Step 14: Migrate `src/settings/clear-data.js` to mark-btn classes**

```bash
grep -n "qa-btn" src/settings/clear-data.js
```

Replace `qa-btn qa-btn-secondary` → `qa-mark-btn qa-mark-btn--ghost`.
Replace `qa-btn qa-btn-danger` or `qa-btn qa-btn-primary` (whichever is used for the Delete button) → `qa-mark-btn qa-mark-btn--danger-primary`.

Open the file, find the button-construction lines, and apply the class rename. Re-run `grep "qa-btn" src/settings/clear-data.js` — expected: no matches.

- [ ] **Step 15: Grep for any remaining `qa-btn-` consumers to ensure deletion is safe**

```bash
grep -rn "qa-btn-primary\|qa-btn-secondary\|qa-btn-danger" src/ tests/
```

Expected: no matches in `src/`. Matches in `tests/` (if any) should be updated to match the new class names — open those files and replace as needed.

### 3.6 — Reader verse number uses ambient accent

- [ ] **Step 16: Update `.qa-verse-number` (~line 701)**

The legacy `--qa-accent` alias means this selector renders correctly after Task 2, but for clarity and to kill the remaining `--qa-accent` references we swap it:

Change the `.qa-verse-number` rule's `color:` and `border:` from `var(--qa-accent)` to `var(--qa-ambient-accent)`. No other property changes.

Similarly, update `.qa-toggle-btn:hover`, `.qa-about-install-btn`, `.qa-about-attr-list li::before`, and `.qa-about-back-link` — each still references `--qa-accent`. Swap to `--qa-ambient-accent` (and `--qa-accent-hover` → `--qa-ambient-accent` plus darker hover where applicable).

### 3.7 — Build + test + Playwright verification

- [ ] **Step 17: Build**

```bash
pnpm run build
```

Expected: clean build.

- [ ] **Step 18: Unit tests**

```bash
pnpm run test:run
```

Expected: all pass. The contrast test from Task 2 still passes (token values unchanged).

- [ ] **Step 19: Playwright — verify soft-tint selection states in all three themes**

At 1440×900, for each theme in `['light', 'sepia', 'dark']`:

Navigate to `/#/surahs`. Evaluate:

```js
() => {
  const seg = document.querySelector('.qa-sl-seg-item--on');
  const cs = getComputedStyle(seg);
  return { bg: cs.backgroundColor, color: cs.color, ring: cs.boxShadow };
}
```

**Expected:** `bg` is the soft-tinted accent (e.g., `rgba(120, 89, 46, 0.22)` for light), `color` is the solid accent bronze/amber, `boxShadow` contains `inset`.

Screenshot each theme for the visual diff log.

- [ ] **Step 20: Playwright — open clear-data modal, verify ambient styling + button classes**

```js
async () => {
  const mod = await import('/src/settings/clear-data.js');
  mod.showClearDataConfirmation();
  await new Promise(r => setTimeout(r, 250));
  const m = document.querySelector('.qa-modal');
  const cs = getComputedStyle(m);
  const cancel = m.querySelector('.qa-mark-btn--ghost');
  const del = m.querySelector('.qa-mark-btn--danger-primary');
  return { bg: cs.backgroundColor, border: cs.border, cancelFound: !!cancel, deleteFound: !!del };
}
```

**Expected:** `bg` matches `--qa-ambient-surface` for the active theme, `border` matches `--qa-ambient-border`, both buttons found.

- [ ] **Step 21: Run e2e suite**

```bash
PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test --project=chromium-desktop 2>&1 | tail -30
```

Expected: all pass. If any review-hub e2e specs were asserting the old `--qa-bg-secondary` styling they'd fail here — inspect and update them in-place.

### 3.8 — Cleanup + commit

- [ ] **Step 22: Clean artifacts**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short
```

- [ ] **Step 23: Commit**

```bash
git add src/core/theme.css src/settings/clear-data.js tests/
git commit -m "$(cat <<'EOF'
refactor(theme): consume selection/on-accent tokens; retire .qa-btn-*

- 6 selection states (.qa-dock-item--active, .qa-sl-seg-item--on,
  .qa-review-seg-item--on, .qa-mark-chip--on, .qa-onb-t--on,
  .qa-onb-sw--on) switch to soft-tint via --qa-selection-*; per-theme
  color overrides (16 rules) deleted
- 2 solid-fill ornaments (.qa-sl-continue-icon, .qa-mark-selected-count)
  + 2 primary buttons (.qa-mark-btn--primary, .qa-onb-cta--primary)
  use --qa-on-accent; per-theme overrides (8 rules) deleted
- Review hub leaks aligned to ambient tokens (.qa-review-controls,
  -select, -filter-chip, -clear-all-btn, -load-more:hover, -card-chip)
- .qa-modal adopts --qa-ambient-surface / -border / -elevation
- .qa-btn / -primary / -secondary / -danger deleted; clear-data.js
  uses .qa-mark-btn--ghost + .qa-mark-btn--danger-primary
- Reader .qa-verse-number and About install/attr/back-link swap from
  --qa-accent to --qa-ambient-accent for explicit ambient use

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 · Surah list + About desktop layouts

**Cluster rationale:** Two CSS-only surfaces (plus one tiny wrapper div in `about/index.js`) that share the same breakpoint and need the same Playwright verification (render at 1440×900, confirm layout). Both are read-only surfaces — no interaction logic. Grouping them avoids a second dev-server startup cycle.

**Files:**
- Modify: `src/core/theme.css`
- Modify: `src/about/index.js`

### 4.1 — Surah list 2-col grid

- [ ] **Step 1: Append the desktop Surah list rules**

At the end of the `/* Surah list */` section in `theme.css` (after the last `.qa-sl-*` rule, before the next big section), add:

```css
/* Desktop — two-column rows, matches --qa-bp-desktop */
@media (min-width: 1180px) {
  .qa-surah-list-page {
    max-width: 1180px;
  }

  .qa-sl-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 2rem;
    row-gap: 0;
  }

  /* Continue-reading card spans both columns so it stays prominent */
  .qa-sl-continue {
    grid-column: 1 / -1;
  }
}
```

### 4.2 — About page desktop layout

- [ ] **Step 2: Wrap the body-split content in `about/index.js`**

Open `src/about/index.js`. Locate the `// Attribution` block and the `renderInstallButton(mainContent)` call + `// Version` block.

Currently attribution, install, and version are each appended directly to `mainContent`. Wrap them in a `.qa-about-body-split` container so the desktop grid can target them together. Change:

```javascript
  // Attribution
  const attrSection = document.createElement('section')
  attrSection.className = 'qa-about-attribution'
  ...
  mainContent.appendChild(attrSection)

  // PWA Install
  renderInstallButton(mainContent)

  // Version (simplified)
  const versionLine = document.createElement('p')
  versionLine.className = 'qa-about-version-line'
  versionLine.textContent = `v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'}`
  mainContent.appendChild(versionLine)
```

to:

```javascript
  // Body split (attribution + install/version)
  const bodySplit = document.createElement('div')
  bodySplit.className = 'qa-about-body-split'

  // Attribution
  const attrSection = document.createElement('section')
  attrSection.className = 'qa-about-attribution'
  ...
  bodySplit.appendChild(attrSection)

  // Right column — install + version
  const bodyRight = document.createElement('div')
  bodyRight.className = 'qa-about-body-right'

  // PWA Install (appends to bodyRight)
  renderInstallButton(bodyRight)

  // Version
  const versionLine = document.createElement('p')
  versionLine.className = 'qa-about-version-line'
  versionLine.textContent = `v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'}`
  bodyRight.appendChild(versionLine)

  bodySplit.appendChild(bodyRight)
  mainContent.appendChild(bodySplit)
```

Update `renderInstallButton(container)` accordingly — it already takes `container` as a parameter, so passing `bodyRight` just works.

- [ ] **Step 3: Append the desktop About rules to `theme.css`**

At the end of the `/* About Page */` section:

```css
/* Desktop — hero + 4-across stats + 2-col body */
@media (min-width: 1180px) {
  #main-content:has(> .qa-about-heading) {
    max-width: 1000px;
  }

  .qa-about-heading,
  .qa-about-mission {
    text-align: center;
  }
  .qa-about-heading { font-size: 2rem; }
  .qa-about-mission { font-size: 1.125rem; margin-bottom: 2rem; }

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
  .qa-about-body-split .qa-about-install { margin-bottom: 0; }
  .qa-about-body-split .qa-about-version-line { text-align: left; margin-top: 0.75rem; }
}
```

### 4.3 — Build + Playwright verification

- [ ] **Step 4: Build + test**

```bash
pnpm run build && pnpm run test:run
```

Expected: clean.

- [ ] **Step 5: Playwright — Surah list at 1440×900**

```js
() => {
  const list = document.querySelector('.qa-sl-list');
  const cs = getComputedStyle(list);
  const rows = Array.from(list.querySelectorAll('.qa-sl-row'));
  const firstRowRect = rows[0]?.getBoundingClientRect();
  const secondRowRect = rows[1]?.getBoundingClientRect();
  return {
    gridCols: cs.gridTemplateColumns,
    rowCount: rows.length,
    firstRowTop: firstRowRect?.top,
    secondRowTop: secondRowRect?.top,
  };
}
```

**Expected:** `gridCols` shows two tracks (e.g. `"500px 500px"` — approximate). `firstRowTop === secondRowTop` (rows are on the same horizontal line → 2-col grid).

- [ ] **Step 6: Playwright — About at 1440×900**

```js
() => {
  const main = document.getElementById('main-content');
  const stats = document.querySelector('.qa-about-stat-grid');
  const split = document.querySelector('.qa-about-body-split');
  return {
    mainMax: getComputedStyle(main).maxWidth,
    statsCols: getComputedStyle(stats).gridTemplateColumns,
    splitCols: split ? getComputedStyle(split).gridTemplateColumns : null,
  };
}
```

**Expected:** `mainMax: "1000px"`, `statsCols` has 4 tracks, `splitCols` has `<something> 260px`.

Screenshot both surfaces in all three themes.

- [ ] **Step 7: Regression — mobile / tablet**

At 375×667 navigate `/#/surahs`.

```js
() => ({ gridCols: getComputedStyle(document.querySelector('.qa-sl-list')).gridTemplateColumns })
```

Expected: `gridCols: "none"` (single column unchanged).

### 4.4 — Cleanup + commit

- [ ] **Step 8: Clean + commit**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short

git add src/core/theme.css src/about/index.js
git commit -m "$(cat <<'EOF'
feat(desktop): 2-col surah list + hero/4-stats/2-col about at >=1180px

Surah list: .qa-sl-list becomes a 2-col grid at desktop; continue-
reading card spans both columns. Row markup unchanged.

About: wordmark + mission centered, blessing capped to 720px, stat
grid becomes 4-across, attribution + install/version split into a
2-col body via new .qa-about-body-split wrapper in about/index.js.

Both unchanged below 1180px.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 · Mark editor desktop modal (verse-hero)

**Cluster rationale:** One CSS-only surface, but distinct enough from Task 4 to warrant its own verification pass (modal interaction). The mark-editor body layout is intricate and needs Playwright confirmation that every grid assignment lands correctly.

**Files:**
- Modify: `src/core/theme.css`

### 5.1 — Append the verse-hero modal rules

- [ ] **Step 1: Locate the existing desktop Mark editor rules (~line 2127)**

Grep for `.qa-sheet.qa-sheet--mark` inside `theme.css`. There's an existing `@media (min-width: 1180px)` block that sets the 640px width + basic grid — we replace it.

- [ ] **Step 2: Replace the existing desktop Mark editor block with the verse-hero layout**

```css
@media (min-width: 1180px) {
  .qa-sheet.qa-sheet--mark {
    width: min(820px, calc(100vw - 48px));
    /* Positioning inherited from base .qa-sheet @media 768px — true-centered */
    max-height: min(760px, 86vh);
    border-radius: 14px;
    animation: qa-modal-scale-in 0.18s ease forwards;
  }

  .qa-sheet--mark .qa-sheet-grip { display: none; }

  /* Verse hero: spans full width, gentle tint, centered text */
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

### 5.2 — Playwright verification

- [ ] **Step 3: Build**

```bash
pnpm run build
```

- [ ] **Step 4: Open mark editor at 1440×900, capture geometry**

```js
async () => {
  // Assumes we're on /#/s/1
  await new Promise(r => setTimeout(r, 400));
  const v = document.querySelector('[data-verse-key]');
  const mod = await import('/src/marks/editor.js');
  mod.openEditor(v.getAttribute('data-verse-key'));
  await new Promise(r => setTimeout(r, 300));
  const sheet = document.querySelector('.qa-sheet--mark');
  const quote = sheet.querySelector('.qa-mark-quote');
  const body = sheet.querySelector('.qa-mark-body');
  const grip = sheet.querySelector('.qa-sheet-grip');
  const sheetRect = sheet.getBoundingClientRect();
  return {
    viewport: { w: innerWidth, h: innerHeight },
    sheetWidth: sheetRect.width,
    sheetTopGap: sheetRect.top,
    sheetBottomGap: innerHeight - sheetRect.bottom,
    sheetLeftGap: sheetRect.left,
    sheetRightGap: innerWidth - sheetRect.right,
    gripDisplay: getComputedStyle(grip).display,
    quoteGridColumn: getComputedStyle(quote).gridColumn,
    bodyGridCols: getComputedStyle(body).gridTemplateColumns,
  };
}
```

**Expected:**
- `sheetWidth`: 820
- `sheetTopGap` ≈ `sheetBottomGap` (within 10px)
- `sheetLeftGap === sheetRightGap`
- `gripDisplay: "none"`
- `quoteGridColumn` includes `/ -1` (spans full width)
- `bodyGridCols` has 2 tracks

Screenshot in each theme.

- [ ] **Step 5: Mobile regression**

Resize to 375×667. Open mark editor. Expected: sheet anchored at bottom (bottom-sheet mobile layout), grip visible.

### 5.3 — Cleanup + commit

- [ ] **Step 6: Commit**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short

git add src/core/theme.css
git commit -m "$(cat <<'EOF'
feat(desktop): verse-hero mark editor modal at >=1180px

- Modal widens to 820px, caps at 760px height, uses symmetric radius
  and qa-modal-scale-in animation (not slide-up)
- .qa-mark-quote promoted to a full-width verse hero with centered
  text, gentle accent gradient, and larger Arabic
- Body grid: note (left column), tags (right column); grip handle
  hidden at desktop

Mobile bottom-sheet unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 · Review hub desktop (left rail + 2-col cards)

**Cluster rationale:** The only task with substantial new JS. `review/hub.js` gains a rail-construction branch guarded by a media-query check. CSS + JS must land together.

**Files:**
- Modify: `src/core/theme.css`
- Modify: `src/review/hub.js`

### 6.1 — CSS rules for desktop layout

- [ ] **Step 1: Append to the "Review hub + FVR" section in `theme.css`**

```css
/* Desktop — left rail + 2-col card grid */
@media (min-width: 1180px) {
  .qa-review-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    column-gap: 2rem;
    align-items: start;
    max-width: 1180px;
    margin: 0 auto;
  }

  /* Top dropdown controls are replaced by the rail at desktop */
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
    font: inherit;
    border: none;
    background: transparent;
    text-align: left;
    width: 100%;
  }
  .qa-review-rail-row:hover {
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 4%, transparent);
  }
  .qa-review-rail-row--on {
    background-color: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }
  .qa-review-rail-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .qa-review-rail-count {
    margin-left: auto;
    font-size: 0.6875rem;
    color: var(--qa-ambient-muted);
    font-variant-numeric: tabular-nums;
  }

  .qa-review-main { min-width: 0; }
  .qa-review-card-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 1rem;
    row-gap: 0.625rem;
  }
  .qa-review-tag-header,
  .qa-review-surah-header {
    grid-column: 1 / -1;
  }
}

/* FVR keeps its existing centered no-rail layout at desktop */
@media (min-width: 1180px) {
  .qa-fvr-layout {
    max-width: 720px;
    margin: 0 auto;
  }
}
```

### 6.2 — `review/hub.js` — build rail + wrap card output

- [ ] **Step 2: Read `src/review/hub.js` to locate the existing structure**

```bash
grep -n "init\|rerender\|mainContent\|appendChild" src/review/hub.js | head -30
```

Identify: (a) the `init` function signature, (b) where `mainContent` (or equivalent) is populated, (c) where `state.groupBy` lives, (d) the FVR branch (it will early-return or branch on `params.tag`).

- [ ] **Step 3: Introduce a `buildRail(state, rerender)` helper**

Add this function near the other render helpers in `hub.js`:

```javascript
/**
 * Build the desktop left rail: group-by segmented + filtered list of
 * active-group entries. Returns the rail element.
 */
function buildRail({ state, marks, rerender }) {
  const rail = document.createElement('aside')
  rail.className = 'qa-review-rail'

  // Group-by segmented
  const segLabel = document.createElement('div')
  segLabel.className = 'qa-review-rail-section'
  segLabel.textContent = 'Group by'
  rail.appendChild(segLabel)

  const seg = document.createElement('div')
  seg.className = 'qa-review-seg'
  seg.style.width = '100%'
  seg.style.display = 'flex'
  for (const [key, label] of [['tag', 'Tag'], ['surah', 'Surah'], ['date', 'Date']]) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'qa-review-seg-item' + (state.groupBy === key ? ' qa-review-seg-item--on' : '')
    btn.style.flex = '1'
    btn.textContent = label
    btn.addEventListener('click', () => { state.groupBy = key; state.activeGroup = null; rerender() })
    seg.appendChild(btn)
  }
  rail.appendChild(seg)

  // Active group — list of tags / surahs / dates with counts
  const groupsLabel = document.createElement('div')
  groupsLabel.className = 'qa-review-rail-section'
  groupsLabel.textContent = state.groupBy === 'tag' ? 'Tags'
    : state.groupBy === 'surah' ? 'Surahs'
    : 'Dates'
  rail.appendChild(groupsLabel)

  const buckets = computeRailBuckets(marks, state.groupBy) // see Step 4
  for (const bucket of buckets) {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = 'qa-review-rail-row' + (state.activeGroup === bucket.key ? ' qa-review-rail-row--on' : '')
    if (bucket.dotColor) {
      const dot = document.createElement('span')
      dot.className = 'qa-review-rail-dot'
      dot.style.backgroundColor = bucket.dotColor
      row.appendChild(dot)
    }
    const label = document.createElement('span')
    label.textContent = bucket.label
    row.appendChild(label)
    const count = document.createElement('span')
    count.className = 'qa-review-rail-count'
    count.textContent = bucket.count
    row.appendChild(count)
    row.addEventListener('click', () => {
      state.activeGroup = state.activeGroup === bucket.key ? null : bucket.key
      rerender()
    })
    rail.appendChild(row)
  }

  return rail
}
```

- [ ] **Step 4: Add `computeRailBuckets`**

```javascript
/**
 * Given marks + groupBy, return [{ key, label, count, dotColor? }]
 * for display in the rail. Dot color only for tag grouping.
 */
function computeRailBuckets(marks, groupBy) {
  if (groupBy === 'tag') {
    const byTag = new Map() // tag -> count
    for (const m of marks) {
      for (const t of m.tags || []) {
        byTag.set(t, (byTag.get(t) || 0) + 1)
      }
    }
    return Array.from(byTag.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({
        key: tag,
        label: tag,
        count,
        dotColor: colorForTag(tag), // existing helper in review/hub.js — reuse
      }))
  }
  if (groupBy === 'surah') {
    const bySurah = new Map()
    for (const m of marks) {
      const s = parseInt(m.verseKey.split(':')[0], 10)
      bySurah.set(s, (bySurah.get(s) || 0) + 1)
    }
    return Array.from(bySurah.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([n, count]) => ({
        key: String(n),
        label: surahName(n), // existing helper — reuse, or inline
        count,
      }))
  }
  // date: group by YYYY-MM
  const byMonth = new Map()
  for (const m of marks) {
    const d = m.createdAt ? new Date(m.createdAt) : null
    if (!d) continue
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth.set(ym, (byMonth.get(ym) || 0) + 1)
  }
  return Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ym, count]) => ({ key: ym, label: ym, count }))
}
```

Note: `colorForTag` and `surahName` may not be named exactly those — check `hub.js` for existing helpers and reuse whatever emits the colored tag dot elsewhere in the file.

- [ ] **Step 5: Wire rail into the rerender flow**

In `init({ tag })`, after the main content scaffolding is built but before the card-list block:

```javascript
// Inside init, after mainContent is cleared:

const isFvr = !!tag
const isDesktop = window.matchMedia('(min-width: 1180px)').matches

const state = {
  groupBy: /* existing initial value, e.g. 'tag' */,
  activeGroup: null,
  /* any other existing state */
}

// At desktop (not FVR), wrap the content in .qa-review-layout + rail + main
let cardHost
if (!isFvr && isDesktop) {
  const layout = document.createElement('div')
  layout.className = 'qa-review-layout'

  const railEl = buildRail({ state, marks, rerender })
  layout.appendChild(railEl)

  const mainCol = document.createElement('div')
  mainCol.className = 'qa-review-main'
  layout.appendChild(mainCol)

  mainContent.appendChild(layout)
  cardHost = mainCol
} else {
  cardHost = mainContent
}

// Existing code that built controls + card list is unchanged, but it
// appends into `cardHost` instead of `mainContent`. The top .qa-review-controls
// is hidden via CSS at desktop (display:none inside .qa-review-layout).

// Wrap the card output in a .qa-review-card-list grid container so the
// 2-col rule takes effect at desktop:
const cardList = document.createElement('div')
cardList.className = 'qa-review-card-list'
cardHost.appendChild(cardList)

// Existing card-rendering loop appends to `cardList` (was mainContent).
```

Apply filter-by-active-group inside `rerender()`: if `state.activeGroup` is set, filter `marks` to that group before rendering cards (tag/surah/date).

- [ ] **Step 6: Rebuild rail on every rerender**

`rerender()` must tear down + rebuild the rail (so counts + selection reflect the current state). Simplest: use the project's teardown idiom (`while (mainContent.firstChild) mainContent.removeChild(mainContent.firstChild)`) and re-execute the layout construction. If the existing `rerender` is already doing a full teardown, just call `buildRail` again at the top of that teardown path.

### 6.3 — Playwright verification

- [ ] **Step 7: Seed marks via evaluate (so the hub has something to render)**

First grep the actual `marks/store.js` export name:

```bash
grep -n "export" src/marks/store.js | head
```

Then using the matched function name (commonly `addOrUpdate` or `saveMark`):

```js
async () => {
  const store = await import('/src/marks/store.js');
  const fn = store.addOrUpdate || store.saveMark || store.addMark;
  if (!fn) throw new Error('Check marks/store.js exports');
  const now = Date.now();
  await fn({ verseKey: '2:255', tags: ['reflect', 'core-theology'], note: 'Ayat al-Kursi', createdAt: now - 10000 });
  await fn({ verseKey: '1:5',  tags: ['reflect'], note: '', createdAt: now - 20000 });
  await fn({ verseKey: '67:1', tags: ['reflect', 'protection'], note: '', createdAt: now - 30000 });
  await fn({ verseKey: '93:11', tags: ['gratitude'], note: '', createdAt: now - 40000 });
  return 'seeded';
}
```

- [ ] **Step 8: Navigate to `/#/review` at 1440×900 and verify**

```js
() => {
  const layout = document.querySelector('.qa-review-layout');
  const rail = document.querySelector('.qa-review-rail');
  const cardList = document.querySelector('.qa-review-card-list');
  const controls = document.querySelector('.qa-review-controls');
  return {
    layoutExists: !!layout,
    layoutGrid: layout ? getComputedStyle(layout).gridTemplateColumns : null,
    railSticky: rail ? getComputedStyle(rail).position : null,
    railRows: rail ? rail.querySelectorAll('.qa-review-rail-row').length : 0,
    cardListGrid: cardList ? getComputedStyle(cardList).gridTemplateColumns : null,
    controlsDisplay: controls ? getComputedStyle(controls).display : 'not-present',
  };
}
```

**Expected:** `layoutExists: true`, `layoutGrid: "220px …"`, `railSticky: "sticky"`, `railRows >= 2`, `cardListGrid` has 2 tracks, `controlsDisplay: "none"` or `"not-present"`.

- [ ] **Step 9: Click a rail row, confirm cards filter**

```js
() => {
  const firstRow = document.querySelector('.qa-review-rail-row');
  const beforeCount = document.querySelectorAll('.qa-review-card').length;
  firstRow.click();
  return {
    firstRowLabel: firstRow.textContent.trim(),
    beforeCount,
    afterCount: document.querySelectorAll('.qa-review-card').length,
    rowOn: firstRow.classList.contains('qa-review-rail-row--on'),
  };
}
```

**Expected:** `afterCount <= beforeCount`, `rowOn: true`.

- [ ] **Step 10: FVR regression — at desktop, no rail**

Navigate to `/#/t/reflect`. Evaluate:

```js
() => ({
  layoutExists: !!document.querySelector('.qa-review-layout'),
  railExists: !!document.querySelector('.qa-review-rail'),
});
```

Expected: both `false`. FVR still uses its own layout.

- [ ] **Step 11: Mobile regression**

Resize to 375×667 and navigate `/#/review`. Expected: `.qa-review-layout` does NOT exist (rail not built on mobile), top-row controls visible.

### 6.4 — Cleanup + commit

- [ ] **Step 12: Commit**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short

git add src/core/theme.css src/review/hub.js
git commit -m "$(cat <<'EOF'
feat(desktop): left rail + 2-col card grid for review hub

At >=1180px, review hub mounts a .qa-review-layout grid (220px rail +
main). Rail contains a re-rendered group-by segmented + the live list
of groups (tag/surah/date buckets with counts). Clicking a row filters
cards to that group. Top dropdown controls hidden at desktop; cards
flow 2-across under the active group header. FVR and mobile layouts
unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 · E2E spec + docs

**Cluster rationale:** New desktop-specific e2e spec + docs update. Kept separate from the implementation tasks because it validates all of them as a set, and because it touches a different directory.

**Files:**
- Create: `tests/e2e/desktop-layouts.spec.js`
- Modify: `docs/context/user-journeys.md`

### 7.1 — Desktop e2e spec

- [ ] **Step 1: Check existing e2e conventions**

```bash
ls tests/e2e/
head -60 tests/e2e/*.spec.js | head -100
```

Identify the viewport-setup pattern used by existing specs (likely `test.use({ viewport: … })` per describe block).

- [ ] **Step 2: Create `tests/e2e/desktop-layouts.spec.js`**

```javascript
import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test.describe('Desktop layouts @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Skip onboarding so tests land on target surfaces directly
      localStorage.setItem('qa-onboarding-complete', '1')
    })
  })

  test('surah list renders as 2-col grid', async ({ page }) => {
    await page.goto('/#/surahs')
    await page.waitForSelector('.qa-sl-list .qa-sl-row')
    const cols = await page.locator('.qa-sl-list').evaluate(el => getComputedStyle(el).gridTemplateColumns)
    expect(cols.split(' ').length).toBe(2)

    // Two consecutive rows should share the same top offset (same row)
    const rowTops = await page.locator('.qa-sl-row').evaluateAll(rows => [
      rows[0].getBoundingClientRect().top,
      rows[1].getBoundingClientRect().top,
    ])
    expect(Math.abs(rowTops[0] - rowTops[1])).toBeLessThan(2)
  })

  test('about page: stats 4-across, body split 2-col', async ({ page }) => {
    await page.goto('/#/about')
    await page.waitForSelector('.qa-about-stat-grid')
    const statCols = await page.locator('.qa-about-stat-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns)
    expect(statCols.split(' ').length).toBe(4)

    const splitExists = await page.locator('.qa-about-body-split').count()
    expect(splitExists).toBe(1)
  })

  test('mark editor: verse-hero modal centered, grip hidden', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')
    await page.evaluate(async () => {
      const mod = await import('/src/marks/editor.js')
      const v = document.querySelector('[data-verse-key]')
      mod.openEditor(v.getAttribute('data-verse-key'))
    })
    await page.waitForSelector('.qa-sheet--mark')

    const geom = await page.locator('.qa-sheet--mark').evaluate(el => {
      const r = el.getBoundingClientRect()
      return {
        width: r.width,
        topGap: r.top,
        bottomGap: window.innerHeight - r.bottom,
        leftGap: r.left,
        rightGap: window.innerWidth - r.right,
      }
    })
    expect(geom.width).toBe(820)
    expect(Math.abs(geom.topGap - geom.bottomGap)).toBeLessThan(10)
    expect(geom.leftGap).toBeCloseTo(geom.rightGap, 0)

    const gripDisplay = await page.locator('.qa-sheet--mark .qa-sheet-grip').evaluate(el => getComputedStyle(el).display)
    expect(gripDisplay).toBe('none')

    const quoteSpan = await page.locator('.qa-sheet--mark .qa-mark-quote').evaluate(el => getComputedStyle(el).gridColumn)
    expect(quoteSpan).toContain('-1')
  })

  test('review hub: left rail builds + filters on click', async ({ page }) => {
    // Seed a couple of marks
    await page.goto('/#/s/1')
    await page.evaluate(async () => {
      const store = await import('/src/marks/store.js')
      const fn = store.addOrUpdate || store.saveMark || store.addMark
      const now = Date.now()
      await fn({ verseKey: '1:5', tags: ['reflect'], note: '', createdAt: now })
      await fn({ verseKey: '2:255', tags: ['reflect', 'core'], note: '', createdAt: now - 1000 })
      await fn({ verseKey: '67:1', tags: ['protection'], note: '', createdAt: now - 2000 })
    })

    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-layout')

    const layoutCols = await page.locator('.qa-review-layout').evaluate(el => getComputedStyle(el).gridTemplateColumns)
    expect(layoutCols).toContain('220px')

    const rowCount = await page.locator('.qa-review-rail-row').count()
    expect(rowCount).toBeGreaterThan(0)

    const beforeCards = await page.locator('.qa-review-card').count()
    await page.locator('.qa-review-rail-row').first().click()
    const afterCards = await page.locator('.qa-review-card').count()
    expect(afterCards).toBeLessThanOrEqual(beforeCards)
  })
})
```

Adjust the `addOrUpdate / saveMark / addMark` fallback chain to match actual `marks/store.js` exports — grep to confirm before running.

- [ ] **Step 3: Add npm script for the desktop suite (optional)**

In `package.json` `scripts`, add:

```json
"test:e2e:desktop": "playwright test tests/e2e/desktop-layouts.spec.js --project=chromium-desktop"
```

If the project config doesn't have a `chromium-desktop` project, use whatever desktop project name exists in `playwright.config.js`.

- [ ] **Step 4: Run it**

```bash
pnpm run test:e2e:desktop
```

Expected: 4 tests pass.

### 7.2 — Update `user-journeys.md`

- [ ] **Step 5: Read current review hub journey**

```bash
grep -n "Review" docs/context/user-journeys.md | head
```

- [ ] **Step 6: Note the desktop rail in the existing Review hub journey**

Insert a bullet under the Review hub journey section noting that at desktop a left rail lists tag/surah/date groups with counts and acts as a filter; FVR (`#/t/:tag`) keeps its centered no-rail layout.

Keep the bullet surface-level ("desktop layout adds a left rail for filtering by tag/surah/date") — no pixel-level detail.

### 7.3 — Final verification + commit

- [ ] **Step 7: Full regression**

```bash
pnpm run build
pnpm run test:run
PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test --project=chromium-desktop 2>&1 | tail -40
```

Expected: all green.

- [ ] **Step 8: Screenshot baseline (manual, optional)**

For the reviewer: take 1440×900 screenshots of the four surfaces × three themes (12 images) and save to a scratch dir you delete before committing. This gives a pre-merge visual diff record.

- [ ] **Step 9: Commit**

```bash
rm -rf .playwright-mcp test-output *.png
git status --short

git add tests/ docs/context/user-journeys.md package.json
git commit -m "$(cat <<'EOF'
test(e2e): desktop-layouts.spec.js + user-journeys note for review rail

- New e2e spec validates surah 2-col grid, about stats 4-across,
  mark editor 820px true-centered + hero span, review rail + filter
- user-journeys: note the desktop review rail as an additional filter
  entry; mobile flow unchanged

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist

Run this pass after completing all 7 tasks.

- [ ] **Placeholder scan:** `grep -E "TBD|TODO|FIXME|implement later" docs/superpowers/plans/2026-04-18-desktop-redesign.md` — should return empty.
- [ ] **Token consistency:** every selector using `--qa-ambient-surface` for "text on accent" has been rewritten to `--qa-on-accent`. `grep -rn "color: var(--qa-ambient-surface)" src/core/theme.css` should return only the selection-bg context (if any).
- [ ] **Legacy accent sweep:** `grep -rn "var(--qa-accent)" src/` — remaining uses should only be via the alias (i.e. the alias target is still defined). Any `--qa-accent` used for a background-heavy "primary" treatment should have been swapped to `--qa-ambient-accent` explicitly.
- [ ] **Theme overrides count:** `grep -c "^html\[data-theme=" src/core/theme.css` — should have dropped by ~16 lines (8 selectors × 2 theme overrides each).
- [ ] **Playwright coverage:** each of `/surahs`, `/review`, `/about`, `/s/1 + mark editor` was verified at 1440×900 with a `browser_evaluate` that read computed styles, AND at 375×667 to confirm mobile unchanged.
- [ ] **Regression baseline:** `pnpm run test:run` + full e2e suite green. No new specs failing.
- [ ] **Docs updated:** `docs/context/user-journeys.md` mentions the desktop review rail.

---

## Execution handoff

**Two execution options:**

1. **Inline Execution (recommended, per user feedback)** — Execute tasks in this session using `superpowers:executing-plans`. Each task is a checkpoint; commit at the end of each. Defaults to the main session; no subagent dispatch.

2. **Subagent-Driven** — Dispatch a fresh subagent per task via `superpowers:subagent-driven-development`. Not recommended here: each task clusters multiple related edits in the same 1–2 files; per-task subagent context would mostly duplicate parent context.

**Default: Inline Execution.**
