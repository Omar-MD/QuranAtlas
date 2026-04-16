# Design Tokens Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the ambient-redesign design tokens — semantic tag color map, new seed tag set, and ambient CSS palette variables — as the foundation every later plan consumes, without regressing existing consumers.

**Architecture:** Introduce a new `src/core/tag-colors.js` module holding the 16-tag semantic color map with light/dark variants. Update `src/marks/tags.js` to (a) replace the 5 old seed tags with the 16 new semantic tags and (b) check the semantic map in `getColorForTag` before falling back to the existing hash palette (preserving behavior for user-created custom tags). Add ambient palette CSS custom properties (gold/bronze accent family, sheet radius/shadow) to `src/core/theme.css` under each `[data-theme]` without altering existing `--qa-*` tokens.

**Tech Stack:** Vitest (unit), Vite (bundler), vanilla JS modules, CSS custom properties.

---

## Files

- **Create:** `src/core/tag-colors.js` — semantic tag → {light, dark} hex map + resolver
- **Create:** `tests/unit/core/tag-colors.test.js` — unit tests for resolver
- **Modify:** `src/marks/tags.js` — replace `SEED_TAGS`; make `getColorForTag` consult semantic map first
- **Modify:** `tests/unit/marks/tags.test.js` — update seed-tag expectations; add semantic-tag coverage
- **Modify:** `src/core/theme.css` — add ambient palette vars (`--qa-ambient-*`) under each theme block

---

## Task 1: Semantic tag color module

**Files:**
- Create: `src/core/tag-colors.js`
- Test: `tests/unit/core/tag-colors.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/core/tag-colors.test.js` with this content:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SEMANTIC_TAG_COLORS, SEMANTIC_TAG_LABELS, getSemanticTagColor } from '../../../src/core/tag-colors.js'

describe('core/tag-colors.js', () => {
  afterEach(() => {
    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.theme
    }
  })

  it('exposes all 16 semantic tag labels', () => {
    expect(SEMANTIC_TAG_LABELS).toEqual([
      'mercy', 'gratitude', 'patience', 'reflection',
      'prayer', 'forgiveness', 'tawhid', 'tawakkul',
      'hope', 'justice', 'dunya', 'akhirah',
      'repentance', 'guidance', 'fear', 'knowledge',
    ])
  })

  it('every semantic label has a {light, dark} pair with hex values', () => {
    for (const label of SEMANTIC_TAG_LABELS) {
      const entry = SEMANTIC_TAG_COLORS[label]
      expect(entry, `missing entry for ${label}`).toBeDefined()
      expect(entry.light).toMatch(/^#[0-9a-f]{6}$/i)
      expect(entry.dark).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('spec-approved dark hexes are preserved', () => {
    expect(SEMANTIC_TAG_COLORS.mercy.dark).toBe('#64a078')
    expect(SEMANTIC_TAG_COLORS.gratitude.dark).toBe('#c8a050')
    expect(SEMANTIC_TAG_COLORS.patience.dark).toBe('#6e96b4')
    expect(SEMANTIC_TAG_COLORS.reflection.dark).toBe('#8c82c8')
    expect(SEMANTIC_TAG_COLORS.forgiveness.dark).toBe('#d4a070')
    expect(SEMANTIC_TAG_COLORS.tawhid.dark).toBe('#e8c478')
    expect(SEMANTIC_TAG_COLORS.tawakkul.dark).toBe('#b4826e')
    expect(SEMANTIC_TAG_COLORS.hope.dark).toBe('#c8b46e')
  })

  it('getSemanticTagColor returns dark hex when theme is dark', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(getSemanticTagColor('mercy')).toBe('#64a078')
  })

  it('getSemanticTagColor returns light hex when theme is sepia', () => {
    document.documentElement.dataset.theme = 'sepia'
    const result = getSemanticTagColor('mercy')
    expect(result).toBe(SEMANTIC_TAG_COLORS.mercy.light)
  })

  it('getSemanticTagColor returns light hex when theme is unset (default light)', () => {
    expect(getSemanticTagColor('gratitude')).toBe(SEMANTIC_TAG_COLORS.gratitude.light)
  })

  it('getSemanticTagColor returns null for non-semantic labels', () => {
    expect(getSemanticTagColor('favourite')).toBeNull()
    expect(getSemanticTagColor('')).toBeNull()
    expect(getSemanticTagColor('totally-custom')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/core/tag-colors.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the module**

Create `src/core/tag-colors.js` with this content:

```javascript
/**
 * Semantic tag colors — 16 named Qur'anic-theme tags with {light, dark} hex pairs.
 *
 * Dark values are the spec-approved ambient palette (mockups in
 * .superpowers/brainstorm/39422-1776297701/content/). Light values are WCAG AA
 * derivations of the same hue family (≥4.5:1 contrast on #ffffff / #f3e8cf).
 *
 * Labels here are the curated seed set. Unknown labels (user-created custom tags)
 * fall through to the hash-based palette in src/marks/tags.js — see getColorForTag.
 */

export const SEMANTIC_TAG_COLORS = {
  mercy:       { light: '#2e6b46', dark: '#64a078' },
  gratitude:   { light: '#8a6a20', dark: '#c8a050' },
  patience:    { light: '#2e5a7a', dark: '#6e96b4' },
  reflection:  { light: '#4a3f8a', dark: '#8c82c8' },
  prayer:      { light: '#6b4a16', dark: '#d9b06a' },
  forgiveness: { light: '#8a5028', dark: '#d4a070' },
  tawhid:      { light: '#7a5a1a', dark: '#e8c478' },
  tawakkul:    { light: '#7a4428', dark: '#b4826e' },
  hope:        { light: '#7a6420', dark: '#c8b46e' },
  justice:     { light: '#3a5a3a', dark: '#7ab07a' },
  dunya:       { light: '#5a4a3a', dark: '#a89880' },
  akhirah:     { light: '#3a4870', dark: '#8aa0c4' },
  repentance:  { light: '#6a3a4a', dark: '#c48098' },
  guidance:    { light: '#4a5a2e', dark: '#a8c070' },
  fear:        { light: '#5a3030', dark: '#c08080' },
  knowledge:   { light: '#2e5a6a', dark: '#70a8b4' },
}

export const SEMANTIC_TAG_LABELS = Object.keys(SEMANTIC_TAG_COLORS)

/**
 * Resolve the current theme variant.
 * @returns {'light' | 'dark'}
 */
function getThemeVariant() {
  if (typeof document === 'undefined') return 'light'
  const theme = document.documentElement?.dataset?.theme
  return theme === 'dark' ? 'dark' : 'light'
}

/**
 * Get the semantic color for a named tag, theme-aware.
 * Returns null if the label is not in the curated semantic set — caller should
 * fall back to the hash-based palette.
 *
 * @param {string} label - tag label (case-sensitive, lowercase expected)
 * @returns {string | null} hex color or null if not semantic
 */
export function getSemanticTagColor(label) {
  const entry = SEMANTIC_TAG_COLORS[label]
  if (!entry) return null
  return entry[getThemeVariant()]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run tests/unit/core/tag-colors.test.js`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/tag-colors.js tests/unit/core/tag-colors.test.js
git commit -m "feat(core): add semantic tag color map with theme-aware resolver"
```

---

## Task 2: Replace seed tags and wire semantic-first resolution

**Files:**
- Modify: `src/marks/tags.js`
- Modify: `tests/unit/marks/tags.test.js`

- [ ] **Step 1: Read current seed-tag test expectations**

Run: `pnpm test:run tests/unit/marks/tags.test.js` to see current passing tests. Note which tests assert on the old seed labels (`favourite`, `divine`, `disbelievers`, `ahl al-kitāb`, `hypocrites`). These will need updating.

- [ ] **Step 2: Write the failing tests**

Open `tests/unit/marks/tags.test.js` and replace any test that asserts the old `SEED_TAGS` labels. Add these assertions (merge with existing structure — keep other tests intact):

```javascript
import { describe, it, expect, afterEach } from 'vitest'
import { SEED_TAGS, getSeedTags, getColorForTag } from '../../../src/marks/tags.js'
import { SEMANTIC_TAG_LABELS, SEMANTIC_TAG_COLORS } from '../../../src/core/tag-colors.js'

describe('marks/tags.js — semantic seed set', () => {
  afterEach(() => {
    if (typeof document !== 'undefined') {
      delete document.documentElement.dataset.theme
    }
  })

  it('SEED_TAGS contains the 16 semantic labels in spec order', () => {
    expect(SEED_TAGS.map(s => s.label)).toEqual(SEMANTIC_TAG_LABELS)
  })

  it('getSeedTags returns a fresh copy (no shared references)', () => {
    const a = getSeedTags()
    const b = getSeedTags()
    expect(a).not.toBe(b)
    expect(a[0]).not.toBe(b[0])
    expect(a).toEqual(b)
  })

  it('getColorForTag uses semantic map for a named tag (dark theme)', () => {
    document.documentElement.dataset.theme = 'dark'
    expect(getColorForTag('mercy')).toBe(SEMANTIC_TAG_COLORS.mercy.dark)
    expect(getColorForTag('tawakkul')).toBe(SEMANTIC_TAG_COLORS.tawakkul.dark)
  })

  it('getColorForTag uses semantic map for a named tag (light theme)', () => {
    expect(getColorForTag('gratitude')).toBe(SEMANTIC_TAG_COLORS.gratitude.light)
  })

  it('getColorForTag falls back to hash palette for unknown labels', () => {
    const color = getColorForTag('some-custom-user-tag')
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    // Not a semantic color
    expect(SEMANTIC_TAG_LABELS.includes('some-custom-user-tag')).toBe(false)
  })

  it('getColorForTag returns the same hash color for the same custom label (deterministic)', () => {
    expect(getColorForTag('my-tag')).toBe(getColorForTag('my-tag'))
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:run tests/unit/marks/tags.test.js`
Expected: FAIL — SEED_TAGS still holds the old 5 labels; getColorForTag doesn't consult the semantic map.

- [ ] **Step 4: Update `src/marks/tags.js`**

Replace the `SEED_TAGS` block and the body of `getColorForTag`. Keep everything else intact.

Replace lines that define `SEED_TAGS` and `SEED_SLOT_MAP` with:

```javascript
import { SEMANTIC_TAG_LABELS, getSemanticTagColor } from '../core/tag-colors.js'

/**
 * Seed tags offered when user has zero marks.
 * The 16 curated semantic tags from the ambient-redesign spec.
 * Order matters — it's the order they render in the picker.
 */
export const SEED_TAGS = SEMANTIC_TAG_LABELS.map((label, i) => ({
  label,
  paletteSlot: i % 12,
}))

/** Map of seed label → fixed palette slot for O(1) lookup (hash fallback only). */
const SEED_SLOT_MAP = new Map(SEED_TAGS.map(s => [s.label, s.paletteSlot]))
```

Replace the body of `getColorForTag` with:

```javascript
export function getColorForTag(label) {
  // Named semantic tags win — curated hex pairs per spec
  const semantic = getSemanticTagColor(label)
  if (semantic) return semantic

  // Fallback: hash the label into the generic 12-slot palette
  const variant = getThemeVariant()
  const fixedSlot = SEED_SLOT_MAP.get(label)
  if (fixedSlot !== undefined) {
    return TAG_PALETTE[fixedSlot][variant]
  }
  const slot = hashLabel(label)
  return TAG_PALETTE[slot][variant]
}
```

- [ ] **Step 5: Run all affected tests**

Run: `pnpm test:run tests/unit/marks/tags.test.js tests/unit/marks/indicator.test.js tests/unit/core/tag-colors.test.js`
Expected: PASS. If indicator tests fail because they asserted on old seed-tag colors, update them to assert on the new semantic values (or on `getColorForTag('mercy')` with a theme set) — do not weaken coverage.

- [ ] **Step 6: Run the full suite**

Run: `pnpm test:run`
Expected: PASS. If anything downstream (e.g. `review/hub.js` tests) breaks because it expected an old seed label, fix the test to use a new semantic label — do not revert production code.

- [ ] **Step 7: Commit**

```bash
git add src/marks/tags.js tests/unit/marks/tags.test.js tests/unit/marks/indicator.test.js
git commit -m "feat(marks): replace seed tags with 16 semantic tags; resolve via semantic map first"
```

(Add any other touched test files to the `git add` if step 6 required fixes.)

---

## Task 3: Ambient palette CSS variables

**Files:**
- Modify: `src/core/theme.css`

- [ ] **Step 1: Add ambient tokens to the `:root` (light) block**

Find the `:root {` block (starts at line 20 of current `theme.css`). Immediately before its closing `}`, insert:

```css
  /* --- Ambient palette (redesign) ---
   * Used by reader pill/dock, command sheet, bottom sheets, surah list edges.
   * These supplement --qa-accent without replacing it. */
  --qa-ambient-accent: #8b6b3a;            /* bronze */
  --qa-ambient-accent-soft: rgba(139, 107, 58, 0.22);
  --qa-ambient-parchment: #3d2e14;         /* high-contrast ink */
  --qa-ambient-muted: #4a3a1e;
  --qa-ambient-dim: #8b6b3a;
  --qa-ambient-surface: #faf1d8;           /* card/sheet surface */
  --qa-ambient-border: #e6d5a6;
  --qa-ambient-scrim: rgba(61, 46, 20, 0.28);
  --qa-ambient-sheet-radius: 16px;
  --qa-ambient-pill-radius: 999px;
  --qa-ambient-elevation: 0 18px 40px rgba(0, 0, 0, 0.18);
```

- [ ] **Step 2: Add ambient tokens to the `html[data-theme="sepia"]` block**

Find that block (starts ~line 89). Before its closing `}`, insert:

```css
  /* --- Ambient palette (redesign) --- */
  --qa-ambient-accent: #8b6b3a;
  --qa-ambient-accent-soft: rgba(139, 107, 58, 0.22);
  --qa-ambient-parchment: #3d2e14;
  --qa-ambient-muted: #4a3a1e;
  --qa-ambient-dim: #8b6b3a;
  --qa-ambient-surface: #faf1d8;
  --qa-ambient-border: #e6d5a6;
  --qa-ambient-scrim: rgba(61, 46, 20, 0.28);
  --qa-ambient-sheet-radius: 16px;
  --qa-ambient-pill-radius: 999px;
  --qa-ambient-elevation: 0 18px 40px rgba(0, 0, 0, 0.22);
```

- [ ] **Step 3: Add ambient tokens to the `html[data-theme="dark"]` block**

Find that block (starts ~line 127). Before its closing `}`, insert:

```css
  /* --- Ambient palette (redesign) --- */
  --qa-ambient-accent: #a89968;            /* gold */
  --qa-ambient-accent-soft: rgba(168, 153, 104, 0.22);
  --qa-ambient-parchment: #e8e3c9;
  --qa-ambient-muted: #b8b3a0;
  --qa-ambient-dim: #6b6656;
  --qa-ambient-surface: #1a1814;
  --qa-ambient-border: #24201a;
  --qa-ambient-scrim: rgba(5, 5, 4, 0.62);
  --qa-ambient-sheet-radius: 16px;
  --qa-ambient-pill-radius: 999px;
  --qa-ambient-elevation: 0 18px 40px rgba(0, 0, 0, 0.4);
```

- [ ] **Step 4: Verify the build still passes**

Run: `pnpm build`
Expected: build succeeds. No existing selector was modified, so no visual regression is possible.

- [ ] **Step 5: Run the full test suite one more time**

Run: `pnpm test:run`
Expected: PASS across the board.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css
git commit -m "feat(theme): add ambient palette CSS vars (--qa-ambient-*) under each theme"
```

---

## Task 4: Smoke-test tokens resolve in a running dev build

**Files:**
- None (manual verification)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 2: Verify light-theme ambient vars resolve**

Open the app in a browser. In DevTools console run:

```javascript
getComputedStyle(document.documentElement).getPropertyValue('--qa-ambient-accent').trim()
```

Expected: `#8b6b3a`

- [ ] **Step 3: Verify dark-theme ambient vars resolve**

In console run:

```javascript
document.documentElement.dataset.theme = 'dark'
getComputedStyle(document.documentElement).getPropertyValue('--qa-ambient-accent').trim()
```

Expected: `#a89968`

- [ ] **Step 4: Verify semantic tag resolver works in-app**

In console run:

```javascript
const m = await import('/src/core/tag-colors.js')
document.documentElement.dataset.theme = 'dark'
m.getSemanticTagColor('mercy')  // → '#64a078'
m.getSemanticTagColor('unknown') // → null
```

Expected: values as annotated.

- [ ] **Step 5: Reset theme and stop the dev server**

In console: `delete document.documentElement.dataset.theme`
Terminal: `Ctrl+C` to stop Vite.

- [ ] **Step 6: No commit — verification only**

This task produces no code changes. If any step failed, open a fix in the relevant earlier task and re-commit there.

---

## Done when

- [ ] `src/core/tag-colors.js` exports `SEMANTIC_TAG_COLORS`, `SEMANTIC_TAG_LABELS`, `getSemanticTagColor`.
- [ ] `src/marks/tags.js` `SEED_TAGS` is the 16 semantic labels; `getColorForTag` consults semantic map first.
- [ ] `--qa-ambient-*` variables are defined under all three theme blocks in `theme.css`.
- [ ] `pnpm test:run` is green.
- [ ] `pnpm build` succeeds.
- [ ] DevTools smoke-check confirms tokens resolve correctly per theme.

## Out of scope (deferred to later plans)

- Reader ambient pill/dock (Plan #2).
- Command sheet (Plan #3).
- Surah list (Plan #4).
- Mark editor multi-tag rewrite (Plan #5) — the new seed set unlocks it but UI isn't touched here.
- Light-variant color tuning beyond "passes AA in smoke check" — if a designer later wants to fine-tune, that's a token-only follow-up that won't touch JS.
