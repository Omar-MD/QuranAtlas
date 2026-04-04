---
issue: 4
title: "Story 4: Verse Marks & Tagging"
state: OPEN
---

## Problem Statement

Readers studying the Quran need to mark meaningful verses and categorise them by topic or intent (e.g. "Study," "Reflection," "Question"). Currently there is no way to save, tag, or revisit marked verses. Without marks, every reading session starts from scratch with no accumulated personal annotations.

## Solution

A long-press gesture on any verse opens a modal where the user assigns one or more coloured tags to that verse. Marked verses show a subtle coloured indicator in the reader (toggleable). A Review Hub provides a surah-grouped list of all marked verses with filtering, sorting, and bulk-delete. Deletions are instant with a 5-second undo toast (last action only).

## Grill-Me Decisions (locked in)

| Decision                                 | Choice                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Mark creation trigger                    | Touch: long-press (500ms). Mouse: hover reveals tag icon in left margin → click opens modal |
| Desktop hover icon position + appearance | Left margin, tag icon (SVG)                                                                 |
| Multi-tag indicator in reader            | Row of coloured dots (4×4px, 2px gap) in left margin                                        |
| Can default tags be deleted/renamed?     | Deletable only (not renameable); deletion cascades to marks                                 |
| Review Hub routing                       | Separate route `#/review` with IDB position restore                                         |
| Tag color selection                      | Preset palette of ~12 WCAG-safe curated swatches (no free picker)                           |
| Tag management UI                        | Quick create/delete in mark editor modal + Manage Tags screen in Review Hub                 |
| Undo toast during navigation             | Dismissed on navigation (undo opportunity lost)                                             |
| Mark visibility toggle location          | Reader overflow/settings menu (not persistent toolbar)                                      |
| Bulk delete in Review Hub                | Undo toast covers entire batch (one action = one undo)                                      |
| Indicators + virtual scroll recycling    | `reader:verse-rendered` event; indicator.js decorates payload                               |
| Modal back button behaviour              | Intercepts browser history; back dismisses modal, not page                                  |
| Review Hub empty states                  | Plain text + call-to-action / "Clear filter" button                                         |

## User Stories

1. As a reader, I want to long-press a verse in the reader to open a mark editor modal, so that I can mark it without navigating away.
2. As a reader, I want to assign one or more tags to a verse in the mark modal, so that I can categorise it for later study.
3. As a reader, I want to choose from predefined default tags (e.g. "Favourite," "Study," "Reflection," "Question"), so that I can mark quickly without creating tags from scratch.
4. As a reader, I want to create a custom tag with a label and colour, so that I can build a personal vocabulary that fits my study method.
5. As a reader, I want each tag to have an assigned colour, so that I can distinguish categories visually at a glance.
6. As a reader, I want to save a mark immediately from the modal, so that the verse is persisted without extra steps.
7. As a reader, I want to see a subtle coloured indicator on marked verses in the reader, so that I know which verses I have marked while reading.
8. As a reader, I want to toggle a "mark visibility mode" that shows tag colours on marked verses, so that I can see my annotations without them distracting from the Arabic text by default.
9. As a reader, I want to long-press an already-marked verse to reopen the mark editor pre-filled with its current tags, so that I can quickly add or remove tags without going to the Review Hub.
10. As a reader, I want to delete a mark directly from the mark editor modal, so that I can remove it without switching to the Review Hub.
11. As a reader, I want a brief undo toast after deleting a mark, so that I can recover from accidental deletions within a 5-second window.
12. As a student, I want to open a Review Hub that lists all my marked verses grouped by surah, so that I can study all marks within a surah together.
13. As a student, I want to toggle the Review Hub between surah-grouped, flat (date-sorted), and tag-grouped views, so that I can find marks in the way that suits my study session.
14. As a student, I want to filter marks in the Review Hub by one or more tags, so that I can focus on a specific category of verses.
15. As a student, I want to sort marks by date added or by surah order, so that I can review recently added marks or read through them canonically.
16. As a student, I want to tap a mark in the Review Hub to navigate directly to that verse in the reader, so that I can return to context quickly.
17. As a student, I want to delete a mark from the Review Hub list, so that I can manage marks in bulk without opening each verse individually.
18. As a student, I want to bulk-select marks in the Review Hub and delete them all at once, so that I can clean up categories efficiently.
19. As a student, I want to rename or delete a custom tag, so that I can keep my tag vocabulary clean over time.
20. As a student, I want tag renaming to update all marks that use that tag, so that I don't need to re-tag verses manually.
21. As a reader, I want the mark editor modal to be accessible via keyboard and screen reader, so that the feature works for all users.
22. As a reader, I want tag label input to be validated (non-empty, ≤50 chars, no control characters), so that garbage tags cannot be created.
23. As a reader on a small screen, I want the mark editor modal to be full-width and scrollable, so that it is usable on phones without clipping.
24. As a reader, I want mark operations (save/delete) to complete in under 200 ms, so that the UI feels instant.

## Implementation Decisions

### Modules to Build / Modify

**New: `src/marks/`**

- `store.js` — all IDB CRUD for marks. Emits `marks:saved` and `marks:deleted`
- `tags.js` — tag registry (defaults + custom). Persists custom tags to IDB `settings` store
- `editor.js` — modal UI, long-press handler, emits `marks:undo` on undo toast
- `indicator.js` — visual indicator on verses, subscribes to `marks:saved` / `marks:deleted`

**New: `src/review/`** (Story 4 contributes mark-list view; Story 5 owns full hub)

- `hub.js` — surah-grouped list view, filtering, sorting, bulk-select

**Modify: `src/reader/`** — add long-press detection and `reader:verse-rendered` event emitter

**Modify: `src/safety/input-validator.js`** — add `validateTagLabel(raw)`

### IDB Schema

No migration required. Existing v1 schema already has `marks` store and `settings` store.

Mark record: `{ verseKey, tags: string[], createdAt, updatedAt }`
Custom tags persisted to `settings` under key `user-tags`

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
- `marks/tags.js` (unit): defaults merge, CRUD, cascade deletion
- `safety/input-validator.js` (unit): tag label validation
- `marks/editor.js` (DOM integration): long-press → modal, delete → undo
- `review/hub.js` (integration): grouping, filtering, navigation

## Out of Scope

- Verse notes / free-text annotations (tags-only)
- Export / sharing (future stories)
- Cross-tab sync (Story 6)
- Flashcard mode (Story 5)
- Full Review Hub (Story 5 owns it)

See full plan at .claude/plans/encapsulated-pondering-squid.md
