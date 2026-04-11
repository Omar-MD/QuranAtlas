---
issue: 10
title: "Story 10: Custom Tags & Review Hub Redesign"
state: OPEN
---

## Problem Statement

### Tags
The current tag system provides 4 hardcoded defaults (Favourite, Study, Reflection, Question) with no ability to create custom tags. Users studying the Quran have diverse categorisation needs (e.g. discourse types, legal rulings, stories) that 4 fixed labels cannot serve. Custom tag creation was deferred in Story 4 — this story delivers it.

### Review Hub
The Review Hub groups marks by surah or shows a flat date-sorted list. Users who think in terms of tags ("show me all my Divine verses") have no tag-first view. The hub needs a tag→surah grouping mode as the default, while preserving existing modes for users with different mental models.

## Solution

### Feature 1: Custom Tags
Remove hardcoded default tags. Tags are implicit — derived from the `by-tag` IDB index across all marks. No separate tags store. Five seed tags are offered on first use to solve cold-start. Users create new tags inline via a combined search/create input in the mark editor modal. Colors are auto-assigned from a 12-slot WCAG-safe palette using a deterministic hash of the tag label.

### Feature 2: Review Hub Redesign
The hub gains a third grouping mode: Tag→Surah (two-level hierarchy), which becomes the default. The existing Surah and Flat modes are preserved. Filters use native `<select>` dropdowns instead of cycling buttons. Active filters show as dismissible chips. Multi-tagged marks appear under each relevant tag group with all tags visible on the card.

## Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Default tags | None built-in. 5 seed tags offered on cold-start only |
| 2 | Tag persistence | Implicit — derived from marks via `by-tag` index. No separate store |
| 3 | Tag color assignment | Deterministic hash of label → 12-slot palette. Seeds get fixed slots 0–4 |
| 4 | Editor UX pattern | Chips + search/create input (not GitHub picker). Input NOT auto-focused on mobile |
| 5 | Mobile editor layout | Bottom sheet (full-width, thumb-reachable) |
| 6 | Desktop editor layout | Centered dialog (max-width 400px) |
| 7 | Save constraint | ≥1 tag required. Dismiss without selection creates no mark |
| 8 | Multi-tag in review | Mark appears under each tag group (duplicated). All tags shown on card |
| 9 | Review grouping modes | 3 modes: Tag→Surah (default), Surah, Flat. Cycle toggle |
| 10 | Filter controls | Native `<select>` dropdowns + active filter chip bar |
| 11 | First-time help | One-line hint in editor, shown only when zero marks exist |
| 12 | IDB schema | No migration — existing v1 sufficient |

## Seed Tags

Offered in the mark editor when the user has zero marks in IDB. After the first successful save, they no longer appear as suggestions — subsequent tag lists are derived from existing marks.

| # | Label | Fixed Palette Slot | Color (Light/Sepia) | Color (Dark) |
|---|---|---|---|---|
| 1 | Favourite | 0 (Amber) | `#b45309` | `#fbbf24` |
| 2 | Divine | 1 (Gold) | `#92400e` | `#fcd34d` |
| 3 | Disbelievers | 2 (Red) | `#b91c1c` | `#fca5a5` |
| 4 | Ahl al-Kitāb | 3 (Blue) | `#1d4ed8` | `#93c5fd` |
| 5 | Hypocrites | 4 (Purple) | `#6d28d9` | `#d8b4fe` |

## Color Palette

12-slot WCAG AA-safe palette. All colors meet ≥4.5:1 contrast against their respective theme backgrounds.

| Slot | Name | Light/Sepia | Dark |
|---|---|---|---|
| 0 | Amber | `#b45309` | `#fbbf24` |
| 1 | Gold | `#92400e` | `#fcd34d` |
| 2 | Red | `#b91c1c` | `#fca5a5` |
| 3 | Blue | `#1d4ed8` | `#93c5fd` |
| 4 | Purple | `#6d28d9` | `#d8b4fe` |
| 5 | Green | `#15803d` | `#86efac` |
| 6 | Teal | `#0f766e` | `#5eead4` |
| 7 | Rose | `#be123c` | `#fda4af` |
| 8 | Indigo | `#3730a3` | `#a5b4fc` |
| 9 | Orange | `#c2410c` | `#fdba74` |
| 10 | Cyan | `#0e7490` | `#67e8f9` |
| 11 | Slate | `#475569` | `#94a3b8` |

**Hash function:** Simple string hash (sum of char codes × prime) mod 12. Seed tags bypass the hash and use their fixed slot directly.

**Theme mapping:** Light and Sepia themes share the same (dark-on-light) color values. Dark theme uses the light-on-dark variants. The `getColorForTag()` function reads the current theme from `document.documentElement.dataset.theme` to return the correct variant.

## Mark Editor Modal

### Layout — Mobile (< 640px): Bottom sheet

```
┌─────────────────────────────────┐
│  Mark 2:255                  ✕  │  sticky header
├─────────────────────────────────┤
│  Tags help you organise verses  │  hint (zero-marks only)
│  — pick one or create your own. │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Search or create tag... │    │  text input (not auto-focused)
│  └─────────────────────────┘    │
│                                 │
│  ● Favourite    ● Divine        │  pill chips, 44px min-height
│  ● Disbelievers                 │  tap toggles filled/outline
│  ● Ahl al-Kitāb ● Hypocrites   │
│                                 │
├─────────────────────────────────┤
│  [Delete]              [Save]   │  sticky footer
└─────────────────────────────────┘
```

### Layout — Tablet (640px–1024px): Centered modal
Same component, max-width 480px, rounded corners, backdrop blur. Bottom-aligned on portrait.

### Layout — Desktop (> 1024px): Centered dialog
Max-width 400px, centered vertically. Input auto-focused. Hover states on chips. Escape closes.

### Interaction flow (all breakpoints)

1. Long-press (touch, 500ms) or hover-icon click (mouse) opens modal
2. If zero marks in IDB → show seed tags as chips + hint text
3. If marks exist → show all unique tags from `by-tag` index as chips
4. Pre-existing tags on this verse are pre-selected (filled)
5. Tap chip → toggle selection (filled ↔ outline)
6. Type in input → filters visible chips to matches
7. If typed text has no exact match → "Create [text]" button appears below input
8. Tap "Create [text]" → validates via `validateTagLabel()`, new chip appears auto-selected, input clears
9. Save button disabled until ≥1 tag selected
10. Save → `store.save(verseKey, selectedTags)` → modal closes
11. Cancel / backdrop tap / back button → closes modal, no mark created/modified
12. Delete button (existing marks only) → `store.del(verseKey)` → undo toast → modal closes

### Tag enumeration

To build the chip list, perform an index-only key cursor scan on the `by-tag` multiEntry index:

```javascript
async function getAllUsedTags() {
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
        resolve([...tags])
      }
    }
    request.onerror = () => reject(request.error)
  })
}
```

No full record deserialization needed — key-only cursor is fast even at 500+ marks.

## Review Hub

### Three grouping modes

| Mode | Toggle label | Structure | Sort applies to |
|---|---|---|---|
| Tag → Surah | `Group: Tag` | Tag headers → surah sub-headers → marks in canonical verse order | Marks within each surah sub-group |
| Surah | `Group: Surah` | Surah headers → marks in canonical verse order (existing behavior) | Marks within each surah |
| Flat | `Group: Date` | No grouping, chronological list | Entire list |

Default: Tag → Surah. Persisted to `positions["review"].groupBy` as `"tag"`, `"surah"`, or `"flat"`. Controlled via a `<select>` dropdown (not a cycling button) — consistent with the other filter controls.

### Tag→Surah hierarchy

```
■ Favourite                              (12)    ← tag header + count
├── Al-Baqarah (2)                               ← surah sub-header
│   ┌────────────────────────────────────────┐
│   │ 2:255  ● Favourite                     │   ← mark card
│   │ آية الكرسي...                           │
│   └────────────────────────────────────────┘
│   ┌────────────────────────────────────────┐
│   │ 2:286  ● Favourite  ● Divine           │   ← multi-tagged
│   └────────────────────────────────────────┘
├── Āl ʿImrān (3)
│   ...

■ Divine                                  (8)
├── Al-Baqarah (2)
│   ┌────────────────────────────────────────┐
│   │ 2:286  ● Favourite  ● Divine           │   ← same mark, appears again
│   └────────────────────────────────────────┘
```

**Tag group ordering:** Alphabetical by tag label.
**Surah sub-group ordering:** Canonical Quran order (surah number ascending).
**Mark ordering within surah:** Canonical verse order (verse number ascending).

### Multi-tagged marks
A mark with N tags appears in N tag groups. Each card displays all its tags as colored dots so the user understands the duplication.

### Filter controls

Replace cycling buttons with native `<select>` dropdowns:

```
┌─────────────────────────────────────┐
│ Group: [Tag ▾]     Sort: [Recent ▾] │
│ Tag: [All ▾]     Surah: [All ▾]    │
├─────────────────────────────────────┤
│ Showing: [Favourite ✕] [Al-Baqarah ✕]  Clear all │  ← only when filters active
├─────────────────────────────────────┤
```

**Tag dropdown:** Populated from `by-tag` index scan. Options: "All" + each unique tag.
**Surah dropdown:** Only surahs that have marks. Options: "All" + each surah with marks.
**Sort dropdown:** "Recent" (updatedAt desc) and "Created" (createdAt desc).
**Group dropdown:** "Tag", "Surah", "Date".

### Filter + grouping interaction

- **Tag filter active** in tag→surah mode: only the matching tag group is shown. Other groups hidden.
- **Surah filter active** in any mode: only marks from that surah shown. Empty groups hidden.
- **Both active:** AND composition. Only marks matching both tag and surah.
- **Active filter chip bar** appears below controls when any filter is non-default. Each chip has ✕ to clear individually. "Clear all" resets both.

### Pagination
"Load more" operates on the flattened mark list (30 per page), same as current. Groups may span page boundaries.

### State persistence

`positions["review"]` record updated to support new groupBy value:

```javascript
{
  id: "review",
  view: "all",
  activeTag: null,       // string | null
  surahFilter: null,     // number | null
  sortBy: "updatedAt",   // "updatedAt" | "createdAt"
  groupBy: "tag",        // "tag" | "surah" | "flat"  (was: "surah" | "flat")
}
```

Default changes from `groupBy: "surah"` to `groupBy: "tag"`.

## User Stories

### Feature 1: Custom Tags

1. As a reader, I want to create a new tag by typing its name in the mark editor, so that I can categorise verses using my own vocabulary.
2. As a first-time user, I want to see suggested seed tags (Favourite, Divine, Disbelievers, Ahl al-Kitāb, Hypocrites) when I open the editor for the first time, so that I have a useful starting point.
3. As a reader, I want to search/filter existing tags by typing in the input, so that I can quickly find a tag when I have many.
4. As a reader, I want to see a "Create [text]" option when my input doesn't match any existing tag, so that I know I can add a new one.
5. As a reader, I want each tag to be auto-assigned a color from a consistent palette, so that tags are visually distinct without manual color picking.
6. As a reader, I want the mark editor to appear as a bottom sheet on mobile, so that it's reachable with my thumb and doesn't feel like a desktop popup.
7. As a reader, I want tag chips to be at least 44px tall, so that they are easy to tap on a phone.
8. As a reader, I want the keyboard to stay hidden until I tap the search input, so that I can see all my tags first.
9. As a reader, I want to select at least one tag before saving, so that all my marks are categorised.
10. As a reader, I want to dismiss the editor without saving (via backdrop tap, ✕, or back button) and have no mark created, so that accidental long-presses don't pollute my marks.
11. As a reader, I want a brief hint text ("Tags help you organise verses — pick one or create your own") shown only until I save my first mark, so that I understand the feature on first encounter.
12. As a reader, I want new tag labels validated (non-empty, ≤50 chars, no control characters, lowercased), so that garbage tags cannot be created.

### Feature 2: Review Hub Redesign

13. As a student, I want the Review Hub to default to Tag→Surah grouping, so that I see my marks organised by topic first.
14. As a student, I want to switch between Tag→Surah, Surah, and Flat grouping modes via a dropdown, so that I can choose the view that matches my study style.
15. As a student viewing Tag→Surah mode, I want each tag group to show surah sub-headers with marks in canonical verse order, so that the hierarchy is clear and scannable.
16. As a student, I want multi-tagged marks to appear in each relevant tag group with all tags displayed, so that I can find a mark by any of its tags.
17. As a student, I want filter controls to be native dropdowns (tag, surah, sort, group), so that they feel native on my device and show the current selection.
18. As a student, I want active filters shown as dismissible chips below the controls, so that I always know what's filtered and can clear individual filters.
19. As a student, I want tag and surah filters to compose with AND logic, so that I can narrow to a specific tag within a specific surah.
20. As a student, I want the surah filter dropdown to only list surahs that have marks, so that I don't scroll through 114 empty options.
21. As a student, I want my grouping mode persisted to IDB, so that the hub reopens in my preferred view.

## Implementation Decisions

### Modules to modify

**`src/marks/tags.js`** — Complete rewrite. Remove `DEFAULT_TAGS` array, `getDefaults()`, `getActiveTags()`, `deleteTag()`. Replace with:
- `SEED_TAGS` — array of 5 seed tag objects with fixed palette slots
- `getColorForTag(label)` — deterministic hash → palette index, with seed overrides
- `getSeedTags()` — returns seed tags (used by editor when zero marks)
- `TAG_PALETTE` — the 12-slot color array (light/dark variants keyed by theme)

**`src/marks/editor.js`** — Major rewrite. Replace checkbox list with chip + search/create UI. Add:
- Bottom sheet layout for mobile (CSS class-based, not JS media query)
- `getAllUsedTags()` — index-only key cursor scan on `by-tag`
- Seed tag logic: if `getAll()` returns empty, show seed tags
- Search/filter behavior: input filters chips, shows "Create" option
- Save button disabled state (0 tags selected)
- Remove dependency on `getActiveTags()` — replaced by `getAllUsedTags()`

**`src/marks/indicator.js`** — Update `decorateVerse()` to use `getColorForTag(label)` instead of CSS `data-tag` attribute lookup. Apply color via inline `style` using CSS custom property.

**`src/review/hub.js`** — Significant changes:
- Add `renderTagGrouped(container, marks)` — two-level hierarchy renderer
- Modify `renderControls()` — replace buttons with `<select>` dropdowns
- Add `renderActiveFilters()` — dismissible chip bar
- Replace grouping toggle button with `<select>` dropdown (3 options)
- Tag group ordering: alphabetical. Surah sub-groups: canonical order.

**`src/review/state.js`** — Change default `groupBy` from `"surah"` to `"tag"`.

**`src/core/theme.css`** — Replace 5 named tag CSS vars with 12 palette-slot CSS vars (`--qa-tag-0` through `--qa-tag-11`) across all 3 themes. Add bottom sheet styles, chip styles, filter chip styles.

**`src/safety/input-validator.js`** — `validateTagLabel()` already exists and is sufficient. No changes needed.

### IDB Schema

No migration required. Existing v1 schema with `marks` store, `by-tag` multiEntry index, and `positions` store is sufficient. The `settings["deleted-default-tags"]` record becomes orphaned (harmless, no cleanup needed).

### Events

No new events. Existing `marks:saved`, `marks:deleted`, `review:open`, `review:filter` are sufficient.

### Performance Targets

- Tag enumeration (index-only cursor scan): ≤ 50ms for 500 marks
- Editor open (chip render): ≤ 100ms after long-press
- Tag→Surah hub render (30 marks): ≤ 300ms
- Filter change (re-render): ≤ 100ms

## Testing Decisions

### Unit tests to add/modify

**`marks/tags.test.js`** — Rewrite:
- `getColorForTag()` returns correct palette color for known seed labels
- `getColorForTag()` returns deterministic hash-based color for custom labels
- Same label always maps to same color
- `getSeedTags()` returns the 5 seeds with correct structure

**`marks/editor.test.js`** — Add/modify:
- Seed tags shown when zero marks exist
- Existing tags shown when marks exist (from index scan)
- Search input filters chips
- "Create" option appears for non-matching input
- Created tag is validated via `validateTagLabel()`
- Save disabled with 0 tags selected
- Save enabled with ≥1 tag selected
- Dismiss without selection creates no mark

**`review/hub.test.js`** — Add:
- Tag→Surah grouping renders tag headers → surah sub-headers → marks
- Multi-tagged marks appear under each tag group
- Tag filter narrows to single tag group
- Surah filter narrows marks within groups
- Combined filters compose with AND
- Group toggle cycles through tag → surah → flat
- Active filter chips render and clear correctly
- `groupBy: "tag"` is the default

**`review/state.test.js`** — Modify:
- Default state has `groupBy: "tag"`
- Persists and restores `groupBy: "tag"` correctly

### Existing tests to update

- Any test referencing `getActiveTags()`, `getDefaults()`, or `deleteTag()` must be updated to use new API
- Any test asserting `DEFAULT_TAGS` or the "deleted-default-tags" settings key must be removed

## Out of Scope

- Tag rename — deferred (implicit tags make this a bulk-update on marks)
- Tag deletion — implicit lifecycle handles this (delete all marks with a tag)
- Manage Tags screen — deferred
- Color picker for tags — auto-assigned only
- Bulk mark operations — deferred
- Cross-tab sync of tag changes — handled by existing Story 6 `marks:saved`/`marks:deleted` events
- Export/sharing
