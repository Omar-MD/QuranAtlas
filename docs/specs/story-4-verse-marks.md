---
issue: 4
title: "Story 4: Verse Marks & Tagging"
state: OPEN
---

## Problem Statement

Readers studying the Quran need to mark meaningful verses and categorise them by topic or intent (e.g. "Study," "Reflection," "Question"). Currently there is no way to save, tag, or revisit marked verses. Without marks, every reading session starts from scratch with no accumulated personal annotations.

## Solution

A long-press gesture on any verse opens a modal where the user assigns one or more coloured tags to that verse. Marked verses show a subtle coloured indicator in the reader (toggleable). Four default tags are provided: Favourite, Study, Reflection, Question. Users can delete default tags they don't use (deletion cascades to marks). A Review Hub provides a surah-grouped list of all marked verses with filtering and sorting. Deletions are instant with a 5-second undo toast (last action only).

## Grill-Me Decisions (locked in)

| Decision                                 | Choice                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Mark creation trigger                    | Touch: long-press (500ms). Mouse: hover reveals tag icon in left margin → click opens modal |
| Desktop hover icon position + appearance | Left margin, tag icon (SVG)                                                                 |
| Multi-tag indicator in reader            | Row of coloured dots (4×4px, 2px gap) in left margin                                        |
| Can default tags be deleted?             | Yes — deletion cascades to marks                                                            |
| Custom tag creation                      | **DEFERRED** — 4 default tags cover the vast majority of use cases                          |
| Review Hub routing                       | Separate route `#/review` with IDB position restore                                         |
| Tag color selection                      | Preset palette of ~12 WCAG-safe curated swatches (for default tags only)                    |
| Tag management UI                        | Quick create/delete in mark editor modal. Manage Tags screen deferred to Phase 3.           |
| Undo toast during navigation             | Dismissed on navigation (undo opportunity lost)                                             |
| Mark visibility toggle location          | Reader overflow/settings menu (not persistent toolbar)                                      |
| Bulk delete in Review Hub                | **DEFERRED** — single delete with undo covers common case                                   |
| Indicators + chunked rendering recycling | `reader:verse-rendered` event; indicator.js decorates payload                               |
| Modal back button behaviour              | Intercepts browser history; back dismisses modal, not page                                  |
| Review Hub empty states                  | Plain text + call-to-action / "Clear filter" button                                         |

## User Stories

1. As a reader, I want to long-press a verse in the reader to open a mark editor modal, so that I can mark it without navigating away.
2. As a reader, I want to assign one or more tags to a verse in the mark modal, so that I can categorise it for later study.
3. As a reader, I want to choose from predefined default tags (e.g. "Favourite," "Study," "Reflection," "Question"), so that I can mark quickly without creating tags from scratch.
4. As a reader, I want to save a mark immediately from the modal, so that the verse is persisted without extra steps.
5. As a reader, I want each tag to have an assigned colour, so that I can distinguish categories visually at a glance.
6. As a reader, I want to see a subtle coloured indicator on marked verses in the reader, so that I know which verses I have marked while reading.
7. As a reader, I want to toggle a "mark visibility mode" that shows tag colours on marked verses, so that I can see my annotations without them distracting from the Arabic text by default.
8. As a reader, I want to long-press an already-marked verse to reopen the mark editor pre-filled with its current tags, so that I can quickly add or remove tags without going to the Review Hub.
9. As a reader, I want to delete a mark directly from the mark editor modal, so that I can remove it without switching to the Review Hub.
10. As a reader, I want a brief undo toast after deleting a mark, so that I can recover from accidental deletions within a 5-second window.
11. As a student, I want to open a Review Hub that lists all my marked verses grouped by surah, so that I can study all marks within a surah together.
12. As a student, I want to filter marks in the Review Hub by one or more tags, so that I can focus on a specific category of verses.
13. As a student, I want to sort marks by date added or by surah order, so that I can review recently added marks or read through them canonically.
14. As a student, I want to tap a mark in the Review Hub to navigate directly to that verse in the reader, so that I can return to context quickly.
15. As a student, I want to delete a mark from the Review Hub list, so that I can manage marks without opening each verse individually.
16. As a reader, I want to delete a default tag I don't use, so that my tag vocabulary stays clean. Deletion cascades to all marks using that tag.
17. As a reader, I want the mark editor modal to be accessible via keyboard and screen reader, so that the feature works for all users.
18. As a reader, I want tag label input to be validated (non-empty, ≤50 chars, no control characters), so that garbage tags cannot be created.
19. As a reader on a small screen, I want the mark editor modal to be full-width and scrollable, so that it is usable on phones without clipping.
20. As a reader, I want mark operations (save/delete) to complete in under 200 ms, so that the UI feels instant.

## Implementation Decisions

### Modules to Build / Modify

**New: `src/marks/`**

- `store.js` — all IDB CRUD for marks. Emits `marks:saved` and `marks:deleted`
- `tags.js` — tag registry (4 defaults only). Persists deleted defaults to IDB `settings` store
- `editor.js` — modal UI, long-press handler, emits `marks:undo` on undo toast
- `indicator.js` — visual indicator on verses, subscribes to `marks:saved` / `marks:deleted`

**New: `src/review/`** (Story 4 contributes mark-list view; Story 5 owns full hub)

- `hub.js` — surah-grouped list view, filtering, sorting (single grouping mode)

**Modify: `src/reader/index.js`** — add long-press detection and `reader:verse-rendered` event emitter

**Modify: `src/safety/input-validator.js`** — add `validateTagLabel(raw)`

### IDB Schema

No migration required. Existing v1 schema already has `marks` store and `settings` store.

Mark record: `{ verseKey, tags: string[], createdAt, updatedAt }`
Deleted default tags persisted to `settings` under key `deleted-default-tags`

### Default Tags

| Tag Label    | Color    |
| ------------ | -------- |
| Favourite    | Amber    |
| Study        | Blue     |
| Reflection   | Green    |
| Question     | Purple   |

Tags are stored lowercased at creation time. `validateTagParam()` (Story 7) is the canonical normalisation function.

### Events

- `marks:saved` | `marks:deleted` — mark state changes
- `marks:undo` — undo toast dismiss
- `reader:verse-rendered` — verse stamped into DOM (initial or recycle)

### Performance Targets

- Mark persist < 200 ms
- Modal open < 100 ms after long-press fires
- Review Hub initial render (up to 500 marks) < 300 ms

## Testing Decisions

- `marks/store.js` (unit, fake-indexeddb): CRUD ops, event emission
- `marks/tags.js` (unit): defaults merge, cascade deletion on tag delete
- `safety/input-validator.js` (unit): tag label validation
- `marks/editor.js` (DOM integration): long-press → modal, delete → undo
- `review/hub.js` (integration): grouping, filtering, navigation

## Out of Scope

- Custom tag creation — **DEFERRED** to Phase 3
- Tag rename — **DEFERRED** to Phase 3 (no custom tags to rename)
- Manage Tags screen — **DEFERRED** to Phase 3
- Verse notes / free-text annotations (tags-only)
- Export / sharing (future stories)
- Cross-tab sync (Story 6)
- Bulk delete — **DEFERRED** to Phase 3
- Filtered Verse Review (FVR) — owned by Story 5, **DEFERRED** to Phase 3

See full plan at .opencode/plans/
