# Desktop Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the first desktop redesign — expand font scale with shortcuts, rebalance the mark editor, refactor the review hub to a single-column de-duplicated card list with multi-tag OR filtering, center FVR at desktop, scale up onboarding for desktop, and add a shortcuts-intro screen.

**Architecture:** Nine clustered work units. Each unit is CSS-heavy or JS-heavy but never both unless required. Each produces a single commit. Playwright MCP verifies every CSS-touching unit at three viewports (375×667 mobile, 768×1024 tablet, 1440×900 desktop). The review-hub refactor (Task 3) is the biggest: it deletes three rendering functions and introduces a single flat renderer plus multi-tag filter state.

**Tech Stack:** Vanilla JS + Vite + CSS custom properties. `src/core/theme.css` is the single CSS file (~2800 lines, holds tokens + every surface's styles). Vitest + jsdom + `fake-indexeddb/auto` for unit tests; Playwright for e2e.

**Spec:** `docs/superpowers/specs/2026-04-18-desktop-polish-design.md`

**Execution constraints (per prior user feedback):**
- **Cluster related issues together.** Each task bundles all edits that share files/tokens/risk.
- **Default to main-session execution.** No per-task subagent dispatch unless context overflows.
- **Verify each cluster empirically with Playwright** at the real viewport(s) before committing.
- **Clean test artifacts** (`rm -rf .playwright-mcp test-output`) before each commit.

---

## Shared verification snippets

Reused inside multiple tasks.

**Start / restart dev server:**

```bash
kill $(lsof -ti:5173) 2>/dev/null
pnpm run dev
```
Vite picks 5173 by default.

**Playwright MCP sequence for a surface (template):**
1. `mcp__plugin_playwright_playwright__browser_resize` → target viewport
2. `mcp__plugin_playwright_playwright__browser_navigate` → `http://localhost:5173/#/<route>`
3. After navigate, always `page.evaluate('() => { location.reload(true); }')` then wait 2s to clear Vite's HMR module cache.
4. `mcp__plugin_playwright_playwright__browser_evaluate` → read computed styles / bounding rects

**Safe DOM teardown idiom used in this codebase:**

```javascript
while (el.firstChild) { el.removeChild(el.firstChild) }
```

**After each cluster — mandatory cleanup before commit:**

```bash
rm -rf .playwright-mcp test-output
git status --short   # confirm only intended changes
```

---

## Task 1 · Font system expansion (5-step scale + preview binding + ⌘↑/⌘↓ shortcuts)

**Cluster rationale:** `SCALE` expansion, IDB migration, preview DOM order, preview CSS binding, global shortcuts, and the stale `bumpFont` order array all feed the same user-facing behavior: "font size should have more granularity, its preview should react, and keyboard should work". Splitting them creates dead commits where e.g. the slider has 5 stops but the preview still shows 3 sizes.

**Files:**
- Modify: `src/settings/font-size.js`
- Modify: `src/settings/panel.js`
- Modify: `src/core/theme.css`
- Modify: `src/nav/command-sheet.js`
- Create: `tests/unit/settings/font-size.test.js`

### 1.1 — Expand the scale + IDB migration

- [ ] **Step 1: Replace `SCALE`/`OPTIONS`/`DEFAULT_SIZE` in `src/settings/font-size.js`**

Open `src/settings/font-size.js`. Replace lines 11–13:

```javascript
const DEFAULT_SIZE = 'medium'
const OPTIONS = ['small', 'medium', 'large']
const SCALE = { small: 0.875, medium: 1, large: 1.15 }
```

with:

```javascript
const DEFAULT_SIZE = 'md'
const OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl']
const SCALE = { xs: 0.75, sm: 0.875, md: 1.0, lg: 1.15, xl: 1.3 }
const LEGACY_MAP = { small: 'sm', medium: 'md', large: 'lg' }
```

- [ ] **Step 2: Backward-compat migration in `loadFontSize()`**

Replace the `loadFontSize` function (lines 25–33 currently) with:

```javascript
export async function loadFontSize() {
  try {
    const saved = await get('settings', 'fontSize')
    const raw = saved?.value
    if (!raw) { return DEFAULT_SIZE }
    if (OPTIONS.includes(raw)) { return raw }
    if (LEGACY_MAP[raw]) {
      const mapped = LEGACY_MAP[raw]
      // Fire-and-forget rewrite so subsequent loads are clean
      put('settings', { key: 'fontSize', value: mapped }).catch(() => {})
      return mapped
    }
    return DEFAULT_SIZE
  } catch (error) {
    logger.error('Failed to load font size', { error })
    return DEFAULT_SIZE
  }
}
```

- [ ] **Step 3: Create `tests/unit/settings/font-size.test.js`**

```javascript
import { describe, expect, it, beforeEach, vi } from 'vitest'

// fake-indexeddb/auto is set up globally via vitest.config — DB is fresh each test

describe('font-size', () => {
  beforeEach(async () => {
    vi.resetModules()
    // Clear any persisted settings between tests
    const { deleteDB } = await import('idb')
    try { await deleteDB('quran-atlas') } catch {}
  })

  it('exposes 5 options in ascending scale order', async () => {
    const mod = await import('../../../src/settings/font-size.js')
    const opts = mod.getFontSizeOptions()
    expect(opts).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
  })

  it('returns "md" on fresh install', async () => {
    const { loadFontSize } = await import('../../../src/settings/font-size.js')
    expect(await loadFontSize()).toBe('md')
  })

  it('maps legacy "medium" → "md"', async () => {
    const { put } = await import('../../../src/core/db.js')
    await put('settings', { key: 'fontSize', value: 'medium' })
    const { loadFontSize } = await import('../../../src/settings/font-size.js')
    expect(await loadFontSize()).toBe('md')
  })

  it('maps legacy "small" → "sm" and "large" → "lg"', async () => {
    const { put } = await import('../../../src/core/db.js')
    const { loadFontSize } = await import('../../../src/settings/font-size.js')

    await put('settings', { key: 'fontSize', value: 'small' })
    expect(await loadFontSize()).toBe('sm')

    await put('settings', { key: 'fontSize', value: 'large' })
    expect(await loadFontSize()).toBe('lg')
  })

  it('rejects unknown values via setFontSize', async () => {
    const { setFontSize } = await import('../../../src/settings/font-size.js')
    expect(await setFontSize('enormous')).toBe(false)
  })

  it('accepts each new option via setFontSize', async () => {
    const { setFontSize } = await import('../../../src/settings/font-size.js')
    for (const s of ['xs', 'sm', 'md', 'lg', 'xl']) {
      expect(await setFontSize(s)).toBe(true)
    }
  })
})
```

- [ ] **Step 4: Run the new test file**

```bash
pnpm exec vitest run tests/unit/settings/font-size.test.js
```

Expected: all 6 tests pass.

- [ ] **Step 5: Run full test suite to catch unrelated regressions**

```bash
pnpm run test:run
```

Expected: all tests pass. If any existing tests asserted on `'small' | 'medium' | 'large'` font-size strings, update them to the new tokens inline (most likely: none, since `getFontSizeOptions` is the contract).

### 1.2 — Font preview: DOM order + CSS binding

- [ ] **Step 6: Reorder preview DOM in `src/settings/panel.js`**

Open `src/settings/panel.js`, locate `buildFontSection` (starts ~line 149). Replace the preview block (lines 168–178):

```javascript
  const preview = document.createElement('div')
  preview.className = 'qa-font-preview'
  const arSpan = document.createElement('span')
  arSpan.className = 'qa-font-preview-ar'
  arSpan.setAttribute('dir', 'rtl')
  arSpan.textContent = '\u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650' // ٱلرَّحْمَـٰنِ
  const enSpan = document.createElement('span')
  enSpan.className = 'qa-font-preview-en'
  enSpan.textContent = ' \u00B7 The Most Gracious'
  preview.appendChild(arSpan)
  preview.appendChild(enSpan)
```

with:

```javascript
  const preview = document.createElement('div')
  preview.className = 'qa-font-preview'
  const enSpan = document.createElement('span')
  enSpan.className = 'qa-font-preview-en'
  enSpan.textContent = 'The Most Gracious \u00B7 '
  const arSpan = document.createElement('span')
  arSpan.className = 'qa-font-preview-ar'
  arSpan.setAttribute('dir', 'rtl')
  arSpan.textContent = '\u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650' // ٱلرَّحْمَـٰنِ
  preview.appendChild(enSpan)
  preview.appendChild(arSpan)
```

- [ ] **Step 7: Bind preview CSS to text tokens**

Open `src/core/theme.css`, find the `.qa-font-preview-ar` and `.qa-font-preview-en` rules (around lines 2055–2062). Replace:

```css
.qa-font-preview-ar {
  font-family: var(--qa-font-arabic);
  color: var(--qa-ambient-parchment);
  font-size: 1rem;
}
.qa-font-preview-en {
  color: var(--qa-ambient-muted);
  font-size: 0.8125rem;
}
```

with:

```css
.qa-font-preview-ar {
  font-family: var(--qa-font-arabic);
  color: var(--qa-ambient-parchment);
  font-size: calc(var(--qa-text-size-arabic) * var(--qa-font-size-base) * 0.7);
  line-height: var(--qa-line-height-arabic);
}
.qa-font-preview-en {
  color: var(--qa-ambient-muted);
  font-size: calc(var(--qa-text-size-translation) * var(--qa-font-size-base) * 0.8);
}
```

(The `* 0.7 / * 0.8` scaling keeps the preview physically compact; it previews *relative* change, not absolute size.)

### 1.3 — `⌘↑ / ⌘↓` shortcuts + `bumpFont` fix

- [ ] **Step 8: Fix `bumpFont` to use the live options list**

Open `src/nav/command-sheet.js`, locate `bumpFont` (lines 446–451). Replace:

```javascript
async function bumpFont(dir) {
  const order = ['small', 'medium', 'large']
  const cur = await loadFontSize()
  const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + dir))
  await setFontSize(order[idx])
}
```

with:

```javascript
async function bumpFont(dir) {
  const order = getFontSizeOptions()
  const cur = await loadFontSize()
  const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + dir))
  const next = order[idx]
  if (next === cur) { return }
  await setFontSize(next)
  announce(`Font size: ${next}`)
}
```

- [ ] **Step 9: Ensure imports are present**

At the top of `src/nav/command-sheet.js`, confirm:
- `getFontSizeOptions`, `loadFontSize`, `setFontSize` are imported from `'../settings/font-size.js'` (they likely already are — `bumpFont` already uses `loadFontSize` and `setFontSize`).
- `announce` is imported from `'../a11y/announcer.js'`.

Add either import if missing. Run:

```bash
grep -n "import.*font-size\|import.*announcer" src/nav/command-sheet.js
```

Expected: both imports present.

- [ ] **Step 10: Add `⌘↑ / ⌘↓` handler to `onKeydown`**

In `src/nav/command-sheet.js`, locate `onKeydown` (line 453). After the `isK && (e.metaKey || e.ctrlKey)` branch (ends at line 459), and **before** `if (!isOpen) {` (line 461), insert:

```javascript
  // Global font size shortcut: ⌘↑ / ⌘↓ (or Ctrl on non-Mac)
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
    const target = e.target
    const isFormField = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
    if (!isFormField) {
      if (e.key === 'ArrowUp')   { e.preventDefault(); bumpFont(+1); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); bumpFont(-1); return }
    }
  }
```

### 1.4 — Build / unit test / commit (partial)

- [ ] **Step 11: Build + unit tests**

```bash
pnpm run build && pnpm run test:run
```

Expected: clean build; all tests pass.

### 1.5 — Playwright verification (desktop + mobile)

- [ ] **Step 12: Start dev server**

```bash
kill $(lsof -ti:5173) 2>/dev/null
pnpm run dev
```

Wait ~3s, then verify with `curl -s http://localhost:5173/ | head -3`.

- [ ] **Step 13: Resize to 1440×900 and open Settings → measure preview + shortcut**

Use Playwright MCP:

```js
// Step 13a — navigate + reload + open settings
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

// Step 13b — open Settings sheet directly via panel module
await browser_evaluate({ function: `async () => {
  const mod = await import('/src/settings/panel.js');
  await mod.openSettingsSheet();
}` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 400))` })

// Step 13c — confirm preview order, slider stops, and initial sizes
await browser_evaluate({ function: `() => {
  const preview = document.querySelector('.qa-font-preview');
  const children = Array.from(preview.children).map(c => c.className);
  const ar = preview.querySelector('.qa-font-preview-ar');
  const en = preview.querySelector('.qa-font-preview-en');
  const slider = document.querySelector('.qa-font-slider');
  return {
    childOrder: children,
    arFontSize: getComputedStyle(ar).fontSize,
    enFontSize: getComputedStyle(en).fontSize,
    sliderMax: slider.max,
    sliderValue: slider.value,
  };
}` })
```

Expected:
- `childOrder: ['qa-font-preview-en', 'qa-font-preview-ar']` (English first in DOM, so English renders on the left in LTR).
- `arFontSize` is a px value in the ~20–28px range at `md`.
- `sliderMax === '4'` (5 options → indices 0–4).

- [ ] **Step 14: Drag slider to xs and xl — verify preview scales**

```js
await browser_evaluate({ function: `async () => {
  const slider = document.querySelector('.qa-font-slider');
  slider.value = '0';  // xs
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  const arXS = getComputedStyle(document.querySelector('.qa-font-preview-ar')).fontSize;

  slider.value = '4';  // xl
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  const arXL = getComputedStyle(document.querySelector('.qa-font-preview-ar')).fontSize;

  return { arXS, arXL, htmlFontSize: document.documentElement.getAttribute('data-font-size') };
}` })
```

Expected: `arXL` is a larger px value than `arXS` (ratio ~1.73 since 1.3 / 0.75). `htmlFontSize === 'xl'`.

- [ ] **Step 15: Close Settings; verify `⌘↑ / ⌘↓` work on reader**

```js
// Close settings via Escape
await browser_evaluate({ function: `() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 300))` })

// Initial size
await browser_evaluate({ function: `() => document.documentElement.getAttribute('data-font-size')` })
// Press ⌘↓ three times → should go from xl to md (xl → lg → md, clamps above)
await browser_evaluate({ function: `async () => {
  for (let i = 0; i < 3; i++) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
  }
  return document.documentElement.getAttribute('data-font-size');
}` })
```

Expected: value descends through sizes (e.g. from `xl` to `md` or lower). Not stuck; each press announces.

- [ ] **Step 16: Mobile regression at 375×667**

```js
await browser_resize({ width: 375, height: 667 })
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `async () => {
  const mod = await import('/src/settings/panel.js');
  await mod.openSettingsSheet();
  await new Promise(r => setTimeout(r, 400));
  const preview = document.querySelector('.qa-font-preview');
  return Array.from(preview.children).map(c => c.className);
}` })
```

Expected: same `['qa-font-preview-en', 'qa-font-preview-ar']` child order on mobile.

### 1.6 — Cleanup + commit

- [ ] **Step 17: Clean artifacts**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected files modified:
- `src/settings/font-size.js`
- `src/settings/panel.js`
- `src/core/theme.css`
- `src/nav/command-sheet.js`
- `tests/unit/settings/font-size.test.js` (new)

- [ ] **Step 18: Commit**

```bash
git add src/settings/font-size.js src/settings/panel.js src/core/theme.css src/nav/command-sheet.js tests/unit/settings/font-size.test.js
git commit -m "$(cat <<'EOF'
feat(font): 5-step scale + preview token binding + en-first preview + cmd+up/down

- SCALE expanded to xs/sm/md/lg/xl (0.75 → 1.3); DEFAULT_SIZE = md
- IDB backward-compat: legacy 'small|medium|large' resolved to 'sm|md|lg'
  on load; rewritten for subsequent cleans
- Settings font preview: English span appended first (translation left,
  Arabic right in LTR); CSS binds to --qa-text-size-* × --qa-font-size-base
- Global keyboard shortcut: Cmd/Ctrl + Arrow Up/Down bumps font size;
  guards against input targets; announces new size via a11y live region
- bumpFont now reads getFontSizeOptions() (was hardcoded 3-entry array)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 · Mark editor column rebalance

**Cluster rationale:** Pure CSS edit. Moves `.qa-mark-selected` from col 2 to col 1 so selected-pills sit under the note instead of leaving empty space there. JS DOM order unchanged; grid-column rules are all that change.

**Files:**
- Modify: `src/core/theme.css`
- Modify: `tests/unit/core/responsive-tokens.test.js` (update a single assertion)

### 2.1 — Move `.qa-mark-selected` to col 1

- [ ] **Step 1: Edit the desktop mark editor grid rules**

In `src/core/theme.css`, inside `@media (min-width: 1180px)` for `.qa-sheet--mark`, locate the grid-column block (around lines 2183–2188). Replace:

```css
  .qa-sheet--mark .qa-mark-body > .qa-mark-label,
  .qa-sheet--mark .qa-mark-body > .qa-mark-note           { grid-column: 1; }
  .qa-sheet--mark .qa-mark-body > .qa-mark-selected,
  .qa-sheet--mark .qa-mark-body > .qa-mark-search,
  .qa-sheet--mark .qa-mark-body > .qa-mark-all-head,
  .qa-sheet--mark .qa-mark-body > .qa-mark-chips--all     { grid-column: 2; }
```

with:

```css
  .qa-sheet--mark .qa-mark-body > .qa-mark-label,
  .qa-sheet--mark .qa-mark-body > .qa-mark-note,
  .qa-sheet--mark .qa-mark-body > .qa-mark-selected       { grid-column: 1; }
  .qa-sheet--mark .qa-mark-body > .qa-mark-search,
  .qa-sheet--mark .qa-mark-body > .qa-mark-all-head,
  .qa-sheet--mark .qa-mark-body > .qa-mark-chips--all     { grid-column: 2; }
```

### 2.2 — Update the responsive-tokens test

- [ ] **Step 2: Update the assertion in `tests/unit/core/responsive-tokens.test.js`**

Open `tests/unit/core/responsive-tokens.test.js`. Locate the test *"at desktop, mark-body left column hosts quote + note; right hosts tags"* (around line 171). Replace the assertion block:

```javascript
    const hit = blocks.find(b =>
      /\.qa-mark-quote[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-note[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-selected[^{]*\{[^}]*grid-column:\s*2/.test(b[1])
    )
    expect(hit, 'expected quote+note in col 1 and selected tags in col 2').toBeDefined()
```

with:

```javascript
    const hit = blocks.find(b =>
      /\.qa-mark-note[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-selected[^{]*\{[^}]*grid-column:\s*1/.test(b[1]) &&
      /\.qa-mark-chips--all[^{]*\{[^}]*grid-column:\s*2/.test(b[1])
    )
    expect(hit, 'expected note+selected pills in col 1 and all-tags chips in col 2').toBeDefined()
```

Also update the test title on the preceding line from *'at desktop, mark-body left column hosts quote + note; right hosts tags'* to *'at desktop, mark-body left column hosts note + selected pills; right hosts all-tags'*.

### 2.3 — Build + test + Playwright verification

- [ ] **Step 3: Build + test**

```bash
pnpm run build && pnpm run test:run
```

Expected: clean build; all tests pass.

- [ ] **Step 4: Playwright at 1440×900**

```js
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `async () => {
  const mod = await import('/src/marks/editor.js');
  await mod.openEditor('1:1');
  await new Promise(r => setTimeout(r, 400));

  // Click first all-tags chip to select one (so .qa-mark-selected is populated)
  const firstAllChip = document.querySelector('.qa-mark-chips--all .qa-mark-chip');
  if (firstAllChip) firstAllChip.click();
  await new Promise(r => setTimeout(r, 200));

  const selected = document.querySelector('.qa-mark-selected');
  const note     = document.querySelector('.qa-mark-note');
  const allHead  = document.querySelector('.qa-mark-all-head');
  return {
    selectedCol: getComputedStyle(selected).gridColumnStart,
    noteCol:     getComputedStyle(note).gridColumnStart,
    allHeadCol:  getComputedStyle(allHead).gridColumnStart,
  };
}` })
```

Expected: `selectedCol === '1'`, `noteCol === '1'`, `allHeadCol === '2'`.

- [ ] **Step 5: Mobile regression at 375×667**

```js
await browser_resize({ width: 375, height: 667 })
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `async () => {
  const mod = await import('/src/marks/editor.js');
  await mod.openEditor('1:1');
  await new Promise(r => setTimeout(r, 400));
  const body = document.querySelector('.qa-mark-body');
  return { display: getComputedStyle(body).display };
}` })
```

Expected: `display` is `block` or `flex` (not `grid`) — mobile retains the stacked layout.

### 2.4 — Cleanup + commit

- [ ] **Step 6: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected files:
- `src/core/theme.css`
- `tests/unit/core/responsive-tokens.test.js`

```bash
git add src/core/theme.css tests/unit/core/responsive-tokens.test.js
git commit -m "$(cat <<'EOF'
feat(desktop): rebalance mark editor — selected pills in left col

Previously the 2-col desktop layout put the label + note in col 1 and
all tag UI in col 2, leaving a lot of empty space under the 96px note.
Moving .qa-mark-selected (the currently-selected tag pills) into col 1
fills that space with a natural grouping: note + what-you-chose on
the left, tag search + all-tags list on the right. JS DOM order
unchanged; mobile layout unaffected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 · Review hub refactor — single-column, de-duped, multi-tag OR filter, chip bar

**Cluster rationale:** This is the largest unit. `renderTagGrouped` / `renderGrouped` / `renderFlat` all collapse to one flat renderer; the rail gains multi-select state; a new chip bar is added; the 2-col card grid is dropped. Splitting would leave the app in a broken intermediate state.

**Files:**
- Modify: `src/review/hub.js`
- Modify: `src/core/theme.css`

### 3.1 — Drop the 2-col card grid + keep container styling

- [ ] **Step 1: Edit the desktop review-layout CSS block in `src/core/theme.css`**

Find the desktop review rail block (inserted by the prior redesign, around line 2557, inside `@media (min-width: 1180px)`). Locate:

```css
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
```

Replace with:

```css
  .qa-review-main { min-width: 0; }
  .qa-review-card-list { display: block; }
```

(The flat renderer no longer emits `.qa-review-tag-header` or `.qa-review-surah-header`, so those rules can go.)

- [ ] **Step 2: Add chip bar CSS (also inside the same `@media (min-width: 1180px)` block)**

After the `.qa-review-card-list` rule above, append:

```css
  .qa-review-filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--qa-ambient-border);
    font-size: var(--qa-text-size-meta);
  }
  .qa-review-filter-bar-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-muted);
    font-weight: 700;
    margin-right: 4px;
  }
  .qa-review-filter-bar .qa-review-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px 4px 10px;
    border-radius: 999px;
    background: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
  }
  .qa-review-filter-bar .qa-review-filter-chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .qa-review-filter-bar .qa-review-filter-chip button {
    margin-left: 4px;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0 2px;
    line-height: 1;
    opacity: 0.7;
  }
  .qa-review-filter-bar .qa-review-filter-chip button:hover { opacity: 1; }
  .qa-review-filter-bar-clear {
    margin-left: auto;
    border: none;
    background: transparent;
    color: var(--qa-ambient-muted);
    cursor: pointer;
    font-size: 0.8125rem;
    text-decoration: underline;
  }
```

### 3.2 — Refactor `src/review/hub.js`

- [ ] **Step 3: Add multi-tag state, change rail to use it**

Open `src/review/hub.js`. Locate the module-level state at the top (around lines 20–29). Replace:

```javascript
let _railActiveGroup = null
```

with:

```javascript
let _railActiveGroup = null     // single-select (surah/date modes only)
let _railActiveTags = new Set() // OR-multi-select (tag mode only)
```

- [ ] **Step 4: Reset both on init and on cleanup**

In `init()` (line 33+), after `_openEditor = openEditor || null` (line 39), add:

```javascript
  _railActiveTags = new Set()
  _railActiveGroup = null
```

In the cleanup returned function (line 95–107), add `_railActiveTags = new Set()` next to the existing `_railActiveGroup = null`. So the cleanup block becomes:

```javascript
  return () => {
    if (unsubSyncUpdate) { unsubSyncUpdate(); unsubSyncUpdate = null }
    if (unsubVisibilityVisible) { unsubVisibilityVisible(); unsubVisibilityVisible = null }
    _openEditor = null
    _railActiveGroup = null
    _railActiveTags = new Set()
    clearUndoToast()
    const mc = document.getElementById('main-content')
    if (mc) { mc.textContent = '' }
    currentState = null
    allMarks = []
    sortedMarks = []
    filteredMarks = []
    displayedCount = 0
  }
```

- [ ] **Step 5: Replace the three group renderers with a single flat renderer**

In `src/review/hub.js`, locate `renderTagGrouped` (line ~746), `renderGrouped` (line ~822), and `renderFlat` (line ~851). Delete all three functions. Replace with a single:

```javascript
/**
 * Render the mark cards as a flat, unique, single-column list sorted by
 * updatedAt (already sorted upstream). Each mark appears exactly once.
 * @param {HTMLElement} container
 * @param {Array} marks
 */
function renderCardList(container, marks) {
  const fragment = document.createDocumentFragment()
  for (const mark of marks) {
    fragment.appendChild(renderMarkCard(mark, null))
  }
  container.appendChild(fragment)
}
```

- [ ] **Step 6: Replace the three branches in `render()` with a single call**

In `render()` (line ~318), locate the group-by dispatch block (around lines 384–390):

```javascript
  // Render synchronously first
  if (currentState.groupBy === 'tag') {
    renderTagGrouped(cardList, pageMarks)
  } else if (currentState.groupBy === 'surah') {
    renderGrouped(cardList, pageMarks)
  } else {
    renderFlat(cardList, pageMarks)
  }
```

Replace with:

```javascript
  // Render synchronously first — flat, unique, single-column
  renderCardList(cardList, pageMarks)
```

- [ ] **Step 7: Apply rail tag-set filter in `render()`**

In `render()`, find the existing rail filter block (around lines 330–343). Replace:

```javascript
  // Apply rail active-group filter (desktop only)
  if (isDesktop && _railActiveGroup !== null) {
    if (currentState.groupBy === 'tag') {
      filteredMarks = filteredMarks.filter(m => m.tags.includes(_railActiveGroup))
    } else if (currentState.groupBy === 'surah') {
      const surahNum = parseInt(_railActiveGroup, 10)
      filteredMarks = filteredMarks.filter(m => parseInt(m.verseKey.split(':')[0], 10) === surahNum)
    } else {
      filteredMarks = filteredMarks.filter(m => {
        const d = m.createdAt ? new Date(m.createdAt) : null
        if (!d) return false
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return ym === _railActiveGroup
      })
    }
  }
```

with:

```javascript
  // Apply rail filters (desktop only)
  if (isDesktop) {
    if (currentState.groupBy === 'tag' && _railActiveTags.size > 0) {
      filteredMarks = filteredMarks.filter(m => m.tags.some(t => _railActiveTags.has(t)))
    } else if (currentState.groupBy === 'surah' && _railActiveGroup !== null) {
      const surahNum = parseInt(_railActiveGroup, 10)
      filteredMarks = filteredMarks.filter(m => parseInt(m.verseKey.split(':')[0], 10) === surahNum)
    } else if (currentState.groupBy === 'flat' && _railActiveGroup !== null) {
      filteredMarks = filteredMarks.filter(m => {
        const d = m.createdAt ? new Date(m.createdAt) : null
        if (!d) return false
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return ym === _railActiveGroup
      })
    }
  }
```

- [ ] **Step 8: Insert chip bar rendering before the card list**

In `render()`, locate the block that creates `cardList` (around line 376). Just before the `const cardList = ...` line, insert the chip bar block:

```javascript
  // Chip bar — tag mode with active multi-select
  if (isDesktop && currentState.groupBy === 'tag' && _railActiveTags.size > 0) {
    const bar = document.createElement('div')
    bar.className = 'qa-review-filter-bar'

    const label = document.createElement('span')
    label.className = 'qa-review-filter-bar-label'
    label.textContent = 'Filtering by'
    bar.appendChild(label)

    for (const tag of _railActiveTags) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      const dot = document.createElement('span')
      dot.className = 'qa-review-filter-chip-dot'
      dot.style.backgroundColor = getColorForTag(tag)
      chip.appendChild(dot)
      chip.appendChild(document.createTextNode(tag))
      const x = document.createElement('button')
      x.type = 'button'
      x.textContent = '\u00D7' // ×
      x.setAttribute('aria-label', `Remove ${tag} filter`)
      x.addEventListener('click', () => {
        _railActiveTags.delete(tag)
        const mc = document.getElementById('main-content')
        if (mc) render(mc)
      })
      chip.appendChild(x)
      bar.appendChild(chip)
    }

    const clearAll = document.createElement('button')
    clearAll.type = 'button'
    clearAll.className = 'qa-review-filter-bar-clear'
    clearAll.textContent = 'Clear all'
    clearAll.addEventListener('click', () => {
      _railActiveTags = new Set()
      const mc = document.getElementById('main-content')
      if (mc) render(mc)
    })
    bar.appendChild(clearAll)

    cardHost.appendChild(bar)
  }
```

(Place this block after `renderControls(cardHost)` line and before `const cardList = ...`.)

- [ ] **Step 9: Update the rail row click handler for tag mode**

In `buildRail()` (around lines 475–540), locate the rail row click handler:

```javascript
    row.addEventListener('click', () => {
      _railActiveGroup = _railActiveGroup === bucket.key ? null : bucket.key
      const mc = document.getElementById('main-content')
      if (mc) render(mc)
    })
```

Replace with:

```javascript
    row.addEventListener('click', () => {
      if (currentState.groupBy === 'tag') {
        if (_railActiveTags.has(bucket.key)) {
          _railActiveTags.delete(bucket.key)
        } else {
          _railActiveTags.add(bucket.key)
        }
      } else {
        _railActiveGroup = _railActiveGroup === bucket.key ? null : bucket.key
      }
      const mc = document.getElementById('main-content')
      if (mc) render(mc)
    })
```

- [ ] **Step 10: Reflect multi-select in the `--on` class for tag mode**

Still in `buildRail`, locate the rail row class assignment:

```javascript
    row.className = 'qa-review-rail-row' + (_railActiveGroup === bucket.key ? ' qa-review-rail-row--on' : '')
```

Replace with:

```javascript
    const isOn = currentState.groupBy === 'tag'
      ? _railActiveTags.has(bucket.key)
      : _railActiveGroup === bucket.key
    row.className = 'qa-review-rail-row' + (isOn ? ' qa-review-rail-row--on' : '')
```

- [ ] **Step 11: Update the group-by seg click handler to reset both states**

Still in `buildRail`, locate the group-by seg button click handler (around line 460):

```javascript
    btn.addEventListener('click', () => {
      currentState.groupBy = key
      _railActiveGroup = null
      saveState(currentState).catch(() => {})
      const mc = document.getElementById('main-content')
      if (mc) render(mc)
    })
```

Replace with:

```javascript
    btn.addEventListener('click', () => {
      currentState.groupBy = key
      _railActiveGroup = null
      _railActiveTags = new Set()
      saveState(currentState).catch(() => {})
      const mc = document.getElementById('main-content')
      if (mc) render(mc)
    })
```

### 3.3 — Update existing unit tests

- [ ] **Step 12: Update `tests/unit/review/hub.test.js` for the new behavior**

Run:

```bash
pnpm exec vitest run tests/unit/review/hub.test.js 2>&1 | tail -40
```

Expected failures (to be fixed):
- *"renders surah headers in surah-grouped view"* — headers no longer rendered.
- *"renders tag headers in tag-grouped mode (default)"* — headers no longer rendered.
- *"renders surah sub-headers within tag groups"* — no grouping at all.
- *"multi-tagged marks appear under each relevant tag group"* — this is now the opposite: each mark appears **once**.

For the failing tests, update them to reflect the new de-duplicated flat model. Example replacements (adjust exact lines as they appear in the test file):

```javascript
it('renders each mark exactly once regardless of tag count', async () => {
  // Seed a mark with two tags
  await seedMark({ verseKey: '2:255', tags: ['reflect', 'core'] })
  await init({}, { openEditor: () => {} })
  const cards = document.querySelectorAll('.qa-review-card[data-mark="2:255"]')
  expect(cards.length).toBe(1)
})

it('does not render .qa-review-surah-header or .qa-review-tag-header', async () => {
  // Seed a couple of marks
  await seedMark({ verseKey: '1:5', tags: ['reflect'] })
  await seedMark({ verseKey: '2:255', tags: ['reflect'] })
  await init({}, { openEditor: () => {} })
  expect(document.querySelectorAll('.qa-review-surah-header').length).toBe(0)
  expect(document.querySelectorAll('.qa-review-tag-header').length).toBe(0)
})
```

Delete any tests that were asserting on the old grouped markup. Keep tests that check sort order, pagination, and tag-chip rendering.

Run again:

```bash
pnpm exec vitest run tests/unit/review/hub.test.js 2>&1 | tail -10
```

Expected: all updated tests pass.

- [ ] **Step 13: Run the full unit test suite**

```bash
pnpm run test:run
```

Expected: all tests pass.

### 3.4 — Playwright verification

- [ ] **Step 14: Restart dev server (if needed) and seed multi-tagged marks**

```bash
kill $(lsof -ti:5173) 2>/dev/null
pnpm run dev
```

Wait 3s.

Playwright MCP sequence:

```js
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

// Seed 4 marks; one is multi-tagged
await browser_evaluate({ function: `async () => {
  const store = await import('/src/marks/store.js');
  await store.save('1:5',   ['reflect'], '');
  await store.save('2:255', ['reflect', 'core-theology'], 'Ayat al-Kursi');
  await store.save('67:1',  ['reflect', 'protection'], '');
  await store.save('93:11', ['gratitude'], '');
  return 'seeded';
}` })
```

- [ ] **Step 15: Verify de-duplication + single-col + rail layout**

```js
await browser_navigate({ url: 'http://localhost:5173/#/review' })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 800))` })

await browser_evaluate({ function: `() => {
  const layout = document.querySelector('.qa-review-layout');
  const rails = document.querySelectorAll('.qa-review-rail');
  const cards = document.querySelectorAll('.qa-review-card');
  const cardList = document.querySelector('.qa-review-card-list');
  const headers = document.querySelectorAll('.qa-review-surah-header, .qa-review-tag-header');
  return {
    layoutExists: !!layout,
    railCount: rails.length,
    totalCards: cards.length,
    uniqueCardKeys: new Set([...cards].map(c => c.getAttribute('data-mark'))).size,
    cardListDisplay: cardList ? getComputedStyle(cardList).display : null,
    cardListCols:    cardList ? getComputedStyle(cardList).gridTemplateColumns : null,
    headerCount: headers.length,
  };
}` })
```

Expected:
- `layoutExists: true`
- `railCount: 1` (only ever 1 rail on desktop)
- `totalCards: 4` (the 4 seeded marks — no duplicates)
- `uniqueCardKeys: 4` (matches totalCards)
- `cardListDisplay: 'block'`, `cardListCols: 'none'`
- `headerCount: 0`

- [ ] **Step 16: Multi-tag OR + chip bar**

```js
await browser_evaluate({ function: `async () => {
  // Click two rail tag rows
  const rows = document.querySelectorAll('.qa-review-rail-row');
  const byLabel = {};
  for (const r of rows) {
    const label = r.querySelector('span:not(.qa-review-rail-dot):not(.qa-review-rail-count)')?.textContent?.trim();
    byLabel[label] = r;
  }
  byLabel['reflect'].click();
  await new Promise(r => setTimeout(r, 200));
  byLabel['gratitude'].click();
  await new Promise(r => setTimeout(r, 200));

  const bar = document.querySelector('.qa-review-filter-bar');
  const chips = bar ? bar.querySelectorAll('.qa-review-filter-chip') : [];
  const cards = document.querySelectorAll('.qa-review-card');
  const railOnCount = document.querySelectorAll('.qa-review-rail-row--on').length;
  return {
    barExists: !!bar,
    chipCount: chips.length,
    cardCount: cards.length,
    railOnCount,
  };
}` })
```

Expected:
- `barExists: true`
- `chipCount: 2`
- `cardCount: 4` (all 4 marks — `reflect` tags are on 3 marks, `gratitude` tag is on 1, union = 4)
- `railOnCount: 2`

- [ ] **Step 17: Chip × removes one, Clear all empties**

```js
await browser_evaluate({ function: `async () => {
  // Click × on the first chip
  const firstChipX = document.querySelector('.qa-review-filter-bar .qa-review-filter-chip button');
  firstChipX.click();
  await new Promise(r => setTimeout(r, 200));
  const after1 = document.querySelectorAll('.qa-review-filter-chip').length;

  // Click Clear all
  const clearAll = document.querySelector('.qa-review-filter-bar-clear');
  if (clearAll) clearAll.click();
  await new Promise(r => setTimeout(r, 200));
  const barExists = !!document.querySelector('.qa-review-filter-bar');
  const railOnCount = document.querySelectorAll('.qa-review-rail-row--on').length;
  return { after1, barExistsAfterClear: barExists, railOnCount };
}` })
```

Expected: `after1 === 1`, `barExistsAfterClear: false`, `railOnCount: 0`.

- [ ] **Step 18: Mobile regression at 375×667**

```js
await browser_resize({ width: 375, height: 667 })
await browser_navigate({ url: 'http://localhost:5173/#/review' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `() => {
  const layout = document.querySelector('.qa-review-layout');
  const bar = document.querySelector('.qa-review-filter-bar');
  const controls = document.querySelector('.qa-review-controls');
  const cards = document.querySelectorAll('.qa-review-card');
  return {
    layoutExists: !!layout,
    chipBarExists: !!bar,
    controlsDisplay: controls ? getComputedStyle(controls).display : 'not-present',
    cardCount: cards.length,
  };
}` })
```

Expected: `layoutExists: false`, `chipBarExists: false`, `controlsDisplay: 'grid'` or similar (not none), `cardCount: 4`.

### 3.5 — Cleanup + commit

- [ ] **Step 19: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected files:
- `src/review/hub.js`
- `src/core/theme.css`
- `tests/unit/review/hub.test.js`

```bash
git add src/review/hub.js src/core/theme.css tests/unit/review/hub.test.js
git commit -m "$(cat <<'EOF'
refactor(review): single-column de-duped cards + multi-tag OR filter + chip bar

- renderTagGrouped / renderGrouped / renderFlat collapsed into a single
  renderCardList — each mark renders exactly once regardless of tag
  count (fixes duplication of multi-tagged marks)
- 2-col card grid at desktop removed; cards flow single-column and
  fill the main column width for comfortable reading
- Rail filter: tag mode now supports OR multi-select via _railActiveTags
  (Set); surah/date modes remain single-select
- Chip bar above card list shows active tag filters with × and Clear all;
  rendered only in tag mode with non-empty _railActiveTags
- Group-by seg click clears both rail filter states

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 · FVR desktop centering (wrap in `.qa-fvr-layout`)

**Cluster rationale:** FVR header is already `max-width: 720px; margin: 0 auto`, but the cards below inherit full mainContent width. Wrapping both in `.qa-fvr-layout` restores horizontal centering at all viewports, not just desktop. One JS edit + one CSS deduplication.

**Files:**
- Modify: `src/review/hub.js`
- Modify: `src/core/theme.css`

### 4.1 — JS: wrap FVR content in `.qa-fvr-layout`

- [ ] **Step 1: Create the layout wrapper in `initTagDeepLink`**

Open `src/review/hub.js`, locate `initTagDeepLink` (line ~116). Find the tail section (around lines 158–161):

```javascript
  renderFvrHeader(container, tag, marks)
  render(container)
  setInitialFocus()
  emit(Events.REVIEW_OPEN)
```

Replace with:

```javascript
  container.textContent = ''
  const layout = document.createElement('div')
  layout.className = 'qa-fvr-layout'
  container.appendChild(layout)

  renderFvrHeader(layout, tag, marks)
  render(layout)
  setInitialFocus()
  emit(Events.REVIEW_OPEN)
```

- [ ] **Step 2: Verify `renderFvrHeader` already clears its parent**

In `renderFvrHeader` (line ~164), the first line is `container.textContent = ''`. Since we now pass `layout` (empty fresh div), this is harmless — leave it. But now `container` in the function is the layout, not mainContent, so the header appends correctly into the layout.

- [ ] **Step 3: Update `render()` to handle the FVR layout**

In `render()` (line ~318), locate the isFvr branch — the current code does NOT clear when FVR, relying on `renderFvrHeader` to have cleared:

```javascript
  if (!isFvr) {
    container.textContent = ''
  }
```

Leave this unchanged — FVR's header was already placed by the caller (`initTagDeepLink`) into the layout. `render(layout)` doesn't clear, and appends cards to the layout.

Also verify that the `if (isDesktop) { ... }` block (around line 358) doesn't create a new `.qa-review-layout` inside the FVR layout — it's gated by `isDesktop = !isFvr && ...`, so FVR never triggers it. Good.

### 4.2 — CSS: collapse the two `.qa-fvr-layout` rules

- [ ] **Step 4: Remove the desktop-only duplicate**

In `src/core/theme.css`, locate the `@media (min-width: 1180px)` block that only contains `.qa-fvr-layout` (around lines 2621–2627):

```css
/* FVR keeps its existing centered no-rail layout at desktop */
@media (min-width: 1180px) {
  .qa-fvr-layout {
    max-width: 720px;
    margin: 0 auto;
  }
}
```

Delete that block entirely.

- [ ] **Step 5: Add a top-level rule instead**

Just above the `/* FVR header */` comment (around line 2629), add:

```css
/* FVR layout — centered at all viewports, header + cards align to 720px */
.qa-fvr-layout {
  max-width: 720px;
  margin: 0 auto;
}
```

### 4.3 — Build + test + Playwright

- [ ] **Step 6: Build + test**

```bash
pnpm run build && pnpm run test:run
```

Expected: clean.

- [ ] **Step 7: Playwright at 1440×900**

```js
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/#/t/reflect' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `() => {
  const layout = document.querySelector('.qa-fvr-layout');
  if (!layout) return { layoutExists: false };
  const r = layout.getBoundingClientRect();
  const vw = window.innerWidth;
  const header = document.querySelector('.qa-fvr-header');
  const cards = document.querySelectorAll('.qa-review-card');
  const firstCard = cards[0]?.getBoundingClientRect();
  return {
    layoutExists: true,
    width: Math.round(r.width),
    leftGap: Math.round(r.left),
    rightGap: Math.round(vw - r.right),
    headerInsideLayout: !!header && layout.contains(header),
    cardCount: cards.length,
    firstCardLeft: firstCard ? Math.round(firstCard.left) : null,
    firstCardRight: firstCard ? Math.round(vw - firstCard.right) : null,
  };
}` })
```

Expected: `width: 720`, `leftGap === rightGap` within 2px, `headerInsideLayout: true`, `firstCardLeft === firstCardRight` within 2px.

- [ ] **Step 8: Mobile regression at 375×667**

```js
await browser_resize({ width: 375, height: 667 })
await browser_navigate({ url: 'http://localhost:5173/#/t/reflect' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `() => {
  const layout = document.querySelector('.qa-fvr-layout');
  const r = layout.getBoundingClientRect();
  return { width: Math.round(r.width), viewport: window.innerWidth };
}` })
```

Expected: `width` is close to 375 (full viewport — max-width:720 doesn't constrain anything at 375).

### 4.4 — Cleanup + commit

- [ ] **Step 9: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected files: `src/review/hub.js`, `src/core/theme.css`.

```bash
git add src/review/hub.js src/core/theme.css
git commit -m "$(cat <<'EOF'
fix(review): FVR wraps in .qa-fvr-layout — desktop centering restored

initTagDeepLink now places the FVR header and card list inside a
.qa-fvr-layout container. The desktop-only max-width rule moves to a
top-level .qa-fvr-layout selector — behavior at <720px is unchanged
(max-width only activates when viewport is wider than 720).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 · Diagnose and fix double-rail render

**Cluster rationale:** The user reported seeing two rails render in the review hub. After Task 3's refactor the render paths are simpler; Task 5 empirically reproduces the bug against the new code and ships a guard regardless of root cause.

**Files:**
- Modify: `src/review/hub.js` (probably — confirm by diagnosis)

### 5.1 — Empirical reproduction

- [ ] **Step 1: Restart dev server; open review hub at 1440×900**

```bash
kill $(lsof -ti:5173) 2>/dev/null
pnpm run dev
```

Wait 3s.

```js
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

// Seed marks if needed (may already exist from Task 3 testing)
await browser_evaluate({ function: `async () => {
  const store = await import('/src/marks/store.js');
  await store.save('1:5', ['reflect'], '');
  await store.save('2:255', ['reflect', 'core-theology'], '');
  return 'ok';
}` })

await browser_navigate({ url: 'http://localhost:5173/#/review' })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 800))` })

await browser_evaluate({ function: `() => document.querySelectorAll('.qa-review-rail').length` })
```

Expected baseline: `1`. Record the result.

- [ ] **Step 2: Trigger each rerender path and recount**

```js
// Click a rail tag row
await browser_evaluate({ function: `() => document.querySelector('.qa-review-rail-row').click()` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 300))` })
const countA = await browser_evaluate({ function: `() => document.querySelectorAll('.qa-review-rail').length` })

// Click a group-by seg button
await browser_evaluate({ function: `() => {
  const btns = document.querySelectorAll('.qa-review-rail .qa-review-seg-item');
  btns[1].click();
}` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 300))` })
const countB = await browser_evaluate({ function: `() => document.querySelectorAll('.qa-review-rail').length` })

// Synthetic SYNC_UPDATE_RECEIVED emit
await browser_evaluate({ function: `async () => {
  const ev = await import('/src/core/events.js');
  const C = await import('/src/core/constants.js');
  ev.emit(C.Events.SYNC_UPDATE_RECEIVED, {});
  await new Promise(r => setTimeout(r, 500));
}` })
const countC = await browser_evaluate({ function: `() => document.querySelectorAll('.qa-review-rail').length` })

// Navigate away + back
await browser_navigate({ url: 'http://localhost:5173/#/s/1' })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 400))` })
await browser_navigate({ url: 'http://localhost:5173/#/review' })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 800))` })
const countD = await browser_evaluate({ function: `() => document.querySelectorAll('.qa-review-rail').length` })
```

Record all four counts.

### 5.2 — Interpret

- [ ] **Step 3: Interpret counts**

- If every count is `1` → bug was a Task 3 side effect, no further work needed. Skip to 5.4.
- If any count > 1 → root cause is likely an event-driven re-entry. Add the guard in 5.3.

### 5.3 — Ship the guard (only if 5.2 found a case > 1)

- [ ] **Step 4: Add `_renderToken` guard in `src/review/hub.js`**

At the top of the module (after `let _railActiveTags = new Set()`), add:

```javascript
let _renderToken = 0
```

In `render(container)`, at the very first line, capture the token:

```javascript
function render(container) {
  const myToken = ++_renderToken
```

Before each `container.appendChild(layout)` / `container.appendChild(cardList)` / similar DOM mutation that appends the main structural parent, add a bail-out if the token has changed:

```javascript
  if (myToken !== _renderToken) { return }
```

Specifically, add the bail-out:
1. After `container.textContent = ''` (so if two renders queue, the later one wins cleanly).
2. Before `container.appendChild(layout)` (desktop branch).
3. Before the chip bar append.
4. Before `renderCardList(cardList, pageMarks)`.

Also: for the async `loadVerseContentBackground` call, capture `myToken` in the closure and bail if it doesn't match before mutating the DOM.

- [ ] **Step 5: Re-run 5.1 with the guard in place**

Repeat all four scenarios from 5.1. All counts must equal `1`.

### 5.4 — Cleanup + commit (if any change)

- [ ] **Step 6: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

If no file changed (bug was a Task 3 side effect), skip this commit entirely — just document the finding in the PR description. Otherwise:

```bash
git add src/review/hub.js
git commit -m "$(cat <<'EOF'
fix(review): guard render against concurrent re-entry

A _renderToken counter ensures that only the latest render() call
commits DOM mutations; stale in-flight renders bail out before
appending a second .qa-review-layout. Root cause: <short description
from 5.2 interpretation>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(If Task 5 finds nothing to fix, it ends here with no commit — that's fine.)

---

## Task 6 · Onboarding responsive desktop scale-up

**Cluster rationale:** Pure CSS. Adds tablet + desktop media-query blocks that scale up the wordmark, hero, blessing, headline, lede, and container. Mobile rules untouched. Independent from Task 7 (shortcuts screen).

**Files:**
- Modify: `src/core/theme.css`

### 6.1 — Append responsive blocks

- [ ] **Step 1: Find the onboarding CSS section in `src/core/theme.css`**

Run:

```bash
grep -n "qa-onboarding\|qa-onb-page\|qa-onb-hero\|qa-onb-mark" src/core/theme.css | head -10
```

The mobile rules start around line 2682 (`.qa-onboarding { max-width: 420px; ...`).

- [ ] **Step 2: Find the last onboarding CSS rule before the next section**

Onboarding ends before the "Command sheet" or next section header. Grep for the section boundary:

```bash
grep -n "qa-onb-\|^/\* ====" src/core/theme.css | head -60
```

Identify the line immediately after the last `.qa-onb-*` rule. Insert the responsive blocks there.

- [ ] **Step 3: Append tablet + desktop blocks**

Append (after the last onboarding rule, before the next section comment):

```css
/* Onboarding — tablet scale-up */
@media (min-width: 768px) {
  .qa-onboarding {
    max-width: 560px;
    padding: 40px 32px 56px;
  }
  .qa-onb-mark { font-size: 3rem; }
  .qa-onb-blessing { font-size: 0.9375rem; max-width: 360px; }
  .qa-onb-verse { font-size: 1.0625rem; }
  .qa-onb-headline { font-size: 2rem; }
  .qa-onb-lede { font-size: 0.9375rem; }
}

/* Onboarding — desktop scale-up */
@media (min-width: 1180px) {
  .qa-onboarding {
    max-width: 680px;
    padding: 64px 48px 72px;
  }
  .qa-onb-page { min-height: 60vh; }
  .qa-onb-mark { font-size: 3.75rem; }
  .qa-onb-tag { font-size: 0.75rem; }
  .qa-onb-blessing { font-size: 1rem; }
  .qa-onb-verse { font-size: 1.25rem; }
  .qa-onb-headline { font-size: 2.5rem; line-height: 1.2; }
  .qa-onb-lede {
    font-size: 1rem;
    max-width: 520px;
    margin-inline: auto;
  }
  .qa-onb-swatches { gap: 14px; }
}
```

### 6.2 — Playwright verification at three viewports

- [ ] **Step 4: Mobile 375×667 (unchanged baseline)**

```bash
kill $(lsof -ti:5173) 2>/dev/null
pnpm run dev
```

Wait 3s.

```js
await browser_resize({ width: 375, height: 667 })
await browser_navigate({ url: 'http://localhost:5173/' })
await browser_evaluate({ function: `async () => {
  // Clear onboardingComplete so onboarding renders
  const db = await import('/src/core/db.js');
  await db.del('settings', 'onboardingComplete').catch(() => {});
  location.reload(true);
}` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2500))` })

await browser_evaluate({ function: `() => {
  const wrap = document.querySelector('.qa-onboarding');
  const mark = document.querySelector('.qa-onb-mark');
  return {
    wrapMaxWidth: wrap ? getComputedStyle(wrap).maxWidth : null,
    markSize:     mark ? getComputedStyle(mark).fontSize : null,
  };
}` })
```

Expected: `wrapMaxWidth: '420px'`, `markSize: '36px'` (2.25rem × 16).

- [ ] **Step 5: Tablet 768×1024**

```js
await browser_resize({ width: 768, height: 1024 })
await browser_navigate({ url: 'http://localhost:5173/' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `() => {
  const wrap = document.querySelector('.qa-onboarding');
  const mark = document.querySelector('.qa-onb-mark');
  const blessing = document.querySelector('.qa-onb-blessing');
  return {
    wrapMaxWidth: wrap ? getComputedStyle(wrap).maxWidth : null,
    markSize:     mark ? getComputedStyle(mark).fontSize : null,
    blessingSize: blessing ? getComputedStyle(blessing).fontSize : null,
  };
}` })
```

Expected: `wrapMaxWidth: '560px'`, `markSize: '48px'` (3rem), `blessingSize: '15px'`.

- [ ] **Step 6: Desktop 1440×900**

```js
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/' })
await browser_evaluate({ function: `() => { location.reload(true); }` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2000))` })

await browser_evaluate({ function: `() => {
  const wrap = document.querySelector('.qa-onboarding');
  const mark = document.querySelector('.qa-onb-mark');
  const headline = document.querySelector('.qa-onb-headline');
  return {
    wrapMaxWidth: wrap ? getComputedStyle(wrap).maxWidth : null,
    markSize:     mark ? getComputedStyle(mark).fontSize : null,
    headlineSize: headline ? getComputedStyle(headline).fontSize : null,
  };
}` })
```

Expected: `wrapMaxWidth: '680px'`, `markSize: '60px'` (3.75rem).

### 6.3 — Cleanup + commit

- [ ] **Step 7: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected: only `src/core/theme.css` modified.

```bash
git add src/core/theme.css
git commit -m "$(cat <<'EOF'
feat(onboarding): responsive desktop scale-up — larger wordmark, hero, headline

Adds media-query blocks at 768px and 1180px that scale the wordmark
(2.25 → 3 → 3.75rem), the blessing, headline, and lede, plus container
max-width (420 → 560 → 680px) and padding. Mobile rules unchanged;
each viewport rule is additive.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 · Onboarding "Power up" shortcuts screen

**Cluster rationale:** A new screen (number 4) between the existing tags-intro (moves to 5) and translation (stays 3). Needs `screens.js` additions + `index.js` total-count bump + new CSS for `.qa-onb-shortcuts`.

**Files:**
- Modify: `src/onboarding/index.js`
- Modify: `src/onboarding/screens.js`
- Modify: `src/core/theme.css`

### 7.1 — Restructure screen flow

- [ ] **Step 1: Bump screen count in `src/onboarding/index.js`**

Open `src/onboarding/index.js`. Locate the `show` function (line ~31):

```javascript
  const show = async () => {
    while (wrap.firstChild) { wrap.removeChild(wrap.firstChild) }
    await renderScreen(wrap, screen, {
      total: 4,
      onContinue: () => { screen += 1; if (screen > 4) { finish('fatihah') } else { show() } },
      ...
    })
  }
```

Replace `total: 4` → `total: 5` and `if (screen > 4)` → `if (screen > 5)`:

```javascript
  const show = async () => {
    while (wrap.firstChild) { wrap.removeChild(wrap.firstChild) }
    await renderScreen(wrap, screen, {
      total: 5,
      onContinue: () => { screen += 1; if (screen > 5) { finish('fatihah') } else { show() } },
      onSkip: () => { finish('fatihah') },
      onFinishFatihah: () => finish('fatihah'),
      onFinishSurahList: () => finish('surahs'),
    })
  }
```

- [ ] **Step 2: Insert the new screen 4 in `src/onboarding/screens.js`**

Open `src/onboarding/screens.js`. Locate the dispatch in `renderScreen` (lines 22–25):

```javascript
  if (n === 1) { renderWelcome(page, cb) }
  else if (n === 2) { await renderTheme(page, cb) }
  else if (n === 3) { await renderTranslation(page, cb) }
  else { renderTagsIntro(page, cb) }
```

Replace with:

```javascript
  if (n === 1) { renderWelcome(page, cb) }
  else if (n === 2) { await renderTheme(page, cb) }
  else if (n === 3) { await renderTranslation(page, cb) }
  else if (n === 4) { renderShortcuts(page, cb) }
  else { renderTagsIntro(page, cb) }
```

- [ ] **Step 3: Add `renderShortcuts` function**

At the end of `src/onboarding/screens.js`, add:

```javascript
function renderShortcuts(page, cb) {
  const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform)
  const cmd = isMac ? '\u2318' : 'Ctrl' // ⌘

  const headline = document.createElement('h1')
  headline.className = 'qa-onb-headline'
  headline.textContent = 'A few shortcuts'
  page.appendChild(headline)

  const lede = document.createElement('p')
  lede.className = 'qa-onb-lede'
  lede.textContent = 'QuranAtlas is faster than tapping. These work anywhere in the app.'
  page.appendChild(lede)

  const grid = document.createElement('div')
  grid.className = 'qa-onb-shortcuts'

  const rows = [
    { keys: [cmd, 'K'],           desc: 'Search verses, tags, surahs' },
    { keys: [cmd, '\u2191'],      desc: 'Bigger font', aux: [cmd, '\u2193', 'Smaller font'] },
    { keys: ['g', 'r'],           desc: 'Review hub' },
    { keys: ['g', 's'],           desc: 'Surah list' },
    { keys: ['g', ','],           desc: 'Settings' },
    { keys: ['Long-press'],       desc: 'Mark & tag a verse', gesture: true },
  ]

  for (const r of rows) {
    const row = document.createElement('div')
    row.className = 'qa-onb-shortcut-row'

    const kbdWrap = document.createElement('div')
    kbdWrap.className = 'qa-onb-shortcut-keys'
    for (let i = 0; i < r.keys.length; i++) {
      const kbd = document.createElement('kbd')
      kbd.className = 'qa-onb-kbd' + (r.gesture ? ' qa-onb-kbd--gesture' : '')
      kbd.textContent = r.keys[i]
      kbdWrap.appendChild(kbd)
    }
    row.appendChild(kbdWrap)

    const desc = document.createElement('span')
    desc.className = 'qa-onb-shortcut-desc'
    desc.textContent = r.desc
    row.appendChild(desc)

    grid.appendChild(row)
  }

  page.appendChild(grid)

  const cta = document.createElement('button')
  cta.type = 'button'
  cta.className = 'qa-onb-cta qa-onb-cta--primary'
  cta.textContent = 'Continue'
  cta.addEventListener('click', cb.onContinue)

  const row = document.createElement('div')
  row.className = 'qa-onb-cta-row'
  row.appendChild(cta)
  page.appendChild(row)
}
```

### 7.2 — CSS for `.qa-onb-shortcuts`

- [ ] **Step 4: Append the shortcuts CSS**

In `src/core/theme.css`, inside (or right after) the onboarding section, append:

```css
.qa-onb-shortcuts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin: 16px 0 20px;
  text-align: left;
}
.qa-onb-shortcut-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--qa-ambient-parchment);
}
.qa-onb-shortcut-keys {
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
}
.qa-onb-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 2px 8px;
  border: 1px solid var(--qa-ambient-border);
  border-radius: 5px;
  background: var(--qa-ambient-surface);
  color: var(--qa-ambient-kbd-color, var(--qa-ambient-accent));
  font-family: var(--qa-font-ui);
  font-size: 0.75rem;
  font-weight: 600;
}
.qa-onb-kbd--gesture {
  font-weight: 400;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.qa-onb-shortcut-desc { color: var(--qa-ambient-muted); }

@media (min-width: 1180px) {
  .qa-onb-shortcuts {
    grid-template-columns: 1fr 1fr;
    gap: 14px 32px;
  }
  .qa-onb-shortcut-row { font-size: 1rem; }
}
```

### 7.3 — Playwright verification

- [ ] **Step 5: Build + unit tests**

```bash
pnpm run build && pnpm run test:run
```

Expected: clean build, all tests pass. If any onboarding unit test asserts `total: 4`, update to `5` in the test.

- [ ] **Step 6: Desktop 1440×900 — reach shortcuts screen**

```bash
kill $(lsof -ti:5173) 2>/dev/null
pnpm run dev
```

Wait 3s.

```js
await browser_resize({ width: 1440, height: 900 })
await browser_navigate({ url: 'http://localhost:5173/' })
await browser_evaluate({ function: `async () => {
  const db = await import('/src/core/db.js');
  await db.del('settings', 'onboardingComplete').catch(() => {});
  location.reload(true);
}` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2500))` })

// Click through: Welcome → Theme → Translation → Shortcuts (now screen 4)
// Click "Begin" on welcome
await browser_evaluate({ function: `async () => {
  document.querySelector('.qa-onb-cta--primary').click();
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('.qa-onb-cta--primary').click(); // theme "Continue"
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('.qa-onb-cta--primary').click(); // translation "Continue"
  await new Promise(r => setTimeout(r, 400));
}` })

await browser_evaluate({ function: `() => {
  const headline = document.querySelector('.qa-onb-headline');
  const grid = document.querySelector('.qa-onb-shortcuts');
  const rows = document.querySelectorAll('.qa-onb-shortcut-row');
  const dots = document.querySelectorAll('.qa-onb-dot');
  const onDotIdx = [...dots].findIndex(d => d.classList.contains('qa-onb-dot--on'));
  return {
    headlineText: headline?.textContent,
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    rowCount: rows.length,
    dotsTotal: dots.length,
    onDotIdx,
  };
}` })
```

Expected: `headlineText: 'A few shortcuts'`, `gridCols` has 2 tracks, `rowCount >= 6`, `dotsTotal: 5`, `onDotIdx: 3` (zero-based = fourth dot).

- [ ] **Step 7: Mobile 375×667 — shortcuts stacks 1-col**

```js
await browser_resize({ width: 375, height: 667 })
await browser_navigate({ url: 'http://localhost:5173/' })
await browser_evaluate({ function: `async () => {
  const db = await import('/src/core/db.js');
  await db.del('settings', 'onboardingComplete').catch(() => {});
  location.reload(true);
}` })
await browser_evaluate({ function: `() => new Promise(r => setTimeout(r, 2500))` })

await browser_evaluate({ function: `async () => {
  document.querySelector('.qa-onb-cta--primary').click();
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('.qa-onb-cta--primary').click();
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('.qa-onb-cta--primary').click();
  await new Promise(r => setTimeout(r, 400));
  const grid = document.querySelector('.qa-onb-shortcuts');
  return { cols: grid ? getComputedStyle(grid).gridTemplateColumns : null };
}` })
```

Expected: `cols` has 1 track.

- [ ] **Step 8: Finish onboarding → reach Al-Fatihah**

```js
// Still at mobile; click Continue on shortcuts
await browser_evaluate({ function: `async () => {
  document.querySelector('.qa-onb-cta--primary').click();
  await new Promise(r => setTimeout(r, 400));
  // tags-intro screen now; click "Open Al-Fatihah"
  document.querySelector('.qa-onb-cta--primary').click();
  await new Promise(r => setTimeout(r, 500));
  return window.location.hash;
}` })
```

Expected: hash is `#/s/1`.

### 7.4 — Cleanup + commit

- [ ] **Step 9: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected files: `src/onboarding/index.js`, `src/onboarding/screens.js`, `src/core/theme.css`.

```bash
git add src/onboarding/index.js src/onboarding/screens.js src/core/theme.css
git commit -m "$(cat <<'EOF'
feat(onboarding): add Power up shortcuts screen (new screen 4 of 5)

Inserts a new fourth screen between Translation and Tags intro that
teaches the six core shortcuts: ⌘K search, ⌘↑/⌘↓ font size, g r/s/,
navigation chords, and long-press to mark. Mac/Ctrl detection via
navigator.platform. Desktop renders 2-col grid (≥1180px); mobile
stacks 1-col. Total dot count bumps from 4 to 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 · E2E coverage

**Cluster rationale:** One spec file gets the new tests; one existing journey spec gets the onboarding dot-count bump. Kept separate from implementation tasks so regressions are caught on merge.

**Files:**
- Modify: `tests/e2e/desktop-layouts.spec.js`
- Modify: `tests/e2e/journey-a-onboarding.spec.js` (if it hard-codes 4 dots)
- Modify: `tests/e2e/journey-d-settings.spec.js` (if it asserts old font labels)

### 8.1 — Audit existing onboarding + settings specs

- [ ] **Step 1: Find hardcoded counts / labels**

```bash
grep -n "qa-onb-dot\|total: 4\|small\|medium\|large" tests/e2e/journey-a-onboarding.spec.js tests/e2e/journey-d-settings.spec.js
```

Update any hit that references:
- 4 onboarding dots → 5
- `'small' / 'medium' / 'large'` → `'sm' / 'md' / 'lg'`

Apply minimal edits in place.

### 8.2 — Extend `tests/e2e/desktop-layouts.spec.js`

- [ ] **Step 2: Append new desktop tests**

Append to the existing `test.describe('Desktop layouts @desktop', ...)` block:

```javascript
  // -------------------------------------------------------------------------
  // Font preview binds to tokens
  // -------------------------------------------------------------------------

  test('settings font preview scales when slider moves', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')

    await page.evaluate(async () => {
      const mod = await import('/src/settings/panel.js')
      await mod.openSettingsSheet()
    })
    await page.waitForSelector('.qa-font-slider')

    const getArSize = () => page.locator('.qa-font-preview-ar').evaluate(
      el => parseFloat(getComputedStyle(el).fontSize)
    )

    await page.locator('.qa-font-slider').evaluate(el => {
      el.value = '0' // xs
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(200)
    const xsSize = await getArSize()

    await page.locator('.qa-font-slider').evaluate(el => {
      el.value = '4' // xl
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(200)
    const xlSize = await getArSize()

    // xl should be noticeably larger than xs (ratio ~1.73 since 1.3 / 0.75)
    expect(xlSize).toBeGreaterThan(xsSize * 1.5)
  })

  test('settings font preview: English on left, Arabic on right', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')
    await page.evaluate(async () => {
      const mod = await import('/src/settings/panel.js')
      await mod.openSettingsSheet()
    })
    await page.waitForSelector('.qa-font-preview')

    const order = await page.locator('.qa-font-preview').evaluate(
      el => Array.from(el.children).map(c => c.className)
    )
    expect(order).toEqual(['qa-font-preview-en', 'qa-font-preview-ar'])
  })

  // -------------------------------------------------------------------------
  // Mark editor column rebalance
  // -------------------------------------------------------------------------

  test('mark editor: selected pills live in left column at desktop', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')

    await page.evaluate(async () => {
      const mod = await import('/src/marks/editor.js')
      await mod.openEditor('1:1')
    })
    await page.waitForSelector('.qa-sheet--mark')
    await page.waitForTimeout(250)

    // Select a tag to populate .qa-mark-selected
    await page.locator('.qa-mark-chips--all .qa-mark-chip').first().click()
    await page.waitForTimeout(200)

    const cols = await page.evaluate(() => {
      const sel = document.querySelector('.qa-mark-selected')
      const note = document.querySelector('.qa-mark-note')
      const all = document.querySelector('.qa-mark-chips--all')
      return {
        selected: getComputedStyle(sel).gridColumnStart,
        note: getComputedStyle(note).gridColumnStart,
        all: getComputedStyle(all).gridColumnStart,
      }
    })
    expect(cols.selected).toBe('1')
    expect(cols.note).toBe('1')
    expect(cols.all).toBe('2')
  })

  // -------------------------------------------------------------------------
  // Review hub: single-column, de-duped, multi-tag OR filter
  // -------------------------------------------------------------------------

  test('review hub: multi-tagged mark renders exactly once', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
    ])
    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-card')

    const count = await page.locator('.qa-review-card[data-mark="2:255"]').count()
    expect(count).toBe(1)

    const total = await page.locator('.qa-review-card').count()
    expect(total).toBe(2)
  })

  test('review hub: card list is single-column at desktop (no 2-col grid)', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [{ verseKey: '1:5', tags: ['reflect'], note: '' }])
    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-card-list')

    const cols = await page.locator('.qa-review-card-list').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(cols).toBe('none')
  })

  test('review hub: multi-tag OR filter + chip bar + clear', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
      { verseKey: '93:11', tags: ['gratitude'],                note: '' },
    ])
    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-rail-row')

    // Click reflect + gratitude
    await page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first().click()
    await page.locator('.qa-review-rail-row').filter({ hasText: 'gratitude' }).first().click()
    await page.waitForTimeout(300)

    await expect(page.locator('.qa-review-filter-bar')).toBeVisible()
    const chipCount = await page.locator('.qa-review-filter-chip').count()
    expect(chipCount).toBe(2)
    const cardCount = await page.locator('.qa-review-card').count()
    expect(cardCount).toBe(4)

    // Remove one via × button
    await page.locator('.qa-review-filter-chip button').first().click()
    await page.waitForTimeout(200)
    expect(await page.locator('.qa-review-filter-chip').count()).toBe(1)

    // Clear all
    await page.locator('.qa-review-filter-bar-clear').click()
    await page.waitForTimeout(200)
    await expect(page.locator('.qa-review-filter-bar')).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // FVR centering
  // -------------------------------------------------------------------------

  test('FVR layout is centered at 720px max-width at desktop', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [{ verseKey: '2:255', tags: ['reflect'], note: '' }])
    await page.goto('/#/t/reflect')
    await page.waitForSelector('.qa-fvr-layout')

    const geom = await page.locator('.qa-fvr-layout').evaluate(el => {
      const r = el.getBoundingClientRect()
      return {
        width: r.width,
        left: r.left,
        rightGap: window.innerWidth - r.right,
      }
    })
    expect(Math.round(geom.width)).toBe(720)
    expect(Math.abs(geom.left - geom.rightGap)).toBeLessThan(2)
  })

  // -------------------------------------------------------------------------
  // Onboarding at desktop
  // -------------------------------------------------------------------------

  test('onboarding desktop: wordmark and container scale up', async ({ page }) => {
    // Clear onboardingComplete before goto so onboarding renders
    await page.goto('/')
    await page.evaluate(async () => {
      const db = await import('/src/core/db.js')
      await db.del('settings', 'onboardingComplete').catch(() => {})
    })
    await page.goto('/')
    await page.waitForSelector('.qa-onboarding')

    const sizes = await page.evaluate(() => {
      const w = getComputedStyle(document.querySelector('.qa-onboarding')).maxWidth
      const m = getComputedStyle(document.querySelector('.qa-onb-mark')).fontSize
      return { wrap: w, mark: parseFloat(m) }
    })
    expect(sizes.wrap).toBe('680px')
    expect(sizes.mark).toBeGreaterThanOrEqual(60) // 3.75rem
  })

  test('onboarding: shortcuts screen renders 2-col at desktop', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      const db = await import('/src/core/db.js')
      await db.del('settings', 'onboardingComplete').catch(() => {})
    })
    await page.goto('/')
    await page.waitForSelector('.qa-onboarding')

    // Click through welcome → theme → translation
    for (let i = 0; i < 3; i++) {
      await page.locator('.qa-onb-cta--primary').first().click()
      await page.waitForTimeout(300)
    }

    await page.waitForSelector('.qa-onb-shortcuts')
    const cols = await page.locator('.qa-onb-shortcuts').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(cols.split(' ').length).toBe(2)

    const rows = await page.locator('.qa-onb-shortcut-row').count()
    expect(rows).toBeGreaterThanOrEqual(6)
  })
```

- [ ] **Step 3: Verify `seedMarks` is already imported**

At the top of `tests/e2e/desktop-layouts.spec.js`, confirm the import line includes `seedMarks`:

```javascript
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
```

### 8.3 — Run the suite

- [ ] **Step 4: Run desktop-layouts.spec.js**

```bash
pnpm exec playwright test tests/e2e/desktop-layouts.spec.js --project=chromium 2>&1 | tail -30
```

Expected: all tests pass (the pre-existing 4 + the 8 new ones).

- [ ] **Step 5: Run full chromium suite to catch regressions elsewhere**

```bash
pnpm exec playwright test --project=chromium 2>&1 | tail -30
```

Expected: all green.

### 8.4 — Cleanup + commit

- [ ] **Step 6: Clean + commit**

```bash
rm -rf .playwright-mcp test-output
git status --short
```

Expected files: `tests/e2e/desktop-layouts.spec.js` and potentially `tests/e2e/journey-a-onboarding.spec.js` / `journey-d-settings.spec.js`.

```bash
git add tests/
git commit -m "$(cat <<'EOF'
test(e2e): coverage for chip bar, font preview, mark editor balance, onboarding

Adds desktop-layout tests for: font preview binds to tokens and English
sits left / Arabic right; mark editor selected pills in col 1; review
hub single-column cards; multi-tagged mark renders once; multi-tag OR
filter + chip × + Clear all; FVR 720px centered; onboarding desktop
scale-up; shortcuts screen 2-col at desktop. Updates existing specs
for the 5-dot onboarding total and the new font-size tokens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9 · Docs — user-journeys.md updates

**Cluster rationale:** Journeys E, D, and A all need updates for this change. One commit, per CLAUDE.md Rule 1.

**Files:**
- Modify: `docs/context/user-journeys.md`

### 9.1 — Update each affected journey

- [ ] **Step 1: Journey D (Settings) font size note**

Locate Journey D in `docs/context/user-journeys.md` (grep for `"D2\|D3\|font\|Font"`). In whichever sub-journey covers the font slider, rewrite the paragraph to:

> **Font size.** 5-step slider: xs / sm / md / lg / xl (0.75 → 1.3). Preview shows a short Arabic + English line that scales with the slider. Translation renders on the left, Arabic on the right. Keyboard: `⌘↑` (Mac) / `Ctrl+↑` (others) bumps up; `⌘↓` / `Ctrl+↓` bumps down; announced to screen readers. Guarded against focused inputs.

- [ ] **Step 2: Journey E (Reviewing marks) refactor**

Update `E2. Swap grouping` or similar to:

> **E2. Switch rail bucket list.** The "Group by" segment now changes *which bucket list the rail shows*, not how cards are grouped. Cards always render as a flat, unique, single-column list sorted by most-recent update — no duplicates when a mark carries multiple tags.

Add a new sub-journey:

> **E2b. Filter by multiple tags (desktop).** In Tag mode, tap multiple rail rows to accumulate an OR filter. A chip bar appears above the cards showing active tags with `×` to remove each; `Clear all` removes them all. Surah and Date modes remain single-select. Mobile keeps the dropdown controls and single-select behavior.

- [ ] **Step 3: Journey A (Onboarding) — add shortcuts step**

Update the Onboarding flow description to 5 screens:

> Screens: 1) Welcome, 2) Theme, 3) Translation, 4) Shortcuts (new), 5) Tags intro + final CTAs.

Add under Screen 4:

> **A4. Power up.** Teaches the core shortcuts: `⌘K` search; `⌘↑ / ⌘↓` font size; `g r / g s / g ,` navigation chords; long-press to mark a verse. Mac shows `⌘`, non-Mac shows `Ctrl`. Desktop renders 2-col grid; mobile stacks.

- [ ] **Step 4: Add a top-level "Keyboard shortcuts" reference**

At the top of the document (under the intro), add:

> ## Keyboard shortcuts
>
> - `⌘K` / `Ctrl+K` — command sheet (search verses, tags, surahs)
> - `⌘↑ / ⌘↓` / `Ctrl+↑ / ↓` — font size
> - `g r` — review hub
> - `g s` — surah list
> - `g ,` — settings
> - Long-press a verse — open mark editor

- [ ] **Step 5: Commit**

```bash
git add docs/context/user-journeys.md
git commit -m "$(cat <<'EOF'
docs(journeys): review filter model, 5-step font, onboarding shortcuts

- E2 rewritten as "Switch rail bucket list" + new E2b "Filter by multiple
  tags (desktop)" with chip bar + Clear all
- D note on 5-step font slider, preview reorder, and ⌘↑/⌘↓
- Onboarding flow now 5 screens; new A4 "Power up" describes shortcuts
- New top-level "Keyboard shortcuts" section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist

After all 9 tasks complete.

- [ ] **Placeholder scan:** `grep -E "TBD|TODO|FIXME|implement later" docs/superpowers/plans/2026-04-18-desktop-polish.md` returns empty.
- [ ] **Font scale token sweep:** `grep -rn "'small'\|'medium'\|'large'" src/ | grep -v "test\|comment"` — any remaining references should be in the `LEGACY_MAP` only, not in live code paths.
- [ ] **Review hub no-group markup:** `grep -rn "qa-review-surah-header\|qa-review-tag-header" src/` — should return only test code or CSS-cleanup comments. JS should not emit these classes anymore.
- [ ] **Single rail in DOM:** manually at desktop, navigate `/#/review`, run in console: `document.querySelectorAll('.qa-review-rail').length` → always 1.
- [ ] **Onboarding dot count:** `grep "total:" src/onboarding/index.js` → `total: 5`.
- [ ] **Responsive verification on every CSS change:** each task that touched `theme.css` has been Playwright-verified at 375×667, 768×1024 (where relevant), and 1440×900.
- [ ] **Docs updated:** `docs/context/user-journeys.md` mentions chip bar, 5-step slider, `⌘↑/↓` shortcut, and shortcuts screen.
- [ ] **Full regression:** `pnpm run test:run && pnpm exec playwright test --project=chromium` green.

---

## Execution handoff

**Two execution options:**

1. **Inline Execution (recommended, per user feedback)** — Execute tasks in this session using `superpowers:executing-plans`. Each task is a checkpoint; commit at the end of each. Defaults to the main session; no subagent dispatch.

2. **Subagent-Driven** — Dispatch a fresh subagent per task via `superpowers:subagent-driven-development`. Not recommended here: each task clusters multiple related edits in the same 1–3 files; per-task subagent context would mostly duplicate parent context.

**Default: Inline Execution.**
