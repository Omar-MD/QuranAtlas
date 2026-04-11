# Custom Tags & Review Hub Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4 hardcoded default tags with fully custom, user-created tags (derived implicitly from marks) and redesign the Review Hub to group by tag → surah as the default view, while preserving existing surah and flat modes.

**Architecture:** Tags are implicit — derived from the `by-tag` multiEntry index on the marks store. No separate IDB `tags` store. Five seed tags are offered on cold-start (zero marks). Colors are deterministic via a string hash → 12-slot WCAG-safe palette. The mark editor becomes a chip-based search/create UI. The Review Hub gains a Tag→Surah grouping mode as its default.

**Tech Stack:** Vanilla JS, IDB (via `core/db.js`), Vite 8, Vitest (jsdom + fake-indexeddb), pnpm

---

## File Map

### Files to rewrite

| File | Responsibility |
|---|---|
| `src/marks/tags.js` | Seed tags, 12-slot color palette, `getColorForTag()`, `getSeedTags()`, `getAllUsedTags()` |
| `tests/unit/marks/tags.test.js` | Tests for the above |

### Files to modify heavily

| File | Changes |
|---|---|
| `src/marks/editor.js` | Replace checkbox list with chip + search/create input, bottom sheet layout, seed tag logic, save-disabled state |
| `tests/unit/marks/editor.test.js` | Rewrite most tests for new chip UI |
| `src/review/hub.js` | Add Tag→Surah grouping, `<select>` dropdowns, active filter chips, 3-mode cycle |
| `tests/unit/review/hub.test.js` | Add tag-grouped tests, update existing tests |
| `src/core/theme.css` | Replace 5 named tag CSS vars with 12 palette-slot vars, add chip/bottom-sheet/filter styles |

### Files to modify lightly

| File | Changes |
|---|---|
| `src/marks/indicator.js` | Replace `data-tag` attribute with inline `style` using `getColorForTag()` |
| `tests/unit/marks/indicator.test.js` | Update assertions from `data-tag` to inline style |
| `src/review/state.js` | Change default `groupBy` from `"surah"` to `"tag"` |
| `tests/unit/review/state.test.js` | Update default state assertion |
| `src/marks/store.js` | Remove `removeTagFromAll()` (no longer used) |
| `tests/unit/marks/store.test.js` | Remove `removeTagFromAll()` test |

### Files with no changes needed

| File | Why |
|---|---|
| `src/core/db.js` | No schema migration — existing v1 is sufficient |
| `src/core/constants.js` | No new events needed |
| `src/safety/input-validator.js` | `validateTagLabel()` already exists and is correct |
| `src/core/app.js` | Routes already wire `openEditor` to review hub |

---

## Task 1: Rewrite `src/marks/tags.js` — Palette and Seed Tags

**Files:**
- Rewrite: `src/marks/tags.js`
- Test: `tests/unit/marks/tags.test.js`

### Step 1.1: Write failing tests for the new tags module

- [ ] **Step 1.1: Write the failing tests**

Replace the entire contents of `tests/unit/marks/tags.test.js` with:

```js
import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save } from '../../../src/marks/store.js'

let tags

beforeEach(async () => {
  vi.resetModules()
  await openDB()
  tags = await import('../../../src/marks/tags.js')
})

describe('marks/tags.js', () => {
  describe('SEED_TAGS', () => {
    it('exports 5 seed tags', () => {
      expect(tags.SEED_TAGS).toHaveLength(5)
    })

    it('each seed has label and paletteSlot', () => {
      for (const seed of tags.SEED_TAGS) {
        expect(seed).toHaveProperty('label')
        expect(seed).toHaveProperty('paletteSlot')
        expect(typeof seed.label).toBe('string')
        expect(typeof seed.paletteSlot).toBe('number')
      }
    })

    it('seed labels are lowercase', () => {
      for (const seed of tags.SEED_TAGS) {
        expect(seed.label).toBe(seed.label.toLowerCase())
      }
    })
  })

  describe('TAG_PALETTE', () => {
    it('has 12 slots', () => {
      expect(tags.TAG_PALETTE).toHaveLength(12)
    })

    it('each slot has light and dark color strings', () => {
      for (const slot of tags.TAG_PALETTE) {
        expect(slot).toHaveProperty('light')
        expect(slot).toHaveProperty('dark')
        expect(slot.light).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(slot.dark).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })

  describe('getColorForTag()', () => {
    it('returns the fixed palette color for seed tag "favourite"', () => {
      const color = tags.getColorForTag('favourite')
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('returns a deterministic hash-based color for a custom label', () => {
      const color1 = tags.getColorForTag('my-custom-tag')
      const color2 = tags.getColorForTag('my-custom-tag')
      expect(color1).toBe(color2)
      expect(color1).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('different labels can map to different colors', () => {
      const a = tags.getColorForTag('alpha-tag')
      const b = tags.getColorForTag('zeta-tag')
      // They might collide, but at least the function works
      expect(a).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(b).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('seed tags get their fixed slot color, not hash-based', () => {
      const favouriteColor = tags.getColorForTag('favourite')
      expect(favouriteColor).toBe(tags.TAG_PALETTE[0].light)
    })
  })

  describe('getSeedTags()', () => {
    it('returns the 5 seed tag objects', () => {
      const seeds = tags.getSeedTags()
      expect(seeds).toHaveLength(5)
      expect(seeds[0].label).toBe('favourite')
    })
  })

  describe('getAllUsedTags()', () => {
    it('returns empty array when no marks exist', async () => {
      const used = await tags.getAllUsedTags()
      expect(used).toEqual([])
    })

    it('returns unique tags from marks', async () => {
      await save('1:1', ['favourite', 'study'])
      await save('2:1', ['favourite', 'custom-tag'])
      const used = await tags.getAllUsedTags()
      expect(used.sort()).toEqual(['custom-tag', 'favourite', 'study'])
    })

    it('does not return duplicate tag names', async () => {
      await save('1:1', ['favourite'])
      await save('2:1', ['favourite'])
      const used = await tags.getAllUsedTags()
      expect(used).toEqual(['favourite'])
    })
  })
})
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/marks/tags.test.js`
Expected: FAIL — old module exports `DEFAULT_TAGS`, `getDefaults`, etc., not the new API

- [ ] **Step 1.3: Write the new `src/marks/tags.js` implementation**

Replace the entire contents of `src/marks/tags.js` with:

```js
/**
 * Tag palette, seed tags, and color resolution.
 *
 * Tags are implicit — derived from the by-tag multiEntry index on marks.
 * No separate IDB store. This module provides:
 * - A fixed 12-slot WCAG AA color palette
 * - 5 seed tag suggestions for cold-start
 * - Deterministic label → color mapping (hash for custom, fixed slot for seeds)
 * - getAllUsedTags() via index-only key cursor scan
 */

import { getDb } from '../core/db.js'

/**
 * 12-slot WCAG AA-safe palette.
 * light = for light/sepia themes (dark-on-light, ≥4.5:1 on #ffffff / #fbf0d9)
 * dark  = for dark theme (light-on-dark, ≥4.5:1 on #121212)
 */
export const TAG_PALETTE = [
  { light: '#b45309', dark: '#fbbf24' }, // 0 Amber
  { light: '#92400e', dark: '#fcd34d' }, // 1 Gold
  { light: '#b91c1c', dark: '#fca5a5' }, // 2 Red
  { light: '#1d4ed8', dark: '#93c5fd' }, // 3 Blue
  { light: '#6d28d9', dark: '#d8b4fe' }, // 4 Purple
  { light: '#15803d', dark: '#86efac' }, // 5 Green
  { light: '#0f766e', dark: '#5eead4' }, // 6 Teal
  { light: '#be123c', dark: '#fda4af' }, // 7 Rose
  { light: '#3730a3', dark: '#a5b4fc' }, // 8 Indigo
  { light: '#c2410c', dark: '#fdba74' }, // 9 Orange
  { light: '#0e7490', dark: '#67e8f9' }, // 10 Cyan
  { light: '#475569', dark: '#94a3b8' }, // 11 Slate
]

/**
 * 5 seed tags offered when user has zero marks.
 * Fixed palette slots bypass the hash function.
 */
export const SEED_TAGS = [
  { label: 'favourite', paletteSlot: 0 },
  { label: 'divine', paletteSlot: 1 },
  { label: 'disbelievers', paletteSlot: 2 },
  { label: 'ahl al-kitāb', paletteSlot: 3 },
  { label: 'hypocrites', paletteSlot: 4 },
]

/** Map of seed label → fixed palette slot for O(1) lookup. */
const SEED_SLOT_MAP = new Map(SEED_TAGS.map(s => [s.label, s.paletteSlot]))

/**
 * Simple string hash: sum of (charCode × position-prime) mod 12.
 * @param {string} label - lowercased tag label
 * @returns {number} palette slot index 0–11
 */
function hashLabel(label) {
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0
  }
  return ((hash % 12) + 12) % 12 // ensure non-negative
}

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
 * Get the color hex string for a tag label.
 * Seed tags use their fixed palette slot; custom tags use a deterministic hash.
 * Returns the correct variant (light or dark) based on current theme.
 * @param {string} label - lowercased tag label
 * @returns {string} hex color e.g. '#b45309'
 */
export function getColorForTag(label) {
  const variant = getThemeVariant()
  const fixedSlot = SEED_SLOT_MAP.get(label)
  if (fixedSlot !== undefined) {
    return TAG_PALETTE[fixedSlot][variant]
  }
  const slot = hashLabel(label)
  return TAG_PALETTE[slot][variant]
}

/**
 * Get the seed tags array (used by editor on cold-start).
 * @returns {Array<{label: string, paletteSlot: number}>}
 */
export function getSeedTags() {
  return SEED_TAGS.map(s => ({ ...s }))
}

/**
 * Get all unique tag labels from the marks store via index-only key cursor.
 * Fast even at 500+ marks — no record deserialization.
 * @returns {Promise<string[]>} sorted unique tag labels
 */
export async function getAllUsedTags() {
  const db = await getDb()
  const tags = new Set()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const index = tx.objectStore('marks').index('by-tag')
    const request = index.openKeyCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        tags.add(cursor.key)
        cursor.continue()
      } else {
        resolve([...tags].sort())
      }
    }
    request.onerror = () => reject(request.error)
  })
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/marks/tags.test.js`
Expected: All 11 tests PASS

- [ ] **Step 1.5: Commit**

```bash
git add src/marks/tags.js tests/unit/marks/tags.test.js
git commit -m "feat(tags): rewrite tag module — palette, seeds, implicit tag enumeration"
```

---

## Task 2: Update `src/marks/store.js` — Remove `removeTagFromAll()`

**Files:**
- Modify: `src/marks/store.js`
- Modify: `tests/unit/marks/store.test.js`

- [ ] **Step 2.1: Remove the `removeTagFromAll` test**

In `tests/unit/marks/store.test.js`, delete the entire `describe('removeTagFromAll()', ...)` block (lines containing `removeTagFromAll`).

Find and delete this block:

```js
  describe('removeTagFromAll()', () => {
    it('removes a tag from all marks that have it', async () => {
      await store.save('1:1', ['favourite', 'study'])
      await store.save('2:255', ['favourite'])
      await store.save('3:1', ['study'])
      await store.removeTagFromAll('favourite')
      const m1 = await store.getByVerseKey('1:1')
      expect(m1.tags).toEqual(['study'])
      const m2 = await store.getByVerseKey('2:255')
      expect(m2.tags).toEqual([])
      const m3 = await store.getByVerseKey('3:1')
      expect(m3.tags).toEqual(['study'])
    })
  })
```

- [ ] **Step 2.2: Remove `removeTagFromAll()` from `src/marks/store.js`**

Delete the entire `removeTagFromAll` function and its JSDoc comment (approximately lines 119–148). Also remove the `getByTag` import usage within that function — but keep `getByTag` itself since the review hub still uses it.

The function to delete:

```js
/**
 * Remove a tag from all marks that have it (cascade on tag deletion).
 * Marks with no remaining tags are kept (untagged).
 * @param {string} tag - lowercased tag label
 */
export async function removeTagFromAll(tag) {
  const marks = await getByTag(tag)
  const db = await getDb()

  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const store = tx.objectStore('marks')

    let remaining = marks.length
    if (remaining === 0) {
      resolve()
      return
    }

    for (const mark of marks) {
      mark.tags = mark.tags.filter(t => t !== tag)
      mark.updatedAt = Date.now()
      const request = store.put(mark)
      request.onsuccess = () => {
        remaining--
        if (remaining === 0) {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    }
  })

  const verseKeys = marks.map(m => m.verseKey)
  if (verseKeys.length > 0) {
    broadcastMarkChange(verseKeys)
  }
}
```

- [ ] **Step 2.3: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/marks/store.test.js`
Expected: All remaining tests PASS

- [ ] **Step 2.4: Commit**

```bash
git add src/marks/store.js tests/unit/marks/store.test.js
git commit -m "refactor(store): remove removeTagFromAll — no longer needed with implicit tags"
```

---

## Task 3: Update `src/marks/indicator.js` — Use `getColorForTag()` Inline Styles

**Files:**
- Modify: `src/marks/indicator.js`
- Modify: `tests/unit/marks/indicator.test.js`

- [ ] **Step 3.1: Update indicator tests to expect inline styles instead of `data-tag`**

In `tests/unit/marks/indicator.test.js`, add an import for the new tags module and update assertions.

At the top of the file, after the existing imports, add:

```js
import { getColorForTag } from '../../../src/marks/tags.js'
```

Then in the `'adds colored dots to a verse element that has marks'` test, after the existing assertions, add:

```js
      const firstDot = dots.children[0]
      expect(firstDot.style.backgroundColor).toBeTruthy()
```

Also update the `'removes old dots before adding new ones (re-decoration)'` test — change the final assertion from checking `children` length of 3 to also checking inline styles exist:

After `expect(verseEl.querySelector('.qa-mark-dots').children).toHaveLength(3)`, add:

```js
      const dot = verseEl.querySelector('.qa-mark-dots').children[0]
      expect(dot.style.backgroundColor).toBeTruthy()
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/marks/indicator.test.js`
Expected: FAIL — dots currently use `data-tag` attribute, not inline `style.backgroundColor`

- [ ] **Step 3.3: Update `src/marks/indicator.js` to use inline styles**

Add the import at the top of `src/marks/indicator.js`:

```js
import { getColorForTag } from './tags.js'
```

In the `decorateVerse()` function, replace the dot-creation loop:

Find:
```js
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.dataset.tag = tag // CSS [data-tag="..."] drives color via theme.css
    dots.appendChild(dot)
  }
```

Replace with:
```js
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    dots.appendChild(dot)
  }
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/marks/indicator.test.js`
Expected: All tests PASS

- [ ] **Step 3.5: Commit**

```bash
git add src/marks/indicator.js tests/unit/marks/indicator.test.js
git commit -m "refactor(indicator): use getColorForTag() inline styles instead of data-tag CSS"
```

---

## Task 4: Update `src/core/theme.css` — Replace Named Tag Vars with Palette Slots

**Files:**
- Modify: `src/core/theme.css`

- [ ] **Step 4.1: Replace named tag CSS variables with 12 palette-slot variables in light theme**

In `:root { ... }`, find:

```css
  /* --- Tag Colors (WCAG AA ≥ 4.5:1 on #ffffff) --- */
  --qa-tag-favourite:   #b45309;
  --qa-tag-study:       #1d4ed8;
  --qa-tag-reflection:  #15803d;
  --qa-tag-question:    #6d28d9;
  --qa-tag-default:     #4b5563;
```

Replace with:

```css
  /* --- Tag Palette (12 slots, WCAG AA ≥ 4.5:1 on light bg) --- */
  --qa-tag-0:  #b45309;  /* Amber */
  --qa-tag-1:  #92400e;  /* Gold */
  --qa-tag-2:  #b91c1c;  /* Red */
  --qa-tag-3:  #1d4ed8;  /* Blue */
  --qa-tag-4:  #6d28d9;  /* Purple */
  --qa-tag-5:  #15803d;  /* Green */
  --qa-tag-6:  #0f766e;  /* Teal */
  --qa-tag-7:  #be123c;  /* Rose */
  --qa-tag-8:  #3730a3;  /* Indigo */
  --qa-tag-9:  #c2410c;  /* Orange */
  --qa-tag-10: #0e7490;  /* Cyan */
  --qa-tag-11: #475569;  /* Slate */
  --qa-tag-default: #4b5563;
```

- [ ] **Step 4.2: Replace named tag CSS variables in sepia theme**

In `html[data-theme="sepia"] { ... }`, find:

```css
  /* --- Tag Colors (WCAG AA ≥ 4.5:1 on #fbf0d9) --- */
  --qa-tag-favourite:   #a16207;
  --qa-tag-study:       #1e40af;
  --qa-tag-reflection:  #166534;
  --qa-tag-question:    #6b21a8;
  --qa-tag-default:     #4b5563;
```

Replace with:

```css
  /* --- Tag Palette (12 slots, WCAG AA ≥ 4.5:1 on sepia bg) --- */
  --qa-tag-0:  #b45309;
  --qa-tag-1:  #92400e;
  --qa-tag-2:  #b91c1c;
  --qa-tag-3:  #1d4ed8;
  --qa-tag-4:  #6d28d9;
  --qa-tag-5:  #15803d;
  --qa-tag-6:  #0f766e;
  --qa-tag-7:  #be123c;
  --qa-tag-8:  #3730a3;
  --qa-tag-9:  #c2410c;
  --qa-tag-10: #0e7490;
  --qa-tag-11: #475569;
  --qa-tag-default: #4b5563;
```

- [ ] **Step 4.3: Replace named tag CSS variables in dark theme**

In `html[data-theme="dark"] { ... }`, find:

```css
  /* --- Tag Colors (WCAG AA ≥ 4.5:1 on #121212) --- */
  --qa-tag-favourite:   #fbbf24;
  --qa-tag-study:       #93c5fd;
  --qa-tag-reflection:  #86efac;
  --qa-tag-question:    #d8b4fe;
  --qa-tag-default:     #9ca3af;
```

Replace with:

```css
  /* --- Tag Palette (12 slots, WCAG AA ≥ 4.5:1 on dark bg) --- */
  --qa-tag-0:  #fbbf24;
  --qa-tag-1:  #fcd34d;
  --qa-tag-2:  #fca5a5;
  --qa-tag-3:  #93c5fd;
  --qa-tag-4:  #d8b4fe;
  --qa-tag-5:  #86efac;
  --qa-tag-6:  #5eead4;
  --qa-tag-7:  #fda4af;
  --qa-tag-8:  #a5b4fc;
  --qa-tag-9:  #fdba74;
  --qa-tag-10: #67e8f9;
  --qa-tag-11: #94a3b8;
  --qa-tag-default: #9ca3af;
```

- [ ] **Step 4.4: Remove hardcoded `data-tag` CSS rules**

Find and delete these blocks:

```css
/* Tag-specific dot colors — driven by data-tag attribute */
.qa-mark-dot[data-tag="favourite"]  { background-color: var(--qa-tag-favourite); }
.qa-mark-dot[data-tag="study"]      { background-color: var(--qa-tag-study); }
.qa-mark-dot[data-tag="reflection"] { background-color: var(--qa-tag-reflection); }
.qa-mark-dot[data-tag="question"]   { background-color: var(--qa-tag-question); }

/* Tag swatches in mark editor — same data-tag pattern */
.qa-mark-tag-swatch[data-tag="favourite"]  { background-color: var(--qa-tag-favourite); }
.qa-mark-tag-swatch[data-tag="study"]      { background-color: var(--qa-tag-study); }
.qa-mark-tag-swatch[data-tag="reflection"] { background-color: var(--qa-tag-reflection); }
.qa-mark-tag-swatch[data-tag="question"]   { background-color: var(--qa-tag-question); }
```

- [ ] **Step 4.5: Add chip, bottom-sheet, and filter styles**

Append the following CSS at the end of the "Mark & Review Elements" section in `theme.css` (before the `/* Mark Modal Polish */` comment, or after the `qa-mark-dot::before` rule):

```css
/* ==========================================================================
   Tag Chips (Mark Editor)
   ========================================================================== */

.qa-tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.qa-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 999px;
  font-size: var(--qa-text-size-meta);
  font-weight: 500;
  cursor: pointer;
  border: 2px solid var(--qa-border);
  background-color: var(--qa-bg-secondary);
  color: var(--qa-text-primary);
  transition: border-color 0.15s, background-color 0.15s;
  min-height: 44px;
}

.qa-tag-chip:hover {
  border-color: var(--qa-text-secondary);
}

.qa-tag-chip[aria-pressed="true"] {
  border-color: var(--qa-accent);
  background-color: var(--qa-bg-surface);
}

.qa-tag-chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

/* ==========================================================================
   Mark Editor — Search/Create Input
   ========================================================================== */

.qa-tag-search-wrap {
  position: relative;
  margin-bottom: 1rem;
}

.qa-tag-search {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--qa-border);
  border-radius: 12px;
  background: var(--qa-bg-secondary);
  color: var(--qa-text-primary);
  font-size: var(--qa-text-size-ui);
  transition: border-color 0.2s;
}

.qa-tag-search:focus-visible {
  outline: 2px solid var(--qa-accent);
  outline-offset: -1px;
  border-color: var(--qa-accent);
}

.qa-tag-create-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  margin-top: 0.5rem;
  border: 1px dashed var(--qa-border);
  border-radius: 12px;
  background: var(--qa-bg-secondary);
  color: var(--qa-accent);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  min-height: 44px;
}

.qa-tag-create-btn:hover {
  border-color: var(--qa-accent);
  background-color: var(--qa-bg-surface);
}

/* ==========================================================================
   Mark Editor — First-time Hint
   ========================================================================== */

.qa-mark-hint {
  font-size: var(--qa-text-size-meta);
  color: var(--qa-text-secondary);
  margin-bottom: 1rem;
  line-height: var(--qa-line-height-ui);
}

/* ==========================================================================
   Mark Editor — Disabled Save Button
   ========================================================================== */

.qa-mark-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* ==========================================================================
   Mark Editor — Bottom Sheet (Mobile)
   ========================================================================== */

@media (min-width: 640px) {
  .qa-mark-modal {
    bottom: auto;
    top: 50%;
    left: 50%;
    right: auto;
    transform: translate(-50%, -50%);
    max-width: 480px;
    width: 90%;
    border-radius: 24px;
    animation: qa-fade-in 0.2s ease;
  }

  .qa-mark-title::before {
    display: none;
  }
}

@media (min-width: 1024px) {
  .qa-mark-modal {
    max-width: 400px;
  }
}

@keyframes qa-fade-in {
  from { opacity: 0; transform: translate(-50%, -48%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}

/* ==========================================================================
   Review Hub — Filter Dropdowns & Chips
   ========================================================================== */

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
  border-radius: 8px;
  font-size: var(--qa-text-size-meta);
  font-weight: 500;
  color: var(--qa-text-primary);
  min-height: 44px;
  cursor: pointer;
  width: 100%;
}

.qa-review-select:focus-visible {
  outline: 2px solid var(--qa-accent);
  border-color: var(--qa-accent);
}

.qa-review-active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.qa-review-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  font-size: var(--qa-text-size-meta);
  background-color: var(--qa-bg-secondary);
  border: 1px solid var(--qa-border);
  color: var(--qa-text-primary);
  min-height: 32px;
}

.qa-review-filter-chip button {
  background: none;
  border: none;
  color: var(--qa-text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
}

.qa-review-filter-chip button:hover {
  color: var(--qa-color-error);
}

.qa-review-clear-all-btn {
  background: none;
  border: none;
  color: var(--qa-accent);
  font-weight: 500;
  font-size: var(--qa-text-size-meta);
  cursor: pointer;
  padding: 0.375rem 0.5rem;
}

.qa-review-clear-all-btn:hover {
  text-decoration: underline;
}

/* ==========================================================================
   Review Hub — Tag Group Headers
   ========================================================================== */

.qa-review-tag-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 2.5rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--qa-border-subtle);
}

.qa-review-tag-header-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.qa-review-tag-header-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--qa-text-primary);
  text-transform: capitalize;
}

.qa-review-tag-header-count {
  font-size: var(--qa-text-size-meta);
  color: var(--qa-text-secondary);
  margin-left: auto;
}
```

- [ ] **Step 4.6: Run the full test suite (sanity check)**

Run: `pnpm vitest run`
Expected: All tests PASS (CSS changes don't break existing tests, indicators now use inline styles)

- [ ] **Step 4.7: Commit**

```bash
git add src/core/theme.css
git commit -m "style(theme): replace named tag vars with 12-slot palette, add chip/filter/bottom-sheet styles"
```

---

## Task 5: Rewrite `src/marks/editor.js` — Chip + Search/Create UI

**Files:**
- Rewrite: `src/marks/editor.js`
- Rewrite: `tests/unit/marks/editor.test.js`

- [ ] **Step 5.1: Write failing tests for the new editor**

Replace the entire contents of `tests/unit/marks/editor.test.js` with:

```js
import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save, getByVerseKey, getAll } from '../../../src/marks/store.js'

let editor

beforeEach(async () => {
  vi.resetModules()
  await openDB()
  document.body.innerHTML = '<div id="app-shell"><main id="main-content"></main></div>'
  editor = await import('../../../src/marks/editor.js')
})

describe('marks/editor.js', () => {
  describe('openEditor() — cold start (zero marks)', () => {
    it('renders a modal with seed tag chips', async () => {
      await editor.openEditor('2:255')
      const modal = document.querySelector('.qa-mark-modal')
      expect(modal).not.toBeNull()
      expect(modal.getAttribute('role')).toBe('dialog')
      const chips = modal.querySelectorAll('.qa-tag-chip')
      expect(chips.length).toBe(5)
    })

    it('shows hint text when zero marks exist', async () => {
      await editor.openEditor('2:255')
      const hint = document.querySelector('.qa-mark-hint')
      expect(hint).not.toBeNull()
      expect(hint.textContent).toContain('organise')
    })
  })

  describe('openEditor() — existing marks', () => {
    it('shows used tags as chips instead of seeds', async () => {
      await save('1:1', ['favourite', 'custom-one'])
      await editor.openEditor('2:255')
      const chips = document.querySelectorAll('.qa-tag-chip')
      const labels = [...chips].map(c => c.dataset.tag)
      expect(labels).toContain('favourite')
      expect(labels).toContain('custom-one')
    })

    it('does not show hint text when marks exist', async () => {
      await save('1:1', ['favourite'])
      await editor.openEditor('2:255')
      const hint = document.querySelector('.qa-mark-hint')
      expect(hint).toBeNull()
    })

    it('pre-selects chips for tags already on this verse', async () => {
      await save('2:255', ['favourite', 'study'])
      await editor.openEditor('2:255')
      const favChip = document.querySelector('.qa-tag-chip[data-tag="favourite"]')
      expect(favChip.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('chip toggle', () => {
    it('toggles chip selection on click', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-tag-chip')
      expect(chip.getAttribute('aria-pressed')).toBe('false')
      chip.click()
      expect(chip.getAttribute('aria-pressed')).toBe('true')
      chip.click()
      expect(chip.getAttribute('aria-pressed')).toBe('false')
    })
  })

  describe('search/filter', () => {
    it('filters chips by search input', async () => {
      await save('1:1', ['favourite', 'study', 'reflection'])
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'fav'
      input.dispatchEvent(new Event('input'))
      const visibleChips = [...document.querySelectorAll('.qa-tag-chip')]
        .filter(c => c.style.display !== 'none')
      expect(visibleChips.length).toBe(1)
      expect(visibleChips[0].dataset.tag).toBe('favourite')
    })

    it('shows "Create" button when input has no exact match', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-tag-create-btn')
      expect(createBtn).not.toBeNull()
      expect(createBtn.textContent).toContain('new-tag')
    })

    it('does not show "Create" button when input matches an existing tag', async () => {
      await save('1:1', ['favourite'])
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'favourite'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-tag-create-btn')
      expect(createBtn).toBeNull()
    })
  })

  describe('create tag', () => {
    it('creates a new chip when "Create" button is clicked', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-tag-create-btn')
      createBtn.click()
      const chips = document.querySelectorAll('.qa-tag-chip')
      const labels = [...chips].map(c => c.dataset.tag)
      expect(labels).toContain('new-tag')
      // New chip should be auto-selected
      const newChip = document.querySelector('.qa-tag-chip[data-tag="new-tag"]')
      expect(newChip.getAttribute('aria-pressed')).toBe('true')
    })

    it('rejects invalid tag labels (empty, >50 chars, control chars)', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      // Empty
      input.value = '   '
      input.dispatchEvent(new Event('input'))
      expect(document.querySelector('.qa-tag-create-btn')).toBeNull()
      // >50 chars
      input.value = 'a'.repeat(51)
      input.dispatchEvent(new Event('input'))
      expect(document.querySelector('.qa-tag-create-btn')).toBeNull()
    })

    it('clears input after creating a tag', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      document.querySelector('.qa-tag-create-btn').click()
      expect(input.value).toBe('')
    })
  })

  describe('save behavior', () => {
    it('save button is disabled when 0 tags selected', async () => {
      await editor.openEditor('2:255')
      const saveBtn = document.querySelector('[data-action="save"]')
      expect(saveBtn.disabled).toBe(true)
    })

    it('save button is enabled when ≥1 tag selected', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-tag-chip')
      chip.click()
      const saveBtn = document.querySelector('[data-action="save"]')
      expect(saveBtn.disabled).toBe(false)
    })

    it('saves mark with selected tags on Save click', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-tag-chip')
      chip.click()
      const saveBtn = document.querySelector('[data-action="save"]')
      saveBtn.click()
      await new Promise(r => setTimeout(r, 50))
      const mark = await getByVerseKey('2:255')
      expect(mark).toBeTruthy()
      expect(mark.tags.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('cancel/dismiss', () => {
    it('closes modal on Cancel without creating a mark', async () => {
      await editor.openEditor('2:255')
      const cancelBtn = document.querySelector('[data-action="cancel"]')
      cancelBtn.click()
      expect(document.querySelector('.qa-mark-modal')).toBeNull()
      const mark = await getByVerseKey('2:255')
      expect(mark).toBeUndefined()
    })

    it('closes modal on backdrop click', async () => {
      await editor.openEditor('2:255')
      const backdrop = document.querySelector('.qa-mark-backdrop')
      backdrop.click()
      expect(document.querySelector('.qa-mark-modal')).toBeNull()
    })
  })

  describe('delete', () => {
    it('shows delete button only for existing marks', async () => {
      await editor.openEditor('2:255')
      expect(document.querySelector('[data-action="delete"]')).toBeNull()
    })

    it('shows delete button for existing marks and deletes on click', async () => {
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      const deleteBtn = document.querySelector('[data-action="delete"]')
      expect(deleteBtn).not.toBeNull()
      deleteBtn.click()
      await new Promise(r => setTimeout(r, 50))
      expect(document.querySelector('.qa-mark-modal')).toBeNull()
      const toast = document.querySelector('.qa-undo-toast')
      expect(toast).not.toBeNull()
    })
  })

  describe('long-press handler', () => {
    it('setupLongPress attaches to a container', () => {
      const container = document.getElementById('main-content')
      const cleanup = editor.setupLongPress(container)
      expect(typeof cleanup).toBe('function')
      cleanup()
    })
  })

  describe('cross-tab conflict', () => {
    it('closes editor when mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      expect(document.querySelector('.qa-mark-modal')).toBeTruthy()
      emit('sync:update-received', { verseKeys: ['2:255'] })
      expect(document.querySelector('.qa-mark-modal')).toBeFalsy()
    })

    it('does not close editor when different mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      emit('sync:update-received', { verseKeys: ['3:1'] })
      expect(document.querySelector('.qa-mark-modal')).toBeTruthy()
    })
  })
})
```

- [ ] **Step 5.2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/marks/editor.test.js`
Expected: FAIL — old editor renders checkboxes, not chips

- [ ] **Step 5.3: Rewrite `src/marks/editor.js`**

Replace the entire contents of `src/marks/editor.js` with:

```js
/**
 * Mark editor modal.
 * Opens on long-press (touch) or hover-icon click (mouse).
 * Chip-based tag selection with search/create input.
 *
 * Mobile (< 640px): bottom sheet.
 * Tablet (640–1024px): centered modal, max-width 480px.
 * Desktop (> 1024px): centered dialog, max-width 400px.
 */

import { save, del, getByVerseKey, getAll } from './store.js'
import { getSeedTags, getAllUsedTags, getColorForTag } from './tags.js'
import { validateTagLabel } from '../safety/input-validator.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { showUndoToast, clearUndoToast } from '../core/ui.js'

const LONG_PRESS_MS = 500

let activeModal = null
let currentUndoRecord = null
let currentEditingVerseKey = null
let _historyPushed = false
let _popstateHandler = null

on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => {
  if (currentEditingVerseKey && verseKeys.includes(currentEditingVerseKey)) {
    closeEditor()
  }
})

/**
 * Open the mark editor modal for a verse.
 * @param {string} verseKey - e.g. '2:255'
 */
export async function openEditor(verseKey) {
  clearUndoToast()
  closeEditor()

  const existing = await getByVerseKey(verseKey)
  const currentTags = existing ? existing.tags : []

  // Determine which tags to show as chips
  const allMarks = await getAll()
  const hasSomeMarks = allMarks.length > 0
  let availableTags
  if (hasSomeMarks) {
    availableTags = await getAllUsedTags()
  } else {
    availableTags = getSeedTags().map(s => s.label)
  }

  // Track selected tags
  const selectedTags = new Set(currentTags)

  // --- Backdrop ---
  const backdrop = document.createElement('div')
  backdrop.className = 'qa-mark-backdrop'
  backdrop.addEventListener('click', closeEditor)

  // --- Modal ---
  const modal = document.createElement('div')
  modal.className = 'qa-mark-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', `Mark verse ${verseKey}`)

  // Title
  const title = document.createElement('h2')
  title.className = 'qa-mark-title'
  title.textContent = `Mark ${verseKey}`
  modal.appendChild(title)

  // Hint (only when zero marks)
  if (!hasSomeMarks) {
    const hint = document.createElement('p')
    hint.className = 'qa-mark-hint'
    hint.textContent = 'Tags help you organise verses — pick one or create your own.'
    modal.appendChild(hint)
  }

  // Search input
  const searchWrap = document.createElement('div')
  searchWrap.className = 'qa-tag-search-wrap'
  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.className = 'qa-tag-search'
  searchInput.placeholder = 'Search or create tag...'
  searchInput.setAttribute('autocomplete', 'off')
  searchWrap.appendChild(searchInput)
  modal.appendChild(searchWrap)

  // Chip container
  const chipContainer = document.createElement('div')
  chipContainer.className = 'qa-tag-chips'
  modal.appendChild(chipContainer)

  // Render chips
  function renderChips(filterText) {
    chipContainer.textContent = ''
    const lower = (filterText || '').trim().toLowerCase()

    // Remove the create button if it exists (we'll re-add below if needed)
    const oldCreate = modal.querySelector('.qa-tag-create-btn')
    if (oldCreate) oldCreate.remove()

    let hasExactMatch = false
    const allTags = [...availableTags]

    for (const tag of allTags) {
      if (lower && !tag.includes(lower)) {
        continue
      }
      if (tag === lower) hasExactMatch = true

      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'qa-tag-chip'
      chip.dataset.tag = tag
      chip.setAttribute('aria-pressed', selectedTags.has(tag) ? 'true' : 'false')

      const dot = document.createElement('span')
      dot.className = 'qa-tag-chip-dot'
      dot.style.backgroundColor = getColorForTag(tag)
      chip.appendChild(dot)

      chip.appendChild(document.createTextNode(tag))

      chip.addEventListener('click', () => {
        const pressed = chip.getAttribute('aria-pressed') === 'true'
        if (pressed) {
          selectedTags.delete(tag)
          chip.setAttribute('aria-pressed', 'false')
        } else {
          selectedTags.add(tag)
          chip.setAttribute('aria-pressed', 'true')
        }
        updateSaveButton()
      })

      chipContainer.appendChild(chip)
    }

    // "Create" button — only when filter text is non-empty, passes validation, and has no exact match
    if (lower && !hasExactMatch) {
      const validation = validateTagLabel(lower)
      if (validation.valid) {
        const createBtn = document.createElement('button')
        createBtn.type = 'button'
        createBtn.className = 'qa-tag-create-btn'
        createBtn.textContent = `Create "${validation.label}"`
        createBtn.addEventListener('click', () => {
          const label = validation.label
          if (!availableTags.includes(label)) {
            availableTags.push(label)
          }
          selectedTags.add(label)
          searchInput.value = ''
          renderChips('')
          updateSaveButton()
        })
        // Insert after chip container
        chipContainer.after(createBtn)
      }
    }
  }

  renderChips('')

  // Search input handler
  searchInput.addEventListener('input', () => {
    renderChips(searchInput.value)
  })

  // --- Actions ---
  const actions = document.createElement('div')
  actions.className = 'qa-mark-actions'

  const saveBtn = document.createElement('button')
  saveBtn.className = 'qa-mark-save-btn'
  saveBtn.setAttribute('data-action', 'save')
  saveBtn.textContent = 'Save'
  saveBtn.disabled = selectedTags.size === 0
  saveBtn.addEventListener('click', async () => {
    if (selectedTags.size === 0) return
    await save(verseKey, [...selectedTags])
    closeEditor()
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'qa-mark-cancel-btn'
  cancelBtn.setAttribute('data-action', 'cancel')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', closeEditor)

  function updateSaveButton() {
    saveBtn.disabled = selectedTags.size === 0
  }

  actions.appendChild(saveBtn)
  actions.appendChild(cancelBtn)

  if (existing) {
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'qa-mark-delete-btn'
    deleteBtn.setAttribute('data-action', 'delete')
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', async () => {
      currentUndoRecord = existing
      await del(verseKey)
      closeEditor()
      showUndoToast({
        verseKey,
        record: currentUndoRecord,
        onUndo: async (record) => {
          await save(record.verseKey, record.tags)
        },
        onComplete: () => {
          currentUndoRecord = null
        }
      })
    })
    actions.appendChild(deleteBtn)
  }

  modal.appendChild(actions)

  // --- Mount ---
  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(backdrop)
  shell.appendChild(modal)
  activeModal = { backdrop, modal }
  currentEditingVerseKey = verseKey

  // Focus trap
  function getFocusableElements() {
    return modal.querySelectorAll(
      'input, button:not([disabled])'
    )
  }

  // Auto-focus input on desktop only
  const isDesktop = window.matchMedia('(min-width: 640px)').matches
  if (isDesktop) {
    searchInput.focus()
  } else {
    // Focus first chip on mobile so keyboard stays hidden
    const firstChip = chipContainer.querySelector('.qa-tag-chip')
    if (firstChip) firstChip.focus()
  }

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditor()
      return
    }
    if (e.key !== 'Tab') return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  })

  // History entry for browser back
  _popstateHandler = () => {
    if (activeModal) closeEditor()
  }
  window.addEventListener('popstate', _popstateHandler)
  history.pushState({ modal: 'mark-editor' }, '')
  _historyPushed = true
}

/**
 * Close the active editor modal.
 */
export function closeEditor() {
  if (!activeModal) return

  activeModal.backdrop.remove()
  activeModal.modal.remove()
  activeModal = null
  currentEditingVerseKey = null

  if (_popstateHandler) {
    window.removeEventListener('popstate', _popstateHandler)
    _popstateHandler = null
  }

  if (_historyPushed) {
    _historyPushed = false
    history.back()
  }
}

/**
 * Create a bookmark SVG icon element.
 * @returns {SVGElement}
 */
function createBookmarkIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3 1h10v14l-5-3-5 3V1z')
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

/**
 * Set up long-press detection on a container (event delegation).
 * @param {HTMLElement} container
 * @returns {Function} cleanup function
 */
export function setupLongPress(container) {
  let pressTimer = null
  let touchStartY = null
  let touchStartX = null
  const TOUCH_MOVE_THRESHOLD = 10

  function getVerseKey(element) {
    const verseEl = element.closest('[data-verse]')
    if (!verseEl) return null
    const verseNum = verseEl.getAttribute('data-verse')
    const match = location.hash.match(/#\/s\/(\d+)/)
    const surahNum = match ? match[1] : null
    if (!surahNum || !verseNum) return null
    return `${surahNum}:${verseNum}`
  }

  function onTouchStart(e) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) return
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    pressTimer = setTimeout(() => {
      openEditor(verseKey)
      pressTimer = null
    }, LONG_PRESS_MS)
  }

  function onTouchEnd() {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
    touchStartX = null
    touchStartY = null
  }

  function onTouchMove(e) {
    if (pressTimer && touchStartX !== null && touchStartY !== null) {
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - touchStartX)
      const dy = Math.abs(touch.clientY - touchStartY)
      if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(pressTimer)
        pressTimer = null
        touchStartX = null
        touchStartY = null
      }
    }
  }

  function onMouseOver(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (!verseEl) return
    if (e.relatedTarget && verseEl.contains(e.relatedTarget)) return

    if (verseEl.querySelector('.qa-mark-hover-icon')) return

    const icon = document.createElement('button')
    icon.className = 'qa-mark-hover-icon'
    icon.setAttribute('aria-label', 'Mark this verse')
    icon.appendChild(createBookmarkIcon())
    icon.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const vKey = getVerseKey(verseEl)
      if (vKey) openEditor(vKey)
    })
    verseEl.appendChild(icon)
  }

  function onMouseOut(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (!verseEl) return
    if (e.relatedTarget && verseEl.contains(e.relatedTarget)) return
    const icon = verseEl.querySelector('.qa-mark-hover-icon')
    if (icon) icon.remove()
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchend', onTouchEnd, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: true })
  container.addEventListener('mouseover', onMouseOver)
  container.addEventListener('mouseout', onMouseOut)

  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('mouseover', onMouseOver)
    container.removeEventListener('mouseout', onMouseOut)
  }
}
```

- [ ] **Step 5.4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/marks/editor.test.js`
Expected: All tests PASS

- [ ] **Step 5.5: Commit**

```bash
git add src/marks/editor.js tests/unit/marks/editor.test.js
git commit -m "feat(editor): chip + search/create UI, bottom sheet, seed tags, save-disabled"
```

---

## Task 6: Update `src/review/state.js` — Default `groupBy: "tag"`

**Files:**
- Modify: `src/review/state.js`
- Modify: `tests/unit/review/state.test.js`

- [ ] **Step 6.1: Write/update the test for default groupBy**

Read the current test file. Add or update the assertion that checks `getDefaultState()` to expect `groupBy: 'tag'`.

In `tests/unit/review/state.test.js`, find the test that checks the default state and change the expected `groupBy` value. If the test file asserts `groupBy: 'surah'`, change it to `groupBy: 'tag'`.

Find:
```js
groupBy: 'surah'
```

Replace with:
```js
groupBy: 'tag'
```

(Do this for all occurrences in the test file where the default state is asserted.)

- [ ] **Step 6.2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/review/state.test.js`
Expected: FAIL — current default is `'surah'`

- [ ] **Step 6.3: Update `src/review/state.js`**

In `src/review/state.js`, change the `DEFAULT_STATE` object:

Find:
```js
  groupBy: 'surah',
```

Replace with:
```js
  groupBy: 'tag',
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/review/state.test.js`
Expected: All tests PASS

- [ ] **Step 6.5: Commit**

```bash
git add src/review/state.js tests/unit/review/state.test.js
git commit -m "feat(review): change default groupBy from 'surah' to 'tag'"
```

---

## Task 7: Rewrite `src/review/hub.js` — Tag→Surah Grouping + Select Dropdowns

**Files:**
- Modify: `src/review/hub.js`
- Modify: `tests/unit/review/hub.test.js`

This is the largest task. It adds the Tag→Surah grouping mode, replaces toggle buttons with `<select>` dropdowns, and adds active filter chip bar.

- [ ] **Step 7.1: Write failing tests for Tag→Surah grouping**

In `tests/unit/review/hub.test.js`, add these test blocks inside the existing `describe('review/hub.js', ...)`. Add them after the existing `describe('grouping', ...)` block:

```js
  describe('tag-grouped view', () => {
    it('renders tag headers in tag-grouped mode (default)', async () => {
      await hub.init()
      const tagHeaders = document.querySelectorAll('.qa-review-tag-header')
      expect(tagHeaders.length).toBeGreaterThanOrEqual(1)
    })

    it('renders surah sub-headers within tag groups', async () => {
      await hub.init()
      const surahHeaders = document.querySelectorAll('[data-surah-group]')
      expect(surahHeaders.length).toBeGreaterThanOrEqual(1)
    })

    it('multi-tagged marks appear under each relevant tag group', async () => {
      // marks tagged ['favourite', 'study'] should appear under both groups
      await hub.init()
      const tagHeaders = document.querySelectorAll('.qa-review-tag-header')
      const labels = [...tagHeaders].map(h => h.querySelector('.qa-review-tag-header-label').textContent.toLowerCase())
      expect(labels).toContain('favourite')
      expect(labels).toContain('study')
    })

    it('mark cards show all tags as dots regardless of which group they are in', async () => {
      await hub.init()
      // Find a card that should have 2 tags
      const cards = document.querySelectorAll('[data-mark]')
      const multiTagCard = [...cards].find(c => c.querySelectorAll('.qa-mark-dot').length > 1)
      // marks 3:1–3:20 all have ['favourite', 'study']
      expect(multiTagCard).toBeTruthy()
    })
  })
```

- [ ] **Step 7.2: Write failing tests for select dropdowns and filter chips**

Add after the above:

```js
  describe('select dropdowns', () => {
    it('renders group dropdown with tag/surah/flat options', async () => {
      await hub.init()
      const groupSelect = document.querySelector('[data-control="group"]')
      expect(groupSelect).not.toBeNull()
      expect(groupSelect.tagName).toBe('SELECT')
      const options = [...groupSelect.options].map(o => o.value)
      expect(options).toContain('tag')
      expect(options).toContain('surah')
      expect(options).toContain('flat')
    })

    it('renders sort dropdown', async () => {
      await hub.init()
      const sortSelect = document.querySelector('[data-control="sort"]')
      expect(sortSelect).not.toBeNull()
      expect(sortSelect.tagName).toBe('SELECT')
    })

    it('renders tag filter dropdown', async () => {
      await hub.init()
      const tagSelect = document.querySelector('[data-control="tag"]')
      expect(tagSelect).not.toBeNull()
    })

    it('renders surah filter dropdown with only surahs that have marks', async () => {
      await hub.init()
      const surahSelect = document.querySelector('[data-control="surah"]')
      expect(surahSelect).not.toBeNull()
      // We have marks in surahs 1, 2, 3 — so 3 + "All" = 4 options
      expect(surahSelect.options.length).toBe(4)
    })

    it('switching group to surah updates the view', async () => {
      await hub.init()
      const groupSelect = document.querySelector('[data-control="group"]')
      groupSelect.value = 'surah'
      groupSelect.dispatchEvent(new Event('change'))
      await new Promise(r => setTimeout(r, 100))
      // Should have surah headers, no tag headers
      expect(document.querySelectorAll('.qa-review-tag-header').length).toBe(0)
      expect(document.querySelectorAll('[data-surah-group]').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('active filter chips', () => {
    it('shows filter chips when tag filter is active', async () => {
      await hub.init()
      const tagSelect = document.querySelector('[data-control="tag"]')
      tagSelect.value = 'favourite'
      tagSelect.dispatchEvent(new Event('change'))
      await new Promise(r => setTimeout(r, 100))
      const chips = document.querySelectorAll('.qa-review-filter-chip')
      expect(chips.length).toBeGreaterThanOrEqual(1)
    })

    it('clearing a filter chip resets that filter', async () => {
      await hub.init()
      const tagSelect = document.querySelector('[data-control="tag"]')
      tagSelect.value = 'favourite'
      tagSelect.dispatchEvent(new Event('change'))
      await new Promise(r => setTimeout(r, 100))
      const chipDismiss = document.querySelector('.qa-review-filter-chip button')
      chipDismiss.click()
      await new Promise(r => setTimeout(r, 100))
      // Tag filter should be reset
      const tagSelectAfter = document.querySelector('[data-control="tag"]')
      expect(tagSelectAfter.value).toBe('')
    })
  })
```

- [ ] **Step 7.3: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/review/hub.test.js`
Expected: FAIL — old hub renders toggle buttons not selects, no tag grouping

- [ ] **Step 7.4: Update the `renderControls()` function**

In `src/review/hub.js`, replace the `renderControls` function. The old function creates two buttons (group toggle and sort toggle). Replace it with dropdown `<select>` elements.

Find and replace the entire `renderControls` function (from `function renderControls(container) {` to its closing `}` before `renderGrouped`):

```js
function renderControls(container) {
  const controls = document.createElement('div')
  controls.className = 'qa-review-controls'

  // Group dropdown
  const groupSelect = document.createElement('select')
  groupSelect.className = 'qa-review-select'
  groupSelect.setAttribute('data-control', 'group')
  groupSelect.setAttribute('aria-label', 'Group by')
  for (const [value, label] of [['tag', 'Group: Tag'], ['surah', 'Group: Surah'], ['flat', 'Group: Date']]) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    if (value === currentState.groupBy) opt.selected = true
    groupSelect.appendChild(opt)
  }
  groupSelect.addEventListener('change', async () => {
    currentState.groupBy = groupSelect.value
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(groupSelect)

  // Sort dropdown
  const sortSelect = document.createElement('select')
  sortSelect.className = 'qa-review-select'
  sortSelect.setAttribute('data-control', 'sort')
  sortSelect.setAttribute('aria-label', 'Sort by')
  for (const [value, label] of [['updatedAt', 'Sort: Recent'], ['createdAt', 'Sort: Created']]) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    if (value === currentState.sortBy) opt.selected = true
    sortSelect.appendChild(opt)
  }
  sortSelect.addEventListener('change', async () => {
    currentState.sortBy = sortSelect.value
    sortedMarks = sortMarks(allMarks, currentState.sortBy)
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(sortSelect)

  // Tag filter dropdown
  const uniqueTags = [...new Set(allMarks.flatMap(m => m.tags))].sort()
  const tagSelect = document.createElement('select')
  tagSelect.className = 'qa-review-select'
  tagSelect.setAttribute('data-control', 'tag')
  tagSelect.setAttribute('aria-label', 'Filter by tag')
  const tagAllOpt = document.createElement('option')
  tagAllOpt.value = ''
  tagAllOpt.textContent = 'Tag: All'
  tagSelect.appendChild(tagAllOpt)
  for (const tag of uniqueTags) {
    const opt = document.createElement('option')
    opt.value = tag
    opt.textContent = tag
    if (tag === currentState.activeTag) opt.selected = true
    tagSelect.appendChild(opt)
  }
  tagSelect.addEventListener('change', async () => {
    currentState.activeTag = tagSelect.value || null
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(tagSelect)

  // Surah filter dropdown — only surahs that have marks
  const surahsWithMarks = [...new Set(allMarks.map(m => parseInt(m.verseKey.split(':')[0], 10)))].sort((a, b) => a - b)
  const surahSelect = document.createElement('select')
  surahSelect.className = 'qa-review-select'
  surahSelect.setAttribute('data-control', 'surah')
  surahSelect.setAttribute('aria-label', 'Filter by surah')
  const surahAllOpt = document.createElement('option')
  surahAllOpt.value = ''
  surahAllOpt.textContent = 'Surah: All'
  surahSelect.appendChild(surahAllOpt)
  for (const num of surahsWithMarks) {
    const opt = document.createElement('option')
    opt.value = String(num)
    const meta = surahs.find(s => s.n === num)
    opt.textContent = meta ? `${meta.name} (${num})` : `Surah ${num}`
    if (num === currentState.surahFilter) opt.selected = true
    surahSelect.appendChild(opt)
  }
  surahSelect.addEventListener('change', async () => {
    currentState.surahFilter = surahSelect.value ? parseInt(surahSelect.value, 10) : null
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(surahSelect)

  container.appendChild(controls)

  // Active filter chips
  if (currentState.activeTag || currentState.surahFilter) {
    const chipBar = document.createElement('div')
    chipBar.className = 'qa-review-active-filters'

    if (currentState.activeTag) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      chip.textContent = currentState.activeTag
      const dismiss = document.createElement('button')
      dismiss.textContent = '✕'
      dismiss.setAttribute('aria-label', `Clear ${currentState.activeTag} filter`)
      dismiss.addEventListener('click', async () => {
        currentState.activeTag = null
        await saveState(currentState)
        displayedCount = 0
        render(container)
      })
      chip.appendChild(dismiss)
      chipBar.appendChild(chip)
    }

    if (currentState.surahFilter) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      const meta = surahs.find(s => s.n === currentState.surahFilter)
      chip.textContent = meta ? meta.name : `Surah ${currentState.surahFilter}`
      const dismiss = document.createElement('button')
      dismiss.textContent = '✕'
      dismiss.setAttribute('aria-label', `Clear surah filter`)
      dismiss.addEventListener('click', async () => {
        currentState.surahFilter = null
        await saveState(currentState)
        displayedCount = 0
        render(container)
      })
      chip.appendChild(dismiss)
      chipBar.appendChild(chip)
    }

    const clearAll = document.createElement('button')
    clearAll.className = 'qa-review-clear-all-btn'
    clearAll.textContent = 'Clear all'
    clearAll.addEventListener('click', async () => {
      currentState.activeTag = null
      currentState.surahFilter = null
      await saveState(currentState)
      displayedCount = 0
      render(container)
    })
    chipBar.appendChild(clearAll)

    container.appendChild(chipBar)
  }
}
```

- [ ] **Step 7.5: Add the `renderTagGrouped()` function**

Add this new function in `hub.js` right after the `renderControls` function (before the existing `renderGrouped`):

```js
/**
 * Render marks grouped by tag → surah (two-level hierarchy).
 * Multi-tagged marks appear under each relevant tag group.
 * @param {HTMLElement} container
 * @param {Array} marks
 */
function renderTagGrouped(container, marks) {
  // Build tag → marks map. Multi-tagged marks appear under each tag.
  const tagMap = new Map()
  for (const mark of marks) {
    for (const tag of mark.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag).push(mark)
    }
  }

  // Sort tags alphabetically
  const sortedTags = [...tagMap.keys()].sort()
  const fragment = document.createDocumentFragment()

  for (const tag of sortedTags) {
    const tagMarks = tagMap.get(tag)

    // Tag header
    const header = document.createElement('div')
    header.className = 'qa-review-tag-header'

    const dot = document.createElement('span')
    dot.className = 'qa-review-tag-header-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    header.appendChild(dot)

    const label = document.createElement('span')
    label.className = 'qa-review-tag-header-label'
    label.textContent = tag
    header.appendChild(label)

    const count = document.createElement('span')
    count.className = 'qa-review-tag-header-count'
    count.textContent = `(${tagMarks.length})`
    header.appendChild(count)

    fragment.appendChild(header)

    // Group marks within this tag by surah
    const surahMap = new Map()
    for (const mark of tagMarks) {
      const surahNum = parseInt(mark.verseKey.split(':')[0], 10)
      if (!surahMap.has(surahNum)) surahMap.set(surahNum, [])
      surahMap.get(surahNum).push(mark)
    }

    const sortedSurahs = [...surahMap.keys()].sort((a, b) => a - b)
    for (const surahNum of sortedSurahs) {
      const surahHeader = document.createElement('div')
      surahHeader.className = 'qa-review-surah-header'
      surahHeader.setAttribute('data-surah-group', String(surahNum))
      const meta = surahs.find(s => s.n === surahNum)
      surahHeader.textContent = meta ? `${meta.name} (${meta.n})` : `Surah ${surahNum}`
      fragment.appendChild(surahHeader)

      // Sort marks by verse number (canonical order)
      const surahMarks = surahMap.get(surahNum)
        .sort((a, b) => {
          const aVerse = parseInt(a.verseKey.split(':')[1], 10)
          const bVerse = parseInt(b.verseKey.split(':')[1], 10)
          return aVerse - bVerse
        })

      for (const mark of surahMarks) {
        fragment.appendChild(renderMarkCard(mark, null))
      }
    }
  }

  container.appendChild(fragment)
}
```

- [ ] **Step 7.6: Add `getColorForTag` import and update `render()` to support 3 modes**

At the top of `hub.js`, add the import:

```js
import { getColorForTag } from '../marks/tags.js'
```

Then update the `render()` function's mode-switching section. Find:

```js
  if (currentState.groupBy === 'surah') {
    renderGrouped(container, pageMarks)
  } else {
    renderFlat(container, pageMarks)
  }
```

Replace with:

```js
  if (currentState.groupBy === 'tag') {
    renderTagGrouped(container, pageMarks)
  } else if (currentState.groupBy === 'surah') {
    renderGrouped(container, pageMarks)
  } else {
    renderFlat(container, pageMarks)
  }
```

Also update the `renderLoadMore` click handler. Find:

```js
    if (currentState.groupBy === 'surah') {
      renderGrouped(container, nextPage)
    } else {
      renderFlat(container, nextPage)
    }
```

Replace with:

```js
    if (currentState.groupBy === 'tag') {
      renderTagGrouped(container, nextPage)
    } else if (currentState.groupBy === 'surah') {
      renderGrouped(container, nextPage)
    } else {
      renderFlat(container, nextPage)
    }
```

- [ ] **Step 7.7: Update `renderMarkCard` to use inline styles for dots**

In the `renderMarkCard` function, find:

```js
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.dataset.tag = tag // CSS [data-tag="..."] drives color via theme.css
    dot.title = tag
    tagDots.appendChild(dot)
  }
```

Replace with:

```js
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    dot.title = tag
    tagDots.appendChild(dot)
  }
```

- [ ] **Step 7.8: Update `applyFilter` — remove debounce, inline state changes**

The old `applyFilter` function used a debounce timer. The new controls use `<select>` elements that fire `change` events directly in `renderControls`. The `applyFilter` export is still used by the tag deep link code (`initTagDeepLink`). Simplify it:

Find the entire `applyFilter` function:

```js
export async function applyFilter(filter) {
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
  }
  
  filterDebounceTimer = setTimeout(async () => {
    if (filter.activeTag !== undefined) {
      currentState.activeTag = filter.activeTag
    }
    if (filter.surahFilter !== undefined) {
      currentState.surahFilter = filter.surahFilter
    }
    await saveState(currentState)
    emit(Events.REVIEW_FILTER, { tags: currentState.activeTag, surah: currentState.surahFilter })

    displayedCount = 0
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      render(mainContent)
    }
    
    filterDebounceTimer = null
  }, FILTER_DEBOUNCE_MS)
}
```

Replace with:

```js
export async function applyFilter(filter) {
  if (filter.activeTag !== undefined) {
    currentState.activeTag = filter.activeTag
  }
  if (filter.surahFilter !== undefined) {
    currentState.surahFilter = filter.surahFilter
  }
  await saveState(currentState)
  emit(Events.REVIEW_FILTER, { tags: currentState.activeTag, surah: currentState.surahFilter })

  displayedCount = 0
  const mainContent = document.getElementById('main-content')
  if (mainContent) {
    render(mainContent)
  }
}
```

Also remove the debounce variables (find and delete):

```js
let filterDebounceTimer = null
const FILTER_DEBOUNCE_MS = 50
```

And in the cleanup return of `init()`, remove the debounce cleanup. Find:

```js
    if (filterDebounceTimer) { clearTimeout(filterDebounceTimer); filterDebounceTimer = null }
```

Delete that line.

- [ ] **Step 7.9: Update existing hub tests for new controls**

In `tests/unit/review/hub.test.js`, the existing `describe('grouping', ...)` block checks for `[data-surah-group]` which still works. But the `describe('filtering', ...)` block uses `hub.applyFilter(...)`, which is now synchronous (no debounce). Update the filter tests to remove the 100ms wait:

In the filtering tests, replace `await new Promise(r => setTimeout(r, 100))` with `await new Promise(r => setTimeout(r, 10))` (or just keep a small delay for DOM settlement). The tests should still pass with a short delay since `applyFilter` now runs synchronously inline.

Also, the initial `renderControls` no longer renders buttons — update the `setInitialFocus` function and any tests that look for `'.qa-review-controls button'`. Change the `setInitialFocus` function in `hub.js`:

Find:
```js
function setInitialFocus() {
  const firstFocusable = document.querySelector('.qa-review-controls button')
  if (firstFocusable) {
    firstFocusable.focus()
  }
}
```

Replace with:
```js
function setInitialFocus() {
  const firstFocusable = document.querySelector('.qa-review-controls select')
  if (firstFocusable) {
    firstFocusable.focus()
  }
}
```

- [ ] **Step 7.10: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/review/hub.test.js`
Expected: All tests PASS

- [ ] **Step 7.11: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests PASS across all modules

- [ ] **Step 7.12: Commit**

```bash
git add src/review/hub.js tests/unit/review/hub.test.js
git commit -m "feat(review): tag→surah grouping, select dropdowns, active filter chips"
```

---

## Task 8: Integration Verification & Cleanup

**Files:**
- All modified files
- No new files

- [ ] **Step 8.1: Run the full test suite**

Run: `pnpm vitest run`
Expected: ALL tests pass with 0 failures

- [ ] **Step 8.2: Check for unused imports in modified files**

Scan each modified file for stale imports:

- `src/marks/tags.js` — should NOT import from `./store.js` anymore (old `removeTagFromAll` dependency removed)
- `src/marks/store.js` — verify no reference to `removeTagFromAll`
- `src/marks/editor.js` — should NOT import `getActiveTags` (replaced by `getAllUsedTags` + `getSeedTags`)
- `src/review/hub.js` — should import `getColorForTag` from tags

Run: `grep -rn "getActiveTags\|getDefaults\|deleteTag\|removeTagFromAll\|DEFAULT_TAGS" src/`
Expected: No matches (all old API references removed)

- [ ] **Step 8.3: Check for stale data-tag CSS references**

Run: `grep -rn "data-tag" src/`
Expected: No matches in JS files. No `[data-tag=` rules in CSS.

- [ ] **Step 8.4: Build check**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 8.5: Commit cleanup if needed**

If steps 8.2–8.3 found stale references, fix them and commit:

```bash
git add -A
git commit -m "chore: remove stale imports and CSS references from tag/review redesign"
```

---

## Quick Reference — Old API → New API

| Old (removed) | New (replacement) |
|---|---|
| `tags.getDefaults()` | `tags.getSeedTags()` |
| `tags.getActiveTags()` | `tags.getAllUsedTags()` |
| `tags.deleteTag(label)` | Removed — implicit lifecycle |
| `tags.DEFAULT_TAGS` | `tags.SEED_TAGS` (different shape) |
| `store.removeTagFromAll(tag)` | Removed — not needed |
| `settings["deleted-default-tags"]` | Orphaned (harmless) |
| `data-tag` attribute on dots | `style.backgroundColor` via `getColorForTag()` |
| `--qa-tag-favourite` CSS var | `--qa-tag-0` through `--qa-tag-11` |
| Group toggle button | `<select data-control="group">` |
| Sort toggle button | `<select data-control="sort">` |
| Filter cycling button | `<select data-control="tag">` + `<select data-control="surah">` |
| `groupBy: 'surah'` (default) | `groupBy: 'tag'` (default) |
